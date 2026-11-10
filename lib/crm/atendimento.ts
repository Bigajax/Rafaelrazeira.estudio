import { ehAtivo, ehNoPipeline, type Interacao, type LeadPainel } from "./tipos";
import { diasDesde, momentoDoContato, procurouOEstudio } from "./regras";

export const ABAS_ATENDIMENTO = [
  { id: "novos", nome: "Novos contatos", descricao: "Quem ainda precisa do primeiro atendimento. Continua aqui até você registrar que falou." },
  { id: "responder", nome: "Preciso responder", descricao: "Quem escreveu por último e está esperando sua resposta, mesmo com retorno futuro." },
  { id: "retornos", nome: "Retornos", descricao: "Acompanhamentos vencidos, de hoje e contatos que precisam de um próximo passo." },
  { id: "prospeccao", nome: "Prospecção", descricao: "Trabalhe seus contatos por segmento e mantenha o acompanhamento em dia." },
  { id: "preco", nome: "Viu o preço", descricao: "Quem já recebeu o valor ou está em proposta. É aqui que o funil trava: o preço mais recente no topo." },
  { id: "black", nome: "Black", descricao: "As amostras que recebem a condição de Black: R$ 799 à vista no Pix até 30/11. Quem ainda não recebeu fica no topo." },
] as const;

/* ============================================================
   QUEM VIU O PREÇO (01/11/2026)

   A leitura de 212 conversas mostrou que o funil morre no preço: cerca de
   40 receberam o valor e nenhum fechou pela conversa. E o CRM não sabia
   quem eram: a aba "Em negociação" só via o estágio proposta/negociação,
   e quase ninguém chega lá, porque o preço sai na Prévia.

   O preço é reconhecido pelo RESUMO do toque, que o "Mandar mensagem"
   grava com o título do template. Por isso os prefixos abaixo seguem os
   títulos de `crm_templates`: renomear um template de preço lá pede a
   mesma troca aqui, senão quem recebeu some da fila em silêncio.
   "Preço enviado" é o toque do botão "Já mandei o preço", para o que foi
   por fora do CRM.

   Até 01/11, a "Prévia, mensagem 2: o preço" nunca tinha sido registrada
   (0 de 415 saídas): os ~40 da leitura entram só pelo botão.
   ============================================================ */
export const RESUMOS_DE_PRECO = [
  "Prévia, mensagem 2: o preço",
  "Amostra pronta: condição única R$ 899",
  "Desconto de 10%",
  "Quando o preço trava",
  "Quero colocar no ar: o botão da amostra",
  "Vou ver com o sócio: o resumo",
  "Enviando a proposta",
  "Proposta sem resposta",
  "Proposta comercial",
  "Preço enviado",
  "Black R$ 799",
  /* Os dois textos de preço da Loja online (10/11). */
  "Loja online: o preço",
  "Loja online: quem já tem a vitrine",
] as const;
export const RESUMO_PRECO_A_MAO = "Preço enviado (marcado à mão)";
export const ehToqueDePreco = (resumo: string | null | undefined) => Boolean(resumo && RESUMOS_DE_PRECO.some((p) => resumo.startsWith(p)));
/* "QUERO COLOCAR NO AR" (01/11): o botão da amostra é o lead mais quente
   que existe, e a leitura achou dois sem a resposta certa (Paraíso Perdido
   sem resposta nenhuma, Carol com "qual é o @?"). O leitor do WhatsApp está
   desligado desde 01/10, então o CRM não vê a mensagem chegar: ela é
   marcada à mão, num clique, como entrada com este resumo. O lead fura as
   filas até a resposta sair, e o "Mandar mensagem" já abre no template do
   botão. */
export const RESUMO_QUER_NO_AR = "Pediu para colocar no ar";
export const TEMPLATE_QUER_NO_AR = "Quero colocar no ar: o botão da amostra";
export const ehPedidoNoAr = (resumo: string | null | undefined) => Boolean(resumo?.startsWith(RESUMO_QUER_NO_AR));

/* AS DUAS MARCAS (01/11): "manda um áudio" e "vou ver com o sócio". Os seis
   do sócio morreram sem o resumo, e nenhum dos três do áudio recebeu áudio.
   Elas moram no PRÓXIMO PASSO, para hoje, porque é isso que elas são: a
   próxima coisa a fazer com aquele lead. Sem coluna nova no banco. */
