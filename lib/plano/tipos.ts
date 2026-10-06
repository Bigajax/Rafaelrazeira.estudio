/* ============================================================
   PLANO: o vocabulário e as contas (30/09/2026)

   Funções puras: a tela e qualquer script leem as mesmas. O método é o da
   G4 (ver supabase/plano.sql): o estratégico dá a missão e a lista fechada
   de projetos, o tático dá as metas com peso, e a RMR mede o mês.

   AS CONTAS
   - percentual de uma meta num mês:
       periodo "mes": o valor do mês ÷ o alvo;
       periodo "ano": o acumulado até o mês ÷ o ritmo (alvo × meses ÷ 12).
   - faixa: 100% ou mais bateu; 80% perto; 60% atenção; abaixo, fora da
     linha. São as quatro faixas do painel da G4.
   - nota do painel no ano: a média dos percentuais pesada pelos pesos, com
     cada meta limitada a 120% (passar muito de uma não compra a outra).
     Meta mensal entra pela média dos meses medidos; anual, pelo ritmo.
   ============================================================ */

export type Prioridade = "P1" | "P2" | "P3";
export type Horizonte = "agora" | "depois" | "ideia";
export type StatusProjeto = "ativo" | "pausado" | "encerrado";
export type Unidade = "R$" | "un" | "%";
export type Periodo = "mes" | "ano";
export type Fonte = "manual" | "recebido" | "fechados" | "toques" | "posts";

export const PRIORIDADES: Record<Prioridade, { nome: string; faz: string }> = {
  P1: { nome: "P1", faz: "a maior parte da energia do ano" },
  P2: { nome: "P2", faz: "anda junto, sem tirar o P1 do lugar" },
  P3: { nome: "P3", faz: "energia baixa, de propósito" },
};

export const HORIZONTES: Record<Horizonte, string> = {
  agora: "agora",
  depois: "depois",
  ideia: "em ideia",
};

/* As metas que se medem sozinhas: o número vem do banco na hora. */
export const FONTES: Record<Fonte, { nome: string; unidade: Unidade | null; ajuda: string }> = {
  manual: { nome: "Eu digito na RMR", unidade: null, ajuda: "você lança o número do mês na reunião mensal" },
  recebido: { nome: "Caixa: o que entrou", unidade: "R$", ajuda: "a soma dos recebimentos do mês no Caixa" },
  fechados: { nome: "Funil: fechamentos", unidade: "un", ajuda: "leads que viraram ganho no mês" },
  toques: { nome: "Toques enviados", unidade: "un", ajuda: "mensagens que você mandou no mês (as de saída)" },
  posts: { nome: "Marketing: posts", unidade: "un", ajuda: "peças marcadas como postadas no mês" },
};

/* O prêmio em DEGRAUS (30/09): "a recompensa é trocar para um iPhone de
   última geração, dois MacBooks, um para mim e outro para a agência,
   contratar gente para o comercial". Cada degrau é um patamar de faturamento
   no mês (o que entrou no Caixa), e alguns pedem meses seguidos: contratar
   gente é custo que volta todo mês, então pede faturamento que se repete. */
export type Degrau = { nome: string; patamar: number; meses: number };

export type Ciclo = {
  id: string;
  ano: number;
  missao: string | null;
  visao: string | null;
  horizonte: number | null;
  projecoes: { ano: number; faturamento: number | null; caixa: number | null }[];
  premio: string | null;
  premio_corte: number;
  premios?: Degrau[] | null;
};

export type SituacaoDegrau = {
  destravado: boolean;
  /* o mês em que destravou (1..12), quando destravou */
  quando: number | null;
  /* o melhor mês do ano e a maior sequência de meses no patamar */
  melhorMes: number;
  seguidos: number;
  /* quanto do caminho já foi (0..1): pelo melhor mês, ou pelos meses seguidos */
  progresso: number;
};

/* recebido[mes 1..12] = o que entrou no Caixa no mês */
export function situacaoDoDegrau(d: Degrau, recebido: Partial<Record<number, number>>, ate: number): SituacaoDegrau {
  const meses = Math.max(1, d.meses || 1);
  let melhorMes = 0;
  let corrida = 0;
  let maior = 0;
  let quando: number | null = null;
  for (let m = 1; m <= ate; m++) {
    const v = recebido[m] ?? 0;
    melhorMes = Math.max(melhorMes, v);
    corrida = v >= d.patamar ? corrida + 1 : 0;
    maior = Math.max(maior, corrida);
    if (quando === null && corrida >= meses) quando = m;
  }
  const destravado = quando !== null;
  const progresso = destravado ? 1 : maior > 0 ? Math.min(0.99, maior / meses) : Math.min(0.99, melhorMes / d.patamar);
  return { destravado, quando, melhorMes, seguidos: maior, progresso };
}

