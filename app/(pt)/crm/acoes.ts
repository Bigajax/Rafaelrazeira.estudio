"use server";

/* ============================================================
   AS AÇÕES — tudo que escreve passa por aqui

   POR QUE SERVER ACTIONS E NÃO ROTAS DE API: o CRM já lê o banco direto do
   navegador com a chave anônima, porque o RLS torna isso seguro. Escrever
   também poderia ir direto, e é justamente aí que o desenho quebraria: as
   regras 1 a 4 do escopo ("próximo passo é obrigatório", "perda exige
   motivo"…) são regras de NEGÓCIO, e regra de negócio conferida só no
   navegador é sugestão. Aqui elas são conferidas onde o dado passa.

   O contrato de retorno é sempre o mesmo, e é ele que faz o modal existir:

     { ok: true }                        gravou
     { ok: false, falta: [...] }         faltou campo obrigatório → abra o
                                         modal pedindo exatamente estes
     { ok: false, erro: "…" }            deu errado → mostre a frase

   A tela nunca precisa adivinhar qual dos três aconteceu.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { centavos, gerarMensalidades, somar } from "@/lib/crm/financeiro";
import {
  destinoDoToque,
  emailNormal,
  hojeSP,
  oQueFalta,
  PADRAO_DO_DESTINO,
  posicaoEntre,
  soDigitos,
  somarDias,
  somarMeses,
  type Passagem,
} from "@/lib/crm/regras";
import type { CampoExigido } from "@/lib/crm/regras";
import type { Canal, Direcao, Estagio, Lead, MotivoPerda, Resposta } from "@/lib/crm/tipos";

export type Resultado =
  | { ok: true }
  | { ok: false; falta: CampoExigido[] }
  | { ok: false; erro: string };

/* Toda tela do CRM é derivada das mesmas duas tabelas, e qualquer escrita
   muda pelo menos duas telas ao mesmo tempo (mover um card muda o kanban E o
   painel Hoje E as métricas). Revalidar a árvore inteira é mais barato do
   que manter uma lista de quais rotas cada ação afeta, e essa lista seria a
   primeira coisa a ficar desatualizada. */
function atualizarTelas() {
  revalidatePath("/crm", "layout");
}

/** Mensagem legível para o que o Postgres devolve. */
function traduzirErro(erro: { code?: string; message?: string } | null): string {
  if (!erro) return "Não foi possível salvar.";
  if (erro.code === "23505") return "Já existe um lead com este WhatsApp ou e-mail.";
  if (erro.code === "23514") return "Um dos valores não é aceito neste campo.";
  if (erro.code === "42501" || erro.code === "PGRST301") return "Sessão expirada. Entre de novo.";
  return erro.message || "Não foi possível salvar.";
}

async function exigirSessao() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/crm/login");
  return usuario;
}

/* ============================================================
   SESSÃO
   ============================================================ */

export async function entrar(_anterior: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") || "").trim();
  const senha = String(form.get("senha") || "");
  const destino = String(form.get("destino") || "/crm");

  if (!email || !senha) return "Preencha e-mail e senha.";

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  /* A mensagem é a mesma para e-mail que não existe e para senha errada, de
     propósito: distinguir as duas conta para quem tentar quais endereços têm
     conta aqui. */
  if (error) return "E-mail ou senha não confere.";

  /* Só caminho interno. `?destino=https://…` viraria um redirecionamento
     aberto hospedado no domínio do estúdio. */
  const seguro = destino.startsWith("/crm") ? destino : "/crm";
  redirect(seguro);
}

export async function sair() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  redirect("/crm/login");
}

/* ============================================================
   MOVER UM LEAD — o coração das regras 1 a 4

   Uma função só para arrastar no kanban, para reordenar dentro da coluna e
   para os botões de mudar estágio no detalhe. As três coisas são a mesma
   escrita, e separá-las seria repetir a validação em três lugares.

   `posicao` vem já calculada pela tela (ela é quem sabe quem ficou acima e
   abaixo do card solto). `passagem` é o que o modal coletou, quando houve
   modal.
   ============================================================ */
export async function moverLead(
  id: string,
  estagio: Estagio,
  posicao: number | null,
  passagem: Passagem = {},
): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  const { data: lead, error: erroLeitura } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("id", id)
    .single<Lead>();

  if (erroLeitura || !lead) return { ok: false, erro: "Lead não encontrado." };

  /* A MESMA função que a tela usou para decidir se abria o modal. Se a tela
     mentiu, pulou a etapa ou é uma aba velha com código antigo, a gravação
     para aqui. */
  const falta = oQueFalta(estagio, lead, passagem);
  if (falta.length) return { ok: false, falta };

  const mudanca: Record<string, unknown> = { estagio };
  if (posicao !== null) mudanca.posicao = posicao;

  /* Só o que o modal mandou é escrito. Mandar `undefined` para o Supabase
     apagaria o valor que já estava lá. */
  for (const [campo, valor] of Object.entries(passagem)) {
    if (valor !== undefined) mudanca[campo] = valor === "" ? null : valor;
  }

  /* ---------- as duas limpezas de saída ----------
     Um lead que volta de "perdido" para um estágio ativo não pode carregar
     o motivo da perda: o card mostraria "sumiu, sem resposta" numa conversa
     que está viva de novo. Mesma coisa com o valor fechado de um ganho
     revertido, que continuaria somando no faturamento do período. */
  if (estagio !== "perdido") mudanca.motivo_perda = null;
  if (estagio !== "ganho") { mudanca.valor_fechado = null; mudanca.fechado_em = null; }

  /* Ganho e perdido saem da agenda. Deixar a data marcada faria o negócio
     fechado reaparecer no painel Hoje como pendência. */
  if (estagio === "ganho" || estagio === "perdido") {
    mudanca.proxima_acao_em = null;
    mudanca.proximo_passo = null;
  }

  const { error } = await supabase.from("crm_leads").update(mudanca).eq("id", id);
  if (error) return { ok: false, erro: traduzirErro(error) };

  atualizarTelas();
  return { ok: true };
}

