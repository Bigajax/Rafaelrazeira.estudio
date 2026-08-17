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
  ESTAGIOS_ATIVOS,
  type Interacao,
  type Lead,
  type LeadPainel,
  type Meta,
  type Template,
} from "./tipos";

const ATIVOS = ESTAGIOS_ATIVOS as readonly string[];

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

  const lista = leads ?? [];

  const atrasados = lista.filter((l) => l.proxima_acao_em && l.proxima_acao_em < hoje);
  const paraHoje = lista.filter((l) => l.proxima_acao_em === hoje);
  const semPasso = lista.filter((l) => !l.proxima_acao_em);

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
    /* Pipeline aberto: só estágio ativo, só ticket estimado. Ganho já não é
       pipeline, é faturamento, e vive na tela de métricas. */
    pipelineAberto: lista.reduce((soma, l) => soma + (l.ticket_estimado ?? 0), 0),
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

  const [{ data: leads }, { count: templates }] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("proxima_acao_em")
      .in("estagio", ATIVOS)
      .returns<Pick<Lead, "proxima_acao_em">[]>(),
    supabase.from("crm_templates").select("id", { count: "exact", head: true }),
  ]);

  const lista = leads ?? [];

  return {
    /* A MESMA definição de fila do painel Hoje, e ela precisa continuar
       sendo: o trilho dizendo "3" com quatro cartas na tela é pior do que o
       trilho não dizer nada. Atrasado, hoje e sem próximo passo. */
    fila: lista.filter((l) => !l.proxima_acao_em || l.proxima_acao_em <= hoje).length,
    ativos: lista.length,
    templates: templates ?? 0,
  };
}

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
    hoje: hojeSP(),
  };
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
         única honesta. */
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
    pipelineAberto: todos
      .filter((l) => ATIVOS.includes(l.estagio))
      .reduce((s, l) => s + (l.ticket_estimado ?? 0), 0),
    faturamento: ganhosNoPeriodo.reduce((s, l) => s + (l.valor_fechado ?? 0), 0),
    ganhos: ganhosNoPeriodo.length,
    motivos: [...porMotivo.entries()].sort((a, b) => b[1] - a[1]),
    perdidos: perdidosNoPeriodo.length,
    toquesPeriodo: toques.filter((t) => t.direcao === "saida").length,
  };
}
