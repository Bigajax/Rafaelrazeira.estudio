import { centavos } from "@/lib/crm/financeiro";
import { diaLocal, mesLocal } from "./calendario";

export const INDICADORES = {
  recebido: {
    nome: "Recebido bruto",
    unidade: "R$",
    regra:
      "Entradas pela data de recebimento. Devoluções aparecem na data em que aconteceram.",
    href: "/crm/caixa",
  },
  vendido: {
    nome: "Contratado ativo",
    unidade: "R$",
    regra:
      "Contratos de projeto ativos pela data de assinatura. Ganhos antigos sem contrato usam a data legada. Mensalidades são apresentadas separadamente.",
    href: "/crm/caixa",
  },
  despesas: {
    nome: "Despesas pagas",
    unidade: "R$",
    regra:
      "Saídas registradas em reais pela data de pagamento. Custos cadastrados são previsão.",
    href: "/crm/financeiro?aba=despesas",
  },
  saldo: {
    nome: "Saldo operacional",
    unidade: "R$",
    regra:
      "Recebimentos líquidos menos devoluções e despesas pagas. Indisponível quando faltam taxas. Não representa saldo bancário.",
    href: "/crm/financeiro",
  },
  entregas: {
    nome: "Entregas concluídas",
    unidade: "un",
    regra:
      "Projetos pela data de entrega, sem contar mensalidades como novas entregas.",
    href: "/crm/projetos",
  },
} as const;

export type Entrada = {
  bruto?: unknown;
  id?: string;
  lead_id?: string | null;
  parcela_id?: string | null;
  valor: number;
  valor_liquido: number | null;
  recebido_em: string;
  estornado_em?: string | null;
  valor_estornado?: number;
};
export type Devolucao = {
  id: string;
  recebimento_id: string;
  valor: number;
  devolvido_em: string;
  notas?: string | null;
};
export type Despesa = {
  ocorrencia_id?: string | null;
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  pago_em: string;
  custo_id: string | null;
  moeda_original: "BRL" | "USD";
  valor_original: number | null;
  notas: string | null;
};
export type Venda = {
  id?: string;
  lead_id?: string;
  valor: number;
  quando: string | null;
};

export function devolucoesComLegado(
  entradas: Entrada[],
  devolucoes: Devolucao[],
): Devolucao[] {
  entradas = entradas.filter(r => !recebimentoAnulado(r));
  const anteriores = new Map<string, number>();
  for (const d of devolucoes)
    anteriores.set(
      d.recebimento_id,
      (anteriores.get(d.recebimento_id) ?? 0) + Number(d.valor),
    );
  // Uma devolução integral do webhook pode suceder uma devolução parcial manual.
  // Preservar as duas datas e somar apenas o restante, sem duplicar o integral.
  return [
    ...devolucoes,
    ...entradas
      .filter(
        (r) =>
          r.estornado_em && Number(r.valor) > (anteriores.get(r.id ?? "") ?? 0),
      )
      .map((r) => ({
        id: `legado:${r.id}`,
        recebimento_id: r.id ?? "",
        valor: centavos(Number(r.valor) - (anteriores.get(r.id ?? "") ?? 0)),
        devolvido_em: diaLocal(r.estornado_em!),
      })),
  ];
}
export function recebimentoAnulado(r: {bruto?: unknown}) {
  return Boolean(r.bruto && typeof r.bruto === "object" && (r.bruto as Record<string,unknown>).caixa_anulado);
}
export function valorRetido(
  r: Pick<Entrada, "valor" | "estornado_em" | "valor_estornado" | "bruto">,
) {
  return r.estornado_em || recebimentoAnulado(r)
    ? 0
    : centavos(Math.max(0, Number(r.valor) - Number(r.valor_estornado ?? 0)));
}
export function apurarMes(
  mes: string,
  entradas: Entrada[],
  despesas: Despesa[],
  devolucoes: Devolucao[],
  vendas: Venda[] = [],
) {
  const rs = entradas.filter((r) => !recebimentoAnulado(r) && mesLocal(r.recebido_em) === mes);
  const ds = despesas.filter((d) => mesLocal(d.pago_em) === mes);
  const es = devolucoesComLegado(entradas, devolucoes).filter(
    (d) => mesLocal(d.devolvido_em) === mes,
  );
  const taxasPendentes = rs.filter((r) => r.valor_liquido == null).length;
  const bruto = centavos(rs.reduce((s, r) => s + Number(r.valor), 0));
  const taxas = centavos(
    rs.reduce(
      (s, r) =>
        s +
        (r.valor_liquido == null
          ? 0
          : Math.max(0, Number(r.valor) - Number(r.valor_liquido))),
      0,
    ),
  );
  const devolvido = centavos(es.reduce((s, d) => s + Number(d.valor), 0));
  const pago = centavos(ds.reduce((s, d) => s + Number(d.valor), 0));
  return {
    mes,
    bruto,
    taxas,
    taxasPendentes,
    devolvido,
    despesas: pago,
    liquido: taxasPendentes ? null : centavos(bruto - taxas),
    saldo: taxasPendentes ? null : centavos(bruto - taxas - devolvido - pago),
    vendido: centavos(
      vendas
        .filter((v) => v.quando && mesLocal(v.quando) === mes)
        .reduce((s, v) => s + v.valor, 0),
    ),
    entradas: rs,
    saidas: ds,
    devolucoes: es,
  };
}