/** Reordenar dentro da mesma coluna: a posição vira a média entre os vizinhos. */
export async function reordenar(
  id: string,
  estagio: Estagio,
  posicaoAnterior: number | null,
  posicaoSeguinte: number | null,
): Promise<Resultado> {
  return moverLead(id, estagio, posicaoEntre(posicaoAnterior, posicaoSeguinte));
}

/* ============================================================
   REGISTRAR TOQUE (regra 6)

   O trigger do banco cuida do `ultimo_toque_em`. O que sobra para cá é a
   segunda metade da regra: "o sistema pergunta pelo próximo passo se não
   houver um futuro agendado". A pergunta é da tela; o que esta função faz é
   ACEITAR a resposta junto, num envio só, para que registrar um toque e
   marcar o retorno não sejam dois formulários.
   ============================================================ */
/* O TRILHO DO FUNIL mora em lib/crm/regras.ts (`destinoDoToque`), com as
   outras funções puras: desde 20/08 a tela também precisa dele, para
   escrever "vai para a geladeira" embaixo do botão antes de o Rafael
   apertar. Aqui ficou só o que ele NÃO decide: se a movimentação persiste.

   Trilho é bônus, nunca bloqueio: quando o destino é automático e a régua
   do `moverLead` recusa, o toque fica gravado e o card espera. Quando o
   destino foi ESCOLHIDO (o Rafael marcou "é não" ou "não é a hora"), a
   recusa é do trabalho que ele pediu, e ela sobe para a tela. */
export async function registrarToque(
  leadId: string,
  dados: {
    canal: Canal;
    direcao: Direcao;
    resumo?: string | null;
    proximo_passo?: string | null;
    proxima_acao_em?: string | null;
    /* O TEOR DA ENTRADA. Ausente = `interesse`, que é o comportamento de
       sempre: o modal de mensagem e o SugerirResposta registram entradas
       sem perguntar nada, e ali a pessoa demonstrou interesse pelo fato
       de ter escrito. */
    resposta?: Resposta;
    /* Quando o destino é perdido (pelo teor "nao" ou pelo `estagio`): o
       que a placa exige. */
    motivo_perda?: MotivoPerda | null;
    /* ---------- a etapa escolhida no registro (21/09/2026) ----------
       O trilho só anda sozinho nos degraus mecânicos (lista → contatado
       → follow-up); de conversa em diante a etapa era julgamento do
       Rafael, e o julgamento não tinha lugar no modal: "quando eu
       registro um toque não tenho a possibilidade de colocar fazendo a
       prévia". Com `estagio`, o registro do toque é também a passagem, e
       ela obedece às mesmas exigências do quadro (`moverLead`): proposta
       pede o ticket, que vem junto quando o lead não tem. */
    estagio?: Estagio;
    ticket_estimado?: number | null;
  },
): Promise<Resultado> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();

  /* O lead é lido antes: o trilho precisa saber de onde ele parte. */
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("*")
    .eq("id", leadId)
    .single<Lead>();

  const { error } = await supabase.from("crm_interacoes").insert({
    owner_id: usuario.id,
    lead_id: leadId,
    canal: dados.canal,
    direcao: dados.direcao,
    resumo: dados.resumo?.trim() || null,
  });
  if (error) return { ok: false, erro: traduzirErro(error) };

  /* Só o que veio (01/10): o modal de mensagem manda a DATA do próximo
     retorno sem mexer no passo, e gravar o passo vazio junto apagaria
     "Cobrar retorno no WhatsApp" de quem só queria empurrar a data. */
  if (dados.proximo_passo || dados.proxima_acao_em) {
    const agenda: { proximo_passo?: string | null; proxima_acao_em?: string | null } = {};
    if (dados.proximo_passo !== undefined) agenda.proximo_passo = dados.proximo_passo?.trim() || null;
    if (dados.proxima_acao_em !== undefined) agenda.proxima_acao_em = dados.proxima_acao_em || null;
    const { error: erroPasso } = await supabase
      .from("crm_leads")
      .update(agenda)
      .eq("id", leadId);
    if (erroPasso) return { ok: false, erro: traduzirErro(erroPasso) };
  }

  if (lead) {
    /* A etapa marcada no modal vence o trilho; sem ela, o trilho de sempre. */
    const destino = dados.estagio ?? destinoDoToque(dados.direcao, lead.estagio, dados.resposta);
    if (destino && destino !== lead.estagio) {
      /* Escolhido = o Rafael marcou o teor da resposta ou a etapa, e este
         destino é o trabalho que ele pediu. Automático = o trilho
         mecânico, que é cortesia e cala a boca quando não dá. */
      const escolhido = dados.estagio !== undefined || dados.resposta === "nao" || dados.resposta === "depois";

      const passagem: Passagem = {};
      if (dados.ticket_estimado !== undefined) passagem.ticket_estimado = dados.ticket_estimado;

      if (destino === "perdido") {
        /* A única exigência da placa de perdido, e a que faz o gráfico de
           motivos existir. O `moverLead` cuida do resto da saída: zera a
           agenda para o lead não voltar na fila do dia seguinte. */
        passagem.motivo_perda = dados.motivo_perda ?? "sem_interesse";
      } else {
        /* A regra 1 (estágio ativo exige passo com data) continua valendo,
           e é o TRILHO quem a cumpre: a primeira versão que parava o card
           por falta de passo parou no primeiro uso real (a Mister Tattoo
           ficou na Lista com a mensagem já mandada). O que o Rafael
           digitou vence sempre; o padrão só entra em campo vazio. */
        const padrao = PADRAO_DO_DESTINO[destino];
        const passoAtual = dados.proximo_passo?.trim() || lead.proximo_passo;
        const dataAtual = dados.proxima_acao_em || lead.proxima_acao_em;
        if (padrao) {
          if (!passoAtual) passagem.proximo_passo = padrao.passo;
          if (!dataAtual) passagem.proxima_acao_em = somarDias(hojeSP(), padrao.dias);
        }
      }

      /* Pelo `moverLead` e não por um update solto: ele é quem sabe limpar
         o motivo de um lead que sai de perdido, zerar a agenda dos
         destinos sem agenda e conferir a régua de novo. Duplicar essas
         três coisas aqui era ter duas versões da mesma passagem. */
      const r = await moverLead(leadId, destino, null, passagem);
      if (escolhido && !r.ok) return r;
    }
  }

  atualizarTelas();
  return { ok: true };
}

