/* ============================================================
   O PREÇO, e só o que foi publicado

   DEPOIS de gerar, o custo é o REAL: o OpenRouter devolve `usage.cost` em
   dólar, na imagem (na resposta) e no vídeo (na consulta do job). É esse
   número que vai para `custo_usd`, e a tela não precisa chamar de
   estimativa.

   ANTES de gerar, só há estimativa onde o preço é por segundo de vídeo
   (Veo 3.1, Fast e Lite), pela tabela da lista ao vivo do OpenRouter em
   13/10/2026 (`pricing_skus` de /api/v1/videos/models, em
   lib/ai-studio/modelos.ts). O Seedance e todas as imagens cobram por
   token, e o número de tokens só se sabe depois: aí a estimativa é null e
   a tela diz "sem estimativa", nunca um chute.
   ============================================================ */
import { modeloVideo } from "./modelos";

export function estimativaVideo(modelo: string, resolucao: string, duracao: number, audio: boolean): number | null {
  const preco = modeloVideo(modelo)?.porSegundo;
  if (!preco) return null;
  return Math.round(preco(resolucao, audio) * duracao * 100) / 100;
}

/* O `usage.cost` da resposta, se veio como número. */
export function custoReal(usage: unknown): number | null {
  const c = (usage as { cost?: unknown } | null)?.cost;
  return typeof c === "number" && Number.isFinite(c) ? c : null;
}

export function usd(valor: number | null | undefined, casas = 3): string {
  if (valor === null || valor === undefined) return "sem dado";
  return `US$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: casas })}`;
}
