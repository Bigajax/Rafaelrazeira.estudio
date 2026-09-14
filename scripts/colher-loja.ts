/* ============================================================
   COLHER LOJA — a colheita da oficina, pela linha de comando

   O mesmo ciclo do botão "colher" de /crm/producao (perfil, Google Places,
   link da bio, fotos para o Storage, ativos), para quando a colheita
   precisa sair sem abrir o painel: um lead que respondeu "sim" no
   WhatsApp, por exemplo. Cria a loja se ela não existe e a vincula ao
   card do CRM com o mesmo arroba. Gasta UMA das 200 consultas por hora da
   Business Discovery.

   USO:
     npx tsx scripts/colher-loja.ts sacrazen
     npx tsx scripts/colher-loja.ts https://www.instagram.com/sacrazen/
   ============================================================ */

import { acharLoja, arrobaDe, prepararOficina } from "./oficina-cli";

const arroba = arrobaDe(process.argv[2] || "");
if (!arroba) {
  console.error("Passe o arroba ou a URL: npx tsx scripts/colher-loja.ts <arroba>");
  process.exit(1);
}

async function principal() {
  const { supabase, dono } = prepararOficina();
  /* importado depois do env, senão lib/producao/instagram.ts lê o token
     antes de ele existir */
  const { colheitaEmCurso, colherLoja } = await import("@/lib/producao/oficina");

  const loja = await acharLoja(supabase, dono, arroba, true);
  if (colheitaEmCurso(loja)) {
    console.error("Esta colheita já está rodando (pelo painel, provavelmente). Espere terminar.");
    process.exit(1);
  }
  if (loja.status !== "nova") console.log(`Loja já existe (status ${loja.status}); recolhendo.`);

  const { nota } = await colherLoja(supabase, loja, dono, (m) => console.log("  " + m));
  console.log(`Pronto: ${nota}`);

  const { data: depois } = await supabase
    .from("prod_lojas")
    .select("lugar, link_bio")
    .eq("id", loja.id)
    .single<{ lugar: { endereco?: string; telefone?: string } | null; link_bio: string | null }>();
  if (depois?.lugar) console.log(`Google: ${depois.lugar.endereco ?? ""} ${depois.lugar.telefone ?? ""}`.trim());
  if (depois?.link_bio) console.log(`Link da bio lido (${depois.link_bio.length} caracteres).`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
