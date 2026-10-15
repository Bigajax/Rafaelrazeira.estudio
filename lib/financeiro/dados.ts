import { clienteServidor } from "@/lib/crm/supabase";
import { cache } from "react";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import type { Despesa, Devolucao, Venda } from "@/lib/sistema/indicadores";
import { recebimentoAnulado } from "@/lib/sistema/indicadores";
import type { Custo, Recebimento } from "./tipos";
import type { Ocorrencia } from "./ocorrencias";

async function cotacaoDolar(): Promise<{
  valor: number;
  quando: string;
} | null> {
  try {
    const r = await fetch(
      "https://economia.awesomeapi.com.br/json/last/USD-BRL",
      {
        next: { revalidate: 3600 },
      },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const valor = Number(j.USDBRL?.bid);
    return Number.isFinite(valor) && valor > 0
      ? { valor, quando: j.USDBRL?.create_date ?? "" }
      : null;
  } catch {
    return null;
  }
}

export const financeiro = cache(async function financeiro(ano: number) {
  const banco = await clienteServidor();
  const custos = await lerTodos<Custo>(banco, "fin_custos").catch((e) => {
    if (tabelaAusente(e)) return null;
    throw e;
  });
  if (!custos) return { semTabela: true as const };
  const [
    recebimentos,
    dolar,
    contratos,
    ganhos,
    ciclo,
    despesas,
    devolucoes,
    ocorrencias,
    historicoDespesas,
    clientes,
  ] = await Promise.all([
    lerTodos<Recebimento>(
      banco,
      "crm_recebimentos",
      "id,lead_id,parcela_id,valor,valor_liquido,recebido_em,estornado_em,mp_payment_id,bruto",
    ),
    cotacaoDolar(),
    lerTodos<{
      id: string;
      lead_id: string;
      tipo: string;
      status: string;
      valor_total: number | null;
      assinado_em: string | null;
    }>(
      banco,
      "crm_contratos",
      "id,lead_id,tipo,status,valor_total,assinado_em",
    ),
    lerTodos<{
      id: string;
      estagio: string;
      valor_fechado: number | null;
      fechado_em: string | null;
    }>(banco, "crm_leads", "id,estagio,valor_fechado,fechado_em"),
    banco
      .from("plano_ciclos")
      .select("ticket_medio,margem_alvo")
      .eq("ano", ano)
      .maybeSingle(),
    lerTodos<Despesa>(banco, "fin_despesas").catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
    lerTodos<Devolucao>(banco, "crm_devolucoes").catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
    lerTodos<Ocorrencia>(banco, "fin_ocorrencias").catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
    lerTodos<{
      id: string;
      despesa_id: string;
      motivo: string;
      alterado_em: string;
      antes?: { valor: number; pago_em: string };
      depois?: { valor: number; pago_em: string };
    }>(
      banco,
      "fin_despesas_historico",
      "id,despesa_id,motivo,alterado_em,antes,depois",
    ).catch((e) => {
      if (tabelaAusente(e)) return [];
      throw e;
    }),
    lerTodos<{ id: string; nome: string; empresa: string | null }>(
      banco,
      "crm_leads",
      "id,nome,empresa",
    ),
  ]);
  if (ciclo.error)
    throw new Error(
      "Não foi possível carregar o planejamento financeiro. Tente novamente.",
    );
  const leadsComContrato = new Set(
    contratos.filter((c) => c.tipo === "projeto").map((c) => c.lead_id),
  );
  const vendas: Venda[] = [
    ...contratos
      .filter((c) => c.tipo === "projeto" && c.status === "ativo")
      .map((c) => ({
        id: c.id,
        lead_id: c.lead_id,
        valor: Number(c.valor_total ?? 0),
        quando: c.assinado_em,
      })),
    ...ganhos
      .filter((l) => l.estagio === "ganho" && !leadsComContrato.has(l.id))
      .map((l) => ({
        id: l.id,
        lead_id: l.id,
        valor: Number(l.valor_fechado ?? 0),
        quando: l.fechado_em,
      })),
  ];
  return {
    semTabela: false as const,
    custos: custos.map((c) => ({ ...c, valor: Number(c.valor) })),
    recebimentos: recebimentos.filter((r) => !recebimentoAnulado(r)).map((r) => ({
      ...r,
      valor: Number(r.valor),
      valor_liquido: r.valor_liquido == null ? null : Number(r.valor_liquido),
    })),
    dolar,
    vendas,
    despesas: despesas ?? [],
    devolucoes: devolucoes ?? [],
    ocorrencias: ocorrencias ?? [],
    revisaoDisponivel: ocorrencias !== null,
    historicoDespesas,
    clientes,
    movimentosDisponiveis: despesas !== null && devolucoes !== null,
    escolha: {
      ticket:
        ciclo.data?.ticket_medio == null
          ? null
          : Number(ciclo.data.ticket_medio),
      margem:
        ciclo.data?.margem_alvo == null ? null : Number(ciclo.data.margem_alvo),
    },
  };
});
