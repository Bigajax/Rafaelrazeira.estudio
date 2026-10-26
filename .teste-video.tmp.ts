/* Teste de ponta a ponta do vídeo, pelo servidor, com as MESMAS funções
   da rota (lib/ai-studio). Usa a service role só para gravar a linha no
   dono do CRM (CRM_OWNER_ID), já que aqui não há cookie de sessão.
   Arquivo temporário: apagar depois. */
import { createClient } from "@supabase/supabase-js";
import { criarVideo, consultarVideo, baixarVideo } from "./lib/ai-studio/openrouter";
import { estimativaVideo, custoReal } from "./lib/ai-studio/precos";
import { BUCKET } from "./lib/ai-studio/tipos";

const dono = process.env.CRM_OWNER_ID!;
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const p = {
  modelo: "google/veo-3.1-lite",
  resolucao: "720p",
  proporcao: "16:9",
  duracao: 4,
  audio: false,
  prompt:
    "Close cinematográfico de uma lata de energético gelada sobre um balcão de mármore escuro, gotas de condensação escorrendo, luz lateral fria, a câmera se aproxima lentamente.",
};

async function main() {
  const est = estimativaVideo(p.modelo, p.resolucao, p.duracao, p.audio);
  console.log("estimativa:", est);
  const { data: linha, error } = await sb
    .from("ai_videos")
    .insert({ owner_id: dono, prompt: p.prompt, prompt_final: p.prompt, modelo: p.modelo, resolucao: p.resolucao, proporcao: p.proporcao, duracao: p.duracao, audio: p.audio, estimativa_usd: est, status: "pendente" })
    .select("id")
    .single();
  if (error || !linha) throw new Error("insert: " + error?.message);
  console.log("linha:", linha.id);

  const t0 = Date.now();
  const { id: job } = await criarVideo({ ...p, primeiro: null, ultimo: null, referencias: [] });
  await sb.from("ai_videos").update({ job_id: job }).eq("id", linha.id);
  console.log("job:", job);

  for (;;) {
    await new Promise((r) => setTimeout(r, 10_000));
    const st = await consultarVideo(job);
    console.log(`${Math.round((Date.now() - t0) / 1000)}s`, st.status);
    if (st.status === "pending" || st.status === "in_progress") {
      await sb.from("ai_videos").update({ status: st.status === "in_progress" ? "gerando" : "pendente" }).eq("id", linha.id);
      continue;
    }
    if (st.status !== "completed") {
      await sb.from("ai_videos").update({ status: "falhou", erro: st.error ?? st.status }).eq("id", linha.id);
      throw new Error("falhou: " + (st.error ?? st.status));
    }
    const buf = await baixarVideo(job, st.unsigned_urls?.[0]);
    console.log("baixado:", (buf.length / 1048576).toFixed(2), "MB", "| cabeçalho mp4:", buf.subarray(4, 8).toString());
    const caminho = `${dono}/video/${linha.id}.mp4`;
    const up = await sb.storage.from(BUCKET).upload(caminho, buf, { contentType: "video/mp4", upsert: true });
    if (up.error) throw new Error("upload: " + up.error.message);
    const custo = custoReal(st.usage);
    await sb.from("ai_videos").update({ status: "pronta", caminho, bytes: buf.length, custo_usd: custo, concluido_em: new Date().toISOString() }).eq("id", linha.id);
    console.log("PRONTO. custo real:", custo, "| usage:", JSON.stringify(st.usage), "| tempo:", Math.round((Date.now() - t0) / 1000), "s");
    break;
  }
}
main().catch((e) => {
  console.error("ERRO:", e instanceof Error ? e.message : e);
  process.exit(1);
});
