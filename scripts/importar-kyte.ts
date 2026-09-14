/* ============================================================
   IMPORTAR KYTE — o catálogo que a loja já publica entra na oficina

   Algumas lojas têm um catálogo Kyte (kyte.site) que o Google conhece e a
   bio do Instagram não mostra. Ele é a ÚNICA fonte de preço que não
   depende de perguntar ao cliente, e vem com foto de cada peça. Este
   script pega a lista exportada da página (ver o formato abaixo) e faz
   dela produtos da oficina:

   - a foto ORIGINAL do CDN do Kyte (1,5 MB cada) é redimensionada para
     1200px e vai para o bucket `producao`, como ativo de tipo KYTE (a
     leitura de catálogo por IA não precisa passar por ele: já tem nome e
     preço);
   - o produto nasce REVISADO, porque nome e preço vieram da própria
     loja, e revisado é o que sobrevive a uma releitura do catálogo;
   - a categoria é inferida do nome (a lista do Kyte veio sem categoria);
   - item sem foto e item esgotado ficam de fora, e são listados no fim.

   O ARQUIVO DE ENTRADA é o texto que sai da página do Kyte pela consola
   (uma linha por produto, campos separados por espaço):

     <id> <nome...> <preço> <ABOVE_MIN|NOT_CONTROLLED|OUT_OF_STOCK> [estoque] [uuid da foto] [variantes nome=preço|...]

   Dependência sob demanda (não fica no package.json):
     npm i --no-save sharp

   USO:
     npx tsx scripts/importar-kyte.ts sacrazen catalogo-sacrazen/kyte-bruto.txt
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { acharLoja, arrobaDe, prepararOficina } from "./oficina-cli";

const arroba = arrobaDe(process.argv[2] || "");
const arquivo = process.argv[3];
if (!arroba || !arquivo) {
  console.error("Uso: npx tsx scripts/importar-kyte.ts <arroba> <arquivo.txt>");
  process.exit(1);
}

/* O id da conta Kyte está dentro de cada URL de imagem; a lista exportada
   traz só o uuid. Fica aqui como constante da loja porque muda por loja. */
const CONTA_KYTE = "QSUTjRuahpTc74CryPLzcFUY8UD3";
const CDN = `https://images-cdn.kyte.site/v0/b/kyte-7c484.appspot.com/o/${CONTA_KYTE}%2F`;
const LOJA_KYTE = "https://sacrazen.kyte.site/pt-BR";

type Linha = {
  id: string;
  nome: string;
  preco: number | null;
  status: string;
  estoque: number | null;
  uuid: string | null;
  variantes: { nome: string; preco: number }[];
};

const RE =
  /^(\S+) (.+?) (\d+(?:\.\d+)?) (ABOVE_MIN|NOT_CONTROLLED|OUT_OF_STOCK)(?: (-?\d+))?(?: ([0-9a-f]{8}-[0-9a-f-]{27}))?(?: (.+))?$/;

function ler(texto: string): Linha[] {
  const linhas: Linha[] = [];
  for (const bruta of texto.split(/\r?\n/)) {
    const l = bruta.trim();
    if (!l) continue;
    const m = l.match(RE);
    if (!m) {
      console.warn(`  linha sem forma: ${l.slice(0, 80)}`);
      continue;
    }
    const preco = Number(m[3]);
    const variantes = (m[7] ?? "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => {
        const i = v.lastIndexOf("=");
        return { nome: v.slice(0, i).trim(), preco: Number(v.slice(i + 1)) };
      })
      .filter((v) => Number.isFinite(v.preco));
    linhas.push({
      id: m[1].replace(/-QSUT$/, ""),
      nome: m[2].trim(),
      /* preço abaixo de R$ 3 num incenso ou numa vela de 7 dias é erro de
         digitação no Kyte (0.18, 1.05): fica nulo em vez de virar etiqueta */
      preco: preco > 0 && !(preco < 3 && !/palito|pemba/i.test(m[2])) ? preco : null,
      status: m[4],
      estoque: m[5] != null ? Number(m[5]) : null,
      uuid: m[6] ?? null,
      variantes,
    });
  }
  return linhas;
}

/* A categoria pelo nome, na ordem em que as regras se sobrepõem: "Incensário
   de Buda" é altar, não incenso, por isso altar testa antes. */
