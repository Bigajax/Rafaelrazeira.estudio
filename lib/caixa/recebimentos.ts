import { centavos } from "@/lib/crm/financeiro";
import { valorRetido } from "@/lib/sistema/indicadores";

type Entrada = {
  parcela_id?: string | null;
  valor: number;
  estornado_em?: string | null;
  valor_estornado?: number;
  bruto?: unknown;
};
export type Alocacao = { parcela_id: string; valor: number };
export function metadados(bruto: unknown): Record<string, unknown> {
  return bruto && typeof bruto === "object" && !Array.isArray(bruto)
    ? (bruto as Record<string, unknown>)
    : {};
}
/** A entrada continua única. Devoluções desfazem as últimas alocações primeiro. */
export function alocacoesDoRecebimento(r: Entrada): Alocacao[] {
  let disponivel = valorRetido(r);
  if (r.parcela_id)
    return disponivel > 0
      ? [{ parcela_id: r.parcela_id, valor: disponivel }]
      : [];
  const lista = metadados(r.bruto).caixa_alocacoes;
  if (!Array.isArray(lista)) return [];
  const vistas = new Set<string>();
  return lista.flatMap((a: Alocacao) => {
    if (
      !a ||
      typeof a.parcela_id !== "string" ||
      vistas.has(a.parcela_id) ||
      !Number.isFinite(a.valor) ||
      a.valor <= 0
    )
      return [];
    vistas.add(a.parcela_id);
    const valor = centavos(Math.min(disponivel, a.valor));
    disponivel = centavos(disponivel - valor);
    return valor > 0 ? [{ parcela_id: a.parcela_id, valor }] : [];
  });
}
export function pagamentosPorParcela(recebimentos: Entrada[]) {
  const mapa = new Map<string, number>();
  for (const r of recebimentos)
    for (const a of alocacoesDoRecebimento(r))
      mapa.set(a.parcela_id, centavos((mapa.get(a.parcela_id) ?? 0) + a.valor));
  return mapa;
}
export function semAlocacao(r: Entrada) {
  return centavos(
    Math.max(
      0,
      valorRetido(r) -
        alocacoesDoRecebimento(r).reduce((s, a) => s + a.valor, 0),
    ),
  );
}
