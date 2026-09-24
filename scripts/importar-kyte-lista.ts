/* ============================================================
   IMPORTAR KYTE PELA LISTA DA PÁGINA — para quando a API do Kyte barra

   O importar-kyte.ts foi feito para a SacraZen e lê a lista crua da API.
   Na Ciclo Skate Shop (24/09/2026) a API pública do Kyte
   (kyte-query-public.kyte.site) recusou toda chamada que não saía do
   próprio código do site, e o Cloudflare barrou o curl. O que funcionou:
   abrir cada categoria no Chrome e ler os cartões da página (nome, preço,
   "OFERTA", "N opções", o uuid da foto e o id da peça). As fotos, essas,
   o CDN do Kyte entrega sem trava.

   O ARQUIVO DE ENTRADA, uma peça por linha, campos separados por "|":
     #C=Camisetas e moletons            ← o código de cada categoria
     C|Camiseta Folly Crew|95,00|1|2|<uuid da foto>|<id da peça>
       cód | nome como o cartão mostra | preço (ou "de/por") | oferta 0/1
       | opções | uuid | id
   O nome chega sujo como o cartão mostra ("-21% Disponível: 2 Boné...",
   "... A partir de") e é limpo aqui.

   USO:
     npm i --no-save sharp
     npx tsx scripts/importar-kyte-lista.ts <arroba> <arquivo> <conta Kyte> <url da loja Kyte>
   A conta é o trecho antes do "%2F" nas URLs de foto do Kyte.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { acharLoja, arrobaDe, prepararOficina } from "./oficina-cli";

const [, , arrobaBruto, arquivo, conta, lojaKyte] = process.argv;
const arroba = arrobaDe(arrobaBruto || "");
if (!arroba || !arquivo || !conta || !lojaKyte) {
  console.error("Uso: npx tsx scripts/importar-kyte-lista.ts <arroba> <arquivo> <conta Kyte> <url da loja Kyte>");
  process.exit(1);
}
const CDN = `https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/${conta}%2F`;

type Linha = {
  categoria: string;
  nome: string;
  preco: number | null;
  preco_de: number | null;
  opcoes: number | null;
  uuid: string;
  id: string;
};

function numero(txt: string): number | null {
  const n = Number(txt.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* O cartão do Kyte cola no nome o selo de desconto e o estoque
   ("-21% Disponível: 2 Boné Five Panel"), e na variante o "A partir de".
   Emoji de vitrine do Kyte (✅, ♻️) também sai: o nome da peça é o que
   a loja escreveu, sem enfeite. */
