/* ============================================================
   AS CONSULTAS

   Um arquivo por onde toda leitura passa. Nenhuma tela monta consulta
   própria, e a razão é o RLS: ele já filtra por dono em toda linha, então
   uma consulta escrita na tela parece inofensiva e é. O que ela não é é
   conferível: o dia em que o painel Hoje e o kanban discordarem sobre o que
   conta como "atrasado", o bug vai estar em duas telas e a correção em uma.

   Todas rodam no servidor, com a sessão do cookie.
   ============================================================ */

import { clienteServidor } from "./supabase";
import {
  diaEmSP,
  diasEntre,
  hojeSP,
  inicioDaSemana,
  JANELA_HORIZONTE,
  ordenarColuna,
  somarDias,
} from "./regras";
import {
  centavos,
  deveAinda,
  mesDe,
  mesesAFrente,
  mesesDoAno,
  quitacaoDoContrato,
  quitado,
  situacaoDaParcela,
  somar,
} from "./financeiro";
import {
  ehAtivo,
  ESTAGIOS_ATIVOS,
  ESTAGIOS_NO_PIPELINE,
  type Contrato,
  type Interacao,
  type Lead,
  type LeadPainel,
  type Meta,
  type Metodo,
  type Parcela,
  type ParcelaPainel,
  type Recebimento,
  type Template,
} from "./tipos";

const ATIVOS = ESTAGIOS_ATIVOS as readonly string[];
const NO_PIPELINE = ESTAGIOS_NO_PIPELINE as readonly string[];

/* ============================================================
   PAINEL HOJE — a fila de execução

   Uma consulta só, não três. Os leads ativos de um estúdio solo cabem
   folgadamente numa página, e trazer tudo de uma vez e separar em memória
   evita três idas ao banco que teriam que ser consistentes entre si.
   ============================================================ */
