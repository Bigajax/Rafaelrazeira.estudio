/* O lado do servidor do check-in (ver lib/checkin.ts): a chave de serviço
   abre o bucket privado, então nada daqui pode ir para o navegador. */

import { createClient } from "@supabase/supabase-js";
import { BUCKET_CHECKIN, type Checkin } from "./checkin";

export function storageCheckin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, { auth: { persistSession: false } }).storage.from(BUCKET_CHECKIN);
}

export type FotoEnviada = { caminho: string; url: string; nota: string; criada: string };

/* o que já chegou, por categoria, com URL assinada de 1 hora para a miniatura */
export async function listarFotos(c: Checkin): Promise<Record<string, FotoEnviada[]>> {
  const st = storageCheckin();
  const saida: Record<string, FotoEnviada[]> = Object.fromEntries(c.categorias.map((k) => [k.id, []]));
  if (!st) return saida;

  await Promise.all(
    c.categorias.map(async (k) => {
      const pasta = `${c.slug}/${k.id}`;
      const { data } = await st.list(pasta, { limit: 1000, sortBy: { column: "name", order: "asc" } });
      if (!data?.length) return;
      const fotos = data.filter((a) => a.id && !a.name.endsWith(".json"));
      const notas = new Set(data.filter((a) => a.name.endsWith(".json")).map((a) => a.name));
      if (!fotos.length) return;

      const caminhos = fotos.map((a) => `${pasta}/${a.name}`);
      const { data: urls } = await st.createSignedUrls(caminhos, 3600);
      const textos = await Promise.all(
        fotos.map(async (a) => {
          if (!notas.has(`${a.name}.json`)) return "";
          const { data: blob } = await st.download(`${pasta}/${a.name}.json`);
          if (!blob) return "";
          try {
            return String(JSON.parse(await blob.text()).nota ?? "");
          } catch {
            return "";
          }
        }),
      );
      saida[k.id] = fotos.map((a, i) => ({
        caminho: caminhos[i],
        url: urls?.[i]?.signedUrl ?? "",
        nota: textos[i],
        criada: a.created_at ?? "",
      }));
    }),
  );
  return saida;
}

/* O aviso no celular do Rafael quando um lote termina de subir. Mesmos
   canais do lib/push.js (Telegram e ntfy), e nunca derruba a resposta. */
export async function avisarRafael(texto: string) {
  const envios: Promise<unknown>[] = [];
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (token && chat) {
    envios.push(
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(4000),
      }),
    );
  }
  const topico = process.env.NTFY_TOPIC;
  if (topico) {
    const base = (process.env.NTFY_URL || "https://ntfy.sh").replace(/\/+$/, "");
    const cab: Record<string, string> = { "Content-Type": "text/plain; charset=utf-8", Title: "Fotos novas no check-in", Tags: "camera" };
    if (process.env.NTFY_TOKEN) cab.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
    envios.push(fetch(`${base}/${encodeURIComponent(topico)}`, { method: "POST", headers: cab, body: texto, signal: AbortSignal.timeout(4000) }));
  }
  await Promise.allSettled(envios);
}