/* ============================================================
   ADIAR — os botões +1D / +3D / +7D do painel Hoje

   A conta parte de HOJE e não da data marcada, e isso é uma decisão de
   produto, não um detalhe. Um lead atrasado há doze dias, adiado em "+1
   dia" a partir da data antiga, continuaria atrasado onze dias depois de o
   Rafael ter mexido nele: o botão não faria nada visível e a fila não
   andaria. Adiar é sempre "me cobre daqui a tantos dias".
   ============================================================ */
export async function adiar(leadId: string, dias: number): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  const { error } = await supabase
    .from("crm_leads")
    .update({ proxima_acao_em: somarDias(hojeSP(), dias) })
    .eq("id", leadId);

  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/* ============================================================
   DECIDIR O PRÓXIMO PASSO — a ação que faltava na fila

   O grupo "Sem próximo passo" existe para cobrar uma decisão, e até aqui
   ele não tinha como recebê-la: a ficha mandava "Decida o próximo passo" e
   os cinco botões da linha faziam outras cinco coisas. Quem quisesse
   obedecer tinha que abrir o lead, que é justamente o que a fila existe
   para evitar.

   Ela é curta de propósito. Não é o `salvarLead` com dois campos: é a
   decisão que tira o lead da fila, e por isso ela EXIGE os dois campos em
   vez de aceitar o que vier. Passo sem data é um lembrete que nunca toca;
   data sem passo é um alarme que não diz o que fazer.
   ============================================================ */
export async function definirPasso(
  leadId: string,
  passo: string,
  data: string,
): Promise<Resultado> {
  await exigirSessao();

  const texto = String(passo || "").trim();
  const falta: CampoExigido[] = [];
  if (!texto) falta.push("proximo_passo");
  /* A forma da data é conferida aqui e não só no `<input type="date">`: o
     campo nativo pode ser digitado, e uma data pela metade viraria erro cru
     do Postgres em vez de um pedido de campo. */
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ""))) falta.push("proxima_acao_em");
  if (falta.length) return { ok: false, falta };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("crm_leads")
    .update({ proximo_passo: texto, proxima_acao_em: data })
    .eq("id", leadId);

  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/* ============================================================
   SALVAR CAMPOS DO LEAD — a edição em linha do detalhe
   ============================================================ */
const CAMPOS_EDITAVEIS = [
  "nome", "empresa", "instagram", "whatsapp", "email", "nicho", "cidade",
  "tipo_projeto", "ticket_estimado", "origem", "indicado_por",
  "proximo_passo", "proxima_acao_em", "notas",
] as const;

export type CampoEditavel = (typeof CAMPOS_EDITAVEIS)[number];

export async function salvarLead(
  id: string,
  campos: Partial<Record<CampoEditavel, string | number | null>>,
): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  const mudanca: Record<string, unknown> = {};
  for (const campo of CAMPOS_EDITAVEIS) {
    if (!(campo in campos)) continue;
    let valor = campos[campo];
    /* As duas normalizações que sustentam a trava de duplicata do banco: sem
       elas o mesmo telefone entra de duas formas e o índice único deixa de
       valer. Ver a nota em supabase/crm.sql. */
    if (campo === "whatsapp") valor = soDigitos(String(valor ?? ""));
    if (campo === "email") valor = emailNormal(String(valor ?? ""));
    if (campo === "ticket_estimado") valor = valor === "" || valor == null ? null : Number(valor);
    mudanca[campo] = valor === "" ? null : valor;
  }
  if (!Object.keys(mudanca).length) return { ok: true };

  const { error } = await supabase.from("crm_leads").update(mudanca).eq("id", id);
  if (error) return { ok: false, erro: traduzirErro(error) };

  atualizarTelas();
  return { ok: true };
}

