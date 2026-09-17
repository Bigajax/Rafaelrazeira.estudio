/* ============================================================
   EXPORTAR VITRINE — o catálogo da oficina vira o data/ de uma vitrine

   A base da vitrine (a do usekanton, duplicada por loja) roda em modo
   local lendo `data/catalogo.json` e `public/produtos/*.webp`. Este script
   escreve os dois a partir do que a oficina já tem: produtos com preço,
   categoria, estrelas do hero e as fotos no bucket. É a "fatia 2" da
   trilha A: o template lendo da oficina sem Supabase novo.

   - cada foto desce do bucket, vira WebP de até 1200px e ganha o blur
     de 12px que o <Image> usa como placeholder;
   - as categorias saem na ordem da lista CATEGORIAS abaixo (o que não
     está nela vai para o fim, em ordem alfabética);
   - o hero são as estrelas, na ordem das estrelas;
   - a marca do incenso é lida do nome ("Incenso Noa ..." vira Noa),
     porque a vitrine filtra por marca e a oficina não guarda isso.

   Dependência sob demanda: npm i --no-save sharp

   USO:
     npx tsx scripts/exportar-vitrine.ts sacrazen ~/Desktop/sacrazen
     npx tsx scripts/exportar-vitrine.ts velas.mogi ~/Desktop/velas-mogi --ordem "Velas de 7 dias,Velas palito,..."

   Sem --ordem, a lista CATEGORIAS abaixo (a da SacraZen) manda, e o que
   não estiver nela vai para o fim em ordem alfabética.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { acharLoja, arrobaDe, prepararOficina } from "./oficina-cli";
import type { Ativo, Produto } from "@/lib/producao/tipos";

const arroba = arrobaDe(process.argv[2] || "");
const ordemPedida = (() => {
  const i = process.argv.indexOf("--ordem");
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
})();
/* O prefixo do código da peça ("SZ-0001"). Sem --codigo, as iniciais do
   arroba: "velas.mogi" vira VM, "aurum_sagrado" vira AS. */
const prefixoCodigo = (() => {
  const i = process.argv.indexOf("--codigo");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1].toUpperCase();
  const iniciais = arroba.split(/[._-]+/).map((p) => p[0] ?? "").join("").toUpperCase();
  return iniciais.slice(0, 3) || "VT";
})();
const destino = process.argv[3] ? path.resolve(process.argv[3].replace(/^~/, process.env.USERPROFILE || process.env.HOME || "")) : "";
if (!arroba || !destino) {
  console.error("Uso: npx tsx scripts/exportar-vitrine.ts <arroba> <pasta da vitrine>");
  process.exit(1);
}

/* A ordem em que a loja se apresenta. Atendimento primeiro porque é o
   que a SacraZen vende de verdade; o resto na ordem do que mais aparece
   no Instagram dela. */
const CATEGORIAS = [
  "Atendimentos",
  "Cristais",
  "Incensos e óleos",
  "Velas",
  "Tarô e oráculos",
  "Imagens e gnomos",
  "Altar e defumação",
  "Joias e guias",
  "Ervas e oferendas",
  "Roupas e bolsas indianas",
  "Doces e presentes",
  "Cursos",
  "Facas artesanais",
];

const MARCAS_DE_INCENSO = [
  "Noa",
  "Ananda",
  "Vila Zen",
  "Casa Rittua",
  "Nirvana",
  "Sagrada Madre",
  "Dharma",
  "Goloka",
  "Krishna",
  "Masala",
  "Saint Germain",
];

const slugDe = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

function marcaDe(nome: string): string | null {
  if (!/^incenso/i.test(nome)) return null;
  for (const m of MARCAS_DE_INCENSO) if (nome.toLowerCase().includes(m.toLowerCase())) return m;
  return null;
}

/* "Incenso Noa Signo Leão" vira "Signo Leão" na etiqueta? Não: o nome
   inteiro fica, porque é como a loja escreve. Só a cor sai para o campo
   `cores` quando o nome é de vela ("Vela palito roxa"). */
function coresDe(nome: string, categoria: string | null): string[] {
  if (categoria !== "Velas") return [];
  const m = nome.match(/vela (?:palito|7 dias|de|em)?\s*(.+)$/i);
  if (!m) return [];
  const cor = m[1].replace(/\s+c\s+/i, " com ").trim();
  /* só vira cor o que É cor: "Vela palito roxa" sim, "Vela da Paixão" não */
  const CORES = /^(branca?|preta?|vermelha?|roxa?|azul|verde|amarela?|rosa|laranja|lilás|lilas|dourada?|prateada?|marrom|bege|cinza|violeta|vinho|salmão|salmao)(\s+(e|com)\s+\S+)?$/i;
  return CORES.test(cor) ? [cor] : [];
}

