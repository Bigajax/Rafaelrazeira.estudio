/* ============================================================
   COMPILAR PROMPT — o briefing da vitrine, pela linha de comando

   O mesmo `compilar` do botão da oficina (lib/producao/compilador.ts),
   para o dia em que a ficha foi preenchida na conversa em vez de na tela.
   Aceita um JSON de ficha que é APLICADO na loja antes de compilar (os
   quatro blocos do prod_lojas mais as estrelas do catálogo), guarda a
   versão em prod_prompts como o botão faria, e escreve o markdown num
   arquivo para colar no agente.

   USO:
     npx tsx scripts/compilar-prompt.ts sacrazen
     npx tsx scripts/compilar-prompt.ts sacrazen --ficha catalogo-sacrazen/ficha.json
     npx tsx scripts/compilar-prompt.ts sacrazen --completa

   O JSON da ficha, todos os blocos opcionais:
     {
       "identidade": { "paleta": ["#…"], "fundo": "escuro", "superficie": "grafite-grao", "tipografia": "…", "observacoes": "…" },
       "conceito":   { "tom": "…", "cta": "…", "publico": "…", "promessa": "…", "autoridade": ["…"], "evitar": "…", "proibidas": ["…"] },
       "condicoes":  { "frete": "…", "pagamento": "…", "retirada": "…", "troca": "…" },
       "forma":      { …campos de Forma… },
       "destaques":  ["nome exato do produto", "…"]   // vira a ordem do hero
     }
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { acharLoja, arrobaDe, prepararOficina } from "./oficina-cli";
import type { Ativo, Produto } from "@/lib/producao/tipos";

const argv = process.argv.slice(2);
const arroba = arrobaDe(argv.find((a) => !a.startsWith("--")) || "");
const fichaEm = (() => {
  const i = argv.indexOf("--ficha");
  return i >= 0 ? argv[i + 1] : null;
})();
const modo = argv.includes("--completa") ? "completa" : "previa";
if (!arroba) {
  console.error("Passe o arroba: npx tsx scripts/compilar-prompt.ts <arroba> [--ficha ficha.json] [--completa]");
  process.exit(1);
}

async function principal() {
  const { supabase, dono } = prepararOficina();
  const { compilar } = await import("@/lib/producao/compilador");
  const { urlDoAtivo } = await import("@/lib/producao/oficina");
  const { FORMA_VAZIA, inferirDoCatalogo, layoutDe, heroDe, HERO_VAZIO } = await import("@/lib/producao/forma");

  let loja = await acharLoja(supabase, dono, arroba, false);

  /* ---------- a ficha vinda da conversa ---------- */
  if (fichaEm) {
    const ficha = JSON.parse(fs.readFileSync(path.resolve(fichaEm), "utf8")) as {
      identidade?: Record<string, unknown>;
      conceito?: Record<string, unknown>;
      condicoes?: Record<string, unknown>;
      forma?: Record<string, unknown>;
      destaques?: string[];
    };
    const patch: Record<string, unknown> = {};
    if (ficha.identidade) patch.identidade = { ...(loja.identidade ?? {}), ...ficha.identidade };
    if (ficha.conceito) patch.conceito = { ...(loja.conceito ?? {}), ...ficha.conceito };
    if (ficha.condicoes) patch.condicoes = { ...(loja.condicoes ?? {}), ...ficha.condicoes };
    if (ficha.forma) patch.forma = { ...FORMA_VAZIA, ...(loja.forma ?? {}), ...ficha.forma };
    if (Object.keys(patch).length) {
      const { error } = await supabase.from("prod_lojas").update(patch).eq("id", loja.id);
      if (error) throw new Error(`Não gravou a ficha: ${error.message}`);
      console.log(`Ficha aplicada: ${Object.keys(patch).join(", ")}.`);
    }

    if (ficha.destaques?.length) {
      const { data: todos } = await supabase.from("prod_produtos").select("id,nome").eq("loja_id", loja.id);
      const porNome = new Map(((todos as { id: string; nome: string }[]) ?? []).map((p) => [p.nome, p.id]));
      await supabase.from("prod_produtos").update({ destaque: false, ordem_destaque: null }).eq("loja_id", loja.id);
      let n = 0;
      for (const [i, nome] of ficha.destaques.entries()) {
        const id = porNome.get(nome);
        if (!id) {
          console.warn(`  destaque sem produto com esse nome: "${nome}"`);
          continue;
        }
        await supabase.from("prod_produtos").update({ destaque: true, ordem_destaque: i + 1 }).eq("id", id);
        n++;
      }
      console.log(`${n} estrelas no hero.`);
    }

    loja = await acharLoja(supabase, dono, arroba, false);
  }

  const [{ data: ativos }, { data: produtos }] = await Promise.all([
    supabase.from("prod_ativos").select("*").eq("loja_id", loja.id).order("ordem"),
    supabase.from("prod_produtos").select("*").eq("loja_id", loja.id).order("ordem"),
  ]);
  const lista = (produtos as Produto[]) ?? [];
  const urls: Record<string, string> = {};
  for (const a of (ativos as Ativo[]) ?? []) urls[a.id] = urlDoAtivo(a.caminho);
  const urlDaImagem = (p: Produto) => (p.ativo_id ? urls[p.ativo_id] ?? "" : "");
  const material = ((ativos as Ativo[]) ?? []).filter((a) => a.tipo === "MATERIAL").map((a) => urlDoAtivo(a.caminho));

  /* Sem forma na ficha, a mesma inferência que a tela faz ao abrir a aba:
     o compilado sai com a seção 4 em vez de sem ela. Fica gravada para a
     tela mostrar o mesmo que foi para o agente. */
  if (!loja.forma?.layout) {
    const inferida = { ...FORMA_VAZIA, ...(loja.forma ?? {}), ...inferirDoCatalogo(lista) };
    inferida.layout = inferida.layout ?? layoutDe(inferida);
    inferida.hero = inferida.hero ?? { ...HERO_VAZIO, arquetipo: heroDe(inferida) };
    await supabase.from("prod_lojas").update({ forma: inferida }).eq("id", loja.id);
    loja = { ...loja, forma: inferida };
    console.log(`Forma inferida do catálogo: ${inferida.layout}, hero ${inferida.hero?.arquetipo}.`);
  }

  const markdown = compilar(loja, lista, urlDaImagem, modo, material);

  const { error } = await supabase.from("prod_prompts").insert({
    owner_id: dono,
    loja_id: loja.id,
    markdown,
    snapshot: {
      identidade: loja.identidade,
      conceito: loja.conceito,
      condicoes: loja.condicoes,
      forma: loja.forma,
      lugar: loja.lugar,
      status: loja.status,
    },
    modo,
  });
  if (error) throw new Error(`Não guardou a versão: ${error.message}`);

  const pasta = `catalogo-${loja.arroba}`;
  fs.mkdirSync(pasta, { recursive: true });
  const saida = path.join(pasta, `prompt-${modo}.md`);
  fs.writeFileSync(saida, markdown, "utf8");
  console.log(`Prompt (${modo}) com ${markdown.length} caracteres guardado em prod_prompts e escrito em ${saida}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
