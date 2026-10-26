/* ============================================================
   AS TRAVAS ANTES DE GASTAR: limite mensal, ritmo e envio duplicado

   Tudo conferido no banco, na rota, antes de chamar o OpenRouter. Nada
   disso substitui o limite de crédito da conta do OpenRouter: este é o
   limite do APP, que só vale para o que passa por aqui.

   - LIMITE MENSAL: soma o `custo_usd` (o custo real que o OpenRouter
     devolve) das imagens e dos vídeos do mês, no horário de Brasília.
     Quando há estimativa prévia (o Veo), o pedido que estouraria o limite
     já é barrado; quando não há, barra a partir do momento em que o gasto
     já passou. Vídeo em andamento ainda não entra na soma.
   - RITMO: no máximo 8 pedidos por minuto, 2 imagens e 3 vídeos ao mesmo
     tempo, para um clique nervoso não virar oito cobranças. Um clipe 4K
     do Veo custa US$ 4,80.
   - PRESO: uma linha `gerando` com mais de 6 minutos morreu no caminho (a
     rota tem 300 s). Ela vira `falhou` antes da contagem, senão travava o
     estúdio para sempre. É a mesma ideia do colheitaEmCurso() da oficina.
   ============================================================ */
import type { clienteServidor } from "@/lib/crm/supabase";
import type { Config, Consumo, LinhaConsumo } from "./tipos";

type Supa = Awaited<ReturnType<typeof clienteServidor>>;

const POR_MINUTO = 8;
const AO_MESMO_TEMPO = 2;
const PRESO_MS = 6 * 60 * 1000;
const VIDEOS_AO_MESMO_TEMPO = 3;
const VIDEO_VAGA_MS = 30 * 60 * 1000;

/* O primeiro instante do mês em Brasília, como ISO. */
export function inicioDoMes(agora = new Date()): string {
  const br = new Date(agora.getTime() - 3 * 3600 * 1000);
  const ano = br.getUTCFullYear();
  const mes = String(br.getUTCMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}-01T00:00:00-03:00`;
}

export async function lerConfig(supabase: Supa): Promise<Config> {
  const { data } = await supabase.from("ai_config").select("limite_mensal_usd, confirmar_antes").maybeSingle();
  return {
    limite_mensal_usd: data?.limite_mensal_usd === null || data?.limite_mensal_usd === undefined ? null : Number(data.limite_mensal_usd),
    confirmar_antes: Boolean(data?.confirmar_antes),
  };
}

/* O consumo do mês: as imagens e os vídeos, mais novos primeiro. Conta
   o que ficou pronto; o vídeo em andamento ainda não tem custo. */
export async function lerConsumo(supabase: Supa): Promise<Consumo> {
  const desde = inicioDoMes();
  const [{ data: imgs }, { data: vids }] = await Promise.all([
    supabase
      .from("ai_imagens")
      .select("id, created_at, modelo, qualidade, tamanho_pedido, largura, altura, custo_usd")
      .neq("origem", "upload")
      .eq("status", "pronta")
      .gte("created_at", desde)
      .limit(500),
    supabase
      .from("ai_videos")
      .select("id, created_at, modelo, resolucao, proporcao, duracao, custo_usd")
      .eq("status", "pronta")
      .gte("created_at", desde)
      .limit(500),
  ]);
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const linhas: LinhaConsumo[] = [
    ...(imgs ?? []).map((l) => ({
      id: l.id,
      tipo: "imagem" as const,
      created_at: l.created_at,
      modelo: l.modelo,
      detalhe: [l.qualidade, l.largura && l.altura ? `${l.largura}×${l.altura}` : l.tamanho_pedido].filter(Boolean).join(" · "),
      custo_usd: num(l.custo_usd),
    })),
    ...(vids ?? []).map((l) => ({
      id: l.id,
      tipo: "video" as const,
      created_at: l.created_at,
      modelo: l.modelo,
      detalhe: [l.resolucao, l.proporcao, l.duracao ? `${l.duracao} s` : null].filter(Boolean).join(" · "),
      custo_usd: num(l.custo_usd),
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  let totalMes = 0;
  let semDado = 0;
  for (const l of linhas) {
    if (l.custo_usd === null) semDado++;
    else totalMes += l.custo_usd;
  }
  return { totalMes, semDado, geracoes: linhas.length, linhas };
}

/* null = pode gerar; texto = o motivo, para a tela. */
export async function conferirTravas(
  supabase: Supa,
  estimativa: number | null,
  tipo: "imagem" | "video" = "imagem",
): Promise<{ status: number; frase: string } | null> {
  const agora = Date.now();

  await supabase
    .from("ai_imagens")
    .update({ status: "falhou", erro: "A geração não terminou a tempo." })
    .eq("status", "gerando")
    .lt("created_at", new Date(agora - PRESO_MS).toISOString());

  const umMinuto = new Date(agora - 60_000).toISOString();
  const [{ count: imgsEmCurso }, { count: vidsEmCurso }, { count: imgsMinuto }, { count: vidsMinuto }] = await Promise.all([
    supabase.from("ai_imagens").select("id", { count: "exact", head: true }).eq("status", "gerando"),
    /* vídeo leva minutos; um job com mais de 30 min parado não segura a vaga */
    supabase
      .from("ai_videos")
      .select("id", { count: "exact", head: true })
      .in("status", ["pendente", "gerando", "baixando"])
      .gte("created_at", new Date(agora - VIDEO_VAGA_MS).toISOString()),
    supabase.from("ai_imagens").select("id", { count: "exact", head: true }).neq("origem", "upload").gte("created_at", umMinuto),
    supabase.from("ai_videos").select("id", { count: "exact", head: true }).gte("created_at", umMinuto),
  ]);
  if (tipo === "imagem" && (imgsEmCurso ?? 0) >= AO_MESMO_TEMPO) {
    return { status: 429, frase: `Já há ${imgsEmCurso} imagens sendo criadas. Espere uma terminar.` };
  }
  if (tipo === "video" && (vidsEmCurso ?? 0) >= VIDEOS_AO_MESMO_TEMPO) {
    return { status: 429, frase: `Já há ${vidsEmCurso} vídeos sendo gerados. Espere um terminar.` };
  }
  if ((imgsMinuto ?? 0) + (vidsMinuto ?? 0) >= POR_MINUTO) {
    return { status: 429, frase: `O estúdio limita a ${POR_MINUTO} pedidos por minuto. Espere um pouco.` };
  }

  const config = await lerConfig(supabase);
  if (config.limite_mensal_usd !== null) {
    const { totalMes } = await lerConsumo(supabase);
    const limite = config.limite_mensal_usd;
    if (totalMes >= limite) {
      return {
        status: 402,
        frase: `O limite mensal do estúdio (US$ ${limite.toFixed(2)}) foi atingido: o mês já soma US$ ${totalMes.toFixed(3)}. Aumente o limite em Consumo de IA para continuar.`,
      };
    }
    if (estimativa !== null && totalMes + estimativa > limite) {
      return {
        status: 402,
        frase: `Esta geração (cerca de US$ ${estimativa.toFixed(3)}) passaria do limite mensal de US$ ${limite.toFixed(2)}.`,
      };
    }
  }
  return null;
}