async function principal() {
  const { supabase, dono } = prepararOficina();
  const sharp = (await import("sharp")).default;
  const loja = await acharLoja(supabase, dono, arroba, false);

  const [{ data: ativosCrus }, { data: produtosCrus }] = await Promise.all([
    supabase.from("prod_ativos").select("*").eq("loja_id", loja.id),
    supabase.from("prod_produtos").select("*").eq("loja_id", loja.id).order("ordem"),
  ]);
  const ativos = new Map(((ativosCrus as Ativo[]) ?? []).map((a) => [a.id, a]));
  const produtos = ((produtosCrus as Produto[]) ?? []).filter((p) => p.ativo_id && ativos.has(p.ativo_id));
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL}/storage/v1/object/public/producao/`;

  const pastaFotos = path.join(destino, "public", "produtos");
  fs.mkdirSync(pastaFotos, { recursive: true });
  fs.mkdirSync(path.join(destino, "data"), { recursive: true });

  const cache = new Map<string, { url: string; largura: number; altura: number; blur: string }>();
  async function foto(ativoId: string, slug: string, sufixo = ""): Promise<{ url: string; largura: number; altura: number; blur: string } | null> {
    const a = ativos.get(ativoId);
    if (!a) return null;
    if (cache.has(a.id)) return cache.get(a.id)!;
    const nome = `${slug}${sufixo}.webp`;
    const alvo = path.join(pastaFotos, nome);
    let buf: Buffer;
    if (fs.existsSync(alvo)) {
      buf = fs.readFileSync(alvo);
    } else {
      const r = await fetch(base + a.caminho);
      if (!r.ok) return null;
      buf = await sharp(Buffer.from(await r.arrayBuffer()))
        .rotate()
        .resize({ width: 1200, height: 1500, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      fs.writeFileSync(alvo, buf);
    }
    const meta = await sharp(buf).metadata();
    const blur = `data:image/webp;base64,${(await sharp(buf).resize(12, 12, { fit: "inside" }).webp({ quality: 40 }).toBuffer()).toString("base64")}`;
    const f = { url: `/produtos/${nome}`, largura: meta.width ?? 0, altura: meta.height ?? 0, blur };
    cache.set(a.id, f);
    return f;
  }

  type Foto = { url: string; largura: number; altura: number; blur: string; alt: string; ordem: number };
  type Saida = {
    id: string; codigo: string; nome: string; slug: string; descricao: string | null; marca: string | null;
    preco: number | null; preco_promocional: number | null; categoria_slug: string | null; tamanhos: string[]; cores: string[];
    destaque: boolean; ativo: boolean; ordem: number; imagens: Foto[];
  };
  const usados = new Set<string>();
  const saidaProdutos: Saida[] = [];
  let n = 0;
  for (const p of produtos) {
    let slug = slugDe(p.nome);
    if (usados.has(slug)) slug = `${slug}-${++n}`;
    usados.add(slug);

    const capa = await foto(p.ativo_id!, slug);
    if (!capa) continue;
    const imagens = [{ ...capa, alt: p.nome, ordem: 0 }];
    for (const [i, extra] of (p.fotos_extras ?? []).entries()) {
      const f = await foto(extra, slug, `-${i + 2}`);
      if (f) imagens.push({ ...f, alt: p.nome, ordem: i + 1 });
    }

    saidaProdutos.push({
      id: `p-${String(saidaProdutos.length + 1).padStart(3, "0")}`,
      codigo: `${prefixoCodigo}-${String(saidaProdutos.length + 1).padStart(4, "0")}`,
      nome: p.nome,
      slug,
      descricao: p.descricao,
      marca: p.marca ?? marcaDe(p.nome),
      /* a oficina guarda "de/por" como preco_de + preco; a vitrine lê
         preco (cheio) + preco_promocional (vigente) */
      preco: p.preco_de ?? p.preco,
      preco_promocional: p.preco_de ? p.preco : null,
      categoria_slug: p.categoria ? slugDe(p.categoria) : null,
      tamanhos: p.tamanhos ? p.tamanhos.split(/\s*[,/]\s*/).filter(Boolean) : [],
      cores: p.cor ? [p.cor] : coresDe(p.nome, p.categoria),
      destaque: p.destaque,
      ativo: true,
      ordem: p.destaque ? (p.ordem_destaque ?? 999) : 1000 + p.ordem,
      imagens,
    });
    if (saidaProdutos.length % 40 === 0) console.log(`  ${saidaProdutos.length} peças...`);
  }

  const nomesCategorias = [...new Set(produtos.map((p) => p.categoria).filter(Boolean) as string[])];
  const preferidas = ordemPedida ?? CATEGORIAS;
  const ordenadas = [
    ...preferidas.filter((c) => nomesCategorias.includes(c)),
    ...nomesCategorias.filter((c) => !preferidas.includes(c)).sort((a, b) => a.localeCompare(b, "pt")),
  ];
  const categorias = ordenadas.map((nome, i) => {
    const slug = slugDe(nome);
    const dentro = saidaProdutos.filter((p) => p.categoria_slug === slug).sort((a, b) => a.ordem - b.ordem);
    const capa = dentro[0]?.imagens[0];
    return { id: `c-${slug}`, nome, slug, ordem: i + 1, ativo: true, capa: capa?.url ?? null, capaBlur: capa?.blur ?? null };
  });

  const hero = saidaProdutos
    .filter((p) => p.destaque)
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => ({ ...p.imagens[0], slug: p.slug }));

  fs.writeFileSync(
    path.join(destino, "data", "catalogo.json"),
    `${JSON.stringify({ categorias, produtos: saidaProdutos, hero }, null, 2)}\n`,
    "utf8",
  );
  console.log(`${saidaProdutos.length} peças, ${categorias.length} categorias, ${hero.length} no hero → ${path.join(destino, "data", "catalogo.json")}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
