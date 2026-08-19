/* ============================================================
   PESQUISAR EM LOTE — o botão "Pesquisar" da ficha, para uma fila inteira

   A rota /api/crm/pesquisa faz um lead por vez, porque é isso que a tela
   pede: você abre a ficha, dispara, a régua corre. Depois de um garimpo
   de duzentos e poucos leads isso vira duzentos e poucos cliques, e a
   fila do dia não começa enquanto não terminar.

   Este script é a MESMA pesquisa, em fila: importa `pesquisarLead` de
   lib/crm/pesquisa.ts, aplica o cadastro confirmado com as mesmas regras
   da rota e grava o mesmo formato de dossiê. Se um dia a pesquisa mudar,
   ele muda junto, porque não tem cópia de lógica nenhuma aqui dentro.

   ---------- por que a chave de serviço e não a sessão ----------
   A rota usa a chave anônima com o cookie do Rafael, e o RLS faz o resto.
   Um script de terminal não tem cookie, então ele usa a service role e
   filtra por `CRM_OWNER_ID` na mão. É a mesma escolha que /api/lead já
   faz para plantar inbound sem usuário logado.

   ---------- o que ele nunca faz ----------
   Não pesquisa quem já tem dossiê pronto. A trava é a fila de seleção
   (`dossie is null` ou status "erro"), e não uma checagem no meio do
   caminho: pesquisa repetida é dinheiro gasto duas vezes pelo mesmo
   texto. Rodar de novo depois de uma queda continua de onde parou.

   USO:
     npx tsx scripts/pesquisar-lote.ts --seco
     npx tsx scripts/pesquisar-lote.ts --limite 20 --nicho semijoias
     npx tsx scripts/pesquisar-lote.ts --tudo --concorrencia 4
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { pesquisarLead } from "@/lib/crm/pesquisa";
import { emailNormal, soDigitos } from "@/lib/crm/regras";
import type { Dossie, Lead, Template } from "@/lib/crm/tipos";

/* ---------- o ambiente, que o Next carrega sozinho e o terminal não ---------- */
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

/* ---------- os argumentos ---------- */
const argv = process.argv.slice(2);
const opcao = (nome: string) => {
  const i = argv.indexOf(`--${nome}`);
  return i === -1 ? null : (argv[i + 1] ?? null);
};
const tem = (nome: string) => argv.includes(`--${nome}`);

const SECO = tem("seco");
const LIMITE = Number(opcao("limite") ?? 0) || null;
const NICHO = opcao("nicho");
const CIDADE = opcao("cidade");
const CONCORRENCIA = Math.max(1, Math.min(6, Number(opcao("concorrencia") ?? 3)));

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dono = process.env.CRM_OWNER_ID;
if (!url || !chave || !dono) {
  console.error("Faltam SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRM_OWNER_ID no .env.local.");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });

/* ---------- a fila ---------- */
async function filaDePesquisa(): Promise<Lead[]> {
  let q = supabase.from("crm_leads").select("*").eq("owner_id", dono);
  if (NICHO) q = q.eq("nicho", NICHO);
  if (CIDADE) q = q.eq("cidade", CIDADE);

  const { data, error } = await q.order("created_at", { ascending: true }).returns<Lead[]>();
  if (error) throw new Error(error.message);

  /* O filtro do dossiê fica aqui e não no SQL porque `dossie` é jsonb e a
     condição é "vazio OU status erro OU pesquisando há mais de cinco
     minutos" (esta última é a mesma regra de pesquisa morta da rota). */
  const morta = (d: Dossie) =>
    d.status === "pesquisando" && Date.now() - new Date(d.gerado_em ?? 0).getTime() > 5 * 60 * 1000;

  const fila = (data ?? []).filter((l) => !l.dossie || l.dossie.status === "erro" || morta(l.dossie));
  return LIMITE ? fila.slice(0, LIMITE) : fila;
}

