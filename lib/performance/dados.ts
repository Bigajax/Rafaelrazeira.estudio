import { tabelaAusente, conferir } from "@/lib/sistema/consultas";
/* ============================================================
   PERFORMANCE: a leitura (06/10/2026)

   As lojas que mandam a contagem para o banco do estúdio, com o resumo
   dos últimos 7 dias de cada uma. Duas fontes, lidas juntas:
     perf_lojas            a ficha da loja (RLS por dono, leitura direta)
     perf_resumo_lojas()   os números, pela função: perf_eventos não tem
                           policy, e abrir select nela para o navegador
                           seria abrir a contagem de toda loja

   Se a tabela ainda não existe (o supabase/performance.sql não rodou), a
   aba avisa em vez de quebrar: `semTabela`.
   ============================================================ */

import { clienteServidor } from "@/lib/crm/supabase";
import type { PerfLoja, PerfResumo } from "@/lib/crm/tipos";
import { situacaoDaLoja, type SituacaoLoja } from "./regras";

/* (03/11/2026) o gasto do Turbinar na Meta, lançado pelo estúdio, por mês ("2026-11") */
export type GastoTurbinar = { mes: string; valor: number };

export type LojaPerformance = PerfLoja & {
  gastos: GastoTurbinar[];
  /* (04/11/2026) a última vez que a dona abriu o pagamento do Turbinar no painel */
  olhou_turbinar: string | null;
  resumo: PerfResumo | null;
  lead_nome: string | null;
  /* a situação da trava, já decidida aqui para a tela não repetir a conta */
  situacao: SituacaoLoja;
};

export async function lojasPerformance(): Promise<{ lojas: LojaPerformance[]; semTabela: boolean }> {
  const supabase = await clienteServidor();
  const [{ data: lojas, error }, { data: resumo, error: erroResumo }] = await Promise.all([
    supabase.from("perf_lojas").select("*").order("criado_em", { ascending: false }).returns<PerfLoja[]>(),
    supabase.rpc("perf_resumo_lojas"),
  ]);
  if (tabelaAusente(error)) return { lojas: [], semTabela: true };
  if (error || erroResumo) throw new Error("Não foi possível carregar o Performance. Tente novamente.");

  const ids = [...new Set((lojas ?? []).map((l) => l.lead_id).filter((x): x is string => !!x))];
  const { data: leads } = ids.length
    ? await supabase
        .from("crm_leads")
        .select("id, nome, empresa")
        .in("id", ids)
        .returns<{ id: string; nome: string; empresa: string | null }[]>()
    : { data: [] as { id: string; nome: string; empresa: string | null }[] };
  const nomeDoLead = new Map((leads ?? []).map((l) => [l.id, l.empresa || l.nome]));
  /* o gasto do Turbinar: sem a tabela (o turbinar-gastos.sql não rodou), vazio */
  const { data: gastos } = await supabase
    .from("perf_turbinar_gastos")
    .select("loja_id, mes, valor")
    .order("mes", { ascending: false })
    .returns<{ loja_id: string; mes: string; valor: number }[]>();
  const gastosDaLoja = new Map<string, GastoTurbinar[]>();
  for (const g of gastos ?? []) {
    const lista = gastosDaLoja.get(g.loja_id) ?? [];
    lista.push({ mes: g.mes.slice(0, 7), valor: Number(g.valor) });
    gastosDaLoja.set(g.loja_id, lista);
  }
  /* quem abriu o pagamento do Turbinar: sem a tabela (o turbinar-interesse.sql
     não rodou), ninguém. Vem do mais novo para o mais antigo: o primeiro de cada loja vale */
  const { data: olhadas } = await supabase
    .from("perf_turbinar_olhadas")
    .select("loja_id, criado_em")
    .order("criado_em", { ascending: false })
    .limit(500)
    .returns<{ loja_id: string; criado_em: string }[]>();
  const olhouPorLoja = new Map<string, string>();
  for (const o of olhadas ?? []) if (!olhouPorLoja.has(o.loja_id)) olhouPorLoja.set(o.loja_id, o.criado_em);
  const porLoja = new Map(((resumo as PerfResumo[] | null) ?? []).map((r) => [r.loja_id, r]));

  return {
    semTabela: false,
    lojas: (lojas ?? []).map((l) => ({
      ...l,
      resumo: porLoja.get(l.id) ?? null,
      gastos: gastosDaLoja.get(l.id) ?? [],
      olhou_turbinar: olhouPorLoja.get(l.id) ?? null,
      lead_nome: l.lead_id ? (nomeDoLead.get(l.lead_id) ?? null) : null,
      situacao: situacaoDaLoja(l),
    })),
  };
}

/** A loja Performance de um lead, para a ficha do projeto. Nula se não houver. */
export async function performanceDoLead(leadId: string): Promise<PerfLoja | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("perf_lojas")
    .select("*")
    .eq("lead_id", leadId)
    .limit(1)
    .maybeSingle<PerfLoja>();
  return data ?? null;
}
