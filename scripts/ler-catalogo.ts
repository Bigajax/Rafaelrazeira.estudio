/* ============================================================
   LER CATÁLOGO — as fotos colhidas viram produtos, pela linha de comando

   O mesmo ciclo do botão "ler catálogo" de /crm/producao: o modelo olha
   cada foto (e a legenda, quando existe), devolve nome, categoria, marca,
   cor e preço quando ele está escrito, e o carrossel vira uma peça só.
   Produto marcado como revisado no painel sobrevive à releitura.

   Precisa de ANTHROPIC_API_KEY no .env.local (sem ela cai no OpenRouter,
   sem visão). Custa alguns centavos de dólar por loja.

   USO:
     npx tsx scripts/ler-catalogo.ts sacrazen
   ============================================================ */

import { acharLoja, arrobaDe, prepararOficina } from "./oficina-cli";

const arroba = arrobaDe(process.argv[2] || "");
if (!arroba) {
  console.error("Passe o arroba: npx tsx scripts/ler-catalogo.ts <arroba>");
  process.exit(1);
}

async function principal() {
  const { supabase, dono } = prepararOficina();
  const { lerCatalogoDaLoja } = await import("@/lib/producao/oficina");

  const loja = await acharLoja(supabase, dono, arroba, false);
  console.log(`Lendo o catálogo de @${arroba} (${loja.nome ?? "sem nome"})...`);

  const { nota } = await lerCatalogoDaLoja(supabase, loja, dono);
  console.log(`Pronto: ${nota}`);

  const { data: produtos } = await supabase
    .from("prod_produtos")
    .select("nome, categoria, marca, cor, preco, fotos_extras")
    .eq("loja_id", loja.id)
    .order("ordem");
  for (const p of (produtos ?? []) as {
    nome: string;
    categoria: string | null;
    marca: string | null;
    cor: string | null;
    preco: number | null;
    fotos_extras: string[] | null;
  }[]) {
    const extras = p.fotos_extras?.length ? ` (+${p.fotos_extras.length} fotos)` : "";
    const preco = p.preco != null ? ` R$ ${p.preco}` : "";
    console.log(`  ${p.categoria ?? "?"} · ${p.nome}${p.marca ? ` · ${p.marca}` : ""}${p.cor ? ` · ${p.cor}` : ""}${preco}${extras}`);
  }
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
