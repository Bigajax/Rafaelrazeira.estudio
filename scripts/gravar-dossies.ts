/* ============================================================
   GRAVAR DOSSIÊS — o caminho sem OpenRouter

   Quando o lote é grande (ou o crédito acabou), quem escreve os dossiês
   é a sessão do Claude Code: a colheita de fatos sai de graça
   (colher-fatos.ts + busca na web), os dossiês são escritos à mão no
   formato `Dossie` num JSON, e este script os grava com as MESMAS
   garantias por código da pesquisa automática. Foi o caminho do lote de
   38 tatuadores em 17/08, agora como script do projeto e não do
   scratchpad, porque virou o plano B permanente.

   As garantias, na ordem em que importam:
   1. A ABERTURA NÃO LEVA LINK: link no primeiro toque vira cartão de
      preview na lista de conversas, e é ele que denuncia propaganda.
   2. A SAUDAÇÃO NUNCA VAI ESCRITA: vira {saudacao}, que o modal resolve
      pelo relógio de Maringá na hora do envio.
   3. O EXEMPLO É VALIDADO contra data/portfolio.ts e o link dele é
      COLADO na mensagem se faltar: link de portfólio inventado seria o
      pior erro possível, e exemplo citado sem link é vitrine de porta
      fechada.
   4. O CADASTRO SÓ PREENCHE CAMPO VAZIO: o que o Rafael digitou é
      palavra final. Colisão de índice único (o WhatsApp achado já é de
      outro lead) tira o contato e deixa o resto entrar.

   USO:
     npx tsx scripts/gravar-dossies.ts caminho/dossies.json
     npx tsx scripts/gravar-dossies.ts caminho/dossies.json --seco

   O JSON é uma lista de entradas { id, ...campos do Dossie }; `status`,
   `gerado_em` e `cadastro_aplicado` são deste script, não do autor.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { projetos } from "@/data/portfolio";
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

const ARQUIVO = process.argv[2];
const SECO = process.argv.includes("--seco");
if (!ARQUIVO || !fs.existsSync(ARQUIVO)) {
  console.error("Uso: npx tsx scripts/gravar-dossies.ts <dossies.json> [--seco]");
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

/* ---------- as garantias, iguais às de lib/crm/pesquisa.ts ---------- */
const semSaudacaoFixa = (t: string) =>
  t.replace(/\b(bom dia|boa tarde|boa noite)\b/gi, (m) =>
    m[0] === m[0].toUpperCase() ? "{Saudacao}" : "{saudacao}",
  );

const semLink = (t: string) =>
  t
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b[\w-]+\.(vercel\.app|com\.br|com)(\/\S*)?\b/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

type Entrada = { id: string } & Omit<Dossie, "status" | "erro" | "gerado_em" | "cadastro_aplicado">;

async function principal() {
  const entradas = JSON.parse(fs.readFileSync(ARQUIVO, "utf8")) as Entrada[];
  console.log(`${entradas.length} dossiês em ${ARQUIVO}${SECO ? " (seco: nada será gravado)" : ""}`);

  let gravados = 0;
  let recusados = 0;

  for (const e of entradas) {
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", e.id)
      .eq("owner_id", dono)
      .single<Lead>();
    if (!lead) {
      console.log(`  RECUSADO ${e.id}: lead não existe ou não é do dono.`);
      recusados++;
      continue;
    }

    /* O exemplo validado contra o catálogo real: o que entra é sempre o
       nome e a url de data/portfolio.ts, nunca o que veio no JSON. */
    let exemplo: { nome: string; url: string } | undefined;
    if (e.exemplo) {
      const doCatalogo = projetos.find(
        (p) =>
          p.url &&
          (p.url === e.exemplo?.url ||
            p.nome.toLowerCase() === String(e.exemplo?.nome ?? "").trim().toLowerCase()),
      );
      if (doCatalogo?.url) exemplo = { nome: doCatalogo.nome, url: doCatalogo.url };
    }

    let abertura = e.abertura ? semLink(semSaudacaoFixa(e.abertura.trim())) : undefined;
    if (abertura && abertura.length > 220) {
      console.log(`  AVISO ${lead.nome}: abertura com ${abertura.length} caracteres, não cabe na notificação.`);
    }
    let mensagem = e.mensagem ? semSaudacaoFixa(e.mensagem.trim()) : undefined;
    if (mensagem && exemplo && !mensagem.includes(exemplo.url.replace(/^https?:\/\//, ""))) {
      mensagem = `${mensagem}\n\n${exemplo.url}`;
    }

    /* O cadastro só preenche campo vazio, com as normalizações da casa. */
    const patch: Record<string, string> = {};
    const c = e.cadastro;
    if (c) {
      if (!lead.empresa && c.empresa) patch.empresa = c.empresa;
      if (!lead.instagram && c.instagram) patch.instagram = c.instagram.replace(/^@/, "");
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

    const dossie: Dossie = {
      status: "ok",
      gerado_em: new Date().toISOString(),
      resumo: e.resumo,
      presenca: e.presenca,
      dor: e.dor ?? undefined,
      gancho: e.gancho ?? undefined,
      abertura: abertura || undefined,
      mensagem: mensagem || undefined,
      ticket_sugerido: typeof e.ticket_sugerido === "number" ? e.ticket_sugerido : null,
      fontes: e.fontes,
      cadastro: c ?? undefined,
      exemplo,
      veredito:
        e.veredito === "quente" || e.veredito === "morno" || e.veredito === "frio"
          ? e.veredito
          : undefined,
      veredito_motivo: e.veredito_motivo ?? undefined,
      cadastro_aplicado: Object.keys(patch),
    };

    if (SECO) {
      console.log(`  ok (seco) ${lead.nome} · ${dossie.veredito ?? "sem veredito"}`);
      gravados++;
      continue;
    }

    if (Object.keys(patch).length) {
      const { error } = await supabase.from("crm_leads").update(patch).eq("id", lead.id);
      if (error) {
        delete patch.whatsapp;
        delete patch.email;
        dossie.cadastro_aplicado = Object.keys(patch);
        if (Object.keys(patch).length) {
          await supabase.from("crm_leads").update(patch).eq("id", lead.id);
        }
      }
    }

    const { error } = await supabase.from("crm_leads").update({ dossie }).eq("id", lead.id);
    if (error) {
      console.log(`  ERRO ${lead.nome}: ${error.message}`);
      recusados++;
    } else {
      console.log(
        `  ok ${lead.nome} · ${dossie.veredito ?? "sem veredito"}` +
          `${dossie.abertura ? "" : " · sem mensagem (de propósito)"}` +
          `${dossie.cadastro_aplicado?.length ? ` · cadastro: ${dossie.cadastro_aplicado.join(", ")}` : ""}`,
      );
      gravados++;
    }
  }

  console.log(`\ngravados: ${gravados} · recusados: ${recusados}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
