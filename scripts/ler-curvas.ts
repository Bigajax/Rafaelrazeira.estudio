/* ============================================================
   LER AS CURVAS: ONDE CADA VÍDEO PERDE GENTE (19/10/2026)

   A fase 3 do docs/plano-performance-criativos.md. Para cada anúncio de vídeo
   com pelo menos 500 impressões na vida:
   - a curva de retenção da Meta (video_play_curve_actions), a mesma que em
     01/10 foi lida à mão no Insights do h27u;
   - uma faixa com um quadro por segundo do vídeo, para ver o que estava na
     tela quando a curva caiu (o `fps=1,tile` que se fazia à mão).
   O vídeo é baixado uma vez só: a faixa não muda, a curva sim. --refazer
   baixa de novo.

   USO:
     npx tsx scripts/ler-curvas.ts                (só mostra)
     npx tsx scripts/ler-curvas.ts --gravar
     npx tsx scripts/ler-curvas.ts --gravar --refazer

   Uma vez por semana basta: a curva muda devagar.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function carregarEnv() {
  const arquivo = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    const chave = linha.slice(0, i).trim();
    if (!process.env[chave]) process.env[chave] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const GRAPH = "https://graph.facebook.com/v21.0";
const FFMPEG = path.resolve(process.cwd(), "node_modules/ffmpeg-static/ffmpeg.exe");
const PISO = 500;

async function graph<T>(caminho: string, parametros: Record<string, string>, token: string): Promise<T> {
  const u = new URL(caminho.startsWith("http") ? caminho : `${GRAPH}/${caminho}`);
  for (const [k, v] of Object.entries(parametros)) u.searchParams.set(k, v);
  u.searchParams.set("access_token", token);
  const j = await (await fetch(u)).json();
  if (j.error) throw new Error(`Meta: ${j.error.message}`);
  return j as T;
}

async function principal() {
  carregarEnv();
  const token = process.env.META_ADS_TOKEN ?? "";
  const conta = process.env.META_AD_ACCOUNT_ID ?? "";
  const dono = process.env.CRM_OWNER_ID ?? "";
  const banco = { url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, ""), chave: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" };
  if (!token || !conta) throw new Error("Falta META_ADS_TOKEN ou META_AD_ACCOUNT_ID no .env.local.");
  const gravar = process.argv.includes("--gravar");
  const refazer = process.argv.includes("--refazer");
  if (gravar && (!banco.url || !banco.chave || !dono)) throw new Error("Para gravar: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e CRM_OWNER_ID.");
  if (!fs.existsSync(FFMPEG)) throw new Error(`ffmpeg não encontrado em ${FFMPEG} (npm i ffmpeg-static).`);
  const cabecalho = { apikey: banco.chave, Authorization: `Bearer ${banco.chave}` };

  /* 1. as curvas de todos os anúncios, numa leitura só */
  type Linha = { ad_id: string; ad_name: string; impressions: string; video_play_curve_actions?: { action_type: string; value: number[] }[] };
  let pagina = await graph<{ data: Linha[]; paging?: { next?: string } }>(
    `${conta}/insights`,
    { level: "ad", date_preset: "maximum", fields: "ad_id,ad_name,impressions,video_play_curve_actions", limit: "200" },
    token,
  );
  const linhas = [...pagina.data];
  while (pagina.paging?.next) {
    pagina = await graph(pagina.paging.next, {}, token);
    linhas.push(...pagina.data);
  }
  const comCurva = linhas.filter((l) => Number(l.impressions) >= PISO && l.video_play_curve_actions?.[0]?.value?.length);
  console.log(`${linhas.length} anúncios com dado, ${comCurva.length} de vídeo com ${PISO}+ impressões.`);

  /* quais já têm a faixa de quadros gravada */
  const jaTem = new Set<string>();
  if (gravar && !refazer) {
    const r = await fetch(`${banco.url}/rest/v1/ads_curvas?select=ad_id&folha=not.is.null`, { headers: cabecalho });
    if (r.ok) for (const x of (await r.json()) as { ad_id: string }[]) jaTem.add(x.ad_id);
  }

  const pasta = path.join(process.cwd(), "tmp", "curvas");
  fs.mkdirSync(pasta, { recursive: true });
  const gravadas: object[] = [];

  for (const l of comCurva) {
    const curva = l.video_play_curve_actions![0].value;
    let folha: string | undefined;
    let duracao: number | null = null;
    try {
      const ad = await graph<{ creative?: { video_id?: string; object_story_spec?: { video_data?: { video_id?: string } } } }>(
        l.ad_id,
        { fields: "creative{video_id,object_story_spec{video_data{video_id}}}" },
        token,
      );
      const videoId = ad.creative?.object_story_spec?.video_data?.video_id ?? ad.creative?.video_id;
      if (videoId) {
        const v = await graph<{ source?: string; length?: number }>(videoId, { fields: "source,length" }, token);
        duracao = v.length ?? null;
        if (v.source && !jaTem.has(l.ad_id)) {
          const mp4 = path.join(pasta, `${l.ad_id}.mp4`);
          const jpg = path.join(pasta, `${l.ad_id}.jpg`);
          fs.writeFileSync(mp4, Buffer.from(await (await fetch(v.source)).arrayBuffer()));
          const n = Math.min(60, Math.max(1, Math.ceil(v.length ?? 30)));
          // um quadro por segundo, 96 px de largura, todos numa fileira só
          execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", mp4, "-vf", `fps=1,scale=96:-2,tile=${n}x1`, "-frames:v", "1", "-q:v", "7", jpg]);
          folha = `data:image/jpeg;base64,${fs.readFileSync(jpg).toString("base64")}`;
          fs.rmSync(mp4);
        }
      }
    } catch (e) {
      console.log(`  ${l.ad_name}: sem quadros (${e instanceof Error ? e.message : e})`);
    }
    const queda3s = curva[3] != null ? `${curva[3]}% no 3º segundo` : "";
    console.log(`  ${l.ad_name.slice(0, 36).padEnd(36)} ${String(l.impressions).padStart(6)} imp  ${queda3s}${folha ? `, faixa ${Math.round(folha.length / 1024)} KB` : jaTem.has(l.ad_id) ? ", faixa já gravada" : ""}`);
    gravadas.push({ owner_id: dono, ad_id: l.ad_id, curva, duracao, ...(folha ? { folha } : {}), lido_em: new Date().toISOString() });
  }

  if (!gravar) {
    console.log("\n(só mostrou; com --gravar vai para o CRM)");
    return;
  }
  // upsert linha a linha: as que não trouxeram faixa nova não apagam a que já existe
  for (const linha of gravadas) {
    const r = await fetch(`${banco.url}/rest/v1/ads_curvas?on_conflict=owner_id,ad_id`, {
      method: "POST",
      headers: { ...cabecalho, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(linha),
    });
    if (!r.ok) throw new Error(`Não gravou (${r.status}): ${await r.text()}. Rodou a parte da fase 3 do supabase/ads-criativos.sql?`);
  }
  console.log(`\nGravado: ${gravadas.length} curvas.`);
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