export async function painelHoje() {
  const supabase = await clienteServidor();
  const hoje = hojeSP();
  const segunda = inicioDaSemana(hoje);

  const [{ data: leads }, { data: meta }, { count: toquesSemana }] = await Promise.all([
    supabase
      .from("crm_leads_painel")
      .select("*")
      .in("estagio", ATIVOS)
      .order("proxima_acao_em", { ascending: true, nullsFirst: false })
      .returns<LeadPainel[]>(),
    supabase.from("crm_metas").select("id, toques_semana").limit(1).maybeSingle<Meta>(),
    /* `head: true` traz só a contagem, sem uma linha sequer de payload: o
       número da faixa não precisa das interações, precisa de quantas são.
       O `+ 1` no fim do intervalo é o dia seguinte à meia-noite: interações
       são timestamp, e comparar com a data pura deixaria de fora tudo que
       aconteceu depois das 00h do domingo. */
    supabase
      .from("crm_interacoes")
      .select("id", { count: "exact", head: true })
      .eq("direcao", "saida")
      .gte("created_at", `${segunda}T00:00:00-03:00`)
      .lt("created_at", `${somarDias(segunda, 7)}T00:00:00-03:00`),
  ]);

  /* ============================================================
     A COBRANÇA ENTRA NA FILA (20/08)

     Cobrar a ArraZou é uma conversa com a ArraZou, então a parcela não vira
     um segundo tipo de item de fila: ela viaja NO LEAD, e `Hoje.tsx`
     continua emendando `[...atrasados, ...paraHoje, ...semPasso]` sem saber
     que alguma coisa mudou.

     A consulta é separada por um motivo que não é preguiça: um cliente que
     deve está em `ganho`, e `ganho` está FORA de `ESTAGIOS_ATIVOS`. A
     consulta lá em cima nunca o traria. O único cliente que já entregou e
     ainda não recebeu era justamente o invisível da fila.
     ============================================================ */
  const cobrancasPorLead = await cobrancasAbertas(supabase, hoje);
  const jaNaLista = new Set((leads ?? []).map((l) => l.id));
  const devedoresDeFora = [...cobrancasPorLead.keys()].filter((id) => !jaNaLista.has(id));

  const { data: ganhosQueDevem } = devedoresDeFora.length
    ? await supabase
        .from("crm_leads_painel")
        .select("*")
        .in("id", devedoresDeFora)
        .returns<LeadPainel[]>()
    : { data: [] as LeadPainel[] };

  const lista = [...(leads ?? []), ...(ganhosQueDevem ?? [])].map((l) => ({
    ...l,
    cobranca: cobrancasPorLead.get(l.id) ?? null,
  }));

  /* ---------- a data que põe na fila ----------
     A mais próxima entre as duas: o retorno marcado e a cobrança vencida.
     Nada de forjar `proxima_acao_em` no objeto com a data da parcela — um
     lead ganho não tem próximo passo agendado, e escrever um seria mentir
     justamente na coluna em que o resto do CRM confia. */
  const naFila = (l: (typeof lista)[number]) => {
    const cobranca = l.cobranca?.quando ?? null;
    if (!l.proxima_acao_em) return cobranca;
    if (!cobranca) return l.proxima_acao_em;
    return l.proxima_acao_em < cobranca ? l.proxima_acao_em : cobranca;
  };

  const atrasados = lista.filter((l) => {
    const d = naFila(l);
    return d !== null && d < hoje;
  });
  const paraHoje = lista.filter((l) => naFila(l) === hoje);
  /* Sem passo continua sendo só sobre o funil: um cliente ganho que não deve
     nada não está "sem próximo passo", ele terminou. */
  const semPasso = lista.filter((l) => !l.proxima_acao_em && !l.cobranca && ehAtivo(l.estagio));

  /* ---------- OS RISCADOS ----------
     Quem eu falei hoje E que já tem retorno marcado para depois de hoje.
     São as duas metades de "resolvido", e as duas são necessárias: um lead
     tocado hoje que continua sem data ainda está na fila (o modal de
     mensagem registra o toque sem marcar retorno), e riscar um nome que
     continua embaixo faria a tela dizer duas coisas sobre a mesma pessoa.

     Por que `ultimo_toque_em` e não `updated_at`: `updated_at` sobe a cada
     alteração, então corrigir a grafia de um nome carimbaria o lead como
     falado hoje. A pilha do dia é a prova do trabalho, e prova que conta a
     mais não é prova.

     Nenhuma consulta nova: sai de `lista`, que já veio inteira acima. */
  const riscados = lista
    .filter((l) => l.ultimo_toque_em && diaEmSP(l.ultimo_toque_em) === hoje)
    .filter((l) => l.proxima_acao_em && l.proxima_acao_em > hoje)
    .sort((a, b) => (a.ultimo_toque_em as string).localeCompare(b.ultimo_toque_em as string));

  /* ============================================================
     O HORIZONTE — o que a tela mostra quando não há nada para hoje

     A fila do dia é feita de três grupos, e um lead marcado para daqui a
     três dias não está em nenhum deles. Isso é a tela funcionando: ela
     responde "quem eu falo AGORA", e mostrar o que não é para hoje
     destruiria a pergunta.

     O efeito colateral é que uma fila zerada e um CRM vazio desenham
     exatamente a mesma tela, e quem olha não tem como saber se acabou o
     trabalho ou se a ferramenta quebrou. O horizonte responde só isso: os
     dias em que alguém volta a cobrar, sem nome e sem botão. Não dá para
     trabalhar adiantado a partir dele, que é a diferença entre um
     instrumento de status e uma segunda fila.

     Nenhuma consulta nova: sai de `lista`, que já veio inteira acima.
     ============================================================ */
  const porDia = new Map<string, number>();
  for (const l of lista) {
    if (!l.proxima_acao_em || l.proxima_acao_em <= hoje) continue;
    porDia.set(l.proxima_acao_em, (porDia.get(l.proxima_acao_em) ?? 0) + 1);
  }
  const futuros = [...porDia.entries()]
    .map(([data, n]) => ({ data, n }))
    .sort((a, b) => a.data.localeCompare(b.data));

  const limite = somarDias(hoje, JANELA_HORIZONTE);

  /* ---------- O QUENTE FURA A FILA ----------
     Dentro de cada grupo, quem a pesquisa marcou como quente vem antes:
     quente é prospect ideal identificado, e prospect ideal esfriando na
     posição 14 da fila é dinheiro parado. A ordem dos GRUPOS não muda
     (atrasado continua sendo dívida antes de tudo): o veredito só
     reordena dentro de cada um, e o sort estável preserva o critério
     antigo (mais atrasado, mais parado) como desempate entre iguais.
     Sem dossiê fica entre morno e frio: não sabemos, e o não-sei anda
     atrás de quem já foi conferido. */
  const FILA_VEREDITO: Record<string, number> = { quente: 0, morno: 1, frio: 3 };
  const calorDaFila = (l: (typeof lista)[number]) =>
    FILA_VEREDITO[(l.dossie?.status === "ok" && l.dossie.veredito) || ""] ?? 2;
  const quentePrimeiro = <T extends (typeof lista)[number]>(grupo: T[]) =>
    [...grupo].sort((a, b) => calorDaFila(a) - calorDaFila(b));

  return {
    hoje,
    /* Mais atrasado primeiro: a fila é de execução, e o que espera há mais
       tempo é o que corre mais risco de virar "sumiu, sem resposta". */
    atrasados: quentePrimeiro(atrasados),
    paraHoje: quentePrimeiro(paraHoje),
    /* Sem próximo passo não tem data para ordenar, então ordena pelo que
       está parado há mais tempo, que é a mesma pergunta por outro caminho. */
    semPasso: quentePrimeiro(
      [...semPasso].sort((a, b) => a.entrou_no_estagio_em.localeCompare(b.entrou_no_estagio_em)),
    ),
    /* Na ordem em que foram riscados: a pilha do dia se lê de cima para
       baixo, como a folha foi sendo preenchida. */
    riscados,
    /* Os dentes da linha: só o que cabe na janela. */
    horizonte: futuros.filter((d) => d.data <= limite),
    /* E o próximo retorno inteiro, caia ele onde cair. É ele que impede a
       linha de mentir: com o retorno mais próximo a vinte dias, o filete
       fica reto por não ter dente nenhum na janela, e é este campo que
       escreve a data de verdade logo abaixo. */
    proximoRetorno: futuros[0] ?? null,
    toquesSemana: toquesSemana ?? 0,
    metaSemana: meta?.toques_semana ?? 50,
    /* Pipeline aberto: só ticket estimado, e só de quem está no jogo AGORA.
       Ganho já não é pipeline, é faturamento, e vive na tela de métricas; a
       geladeira é ativa mas está dormindo, e somar o ticket de quem pediu
       para ser chamado em novembro faria o número prometer dinheiro que
       ninguém está perseguindo neste ciclo. Mesma conta da faixa do quadro
       e da tela de métricas: os três precisam bater. */
    pipelineAberto: lista
      .filter((l) => NO_PIPELINE.includes(l.estagio))
      .reduce((soma, l) => soma + (l.ticket_estimado ?? 0), 0),
    /* `ativos` conta o quadro de pé, geladeira incluída: ela É um lead vivo
       que ainda vai voltar, e o número existe para dizer o tamanho da
       carteira, não o do ciclo. */
    ativos: lista.length,
  };
}

