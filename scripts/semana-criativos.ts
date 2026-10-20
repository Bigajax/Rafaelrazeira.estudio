/* ============================================================
   A SEGUNDA-FEIRA DOS CRIATIVOS (19/10/2026)

   A fase 4 do docs/plano-performance-criativos.md: um comando só que
   1. roda as três leituras (ler-meta, ler-pagina, ler-curvas) gravando;
   2. escreve a leitura da semana com as mesmas contas da tela
      (lib/performance/criativos.ts): a frase, a semana contra a anterior,
      o que cortar, o que olhar e o que está funcionando.
   Com --avisar, a leitura vai também para o Telegram do Rafael (o mesmo bot
   dos avisos de lead, TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID).

   USO:
     npx tsx scripts/semana-criativos.ts
     npx tsx scripts/semana-criativos.ts --sem-ler      (só a leitura, sem buscar de novo)
     npx tsx scripts/semana-criativos.ts --avisar
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  agruparCriativos,
  avisosDaConta,
  ligarCRM,
  semanaContraAnterior,
  type Conta,
  type LinhaAnuncio,
  type LinhaDia,
  type LinhaLead,
  type LinhaPagina,
  type LinhaRecebimento,
} from "../lib/performance/criativos";

function carregarEnv() {
  const arquivo = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (!linha.includes("=") || linha.trim().startsWith("#")) continue;
    const i = linha.indexOf("=");
    const chave = linha.slice(0, i).trim();
    if (!process.env[chave]) process.env[chave] = linha.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const reais = (v: number | null) => (v == null ? "–" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

async function principal() {
  carregarEnv();
  const banco = { url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, ""), chave: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" };
  const dono = process.env.CRM_OWNER_ID ?? "";
  if (!banco.url || !banco.chave || !dono) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRM_OWNER_ID.");

  /* 1. as três leituras, gravando */
  if (!process.argv.includes("--sem-ler")) {
    for (const script of ["ler-meta.ts", "ler-pagina.ts", "ler-curvas.ts"]) {
      console.log(`\n── ${script} ──`);
      execFileSync("npx", ["tsx", path.join("scripts", script), "--gravar"], { stdio: "inherit", shell: true });
    }
  }

  /* 2. a leitura, do banco, com as contas da tela */
  const cab = { apikey: banco.chave, Authorization: `Bearer ${banco.chave}` };
  const ler = async <T>(q: string): Promise<T[]> => {
    const r = await fetch(`${banco.url}/rest/v1/${q}${q.includes("?") ? "&" : "?"}owner_id=eq.${dono}`, { headers: cab });
    if (!r.ok) throw new Error(`Não leu ${q.split("?")[0]} (${r.status}). Rodou o supabase/ads-criativos.sql?`);
    return r.json();
  };
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const desde = new Date(Date.parse(hoje) - 29 * 864e5).toISOString().slice(0, 10);
  const [contas, anuncios, dias, paginas, leads, recebimentos] = await Promise.all([
    ler<Conta>("ads_conta?select=nome,status,motivo,gasto_vida,ultimo_gasto_em,lido_em"),
    ler<LinhaAnuncio>("ads_anuncios?select=ad_id,nome,status,conjunto,campanha,utm_content,destino"),
    ler<LinhaDia>("ads_meta_dia?select=ad_id,dia,gasto,impressoes,plays_3s,thruplay,cliques_link,lpv,formularios,checkouts,compras&limit=10000"),
    ler<LinhaPagina>("ads_pagina_dia?select=utm_content,pagina,dia,visitantes,interagiram,comecaram,enviaram&limit=10000"),
    ler<LinhaLead>("crm_leads?select=id,anuncio,estagio,created_at&anuncio=not.is.null&limit=10000"),
    ler<LinhaRecebimento>("crm_recebimentos?select=lead_id,valor,valor_estornado,estornado_em,recebido_em,utm:bruto->metadata->>utm_content&limit=10000"),
  ]);

  const criativos = ligarCRM(agruparCriativos(anuncios, dias.filter((d) => d.dia >= desde)), anuncios, paginas, leads, recebimentos, desde, hoje).filter((g) => g.gasto > 0);
  const s = semanaContraAnterior(dias, leads, anuncios, hoje);
  const gasto = criativos.reduce((t, g) => t + g.gasto, 0);
  const form = criativos.reduce((t, g) => t + g.formularios, 0);
  const clientes = criativos.reduce((t, g) => t + g.clientes, 0);
  const receita = criativos.reduce((t, g) => t + g.receita, 0);

  const linhas: string[] = [];
  linhas.push(`CRIATIVOS · semana de ${s.esta.de.slice(8, 10)}/${s.esta.de.slice(5, 7)} a ${s.esta.ate.slice(8, 10)}/${s.esta.ate.slice(5, 7)}`);
  for (const a of avisosDaConta(contas[0] ?? null, anuncios, hoje)) linhas.push(`${a.nivel === "vermelho" ? "🔴" : "🟡"} ${a.texto}`);
  linhas.push(
    `Semana: ${reais(s.esta.gasto)} (antes ${reais(s.antes.gasto)}), ${s.esta.formularios} formulários (antes ${s.antes.formularios}), ${s.esta.leads} leads no CRM (antes ${s.antes.leads}).`,
  );
  linhas.push(
    `30 dias: ${reais(gasto)} em ${criativos.length} criativos, ${form} formulários${form ? ` a ${reais(gasto / form)}` : ""}, ${clientes} clientes, ${reais(receita)} recebidos.`,
  );
  for (const [nivel, titulo] of [
    ["vermelho", "CORTAR"],
    ["amarelo", "OLHAR"],
    ["verde", "FUNCIONANDO"],
  ] as const) {
    const lista = criativos.filter((g) => g.conselho.nivel === nivel);
    if (lista.length) linhas.push(`${titulo}:\n${lista.map((g) => `  · ${g.nome}: ${g.conselho.texto}`).join("\n")}`);
  }
  const texto = linhas.join("\n");
  console.log(`\n${texto}`);

  if (process.argv.includes("--avisar")) {
    const bot = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
    if (!bot || !chat) throw new Error("Para --avisar: TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no .env.local.");
    const r = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: `${texto}\n\nhttps://rafaelrazeira.com.br/crm/performance/criativos` }),
    });
    console.log(r.ok ? "\nMandado no Telegram." : `\nO Telegram recusou (${r.status}).`);
  }
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
