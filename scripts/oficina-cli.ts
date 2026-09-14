/* ============================================================
   A OFICINA PELA LINHA DE COMANDO: o que os dois scripts dividem

   colher-loja.ts e ler-catalogo.ts rodam os ciclos de
   lib/producao/oficina.ts sem sessão de navegador: a service role faz as
   vezes do RLS e o CRM_OWNER_ID faz as vezes do usuário logado (é o
   mesmo par que /api/lead usa para criar o card do lead). Aqui mora o
   que os dois precisam antes de começar: as variáveis do .env.local, o
   cliente, e achar (ou criar) a loja pelo arroba.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Loja } from "@/lib/producao/tipos";

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

/* "@Loja", "instagram.com/loja/" e "LOJA" precisam virar "loja": é a forma
   que prod_lojas guarda e que o índice único usa como trava. */
export function arrobaDe(bruto: string): string {
  return bruto
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?].*$/, "")
    .replace(/^@/, "")
    .toLowerCase();
}

export function prepararOficina(): { supabase: SupabaseClient; dono: string } {
  carregarEnv();
  const url = process.env.SUPABASE_URL || "";
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const dono = process.env.CRM_OWNER_ID || "";
  if (!url || !chave || !dono) {
    console.error("Faltam SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRM_OWNER_ID no .env.local");
    process.exit(1);
  }
  return { supabase: createClient(url, chave, { auth: { persistSession: false } }), dono };
}

/* Acha a loja pelo arroba; se não existe e `criar` está ligado, cria já
   amarrada ao card do CRM com o mesmo @ (o mais recente, se houver mais
   de um), que é o elo que depois move o lead para a etapa "previa". */
export async function acharLoja(
  supabase: SupabaseClient,
  dono: string,
  arroba: string,
  criar: boolean,
): Promise<Loja> {
  const { data: existente } = await supabase.from("prod_lojas").select("*").eq("arroba", arroba).maybeSingle<Loja>();
  if (existente) return existente;
  if (!criar) {
    console.error(`A loja @${arroba} não está na oficina. Colha primeiro: npx tsx scripts/colher-loja.ts ${arroba}`);
    process.exit(1);
  }

  const { data: card } = await supabase
    .from("crm_leads")
    .select("id, nome")
    .ilike("instagram", `%${arroba}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; nome: string }>();

  const { data: nova, error } = await supabase
    .from("prod_lojas")
    .insert({ owner_id: dono, arroba, lead_id: card?.id ?? null })
    .select("*")
    .single<Loja>();
  if (error || !nova) throw new Error(`Não criou a loja: ${error?.message}`);
  console.log(`Loja criada (${nova.id})${card ? `, vinculada ao card "${card.nome}"` : ", sem card no CRM"}.`);
  return nova;
}