/* ============================================================
   CRIAR LEAD

   Nasce em `lista` e SEM exigir próximo passo. Não é esquecimento da regra
   1: ela fala de MOVIMENTAÇÃO. Um lead recém-anotado ainda não foi
   decidido, e obrigar a marcar um retorno na hora de anotar um nome é o
   jeito mais rápido de fazer o Rafael parar de anotar nomes. O painel Hoje
   tem um grupo inteiro ("sem próximo passo") que existe exatamente para
   cobrar isso depois, no momento certo.
   ============================================================ */
export async function criarLead(
  campos: Partial<Record<CampoEditavel, string | number | null>> & { nome: string },
): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();

  const nome = String(campos.nome || "").trim();
  if (!nome) return { ok: false, erro: "O nome é obrigatório." };

  const whatsapp = soDigitos(String(campos.whatsapp ?? ""));
  const email = emailNormal(String(campos.email ?? ""));

  /* Checagem amigável antes de tentar: assim o Rafael recebe "esse lead já
     existe" em vez do erro cru do índice único. A trava de verdade continua
     sendo o índice, para o caso de dois envios ao mesmo tempo. */
  if (whatsapp || email) {
    const filtro = [whatsapp ? `whatsapp.eq.${whatsapp}` : "", email ? `email.eq.${email}` : ""]
      .filter(Boolean)
      .join(",");
    const { data: existente } = await supabase
      .from("crm_leads")
      .select("id, nome")
      .or(filtro)
      .limit(1);
    if (existente?.length) {
      return { ok: false, erro: `Este contato já está no CRM como "${existente[0].nome}".` };
    }
  }

  const linha: Record<string, unknown> = { owner_id: usuario.id, nome, whatsapp, email };
  for (const campo of CAMPOS_EDITAVEIS) {
    if (campo === "nome" || campo === "whatsapp" || campo === "email") continue;
    if (!(campo in campos)) continue;
    const valor = campos[campo];
    linha[campo] = valor === "" || valor == null ? null : campo === "ticket_estimado" ? Number(valor) : valor;
  }

  const { data, error } = await supabase.from("crm_leads").insert(linha).select("id").single();
  if (error || !data) return { ok: false, erro: traduzirErro(error) };

  atualizarTelas();
  return { ok: true, id: data.id as string };
}