export const MARCAS = [
  { id: "audio", nome: "Pediu áudio", passo: "Gravar o áudio explicando", template: null },
  { id: "socio", nome: "Vai ver com o sócio", passo: "Mandar o resumo pro sócio", template: "Vou ver com o sócio: o resumo" },
] as const;
export const marcaDe = (l: Pick<LeadPainel, "proximo_passo">) => MARCAS.find((m) => l.proximo_passo?.startsWith(m.passo)) ?? null;

/* OS PARADOS (01/11): 297 em Novos e 255 em Retornos não são fila, são
   arquivo. Parado é quem está no funil sem nada acontecendo há mais de 30
   dias, sem retorno marcado para o futuro, sem cobrança e sem pedido de
   colocar no ar. Arquivar é passar a Perdido, "sumiu, sem resposta", com
   desfazer na mesma tela. */
export const DIAS_PARADO = 30;
export function parado(l: LeadPainel, hoje: string): boolean {
  if (!ehNoPipeline(l.estagio) || l.cobranca || l.quer_no_ar) return false;
  if (l.proxima_acao_em && l.proxima_acao_em > hoje) return false;
  return diasDesde(l.ultimo_toque_em ?? l.created_at, hoje) > DIAS_PARADO;
}

/* A BLACK (03/11/2026): o Rafael decidiu que o R$ 799 à vista, que era o
   último degrau da escada, vira a oferta de Black até 30/11, sempre ao lado
   do normal (R$ 999, metade na entrada). Quem entra na lista leva o passo
   PASSO_BLACK; quando o template sai, o resumo começa com "Black R$ 799",
   conta como preço visto e o passo vira "cobrar a resposta" (registrarToque).
   Sem coluna nova no banco, como as marcas. O template se escolhe pelo
   preço: quem já viu o valor recebe o "já viu", quem só tem a amostra recebe
   o outro. Quando a Black passar (01/12), decidir com o Rafael se a aba sai. */
export const PASSO_BLACK = "Black: mandar a oferta de R$ 799";
export const PASSO_BLACK_COBRAR = "Black: cobrar a resposta";
export const TEMPLATE_BLACK_VIU = "Black R$ 799 até 30/11: já viu o preço";
export const TEMPLATE_BLACK_AMOSTRA = "Black R$ 799 até 30/11: só a amostra";
/* O banner da Black (03/11), que vai como imagem com o texto de legenda. O
   wa.me só leva texto: o modal copia a imagem para colar na conversa. */
export const IMAGEM_BLACK = "/assets/crm/black-799.png";
export const ehToqueDeBlack =(resumo: string | null | undefined) => Boolean(resumo?.startsWith("Black R$ 799"));
export const naBlack = (l: Pick<LeadPainel, "proximo_passo" | "black_em">) => Boolean(l.black_em) || Boolean(l.proximo_passo?.startsWith("Black:"));

export const viuOPreco =(l: LeadPainel) => Boolean(l.preco_em) || ["proposta", "negociacao"].includes(l.estagio);
export type AbaAtendimento = (typeof ABAS_ATENDIMENTO)[number]["id"];
export type HistoricoAtendimento = Pick<Interacao, "id" | "canal" | "direcao" | "resumo" | "created_at">;

