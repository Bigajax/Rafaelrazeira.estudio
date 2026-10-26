/* As leituras das telas do AI Studio, todas com a sessão de quem está
   logado (o RLS filtra pelo dono). */
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { temChave } from "./openrouter";
import { lerConfig, lerConsumo } from "./orcamento";
import { assinar, assinarCaminhos, assinarVideos } from "./imagens";
import type { Contexto, Imagem, ImagemLinha, Projeto, ProjetoResumo, Quadro, QuadroVista, Video, VideoLinha } from "./tipos";

type Supa = Awaited<ReturnType<typeof clienteServidor>>;

const VAZIO: Omit<Contexto, "uid" | "temChave"> = {
  semTabela: true,
  config: { limite_mensal_usd: null, confirmar_antes: false },
  consumo: { totalMes: 0, semDado: 0, geracoes: 0, linhas: [] },
  projetos: [],
};

export async function contexto(): Promise<{ supabase: Supa; ctx: Contexto }> {
  const supabase = await clienteServidor();
  const usuario = await usuarioAtual();
  const base = { uid: usuario?.id ?? "", temChave: temChave() };

  /* a tabela não existe até o Rafael rodar o supabase/ai-studio.sql */
  const sonda = await supabase.from("ai_config").select("owner_id", { head: true, count: "exact" });
  if (sonda.error) return { supabase, ctx: { ...base, ...VAZIO } };

  const [config, consumo, projetos] = await Promise.all([lerConfig(supabase), lerConsumo(supabase), listarProjetos(supabase)]);
  return { supabase, ctx: { ...base, semTabela: false, config, consumo, projetos } };
}

export async function listarProjetos(supabase: Supa): Promise<ProjetoResumo[]> {
  const { data } = await supabase.from("ai_projetos").select("*").order("updated_at", { ascending: false }).returns<Projeto[]>();
  const projetos = data ?? [];
  if (!projetos.length) return [];

  const capas = projetos.map((p) => p.capa_id).filter((c): c is string => Boolean(c));
  const [{ data: linhasCapa }, { data: contagem }] = await Promise.all([
    capas.length
      ? supabase.from("ai_imagens").select("id, miniatura").in("id", capas).is("apagada_em", null)
      : Promise.resolve({ data: [] as { id: string; miniatura: string | null }[] }),
    supabase.from("ai_imagens").select("projeto_id").not("projeto_id", "is", null).eq("status", "pronta").is("apagada_em", null),
  ]);
  const urls = await assinarCaminhos(
    supabase,
    (linhasCapa ?? []).map((l) => l.miniatura).filter((c): c is string => Boolean(c)),
  );
  const capaPorId = new Map((linhasCapa ?? []).map((l) => [l.id, l.miniatura ? (urls[l.miniatura] ?? null) : null]));
  const total = new Map<string, number>();
  for (const c of contagem ?? []) total.set(c.projeto_id, (total.get(c.projeto_id) ?? 0) + 1);

  return projetos.map((p) => ({
    ...p,
    capaUrl: p.capa_id ? (capaPorId.get(p.capa_id) ?? null) : null,
    total: total.get(p.id) ?? 0,
  }));
}

/* A galeria: as imagens prontas e não apagadas, mais novas primeiro. */
export async function galeria(supabase: Supa, filtro: { projeto?: string; limite?: number } = {}): Promise<Imagem[]> {
  let q = supabase
    .from("ai_imagens")
    .select("*")
    .eq("status", "pronta")
    .is("apagada_em", null)
    .order("created_at", { ascending: false })
    .limit(filtro.limite ?? 120);
  if (filtro.projeto) q = q.eq("projeto_id", filtro.projeto);
  const { data } = await q.returns<ImagemLinha[]>();
  return assinar(supabase, data ?? []);
}

export async function imagemPorId(supabase: Supa, id: string): Promise<Imagem | null> {
  const { data } = await supabase.from("ai_imagens").select("*").eq("id", id).is("apagada_em", null).maybeSingle<ImagemLinha>();
  if (!data || data.status !== "pronta") return null;
  const [img] = await assinar(supabase, [data]);
  return img;
}

/* As versões de uma imagem: a raiz e tudo que nasceu dela, na ordem. */
export async function versoes(supabase: Supa, imagem: ImagemLinha): Promise<Imagem[]> {
  const raiz = imagem.raiz_id ?? imagem.id;
  const { data } = await supabase
    .from("ai_imagens")
    .select("*")
    .or(`id.eq.${raiz},raiz_id.eq.${raiz}`)
    .eq("status", "pronta")
    .is("apagada_em", null)
    .order("created_at", { ascending: true })
    .limit(60)
    .returns<ImagemLinha[]>();
  return assinar(supabase, data ?? []);
}

/* A sequência de um projeto: cada quadro com a versão atual e as outras. */
export async function sequencia(supabase: Supa, projetoId: string): Promise<QuadroVista[]> {
  const { data: quadros } = await supabase
    .from("ai_quadros")
    .select("*")
    .eq("projeto_id", projetoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Quadro[]>();
  const lista = quadros ?? [];
  if (!lista.length) return [];

  const ids = lista.map((q) => q.id);
  const atuais = lista.map((q) => q.imagem_id).filter((c): c is string => Boolean(c));
  const filtro = [`quadro_id.in.(${ids.join(",")})`, ...(atuais.length ? [`id.in.(${atuais.join(",")})`] : [])].join(",");
  const { data } = await supabase
    .from("ai_imagens")
    .select("*")
    .or(filtro)
    .eq("status", "pronta")
    .is("apagada_em", null)
    .order("created_at", { ascending: true })
    .returns<ImagemLinha[]>();
  const imagens = await assinar(supabase, data ?? []);
  const porId = new Map(imagens.map((i) => [i.id, i]));

  return lista.map((q) => {
    const atual = q.imagem_id ? (porId.get(q.imagem_id) ?? null) : null;
    const doQuadro = imagens.filter((i) => i.quadro_id === q.id);
    const versoesQ = atual && !doQuadro.some((i) => i.id === atual.id) ? [atual, ...doQuadro] : doQuadro;
    return { ...q, imagem: atual, versoes: versoesQ };
  });
}

/* Os vídeos não apagados, mais novos primeiro (inclui os em andamento). */
export async function listarVideos(supabase: Supa, filtro: { projeto?: string; limite?: number } = {}): Promise<Video[]> {
  let q = supabase
    .from("ai_videos")
    .select("*")
    .is("apagada_em", null)
    .order("created_at", { ascending: false })
    .limit(filtro.limite ?? 60);
  if (filtro.projeto) q = q.eq("projeto_id", filtro.projeto);
  const { data } = await q.returns<VideoLinha[]>();
  return assinarVideos(supabase, data ?? []);
}
