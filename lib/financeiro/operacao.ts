import { centavos } from "@/lib/crm/financeiro";
import { diaLocal } from "@/lib/sistema/calendario";
import { somarDias } from "@/lib/crm/regras";
import type { Despesa, Devolucao, Entrada } from "@/lib/sistema/indicadores";
import { devolucoesComLegado } from "@/lib/sistema/indicadores";
import { saldoDaOcorrencia, type Ocorrencia } from "./ocorrencias";

export const AREAS_FINANCEIRO = [
  ["visao", "Resumo"], ["receber", "A receber"], ["pagar", "A pagar"],
  ["extrato", "Extrato"], ["planejamento", "Planejamento"],
] as const;
export type AreaFinanceiro = (typeof AREAS_FINANCEIRO)[number][0];
export function areaFinanceiro(aba?: string): AreaFinanceiro {
  if (aba === "custos" || aba === "previsao") return "planejamento";
  if (aba === "despesas") return "extrato";
  if (aba === "contratos") return "receber";
  return AREAS_FINANCEIRO.find(([id]) => id === aba)?.[0] ?? "visao";
}
export function urlFinanceiro(mes: string, aba: AreaFinanceiro, filtros: Record<string, string> = {}) {
  return "/crm/financeiro?" + new URLSearchParams({ mes, aba, ...filtros }).toString();
}
export type SituacaoConta = "vencida" | "hoje" | "a_vencer" | "parcial" | "paga";
export const NOME_SITUACAO: Record<SituacaoConta, string> = {
  vencida: "Vencida", hoje: "Vence hoje", a_vencer: "A vencer", parcial: "Paga parcialmente", paga: "Paga",
};
export function situacaoConta(total: number, saldo: number, vencimento: string, hoje: string): SituacaoConta {
  if (saldo <= 0) return "paga";
  if (vencimento < hoje) return "vencida";
  if (vencimento === hoje) return "hoje";
  return saldo < total ? "parcial" : "a_vencer";
}
export function contasAPagar(ocorrencias: Ocorrencia[], despesas: Despesa[], hoje: string) {
  return ocorrencias.map((conta) => {
    const saldo = saldoDaOcorrencia(conta, despesas);
    return { ...conta, saldo, situacao: situacaoConta(Number(conta.valor), saldo, conta.vence_em, hoje) };
  }).sort((a, b) => Number(a.saldo <= 0) - Number(b.saldo <= 0) || a.vence_em.localeCompare(b.vence_em) || a.id.localeCompare(b.id));
}
export function liquidoConfirmado(entradas: Entrada[]) {
  const confirmadas = entradas.filter((e) => e.valor_liquido != null);
  return {
    valor: centavos(confirmadas.reduce((s, e) => s + Number(e.valor_liquido), 0)),
    pendentes: entradas.length - confirmadas.length,
  };
}
export type ParcelaOperacional = {
  id: string; lead_id: string; lead_nome: string; rotulo: string; vence_em: string;
  saldo: number; valor?: number; recebido?: number; metodo_previsto?: string | null;
  whatsapp?: string | null; contrato_titulo?: string; cobrar_em?: string | null;
};
export function pendenciasFinanceiras(parcelas: ParcelaOperacional[], contas: ReturnType<typeof contasAPagar>, hoje: string) {
  const limite = somarDias(hoje, 7);
  return {
    receberVencido: parcelas.filter((p) => p.saldo > 0 && p.vence_em < hoje),
    receberHoje: parcelas.filter((p) => p.saldo > 0 && p.vence_em === hoje),
    pagarVencido: contas.filter((p) => p.saldo > 0 && p.vence_em < hoje),
    pagarSemana: contas.filter((p) => p.saldo > 0 && p.vence_em >= hoje && p.vence_em <= limite),
  };
}
export type MovimentoFinanceiro = {
  id: string; tipo: "entrada" | "saida" | "devolucao"; data: string; descricao: string;
  valor: number; lead_id?: string | null; origemId: string;
};
export function extratoFinanceiro(mes: string, entradas: Entrada[], despesas: Despesa[], devolucoes: Devolucao[]): MovimentoFinanceiro[] {
  const movimentos: MovimentoFinanceiro[] = [
    ...entradas.map((e, i) => ({ id: "entrada:" + (e.id ?? i), origemId: e.id ?? "", tipo: "entrada" as const, data: diaLocal(e.recebido_em), descricao: "Recebimento", valor: Number(e.valor), lead_id: e.lead_id })),
    ...despesas.map((e) => ({ id: "saida:" + e.id, origemId: e.id, tipo: "saida" as const, data: diaLocal(e.pago_em), descricao: e.nome, valor: Number(e.valor) })),
    ...devolucoesComLegado(entradas, devolucoes).map((e) => ({ id: "devolucao:" + e.id, origemId: e.recebimento_id, tipo: "devolucao" as const, data: diaLocal(e.devolvido_em), descricao: "Devolução", valor: Number(e.valor), lead_id: entradas.find((r) => r.id === e.recebimento_id)?.lead_id })),
  ];
  return movimentos.filter((e) => e.data.slice(0, 7) === mes)
    .sort((a, b) => b.data.localeCompare(a.data) || a.id.localeCompare(b.id));
}