/* ---------- um lead, exatamente como a rota faz ---------- */
async function pesquisarUm(lead: Lead, templates: Template[]): Promise<number> {
  await supabase
    .from("crm_leads")
    .update({ dossie: { status: "pesquisando", gerado_em: new Date().toISOString() } })
    .eq("id", lead.id);

  try {
    const resultado = await pesquisarLead(lead, templates);

    /* O cadastro confirmado só preenche campo VAZIO: o que o Rafael
       digitou é palavra final, e a pesquisa completa em vez de corrigir. */
    const c = resultado.cadastro;
    const patch: Record<string, string> = {};
    if (c) {
      if (!lead.empresa && c.empresa) patch.empresa = c.empresa;
      if (!lead.instagram && c.instagram) patch.instagram = c.instagram;
      if (!lead.nicho && c.nicho) patch.nicho = c.nicho;
      if (!lead.cidade && c.cidade) patch.cidade = c.cidade;
      if (!lead.whatsapp && c.whatsapp) {
        const zap = soDigitos(c.whatsapp);
        if (zap && zap.length >= 10) patch.whatsapp = zap;
      }
      if (!lead.email && c.email) {
        const email = emailNormal(c.email);
        if (email) patch.email = email;
      }
    }

    if (Object.keys(patch).length) {
      const { error } = await supabase.from("crm_leads").update(patch).eq("id", lead.id);
      if (error) {
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
      ...resultado,
      cadastro_aplicado: Object.keys(patch),
    };
    await supabase.from("crm_leads").update({ dossie }).eq("id", lead.id);

    const custo = resultado.custo_usd ?? 0;
    console.log(
      `  ok   ${lead.nome} · ${resultado.veredito ?? "sem veredito"}` +
        `${resultado.abertura ? "" : " · SEM ABERTURA"} · US$ ${custo.toFixed(4)}`,
    );
    return custo;
  } catch (e) {
    const frase = e instanceof Error ? e.message : "A pesquisa falhou.";
    await supabase
      .from("crm_leads")
      .update({ dossie: { status: "erro", erro: frase, gerado_em: new Date().toISOString() } })
      .eq("id", lead.id);
    console.log(`  ERRO ${lead.nome} · ${frase.slice(0, 90)}`);
    return 0;
  }
}

/* ---------- o lote ---------- */
async function principal() {
  const fila = await filaDePesquisa();
  console.log(
    `fila: ${fila.length} leads sem dossiê` +
      `${NICHO ? ` · nicho "${NICHO}"` : ""}${CIDADE ? ` · cidade "${CIDADE}"` : ""}`,
  );
  if (!fila.length) return;

  if (SECO) {
    const porNicho = new Map<string, number>();
    for (const l of fila) porNicho.set(l.nicho ?? "(sem)", (porNicho.get(l.nicho ?? "(sem)") ?? 0) + 1);
    for (const [n, q] of [...porNicho].sort((a, b) => b[1] - a[1])) {
      console.log(String(q).padStart(4), n);
    }
    console.log("\nseco: nada foi pesquisado nem gravado.");
    return;
  }

  const { data: templates } = await supabase
    .from("crm_templates")
    .select("id, titulo, canal, categoria, conteudo, ordem")
    .eq("owner_id", dono)
    .order("ordem")
    .limit(3);

  const comeco = Date.now();
  let feitos = 0;
  let gasto = 0;

  /* Trabalhadores em paralelo puxando da mesma fila: com uma pesquisa
     levando de trinta segundos a dois minutos, sequencial seria mais de
     seis horas. Três ou quatro é o suficiente para não bater no limite
     do OpenRouter. */
  const proximo = (() => {
    let i = 0;
    return () => (i < fila.length ? fila[i++] : null);
  })();

  await Promise.all(
    Array.from({ length: CONCORRENCIA }, async () => {
      for (let lead = proximo(); lead; lead = proximo()) {
        gasto += await pesquisarUm(lead, (templates ?? []) as Template[]);
        feitos++;
        if (feitos % 10 === 0) {
          const min = (Date.now() - comeco) / 60000;
          console.log(
            `— ${feitos}/${fila.length} · US$ ${gasto.toFixed(2)} · ${min.toFixed(0)} min · ` +
              `faltam ~${((min / feitos) * (fila.length - feitos)).toFixed(0)} min`,
          );
        }
      }
    }),
  );

  console.log(
    `\npronto: ${feitos} pesquisas · US$ ${gasto.toFixed(2)} · ` +
      `${((Date.now() - comeco) / 60000).toFixed(0)} min`,
  );
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
