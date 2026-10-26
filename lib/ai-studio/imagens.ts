/* ============================================================
   OS ARQUIVOS NO BUCKET PRIVADO `ai-studio` — só no servidor

   Toda leitura e escrita usa o cliente da SESSÃO (chave anônima + cookie),
   então quem confere a pasta do dono são as policies do storage, não este
   código. Os caminhos:
     <uid>/original/<id>.<png|jpeg|webp>   a imagem como o OpenRouter devolveu
     <uid>/mini/<id>.webp                  a miniatura da galeria (768 px)
     <uid>/ref/<uuid>.webp                 referência que o navegador subiu
     <uid>/entrada/<uuid>.<ext>            foto que o Rafael subiu para editar
     <uid>/video/<id>.mp4                  o vídeo como o OpenRouter devolveu

   A miniatura existe para a galeria não baixar um PNG 4K por quadradinho.
   O original fica intacto para o download.
   ============================================================ */
import sharp from "sharp";
import type { clienteServidor } from "@/lib/crm/supabase";
import { BUCKET, type Imagem, type ImagemLinha, type Video, type VideoLinha } from "./tipos";

type Supa = Awaited<ReturnType<typeof clienteServidor>>;

const MIME: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", jpg: "image/jpeg", webp: "image/webp" };

export function mimeDoCaminho(caminho: string): string {
  return MIME[caminho.split(".").pop()?.toLowerCase() ?? ""] ?? "image/png";
}

/* O caminho veio do navegador: só vale dentro da pasta do dono. */
export function caminhoDoDono(uid: string, caminho: string): boolean {
  return caminho.startsWith(`${uid}/`) && !caminho.includes("..") && /^[\w\-/.]+$/.test(caminho);
}

export async function baixar(supabase: Supa, caminho: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(caminho);
  if (error || !data) throw new Error("Não achei uma das imagens no armazenamento. Tire-a e suba de novo.");
  return Buffer.from(await data.arrayBuffer());
}

/* Grava o original e a miniatura, e devolve as dimensões reais. */
export async function gravarResultado(
  supabase: Supa,
  uid: string,
  id: string,
  buffer: Buffer,
  mime: string,
): Promise<{ caminho: string; miniatura: string; formato: string; largura: number | null; altura: number | null }> {
  const ext = mime === "image/jpeg" ? "jpeg" : mime === "image/webp" ? "webp" : "png";
  const caminho = `${uid}/original/${id}.${ext}`;
  const miniatura = `${uid}/mini/${id}.webp`;

  const meta = await sharp(buffer).metadata();
  const mini = await sharp(buffer).resize(768, 768, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();

  const a = await supabase.storage.from(BUCKET).upload(caminho, buffer, { contentType: MIME[ext], upsert: true });
  if (a.error) throw new Error("A imagem foi gerada, mas não consegui guardá-la. Confira se o supabase/ai-studio.sql foi rodado.");
  const b = await supabase.storage.from(BUCKET).upload(miniatura, mini, { contentType: "image/webp", upsert: true });
  if (b.error) throw new Error("Guardei a imagem, mas não a miniatura.");

  return { caminho, miniatura, formato: ext, largura: meta.width ?? null, altura: meta.height ?? null };
}

/* Os endereços assinados de uma leva de imagens, numa chamada só. */
export async function assinar(supabase: Supa, linhas: ImagemLinha[]): Promise<Imagem[]> {
  const caminhos = [...new Set(linhas.flatMap((l) => [l.caminho, l.miniatura]).filter((c): c is string => Boolean(c)))];
  const urls = new Map<string, string>();
  if (caminhos.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(caminhos, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  }
  return linhas.map((l) => ({
    ...l,
    url: l.caminho ? (urls.get(l.caminho) ?? null) : null,
    urlMini: l.miniatura ? (urls.get(l.miniatura) ?? null) : l.caminho ? (urls.get(l.caminho) ?? null) : null,
  }));
}

export async function assinarCaminhos(supabase: Supa, caminhos: string[]): Promise<Record<string, string>> {
  const fora: Record<string, string> = {};
  if (!caminhos.length) return fora;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls([...new Set(caminhos)], 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) fora[d.path] = d.signedUrl;
  return fora;
}

/* Link curto para o OpenRouter baixar uma imagem de entrada. Dez minutos
   bastam: ele baixa no começo do pedido. */
export async function linkParaProvedor(supabase: Supa, caminho: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 600);
  if (error || !data) throw new Error("Não achei uma das imagens no armazenamento. Tire-a e suba de novo.");
  return data.signedUrl;
}

export async function gravarVideo(supabase: Supa, uid: string, id: string, buffer: Buffer): Promise<string> {
  const caminho = `${uid}/video/${id}.mp4`;
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, buffer, { contentType: "video/mp4", upsert: true });
  if (error) {
    throw new Error(
      `O vídeo ficou pronto, mas não coube no armazenamento (${Math.round(buffer.length / 1048576)} MB). Suba o limite em Supabase → Storage → Settings.`,
    );
  }
  return caminho;
}

/* Os vídeos com o link assinado e a miniatura do primeiro quadro. */
export async function assinarVideos(supabase: Supa, linhas: VideoLinha[]): Promise<Video[]> {
  const quadros = [...new Set(linhas.map((l) => l.primeiro_id).filter((c): c is string => Boolean(c)))];
  const minis = new Map<string, string>();
  if (quadros.length) {
    const { data } = await supabase.from("ai_imagens").select("id, miniatura").in("id", quadros);
    for (const d of data ?? []) if (d.miniatura) minis.set(d.id, d.miniatura);
  }
  const caminhos = [...linhas.map((l) => l.caminho), ...minis.values()].filter((c): c is string => Boolean(c));
  const urls = await assinarCaminhos(supabase, caminhos);
  return linhas.map((l) => {
    const mini = l.primeiro_id ? minis.get(l.primeiro_id) : undefined;
    return { ...l, url: l.caminho ? (urls[l.caminho] ?? null) : null, poster: mini ? (urls[mini] ?? null) : null };
  });
}
