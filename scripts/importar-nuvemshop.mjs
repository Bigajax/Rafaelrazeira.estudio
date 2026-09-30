/* ============================================================
   IMPORTAR DA NUVEMSHOP — o catálogo da loja, direto da loja dela

   POR QUE EXISTE: quando a loja já tem uma Nuvemshop no ar, o catálogo
   de verdade está lá, com preço, preço riscado, estoque POR TAMANHO e
   foto de estúdio. Ler as 80 fotos do Instagram seria adivinhar o que o
   site já diz. Nasceu na Ufa Skateshop (ufask8.com.br), 26/09/2026.

   COMO FUNCIONA, sem API e sem login (a loja é pública):
   1. Percorre /produtos/?page=N até a página vir vazia.
   2. Em cada peça lê o JSON-LD (nome, descrição, marca, categoria pelo
      breadcrumb) e o `data-variants` do formulário (preço, preço
      riscado, estoque de cada tamanho). As fotos são os links
      `-1024-1024` da galeria, que são SÓ as da peça (as dos
      "relacionados" vêm em outro tamanho).
   3. Grava direto na vitrine: `data/catalogo.json` e as fotos em
      `public/produtos`, com medidas e blur.

   O QUE ELE NÃO FAZ: não inventa. Peça sem nenhum tamanho em estoque
   fica fora. Parcelamento do site (Nuvem Pago) NÃO entra: ele vale no
   checkout da Nuvemshop, não num pedido fechado pelo WhatsApp.

   USO:
     node scripts/importar-nuvemshop.mjs <site> <pasta-da-vitrine> <CODIGO> [--fotos 3]
     node scripts/importar-nuvemshop.mjs https://www.ufask8.com.br ~/Desktop/vitrines/ufa-skateshop UF

   Educado com o site: uma requisição por vez, com pausa.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);

const [siteBruto, pastaBruta, codigo = "PC"] = process.argv.slice(2);
const iFotos = process.argv.indexOf("--fotos");
const MAX_FOTOS = iFotos > 0 ? Number(process.argv[iFotos + 1]) : 3;
if (!siteBruto || !pastaBruta) {
  console.error("Uso: node scripts/importar-nuvemshop.mjs <site> <pasta-da-vitrine> <CODIGO>");
  process.exit(1);
}
const SITE = siteBruto.replace(/\/$/, "");
const PASTA = path.resolve(pastaBruta.replace(/^~/, process.env.USERPROFILE || process.env.HOME || "~"));
const FOTOS = path.join(PASTA, "public", "produtos");
const PAUSA = 350;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function baixar(url, tipo = "text") {
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (vitrine; Rafael Razeira Estudio)" } });
    if (r.ok) return tipo === "buffer" ? Buffer.from(await r.arrayBuffer()) : r.text();
    await dormir(1500 * tentativa);
  }
  throw new Error(`falhou: ${url}`);
}

const desfazer = (s) => s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const slugDe = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* "TENIS HOCKS FLAT CORE BRANCO LILAC" -> "Tênis Hocks Flat Core Branco Lilac".
   A Nuvemshop guarda o nome em caixa alta; a vitrine lê melhor em título.
   Siglas curtas (GTX, UV, 5) ficam como estão. */