/* ============================================================
   AS CONTAGENS DO TRILHO

   Três números, um por rota que tem o que contar. Eles existem porque a
   navegação sabia os NOMES das telas e não sabia nada sobre elas: "Hoje"
   com sete pessoas esperando e "Hoje" com a fila zerada eram exatamente o
   mesmo rótulo, e a única forma de descobrir era abrir.

   Métricas não conta nada de propósito. Ela não acumula trabalho: é a tela
   que se olha quando se quer olhar, e um número ali seria um número para
   ter número.

   Ela roda no layout, ou seja, em toda navegação do CRM. São duas consultas
   curtas e o volume de um estúdio solo é de centenas de linhas: o custo é
   menor que o de manter a contagem em cache e descobrir que ela mentiu.
   ============================================================ */
export async function contagens() {
  const supabase = await clienteServidor();
  const hoje = hojeSP();

  const [{ data: leads }, { count: templates }, { data: cobrancas }] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("proxima_acao_em")
      .in("estagio", ATIVOS)
      .returns<Pick<Lead, "proxima_acao_em">[]>(),
    supabase.from("crm_templates").select("id", { count: "exact", head: true }),
    /* As parcelas vivas que já chegaram no dia de cobrar. Traz as linhas em
       vez de `head: true` porque quitação é soma de recebimentos, e o banco
       não sabe disso sozinho: quem decide se ainda deve é a conta em
       JavaScript logo abaixo. São poucas dezenas de linhas. */
    supabase
      .from("crm_parcelas")
      .select("id, valor, vence_em, cobrar_em, cancelada_em, crm_recebimentos(valor, estornado_em)")
      .is("cancelada_em", null)
      .lte("vence_em", hoje)
      .returns<ParcelaComRecebimentos[]>(),
  ]);

  const lista = leads ?? [];

  return {
    /* A MESMA definição de fila do painel Hoje, e ela precisa continuar
       sendo: o trilho dizendo "3" com quatro cartas na tela é pior do que o
       trilho não dizer nada. Atrasado, hoje e sem próximo passo. */
    fila: lista.filter((l) => !l.proxima_acao_em || l.proxima_acao_em <= hoje).length,
    ativos: lista.length,
    templates: templates ?? 0,
    /* Parcelas vivas cujo dia de cobrança já chegou e que ainda devem. Ela
       ganha cor no trilho pela regra que o próprio Trilho.tsx já escreve,
       "no trilho inteiro, quem fala é quem vai te cobrar": parcela vencida
       é literalmente cobrança. */
    cobrar: (cobrancas ?? []).filter((p) => {
      const quando = p.cobrar_em || p.vence_em;
      if (quando > hoje) return false;
      return !quitado(centavos(Number(p.valor) - recebidoDaParcela(p)));
    }).length,
  };
}

/* A forma que o PostgREST devolve quando a parcela pede os recebimentos
   junto. `crm_recebimentos` vem como array embutido pelo relacionamento. */
type ParcelaComRecebimentos = {
  id: string;
  valor: number;
  vence_em: string;
  cobrar_em: string | null;
  cancelada_em: string | null;
  crm_recebimentos: { valor: number; estornado_em: string | null }[] | null;
};

/** Soma o que entrou numa parcela, ignorando o que foi estornado. */
const recebidoDaParcela = (p: ParcelaComRecebimentos) =>
  somar((p.crm_recebimentos ?? []).filter((r) => !r.estornado_em).map((r) => Number(r.valor)));

export type Contagens = Awaited<ReturnType<typeof contagens>>;

/* ============================================================
   KANBAN
   ============================================================ */
export async function quadro() {
  const supabase = await clienteServidor();

  const { data } = await supabase
    .from("crm_leads_painel")
    .select("*")
    .order("posicao", { ascending: true })
    .returns<LeadPainel[]>();

  const leads = ordenarColuna(data ?? []);

  /* Os nichos do filtro saem do próprio dado, e não de uma lista fixa: o
     estúdio prospecta o ramo que aparecer, e uma lista escrita à mão
     começaria errada e envelheceria. */
  const nichos = [...new Set(leads.map((l) => l.nicho).filter((n): n is string => Boolean(n?.trim())))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );

  return { leads, nichos, hoje: hojeSP() };
}

