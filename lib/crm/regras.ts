/* ============================================================
   AS REGRAS, EM FUNÇÕES PURAS

   Nenhuma delas toca banco, rede ou React. É de propósito: as mesmas
   respostas precisam valer no servidor (que decide se a movimentação
   persiste) e no navegador (que decide se abre o modal antes de tentar).
   Se as duas metades divergirem, o CRM vira uma tela que pede um campo e
   um servidor que recusa outro.
   ============================================================ */

import {
  ehAtivo,
  type Estagio,
  type Lead,
  type LeadPainel,
  type MotivoPerda,
} from "./tipos";

/* ============================================================
   DATAS

   O CRM roda em Maringá e o servidor da Vercel roda em UTC. São três horas
   de diferença, o que significa que das 21h à meia-noite o servidor já
   virou o dia: sem fuso explícito, todo lead agendado para amanhã aparece
   como "hoje" na hora em que o Rafael está fechando o dia, e todo lead de
   hoje aparece como atrasado. Por isso "hoje" nunca vem de `new Date()`
   direto, vem daqui.
   ============================================================ */
export const FUSO = "America/Sao_Paulo";

/* `en-CA` porque é o único locale que o Intl formata nativamente como
   YYYY-MM-DD, que é exatamente a forma que a coluna `date` do Postgres
   usa. Com isso a comparação de datas vira comparação de string, sem
   nenhuma conversão no meio. */
const ISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const hojeSP = (base: Date = new Date()) => ISO.format(base);

/* Soma dias a uma data ISO sem passar por Date local: `Date.UTC` ao meio-dia
   evita que horário de verão em qualquer ponto do intervalo empurre o
   resultado para o dia anterior. */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(a, m - 1, d, 12) + dias * 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** Dias inteiros entre duas datas ISO. Positivo quando `fim` é depois. */
export function diasEntre(inicio: string, fim: string): number {
  const p = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number);
    return Date.UTC(a, m - 1, d, 12);
  };
  return Math.round((p(fim) - p(inicio)) / 86400000);
}

/* ---------- até onde o horizonte enxerga ----------
   A janela da linha do horizonte do painel Hoje, em dias. Vive aqui e não na
   tela porque duas partes precisam do mesmo número e elas não podem
   discordar: a consulta corta os retornos que entram na linha, e o
   componente calcula a posição de cada dente sobre ela. Com o número escrito
   em dois lugares, um dente cairia fora da própria régua no dia em que
   alguém mudasse um só.

   Quatorze e não trinta: a linha existe para dizer "a máquina está
   carregada", não para planejar o mês. Em trinta dias os dentes se
   amontoam perto da esquerda e a forma para de significar alguma coisa. */
export const JANELA_HORIZONTE = 14;

/* Em que DIA de Maringá um timestamp do banco caiu. O banco grava em UTC, e
   um toque das 22h de sexta é `2026-08-15T01:00:00Z`: comparado como texto,
   ele aconteceu no sábado. Toda pergunta do tipo "isto foi hoje?" passa
   por aqui. */
export const diaEmSP = (timestamp: string) => ISO.format(new Date(timestamp));

/** Dias inteiros entre um timestamp do banco e hoje, no fuso de Maringá. */
export function diasDesde(timestamp: string | null, hoje = hojeSP()): number {
  if (!timestamp) return 0;
  return diasEntre(diaEmSP(timestamp), hoje);
}

/* ---------- a semana começa na segunda ----------
   A meta é "toques por semana", e semana de prospecção é a semana de
   trabalho: segunda a domingo. O padrão do JavaScript é domingo a sábado, o
   que jogaria o domingo de trabalho para dentro da semana seguinte e faria
   a régua da meta zerar no meio de um fim de semana produtivo. */
export function inicioDaSemana(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d, 12));
  const diaDaSemana = dt.getUTCDay(); // 0 = domingo
  const recuo = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
  return somarDias(iso, -recuo);
}

/** Rótulo curto de semana para o eixo do gráfico: "12/08". */
export const rotuloSemana = (iso: string) => dataCurta(iso).slice(0, 5);

export function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

