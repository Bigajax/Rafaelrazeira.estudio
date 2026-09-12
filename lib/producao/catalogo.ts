/* ============================================================
   A LEITURA DO CATÁLOGO — a foto virando produto

   ---------- a virada de 26/08 ----------
   Este arquivo nasceu lendo LEGENDA. O primeiro teste real derrubou a
   premissa: a Kanton tem 7 legendas em 57 fotos, e nenhuma com preço. Ela
   guarda o preço para o direct, que é exatamente a dor que a vitrine
   resolve, ou seja: as lojas que mais precisam de vitrine são as que menos
   escrevem preço.

   Então o que manda agora é a FOTO. O modelo olha a imagem e devolve tipo
   da peça, marca visível, cor e categoria. A legenda entra junto, como
   auxiliar, porque quando ela existe costuma trazer tamanho e preço.

   ---------- as armadilhas do domínio ----------
   1. PREÇO INVENTADO é o pior erro possível, e o mais fácil de acontecer
      quando o modelo vê um tênis e "sabe" quanto custa um tênis. Preço só
      existe se estiver escrito.
   2. MARCA DEDUZIDA pela forma do produto erra e erra com confiança. Só
      vale logo visível.
   3. CARROSSEL é a mesma peça em quatro ângulos. Sem agrupar, a vitrine
      repete o mesmo tênis quatro vezes.

   As três moram nos `.describe()` do esquema, em `modelo.ts`: o que
   descreve o campo viaja junto com o campo.

   ---------- dois transportes ----------
   Com ANTHROPIC_API_KEY, vai para a Anthropic com saída estruturada e
   visão. Sem a chave, cai no OpenRouter, que aqui só enxerga TEXTO: é o
   caminho de reserva, e ele devolve pouco em loja que não escreve legenda.
   ============================================================ */

import { chamarModelo } from "@/lib/crm/pesquisa";
import { lerLote, temChaveDaAnthropic, type FotoParaLer } from "./modelo";
import type { ProdutoLido } from "./tipos";

/* Legenda de Instagram tem emoji, hashtag e três parágrafos de "corre que
   acaba". O que interessa está nas primeiras linhas. */
const TETO_LEGENDA = 400;

/* Dez fotos por chamada, e não vinte e cinco como era no tempo do texto.
   Imagem custa muito mais que legenda: um lote grande demais estoura o
   tempo da requisição e, quando falha, joga fora dez leituras junto. Dez é
   o tamanho em que uma falha custa pouco e o custo por foto ainda é baixo. */
const LOTE_COM_FOTO = 10;

/* O caminho de reserva continua barato e cego, então pode levar mais. */
const LOTE_SO_TEXTO = 25;

export type ItemParaLer = { media_id: string; legenda: string | null; url?: string | null };

const linhaDe = (i: ItemParaLer) =>
  `${i.media_id} :: ${(i.legenda || "(sem legenda)").slice(0, TETO_LEGENDA)}`;

/* ---------- o caminho reserva: pedir JSON com jeitinho ---------- */

function pedidoEmProsa(itens: ItemParaLer[]): string {
  return `Você está lendo legendas de posts do Instagram de uma loja para montar o catálogo de uma vitrine digital.

Para CADA linha abaixo (formato "media_id :: legenda"), devolva um objeto com:
- "media_id": exatamente o id que veio na linha
- "nome": o nome curto do produto, em Caixa de Frase. Sem emoji, sem hashtag.
- "preco": o preço À VISTA em número (189.90). Parcela NÃO é preço: devolva null.
- "preco_de": o preço riscado, quando anunciado. Senão null.
- "tamanhos": como está escrito ("P, M, G"). Se não houver, null.
- "categoria": uma palavra que agrupe ("Vestidos", "Tênis").
- "descricao": no máximo uma frase, só se a legenda descrever. Senão null.
- "descartar": true quando a linha NÃO é um produto (aviso, enquete, frase solta, recado).

REGRAS:
1. Nunca invente preço, tamanho ou nome. O que não está escrito é null.
2. Ids terminados em "_1", "_2" são fotos do MESMO post: se a legenda descreve uma peça só, mantenha a primeira e descarte as outras.
3. Legenda sem nada de produto é sempre descartar.

Responda SÓ com um array JSON, sem texto antes ou depois, sem cercas de código.

${itens.map(linhaDe).join("\n")}`;
}

/* O modelo obedece "só JSON" quase sempre. "Quase" é o problema: uma vez em
   dez ele embrulha em ```json. Recortar do primeiro colchete ao último
   resolve sem depender de boa vontade. É esta função que a saída
   estruturada do caminho principal torna desnecessária. */
function extrairArray(texto: string): unknown[] {
  const cru = texto.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const ini = cru.indexOf("[");
  const fim = cru.lastIndexOf("]");
  if (ini === -1 || fim === -1 || fim < ini) {
    throw new Error("O modelo respondeu fora do formato. Tente ler o catálogo de novo.");
  }
  const dado = JSON.parse(cru.slice(ini, fim + 1)) as unknown;
  if (!Array.isArray(dado)) throw new Error("O modelo respondeu fora do formato.");
  return dado;
}

