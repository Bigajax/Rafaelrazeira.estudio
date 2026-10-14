import { dataValida, proximoMes } from "@/lib/sistema/calendario";
import type { Custo } from "./tipos";
import type { Despesa } from "@/lib/sistema/indicadores";
export type Ocorrencia = {
  id: string;
  custo_id: string;
  descricao: string;
  vence_em: string;
  valor: number;
  moeda: "BRL" | "USD";
};
export function datasDoCompromisso(
  primeiro: string,
  frequencia: Custo["frequencia"],
  quantas: number,
) {
  if (
    !dataValida(primeiro) ||
    !Number.isInteger(quantas) ||
    quantas < 1 ||
    quantas > 24
  )
    throw Error("Confira a primeira data e a quantidade (1 a 24).");
  return Array.from(
    { length: frequencia === "unico" ? 1 : quantas },
    (_, i) => {
      if (frequencia === "semanal") {
        const d = new Date(primeiro + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() + 7 * i);
        return d.toISOString().slice(0, 10);
      }
      const mes = proximoMes(
        primeiro.slice(0, 7),
        i * (frequencia === "anual" ? 12 : 1),
      );
      const ultimo = new Date(
        Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0),
      ).getUTCDate();
      return (
        mes +
        "-" +
        String(Math.min(Number(primeiro.slice(8)), ultimo)).padStart(2, "0")
      );
    },
  );
}
export function saldoDaOcorrencia(o: Ocorrencia, despesas: Despesa[]) {
  const pago = despesas
    .filter((d) => d.ocorrencia_id === o.id)
    .reduce(
      (s, d) => s + Number(o.moeda === "USD" ? d.valor_original : d.valor),
      0,
    );
  return Math.round(Math.max(0, Number(o.valor) - pago) * 100) / 100;
}
export function previstoNoMes(
  mes: string,
  ocorrencias: Ocorrencia[],
  despesas: Despesa[],
  cotacao: number | null,
) {
  const linhas = ocorrencias
    .filter((o) => o.vence_em.slice(0, 7) === mes)
    .map((o) => ({ o, saldo: saldoDaOcorrencia(o, despesas) }));
  const incompleto = linhas.some(
    (x) => x.saldo > 0 && x.o.moeda === "USD" && cotacao === null,
  );
  return incompleto
    ? null
    : linhas.reduce(
        (s, x) => s + x.saldo * (x.o.moeda === "USD" ? (cotacao ?? 0) : 1),
        0,
      );
}
