"use client";

/* O upload do navegador direto para o bucket privado. A imagem não passa
   pela Vercel (o corpo lá é cortado em 4,5 MB): sobe para a pasta do dono
   com a sessão, e a rota de geração baixa de lá pelo caminho. */
import { clienteNavegador } from "@/lib/marketing/navegador";
import { BUCKET } from "@/lib/ai-studio/tipos";

export const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"];
/* teto do app: foto maior que isso é só
   espera a mais no upload e na chamada */
export const MAX_UPLOAD = 25 * 1024 * 1024;

function canvasDe(bmp: ImageBitmap, lado: number) {
  const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

function blobDe(c: HTMLCanvasElement, tipo: string, q?: number): Promise<Blob> {
  return new Promise((ok, falha) => c.toBlob((b) => (b ? ok(b) : falha(new Error("conversão"))), tipo, q));
}

/* Referência: guia o modelo, não vai para o download. WebP de até 2048 px
   basta e sobe rápido. */
export async function subirReferencia(uid: string, arquivo: File): Promise<string> {
  const c = canvasDe(await createImageBitmap(arquivo), 2048);
  const webp = await blobDe(c, "image/webp", 0.92);
  return subir(`${uid}/ref/${crypto.randomUUID()}.webp`, webp, "image/webp");
}

/* Foto para editar: vai como veio, se for um dos três formatos; outro
   formato que o navegador saiba ler vira PNG. */
export async function subirEntrada(uid: string, arquivo: File): Promise<string> {
  if (TIPOS_ACEITOS.includes(arquivo.type)) {
    const ext = arquivo.type === "image/jpeg" ? "jpeg" : arquivo.type.split("/")[1];
    return subir(`${uid}/entrada/${crypto.randomUUID()}.${ext}`, arquivo, arquivo.type);
  }
  const c = canvasDe(await createImageBitmap(arquivo), 3840);
  return subir(`${uid}/entrada/${crypto.randomUUID()}.png`, await blobDe(c, "image/png"), "image/png");
}

async function subir(caminho: string, corpo: Blob, tipo: string): Promise<string> {
  const { error } = await clienteNavegador().storage.from(BUCKET).upload(caminho, corpo, { contentType: tipo, upsert: false });
  if (error) throw new Error("O upload falhou. Confira se o supabase/ai-studio.sql foi rodado.");
  return caminho;
}

/* null = ok; texto = por que não */
export function problemaDoArquivo(f: File): string | null {
  if (!f.type.startsWith("image/")) return `${f.name}: não é imagem.`;
  if (f.size > MAX_UPLOAD) return `${f.name}: passa de 25 MB.`;
  return null;
}
