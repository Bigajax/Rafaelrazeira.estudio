/* A leitura do financeiro no servidor. Mesma chave do CRM: anônima + sessão,
   e o RLS decide o que volta. */
import { clienteServidor } from "@/lib/crm/supabase";
import type { Custo, Recebimento } from "./tipos";

/* O dólar do dia (AwesomeAPI, a mesma cotação do Banco Central com poucos
   minutos de atraso), guardado por uma hora. Se a API cair, a tela diz que
   está sem cotação em vez de inventar uma. */
async function cotacaoDolar(): Promise<{ valor: number; quando: string } | null> {
  try {
    const r = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    const j = (await r.json()) as { USDBRL?: { bid?: string; create_date?: string } };
    const valor = Number(j.USDBRL?.bid);
    return Number.isFinite(valor) && valor > 0 ? { valor, quando: j.USDBRL?.create_date ?? "" } : null;
  } catch {
    return null;
  }
}

export async function financeiro(ano: number) {
  const supabase = await clienteServidor();
  const [custos, recebimentos, dolar, ganhos, ciclo] = await Promise.all([
    supabase.from("fin_custos").select("*").order("inicio").order("created_at").returns<Custo[]>(),
    supabase.from("crm_recebimentos").select("valor, valor_liquido, recebido_em").order("recebido_em").returns<Recebimento[]>(),
    cotacaoDolar(),
    /* as vendas fechadas: o ticket médio real e quantas por mês */
    supabase.from("crm_leads").select("valor_fechado, fechado_em").eq("estagio", "ganho").returns<{ valor_fechado: number | null; fechado_em: string | null }[]>(),
    /* o ticket e a margem escolhidos moram no ciclo do Plano do ano */
    supabase.from("plano_ciclos").select("*").eq("ano", ano).maybeSingle<{ ticket_medio?: number | null; margem_alvo?: number | null }>(),
  ]);
  if (custos.error && /fin_custos|does not exist|schema cache/i.test(custos.error.message)) return { semTabela: true as const };
  return {
    semTabela: false as const,
    custos: (custos.data ?? []).map((c) => ({ ...c, valor: Number(c.valor) })),
    recebimentos: (recebimentos.data ?? []).map((r) => ({
      ...r,
      valor: Number(r.valor),
      valor_liquido: r.valor_liquido === null ? null : Number(r.valor_liquido),
    })),
    dolar,
    vendas: (ganhos.data ?? []).map((g) => ({ valor: Number(g.valor_fechado ?? 0), quando: g.fechado_em })),
    escolha: {
      ticket: ciclo.data?.ticket_medio == null ? null : Number(ciclo.data.ticket_medio),
      margem: ciclo.data?.margem_alvo == null ? null : Number(ciclo.data.margem_alvo),
    },
  };
}