function numero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const limpo = v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) && limpo !== "" ? n : null;
}

const texto = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.toLowerCase() !== "null" ? t : null;
};

/* ---------- traduzir a falha em ALGO QUE SE FAZ ----------
   Esta função já errou duas vezes, e as duas ensinaram a mesma coisa.

   Primeiro ela testava a mensagem crua e, ao ver "api key", culpava um
   provedor que nem estava em uso: a tela mandou conferir uma chave que
   nunca tinha sido criada.

   Depois, já com o culpado certo, ela ainda respondia em vocabulário de
   servidor: nome de variável, arquivo de ambiente, painel de terceiro. A
   tela da oficina não é o lugar disso. Quem está na bancada quer saber o
   que FAZER agora, e o que se faz quando a leitura automática falha é
   pedir a leitura das fotos na conversa (scripts/catalogo-a-mao.ts).

   A mensagem crua continua no fim, entre parênteses: ela é o que permite
   reconhecer o caso que este código ainda não conhece. */
const PELA_CONVERSA =
  "A leitura automática não respondeu. O caminho de sempre continua aberto: exporte as fotos e peça a leitura na conversa.";

function traduzir(via: "anthropic" | "openrouter", e: unknown): Error {
  const frase = e instanceof Error ? e.message : String(e);
  const cru = frase.slice(0, 160);
  const quem = via === "anthropic" ? "leitura das fotos" : "leitura das legendas";

  if (/afford|credits|402|quota|429|rate/i.test(frase)) {
    return new Error(`A conta que faz a ${quem} está sem saldo. ${PELA_CONVERSA} (${cru})`);
  }
  if (/api[_ ]?key|authentication|401|403/i.test(frase)) {
    return new Error(`A ${quem} foi recusada por credencial. ${PELA_CONVERSA} (${cru})`);
  }
  if (/model|not_found|404/i.test(frase)) {
    return new Error(`O modelo da ${quem} não respondeu. ${PELA_CONVERSA} (${cru})`);
  }
  return new Error(`A ${quem} falhou. ${PELA_CONVERSA} (${cru})`);
}

async function pelaAnthropic(lote: ItemParaLer[]) {
  const fotos: FotoParaLer[] = lote
    .filter((i) => i.url)
    .map((i) => ({ media_id: i.media_id, url: i.url as string, legenda: i.legenda }));
  if (!fotos.length) return { produtos: [] as ProdutoLido[], custo_usd: 0 };

  const { itens, custo_usd } = await lerLote(fotos);
  const produtos: ProdutoLido[] = itens.map((i) => ({
    media_id: i.media_id,
    nome: i.nome || undefined,
    marca: i.marca,
    cor: i.cor,
    preco: i.preco,
    preco_de: i.preco_de,
    tamanhos: i.tamanhos,
    categoria: i.categoria,
    descricao: i.descricao,
    mesma_peca_que: i.mesma_peca_que,
    descartar: i.descartar,
  }));
  return { produtos, custo_usd };
}

async function peloOpenRouter(lote: ItemParaLer[]) {
  const r = await chamarModelo({
    pedido: pedidoEmProsa(lote),
    comBusca: false,
    max_tokens: 4000,
    esforco: "low",
  });

  const produtos: ProdutoLido[] = [];
  for (const cru of extrairArray(r.texto)) {
    if (!cru || typeof cru !== "object") continue;
    const o = cru as Record<string, unknown>;
    const media_id = texto(o.media_id);
    if (!media_id) continue;
    produtos.push({
      media_id,
      nome: texto(o.nome) ?? undefined,
      marca: null,
      cor: null,
      preco: numero(o.preco),
      preco_de: numero(o.preco_de),
      tamanhos: texto(o.tamanhos),
      categoria: texto(o.categoria),
      descricao: texto(o.descricao),
      mesma_peca_que: null,
      descartar: o.descartar === true,
    });
  }
  return { produtos, custo_usd: r.custo_usd ?? 0 };
}

export async function lerCatalogo(
  itens: ItemParaLer[],
): Promise<{ produtos: ProdutoLido[]; custo_usd: number; via: "anthropic" | "openrouter" }> {
  const via = temChaveDaAnthropic() ? "anthropic" : "openrouter";
  const tamanho = via === "anthropic" ? LOTE_COM_FOTO : LOTE_SO_TEXTO;
  const produtos: ProdutoLido[] = [];
  let custo = 0;

  for (let i = 0; i < itens.length; i += tamanho) {
    const lote = itens.slice(i, i + tamanho);
    try {
      const r = via === "anthropic" ? await pelaAnthropic(lote) : await peloOpenRouter(lote);
      produtos.push(...r.produtos);
      custo += r.custo_usd;
    } catch (e) {
      /* Um lote que falha depois de outros terem dado certo NÃO joga fora o
         que já veio: a rota grava o que existe e a nota conta quanto saiu.
         Numa conta que acabou de zerar o crédito, isso é a diferença entre
         metade do catálogo e nada. */
      if (produtos.length) break;
      throw traduzir(via, e);
    }
  }

  return { produtos, custo_usd: custo, via };
}
