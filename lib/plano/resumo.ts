import { inicioDaMeta } from "@/lib/sistema/metas";
import { percentual, TETO, type Fonte, type Meta, type Projeto, type Valores } from "./tipos";

export function anoDoPlano(pedido: string | undefined, hoje: string): number {
  const n = Number(pedido);
  return /^\d{4}$/.test(pedido ?? "") && Number.isInteger(n) && n >= 2020 && n <= 2100 ? n : Number(hoje.slice(0, 4));
}
export function ultimoMesConcluido(ano: number, hoje: string): number {
  const atual = Number(hoje.slice(0, 4));
  return ano < atual ? 12 : ano > atual ? 0 : Number(hoje.slice(5, 7)) - 1;
}
export function leituraMeta(meta: Meta, valores: Partial<Record<number, number>>, mes: number) {
  const de = inicioDaMeta(meta);
  const vigente = mes >= de && mes >= 1 && mes <= 12;
  const meses = !vigente ? [] : meta.periodo === "ano" ? Array.from({ length: mes - de + 1 }, (_, i) => de + i) : [mes];
  const faltamMedicoes = meses.filter((n) => !Number.isFinite(valores[n]));
  const realizado = !vigente || faltamMedicoes.length ? null : meses.reduce((s, n) => s + valores[n]!, 0);
  const alvo = meta.periodo === "ano" ? meta.alvo * mes / 12 : meta.alvo;
  const falta = realizado === null ? null : Math.max(0, meta.direcao === "reduzir" ? realizado - alvo : alvo - realizado);
  return { vigente, realizado, alvo, falta, faltamMedicoes, percentual: percentual(meta, valores, mes) };
}
/** Nota da revisão mensal: uma meta mensal usa aquele mês, não a média do ano. */
export function notaDoMes(metas: Meta[], valores: Valores, mes: number): number | null {
  let soma = 0, pesos = 0;
  for (const meta of metas) {
    const p = percentual(meta, valores[meta.id] ?? {}, mes);
    if (p === null || meta.peso <= 0) continue;
    soma += Math.max(0, Math.min(TETO, p)) * meta.peso;
    pesos += meta.peso;
  }
  return pesos ? soma / pesos : null;
}
export function metaPrincipal(metas: Meta[], projetos: Projeto[]): Meta | null {
  const projetosPorId = new Map(projetos.map((p) => [p.id, p]));
  const prio = { P1: 0, P2: 1, P3: 2 };
  const ordem = (m: Meta) => {
    const p = projetosPorId.get(m.projeto_id);
    return p && p.status === "ativo" && p.horizonte === "agora" ? prio[p.prioridade] : 4;
  };
  return [...metas].sort((a, b) => ordem(a) - ordem(b) || b.peso - a.peso || (a.fonte === "recebido" ? 0 : 1) - (b.fonte === "recebido" ? 0 : 1) || a.ordem - b.ordem || a.id.localeCompare(b.id))[0] ?? null;
}
export function fonteDaMeta(fonte: Fonte, ano: number, mes: number): { href: string; acao: string } {
  if (mes < 1) return { href: "#metas", acao: "Preparar meta" };
  const periodo = `${ano}-${String(Math.max(1, Math.min(12, mes))).padStart(2, "0")}`;
  switch (fonte) {
    case "recebido": return { href: `/crm/financeiro?mes=${periodo}&aba=extrato`, acao: "Conferir recebimentos" };
    case "despesas": return { href: `/crm/financeiro?mes=${periodo}&aba=extrato&filtro=saidas`, acao: "Conferir despesas" };
    case "saldo": return { href: `/crm/financeiro?mes=${periodo}&aba=extrato`, acao: "Conferir resultado" };
    case "fechados": return { href: `/crm/caixa?ano=${ano}`, acao: "Conferir vendas" };
    case "entregas": return { href: "/crm/projetos", acao: "Acompanhar entregas" };
    case "toques": return { href: "/crm/atendimento", acao: "Abrir atendimento" };
    case "posts": return { href: "/crm/marketing/resultados", acao: "Conferir publicações" };
    default: return { href: "#rmr", acao: "Lançar medição" };
  }
}

export type OperacaoPlano = {
  novos: number;
  respostas: number;
  propostas: number;
  entregasPendentes: number | null;
  taxasPendentes: number;
};
