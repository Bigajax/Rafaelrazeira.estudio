/* ============================================================
   GRAVAR DOSSIÊS — a segunda metade da pesquisa sem OpenRouter

   O par deste script é colher-fatos.ts: ele colhe de graça (perfil do
   Instagram, bio, link da bio aberto), os dossiês são escritos à mão em
   cima dos fatos conferidos, e este arquivo grava o resultado no banco
   com as MESMAS regras da rota /api/crm/pesquisa: o cadastro confirmado
   só preenche campo vazio, colisão de índice único descarta só o
   contato, e `cadastro_aplicado` registra o que entrou. Sem `custo_usd`
   de propósito: a nota da ficha sai só com a data, que é a assinatura de
   um dossiê escrito sem modelo.

   A entrada é um JSON com um array de objetos `{ id, ...campos do
   Dossie }`. O `id` é o do lead; o resto vai para a coluna `dossie` como
   está, com `status: "ok"` e `gerado_em` carimbados aqui.

   USO:
     npx tsx scripts/gravar-dossies.ts --entrada dossies.json
     npx tsx scripts/gravar-dossies.ts --entrada dossies.json --seco
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { emailNormal, soDigitos } from "@/lib/crm/regras";
import type { Dossie, Lead } from "@/lib/crm/tipos";

function carregarEnv() {
  const arquivo = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    const chave = linha.slice(0, i).trim();
    if (process.env[chave]) continue;
    process.env[chave] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}
carregarEnv();

const argv = process.argv.slice(2);
const opcao = (nome: string) => {
  const i = argv.indexOf(`--${nome}`);
  return i === -1 ? null : (argv[i + 1] ?? null);
};
const SECO = argv.includes("--seco");
const ENTRADA = opcao("entrada");
if (!ENTRADA || !fs.existsSync(ENTRADA)) {
  console.error("Passe --entrada <arquivo.json> com o array de dossiês.");
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dono = process.env.CRM_OWNER_ID;
if (!url || !chave || !dono) {
  console.error("Faltam SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRM_OWNER_ID no .env.local.");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });

type Entrada = { id: string } & Omit<Dossie, "status" | "gerado_em">;

async function principal() {
  const entradas = JSON.parse(fs.readFileSync(ENTRADA!, "utf8")) as Entrada[];
  console.log(`${entradas.length} dossiês em ${ENTRADA}${SECO ? " · seco" : ""}`);

  for (const e of entradas) {
    const { data: lead, error } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", e.id)
      .eq("owner_id", dono)
      .single<Lead>();
    if (error || !lead) {
      console.log(`  PULO ${e.id} · lead não encontrado`);
      continue;
    }

    const { id: _id, cadastro, ...campos } = e;

    /* O cadastro confirmado só preenche campo VAZIO: o que o Rafael
       digitou é palavra final, e a pesquisa completa em vez de corrigir. */
    const patch: Record<string, string> = {};
    if (cadastro) {
      if (!lead.empresa && cadastro.empresa) patch.empresa = cadastro.empresa;
      if (!lead.instagram && cadastro.instagram) patch.instagram = cadastro.instagram;
      if (!lead.nicho && cadastro.nicho) patch.nicho = cadastro.nicho;
      if (!lead.cidade && cadastro.cidade) patch.cidade = cadastro.cidade;
      if (!lead.whatsapp && cadastro.whatsapp) {
        const zap = soDigitos(cadastro.whatsapp);
        if (zap && zap.length >= 10) patch.whatsapp = zap;
      }
      if (!lead.email && cadastro.email) {
        const email = emailNormal(cadastro.email);
        if (email) patch.email = email;
      }
    }

    if (SECO) {
      console.log(
        `  seco ${lead.nome} · ${e.veredito ?? "sem veredito"}` +
          `${Object.keys(patch).length ? ` · cadastro: ${Object.keys(patch).join(", ")}` : ""}`,
      );
      continue;
    }

    if (Object.keys(patch).length) {
      const primeira = await supabase.from("crm_leads").update(patch).eq("id", lead.id);
      if (primeira.error) {
        /* Índice único: o contato achado já é de outro lead. Ele fica de
           fora e o resto do cadastro entra. */
        delete patch.whatsapp;
        delete patch.email;
        if (Object.keys(patch).length) {
          const segunda = await supabase.from("crm_leads").update(patch).eq("id", lead.id);
          if (segunda.error) for (const campo of Object.keys(patch)) delete patch[campo];
        }
      }
    }

    const dossie: Dossie = {
      status: "ok",
      gerado_em: new Date().toISOString(),
      ...campos,
      cadastro,
      cadastro_aplicado: Object.keys(patch),
    };
    const grava = await supabase.from("crm_leads").update({ dossie }).eq("id", lead.id);
    if (grava.error) {
      console.log(`  ERRO ${lead.nome} · ${grava.error.message}`);
      continue;
    }
    console.log(
      `  ok   ${lead.nome} · ${e.veredito ?? "sem veredito"}` +
        `${Object.keys(patch).length ? ` · cadastro: ${Object.keys(patch).join(", ")}` : ""}`,
    );
  }
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