/* ============================================================
   DETALHE DO LEAD
   ============================================================ */
export async function leadCompleto(id: string) {
  const supabase = await clienteServidor();

  const { data: lead } = await supabase
    .from("crm_leads_painel")
    .select("*")
    .eq("id", id)
    .maybeSingle<LeadPainel>();

  if (!lead) return null;

  const [{ data: interacoes }, { data: indicados }, { data: quemIndicou }, { data: templates }] =
    await Promise.all([
      supabase
        .from("crm_interacoes")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false })
        .returns<Interacao[]>(),
      supabase
        .from("crm_leads")
        .select("id, nome, empresa, estagio")
        .eq("indicado_por", id)
        .order("created_at", { ascending: false })
        .returns<Pick<Lead, "id" | "nome" | "empresa" | "estagio">[]>(),
      lead.indicado_por
        ? supabase
            .from("crm_leads")
            .select("id, nome, empresa, estagio")
            .eq("id", lead.indicado_por)
            .maybeSingle<Pick<Lead, "id" | "nome" | "empresa" | "estagio">>()
        : Promise.resolve({ data: null }),
      supabase
        .from("crm_templates")
        .select("*")
        .order("ordem", { ascending: true })
        .returns<Template[]>(),
    ]);

  return {
    lead,
    interacoes: interacoes ?? [],
    indicados: indicados ?? [],
    quemIndicou: quemIndicou ?? null,
    templates: templates ?? [],
    contratos: await contratosDoLead(id),
    hoje: hojeSP(),
  };
}

/* ============================================================
   O DINHEIRO DE UM LEAD — o bloco que a ficha desenha

   Contratos, parcelas e o que já entrou em cada uma. Consulta separada da
   `leadCompleto` para poder ser chamada sozinha pela tela do Caixa, e o
   `recebido` de cada parcela é somado AQUI, em JavaScript, e não por uma
   view: view congela colunas no create (a nota de 16/08 no crm.sql conta o
   que isso custou), e três leads por tela não justificam a rigidez.
   ============================================================ */
export type ContratoPainel = Contrato & {
  parcelas: ParcelaPainel[];
  /* Recebimentos que não caíram em parcela nenhuma mas são deste lead. */
  avulsos: Recebimento[];
};

export async function contratosDoLead(leadId: string): Promise<ContratoPainel[]> {
  const supabase = await clienteServidor();

  const [{ data: contratos }, { data: parcelas }, { data: recebimentos }] = await Promise.all([
    supabase
      .from("crm_contratos")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .returns<Contrato[]>(),
    supabase
      .from("crm_parcelas")
      .select("*")
      .eq("lead_id", leadId)
      .order("numero", { ascending: true })
      .returns<Parcela[]>(),
    supabase
      .from("crm_recebimentos")
      .select("*")
      .eq("lead_id", leadId)
      .order("recebido_em", { ascending: false })
      .returns<Recebimento[]>(),
  ]);

  const pagoPorParcela = new Map<string, number>();
  for (const r of recebimentos ?? []) {
    if (!r.parcela_id || r.estornado_em) continue;
    pagoPorParcela.set(r.parcela_id, (pagoPorParcela.get(r.parcela_id) ?? 0) + Number(r.valor));
  }

  const avulsos = (recebimentos ?? []).filter((r) => !r.parcela_id);

  return (contratos ?? []).map((c) => ({
    ...c,
    parcelas: (parcelas ?? [])
      .filter((p) => p.contrato_id === c.id)
      .map((p) => ({
        ...p,
        recebido: centavos(pagoPorParcela.get(p.id) ?? 0),
        contrato_titulo: c.titulo,
        lead_nome: "",
        lead_whatsapp: null,
        lead_instagram: null,
      })),
    /* Os avulsos moram no contrato mais recente e não em todos: repetir a
       mesma linha de dinheiro em dois blocos faria o total parecer dobrado
       para quem lê de relance. */
    avulsos: c.id === contratos?.[0]?.id ? avulsos : [],
  }));
}

/* ============================================================
   TEMPLATES
   ============================================================ */
export async function listarTemplates() {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("crm_templates")
    .select("*")
    .order("ordem", { ascending: true })
    .returns<Template[]>();
  return data ?? [];
}

/* ============================================================
   MÉTRICAS

   Tudo sai de duas leituras: as interações do período e os leads. As contas
   acontecem aqui em JavaScript, e não em SQL, por um motivo prático: o
   volume de um estúdio solo é de centenas de linhas, não de milhões, e sete
   funções de agregação no Postgres seriam sete lugares para conferir
   quando um número parecer errado. O critério de aceite é "as métricas
   batem com uma conferência manual de 10 leads", e conferir à mão é muito
   mais fácil contra código que se lê de cima para baixo.
   ============================================================ */
