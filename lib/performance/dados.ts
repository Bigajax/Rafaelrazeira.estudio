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

export type LojaPerformance = PerfLoja & {
  resumo: PerfResumo | null;
  lead_nome: string | null;
  /* a situação da trava, já decidida aqui para a tela não repetir a conta */
  situacao: SituacaoLoja;
};

export async function lojasPerformance(): Promise<{ lojas: LojaPerformance[]; semTabela: boolean }> {
  const supabase = await clienteServidor();
  const [{ data: lojas, error }, { data: resumo }] = await Promise.all([
    supabase.from("perf_lojas").select("*").order("criado_em", { ascending: false }).returns<PerfLoja[]>(),
    supabase.rpc("perf_resumo_lojas"),
  ]);
  if (error) return { lojas: [], semTabela: true };

  const ids = [...new Set((lojas ?? []).map((l) => l.lead_id).filter((x): x is string => !!x))];
  const { data: leads } = ids.length
    ? await supabase.from("crm_leads").select("id, nome, empresa").in("id", ids).returns<{ id: string; nome: string; empresa: string | null }[]>()
    : { data: [] as { id: string; nome: string; empresa: string | null }[] };
  const nomeDoLead = new Map((leads ?? []).map((l) => [l.id, l.empresa || l.nome]));
  const porLoja = new Map(((resumo as PerfResumo[] | null) ?? []).map((r) => [r.loja_id, r]));

  return {
    semTabela: false,
    lojas: (lojas ?? []).map((l) => ({
      ...l,
      resumo: porLoja.get(l.id) ?? null,
      lead_nome: l.lead_id ? (nomeDoLead.get(l.lead_id) ?? null) : null,
      situacao: situacaoDaLoja(l),
    })),
  };
}

/** A loja Performance de um lead, para a ficha do projeto. Nula se não houver. */
export async function performanceDoLead(leadId: string): Promise<PerfLoja | null> {
  const supabase = await clienteServidor();
  const { data } = await supabase.from("perf_lojas").select("*").eq("lead_id", leadId).limit(1).maybeSingle<PerfLoja>();
  return data ?? null;
}
