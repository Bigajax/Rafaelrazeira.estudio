/* ============================================================
   AS CHAMADAS AO OPENROUTER — só no servidor

   Importado apenas pelas rotas /api/ai-studio/*. A chave sai de
   `process.env.OPENROUTER_API_KEY` na hora da chamada (a mesma da pesquisa
   do CRM) e nunca vai para o navegador, para o banco, para o JSON de
   resposta nem para o log.

   Dois jeitos de chamar, conferidos na documentação em 13/10/2026:
   - IMAGEM, síncrona: POST /api/v1/images → data[0].b64_json + usage.cost.
     Cobrança tudo-ou-nada: falhou ou foi cancelada, não cobra.
   - VÍDEO, assíncrono: POST /api/v1/videos → { id }, depois
     GET /api/v1/videos/<id> até `completed`, e o MP4 em
     GET /api/v1/videos/<id>/content (com a chave: o link não é assinado).

   As imagens de entrada vão por URL assinada do bucket privado, com
   validade curta: é o formato que a documentação de vídeo garante, e o
   OpenRouter baixa de lá.
   ============================================================ */

const BASE = "https://openrouter.ai/api/v1";

export function temChave(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function cabecalhos() {
  return {
    authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "content-type": "application/json",
    /* as etiquetas do painel de uso do OpenRouter, como na pesquisa */
    "http-referer": "https://rafaelrazeira.com.br",
    "x-title": "AI Studio Rafael Razeira",
  };
}

/* O erro do OpenRouter com o status HTTP, para a tradução. */
export class ErroOpenRouter extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

async function pedir<T>(caminho: string, init: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const r = await fetch(`${BASE}${caminho}`, { ...init, headers: { ...cabecalhos(), ...(init.headers ?? {}) } });
  const corpo = (await r.json().catch(() => null)) as (T & { error?: { code?: unknown; message?: string } }) | null;
  if (!r.ok || !corpo) {
    const e = corpo?.error;
    console.error("[ai-studio] OpenRouter", r.status, String(e?.code ?? ""));
    throw new ErroOpenRouter(r.status, String(e?.code ?? ""), e?.message || `O OpenRouter respondeu ${r.status}.`);
  }
  return corpo;
}

type ImagemRef = { type: "image_url"; image_url: { url: string } };
const ref = (url: string): ImagemRef => ({ type: "image_url", image_url: { url } });

/* ---------- imagem ---------- */
export type PedidoImagem = {
  modelo: string;
  prompt: string;
  qualidade: string | null;
  proporcao: string;
  resolucao: string | null;
  fundo: string | null;
  referencias: string[];
};

export async function gerarImagem(
  p: PedidoImagem,
  signal?: AbortSignal,
): Promise<{ buffer: Buffer; mime: string; usage: unknown }> {
  const corpo = await pedir<{ data?: { b64_json?: string; media_type?: string }[]; usage?: unknown }>("/images", {
    method: "POST",
    signal,
    body: JSON.stringify({
      model: p.modelo,
      prompt: p.prompt,
      n: 1,
      aspect_ratio: p.proporcao,
      ...(p.qualidade ? { quality: p.qualidade } : {}),
      ...(p.resolucao ? { resolution: p.resolucao } : {}),
      ...(p.fundo ? { background: p.fundo } : {}),
      ...(p.referencias.length ? { input_references: p.referencias.map(ref) } : {}),
    }),
  });
  const img = corpo.data?.[0];
  if (!img?.b64_json) throw new Error("O OpenRouter respondeu sem imagem.");
  return { buffer: Buffer.from(img.b64_json, "base64"), mime: img.media_type || "image/png", usage: corpo.usage ?? null };
}

/* ---------- vídeo ---------- */
export type PedidoVideo = {
  modelo: string;
  prompt: string;
  resolucao: string;
  proporcao: string;
  duracao: number;
  audio: boolean;
  primeiro: string | null;
  ultimo: string | null;
  referencias: string[];
};

export async function criarVideo(p: PedidoVideo): Promise<{ id: string }> {
  const quadros = [
    ...(p.primeiro ? [{ ...ref(p.primeiro), frame_type: "first_frame" }] : []),
    ...(p.ultimo ? [{ ...ref(p.ultimo), frame_type: "last_frame" }] : []),
  ];
  const corpo = await pedir<{ id?: string }>("/videos", {
    method: "POST",
    body: JSON.stringify({
      model: p.modelo,
      prompt: p.prompt,
      resolution: p.resolucao,
      aspect_ratio: p.proporcao,
      duration: p.duracao,
      generate_audio: p.audio,
      ...(quadros.length ? { frame_images: quadros } : {}),
      ...(p.referencias.length ? { input_references: p.referencias.map(ref) } : {}),
    }),
  });
  if (!corpo.id) throw new Error("O OpenRouter aceitou o pedido mas não devolveu o número do trabalho.");
  return { id: corpo.id };
}

export type EstadoVideo = {
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled" | "expired" | string;
  unsigned_urls?: string[];
  usage?: unknown;
  error?: string;
};

export async function consultarVideo(jobId: string): Promise<EstadoVideo> {
  return pedir<EstadoVideo>(`/videos/${encodeURIComponent(jobId)}`, { method: "GET" });
}

export async function baixarVideo(jobId: string, url?: string): Promise<Buffer> {
  /* só aceita link do próprio OpenRouter: a chave vai no cabeçalho */
  const alvo = url && url.startsWith(`${BASE}/videos/`) ? url : `${BASE}/videos/${encodeURIComponent(jobId)}/content?index=0`;
  const r = await fetch(alvo, { headers: { authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` } });
  if (!r.ok) throw new ErroOpenRouter(r.status, "", `Não consegui baixar o vídeo (${r.status}).`);
  return Buffer.from(await r.arrayBuffer());
}

/* ============================================================
   O ERRO, em português de gente. `status` volta para o navegador.
   ============================================================ */
export function traduzirErro(e: unknown): { status: number; frase: string; cancelado?: boolean } {
  if (e instanceof DOMException && e.name === "AbortError") {
    return { status: 499, frase: "Pedido cancelado.", cancelado: true };
  }
  if (e instanceof ErroOpenRouter) {
    const msg = e.message.replace(/\s+/g, " ").slice(0, 300);
    if (e.status === 401) return { status: 401, frase: "O OpenRouter recusou a chave. Confira a OPENROUTER_API_KEY." };
    if (e.status === 402) {
      return { status: 402, frase: "Acabou o crédito do OpenRouter. Recarregue em openrouter.ai/settings/credits." };
    }
    if (e.status === 403) return { status: 403, frase: `O pedido foi bloqueado pela moderação: ${msg}` };
    if (e.status === 408) return { status: 504, frase: "O OpenRouter demorou demais. Tente de novo." };
    if (e.status === 429) return { status: 429, frase: "Muitos pedidos agora no OpenRouter. Espere um pouco e tente de novo." };
    if (e.status === 400) return { status: 400, frase: `O OpenRouter recusou o pedido: ${msg}` };
    if (e.status >= 500) return { status: 503, frase: `O provedor do modelo falhou (${e.status}). Tente de novo em instantes.` };
    return { status: 500, frase: msg };
  }
  if (e instanceof TypeError) return { status: 502, frase: "Não consegui falar com o OpenRouter. Confira a conexão." };
  console.error("[ai-studio]", e instanceof Error ? e.message : "erro desconhecido");
  return { status: 500, frase: e instanceof Error ? e.message : "A geração falhou." };
}