export async function metricas(dias: 7 | 30 | 90) {
  const supabase = await clienteServidor();
  const hoje = hojeSP();
  const inicio = somarDias(hoje, -(dias - 1));

  const [{ data: interacoes }, { data: leads }, { data: meta }] = await Promise.all([
    supabase
      .from("crm_interacoes")
      .select("id, lead_id, canal, direcao, created_at")
      .gte("created_at", `${inicio}T00:00:00-03:00`)
      .order("created_at", { ascending: true })
      .returns<Interacao[]>(),
    supabase.from("crm_leads").select("*").returns<Lead[]>(),
    supabase.from("crm_metas").select("id, toques_semana").limit(1).maybeSingle<Meta>(),
  ]);

  const toques = interacoes ?? [];
  const todos = leads ?? [];
  const metaSemana = meta?.toques_semana ?? 50;

  const noPeriodo = (data: string | null) => Boolean(data && data >= inicio && data <= hoje);

  /* ---------- atividade: toques de saída por semana ----------
     Só saída. Entrada é resposta do outro lado, e contar resposta como
     esforço próprio faria a meta ser batida por uma semana em que o Rafael
     não prospectou e três clientes antigos escreveram. */
  const semanas = new Map<string, number>();
  const primeiraSemana = inicioDaSemana(inicio);
  const totalSemanas = Math.floor(diasEntre(primeiraSemana, hoje) / 7) + 1;
  for (let i = 0; i < totalSemanas; i++) semanas.set(somarDias(primeiraSemana, i * 7), 0);

  for (const t of toques) {
    if (t.direcao !== "saida") continue;
    const dia = t.created_at.slice(0, 10);
    const semana = inicioDaSemana(dia);
    if (semanas.has(semana)) semanas.set(semana, (semanas.get(semana) ?? 0) + 1);
  }

  const porCanal = new Map<string, number>();
  for (const t of toques) porCanal.set(t.canal, (porCanal.get(t.canal) ?? 0) + 1);

  /* ---------- conversão por etapa ----------
     A pergunta é "de quem eu contatei no período, quantos chegaram até
     aqui?". Por isso a base é o lead que JÁ PASSOU de `lista`, e não o
     estágio em que ele está agora: um lead ganho passou por conversa e por
     proposta, e contar só a coluna atual mostraria zero em todas as etapas
     do meio.

     O que o dado permite afirmar: `crm_leads` guarda o estágio de agora e a
     data de entrada nele, não o histórico completo de passagens. Então
     "chegou até conversa" é lido como "está em conversa ou em qualquer
     estágio à frente dela, ganho incluído". É exato para o caminho normal e
     conta a menos para um lead que voltou atrás. Registrado aqui porque é a
     única imprecisão conhecida desta tela. */
  const ordem = ["lista", "contatado", "follow_up", "conversa", "previa", "proposta", "negociacao", "ganho"];
  const indice = (e: string) => (e === "perdido" ? -1 : ordem.indexOf(e));
  const criadosNoPeriodo = todos.filter((l) => noPeriodo(l.created_at.slice(0, 10)));

  const chegaramA = (estagio: string) => {
    const alvo = ordem.indexOf(estagio);
    return criadosNoPeriodo.filter((l) => {
      const atual = indice(l.estagio);
      /* Perdido guarda o ponto mais longe a que chegou? Não guarda. Um lead
         perdido conta nas etapas anteriores só se o motivo indicar que a
         conversa aconteceu, o que o dado não diz. Ele fica de fora do
         numerador e dentro do denominador, que é a leitura pessimista e a
         única honesta.

         A geladeira cai na mesma conta pelo mesmo motivo, e sem precisar
         de linha própria: ela não está em `ordem`, então `indexOf` devolve
         -1 e ela fica de fora do numerador. Um lead na geladeira PASSOU por
         conversa (ele respondeu), então isto conta a menos. É a mesma
         imprecisão do perdido, na mesma direção, e o dado que consertaria
         as duas (o histórico de passagens) não existe. */
      return atual >= alvo;
    }).length;
  };

  /* Cinco degraus, e a prévia entrou entre conversa e proposta porque é ali
     que ela mora no processo. Ela é a etapa mais informativa do funil: é a
     única em que o estúdio investe trabalho antes de cobrar, e a queda de
     "prévia" para "proposta" responde se esse investimento se paga. */
  const funil = [
    { etapa: "contatado", nome: "Contatado", n: chegaramA("contatado") },
    { etapa: "conversa", nome: "Conversa", n: chegaramA("conversa") },
    { etapa: "previa", nome: "Prévia", n: chegaramA("previa") },
    { etapa: "proposta", nome: "Proposta", n: chegaramA("proposta") },
    { etapa: "ganho", nome: "Ganho", n: chegaramA("ganho") },
  ];

  /* ---------- taxa de resposta ----------
     Leads com ao menos uma interação de entrada, sobre o total de leads que
     receberam ao menos uma de saída. O denominador é "contatado de verdade"
     e não "está na coluna Contatado": quem eu movi de coluna sem mandar
     mensagem nenhuma não pode entrar na conta de quem não me respondeu. */
  const comSaida = new Set(toques.filter((t) => t.direcao === "saida").map((t) => t.lead_id));
  const comEntrada = new Set(toques.filter((t) => t.direcao === "entrada").map((t) => t.lead_id));
  const responderam = [...comEntrada].filter((id) => comSaida.has(id)).length;

  /* ---------- ciclo médio ----------
     Dias entre criar o lead e fechar como ganho, nos ganhos do período. */
  const ganhosNoPeriodo = todos.filter((l) => l.estagio === "ganho" && noPeriodo(l.fechado_em));
  const ciclos = ganhosNoPeriodo.map((l) => diasEntre(l.created_at.slice(0, 10), l.fechado_em as string));
  const cicloMedio = ciclos.length ? Math.round(ciclos.reduce((a, b) => a + b, 0) / ciclos.length) : null;

  const perdidosNoPeriodo = todos.filter(
    (l) => l.estagio === "perdido" && noPeriodo(l.updated_at.slice(0, 10)),
  );
  const porMotivo = new Map<string, number>();
  for (const l of perdidosNoPeriodo) {
    const m = l.motivo_perda ?? "desistiu";
    porMotivo.set(m, (porMotivo.get(m) ?? 0) + 1);
  }

  return {
    dias,
    inicio,
    hoje,
    metaSemana,
    semanas: [...semanas.entries()].map(([semana, n]) => ({ semana, n })),
    canais: [...porCanal.entries()].sort((a, b) => b[1] - a[1]),
    funil,
    baseFunil: criadosNoPeriodo.length,
    respostas: { responderam, contatados: comSaida.size },
    cicloMedio,
    /* NO_PIPELINE e não ATIVOS: a geladeira é ativa (o painel Hoje devolve
       o lead na data marcada) mas o ticket de quem pediu para ser chamado
       daqui a dois meses não é dinheiro deste ciclo. Mesma conta da faixa
       do quadro, e o número precisa bater entre as duas telas. */
    pipelineAberto: todos
      .filter((l) => NO_PIPELINE.includes(l.estagio))
      .reduce((s, l) => s + (l.ticket_estimado ?? 0), 0),
    faturamento: ganhosNoPeriodo.reduce((s, l) => s + (l.valor_fechado ?? 0), 0),
    ganhos: ganhosNoPeriodo.length,
    motivos: [...porMotivo.entries()].sort((a, b) => b[1] - a[1]),
    perdidos: perdidosNoPeriodo.length,
    toquesPeriodo: toques.filter((t) => t.direcao === "saida").length,
  };
}