/** Entrada no CRM e primeira saída registrada são fatos distintos da agenda. */
export function novoContato(lead: LeadPainel): boolean {
  return ehNoPipeline(lead.estagio) && lead.toques === lead.toques_entrada;
}
export function precisaResponder(lead: LeadPainel): boolean {
  return ehAtivo(lead.estagio) && !novoContato(lead) && lead.toques_entrada > 0 && lead.saidas_seguidas === 0;
}
export function filasAtendimento(leads: LeadPainel[], hoje: string) {
  const todos = [...new Map(leads.map((l) => [l.id, l])).values()];
  const ativos = todos.filter((l) => ehNoPipeline(l.estagio));
  const dataRetorno = (l: LeadPainel) => [l.cobranca?.quando, l.proxima_acao_em].filter((d): d is string => Boolean(d)).sort()[0] ?? "";
  const prioridade = (l: LeadPainel) => procurouOEstudio(l) ? 0 : l.origem === "indicacao" ? 1 : l.origem === "prospeccao" ? 3 : 2;
  const desempate = (a: LeadPainel, b: LeadPainel) => a.id.localeCompare(b.id);
  const noAr = (l: LeadPainel) => (l.quer_no_ar ? 0 : 1);
  return {
    // Quem acabou de chegar está quente; a espera antiga já esfriou (20/10/2026).
    novos: ativos.filter(novoContato).sort((a, b) => noAr(a) - noAr(b) || prioridade(a) - prioridade(b) || b.created_at.localeCompare(a.created_at) || desempate(a, b)),
    responder: todos.filter(precisaResponder).sort((a, b) => noAr(a) - noAr(b) || momentoDoContato(a).localeCompare(momentoDoContato(b)) || desempate(a, b)),
    retornos: todos.filter((l) => !novoContato(l) && !precisaResponder(l) && (l.cobranca ? l.cobranca.quando <= hoje : ehAtivo(l.estagio) && (l.estagio === "geladeira" ? Boolean(l.proxima_acao_em && l.proxima_acao_em <= hoje) : !l.proxima_acao_em || l.proxima_acao_em <= hoje))).sort((a, b) => dataRetorno(a).localeCompare(dataRetorno(b)) || desempate(a, b)),
    prospeccao: ativos.filter((l) => l.origem === "prospeccao"),
    // O preço mais recente no topo: os primeiros dias depois do valor são os que ainda fecham.
    preco: ativos.filter(viuOPreco).sort((a, b) => (b.preco_em ?? "").localeCompare(a.preco_em ?? "") || (a.proxima_acao_em || "").localeCompare(b.proxima_acao_em || "") || desempate(a, b)),
    // Quem ainda não recebeu a Black primeiro; depois, a mandada há mais tempo (é a que pede cobrança).
    black: ativos.filter(naBlack).sort((a, b) => Number(Boolean(a.black_em)) - Number(Boolean(b.black_em)) || (a.black_em ?? "").localeCompare(b.black_em ?? "") || (b.preco_em ?? "").localeCompare(a.preco_em ?? "") || desempate(a, b)),
  } satisfies Record<AbaAtendimento, LeadPainel[]>;
}

/* ============================================================
   A FILA DA VEZ (10/11/2026)

   As seis abas viraram uma fila só, na ordem do dinheiro. A revisão de
   10/11 mediu o banco: 574 leads ativos e NENHUM com retorno para hoje ou
   para a frente (310 vencidos, 264 sem data). Com tudo atrasado, "atrasado"
   não separava ninguém, e as abas tinham 273, 298 e 351 nomes. Das 98
   pessoas que viram o preço, 45 nunca receberam mais nada.

   Por isso a fila NÃO confia na data marcada à mão para pôr alguém na
   frente: ela sai do que aconteceu (quem escreveu por último, há quantos
   dias o preço saiu). A data marcada só serve para TIRAR alguém da fila:
   retorno no futuro é o Rafael dizendo "ainda não".

   Quatro grupos, e fora deles ninguém aparece:
     responder .. escreveu por último, pediu para colocar no ar, pediu áudio
                  ou resumo pro sócio, ou tem parcela para cobrar
     novos ...... procurou o estúdio e ainda não ouviu de mim, até 14 dias
     preco ...... viu o preço e ficou em silêncio: UMA volta aos 3 dias e,
                  aos 10, encerrar ("Não rolou"). A regra da casa proíbe
                  cobranças em sequência depois do preço (cofre,
                  abordagem-whatsapp-previas, 01/11), então não há 2ª volta
     amostra .... amostra entregue, sem preço e sem reação há 3 dias, ou
                  na lista da Black sem ter recebido a oferta

   A prospecção (garimpo) fica de fora de propósito: 392 leads e 2 ganhos,
   contra 7 de 9 vindos do anúncio. Ela se trabalha pelo Funil.
   O que nunca fazer: devolver um grupo "todo mundo que tem data vencida".
   Foi ele que encheu as abas.
   ============================================================ */
export const DIAS_NOVO = 14;
export const DIAS_PARA_VOLTAR = 3;
export const DIAS_PARA_ENCERRAR = 10;

/* A volta depois do preço NÃO é um toque de preço: se contasse, cada volta
   reiniciava o relógio e o lead nunca chegava ao "encerrar". Os títulos dos
   dois templates novos começam assim; a "Proposta sem resposta", que já
   existia, é a volta de quem recebeu proposta. */
