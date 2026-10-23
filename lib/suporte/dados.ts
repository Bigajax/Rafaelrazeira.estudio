/* ============================================================
   SUPORTE: a leitura (23/10/2026)

   Os chamados que as lojas abrem na aba Suporte do painel moram no
   central (supabase/suporte.sql), o mesmo banco do CRM: aqui se lê
   direto, pelo RLS por dono, sem rota nenhuma.

   Se a tabela ainda não existe, a aba avisa em vez de quebrar: `semTabela`.
   ============================================================ */

import { clienteServidor } from "@/lib/crm/supabase";
import { tabelaAusente } from "@/lib/sistema/consultas";

export type SupMensagem = { id: string; autor: "loja" | "estudio"; texto: string; criado_em: string };

export type SupChamado = {
  id: string;
  loja_id: string;
  tipo: "duvida" | "problema" | "pedido";
  tela: string | null;
  estado: "aberto" | "respondido" | "resolvido";
  tema: string | null;
  faq_id: string | null;
  criado_em: string;
  movido_em: string;
  respondido_em: string | null;
  lido_pela_loja_em: string | null;
  mensagens: SupMensagem[];
  loja: { nome: string; slug: string; dominio: string | null; lead_id: string | null };
  whatsapp: string | null;
};

export type SupFaq = {
  id: string;
  pergunta: string;
  resposta: string;
  tema: string | null;
  ancora_manual: string | null;
  ordem: number;
  publicada: boolean;
  vezes_aberta: number;
};

export type Contagem = { nome: string; vezes: number };

export type Suporte = {
  semTabela: boolean;
  chamados: SupChamado[];
  faq: SupFaq[];
  /* "o que a galera pergunta", nos últimos 90 dias */
  temas: Contagem[];
  telas: Contagem[];
  semResposta: Contagem[];
};

/* Os temas que o estúdio dá aos chamados. Lista aberta: o tema novo que
   o Rafael digitar entra na conta do mesmo jeito. */
export const TEMAS_SUGERIDOS = ["Peças", "Estoque", "Pedidos", "Fotos", "Site", "Banners", "Acesso", "Performance", "Domínio", "Outro"];

function contar(valores: (string | null)[], limite = 8): Contagem[] {
  const mapa = new Map<string, number>();
  for (const v of valores) if (v) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa.entries()]
    .map(([nome, vezes]) => ({ nome, vezes }))
    .sort((a, b) => b.vezes - a.vezes)
    .slice(0, limite);
}

export async function lerSuporte(lojaId?: string): Promise<Suporte> {
  const supabase = await clienteServidor();
  const noventa = new Date(Date.now() - 90 * 864e5).toISOString();

  let consulta = supabase
    .from("sup_chamados")
    .select("*, mensagens:sup_mensagens(id, autor, texto, criado_em), loja:perf_lojas(nome, slug, dominio, lead_id)")
    .order("movido_em", { ascending: false })
    .limit(300);
  if (lojaId) consulta = consulta.eq("loja_id", lojaId);

  const [{ data: chamados, error }, { data: faq }, { data: buscas }] = await Promise.all([
    consulta.returns<Omit<SupChamado, "whatsapp">[]>(),
    supabase.from("sup_faq").select("*").order("ordem").order("criado_em").returns<SupFaq[]>(),
    supabase.from("sup_buscas").select("termo").eq("achou", false).gte("criado_em", noventa).returns<{ termo: string }[]>(),
  ]);
  if (tabelaAusente(error)) return { semTabela: true, chamados: [], faq: [], temas: [], telas: [], semResposta: [] };
  if (error) throw new Error("Não foi possível carregar o Suporte. Tente novamente.");

  /* o WhatsApp do dono sai do card da loja (perf_lojas.lead_id) */
  const ids = [...new Set((chamados ?? []).map((c) => c.loja?.lead_id).filter((x): x is string => !!x))];
  const { data: leads } = ids.length
    ? await supabase.from("crm_leads").select("id, whatsapp").in("id", ids).returns<{ id: string; whatsapp: string | null }[]>()
    : { data: [] as { id: string; whatsapp: string | null }[] };
  const zap = new Map((leads ?? []).map((l) => [l.id, l.whatsapp]));

  const lista: SupChamado[] = (chamados ?? []).map((c) => ({
    ...c,
    mensagens: [...(c.mensagens ?? [])].sort((a, b) => a.criado_em.localeCompare(b.criado_em)),
    whatsapp: c.loja?.lead_id ? (zap.get(c.loja.lead_id) ?? null) : null,
  }));
  const recentes = lista.filter((c) => c.criado_em >= noventa);

  return {
    semTabela: false,
    chamados: lista,
    faq: faq ?? [],
    temas: contar(recentes.map((c) => c.tema)),
    telas: contar(recentes.map((c) => c.tela)),
    semResposta: contar((buscas ?? []).map((b) => b.termo), 12),
  };
}

/** Para o trilho: chamados esperando o estúdio. Sem a tabela, zero, calado. */
export async function chamadosEsperando(): Promise<number> {
  const supabase = await clienteServidor();
  const { count, error } = await supabase
    .from("sup_chamados")
    .select("id", { count: "exact", head: true })
    .eq("estado", "aberto");
  return error ? 0 : (count ?? 0);
}
