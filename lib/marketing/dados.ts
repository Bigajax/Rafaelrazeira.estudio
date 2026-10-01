/* A leitura do marketing no servidor. Mesma chave do CRM: anônima + sessão,
   e o RLS decide o que volta. */
import { clienteServidor } from "@/lib/crm/supabase";
import type { Peca, Pedido } from "./tipos";

/* O calendário busca o mês que está na tela e as peças sem data, que são a
   bandeja de onde se agenda. Uma consulta só: são dezenas de linhas. */
export async function calendario(inicio: string, fim: string) {
  const supabase = await clienteServidor();
  const [{ data: noMes }, { data: semData }, { data: sinal }, { data: fila }] = await Promise.all([
    supabase
      .from("mkt_pecas")
      .select("*")
      .gte("posta_em", inicio)
      .lte("posta_em", fim)
      .order("posta_em")
      .returns<Peca[]>(),
    supabase
      .from("mkt_pecas")
      .select("*")
      .is("posta_em", null)
      .order("criado_em", { ascending: false })
      .returns<Peca[]>(),
    supabase.from("mkt_sinal").select("visto_em").maybeSingle<{ visto_em: string }>(),
    supabase
      .from("mkt_pedidos")
      .select("*")
      .in("status", ["na_fila", "rodando"])
      .order("criado_em")
      .returns<Pedido[]>(),
  ]);
  return {
    noMes: noMes ?? [],
    semData: semData ?? [],
    vistoEm: sinal?.visto_em ?? null,
    fila: fila ?? [],
  };
}

/* A aba Criar (01/10): as pautas que esperam data, o último pedido de
   pautas (para dizer onde ele está), a fila inteira (para dizer quantos
   estão na frente) e o batimento do time. */
export async function criacao() {
  const supabase = await clienteServidor();
  const [{ data: semData }, { data: pautas }, { data: fila }, { data: sinal }] = await Promise.all([
    supabase.from("mkt_pecas").select("*").is("posta_em", null).order("criado_em", { ascending: false }).returns<Peca[]>(),
    supabase.from("mkt_pedidos").select("*").eq("agente", "pautas").order("criado_em", { ascending: false }).limit(1).returns<Pedido[]>(),
    supabase.from("mkt_pedidos").select("*").in("status", ["na_fila", "rodando"]).order("criado_em").returns<Pedido[]>(),
    supabase.from("mkt_sinal").select("visto_em").maybeSingle<{ visto_em: string }>(),
  ]);
  return {
    semData: semData ?? [],
    ultimoPautas: pautas?.[0] ?? null,
    fila: fila ?? [],
    vistoEm: sinal?.visto_em ?? null,
  };
}

/* O que o painel Hoje mostra: as peças marcadas para hoje que ainda não
   foram postadas. Postada sai da vista, igual lead riscado. */
export async function postsDoDia(hoje: string) {
  const supabase = await clienteServidor();
  const { data } = await supabase
    .from("mkt_pecas")
    .select("*")
    .eq("posta_em", hoje)
    .neq("status", "postada")
    .order("criado_em")
    .returns<Peca[]>();
  return data ?? [];
}

/* A constância, para as Métricas: postadas por semana (segunda a domingo)
   nas últimas oito semanas, e o que já está marcado para os próximos sete
   dias. A semana é a da DATA DO POST, não a do dia em que se apertou
   "Postada": é o calendário que mede o ritmo do feed. */
export async function constancia(hoje: string) {
  const supabase = await clienteServidor();
  const base = new Date(`${hoje}T12:00:00`);
  const segunda = new Date(base);
  segunda.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const inicio = new Date(segunda);
  inicio.setDate(segunda.getDate() - 7 * 7);
  const fimSemana = new Date(base);
  fimSemana.setDate(base.getDate() + 7);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("mkt_pecas")
    .select("posta_em, status")
    .gte("posta_em", iso(inicio))
    .lte("posta_em", iso(fimSemana))
    .returns<Pick<Peca, "posta_em" | "status">[]>();
  const linhas = data ?? [];

  const semanas = Array.from({ length: 8 }, (_, i) => {
    const ini = new Date(inicio);
    ini.setDate(inicio.getDate() + i * 7);
    const fim = new Date(ini);
    fim.setDate(ini.getDate() + 6);
    const [a, b] = [iso(ini), iso(fim)];
    return {
      inicio: a,
      postadas: linhas.filter((l) => l.status === "postada" && l.posta_em! >= a && l.posta_em! <= b).length,
      atual: i === 7,
    };
  });
  const proximas = linhas.filter((l) => l.posta_em! > hoje && l.posta_em! <= iso(fimSemana));
  return {
    semanas,
    proximas: proximas.length,
    prontas: proximas.filter((l) => l.status === "pronta").length,
  };
}

/* A aba Produção: todas as peças que ainda não saíram, e as últimas
   postadas, com a fila do time para marcar em qual ele está mexendo. */
export async function producao() {
  const supabase = await clienteServidor();
  const [{ data: abertas }, { data: postadas }, { data: fila }, { data: sinal }] = await Promise.all([
    supabase.from("mkt_pecas").select("*").neq("status", "postada").order("criado_em", { ascending: false }).returns<Peca[]>(),
    supabase
      .from("mkt_pecas")
      .select("*")
      .eq("status", "postada")
      .order("posta_em", { ascending: false, nullsFirst: false })
      .limit(8)
      .returns<Peca[]>(),
    supabase.from("mkt_pedidos").select("*").in("status", ["na_fila", "rodando"]).order("criado_em").returns<Pedido[]>(),
    supabase.from("mkt_sinal").select("visto_em").maybeSingle<{ visto_em: string }>(),
  ]);
  return { abertas: abertas ?? [], postadas: postadas ?? [], fila: fila ?? [], vistoEm: sinal?.visto_em ?? null };
}

export async function peca(id: string) {
  const supabase = await clienteServidor();
  const [{ data }, { data: pedidos }, { data: sinal }] = await Promise.all([
    supabase.from("mkt_pecas").select("*").eq("id", id).maybeSingle<Peca>(),
    supabase
      .from("mkt_pedidos")
      .select("*")
      .eq("peca_id", id)
      .order("criado_em", { ascending: false })
      .limit(12)
      .returns<Pedido[]>(),
    supabase.from("mkt_sinal").select("visto_em").maybeSingle<{ visto_em: string }>(),
  ]);
  return { peca: data, pedidos: pedidos ?? [], vistoEm: sinal?.visto_em ?? null };
}