export const TITULO_VOLTA_DO_PRECO = "Depois do preço:";
export const TITULO_VOLTA_DA_BLACK = "Depois da Black:";
/* Começa por "Depois do preço:" como a outra, para a fila reconhecer a volta. */
export const TITULO_VOLTA_DA_LOJA_ONLINE = "Depois do preço: a amostra da loja online";
export const ehVoltaDoPreco = (resumo: string | null | undefined) =>
  Boolean(resumo && [TITULO_VOLTA_DO_PRECO, TITULO_VOLTA_DA_BLACK, "Proposta sem resposta"].some((p) => resumo.startsWith(p)));

/* A resposta marcada num clique (10/11): com o leitor do WhatsApp desligado
   desde 01/10, a semana de 130 saídas tinha 4 entradas registradas, porque
   registrar pedia um modal. */
export const RESUMO_RESPONDEU = "Respondeu (marcado à mão)";

/* A cobrança da parcela (10/11): o Santana devia R$ 400 desde 26/09 e o
   "Mandar mensagem" não tinha texto nenhum para isso. */
export const TITULO_COBRANCA = "Cobrança da parcela";

/* A ordem da tela. Os novos no alto (10/11, pedido do Rafael: "quero que os
   novos leads cheguem primeiro"): quem acabou de pedir a amostra é quem
   esfria mais rápido. */
export const GRUPOS_DA_FILA = [
  { id: "novos", nome: "Chegou e não ouviu de mim" },
  { id: "responder", nome: "Responder agora" },
  { id: "preco", nome: "Preço no ar" },
  { id: "amostra", nome: "Amostra sem reação" },
] as const;
export type GrupoDaFila = (typeof GRUPOS_DA_FILA)[number]["id"];
export type ItemDaFila = { lead: LeadPainel; grupo: GrupoDaFila; encerrar: boolean };

type CamposDaEspera = Pick<LeadPainel, "estagio" | "origem" | "toques" | "toques_entrada" | "saidas_seguidas" | "created_at" | "ultimo_toque_em">;
const escreveuPorUltimo = (l: CamposDaEspera) => ehAtivo(l.estagio) && l.toques !== l.toques_entrada && l.toques_entrada > 0 && l.saidas_seguidas === 0;
const chegouAgora = (l: CamposDaEspera, hoje: string) =>
  ehNoPipeline(l.estagio) && l.toques === l.toques_entrada && l.origem !== "prospeccao" && diasDesde(l.ultimo_toque_em ?? l.created_at, hoje) <= DIAS_NOVO;

/** Quem está esperando o Rafael falar. É o número do trilho, e por isso só
    usa o que a view `crm_leads_painel` já traz, sem ler as interações. */
export const esperaPorMim = (l: CamposDaEspera, hoje: string) => escreveuPorUltimo(l) || chegouAgora(l, hoje);

/* Há quantos dias o preço saiu. Quem está em Proposta ou Negociação sem
   toque de preço registrado conta da entrada na etapa. */
export const diasDoPreco = (l: LeadPainel, hoje: string) => diasDesde(l.preco_em ?? l.entrou_no_estagio_em, hoje);

