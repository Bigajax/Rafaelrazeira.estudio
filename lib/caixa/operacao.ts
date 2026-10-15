import type { ParcelaPainel, Interacao, Recebimento } from "@/lib/crm/tipos";
import { centavos, somar } from "@/lib/crm/financeiro";
import { somarDias } from "@/lib/crm/regras";
import { diaLocal, mesLocal } from "@/lib/sistema/calendario";
import type { Devolucao } from "@/lib/sistema/indicadores";
import { recebimentoAnulado } from "@/lib/sistema/indicadores";
export const PREFIXO_COBRANCA = "[Caixa] Cobrança";
export function abertas(parcelas: ParcelaPainel[]) {
  return parcelas.filter(
    (p) => !p.cancelada_em && centavos(p.valor - p.recebido) > 0,
  );
}
export const saldoParcela = (p: ParcelaPainel) =>
  p.cancelada_em?0:centavos(Math.max(0, p.valor - p.recebido));
export function filaCobranca(parcelas: ParcelaPainel[], hoje: string) {
  return agruparParcelas(
    abertas(parcelas).filter((p) => (p.cobrar_em || p.vence_em) <= hoje),
  );
}
export function agruparParcelas(parcelas: ParcelaPainel[]) {
  const mapa = new Map<string, ParcelaPainel[]>();
  const ordem = (a: ParcelaPainel, b: ParcelaPainel) =>
    (a.cobrar_em || a.vence_em).localeCompare(b.cobrar_em || b.vence_em) ||
    a.vence_em.localeCompare(b.vence_em) ||
    a.id.localeCompare(b.id);
  for (const p of [...parcelas].sort(ordem))
    mapa.set(p.lead_id, [...(mapa.get(p.lead_id) ?? []), p]);
  return [...mapa].map(([lead_id, parcelas]) => ({
    lead_id,
    parcelas,
    saldo: somar(parcelas.map(saldoParcela)),
  }));
}
export function resumoCaixa(
  parcelas: ParcelaPainel[],
  recebimentos: Recebimento[],
  devolucoes: Devolucao[],
  mes: string,
  hoje: string,
) {
  const vivas = abertas(parcelas),
    entradas = recebimentos.filter(
      (r) => !recebimentoAnulado(r) && mesLocal(r.recebido_em) === mes,
    );
  const bruto = somar(entradas.map((r) => Number(r.valor)));
  const devolvido = somar(
    devolucoes
      .filter((d) => mesLocal(d.devolvido_em) === mes)
      .map((d) => Number(d.valor)),
  );
  return {
    bruto,
    devolvido,
    recebido: centavos(bruto - devolvido),
    liquidoConhecido: somar(
      entradas
        .filter((r) => r.valor_liquido != null)
        .map((r) => Number(r.valor_liquido)),
    ),
    taxasPendentes: entradas.filter((r) => r.valor_liquido == null).length,
    vencido: somar(vivas.filter((p) => p.vence_em < hoje).map(saldoParcela)),
    hoje: somar(vivas.filter((p) => p.vence_em === hoje).map(saldoParcela)),
    futuro: somar(
      vivas
        .filter((p) => p.vence_em > hoje && p.vence_em <= somarDias(hoje, 30))
        .map(saldoParcela),
    ),
  };
}
export function agendaCaixa(
  parcelas: ParcelaPainel[],
  hoje: string,
  dias: number,
) {
  const grupos = new Map<string, ParcelaPainel[]>();
  for (const p of abertas(parcelas)
    .filter((p) => p.vence_em > hoje && p.vence_em <= somarDias(hoje, dias))
    .sort((a, b) => a.vence_em.localeCompare(b.vence_em)))
    grupos.set(p.vence_em, [...(grupos.get(p.vence_em) ?? []), p]);
  return [...grupos].map(([dia, parcelas]) => ({
    dia,
    parcelas,
    saldo: somar(parcelas.map(saldoParcela)),
  }));
}
export function cobrancasDoCliente(historico: Interacao[], lead: string) {
  return historico
    .filter((i) => i.lead_id === lead && i.resumo?.startsWith(PREFIXO_COBRANCA))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
export function filtrarHistorico(
  recebimentos: Recebimento[],
  f: {
    inicio: string;
    fim: string;
    cliente: string;
    metodo: string;
    origem: string;
    conferencia: string;
    contrato: string;
  },
  parcelas: ParcelaPainel[],
) {
  const ids = new Set(
    parcelas
      .filter((p) => !f.contrato || p.contrato_id === f.contrato)
      .map((p) => p.id),
  );
  return recebimentos
    .filter(
      (r) =>
        diaLocal(r.recebido_em) >= f.inicio &&
        diaLocal(r.recebido_em) <= f.fim &&
        (!f.cliente || r.lead_id === f.cliente) &&
        (!f.metodo || r.metodo === f.metodo) &&
        (!f.origem || r.origem === f.origem) &&
        (!f.conferencia ||
          (f.conferencia === "anulado"
            ? recebimentoAnulado(r)
            : !recebimentoAnulado(r) &&
              (f.conferencia === "pendente"
                ? r.valor_liquido == null
                : r.valor_liquido != null))) &&
        (!f.contrato ||
          (r.parcela_id && ids.has(r.parcela_id)) ||
          (Array.isArray(
            (r.bruto as Record<string, unknown>)?.caixa_alocacoes,
          ) &&
            (
              (r.bruto as Record<string, unknown>).caixa_alocacoes as {
                parcela_id: string;
              }[]
            ).some(
              (a) =>
                a && typeof a.parcela_id === "string" && ids.has(a.parcela_id),
            ))),
    )
    .sort(
      (a, b) =>
        b.recebido_em.localeCompare(a.recebido_em) || b.id.localeCompare(a.id),
    );
}
