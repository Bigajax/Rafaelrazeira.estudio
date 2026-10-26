/* ============================================================
   /api/ai-studio/video — o PEDIDO de vídeo

   O vídeo é assíncrono no OpenRouter: esta rota valida, confere as
   travas, manda o pedido e devolve na hora a linha `pendente` com o job.
   Quem acompanha é a tela, perguntando a /api/ai-studio/video/<id>, que
   consulta o OpenRouter e, quando fica pronto, guarda o MP4 no bucket.

   As imagens viram primeiro/último quadro (`frame_images`) ou referência
   solta (`input_references`, só onde o modelo tem), sempre por link
   assinado de 10 minutos do bucket privado.
   ============================================================ */
import { NextResponse } from "next/server";
import { z } from "zod";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { FUNCOES, PROMPT_MAX, modeloVideo } from "@/lib/ai-studio/modelos";
import { criarVideo, temChave, traduzirErro } from "@/lib/ai-studio/openrouter";
import { estimativaVideo } from "@/lib/ai-studio/precos";
import { conferirTravas } from "@/lib/ai-studio/orcamento";
import { assinarVideos, caminhoDoDono, linkParaProvedor } from "@/lib/ai-studio/imagens";
import type { VideoLinha } from "@/lib/ai-studio/tipos";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const Corpo = z.object({
  chave: z.uuid(),
  prompt: z.string().max(PROMPT_MAX),
  modelo: z.string().max(80),
  resolucao: z.string().max(6),
  proporcao: z.string().max(6),
  duracao: z.number().int().min(1).max(30),
  audio: z.boolean(),
  primeiro_id: z.uuid().nullish(),
  ultimo_id: z.uuid().nullish(),
  referencias: z
    .array(
      z.object({
        caminho: z.string().max(300),
        funcao: z.enum(["produto", "estilo", "composicao", "personagem", "cenario", "geral"]),
      }),
    )
    .max(16)
    .default([]),
  projeto_id: z.uuid().nullish(),
});

function erro(status: number, frase: string) {
  return NextResponse.json({ ok: false, erro: frase }, { status });
}

export async function POST(pedido: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return erro(401, "Sessão expirada. Entre de novo no CRM.");

  let corpo: z.infer<typeof Corpo>;
  try {
    const lido = Corpo.safeParse(await pedido.json());
    if (!lido.success) return erro(400, "Pedido com parâmetros inválidos.");
    corpo = lido.data;
  } catch {
    return erro(400, "Pedido sem corpo.");
  }
  if (!temChave()) return erro(503, "Configure a chave do OpenRouter (OPENROUTER_API_KEY) para gerar.");

  /* ---------- os parâmetros, contra o catálogo ---------- */
  const m = modeloVideo(corpo.modelo);
  if (!m) return erro(400, "Modelo de vídeo desconhecido.");
  if (!m.resolucoes.includes(corpo.resolucao)) return erro(400, `O ${m.curto} não faz ${corpo.resolucao}.`);
  if (!m.proporcoes.includes(corpo.proporcao)) return erro(400, `O ${m.curto} não faz ${corpo.proporcao}.`);
  if (!m.duracoes.includes(corpo.duracao)) return erro(400, `O ${m.curto} não faz clipes de ${corpo.duracao} s.`);
  if (corpo.ultimo_id && !m.quadros.includes("last_frame")) return erro(400, `O ${m.curto} não aceita último quadro.`);
  if (corpo.referencias.length > m.referencias) {
    return erro(
      400,
      m.referencias
        ? `O ${m.curto} aceita até ${m.referencias} referências.`
        : `O ${m.curto} não aceita referência solta: use o primeiro e o último quadro.`,
    );
  }
  const prompt = corpo.prompt.trim();
  if (!prompt) return erro(400, "Descreva a cena antes de gerar.");

  const uid = usuario.id;
  for (const r of corpo.referencias) if (!caminhoDoDono(uid, r.caminho)) return erro(400, "Uma das referências não é sua.");

  const supabase = await clienteServidor();

  /* as imagens dos quadros, que já são do dono (RLS) */
  const ids = [corpo.primeiro_id, corpo.ultimo_id].filter((x): x is string => Boolean(x));
  const caminhoDe = new Map<string, string>();
  if (ids.length) {
    const { data } = await supabase.from("ai_imagens").select("id, caminho").in("id", ids).is("apagada_em", null);
    for (const d of data ?? []) if (d.caminho) caminhoDe.set(d.id, d.caminho);
    if (ids.some((i) => !caminhoDe.has(i))) return erro(404, "Uma das imagens de quadro não existe mais.");
  }

  const audio = corpo.audio && m.audio;
  const estimativa = estimativaVideo(m.id, corpo.resolucao, corpo.duracao, audio);
  const trava = await conferirTravas(supabase, estimativa, "video");
  if (trava) return erro(trava.status, trava.frase);

  /* as referências soltas ganham a função no fim do prompt */
  const promptFinal = corpo.referencias.length
    ? `${prompt}\n\nREFERÊNCIAS:\n${corpo.referencias.map((r, i) => `- Referência ${i + 1}: ${FUNCOES[r.funcao].instrucao}.`).join("\n")}`
    : prompt;

  const { data: linha, error: errInsert } = await supabase
    .from("ai_videos")
    .insert({
      chave: corpo.chave,
      projeto_id: corpo.projeto_id ?? null,
      prompt,
      prompt_final: promptFinal,
      modelo: m.id,
      resolucao: corpo.resolucao,
      proporcao: corpo.proporcao,
      duracao: corpo.duracao,
      audio,
      primeiro_id: corpo.primeiro_id ?? null,
      ultimo_id: corpo.ultimo_id ?? null,
      referencias: corpo.referencias,
      estimativa_usd: estimativa,
      status: "pendente",
    })
    .select("id")
    .single();
  if (errInsert || !linha) {
    if (errInsert?.code === "23505") return erro(409, "Este pedido já foi enviado.");
    return erro(500, "Não consegui registrar o pedido. Confira se o supabase/ai-studio.sql foi rodado.");
  }

  try {
    const link = (id?: string | null) => (id ? linkParaProvedor(supabase, caminhoDe.get(id) as string) : Promise.resolve(null));
    const [primeiro, ultimo, ...refs] = await Promise.all([
      link(corpo.primeiro_id),
      link(corpo.ultimo_id),
      ...corpo.referencias.map((r) => linkParaProvedor(supabase, r.caminho)),
    ]);
    const { id: jobId } = await criarVideo({
      modelo: m.id,
      prompt: promptFinal,
      resolucao: corpo.resolucao,
      proporcao: corpo.proporcao,
      duracao: corpo.duracao,
      audio,
      primeiro,
      ultimo,
      referencias: refs.filter((x): x is string => Boolean(x)),
    });
    const { data: atual } = await supabase
      .from("ai_videos")
      .update({ job_id: jobId })
      .eq("id", linha.id)
      .select("*")
      .single<VideoLinha>();
    const [video] = await assinarVideos(supabase, atual ? [atual] : []);
    return NextResponse.json({ ok: true, video });
  } catch (e) {
    const t = traduzirErro(e);
    await supabase.from("ai_videos").update({ status: "falhou", erro: t.frase }).eq("id", linha.id);
    return erro(t.status, t.frase);
  }
}