export async function apagarLead(id: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  /* ---------- a trava que o dinheiro trouxe (20/08) ----------
     `crm_contratos` e `crm_parcelas` apontam para o lead com `on delete
     cascade`, e os recebimentos penduram nas parcelas. Ou seja: este botão,
     que fica bem à mão na carta da vez e na ficha, passou a poder apagar o
     caixa junto com o nome. A cascata está certa (contrato de lead que não
     existe não é contrato), o que não pode é o caminho ser silencioso.

     A soma aparece na frase de propósito: "tem contrato" é uma regra
     abstrata que dá vontade de contornar, "tem R$ 399 recebidos" é um fato
     que faz a mão parar. */
  const { data: recebimentos } = await supabase
    .from("crm_recebimentos")
    .select("valor")
    .eq("lead_id", id)
    .is("estornado_em", null)
    .returns<{ valor: number }[]>();

  if (recebimentos?.length) {
    const total = centavos(recebimentos.reduce((s, r) => s + Number(r.valor), 0));
    return {
      ok: false,
      erro: `Este lead tem R$ ${total.toLocaleString("pt-BR")} recebidos. Apagar levaria o caixa junto.`,
    };
  }

  const { error } = await supabase.from("crm_leads").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/* ============================================================
   TEMPLATES
   ============================================================ */
export async function salvarTemplate(
  id: string | null,
  campos: { titulo: string; categoria: string | null; conteudo: string; ordem?: number },
): Promise<Resultado> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();

  const titulo = campos.titulo.trim();
  const conteudo = campos.conteudo.trim();
  if (!titulo || !conteudo) return { ok: false, erro: "Título e texto são obrigatórios." };

  const linha = {
    titulo,
    conteudo,
    categoria: campos.categoria || null,
    canal: "whatsapp",
    ordem: campos.ordem ?? 0,
  };

  const { error } = id
    ? await supabase.from("crm_templates").update(linha).eq("id", id)
    : await supabase.from("crm_templates").insert({ ...linha, owner_id: usuario.id });

  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

export async function apagarTemplate(id: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase.from("crm_templates").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/* ============================================================
   META DA SEMANA
   ============================================================ */
export async function salvarMeta(toques: number): Promise<Resultado> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();

  const valor = Math.max(1, Math.round(Number(toques) || 0));
  /* `upsert` com conflito no dono: o índice único `crm_metas_owner_uniq` faz
     "salvar a meta" ser sempre a mesma linha, e não uma linha nova por vez. */
  const { error } = await supabase
    .from("crm_metas")
    .upsert(
      { owner_id: usuario.id, toques_semana: valor, atualizado_em: new Date().toISOString() },
      { onConflict: "owner_id" },
    );

  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/* ============================================================
   O DINHEIRO

   Contrato, parcela e recebimento. As três escritas seguem o mesmo contrato
   `Resultado` do resto do arquivo, e a validação de negócio é refeita aqui
   pelas mesmas funções puras que a tela usou para desenhar
   (lib/crm/financeiro.ts): a tela decide o que mostrar por cortesia, o
   servidor decide o que grava por segurança.
   ============================================================ */

/* ---------- FECHAR O CONTRATO ----------
   Nasce inteiro: o contrato e as parcelas numa chamada só. Separar em duas
   ("crie o contrato" e depois "agora adicione as parcelas") produziria
   contrato sem plano de pagamento no primeiro fechamento apressado, que é
   justamente o objeto inútil que esta aba existe para não ter.

   E ele é o ÚNICO ESCRITOR do par `valor_fechado`/`fechado_em` a partir de
   agora. É isso que impede as duas verdades: o contrato manda, e a coluna
   antiga do lead vira espelho dele. Todo o código de métricas e a placa de
   Ganho continuam lendo o que sempre leram. */
export async function fecharContrato(
  leadId: string,
  dados: {
    titulo: string;
    valor_total: number;
    proposta_slug?: string | null;
    assinado_em?: string | null;
    notas?: string | null;
    /* A recorrência (06/10, o Performance): `valor_ciclo` por mês, o dia do
       vencimento, e a loja do Performance que este contrato libera. O
       `valor_total` de uma recorrência é NULO no banco: o total é a soma
       das mensalidades que existirem, e cresce a cada "gerar mais 3". */
    tipo?: "projeto" | "recorrencia";
    valor_ciclo?: number | null;
    dia_vencimento?: number | null;
    perf_loja_id?: string | null;
    parcelas: {
      numero: number;
      de: number | null;
      rotulo: string;
      valor: number;
      vence_em: string;
      item_slug?: string | null;
      metodo_previsto?: string | null;
    }[];
  },
): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();

  const titulo = String(dados.titulo || "").trim();
  if (!titulo) return { ok: false, erro: "O contrato precisa de um título." };

  const recorrencia = dados.tipo === "recorrencia";
  const total = Number(dados.valor_total);
  const ciclo = Number(dados.valor_ciclo);
  if (recorrencia) {
    if (!Number.isFinite(ciclo) || ciclo <= 0) return { ok: false, erro: "A mensalidade precisa de um valor por mês maior que zero." };
  } else if (!Number.isFinite(total) || total <= 0) {
    return { ok: false, erro: "O valor do contrato precisa ser maior que zero." };
  }
  if (!dados.parcelas?.length) {
    return { ok: false, erro: "Um contrato sem parcela nenhuma não cobra ninguém." };
  }

  const { data: contrato, error } = await supabase
    .from("crm_contratos")
    .insert({
      owner_id: usuario.id,
      lead_id: leadId,
      titulo,
      proposta_slug: dados.proposta_slug || null,
      tipo: recorrencia ? "recorrencia" : "projeto",
      valor_total: recorrencia ? null : centavos(total),
      valor_ciclo: recorrencia ? centavos(ciclo) : null,
      ciclo: recorrencia ? "mensal" : null,
      dia_vencimento: recorrencia ? Math.min(28, Math.max(1, Number(dados.dia_vencimento) || Number(dados.parcelas[0].vence_em.slice(8, 10)) || 1)) : null,
      assinado_em: dados.assinado_em || hojeSP(),
      notas: dados.notas?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !contrato) return { ok: false, erro: traduzirErro(error) };

  /* A loja do Performance passa a ser deste contrato: é por aqui que o
     recebimento da mensalidade libera a aba (trigger perf_ao_receber). */
  if (recorrencia && dados.perf_loja_id) {
    await supabase.from("perf_lojas").update({ contrato_id: contrato.id }).eq("id", dados.perf_loja_id);
  }

  const { error: erroParcelas } = await supabase.from("crm_parcelas").insert(
    dados.parcelas.map((p) => ({
      owner_id: usuario.id,
      contrato_id: contrato.id,
      lead_id: leadId,
      numero: p.numero,
      de: p.de,
      rotulo: p.rotulo.trim() || `${p.numero}a parcela`,
      valor: centavos(Number(p.valor)),
      vence_em: p.vence_em,
      item_slug: p.item_slug || null,
      metodo_previsto: p.metodo_previsto || "pix",
    })),
  );

  /* Contrato sem parcela é pior do que contrato nenhum: ele aparece na tela
     prometendo um plano que não existe. Se as parcelas não entraram, o
     contrato vai junto. */
  if (erroParcelas) {
    await supabase.from("crm_contratos").delete().eq("id", contrato.id);
    return { ok: false, erro: traduzirErro(erroParcelas) };
  }

  /* O espelho. Não passa pelo `moverLead` de propósito: mover para ganho é
     decisão de funil e pode já ter acontecido; aqui só se carimba o valor
     do que foi combinado, sem mexer em estágio nenhum. */
  if (!recorrencia) await espelharVendaNoLead(supabase, leadId);

  atualizarTelas();
  return { ok: true, id: contrato.id as string };
}

/* ---------- O ESPELHO SOMA, NÃO SOBRESCREVE (06/10) ----------
   `valor_fechado` e `fechado_em` do lead são o espelho dos contratos de
   projeto ATIVOS dele: a soma dos totais, e a data do primeiro. Até aqui o
   segundo contrato do mesmo cliente sobrescrevia os dois, e a venda
   anterior mudava de mês e de valor em Métricas, Financeiro e Plano.
   Cancelar ou apagar um contrato passa por aqui também, então o espelho
   nunca fica apontando para um contrato que não existe mais.
   O `.eq("estagio", "ganho")` é a guarda que impede um contrato de
   carimbar valor num lead que ainda está em negociação. */
type Supa = Awaited<ReturnType<typeof clienteServidor>>;
async function espelharVendaNoLead(supabase: Supa, leadId: string) {
  const { data } = await supabase
    .from("crm_contratos")
    .select("valor_total, assinado_em")
    .eq("lead_id", leadId)
    .eq("status", "ativo")
    .eq("tipo", "projeto")
    .returns<{ valor_total: number | null; assinado_em: string | null }[]>();
  const ativos = data ?? [];
  const total = somar(ativos.map((c) => Number(c.valor_total ?? 0)));
  const primeiro = ativos.map((c) => c.assinado_em).filter((d): d is string => Boolean(d)).sort()[0] ?? null;
  await supabase
    .from("crm_leads")
    .update(
      ativos.length
        ? { valor_fechado: total, fechado_em: primeiro ?? hojeSP() }
        : { valor_fechado: null, fechado_em: null },
    )
    .eq("id", leadId)
    .eq("estagio", "ganho");
}

/* Os contratos de projeto ainda de pé de um lead: é o que o "Fechou" lê
   antes de montar outro. */
export async function contratosAtivosDoLead(
  leadId: string,
): Promise<{ id: string; titulo: string; valor_total: number | null }[]> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("crm_contratos")
    .select("id, titulo, valor_total")
    .eq("lead_id", leadId)
    .eq("status", "ativo")
    .eq("tipo", "projeto")
    .order("assinado_em")
    .returns<{ id: string; titulo: string; valor_total: number | null }[]>();
  return (data ?? []).map((c) => ({ ...c, valor_total: c.valor_total == null ? null : Number(c.valor_total) }));
}

/* ---------- VOLTAR PARA GANHO SEM CONTRATO NOVO (06/10) ----------
   O lead que saiu de Ganho por engano e volta já tem contrato. Criar outro
   dobrava o "Contratado" e as parcelas. Aqui o ganho volta e o espelho
   recarimba o valor dos contratos que já existem. */
export async function voltarParaGanho(leadId: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const ativos = await contratosAtivosDoLead(leadId);
  if (!ativos.length) return { ok: false, erro: "Este lead não tem contrato de pé. Monte o plano para fechar." };
  const r = await moverLead(leadId, "ganho", null, {
    valor_fechado: somar(ativos.map((c) => c.valor_total ?? 0)),
    fechado_em: hojeSP(),
  });
  if (!r.ok) return r;
  await espelharVendaNoLead(supabase, leadId);
  atualizarTelas();
  return { ok: true };
}

/* ---------- CANCELAR O CONTRATO (06/10) ----------
   A ação que `apagarContrato` mandava usar e não existia. Cancelar deixa o
   histórico: o contrato vira `cancelado`, as parcelas que ainda deviam
   ganham `cancelada_em`, as já pagas ficam como estão (dinheiro que entrou
   é fato), e o espelho do lead é refeito. Nenhuma tela de cobrança lê mais
   parcela de contrato cancelado (`cobravel`). */
export async function cancelarContrato(id: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  const { data: contrato } = await supabase
    .from("crm_contratos")
    .select("lead_id, status")
    .eq("id", id)
    .maybeSingle<{ lead_id: string; status: string }>();
  if (!contrato) return { ok: false, erro: "Contrato não encontrado." };
  if (contrato.status === "cancelado") return { ok: true };

  const { data: parcelas } = await supabase
    .from("crm_parcelas")
    .select("id, valor, cancelada_em, crm_recebimentos(valor, estornado_em)")
    .eq("contrato_id", id)
    .returns<{ id: string; valor: number; cancelada_em: string | null; crm_recebimentos: { valor: number; estornado_em: string | null }[] | null }[]>();
  const devendo = (parcelas ?? []).filter((p) => {
    if (p.cancelada_em) return false;
    const pago = somar((p.crm_recebimentos ?? []).filter((r) => !r.estornado_em).map((r) => Number(r.valor)));
    return pago < Number(p.valor) - 0.005;
  });
  if (devendo.length) {
    const { error } = await supabase
      .from("crm_parcelas")
      .update({ cancelada_em: hojeSP() })
      .in("id", devendo.map((p) => p.id));
    if (error) return { ok: false, erro: traduzirErro(error) };
  }

  const { error } = await supabase.from("crm_contratos").update({ status: "cancelado" }).eq("id", id);
  if (error) return { ok: false, erro: traduzirErro(error) };

  await espelharVendaNoLead(supabase, contrato.lead_id);
  atualizarTelas();
  return { ok: true };
}

/* ---------- FECHOU: GANHO, CONTRATO E O QUE JÁ CAIU, NUM PASSO (06/10) ----------
   O ganho parava no card. A SneakerSpot fechou em 06/10, foi para Ganho com
   R$ 1.000, e Caixa, Financeiro e Plano não viram nada: os três leem
   contrato, parcela e recebimento, e cada um era um passo à parte (o
   contrato escondido na ficha, a baixa noutra tela). Agora "Fechou" faz os
   três, nesta ordem:
     1. o ganho, com o valor do plano. Primeiro porque o espelho do valor
        em `fecharContrato` só carimba lead que JÁ está em ganho;
     2. o contrato e as parcelas;
     3. a baixa das parcelas marcadas como "já recebi", pelo número.
   Contrato que falha deixa o lead em ganho, e a ficha continua oferecendo
   "Montar contrato" (o mesmo modal). Nunca marcar ganho sem plano. */
export async function fecharVenda(
  leadId: string,
  contrato: Parameters<typeof fecharContrato>[1],
  pagas: { numero: number; recebido_em: string; metodo: string }[],
): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  const { data: lead } = await supabase.from("crm_leads").select("estagio").eq("id", leadId).maybeSingle<{ estagio: Estagio }>();
  if (!lead) return { ok: false, erro: "Lead não encontrado." };

  const valor =
    contrato.tipo === "recorrencia"
      ? Number(contrato.valor_ciclo)
      : Number(contrato.valor_total);
  const fechado_em = contrato.assinado_em || hojeSP();

  /* Já tem contrato de projeto de pé: não nasce outro (06/10). O modal já
     avisa e troca o botão por "Voltar para Ganho"; esta guarda é para a
     aba velha que mandou o plano mesmo assim. */
  if (contrato.tipo !== "recorrencia") {
    const ativos = await contratosAtivosDoLead(leadId);
    if (ativos.length) return voltarParaGanho(leadId);
  }

  if (lead.estagio !== "ganho") {
    const r = await moverLead(leadId, "ganho", null, { valor_fechado: valor, fechado_em });
    if (!r.ok) return r;
  }

  const c = await fecharContrato(leadId, { ...contrato, assinado_em: fechado_em });
  if (!c.ok) return c;

  if (pagas.length) {
    const { data: parcelas } = await supabase
      .from("crm_parcelas")
      .select("id, numero, valor")
      .eq("contrato_id", c.id)
      .returns<{ id: string; numero: number; valor: number }[]>();
    for (const paga of pagas) {
      const parcela = parcelas?.find((p) => p.numero === paga.numero);
      if (!parcela) continue;
      const r = await lancarRecebimento({
        parcela_id: parcela.id,
        valor: Number(parcela.valor),
        recebido_em: paga.recebido_em,
        metodo: paga.metodo,
      });
      if (!r.ok) return { ok: false, erro: `O contrato entrou, mas a baixa da parcela ${paga.numero} não: ${"erro" in r ? r.erro : ""}` };
    }
  }

  atualizarTelas();
  return { ok: true };
}