/* ============================================================
   O CAIXA — a aba do dinheiro

   Três leituras e toda a conta em memória, como o resto do arquivo. Ela
   responde quatro perguntas, e a ordem delas na tela é a ordem em que se
   pensa no dinheiro de um estúdio solo:

     1. quanto entra este mês        (previsto contra recebido)
     2. quem está me devendo         (o equivalente ao "atrasado" do Hoje)
     3. quanto cada cliente já pagou (a régua de quitação por contrato)
     4. o ano, mês a mês             (o estúdio está crescendo?)

   E uma quinta que ninguém pede e todo mundo precisa: o dinheiro que
   chegou e não bate com parcela nenhuma.

   ---------- por que ela lê o ano inteiro ----------
   O gráfico do ano precisa de doze meses, e um estúdio solo fecha algumas
   dezenas de contratos por ano: são centenas de linhas, não milhares.
   Trazer tudo de uma vez e fatiar em memória evita quatro consultas que
   teriam que concordar entre si sobre o que é "este mês".
   ============================================================ */
export async function caixa(ano: number) {
  const supabase = await clienteServidor();
  const hoje = hojeSP();
  const mesAtual = mesDe(hoje);
  const inicio = `${ano}-01-01`;
  const fim = `${ano}-12-31`;

  const [{ data: contratos }, { data: parcelas }, { data: recebimentos }, { data: leads }] =
    await Promise.all([
      supabase.from("crm_contratos").select("*").returns<Contrato[]>(),
      supabase
        .from("crm_parcelas")
        .select("*")
        .order("vence_em", { ascending: true })
        .returns<Parcela[]>(),
      supabase
        .from("crm_recebimentos")
        .select("*")
        .gte("recebido_em", inicio)
        .lte("recebido_em", fim)
        .order("recebido_em", { ascending: false })
        .returns<Recebimento[]>(),
      supabase
        .from("crm_leads")
        .select("id, nome, empresa, whatsapp, instagram")
        .returns<Pick<Lead, "id" | "nome" | "empresa" | "whatsapp" | "instagram">[]>(),
    ]);

  const porLead = new Map((leads ?? []).map((l) => [l.id, l]));
  const porContrato = new Map((contratos ?? []).map((c) => [c.id, c]));

  /* O que entrou em cada parcela, estornos fora. */
  const pagoPorParcela = new Map<string, number>();
  for (const r of recebimentos ?? []) {
    if (!r.parcela_id || r.estornado_em) continue;
    pagoPorParcela.set(r.parcela_id, (pagoPorParcela.get(r.parcela_id) ?? 0) + Number(r.valor));
  }

  const enriquecida = (p: Parcela): ParcelaPainel => {
    const lead = porLead.get(p.lead_id);
    return {
      ...p,
      valor: Number(p.valor),
      recebido: centavos(pagoPorParcela.get(p.id) ?? 0),
      contrato_titulo: porContrato.get(p.contrato_id)?.titulo ?? "",
      lead_nome: lead?.nome ?? "",
      lead_whatsapp: lead?.whatsapp ?? null,
      lead_instagram: lead?.instagram ?? null,
    };
  };

  const todasParcelas = (parcelas ?? []).map(enriquecida);
  const vivas = todasParcelas.filter((p) => !p.cancelada_em);

  /* ---------- 1. o mês ----------
     Previsto é o que VENCE no mês, recebido é o que ENTROU no mês, e os
     dois quase nunca são o mesmo conjunto: a parcela de julho paga em
     agosto conta como previsto de julho e recebido de agosto. É assim que
     tem que ser, e é justamente a diferença entre as duas linhas que diz
     se o estúdio está recebendo em dia. */
  const doMes = vivas.filter((p) => mesDe(p.vence_em) === mesAtual);
  const recebidoNoMes = (recebimentos ?? []).filter(
    (r) => !r.estornado_em && mesDe(r.recebido_em) === mesAtual,
  );

  /* ---------- 2. quem está devendo ----------
     Só o que já venceu, do maior atraso para o menor: a fila do dinheiro
     tem a mesma ordem da fila do dia, e pelo mesmo motivo (quem espera há
     mais tempo é quem corre mais risco de nunca pagar). */
  const devendo = vivas
    .map((p) => ({ parcela: p, s: situacaoDaParcela(p, hoje) }))
    .filter((x) => x.s.situacao === "atrasada")
    .sort((a, b) => b.s.atraso - a.s.atraso);

  const aReceber = vivas
    .map((p) => ({ parcela: p, s: situacaoDaParcela(p, hoje) }))
    .filter((x) => deveAinda(x.s.situacao));

  /* ---------- O QUE VEM ----------
     A lista que faltava. Até aqui o "a receber" era um número solto na
     folha e a única lista longa da tela era a de contratos, que cresce para
     sempre: com vinte contratos ela vira duas telas de barras quase
     idênticas, metade delas verdes dizendo "quitado", que é a informação
     com menos trabalho dentro do CRM inteiro.

     Esta é limitada pelo HORIZONTE e não pelo histórico, e por isso não
     cresce com o tempo: só o que vence nos próximos 30 dias. Trinta e não
     quatorze (a janela do painel Hoje) porque as parcelas daqui são
     mensais, e uma janela menor que o ciclo esconde a parcela do fim do mês
     até ela estar em cima. */
  const limite = somarDias(hoje, 30);
  const aVencer = aReceber
    .filter((x) => x.s.situacao !== "atrasada" && x.s.quando <= limite)
    .sort((a, b) => a.s.quando.localeCompare(b.s.quando));

  /* A projeção por mês: altura fixa, seis colunas, sempre. O vencido cai no
     mês corrente e não no mês em que venceu, porque a pergunta desta barra é
     "quanto ainda pode entrar daqui para frente", e dívida velha continua
     sendo dinheiro de agora. O que passa do sexto mês vira uma coluna
     "depois", para o total da barra bater com o `aReceber` da folha. */
  const HORIZONTE_MESES = 6;
  const janela = mesesAFrente(mesAtual, HORIZONTE_MESES);
  const previsao = new Map<string, { total: number; vencido: number }>(
    janela.map((m) => [m, { total: 0, vencido: 0 }]),
  );
  let depois = 0;

  for (const { s } of aReceber) {
    const m = mesDe(s.quando);
    const alvo = previsao.get(m > janela[0] ? m : janela[0]);
    if (alvo) {
      alvo.total += s.saldo;
      if (s.situacao === "atrasada") alvo.vencido += s.saldo;
    } else {
      depois += s.saldo;
    }
  }

  /* ---------- 3. a régua de cada contrato ----------
     Cancelados fora, quitados no fim: a tela existe para mostrar o que
     ainda anda, e um contrato fechado no topo empurra para baixo o que
     precisa de atenção. */
  const clientes = (contratos ?? [])
    .filter((c) => c.status === "ativo")
    .map((c) => {
      const suas = todasParcelas.filter((p) => p.contrato_id === c.id);
      return {
        contrato: { ...c, valor_total: c.valor_total == null ? null : Number(c.valor_total) },
        lead: porLead.get(c.lead_id) ?? null,
        parcelas: suas,
        q: quitacaoDoContrato(c, suas),
      };
    })
    .sort((a, b) => Number(a.q.quitado) - Number(b.q.quitado) || b.q.saldo - a.q.saldo);

  /* ---------- 4. o ano ----------
     Doze meses sempre, mesmo os vazios: um gráfico que só desenha os meses
     com dinheiro mente sobre o ritmo, porque some justamente com os meses
     em que não entrou nada, que são os que se precisa ver. */
  const porMes = new Map<string, number>(mesesDoAno(ano).map((m) => [m, 0]));
  for (const r of recebimentos ?? []) {
    if (r.estornado_em) continue;
    const m = mesDe(r.recebido_em);
    if (porMes.has(m)) porMes.set(m, (porMes.get(m) ?? 0) + Number(r.valor));
  }

  /* ---------- 5. o dinheiro sem dono ----------
     O que o webhook gravou e não conseguiu amarrar. Fica em rosa na tela
     porque é a única coisa ali que pede uma decisão. */
  const semDono = (recebimentos ?? []).filter((r) => !r.parcela_id && !r.estornado_em);

  /* ---------- 6. o que não fecha ----------
     Contrato cujo plano de pagamento não cobre o total. Não é erro de
     banco, é furo do plano, e ele fica visível pela mesma regra do dossiê
     da carta: some da tela, some da cabeça. */
  const desencontros = clientes.filter((c) => c.q.semParcela > 0.005);

  return {
    ano,
    hoje,
    mesAtual,
    previstoNoMes: somar(doMes.map((p) => p.valor)),
    recebidoNoMes: somar(recebidoNoMes.map((r) => Number(r.valor))),
    parcelasDoMes: doMes.length,
    recebimentosDoMes: recebidoNoMes.length,
    emAtraso: somar(devendo.map((x) => x.s.saldo)),
    aReceber: somar(aReceber.map((x) => x.s.saldo)),
    aReceberN: aReceber.length,
    contratado: somar(clientes.map((c) => c.q.total)),
    devendo,
    aVencer,
    /* A projeção de altura fixa, mais o resto num balde só. */
    previsao: [...previsao.entries()].map(([mes, v]) => ({
      mes,
      total: centavos(v.total),
      vencido: centavos(v.vencido),
    })),
    depois: centavos(depois),
    clientes,
    /* Os quitados saem da lista e viram uma linha: eles são a parte que
       cresce para sempre e a que não tem trabalho nenhum dentro. */
    quitados: clientes.filter((c) => c.q.quitado).length,
    quitadoTotal: somar(clientes.filter((c) => c.q.quitado).map((c) => c.q.pago)),
    meses: [...porMes.entries()].map(([mes, valor]) => ({ mes, valor: centavos(valor) })),
    semDono,
    desencontros,
    /* Os anos em que houve dinheiro, para o seletor não oferecer 2019. */
    anos: [...new Set([ano, new Date().getUTCFullYear()])].sort((a, b) => b - a),
  };
}

