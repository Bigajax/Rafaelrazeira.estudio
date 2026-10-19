/* ============================================================
   BAIXAR O CHECK-IN DAS FOTOS (14/10/2026)

   Traz para o PC o que o dono mandou em /checkin/<token>, uma pasta por
   parte da vitrine, e junta as anotações dele ("modelo, numeração,
   valor") num notas.txt em cada pasta. Só baixa o que ainda não está lá,
   então pode rodar quantas vezes quiser.

   Destino: ~/Desktop/vitrines/_fotos/<slug>/checkin/<categoria>/

   USO:
     unset ANTHROPIC_API_KEY; npx tsx scripts/baixar-checkin.ts mm-calcados
   ============================================================ */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ARQUIVO_LOJA, BUCKET_CHECKIN, CHECKINS } from "../lib/checkin";

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

async function principal() {
  carregarEnv();
  const slug = process.argv[2];
  const c = Object.values(CHECKINS).find((x) => x.slug === slug);
  if (!c) throw new Error(`Loja sem check-in: ${slug ?? "(nenhuma)"}. As que existem: ${Object.values(CHECKINS).map((x) => x.slug).join(", ")}`);

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Falta SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local do estúdio.");
  const st = createClient(url, chave, { auth: { persistSession: false } }).storage.from(BUCKET_CHECKIN);

  const raiz = path.join(os.homedir(), "Desktop", "vitrines", "_fotos", c.slug, "checkin");
  let novas = 0;
  for (const k of c.categorias) {
    const { data, error } = await st.list(`${c.slug}/${k.id}`, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    const fotos = (data ?? []).filter((a) => a.id && !a.name.endsWith(".json"));
    if (!fotos.length) continue;

    const pasta = path.join(raiz, k.id);
    fs.mkdirSync(pasta, { recursive: true });
    const notas: string[] = [];
    for (const a of fotos) {
      const destino = path.join(pasta, a.name);
      if (!fs.existsSync(destino)) {
        const { data: blob, error: e } = await st.download(`${c.slug}/${k.id}/${a.name}`);
        if (e || !blob) throw e ?? new Error(`não baixou ${a.name}`);
        fs.writeFileSync(destino, Buffer.from(await blob.arrayBuffer()));
        novas++;
      }
      if ((data ?? []).some((b) => b.name === `${a.name}.json`)) {
        const { data: j } = await st.download(`${c.slug}/${k.id}/${a.name}.json`);
        const lido = j ? JSON.parse(await j.text()) : {};
        const nota = String(lido.nota ?? "").trim();
        /* desde 19/10 a ficha pode vir em campos (nome, marca, cores...): um por linha */
        const campos = Object.entries((lido.campos ?? {}) as Record<string, string>)
          .filter(([, v]) => String(v).trim())
          .map(([k, v]) => `${k}: ${String(v).trim()}`)
          .join(" | ");
        const texto = [nota, campos].filter(Boolean).join(" | ");
        if (texto) notas.push(`${a.name}: ${texto}`);
      }
    }
    fs.writeFileSync(path.join(pasta, "notas.txt"), notas.join("\n") + (notas.length ? "\n" : ""));
    console.log(`${k.nome}: ${fotos.length} foto(s), ${notas.length} com anotação`);
  }
  /* as respostas da loja (as perguntas do check-in), se houver */
  if (c.perguntas) {
    const { data: j } = await st.download(`${c.slug}/${ARQUIVO_LOJA}`);
    if (j) {
      const r = (JSON.parse(await j.text()).respostas ?? {}) as Record<string, string>;
      const linhas = c.perguntas.map((p) => `${p.rotulo}\n  ${(r[p.chave] ?? "").trim() || "(sem resposta)"}`);
      fs.mkdirSync(raiz, { recursive: true });
      fs.writeFileSync(path.join(raiz, "respostas-da-loja.txt"), linhas.join("\n\n") + "\n");
      console.log(`Respostas da loja: ${c.perguntas.filter((p) => (r[p.chave] ?? "").trim()).length} de ${c.perguntas.length}`);
    }
  }
  console.log(`\n${novas} nova(s) em ${raiz}`);
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
