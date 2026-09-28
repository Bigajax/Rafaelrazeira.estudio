/* ============================================================
   FOTOS DO BANNER: as candidatas para os 3 banners do topo da vitrine

   Desde 28/09/2026 toda vitrine abre com a campanha de 3 banners da Japa
   Modas (o `_molde` já traz o carrossel). A arte sai do gerador de imagem
   do Rafael, a partir de uma foto REAL da loja. Este script separa essas
   fotos: pega o que a colheita já trouxe, TIRA TODO VÍDEO (a capa de reel
   é um quadro de vídeo, borrado e comprimido, e o gerador aumenta o
   defeito junto), ordena pela resolução e monta folhas de contato
   numeradas para escolher olhando.

   A escolha é de olho, e segue a ordem da nota `fazer-uma-vitrine`:
   1. PESSOA: o dono, um cliente, alguém vestindo a peça;
   2. sem pessoa, a PEÇA mais nítida (o tênis, a camiseta), inteira e sem
      texto por cima;
   3. nunca vídeo, nunca arte de post com letra, nunca print.

   USO:
     npx tsx scripts/fotos-do-banner.ts <arroba> <pasta da vitrine>

   Grava em <pasta da vitrine>/banners/: candidatas/NN.jpg (o arquivo
   original, do tamanho que o Instagram entregou), folha-1.jpg, folha-2.jpg
   (24 miniaturas numeradas por folha) e lista.json.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { acharLoja, arrobaDe, prepararOficina } from "./oficina-cli";
import type { Ativo } from "@/lib/producao/tipos";

const arroba = arrobaDe(process.argv[2] || "");
const vitrine = process.argv[3] ? path.resolve(process.argv[3].replace(/^~/, process.env.USERPROFILE || process.env.HOME || "")) : "";
if (!arroba || !vitrine) {
  console.error("Uso: npx tsx scripts/fotos-do-banner.ts <arroba> <pasta da vitrine>");
  process.exit(1);
}

/* abaixo disso o banner de 2400px sai esticado: fica de fora da folha */
const MENOR_LADO = 640;
const POR_FOLHA = 24;
const MINI = 260;

type Candidata = {
  n: number;
  arquivo: string;
  largura: number;
  altura: number;
  curtidas: number | null;
  data: string | null;
  legenda: string;
  link: string | null;
};

async function principal() {
  const { supabase, dono } = prepararOficina();
  const sharp = (await import("sharp")).default;
  const loja = await acharLoja(supabase, dono, arroba, false);

  const { data } = await supabase.from("prod_ativos").select("*").eq("loja_id", loja.id);
  const ativos = ((data as Ativo[]) ?? []).filter((a) => a.tipo !== "VIDEO");
  const videos = ((data as Ativo[]) ?? []).length - ativos.length;
  if (!ativos.length) {
    console.error(`Nenhuma foto de @${arroba} na oficina (${videos} vídeos descartados). Colha primeiro, ou pagine: scripts/paginar-instagram.ts`);
    process.exit(1);
  }

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL}/storage/v1/object/public/producao/`;
  const baixadas: (Omit<Candidata, "n" | "arquivo"> & { buf: Buffer })[] = [];
  let pequenas = 0;
  for (const a of ativos) {
    const r = await fetch(base + a.caminho);
    if (!r.ok) continue;
    const buf = await sharp(Buffer.from(await r.arrayBuffer())).rotate().jpeg({ quality: 95 }).toBuffer();
    const meta = await sharp(buf).metadata();
    const largura = meta.width ?? 0;
    const altura = meta.height ?? 0;
    if (Math.min(largura, altura) < MENOR_LADO) {
      pequenas++;
      continue;
    }
    baixadas.push({
      buf,
      largura,
      altura,
      curtidas: a.curtidas,
      data: a.publicado_em?.slice(0, 10) ?? null,
      legenda: (a.legenda ?? "").replace(/\s+/g, " ").slice(0, 140),
      link: a.permalink,
    });
  }

  /* a maior primeiro; no empate de tamanho (o Instagram entrega quase tudo
     em 1080), a mais curtida, que costuma ser a foto mais bem feita */
  baixadas.sort((x, y) => y.largura * y.altura - x.largura * x.altura || (y.curtidas ?? 0) - (x.curtidas ?? 0));

  const saida = path.join(vitrine, "banners");
  const pasta = path.join(saida, "candidatas");
  fs.rmSync(pasta, { recursive: true, force: true });
  fs.mkdirSync(pasta, { recursive: true });

  const lista: Candidata[] = baixadas.map((b, i) => {
    const n = i + 1;
    const arquivo = `${String(n).padStart(2, "0")}.jpg`;
    fs.writeFileSync(path.join(pasta, arquivo), b.buf);
    return { n, arquivo: `candidatas/${arquivo}`, largura: b.largura, altura: b.altura, curtidas: b.curtidas, data: b.data, legenda: b.legenda, link: b.link };
  });
  fs.writeFileSync(path.join(saida, "lista.json"), `${JSON.stringify(lista, null, 2)}\n`, "utf8");

  /* as folhas de contato: 6 colunas, o número grande no canto de cada uma */
  for (let f = 0; f * POR_FOLHA < lista.length; f++) {
    const lote = lista.slice(f * POR_FOLHA, (f + 1) * POR_FOLHA);
    const colunas = 6;
    const linhas = Math.ceil(lote.length / colunas);
    const pecas = await Promise.all(
      lote.map(async (c, i) => {
        const mini = await sharp(path.join(saida, c.arquivo)).resize(MINI, MINI, { fit: "cover", position: "attention" }).toBuffer();
        const rotulo = Buffer.from(
          `<svg width="${MINI}" height="${MINI}"><rect x="0" y="0" width="58" height="34" fill="#000"/><text x="9" y="25" font-family="Arial" font-size="22" font-weight="700" fill="#fff">${c.n}</text></svg>`,
        );
        const quadro = await sharp(mini).composite([{ input: rotulo, top: 0, left: 0 }]).toBuffer();
        return { input: quadro, top: Math.floor(i / colunas) * (MINI + 6), left: (i % colunas) * (MINI + 6) };
      }),
    );
    await sharp({ create: { width: colunas * (MINI + 6), height: linhas * (MINI + 6), channels: 3, background: "#ffffff" } })
      .composite(pecas)
      .jpeg({ quality: 85 })
      .toFile(path.join(saida, `folha-${f + 1}.jpg`));
  }

  console.log(
    `${lista.length} fotos candidatas em ${saida}` +
      ` (${videos} vídeos e ${pequenas} fotos pequenas demais ficaram de fora).` +
      `\nFolhas: ${Math.ceil(lista.length / POR_FOLHA)}. Escolher: pessoa primeiro; sem pessoa, a peça mais nítida.`,
  );
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
