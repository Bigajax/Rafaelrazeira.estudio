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
import {
  destinoDoToque,
  emailNormal,
  hojeSP,
  oQueFalta,
  PADRAO_DO_DESTINO,
  posicaoEntre,
  soDigitos,
  somarDias,
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
    /* Só quando `resposta` é "nao": o que a placa de perdido exige. */
    motivo_perda?: MotivoPerda | null;
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

  if (dados.proximo_passo || dados.proxima_acao_em) {
    const { error: erroPasso } = await supabase
      .from("crm_leads")
      .update({
        proximo_passo: dados.proximo_passo?.trim() || null,
        proxima_acao_em: dados.proxima_acao_em || null,
      })
      .eq("id", leadId);
    if (erroPasso) return { ok: false, erro: traduzirErro(erroPasso) };
  }

  if (lead) {
    const destino = destinoDoToque(dados.direcao, lead.estagio, dados.resposta);
    if (destino && destino !== lead.estagio) {
      /* Escolhido = o Rafael marcou o teor da resposta e este destino é o
         trabalho que ele pediu. Automático = o trilho mecânico, que é
         cortesia e cala a boca quando não dá. */
      const escolhido = dados.resposta === "nao" || dados.resposta === "depois";

      const passagem: Passagem = {};

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
