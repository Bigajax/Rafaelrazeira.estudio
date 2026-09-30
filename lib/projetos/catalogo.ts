/* ============================================================
   O CATÁLOGO DE UMA VITRINE, LIDO DO SITE NO AR

   Para montar o checklist do cliente, o CRM precisa das peças da vitrine
   dele. O catálogo da oficina não serve (30/09/2026): a Japa tinha 42
   peças lá e 70 no site, e a Full Time nem passou pela oficina. A chave do
   Supabase de cada vitrine também não, porque as vitrines leem o banco no
   servidor e a chave nunca chega ao navegador.

   O que toda vitrine do molde publica, e o Google lê, é:
     /sitemap.xml          as categorias (/catalogo/x) e as peças (/produto/y)
     /catalogo/<x>         quais peças são daquela categoria, e o nome dela
     /produto/<y>          o JSON-LD Product: nome, marca e fotos

   Vitrine de outra geração, sem peça no sitemap (a Arena), devolve lista
   vazia: o checklist sai só com as perguntas gerais e "peças que faltam".
   ============================================================ */

export type Grade = "roupa" | "calca" | "unico" | "tenis" | "shape";

export type CatalogoLido = {
  categorias: { slug: string; nome: string; grades: Grade[] }[];
  pecas: { id: string; nome: string; cat: string; catNome: string; foto: string }[];
};

/* A grade de tamanho que a categoria pede, pelo nome dela. O que não bate
   em nada fica sem grade: o checklist mostra todas e o "outro". */
export function gradesDa(texto: string): Grade[] {
  const t = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  /* uma categoria pode pedir mais de uma ("Calças, bermudas e bonés") */
  const g: Grade[] = [];
  if (/camis|molet|blusa|polo|jaqueta|casaco|vestido|regata|cropped|body|top|roupa|conjunto|cueca|corta|calca|bermuda|short|jeans/.test(t)) g.push("roupa");
  if (/calca|bermuda|short|jeans/.test(t)) g.push("calca");
  if (/tenis|sapat|chinel|slide|bota|calcad|sandal|chuteira/.test(t)) g.push("tenis");
  if (/shape|skate|montad|deck/.test(t)) g.push("shape");
  if (/bone|acessor|meia|oculos|mochila|bolsa|carteira|bag/.test(t)) g.push("unico");
  return g;
}

const TEMPO = 12000;
async function texto(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TEMPO);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store", redirect: "follow" });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(t);
  }
}

/* Faz N buscas de cada vez: 70 peças em fila levariam um minuto. */
async function aos(n: number, itens: string[], fn: (x: string) => Promise<void>) {
  const fila = [...itens];
  await Promise.all(Array.from({ length: n }, async () => {
    while (fila.length) await fn(fila.shift()!);
  }));
}

const decodificar = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

export async function lerCatalogo(siteBruto: string): Promise<CatalogoLido> {
  const site = siteBruto.replace(/\/$/, "");
  const origem = new URL(site).origin;
  const mapa = await texto(`${origem}/sitemap.xml`);
  const locs = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  /* o sitemap pode escrever o domínio novo (a Japa escreve o .com.br) com o
     site ainda na Vercel: o caminho vale, o host a gente troca */
  const caminho = (u: string) => {
    try { return new URL(u).pathname; } catch { return u; }
  };
  const catSlugs = [...new Set(locs.map(caminho).filter((p) => /^\/catalogo\/[^/]+$/.test(p)).map((p) => p.split("/")[2]))];
  const pecaSlugs = [...new Set(locs.map(caminho).filter((p) => /^\/produto\/[^/]+$/.test(p)).map((p) => p.split("/")[2]))];

  const categorias: CatalogoLido["categorias"] = [];
  const catDaPeca = new Map<string, string>();
  await aos(6, catSlugs, async (slug) => {
    const html = await texto(`${origem}/catalogo/${slug}`);
    if (!html) return;
    const titulo = decodificar(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? slug).split(/ [·|–-] /)[0];
    categorias.push({ slug, nome: titulo, grades: gradesDa(`${slug} ${titulo}`) });
    for (const m of html.matchAll(/href="\/produto\/([^"/?#]+)"/g)) if (!catDaPeca.has(m[1])) catDaPeca.set(m[1], slug);
  });
  categorias.sort((a, b) => catSlugs.indexOf(a.slug) - catSlugs.indexOf(b.slug));

  const pecas: CatalogoLido["pecas"] = [];
  await aos(16, pecaSlugs, async (slug) => {
    const html = await texto(`${origem}/produto/${slug}`);
    let nome = slug.replace(/-/g, " ");
    let foto = "";
    for (const m of html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
      try {
        const j = JSON.parse(m[1]);
        if (j["@type"] === "Product") {
          nome = String(j.name || nome);
          const img = Array.isArray(j.image) ? j.image[0] : j.image;
          /* o endereço completo que vem por último: a Japa publica
             "https://dominio.com.brhttps://x.supabase.co/..." (30/09) */
          const partes = img ? String(img).split(/(?=https?:\/\/)/) : [];
          const ultimo = partes[partes.length - 1] || "";
          if (ultimo) foto = /^https?:\/\//.test(ultimo) ? ultimo : origem + (ultimo.startsWith("/") ? "" : "/") + ultimo;
        }
      } catch {
        /* JSON-LD quebrado: fica o nome do endereço */
      }
    }
    const cat = catDaPeca.get(slug) ?? "";
    pecas.push({ id: slug, nome, cat, catNome: categorias.find((c) => c.slug === cat)?.nome ?? "Outras", foto });
  });

  /* na ordem das categorias do site, e dentro delas na ordem do sitemap */
  const ordemCat = (c: string) => {
    const i = categorias.findIndex((x) => x.slug === c);
    return i < 0 ? 999 : i;
  };
  pecas.sort((a, b) => ordemCat(a.cat) - ordemCat(b.cat) || pecaSlugs.indexOf(a.id) - pecaSlugs.indexOf(b.id));
  return { categorias, pecas };
}