/* ---------- MAIS MENSALIDADES ----------
   A recorrência nasce com poucas parcelas (três) de propósito: cancelar
   doze depois é doze cliques. Quando as geradas estão acabando, este botão
   gera mais N a partir da última, no mesmo dia do mês e no mesmo valor
   (`valor_ciclo`). Não mexe em parcela existente. */
export async function gerarProximasMensalidades(contratoId: string, meses = 3): Promise<Resultado> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();
  const quantas = Math.max(1, Math.min(12, Math.floor(Number(meses) || 3)));

  const { data: c } = await supabase
    .from("crm_contratos")
    .select("id, lead_id, tipo, valor_ciclo, status")
    .eq("id", contratoId)
    .maybeSingle<{ id: string; lead_id: string; tipo: string; valor_ciclo: number | null; status: string }>();
  if (!c) return { ok: false, erro: "Contrato não encontrado." };
  if (c.tipo !== "recorrencia" || !c.valor_ciclo) return { ok: false, erro: "Este contrato não é uma mensalidade." };
  if (c.status !== "ativo") return { ok: false, erro: "Este contrato está cancelado." };

  const { data: ultimas } = await supabase
    .from("crm_parcelas")
    .select("numero, vence_em")
    .eq("contrato_id", contratoId)
    .order("vence_em", { ascending: false })
    .limit(1)
    .returns<{ numero: number; vence_em: string }[]>();
  const ultima = ultimas?.[0];
  if (!ultima) return { ok: false, erro: "A mensalidade não tem parcela nenhuma para continuar." };

  const novas = gerarMensalidades({
    valor: Number(c.valor_ciclo),
    meses: quantas,
    primeiro: somarMeses(ultima.vence_em, 1),
    aPartirDe: ultima.numero + 1,
    somarMeses,
  });

  const { error } = await supabase.from("crm_parcelas").insert(
    novas.map((p) => ({
      owner_id: usuario.id,
      contrato_id: contratoId,
      lead_id: c.lead_id,
      numero: p.numero,
      de: null,
      rotulo: p.rotulo,
      valor: p.valor,
      vence_em: p.vence_em,
      item_slug: p.item_slug,
      metodo_previsto: p.metodo_previsto ?? "pix",
    })),
  );
  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/* ---------- DAR BAIXA ----------
   A ação mais apertada da aba, e por isso a que aceita menos coisa: valor,
   data, método. Ela é chamada de três lugares (a linha da parcela na ficha,
   a lista de devedores do Caixa e a carta da fila do dia) e nos três o caso
   comum é um clique com tudo já preenchido. */
