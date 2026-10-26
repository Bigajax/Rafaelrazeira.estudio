import fs from "node:fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
for (const l of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) { if (!l.includes("=") || l.startsWith("#")) continue; const i = l.indexOf("="); process.env[l.slice(0, i).trim()] ??= l.slice(i + 1).trim().replace(/^["']|["']$/g, ""); }
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const [id, capaArq, extraArq] = process.argv.slice(2);
const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
/* a mesma conta de lib/marketing/paleta.ts, com o sharp no lugar do canvas */
async function cores(buf: Buffer, quantas = 4) {
  const { data } = await sharp(buf).resize(80, 100, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const baldes = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let k = 0; k < data.length; k += 3) { const [r, g, b] = [data[k], data[k + 1], data[k + 2]]; const c = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4); const x = baldes.get(c) ?? { n: 0, r: 0, g: 0, b: 0 }; x.n++; x.r += r; x.g += g; x.b += b; baldes.set(c, x); }
  const cs = [...baldes.values()].map((x) => { const [r, g, b] = [x.r / x.n, x.g / x.n, x.b / x.n]; const max = Math.max(r, g, b), min = Math.min(r, g, b); return { r, g, b, n: x.n, sat: max ? (max - min) / max : 0, luz: max / 255 }; });
  const dist = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
  const porArea = [...cs].sort((a, b) => b.n - a.n);
  const esc = [porArea.find((x) => x.luz > 0.12 && !(x.sat < 0.08 && x.luz > 0.9)) ?? porArea[0]];
  for (const x of [...cs].sort((a, b) => b.n * b.sat ** 3 - a.n * a.sat ** 3)) { if (esc.length >= quantas) break; if (x.luz < 0.3 || x.sat < 0.45) continue; if (esc.every((e) => dist(e, x) > 150)) esc.push(x); }
  for (const x of [{ r: 17, g: 17, b: 17 }, { r: 242, g: 239, b: 230 }]) if (esc.length < quantas && esc.every((e) => dist(e, x) > 150)) esc.push(x as never);
  return esc.map((x) => hex(x.r, x.g, x.b));
}
async function subir(arq: string, nome: string) {
  const buf = fs.readFileSync(arq);
  const webp = await sharp(buf).resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
  const caminho = `${id}/${nome}-${Date.now()}.webp`;
  const up = await sb.storage.from("marketing").upload(caminho, webp, { contentType: "image/webp" });
  if (up.error) throw new Error(up.error.message);
  return { caminho, buf, kb: Math.round(webp.length / 1024) };
}
(async () => {
  const { data: p } = await sb.from("mkt_pecas").select("estilo, fundo").eq("id", id).single();
  const capa = await subir(capaArq, "fundo");
  const extras = [...(p!.estilo.extras ?? [])];
  let extra: Awaited<ReturnType<typeof subir>> | null = null;
  if (extraArq) { extra = await subir(extraArq, "serie-2"); extras[0] = { ...extras[0], caminho: extra.caminho }; }
  const paleta = await cores(capa.buf);
  const { error } = await sb.from("mkt_pecas").update({ fundo: capa.caminho, estilo: { ...p!.estilo, extras, paleta, usarPaleta: true }, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  if (p!.fundo) await sb.storage.from("marketing").remove([p!.fundo]);
  console.log("capa", capa.caminho, capa.kb + "KB", "| extra", extra?.caminho, extra?.kb + "KB", "| paleta", paleta.join(" "));
})().catch((e) => { console.error("ERRO", e.message); process.exit(1); });
