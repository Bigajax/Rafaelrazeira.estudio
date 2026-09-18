/* ============================================================
   IMPORTAR STOQUI — a lojinha que a bio já aponta entra na oficina

   Algumas lojas vendem por um catálogo Stoqui (<loja>.stoqui.shop): é a
   única fonte de preço que não depende de perguntar ao cliente, e vem
   com foto de estúdio de cada peça e uma descrição escrita. Este script
   lê a página da loja (os produtos estão no JSON-LD embutido), abre a
   página de cada peça para pegar a descrição e faz deles produtos da
   oficina:

   - a foto vai em 1200px para o bucket `producao`, como ativo de tipo
     STOQUI (a leitura por IA não passa por ele: já tem nome e preço);
   - o produto nasce REVISADO, porque nome, preço e descrição vieram da
     própria loja;
   - a categoria é inferida do nome (o Stoqui não expõe a categoria na
     página), pela tabela CATEGORIA_DE abaixo, que é da loja.

   Dependência sob demanda: npm i --no-save sharp

   USO:
     npx tsx scripts/importar-stoqui.ts maisonpriscilamso https://maison-priscila.stoqui.shop
   ============================================================ */

import { acharLoja, arrobaDe, prepararOficina } from "./oficina-cli";

const arroba = arrobaDe(process.argv[2] || "");
const lojaUrl = (process.argv[3] || "").replace(/\/$/, "");
if (!arroba || !lojaUrl) {
  console.error("Uso: npx tsx scripts/importar-stoqui.ts <arroba> <https://loja.stoqui.shop>");
  process.exit(1);
}

type Item = { name: string; url: string; image: string; price: number; description: string | null };

/* A categoria pelo nome. É a tabela da Maison Priscila (semijoias,
   acessórios de cabelo, óculos); outra loja Stoqui troca esta lista. */
function categoriaDe(nome: string): string {
  const n = nome.toLowerCase();
  if (/óculos|oculos/.test(n)) return "Óculos";
  if (/cabelo|el[áa]stico|xuxinha|fita|presilha|piranha/.test(n)) return "Cabelo";
  if (/brinco/.test(n)) return "Brincos";
  if (/colar|gargantilha|corrente|choker|escapul[áa]rio|medalha/.test(n)) return "Colares";
  if (/pulseira|bracelete/.test(n)) return "Pulseiras";
  if (/anel|alian[çc]a/.test(n)) return "Anéis";
  if (/conjunto|kit/.test(n)) return "Conjuntos";
  return "Acessórios";
}

/* "braceletes " e "óculos miu miu" viram etiqueta de loja: primeira
   letra maiúscula, espaços aparados, o resto como a dona escreveu. */
function etiqueta(nome: string): string {
  const limpo = nome.replace(/\s+/g, " ").trim();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

const RE_LISTA =
  /\{"@type":"Product","name":"(.*?)","url":"(.*?)","image":"(.*?)","offers":\{"@type":"Offer","priceCurrency":"BRL","price":([0-9.]+)/g;

async function lerLoja(): Promise<Item[]> {
  const html = await (await fetch(lojaUrl)).text();
  const vistos = new Map<string, Item>();
  let m: RegExpExecArray | null;
  while ((m = RE_LISTA.exec(html))) {
    const [, name, url, image, price] = m;
    if (!vistos.has(url)) vistos.set(url, { name, url, image, price: Number(price), description: null });
  }
  return [...vistos.values()];
}

async function lerDescricao(url: string): Promise<string | null> {
  try {
    const html = await (await fetch(url)).text();
    const m = html.match(/"@type":"Product","name":".*?","description":"((?:[^"\\]|\\.)*)"/);
    if (!m) return null;
    const texto = JSON.parse(`"${m[1]}"`) as string;
    return texto.trim() || null;
  } catch {
    return null;
  }
}

async function principal() {
  const { supabase, dono } = prepararOficina();
  const sharp = (await import("sharp")).default;
  const loja = await acharLoja(supabase, dono, arroba, false);

  const itens = await lerLoja();
  console.log(`${itens.length} produtos na loja Stoqui.`);

  const { data: jaTem } = await supabase.from("prod_ativos").select("id,media_id").eq("loja_id", loja.id);
  const conhecidos = new Map(((jaTem as { id: string; media_id: string }[]) ?? []).map((a) => [a.media_id, a.id]));
  const { data: produtosJa } = await supabase.from("prod_produtos").select("ativo_id").eq("loja_id", loja.id);
  const comProduto = new Set(((produtosJa as { ativo_id: string | null }[]) ?? []).map((p) => p.ativo_id));

  let novos = 0;
  let falhas = 0;
  for (const [i, it] of itens.entries()) {
    const sku = it.url.split("/").pop()?.split("-")[0] ?? String(i);
    const media_id = `stoqui_${sku}`;
    let ativo_id = conhecidos.get(media_id) ?? null;

    if (!ativo_id) {
      /* o CDN aceita o tamanho na URL: a lista vem em 400px, a peça vai em 1200 */
      const grande = it.image.replace(/rs:fit:\d+:\d+/, "rs:fit:1200:1200");
      const r = await fetch(grande);
      if (!r.ok) {
        falhas++;
        console.warn(`  sem imagem: ${it.name}`);
        continue;
      }
      const original = Buffer.from(await r.arrayBuffer());
      const bytes = await sharp(original).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer();
      const caminho = `${loja.id}/${media_id}.jpg`;
      const { error: erroUpload } = await supabase.storage.from("producao").upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
      if (erroUpload) {
        falhas++;
        console.warn(`  upload falhou: ${it.name} (${erroUpload.message})`);
        continue;
      }
      const { data: ativo, error: erroLinha } = await supabase
        .from("prod_ativos")
        .insert({
          owner_id: dono,
          loja_id: loja.id,
          media_id,
          ordem: 2000 + i,
          tipo: "STOQUI",
          caminho,
          legenda: `${etiqueta(it.name)} · R$ ${it.price} (catálogo Stoqui)`,
          permalink: it.url,
          publicado_em: null,
          curtidas: null,
          comentarios: null,
        })
        .select("id")
        .single<{ id: string }>();
      if (erroLinha || !ativo) {
        falhas++;
        console.warn(`  ativo falhou: ${it.name} (${erroLinha?.message})`);
        continue;
      }
      ativo_id = ativo.id;
      conhecidos.set(media_id, ativo_id);
    }

    if (comProduto.has(ativo_id)) continue;
    const descricao = await lerDescricao(it.url);
    const { error } = await supabase.from("prod_produtos").insert({
      owner_id: dono,
      loja_id: loja.id,
      ativo_id,
      ordem: 100 + i,
      nome: etiqueta(it.name),
      marca: null,
      cor: null,
      fotos_extras: null,
      preco: it.price,
      preco_de: null,
      tamanhos: null,
      categoria: categoriaDe(it.name),
      descricao,
      revisado: true,
    });
    if (error) {
      falhas++;
      console.warn(`  produto falhou: ${it.name} (${error.message})`);
      continue;
    }
    novos++;
    console.log(`  ${etiqueta(it.name)} · R$ ${it.price} · ${categoriaDe(it.name)}`);
  }

  const nota = `${novos} produtos importados do Stoqui com preço${falhas ? `, ${falhas} falharam` : ""}.`;
  await supabase.from("prod_lojas").update({ status: "catalogo", nota }).eq("id", loja.id);
  console.log(nota);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