export async function lancarRecebimento(dados: {
  parcela_id?: string | null;
  lead_id?: string | null;
  valor: number;
  recebido_em?: string;
  metodo?: string;
  valor_liquido?: number | null;
  notas?: string | null;
}): Promise<Resultado> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();

  const valor = centavos(Number(dados.valor));
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, erro: "O valor recebido precisa ser maior que zero." };
  }

  /* O lead vem da parcela quando há parcela: pedir os dois à tela seria
     deixar o dinheiro de um cliente cair na conta de outro por um campo
     esquecido num formulário. */
  let leadId = dados.lead_id ?? null;
  if (dados.parcela_id) {
    const { data: parcela } = await supabase
      .from("crm_parcelas")
      .select("lead_id")
      .eq("id", dados.parcela_id)
      .maybeSingle<{ lead_id: string }>();
    if (!parcela) return { ok: false, erro: "Parcela não encontrada." };
    leadId = parcela.lead_id;
  }

  const { error } = await supabase.from("crm_recebimentos").insert({
    owner_id: usuario.id,
    parcela_id: dados.parcela_id || null,
    lead_id: leadId,
    valor,
    valor_liquido: dados.valor_liquido == null ? null : centavos(Number(dados.valor_liquido)),
    /* `hojeSP()` e nunca `new Date()`: o servidor da Vercel roda em UTC, e
       uma baixa lançada às 22h cairia no dia seguinte. Na virada do mês,
       cairia no mês seguinte, e o mês fecharia errado todo mês. */
    recebido_em: dados.recebido_em || hojeSP(),
    metodo: dados.metodo || "pix",
    origem: "manual",
    notas: dados.notas?.trim() || null,
  });

  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/** Desfazer uma baixa lançada por engano. Some de vez: erro de digitação
    não é histórico, é erro. Estorno de verdade (o cliente pediu o dinheiro
    de volta) é outra ação, logo abaixo, e ela guarda a linha. */