export type Projeto = {
  id: string;
  nome: string;
  porque: string | null;
  prioridade: Prioridade;
  horizonte: Horizonte;
  status: StatusProjeto;
  motivo_encerrado: string | null;
  ordem: number;
};

export type Meta = {
  id: string;
  projeto_id: string;
  ano: number;
  titulo: string;
  unidade: Unidade;
  alvo: number;
  periodo: Periodo;
  peso: number;
  fonte: Fonte;
  ordem: number;
};

export type Rmr = { mes: string; nota: number | null; causa: string | null; plano: string | null; fechada_em: string };

/* valores[meta_id][mes 1..12] = número do mês (medido ou automático) */
export type Valores = Record<string, Partial<Record<number, number>>>;

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const TETO = 1.2;

export function percentual(meta: Pick<Meta, "alvo" | "periodo">, valores: Partial<Record<number, number>>, mes: number): number | null {
  if (!(meta.alvo > 0)) return null;
  if (meta.periodo === "mes") {
    const v = valores[mes];
    return v === undefined ? null : v / meta.alvo;
  }
  let soma = 0;
  let algum = false;
  for (let m = 1; m <= mes; m++) {
    const v = valores[m];
    if (v !== undefined) {
      soma += v;
      algum = true;
    }
  }
  return algum ? soma / ((meta.alvo * mes) / 12) : null;
}

export type Faixa = "bateu" | "perto" | "atencao" | "fora" | "sem";
export function faixa(p: number | null): Faixa {
  if (p === null) return "sem";
  if (p >= 1) return "bateu";
  if (p >= 0.8) return "perto";
  if (p >= 0.6) return "atencao";
  return "fora";
}
export const FAIXAS: Record<Faixa, string> = {
  bateu: "bateu",
  perto: "perto",
  atencao: "atenção",
  fora: "fora da linha",
  sem: "sem número",
};

/* O percentual da meta no ano, até o mês: é o que entra na nota. */
export function percentualNoAno(meta: Pick<Meta, "alvo" | "periodo">, valores: Partial<Record<number, number>>, ate: number): number | null {
  if (meta.periodo === "ano") return percentual(meta, valores, ate);
  const ps: number[] = [];
  for (let m = 1; m <= ate; m++) {
    const p = percentual(meta, valores, m);
    if (p !== null) ps.push(Math.min(p, TETO));
  }
  return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null;
}

/* A nota do painel: só entram as metas que já têm número. */
export function notaDoPainel(metas: Meta[], valores: Valores, ate: number): number | null {
  let soma = 0;
  let pesos = 0;
  for (const m of metas) {
    const p = percentualNoAno(m, valores[m.id] ?? {}, ate);
    if (p === null || m.peso <= 0) continue;
    soma += Math.min(p, TETO) * m.peso;
    pesos += m.peso;
  }
  return pesos ? soma / pesos : null;
}

/* Meses seguidos com a RMR fechada, contando para trás a partir do último
   mês que já terminou (o mês corrente conta se já foi fechado). */
export function sequencia(rmrs: Pick<Rmr, "mes">[], ano: number, mesAtual: number): number {
  const fechados = new Set(rmrs.map((r) => r.mes.slice(0, 7)));
  const chave = (a: number, m: number) => `${a}-${String(m).padStart(2, "0")}`;
  let a = ano;
  let m = mesAtual;
  if (!fechados.has(chave(a, m))) {
    m -= 1;
    if (m === 0) {
      m = 12;
      a -= 1;
    }
  }
  let n = 0;
  while (fechados.has(chave(a, m))) {
    n += 1;
    m -= 1;
    if (m === 0) {
      m = 12;
      a -= 1;
    }
  }
  return n;
}

export function formatar(v: number | null | undefined, unidade: Unidade): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "·";
  if (unidade === "R$") return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
  if (unidade === "%") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function pct(p: number | null): string {
  return p === null ? "·" : `${Math.round(p * 100)}%`;
}