function limparNome(bruto: string): string {
  return bruto
    .replace(/^-\d+%\s*/, "")
    .replace(/^Disponível:\s*\S+\s*/, "")
    .replace(/\s*A partir de\s*$/i, "")
    .replace(/[✅♻️\u{1F526}\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/\(\s*/g, "(")
    .replace(/\s*\)/g, ")")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function ler(texto: string): Linha[] {
  const categorias = new Map<string, string>();
  const linhas: Linha[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const l = bruta.trim();
    if (!l) continue;
    const cab = l.match(/^#(\w+)=(.+)$/);
    if (cab) {
      categorias.set(cab[1], cab[2].trim());
      continue;
    }
    const campos = l.split("|");
    if (campos.length !== 7) {
      console.warn(`  linha sem forma: ${l.slice(0, 80)}`);
      continue;
    }
    const [cod, nome, precos, , opcoes, uuid, id] = campos;
    const [a, b] = precos.split("/");
    /* "139,90/110,00" é de/por; um número só é o preço */
    const preco = b ? numero(b) : numero(a);
    const preco_de = b ? numero(a) : null;
    linhas.push({
      categoria: categorias.get(cod) ?? cod,
      nome: limparNome(nome),
      preco,
      preco_de: preco_de && preco && preco_de > preco ? preco_de : null,
      opcoes: opcoes ? Number(opcoes) : null,
      uuid: uuid.trim(),
      id: id.trim(),
    });
  }
  return linhas;
}

/* A marca lida do nome, porque a vitrine filtra por marca e o Kyte não
   guarda isso. A lista é a das marcas que a Ciclo vende; para outra loja,
   acrescentar aqui. A mais comprida testa primeiro ("Mob Grip" antes de
   "Mob"). */
const MARCAS = [
  "Diamond Supply", "Drop Dead", "Folly Crew", "Rush Deriva", "Mothafoton", "Grizzly", "Narina", "Posso",
  "Sigilo", "Urgh", "Zion", "Myllys", "Classic", "DC", "Aston", "Deathwish", "Enjoi", "Foundation",
  "Nineclouds", "NineClouds", "Toy Machine", "Boss", "Official", "Bear Republic", "Comply", "LandFeet",
  "Landfeet", "Oüs", "Öus", "Black Sheep", "Moska", "Revenge", "Radical Line", "Anti Action", "Lyons",
  "Independent", "Intruder", "Thrasher", "Bones", "Mini Logo", "Next", "Spitfire", "Bronson", "Mob Grip",
  "Shake Junt", "Jessup", "Norton", "Primitive", "Rip N Dep", "Ciclo",
].sort((x, y) => y.length - x.length);

function marcaDe(nome: string): string | null {
  for (const m of MARCAS) {
    if (new RegExp(`(^|\\s)${m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$|\\.)`, "i").test(nome)) {
      if (/^(landfeet)$/i.test(m)) return "LandFeet";
      if (/^(öus|oüs)$/i.test(m)) return "Oüs";
      if (/^nineclouds$/i.test(m)) return "Nineclouds";
      return m;
    }
  }
  return null;
}

async function principal() {
  const { supabase, dono } = prepararOficina();
  const sharp = (await import("sharp")).default;
  const loja = await acharLoja(supabase, dono, arroba, false);

  const linhas = ler(fs.readFileSync(path.resolve(arquivo), "utf8"));
  console.log(`${linhas.length} peças na lista.`);

  const { data: jaTem } = await supabase.from("prod_ativos").select("id,media_id").eq("loja_id", loja.id);
  const conhecidos = new Map(((jaTem as { id: string; media_id: string }[]) ?? []).map((a) => [a.media_id, a.id]));
  const { data: produtosJa } = await supabase.from("prod_produtos").select("ativo_id").eq("loja_id", loja.id);
  const comProduto = new Set(((produtosJa as { ativo_id: string | null }[]) ?? []).map((p) => p.ativo_id));

  let novos = 0;
  let falhas = 0;
  for (const [i, l] of linhas.entries()) {
    const media_id = `kyte_${l.id}`;
    let ativo_id = conhecidos.get(media_id) ?? null;

    if (!ativo_id) {
      const r = await fetch(`${CDN}${l.uuid}.jpg?alt=media`);
      if (!r.ok) {
        falhas++;
        console.warn(`  sem imagem (${r.status}): ${l.nome}`);
        continue;
      }
      const original = Buffer.from(await r.arrayBuffer());
      const bytes = await sharp(original)
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      const caminho = `${loja.id}/${media_id}.jpg`;
      const { error: erroUpload } = await supabase.storage
        .from("producao")
        .upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
      if (erroUpload) {
        falhas++;
        console.warn(`  upload falhou: ${l.nome} (${erroUpload.message})`);
        continue;
      }
      const { data: ativo, error: erroLinha } = await supabase
        .from("prod_ativos")
        .insert({
          owner_id: dono,
          loja_id: loja.id,
          media_id,
          ordem: 2000 + i,
          tipo: "KYTE",
          caminho,
          legenda: `${l.nome} · R$ ${l.preco ?? "?"} (catálogo Kyte)`,
          permalink: lojaKyte,
          publicado_em: null,
          curtidas: null,
          comentarios: null,
        })
        .select("id")
        .single<{ id: string }>();
      if (erroLinha || !ativo) {
        falhas++;
        console.warn(`  ativo falhou: ${l.nome} (${erroLinha?.message})`);
        continue;
      }
      ativo_id = ativo.id;
      conhecidos.set(media_id, ativo_id);
    }

    if (comProduto.has(ativo_id)) continue;
    const { error } = await supabase.from("prod_produtos").insert({
      owner_id: dono,
      loja_id: loja.id,
      ativo_id,
      ordem: 100 + i,
      nome: l.nome,
      marca: marcaDe(l.nome),
      cor: null,
      fotos_extras: null,
      preco: l.preco,
      preco_de: l.preco_de,
      tamanhos: null,
      categoria: l.categoria,
      descricao: l.opcoes && l.opcoes > 1 ? `${l.opcoes} opções na loja.` : null,
      revisado: true,
    });
    if (error) {
      falhas++;
      console.warn(`  produto falhou: ${l.nome} (${error.message})`);
      continue;
    }
    novos++;
    if (novos % 25 === 0) console.log(`  ${novos} produtos importados...`);
  }

  const nota = `${novos} produtos importados do Kyte com preço${falhas ? `, ${falhas} falharam` : ""}.`;
  await supabase.from("prod_lojas").update({ status: "catalogo", nota }).eq("id", loja.id);
  console.log(nota);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