export function filaDaVez(leads: LeadPainel[], hoje: string) {
  const todos = [...new Map(leads.map((l) => [l.id, l])).values()];
  const desempate = (a: LeadPainel, b: LeadPainel) => a.id.localeCompare(b.id);
  const itens: ItemDaFila[] = [];
  const usados = new Set<string>();
  const por = (grupo: GrupoDaFila, lista: LeadPainel[], encerrar: (l: LeadPainel) => boolean = () => false) => {
    for (const l of lista) {
      if (usados.has(l.id)) continue;
      usados.add(l.id);
      itens.push({ lead: l, grupo, encerrar: encerrar(l) });
    }
  };
  const adiado = (l: LeadPainel) => Boolean(l.proxima_acao_em && l.proxima_acao_em > hoje);
  const peso = (l: LeadPainel) => (l.quer_no_ar ? 0 : l.cobranca ? 1 : 2);

  por(
    "responder",
    todos
      .filter((l) => l.quer_no_ar || escreveuPorUltimo(l) || Boolean(l.cobranca && l.cobranca.quando <= hoje) || (ehAtivo(l.estagio) && Boolean(marcaDe(l)) && !adiado(l)))
      .sort((a, b) => peso(a) - peso(b) || momentoDoContato(a).localeCompare(momentoDoContato(b)) || desempate(a, b)),
  );
  // Quem acabou de chegar está quente; a espera antiga já esfriou (20/10/2026).
  por("novos", todos.filter((l) => chegouAgora(l, hoje)).sort((a, b) => momentoDoContato(b).localeCompare(momentoDoContato(a)) || desempate(a, b)));

  const ativos = todos.filter((l) => ehNoPipeline(l.estagio) && !usados.has(l.id));
  let aguardando = 0;

  /* Quem está na lista da Black e ainda não recebeu a oferta tem uma
     mensagem por mandar, não um silêncio para encerrar. A Vallox viu o preço
     em 14/10, entrou na lista em 03/11 e saía como "encerrar" (10/11). */
  const blackPorMandar = (l: LeadPainel) => naBlack(l) && !l.black_em;
  const comPreco = ativos.filter((l) => viuOPreco(l) && (l.saidas_seguidas > 0 || blackPorMandar(l)));
  const deveEncerrar = (l: LeadPainel) => !blackPorMandar(l) && diasDoPreco(l, hoje) >= DIAS_PARA_ENCERRAR;
  const jaVoltei = (l: LeadPainel) => Boolean(l.preco_em && l.ultimo_toque_em && Date.parse(l.ultimo_toque_em) - Date.parse(l.preco_em) > 60000);
  const naVezDoPreco = comPreco.filter((l) => !adiado(l) && (blackPorMandar(l) || deveEncerrar(l) || (!jaVoltei(l) && diasDoPreco(l, hoje) >= DIAS_PARA_VOLTAR)));
  aguardando += comPreco.length - naVezDoPreco.length;
  // A volta primeiro, o preço mais recente no topo; quem é para encerrar fica no fim.
  por("preco", naVezDoPreco.sort((a, b) => Number(deveEncerrar(a)) - Number(deveEncerrar(b)) || (b.preco_em ?? "").localeCompare(a.preco_em ?? "") || desempate(a, b)), deveEncerrar);

  const comAmostra = ativos.filter((l) => !usados.has(l.id) && !viuOPreco(l) && (blackPorMandar(l) || ((Boolean(l.previa_url) || l.estagio === "previa") && l.saidas_seguidas > 0)));
  const paradoDemais = (l: LeadPainel) => !blackPorMandar(l) && diasDesde(l.ultimo_toque_em ?? l.created_at, hoje) > DIAS_PARADO;
  const naVezDaAmostra = comAmostra.filter((l) => !adiado(l) && (blackPorMandar(l) || diasDesde(l.ultimo_toque_em ?? l.created_at, hoje) >= DIAS_PARA_VOLTAR));
  aguardando += comAmostra.length - naVezDaAmostra.length;
  por("amostra", naVezDaAmostra.sort((a, b) => Number(paradoDemais(a)) - Number(paradoDemais(b)) || (b.ultimo_toque_em ?? "").localeCompare(a.ultimo_toque_em ?? "") || desempate(a, b)), paradoDemais);

  /* Fora da fila: todo o resto do funil, alcançado pela busca. */
  const fora = todos.filter((l) => ehNoPipeline(l.estagio) && !usados.has(l.id)).sort((a, b) => momentoDoContato(b).localeCompare(momentoDoContato(a)) || desempate(a, b));
  /* Os grupos são montados na ordem de quem tem a preferência (quem pediu
     para colocar no ar é "responder" mesmo sendo novo), mas a lista sai na
     ordem da tela: é dela que saem o primeiro aberto e o próximo do lote. */
  const lugar = new Map<GrupoDaFila, number>(GRUPOS_DA_FILA.map((g, i) => [g.id, i]));
  itens.sort((a, b) => lugar.get(a.grupo)! - lugar.get(b.grupo)!);
  return { itens, fora, aguardando };
}

export function tempoDeEspera(instante: string, agora: number): string {
  const minutos = Math.max(0, Math.floor((agora - Date.parse(instante)) / 60000));
  if (!Number.isFinite(minutos)) return "Horário indisponível";
  if (minutos < 1) return "Agora";
  if (minutos < 60) return `${minutos} min de espera`;
  if (minutos < 1440) return `${Math.floor(minutos / 60)} h de espera`;
  const dias = Math.floor(minutos / 1440);
  return `${dias} ${dias === 1 ? "dia" : "dias"} de espera`;
}