export function horaCurta(timestamp: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

/* ============================================================
   DINHEIRO
   ============================================================ */
const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export const dinheiro = (v: number | null | undefined) => (v ? BRL.format(v) : "");

/* Forma compacta para cabeçalho de coluna, onde a soma de sete cards não
   pode empurrar a contagem para fora. "R$ 24 mil" em vez de "R$ 24.000". */
export function dinheiroCurto(v: number | null | undefined): string {
  if (!v) return "";
  if (v >= 1000) {
    const mil = v / 1000;
    return `R$ ${mil % 1 === 0 ? mil : mil.toFixed(1).replace(".", ",")} mil`;
  }
  return BRL.format(v);
}

/* ============================================================
   URGÊNCIA — a pergunta do painel Hoje

   Quatro respostas, e a ordem delas é a ordem de leitura da tela:
   atrasado primeiro, hoje depois, sem_passo por último. `agendado` é o
   estado saudável, e por isso ele não aparece em lugar nenhum do painel:
   lead com data futura é lead que não precisa de nada agora.
   ============================================================ */
export type Urgencia = "atrasado" | "hoje" | "agendado" | "sem_passo";

export function urgencia(lead: Pick<Lead, "estagio" | "proxima_acao_em">, hoje = hojeSP()): Urgencia {
  if (!ehAtivo(lead.estagio)) return "agendado";
  if (!lead.proxima_acao_em) return "sem_passo";
  if (lead.proxima_acao_em < hoje) return "atrasado";
  if (lead.proxima_acao_em === hoje) return "hoje";
  return "agendado";
}

/* ============================================================
   TEMPERATURA — quanto tempo o lead está parado no mesmo estágio

   Os cortes vêm do escopo: 8 a 14 dias é "esfriando", 15 ou mais é "frio".
   Não vale para ganho e perdido, que são destinos: um projeto ganho há
   noventa dias não está frio, está entregue.
   ============================================================ */
export type Temperatura = "normal" | "esfriando" | "frio";

export function temperatura(
  lead: Pick<Lead, "estagio" | "entrou_no_estagio_em">,
  hoje = hojeSP(),
): { estado: Temperatura; dias: number } {
  const dias = diasDesde(lead.entrou_no_estagio_em, hoje);
  if (!ehAtivo(lead.estagio)) return { estado: "normal", dias };
  if (dias >= 15) return { estado: "frio", dias };
  if (dias >= 8) return { estado: "esfriando", dias };
  return { estado: "normal", dias };
}

/* REGRA DOS 2 RETORNOS. Sugestão visual, nunca ação: o card mostra o aviso
   e o Rafael decide. Um lead que não respondeu duas vezes pode estar de
   férias, e mover sozinho para perdido seria o CRM inventando um fato. */
export const doisRetornos = (lead: Pick<LeadPainel, "saidas_seguidas">) => lead.saidas_seguidas >= 2;

/* ============================================================
   UM SINAL POR FICHA

   A primeira versão da ficha mostrava tudo o que sabia ao mesmo tempo:
   "ATRASADO 5 DIAS", "FRIO: 22 DIAS PARADO", "R$ 2.500" e "2 RETORNOS SEM
   RESPOSTA", os quatro em mono maiúscula de 9,5px, um embaixo do outro.
   Quatro avisos do mesmo tamanho e da mesma voz não são quatro avisos: são
   ruído, e o olho para de ler todos eles. Numa coluna com oito cards, isso
   é a diferença entre ver o quadro e ler o quadro.

   Agora a ficha tem UM sinal, escolhido por esta escada. A ordem não é
   estética, é a ordem em que os fatos mudam o que fazer AGORA:

     1. sem próximo passo   este lead não está em fila nenhuma e vai sumir
     2. atrasado            já venceu, e o número de dias é a dívida
     3. dois retornos       falei e não responderam; a decisão é encerrar
                            ou espaçar
     4. é hoje              foi marcado para agora
     5. parado N dias       esfriando ou frio
     6. volta DD/MM         saudável, e por isso o sinal mais quieto

   ---------- o que NÃO se perde ao mostrar um só ----------
   A temperatura continua visível: ela é o TOM DO PAPEL da ficha, não uma
   frase. Um lead frio e atrasado aparece como papel desbotado com o sinal
   rosa em cima, e as duas informações chegam juntas sem competir por linha.
   O ticket também sai daqui: ele é um número, não um estado, e vive na voz
   de display do lado direito do nome.

   ---------- a única linha com dois fatos ----------
   Atrasado E sem resposta é a pior combinação possível de um lead, e é a
   única que ganha a segunda metade da frase. Um caso, uma exceção: se toda
   linha pudesse ter dois fatos, a escada não teria servido para nada.
   ============================================================ */
export type TomDoSinal = "alerta" | "agora" | "morno" | "quieto";

export function sinalDaFicha(
  lead: Pick<
    LeadPainel,
    "estagio" | "proxima_acao_em" | "entrou_no_estagio_em" | "saidas_seguidas" | "motivo_perda" | "valor_fechado"
  >,
  hoje = hojeSP(),
): { texto: string; tom: TomDoSinal } {
  if (lead.estagio === "ganho") return { texto: "Ganho", tom: "agora" };
  if (lead.estagio === "perdido") {
    return {
      texto: lead.motivo_perda ? `Perdido: ${NOME_MOTIVO_CURTO[lead.motivo_perda]}` : "Perdido",
      tom: "quieto",
    };
  }

  const urg = urgencia(lead, hoje);
  const semResposta = doisRetornos(lead);

  /* Sem próximo passo, a ficha JÁ diz isso de dois jeitos: o filete de
     margem está interrompido e a linha de ação diz "Decida o próximo
     passo". Um terceiro "Sem próximo passo" aqui seria a mesma frase pela
     terceira vez no mesmo objeto. Então o sinal aproveita a linha para
     dizer o que ninguém sabe: há quanto tempo isso está parado. */
  if (urg === "sem_passo") {
    if (semResposta) return { texto: `${lead.saidas_seguidas} toques sem resposta`, tom: "alerta" };
    const { dias } = temperatura(lead, hoje);
    /* "Parado 0 dias" é o que um lead anotado agora mostrava, e é uma frase
       que acusa alguém de nada: ninguém está atrasado no minuto em que
       entra. No primeiro dia o sinal diz que ele é novo, que é o fato. */
    if (dias === 0) return { texto: "Entrou hoje", tom: "quieto" };
    return {
      texto: `Parado ${dias} ${dias === 1 ? "dia" : "dias"}`,
      tom: dias >= 15 ? "alerta" : "morno",
    };
  }

  if (urg === "atrasado") {
    const atraso = diasDesde(lead.proxima_acao_em, hoje);
    const base = `Atrasado ${atraso} ${atraso === 1 ? "dia" : "dias"}`;
    return { texto: semResposta ? `${base}, ${lead.saidas_seguidas} sem resposta` : base, tom: "alerta" };
  }

  if (semResposta) return { texto: `${lead.saidas_seguidas} toques sem resposta`, tom: "alerta" };
  if (urg === "hoje") return { texto: "É hoje", tom: "agora" };

  const { estado, dias } = temperatura(lead, hoje);
  if (estado !== "normal") return { texto: `Parado ${dias} dias`, tom: "morno" };

  return { texto: `Volta ${dataCurta(lead.proxima_acao_em).slice(0, 5)}`, tom: "quieto" };
}

/* A forma curta do motivo, para caber numa linha de card. A forma inteira
   (lib/crm/tipos.ts) continua sendo a do dropdown e da tela de métricas,
   onde há espaço e onde a frase precisa ser precisa. */
const NOME_MOTIVO_CURTO: Record<MotivoPerda, string> = {
  preco: "preço",
  sem_resposta: "sumiu",
  timing: "timing",
  fechou_com_outro: "outro fornecedor",
  fora_do_perfil: "fora do perfil",
  desistiu: "desistiu",
};

/* ============================================================
   AS EXIGÊNCIAS DE CADA PASSAGEM (regras 1 a 4)

   `exigencias` diz o que aquele estágio pede. `oQueFalta` confere contra o
   lead e contra o que o modal já coletou, e devolve os campos que ainda
   estão vazios. O servidor chama a mesma função antes de gravar: a tela
   abre o modal por cortesia, o servidor recusa por segurança.
   ============================================================ */
export type CampoExigido =
  | "proximo_passo"
  | "proxima_acao_em"
  | "ticket_estimado"
  | "motivo_perda"
  | "valor_fechado"
  | "fechado_em";

export function exigencias(estagio: Estagio): CampoExigido[] {
  if (estagio === "perdido") return ["motivo_perda"];
  if (estagio === "ganho") return ["valor_fechado", "fechado_em"];
  // Todo estágio ativo pede próximo passo com data (regra 1). Proposta pede
  // o ticket por cima (regra 4): proposta sem valor estimado é o que faz a
  // soma do pipeline mentir justo na coluna que mais importa.
  const base: CampoExigido[] = ["proximo_passo", "proxima_acao_em"];
  return estagio === "proposta" ? [...base, "ticket_estimado"] : base;
}

export type Passagem = {
  proximo_passo?: string | null;
  proxima_acao_em?: string | null;
  ticket_estimado?: number | null;
  motivo_perda?: MotivoPerda | null;
  valor_fechado?: number | null;
  fechado_em?: string | null;
};

const vazio = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

export function oQueFalta(estagio: Estagio, lead: Lead, coletado: Passagem = {}): CampoExigido[] {
  return exigencias(estagio).filter((campo) => {
    const novo = coletado[campo];
    // O que o modal mandou vale; o que ele não mandou cai para o que o lead
    // já tinha. É isso que faz "mover um lead que já tem próximo passo
    // marcado" não abrir modal nenhum.
    const valor = novo === undefined ? lead[campo] : novo;
    return vazio(valor);
  });
}

export const NOME_CAMPO: Record<CampoExigido, string> = {
  proximo_passo: "Próximo passo",
  proxima_acao_em: "Data do próximo passo",
  ticket_estimado: "Ticket estimado",
  motivo_perda: "Motivo da perda",
  valor_fechado: "Valor fechado",
  fechado_em: "Data do fechamento",
};

/* ---------- A FORMA DE UMA PALAVRA, PARA O CARD EM VOO ----------
   `NOME_CAMPO` é o rótulo do formulário, onde a frase precisa ser precisa
   porque alguém vai preencher. Estas são as mesmas exigências ditas dentro
   do cabeçalho de uma coluna de 210px, enquanto a mão está no ar: ali cabe
   uma palavra por campo e não cabe mais nada. */
const CAMPO_EM_UMA_PALAVRA: Record<CampoExigido, string> = {
  proximo_passo: "passo",
  proxima_acao_em: "data",
  ticket_estimado: "ticket",
  motivo_perda: "motivo",
  valor_fechado: "valor",
  fechado_em: "data",
};

/* O que aquela coluna vai pedir deste lead, em uma linha. Devolve string
   vazia quando não vai pedir nada, e é essa string vazia que faz a coluna
   ficar calada: no quadro inteiro, quem fala é só quem vai cobrar.

   O `Set` não é preciosismo: ganho exige `valor_fechado` e `fechado_em`, que
   viram "valor" e "data", mas proposta exige `proxima_acao_em` junto de
   outros, e sem ele um dia sai "pede data e data". */
export function oQuePede(falta: CampoExigido[], verbo = "Pede"): string {
  const nomes = [...new Set(falta.map((c) => CAMPO_EM_UMA_PALAVRA[c]))];
  if (!nomes.length) return "";
  const ultimo = nomes.pop() as string;
  return `${verbo} ${nomes.length ? `${nomes.join(", ")} e ${ultimo}` : ultimo}`;
}

/* ---------- O QUE É EXIGIDO EM TODA PARTE ----------
   A regra 1 vale em qualquer etapa ativa: todas pedem próximo passo com
   data. Então um lead sem próximo passo é recusado pelas sete colunas do
   quadro, e escrever a mesma exigência nas sete é dizer sete vezes a mesma
   coisa no segundo em que a pessoa mais precisa comparar uma com a outra.

   Isto devolve a exigência que TODAS as colunas fazem deste lead. Ela sai
   das colunas e vai para o card em voo, que é onde ela pertence: não é uma
   condição de destino, é uma falta do próprio lead, e ele a carrega para
   onde quer que vá. O que sobra na coluna é só o que é notícia ali. */
export function exigenciaDeTodas(estagios: readonly Estagio[], lead: Lead): CampoExigido[] {
  const porEstagio = estagios.map((e) => oQueFalta(e, lead));
  if (!porEstagio.length) return [];
  return porEstagio[0].filter((campo) => porEstagio.every((falta) => falta.includes(campo)));
}

/* ============================================================
   TEMPLATES

   Quatro variáveis, e o que falta vira uma lacuna visível em vez de sumir.
   Um "Oi, !" enviado por engano custa o lead inteiro; um "Oi, [nome]!" na
   pré-visualização é impossível de não ver antes de mandar.
   ============================================================ */
export type DadosTemplate = Pick<Lead, "nome" | "empresa" | "nicho" | "cidade">;

export function renderTemplate(conteudo: string, lead: DadosTemplate): string {
  const mapa: Record<string, string | null> = {
    nome: primeiroNome(lead.nome),
    empresa: lead.empresa,
    nicho: lead.nicho,
    cidade: lead.cidade,
  };
  return conteudo.replace(/\{(nome|empresa|nicho|cidade)\}/g, (_, chave: string) => {
    const v = mapa[chave];
    return v && v.trim() ? v.trim() : `[${chave}]`;
  });
}

/** Quais variáveis do texto ficariam sem valor para este lead. */
export function lacunas(conteudo: string, lead: DadosTemplate): string[] {
  const achadas = [...conteudo.matchAll(/\{(nome|empresa|nicho|cidade)\}/g)].map((m) => m[1]);
  const mapa: Record<string, string | null> = {
    nome: lead.nome,
    empresa: lead.empresa,
    nicho: lead.nicho,
    cidade: lead.cidade,
  };
  return [...new Set(achadas)].filter((c) => !mapa[c] || !String(mapa[c]).trim());
}

/* Abordagem por WhatsApp é conversa, e conversa começa pelo primeiro nome.
   "Oi, Maria Fernanda Albuquerque!" tem cara de mala direta. */
export const primeiroNome = (nome: string) => (nome || "").trim().split(/\s+/)[0] || "";

/* ============================================================
   LINKS
   ============================================================ */

/** Só os dígitos, com o 55 na frente. É a forma que o wa.me exige. */
export function numeroWhatsapp(bruto: string | null): string | null {
  const d = String(bruto || "").replace(/\D/g, "");
  if (!d) return null;
  const semPais = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
  if (semPais.length < 10) return null;
  return `55${semPais}`;
}

export function linkWhatsapp(bruto: string | null, texto?: string): string | null {
  const n = numeroWhatsapp(bruto);
  if (!n) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

/** Aceita "@loja", "loja" ou a URL inteira colada, e devolve sempre a URL. */
export function linkInstagram(bruto: string | null): string | null {
  const v = String(bruto || "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const usuario = v.replace(/^@/, "").replace(/^instagram\.com\//i, "").replace(/\/$/, "");
  return usuario ? `https://instagram.com/${usuario}` : null;
}

/** O wa.me do Instagram: ig.me/m/ cai direto na caixa de mensagem, não no
    perfil. Sem parâmetro de texto de propósito, porque o Instagram não
    aceita mensagem pré-escrita na URL; quem chama copia o texto antes. */
export function linkDirectInstagram(bruto: string | null): string | null {
  const v = String(bruto || "").trim();
  if (!v) return null;
  const usuario = v
    .replace(/^https?:\/\/(www\.)?/i, "")
    .replace(/^instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
  return usuario ? `https://ig.me/m/${usuario}` : null;
}

/* ============================================================
   POSIÇÃO NO KANBAN

   Reordenar por arrastar não pode reescrever a coluna inteira: com vinte
   cards, cada arrasto viraria vinte updates e um rollback impossível de
   fazer direito. A posição é numérica e o card novo recebe a MÉDIA entre o
   vizinho de cima e o de baixo, o que altera uma linha só.

   O limite conhecido: depois de umas cinquenta inserções sempre no mesmo
   ponto, a média deixa de caber na precisão do `numeric` e dois cards ficam
   com a mesma posição. Não é hipótese urgente (o desempate por `created_at`
   mantém a ordem estável), e o conserto, quando for a hora, é renumerar a
   coluna de mil em mil.
   ============================================================ */
export const PASSO_POSICAO = 1000;

export function posicaoEntre(anterior: number | null, seguinte: number | null): number {
  if (anterior == null && seguinte == null) return PASSO_POSICAO;
  if (anterior == null) return (seguinte as number) - PASSO_POSICAO;
  if (seguinte == null) return anterior + PASSO_POSICAO;
  return (anterior + seguinte) / 2;
}

/** A ordem que o kanban usa: posição, e `created_at` para desempatar. */
export function ordenarColuna<T extends { posicao: number; created_at: string }>(leads: T[]): T[] {
  return [...leads].sort((a, b) => a.posicao - b.posicao || a.created_at.localeCompare(b.created_at));
}

/* ============================================================
   NORMALIZAÇÃO NA GRAVAÇÃO

   O índice único de duplicata (ver supabase/crm.sql) compara strings. Se o
   mesmo telefone entrar como "(44) 99999-7219" pela tela e como
   "44999997219" pela rota de inbound, o banco vê dois leads diferentes e a
   regra 7 não vale nada. Toda escrita passa por aqui.
   ============================================================ */
export const soDigitos = (v: string | null | undefined) => {
  const d = String(v ?? "").replace(/\D/g, "");
  if (!d) return null;
  return d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
};

export const emailNormal = (v: string | null | undefined) => {
  const e = String(v ?? "").trim().toLowerCase();
  return e || null;
};