export type Caixa = Awaited<ReturnType<typeof caixa>>;

/* ============================================================
   AS COBRANÇAS ABERTAS — quem me deve, indexado por lead

   Uma parcela por lead: a mais antiga que ainda deve. Um cliente com duas
   parcelas vencidas de dois contratos aparece uma vez na fila, com a mais
   velha, e a conversa cobre as duas — porque é uma conversa só. Mostrar duas
   cartas do mesmo nome seguidas seria o CRM pedindo para ligar duas vezes.

   O corte é `quando <= hoje`, a mesma régua de tudo mais nesta tela: o que
   vence amanhã não é trabalho de hoje.
   ============================================================ */
async function cobrancasAbertas(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  hoje: string,
): Promise<Map<string, NonNullable<LeadPainel["cobranca"]>>> {
  const { data } = await supabase
    .from("crm_parcelas")
    .select(
      "id, lead_id, rotulo, valor, vence_em, cobrar_em, metodo_previsto, " +
        "crm_contratos(titulo), crm_recebimentos(valor, estornado_em)",
    )
    .is("cancelada_em", null)
    .lte("vence_em", hoje)
    .order("vence_em", { ascending: true })
    .returns<ParcelaDaFila[]>();

  const porLead = new Map<string, NonNullable<LeadPainel["cobranca"]>>();

  for (const p of data ?? []) {
    const quando = p.cobrar_em || p.vence_em;
    /* Adiada para depois de hoje sai da fila: é para isso que servem os
       botões +3d e +7d, e o vencimento continua intacto no banco. */
    if (quando > hoje) continue;

    const recebido = somar(
      (p.crm_recebimentos ?? []).filter((r) => !r.estornado_em).map((r) => Number(r.valor)),
    );
    const saldo = centavos(Number(p.valor) - recebido);
    if (quitado(saldo)) continue;

    /* A primeira que aparece é a mais antiga (a consulta vem ordenada), e é
       ela que fica: `has` em vez de `set` incondicional. */
    if (porLead.has(p.lead_id)) continue;

    porLead.set(p.lead_id, {
      parcela_id: p.id,
      rotulo: p.rotulo,
      valor: centavos(Number(p.valor)),
      saldo,
      vence_em: p.vence_em,
      quando,
      metodo_previsto: (p.metodo_previsto as Metodo | null) ?? null,
      contrato_titulo: p.crm_contratos?.titulo ?? "",
    });
  }

  return porLead;
}

/* A forma que o PostgREST devolve com os dois relacionamentos embutidos. */
type ParcelaDaFila = {
  id: string;
  lead_id: string;
  rotulo: string;
  valor: number;
  vence_em: string;
  cobrar_em: string | null;
  metodo_previsto: string | null;
  crm_contratos: { titulo: string } | null;
  crm_recebimentos: { valor: number; estornado_em: string | null }[] | null;
};
