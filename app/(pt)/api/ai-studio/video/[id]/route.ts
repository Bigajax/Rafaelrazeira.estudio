/* ============================================================
   /api/ai-studio/video/<id> — o ANDAMENTO de um vídeo

   GET devolve a linha. Enquanto ela está pendente, consulta o job no
   OpenRouter e atualiza o status. Quando o OpenRouter diz `completed`,
   quem chegar primeiro "pega" o download (a linha vai para `baixando` só
   se ainda não estava), baixa o MP4, guarda no bucket privado e grava o
   custo REAL (`usage.cost`). Uma segunda consulta no meio do download só
   ouve "baixando". Um download que morreu (mais de 5 min em `baixando`)
   pode ser pego de novo.

   Falha ao CONSULTAR não mata o vídeo: o job segue no OpenRouter, e a
   próxima consulta tenta de novo.
   ============================================================ */
import { NextResponse } from "next/server";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { baixarVideo, consultarVideo, traduzirErro } from "@/lib/ai-studio/openrouter";
import { custoReal } from "@/lib/ai-studio/precos";
import { assinarVideos, gravarVideo } from "@/lib/ai-studio/imagens";
import type { VideoLinha } from "@/lib/ai-studio/tipos";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const DOWNLOAD_MORTO_MS = 5 * 60 * 1000;

type Linha = VideoLinha & { baixando_em: string | null };

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ ok: false, erro: "Sessão expirada." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ ok: false, erro: "Vídeo inválido." }, { status: 400 });

  const supabase = await clienteServidor();
  const ler = async () => (await supabase.from("ai_videos").select("*").eq("id", id).maybeSingle<Linha>()).data;
  const responder = async (v: VideoLinha) => NextResponse.json({ ok: true, video: (await assinarVideos(supabase, [v]))[0] });

  const v = await ler();
  if (!v) return NextResponse.json({ ok: false, erro: "O vídeo não existe." }, { status: 404 });
  const downloadVivo =
    v.status === "baixando" && v.baixando_em !== null && Date.now() - new Date(v.baixando_em).getTime() < DOWNLOAD_MORTO_MS;
  if (v.status === "pronta" || v.status === "falhou" || !v.job_id || downloadVivo) return responder(v);

  try {
    const job = await consultarVideo(v.job_id);
    if (job.status === "pending" || job.status === "in_progress") {
      const status = job.status === "in_progress" ? "gerando" : "pendente";
      if (status !== v.status) await supabase.from("ai_videos").update({ status }).eq("id", id);
      return responder({ ...v, status });
    }
    if (job.status !== "completed") {
      const motivo =
        job.status === "expired"
          ? "O trabalho expirou no OpenRouter antes de terminar."
          : job.status === "cancelled"
            ? "O trabalho foi cancelado no OpenRouter."
            : `A geração falhou: ${job.error ?? "o provedor não disse o motivo"}.`;
      await supabase.from("ai_videos").update({ status: "falhou", erro: motivo, custo_usd: custoReal(job.usage) }).eq("id", id);
      return responder({ ...v, status: "falhou", erro: motivo });
    }

    /* completed: pega o download só se ninguém pegou */
    const { data: pego } = await supabase
      .from("ai_videos")
      .update({ status: "baixando", baixando_em: new Date().toISOString() })
      .eq("id", id)
      .in("status", v.status === "baixando" ? ["baixando"] : ["pendente", "gerando"])
      .select("id");
    if (!pego?.length) return responder((await ler()) ?? v);

    const buffer = await baixarVideo(v.job_id, job.unsigned_urls?.[0]);
    const caminho = await gravarVideo(supabase, usuario.id, id, buffer);
    const { data: pronto } = await supabase
      .from("ai_videos")
      .update({
        status: "pronta",
        caminho,
        bytes: buffer.length,
        custo_usd: custoReal(job.usage),
        concluido_em: new Date().toISOString(),
        erro: null,
      })
      .eq("id", id)
      .select("*")
      .single<VideoLinha>();
    return responder(pronto ?? v);
  } catch (e) {
    const t = traduzirErro(e);
    if ((await ler())?.status === "baixando") {
      await supabase.from("ai_videos").update({ status: "gerando", erro: t.frase }).eq("id", id);
    }
    const [video] = await assinarVideos(supabase, [v]);
    return NextResponse.json({ ok: false, erro: t.frase, video });
  }
}
