/* ============================================================
   FINANCEIRO: o vocabulário e as contas (30/09/2026)

   Funções puras. O resultado do mês (o DRE) em linguagem de gente:

     entrou no Caixa                 a soma dos recebimentos do mês
     (−) taxas de recebimento        o que o Mercado Pago ficou (valor − líquido)
     = o que sobrou das vendas
     (−) tráfego pago
     (−) ferramentas                 Claude, ChatGPT, Vercel, Supabase...
     (−) pessoas, impostos, outros
     = o mês fechou em               lucro, ou o que faltou

   A receita é por CAIXA (o dia em que o dinheiro entrou), igual ao Caixa e
   ao Plano: é o número que o Rafael vê no banco.
   ============================================================ */

import { mesLocal } from "@/lib/sistema/calendario";

export type Categoria = "trafego" | "ferramenta" | "pessoal" | "imposto" | "outro";
export type Moeda = "BRL" | "USD";
export type Frequencia = "mensal" | "semanal" | "anual" | "unico";

export const CATEGORIAS: Record<Categoria, { nome: string; explica: string }> = {
  trafego: { nome: "Tráfego pago", explica: "o anúncio que traz o lead" },
  ferramenta: { nome: "Ferramentas", explica: "o que o estúdio usa para produzir: IA, hospedagem, banco" },
  pessoal: { nome: "Pessoas", explica: "quem trabalha junto: freela, comercial" },
  imposto: { nome: "Impostos", explica: "MEI, Simples, taxas do governo" },
  outro: { nome: "Outros", explica: "o que não cabe acima" },
};

export const FREQUENCIAS: Record<Frequencia, string> = {
  mensal: "por mês",
  semanal: "por semana",
  anual: "por ano",
  unico: "uma vez",
};

export type Custo = {
  id: string;
  nome: string;
  categoria: Categoria;
  valor: number;
  moeda: Moeda;
  frequencia: Frequencia;
  inicio: string;
  fim: string | null;
  estimado: boolean;
  nota: string | null;
};

/* "2026-09" */
export type ChaveMes = string;

export function chaveMes(ano: number, mes: number): ChaveMes {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

/* quanto um custo pesa em um mês, em reais */
export function custoNoMes(c: Custo, mes: ChaveMes, dolar: number | null): number | null {
  const ini = c.inicio.slice(0, 7);
  const fim = c.fim ? c.fim.slice(0, 7) : null;
  if (mes < ini || (fim && mes > fim)) return 0;
  if (c.frequencia === "unico" && mes !== ini) return 0;
  if (c.moeda === "USD" && dolar === null) return null;
  const cambio = c.moeda === "USD" ? dolar! : 1;
  const base = c.valor * cambio;
  if (c.frequencia === "semanal") return (base * 52) / 12;
  if (c.frequencia === "anual") return base / 12;
  return base;
}

/* o equivalente mensal de um custo (para a tabela), em reais */
export function porMes(
  c: Pick<Custo, "valor" | "moeda" | "frequencia">,
  dolar: number | null,
): number | null {
  if (c.moeda === "USD" && dolar === null) return null;
  const base = c.valor * (c.moeda === "USD" ? dolar! : 1);
  if (c.frequencia === "semanal") return (base * 52) / 12;
  if (c.frequencia === "anual") return base / 12;
  return base;
}

export type Recebimento = {
  id?: string;
  lead_id?: string | null;
  parcela_id?: string | null;
  valor: number;
  valor_liquido: number | null;
  recebido_em: string;
  estornado_em?: string | null;
};

export type Resultado = {
  mes: ChaveMes;
  entrou: number;
  taxas: number;
  sobrouVendas: number;
  porCategoria: Record<Categoria, number>;
  custos: number;
  resultado: number | null;
  custosSemCotacao: number;
  taxasPendentes: number;
  /* resultado ÷ entrou; null se não entrou nada */
  margem: number | null;
  /* os custos que entraram na conta, para o extrato listar */
  linhas: { custo: Custo; valor: number }[];
};

export function resultadoDoMes(
  mes: ChaveMes,
  recebimentos: Recebimento[],
  custos: Custo[],
  dolar: number | null,
): Resultado {
  const doMes = recebimentos.filter((r) => !r.estornado_em && mesLocal(r.recebido_em) === mes);
  const taxasPendentes = doMes.filter((r) => r.valor_liquido === null).length;
  let custosSemCotacao = 0;
  const entrou = doMes.reduce((a, r) => a + Number(r.valor), 0);
  const taxas = doMes.reduce(
    (a, r) => a + (r.valor_liquido === null ? 0 : Math.max(0, Number(r.valor) - Number(r.valor_liquido))),
    0,
  );
  const porCategoria: Record<Categoria, number> = {
    trafego: 0,
    ferramenta: 0,
    pessoal: 0,
    imposto: 0,
    outro: 0,
  };
  const linhas: Resultado["linhas"] = [];
  for (const c of custos) {
    const v = custoNoMes(c, mes, dolar);
    if (v === null) {
      custosSemCotacao++;
      continue;
    }
    if (!v) continue;
    porCategoria[c.categoria] += v;
    linhas.push({ custo: c, valor: v });
  }
  const custosTotal = Object.values(porCategoria).reduce((a, b) => a + b, 0);
  const sobrouVendas = entrou - taxas;
  const resultado = custosSemCotacao || taxasPendentes ? null : sobrouVendas - custosTotal;
  return {
    mes,
    entrou,
    taxas,
    sobrouVendas,
    porCategoria,
    custos: custosTotal,
    resultado,
    custosSemCotacao,
    taxasPendentes,
    margem: entrou > 0 && resultado !== null ? resultado / entrou : null,
    linhas: linhas.sort((a, b) => b.valor - a.valor),
  };
}

export function reais(v: number, centavos = false): string {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: centavos ? 2 : 0,
    maximumFractionDigits: centavos ? 2 : 0,
  });
}

export const MESES_LONGOS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function nomeDoMes(mes: ChaveMes): string {
  return MESES_LONGOS[Number(mes.slice(5, 7)) - 1];
}
