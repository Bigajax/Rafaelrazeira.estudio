/* ============================================================
   ANALISAR AS VITRINES QUE PAGARAM (14/10/2026)

   O Rafael: "o que está na minha mão": a saúde do site, a montagem, o
   catálogo, e os números que viram copy e anúncio. As checagens moram em
   lib/analise/checagens.ts; as lojas, em lib/analise/vitrines.ts.

   Roda no PC (precisa das pastas de ~/Desktop/vitrines). Só lê as lojas.

   USO:
     unset ANTHROPIC_API_KEY; npx tsx scripts/analisar-vitrines.ts
     unset ANTHROPIC_API_KEY; npx tsx scripts/analisar-vitrines.ts --gravar   (guarda para a aba Análise do CRM)
     unset ANTHROPIC_API_KEY; npx tsx scripts/analisar-vitrines.ts --loja japa-modas

   Uma vez por semana, junto do conferir-vitrines.ts.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { VITRINES } from "../lib/analise/vitrines";
import { analisarVitrine, numerosDoEstudio, versaoAtualDoPacote, type ResultadoLoja } from "../lib/analise/checagens";

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

const COR = { verde: "🟢", amarelo: "🟡", vermelho: "🔴" } as const;

async function principal() {
  carregarEnv();
  const central = { url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, ""), chave: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "" };
  if (!central.url || !central.chave) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local do estúdio.");

  const so = process.argv.includes("--loja") ? process.argv[process.argv.indexOf("--loja") + 1] : null;
  const gravar = process.argv.includes("--gravar");
  const versao = versaoAtualDoPacote();
  const lojas: ResultadoLoja[] = [];

  for (const v of VITRINES.filter((x) => !so || x.perf === so)) {
    process.stdout.write(`analisando ${v.nome}... `);
    const r = await analisarVitrine(v, central, versao);
    lojas.push(r);
    console.log(`saúde ${COR[r.notas.saude]}  montagem ${COR[r.notas.montagem]}  catálogo ${COR[r.notas.catalogo]}  (${r.achados.length} achados)`);
  }

  console.log("\nO QUE FAZER, do mais urgente:");
  const todos = lojas.flatMap((l) => l.achados.map((a) => ({ ...a, loja: l.nome }))).sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "vermelho" ? -1 : 1));
  for (const a of todos) console.log(`${COR[a.nivel]} ${a.loja}: ${a.texto}\n     → ${a.acao}`);

  const estudio = numerosDoEstudio(lojas);
  console.log(`\nNÚMEROS DOS ÚLTIMOS 30 DIAS (${estudio.lojas} lojas): ${estudio.pessoas} pessoas, ${estudio.pecasAbertas} peças abertas, ${estudio.chamaram} chamaram no WhatsApp.`);

  const resultado = { quando: new Date().toISOString(), versao_pacote: versao, lojas, estudio };
  fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "tmp", "analise-vitrines.json"), JSON.stringify(resultado, null, 2));

  if (gravar) {
    const r = await fetch(`${central.url}/rest/v1/perf_analises`, {
      method: "POST",
      headers: { apikey: central.chave, Authorization: `Bearer ${central.chave}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ resultado }),
    });
    console.log(r.ok ? "\nGravado: a aba Análise do CRM já mostra." : `\nNão gravou (${r.status}): ${await r.text()}. Rodou o supabase/perf-analises.sql?`);
  }
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