const ACENTOS = { tenis: "Tênis", bone: "Boné", calca: "Calça", bones: "Bonés", calcas: "Calças", oculos: "Óculos", acessorios: "Acessórios" };
function nomeBonito(s) {
  return s
    .trim()
    .split(/\s+/)
    .map((p) => {
      const baixa = p.toLowerCase();
      if (ACENTOS[baixa]) return ACENTOS[baixa];
      if (/^[A-Z0-9]{1,3}$/.test(p) && !/^(DE|DA|DO|E|X|EM)$/.test(p)) return p;
      if (/^(de|da|do|e|x|em)$/.test(baixa)) return baixa;
      return baixa.charAt(0).toUpperCase() + baixa.slice(1);
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

const TAMANHO = /^(\d{2}(\/\d{2})?|PP|P|M|G|GG|XG|XGG|EG|EGG|G1|G2|G3|U|UN|ÚNICO|UNICO|TAMANHO ÚNICO)$/i;

async function listarPecas() {
  const urls = new Set();
  for (let p = 1; p < 50; p++) {
    const html = await baixar(`${SITE}/produtos/?page=${p}`);
    /* a loja pode linkar sem o www que foi digitado (Movvo Style,
       28/09/2026: "https://movvostyle.com.br/produtos/..."): aceita os dois */
    const dominio = SITE.replace(/^https?:\/\/(www\.)?/, "").replace(/[.]/g, "\\.");
    const achados = [...html.matchAll(new RegExp(`href="(https?://(?:www\\.)?${dominio}/produtos/[a-z0-9-]+/)"`, "g"))].map((m) => m[1]);
    const antes = urls.size;
    achados.forEach((u) => urls.add(u));
    process.stdout.write(`página ${p}: ${achados.length} links\n`);
    if (!achados.length || urls.size === antes) break;
    await dormir(PAUSA);
  }
  return [...urls];
}

function lerPeca(html, url) {
  const lds = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const pagina = lds.find((j) => j["@type"] === "WebPage" && j.mainEntity);
  const produto = pagina?.mainEntity;
  if (!produto) return null;
  const trilha = pagina.breadcrumb?.itemListElement ?? [];
  const categoria = trilha.find((t) => t.position === 2)?.name ?? "Outros";

  const bruto = html.match(/data-variants="([^"]*)"/);
  const variantes = bruto ? JSON.parse(desfazer(bruto[1])) : [];
  if (!variantes.length) return null;

  /* qual opção é o tamanho: a que tem valores com cara de tamanho */
  const opcaoTamanho = [0, 1, 2].find((i) => variantes.some((v) => v[`option${i}`] && TAMANHO.test(String(v[`option${i}`]).trim())));
  const opcaoCor = [0, 1, 2].find((i) => i !== opcaoTamanho && variantes.some((v) => v[`option${i}`]));

  const disponiveis = variantes.filter((v) => v.available && (v.stock === null || v.stock > 0));
  if (!disponiveis.length) return null;

  const precos = disponiveis.map((v) => v.price_number).filter((n) => typeof n === "number");
  const riscados = disponiveis.map((v) => v.compare_at_price_number).filter((n) => typeof n === "number");
  const preco = precos.length ? Math.min(...precos) : null;
  const cheio = riscados.length ? Math.max(...riscados) : null;

  let tamanhos = [];
  let esgotados = [];
  if (opcaoTamanho !== undefined) {
    const todos = [...new Set(variantes.map((v) => String(v[`option${opcaoTamanho}`] ?? "").trim()).filter(Boolean))];
    const temAlgum = new Set(disponiveis.map((v) => String(v[`option${opcaoTamanho}`] ?? "").trim()));
    tamanhos = todos;
    esgotados = todos.filter((t) => !temAlgum.has(t));
  }
  const cores = opcaoCor !== undefined ? [...new Set(disponiveis.map((v) => String(v[`option${opcaoCor}`] ?? "").trim()).filter(Boolean))] : [];

  /* peça sem foto no site vem com o desenho de câmera da Nuvemshop
     (/assets/stores/img/no-photo): ela NÃO é foto, e a peça sai da vitrine
     se não sobrar nenhuma de verdade (2 na Ufa, 26/09/2026) */
  const fotos = [...new Set([...html.matchAll(/href="(\/\/dcdn[^"]+-1024-1024\.(?:webp|jpg|jpeg|png))"/g)].map((m) => "https:" + m[1]))].filter((f) => !f.includes("/assets/stores/img/no-photo"));

  const marcaBruta = produto.brand?.name ?? null;
  return {
    url,
    nome: nomeBonito(desfazer(produto.name)),
    descricao: produto.description ? desfazer(produto.description) : null,
    /* a Nuvemshop às vezes guarda a razão social no campo marca ("BRAVITTI
       COMERCIO"): marca só se ela aparece no nome da peça */
    marca: marcaBruta && produto.name.toLowerCase().includes(marcaBruta.toLowerCase().split(" ")[0]) ? nomeBonito(marcaBruta) : null,
    categoria: nomeBonito(categoria),
    preco: cheio && preco && cheio > preco ? cheio : preco,
    preco_promocional: cheio && preco && cheio > preco ? preco : null,
    tamanhos,
    esgotados,
    cores,
    fotos: fotos.slice(0, MAX_FOTOS),
  };
}

async function gravarFoto(url, base, i) {
  const buf = await baixar(url, "buffer");
  const nome = `${base}${i ? `-${i + 1}` : ""}.webp`;
  const destino = path.join(FOTOS, nome);
  const img = sharp(buf).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true });
  const saida = await img.webp({ quality: 82 }).toBuffer();
  fs.writeFileSync(destino, saida);
  const meta = await sharp(saida).metadata();
  const blur = "data:image/webp;base64," + (await sharp(saida).resize(10).webp({ quality: 40 }).toBuffer()).toString("base64");
  return { url: `/produtos/${nome}`, largura: meta.width, altura: meta.height, blur };
}

const urls = await listarPecas();
console.log(`${urls.length} peças no site. Lendo uma por uma...`);
fs.mkdirSync(FOTOS, { recursive: true });

const lidas = [];
let fora = 0;
for (const [i, url] of urls.entries()) {
  try {
    const peca = lerPeca(await baixar(url), url);
    if (peca) lidas.push(peca);
    else fora++;
  } catch (e) {
    console.warn(`  pulei ${url}: ${e.message}`);
    fora++;
  }
  if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${urls.length}`);
  await dormir(PAUSA);
}
console.log(`${lidas.length} com estoque, ${fora} fora (sem estoque ou sem dados).`);

/* categorias na ordem de quantidade: a que a loja mais tem vem primeiro */
const contagem = new Map();
lidas.forEach((p) => contagem.set(p.categoria, (contagem.get(p.categoria) ?? 0) + 1));
const nomesCat = [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);

const produtos = [];
const slugsUsados = new Set();
for (const [i, p] of lidas.entries()) {
  let slug = slugDe(p.nome);
  while (slugsUsados.has(slug)) slug += "-2";
  slugsUsados.add(slug);
  const imagens = [];
  for (const [j, f] of p.fotos.entries()) {
    try {
      imagens.push({ ...(await gravarFoto(f, slug, j)), alt: p.nome, ordem: j });
    } catch (e) {
      console.warn(`  foto ${f}: ${e.message}`);
    }
    await dormir(120);
  }
  if (!imagens.length) continue;
  produtos.push({
    id: `p-${String(i + 1).padStart(3, "0")}`,
    codigo: `${codigo}-${String(i + 1).padStart(4, "0")}`,
    nome: p.nome,
    slug,
    descricao: p.descricao,
    marca: p.marca,
    preco: p.preco,
    preco_promocional: p.preco_promocional,
    categoria_slug: slugDe(p.categoria),
    tamanhos: p.tamanhos,
    tamanhos_esgotados: p.esgotados,
    cores: p.cores,
    destaque: false,
    ativo: true,
    ordem: i,
    imagens,
    origem: p.url,
  });
  if ((i + 1) % 20 === 0) console.log(`  fotos: ${i + 1}/${lidas.length}`);
}

const categorias = nomesCat.map((nome, i) => {
  const capa = produtos.find((p) => p.categoria_slug === slugDe(nome))?.imagens[0];
  return { id: `c-${slugDe(nome)}`, nome, slug: slugDe(nome), ordem: i + 1, ativo: true, capa: capa?.url ?? null, capaBlur: capa?.blur ?? null };
});

fs.writeFileSync(path.join(PASTA, "data", "catalogo.json"), JSON.stringify({ categorias, produtos, hero: [] }, null, 2));
console.log(`Pronto: ${produtos.length} peças em ${categorias.length} categorias → ${path.join(PASTA, "data", "catalogo.json")}`);
console.log(categorias.map((c) => `  ${c.nome}: ${produtos.filter((p) => p.categoria_slug === c.slug).length}`).join("\n"));