function categoriaDe(nome: string): string {
  const n = nome.toLowerCase();
  if (/faca|adaga/.test(n)) return "Facas artesanais";
  if (/incens[áa]rio|tur[íi]bulo|defumador|defumação|alguidar|pemba|copo de barro|xícara|prato|panelinha/.test(n))
    return "Altar e defumação";
  if (/^incenso|^óleo/.test(n)) return "Incensos e óleos";
  if (/^vela/.test(n)) return "Velas";
  if (/tarô|oráculo|pano para tarot|diário/.test(n)) return "Tarô e oráculos";
  if (/gnom|duende|bruxinh|fadinha|elefante|^imagens|varinha/.test(n)) return "Imagens e gnomos";
  if (/pedra|ponteira|drusa|gluster|lâmina|liminar|calcita|selenita|turmalina|chakras|rosa do deserto|caveira citrino|árvore/.test(n))
    return "Cristais";
  if (/an[ée]is|colar|pulseira|conjunto|guia/.test(n)) return "Joias e guias";
  if (/vestido|bolsa/.test(n)) return "Roupas e bolsas indianas";
  if (/caixa mágica/.test(n)) return "Doces e presentes";
  return "Ervas e oferendas";
}

function descricaoDe(l: Linha): string | null {
  const partes: string[] = [];
  const precos = [...new Set(l.variantes.map((v) => v.preco).filter((p) => p > 0))].sort((a, b) => a - b);
  if (l.variantes.length > 1 && precos.length > 1) {
    partes.push(`${l.variantes.length} opções, de R$ ${precos[0]} a R$ ${precos[precos.length - 1]}`);
  } else if (l.variantes.length > 1) {
    partes.push(`${l.variantes.length} opções`);
  }
  if (l.preco === null) partes.push("preço a conferir com a loja");
  return partes.length ? partes.join(". ") + "." : null;
}

async function principal() {
  const { supabase, dono } = prepararOficina();
  const sharp = (await import("sharp")).default;
  const loja = await acharLoja(supabase, dono, arroba, false);

  const linhas = ler(fs.readFileSync(path.resolve(arquivo), "utf8"));
  const esgotados = linhas.filter((l) => l.status === "OUT_OF_STOCK");
  const semFoto = linhas.filter((l) => l.status !== "OUT_OF_STOCK" && !l.uuid);
  const validos = linhas.filter((l) => l.status !== "OUT_OF_STOCK" && l.uuid);
  console.log(`${linhas.length} linhas: ${validos.length} entram, ${semFoto.length} sem foto, ${esgotados.length} esgotados.`);

  const { data: jaTem } = await supabase.from("prod_ativos").select("id,media_id").eq("loja_id", loja.id);
  const conhecidos = new Map(((jaTem as { id: string; media_id: string }[]) ?? []).map((a) => [a.media_id, a.id]));
  const { data: produtosJa } = await supabase.from("prod_produtos").select("ativo_id").eq("loja_id", loja.id);
  const comProduto = new Set(((produtosJa as { ativo_id: string | null }[]) ?? []).map((p) => p.ativo_id));

  let novos = 0;
  let falhas = 0;
  for (const [i, l] of validos.entries()) {
    const media_id = `kyte_${l.id}`;
    let ativo_id = conhecidos.get(media_id) ?? null;

    if (!ativo_id) {
      const r = await fetch(`${CDN}${l.uuid}.jpg?alt=media`);
      if (!r.ok) {
        falhas++;
        console.warn(`  sem imagem: ${l.nome}`);
        continue;
      }
      const original = Buffer.from(await r.arrayBuffer());
      const bytes = await sharp(original).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
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
          permalink: LOJA_KYTE,
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
      marca: null,
      cor: null,
      fotos_extras: null,
      preco: l.preco,
      preco_de: null,
      tamanhos: null,
      categoria: categoriaDe(l.nome),
      descricao: descricaoDe(l),
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
  if (semFoto.length) console.log(`Sem foto (não entraram): ${semFoto.map((l) => `${l.nome} R$ ${l.preco ?? "?"}`).join("; ")}`);
  if (esgotados.length) console.log(`Esgotados (não entraram): ${esgotados.map((l) => l.nome).join("; ")}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