export async function apagarRecebimento(id: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase.from("crm_recebimentos").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/** O dinheiro voltou (estorno, chargeback). A linha FICA, com a data: ela
    aconteceu, e um mês já fechado precisa poder ser reconstruído. O que muda
    é que ela para de contar em toda soma de recebido. */
export async function estornarRecebimento(id: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("crm_recebimentos")
    .update({ estornado_em: hojeSP() })
    .eq("id", id);
  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/** Amarrar um recebimento órfão (o que o webhook gravou sem entender) a uma
    parcela. O lead vem junto, pela mesma razão do `lancarRecebimento`. */
export async function amarrarRecebimento(id: string, parcelaId: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  const { data: parcela } = await supabase
    .from("crm_parcelas")
    .select("lead_id")
    .eq("id", parcelaId)
    .maybeSingle<{ lead_id: string }>();
  if (!parcela) return { ok: false, erro: "Parcela não encontrada." };

  const { error } = await supabase
    .from("crm_recebimentos")
    .update({ parcela_id: parcelaId, lead_id: parcela.lead_id })
    .eq("id", id);

  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/* ---------- ADIAR A COBRANÇA ----------
   Mexe em `cobrar_em` e NUNCA em `vence_em`, e essa é a decisão inteira
   desta função: o vencimento é fato combinado com o cliente, e empurrá-lo
   para calar a tela reescreveria o combinado. O que se adia é a minha
   vontade de cobrar, não a dívida dele.

   A conta parte de HOJE, como o `adiar()` dos leads e pelo mesmo motivo
   escrito lá em cima: "+1 dia" a partir de uma data velha não move a fila. */
export async function adiarCobranca(parcelaId: string, dias: number): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("crm_parcelas")
    .update({ cobrar_em: somarDias(hojeSP(), dias) })
    .eq("id", parcelaId);
  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

/** Deixou de ser devida (escopo cortado, permuta que cobriu, acordo). Data
    e não exclusão: um mês já fechado precisa continuar batendo. */
export async function cancelarParcela(parcelaId: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("crm_parcelas")
    .update({ cancelada_em: hojeSP() })
    .eq("id", parcelaId);
  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

export async function reativarParcela(parcelaId: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("crm_parcelas")
    .update({ cancelada_em: null })
    .eq("id", parcelaId);
  if (error) return { ok: false, erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true };
}

export async function apagarContrato(id: string): Promise<Resultado> {
  await exigirSessao();
  const supabase = await clienteServidor();

  /* A cascata do banco levaria as parcelas e, por elas, os recebimentos.
     Apagar um contrato com dinheiro dentro é apagar caixa, e caixa não se
     apaga por engano: se a venda não aconteceu, o caminho é cancelar. */
  const { data: parcelas } = await supabase
    .from("crm_parcelas")
    .select("id")
    .eq("contrato_id", id)
    .returns<{ id: string }[]>();

  if (parcelas?.length) {
    const { count } = await supabase
      .from("crm_recebimentos")
      .select("id", { count: "exact", head: true })
      .in(
        "parcela_id",
        parcelas.map((p) => p.id),
      );
    if (count) {
      return { ok: false, erro: "Este contrato tem dinheiro recebido. Cancele em vez de apagar." };
    }
  }

  const { data: dono } = await supabase.from("crm_contratos").select("lead_id").eq("id", id).maybeSingle<{ lead_id: string }>();
  const { error } = await supabase.from("crm_contratos").delete().eq("id", id);
  if (error) return { ok: false, erro: traduzirErro(error) };
  /* o espelho do lead não pode apontar para um contrato que sumiu */
  if (dono) await espelharVendaNoLead(supabase, dono.lead_id);
  atualizarTelas();
  return { ok: true };
}
