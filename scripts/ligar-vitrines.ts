/* ============================================================
   LIGAR VITRINES — a pasta da área de trabalho como fonte da verdade

   O monte "Amostra no ar" do Hoje só enxerga a vitrine que a oficina
   ligou ao card (`prod_lojas.lead_id` + `prod_lojas.previa_url`). Em
   09/10/2026 eram 49 de umas 80 amostras da `~/Desktop/vitrines`: o
   resto se perdia porque o lead digitou o @ diferente no formulário
   ("@icônicashoesik" para a vitrine "iconicashoesik"), porque a vitrine
   foi feita fora da oficina, ou porque nunca houve card.

   O `conferir-vitrines.ts` parte das fichas do cofre, e 21 pastas não
   têm ficha e 13 fichas não têm o @. Este parte da PASTA, que é o que
   está no ar: lê o `data/site.config.ts` (ou `config/site.ts`) de cada
   uma e acha o card nesta ordem:
     1. a loja da oficina pelo @ (`prod_lojas.arroba` -> `lead_id`)
     2. o @ do card (`crm_leads.instagram`, normalizado)
     3. o WhatsApp pelos 8 últimos dígitos, NUNCA o do estúdio: a prévia
        usa o 44 99124-6187 como número da loja, e ele bateria com tudo
     4. o nome ou o @ parecido, só como SUGESTÃO, nunca ligado sozinho

   Fica de fora do lote: pasta sem config, cliente (`PREVIA = null`) e
   projeto antigo, que nem tem `PREVIA` (Xavier's, Star Point...).

   USO:
     npx tsx scripts/ligar-vitrines.ts                      # só relata
     npx tsx scripts/ligar-vitrines.ts --gravar             # liga o que bateu exato
     npx tsx scripts/ligar-vitrines.ts --gravar --aprovar a,b   # + os pares pelo nome aprovados
     npx tsx scripts/ligar-vitrines.ts --gravar --criar-cards   # + card para quem não tem

   O que ele nunca faz: trocar um `lead_id` que aponta para outro card,
   escrever por cima de um `previa_url`, gravar link que não respondeu ou
   que cai no login da Vercel (alias protegido, Padel&Co. 23/09).
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { arrobaDe, prepararOficina } from "./oficina-cli";

const GRAVAR = process.argv.includes("--gravar");
const CRIAR_CARDS = process.argv.includes("--criar-cards");
const iAprovar = process.argv.indexOf("--aprovar");
/* "pasta" aprova a única sugestão; "pasta#2" escolhe a segunda quando o
   relatório lista mais de uma (Importado Kids, 09/10). */
const APROVADOS = new Map(
  (iAprovar > 0 ? (process.argv[iAprovar + 1] ?? "").split(",") : [])
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [pasta, n] = s.split("#");
      return [pasta, n ? Number(n) : 0] as const;
    }),
);
const iFora = process.argv.indexOf("--fora");
const FORA = new Set(iFora > 0 ? (process.argv[iFora + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean) : []);

const CASA = process.env.USERPROFILE || process.env.HOME || "";
const VITRINES = path.join(CASA, "Desktop", "vitrines");
const COFRE = path.join(CASA, "Desktop", "rafaelrazeira.estúdio", "3 Clientes");
const ZAP_DO_ESTUDIO = "91246187";

type Config = { nome: string; ig: string; zap: string; previa: "amostra" | "cliente" | "antigo"; dominio: string };
type Lead = { id: string; nome: string; empresa: string | null; instagram: string | null; whatsapp: string | null; estagio: string };
type Loja = { id: string; arroba: string; lead_id: string | null; previa_url: string | null };

const fimDoZap = (z: string | null | undefined) => String(z ?? "").replace(/\D/g, "").slice(-8);
const soLetras = (s: string | null | undefined) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

function lerConfig(pasta: string): Config | null {
  const arquivo = ["data/site.config.ts", "data/site.ts", "config/site.ts", "site.config.ts", "src/config/site.ts"]
    .map((x) => path.join(pasta, x))
    .find((x) => fs.existsSync(x));
  if (!arquivo) return null;
  const t = fs.readFileSync(arquivo, "utf8");
  const pega = (re: RegExp) => (t.match(re) ?? [])[1] ?? "";
  return {
    nome: pega(/^\s*nome:\s*"([^"]+)"/m),
    ig: arrobaDe(pega(/instagram:\s*"([^"]+)"/)),
    zap: pega(/^\s*whatsapp:\s*"(\d+)"/m),
    previa: /export const PREVIA[^=]*=\s*null/.test(t) ? "cliente" : /export const PREVIA/.test(t) ? "amostra" : "antigo",
    dominio: pega(/const DOMINIO\s*=\s*"([^"]*)"/),
  };
}

/* O endereço que a ficha do cofre registrou, quando há ficha: é onde mora o
   alias certo dos projetos com sufixo ("samuelribeiro-wheat.vercel.app"). */
function sitesDoCofre(): Map<string, string> {
  const m = new Map<string, string>();
  if (!fs.existsSync(COFRE)) return m;
  for (const f of fs.readdirSync(COFRE)) {
    if (!f.startsWith("vitrine-")) continue;
    const t = fs.readFileSync(path.join(COFRE, f), "utf8");
    const ig = arrobaDe((t.match(/^instagram:[ \t]*(.*)$/m) ?? [])[1] ?? "");
    const site = ((t.match(/^site:[ \t]*(.*)$/m) ?? [])[1] ?? "").trim();
    if (site) {
      m.set(f.replace(/^vitrine-/, "").replace(/\.md$/, ""), site);
      if (ig) m.set("@" + ig, site);
    }
  }
  return m;
}

const comHttps = (s: string) => (s.startsWith("http") ? s : `https://${s}`).replace(/\/$/, "");

/* Vivo = respondeu 200 e não é a tela de login da Vercel. Erro de rede vira
   null, que o relatório trata como "não deu para conferir", nunca como
   "fora do ar". */
async function linkVivo(url: string): Promise<boolean | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    if (r.status !== 200) return false;
    const titulo = ((await r.text()).match(/<title>([^<]*)/i) ?? [])[1] ?? "";
    return !(/vercel/i.test(titulo) && /log ?in|sign ?in|authentication/i.test(titulo));
  } catch {
    return null;
  }
}

async function principal() {
  if (!fs.existsSync(VITRINES)) {
    console.error(`A pasta ${VITRINES} não existe.`);
    process.exit(1);
  }
  const { supabase, dono } = prepararOficina();
  const [{ data: lojas, error: e1 }, { data: leads, error: e2 }] = await Promise.all([
    supabase.from("prod_lojas").select("id, arroba, lead_id, previa_url").returns<Loja[]>(),
    supabase.from("crm_leads").select("id, nome, empresa, instagram, whatsapp, estagio").returns<Lead[]>(),
  ]);
  if (e1 || e2 || !lojas || !leads) throw new Error(`CRM indisponível: ${(e1 ?? e2)?.message}`);

  const lojaPorIg = new Map(lojas.map((l) => [arrobaDe(l.arroba), l]));
  const leadPorId = new Map(leads.map((l) => [l.id, l]));
  const cofre = sitesDoCofre();

  type Linha = { pasta: string; cfg: Config; grupo: string; card?: Lead; sugestoes?: Lead[]; loja?: Loja; url?: string; vivo?: boolean | null; acao?: string };
  const linhas: Linha[] = [];

  for (const d of fs.readdirSync(VITRINES, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith("_")) continue;
    const cfg = lerConfig(path.join(VITRINES, d.name));
    const base = { pasta: d.name, cfg: cfg ?? { nome: "", ig: "", zap: "", previa: "antigo" as const, dominio: "" } };
    if (!cfg) { linhas.push({ ...base, grupo: "fora: sem config" }); continue; }
    if (cfg.previa === "cliente") { linhas.push({ ...base, grupo: "fora: cliente (PREVIA null)" }); continue; }
    if (cfg.previa === "antigo") { linhas.push({ ...base, grupo: "fora: projeto antigo, sem PREVIA" }); continue; }
    if (FORA.has(d.name)) { linhas.push({ ...base, grupo: "fora: tirada à mão (--fora)" }); continue; }

    const loja = cfg.ig ? lojaPorIg.get(cfg.ig) : undefined;
    const viaLoja = loja?.lead_id ? leadPorId.get(loja.lead_id) : undefined;
    const viaIg = cfg.ig ? leads.filter((l) => arrobaDe(l.instagram ?? "") === cfg.ig) : [];
    const z = fimDoZap(cfg.zap);
    const viaZap = z.length === 8 && z !== ZAP_DO_ESTUDIO ? leads.filter((l) => fimDoZap(l.whatsapp) === z) : [];
    const exatos = [...new Map([viaLoja, ...viaIg, ...viaZap].filter((l): l is Lead => Boolean(l)).map((l) => [l.id, l])).values()];
    const chave = soLetras(cfg.ig || d.name).slice(0, 9);
    const parecidos =
      chave.length >= 5
        ? leads.filter((l) => [l.empresa, l.nome, l.instagram].some((x) => soLetras(x).includes(chave)))
        : [];

    /* O endereço: o DOMINIO escrito à mão vence, depois a ficha do cofre, o
       que a oficina já tem, e por último o nome do projeto na Vercel. */
    let projeto = "";
    try {
      projeto = JSON.parse(fs.readFileSync(path.join(VITRINES, d.name, ".vercel", "project.json"), "utf8")).projectName ?? "";
    } catch { /* sem .vercel: nunca subiu por esta pasta */ }
    const candidatos = [cfg.dominio, cofre.get(d.name), cofre.get("@" + cfg.ig), loja?.previa_url, projeto && `${projeto}.vercel.app`]
      .filter((x): x is string => Boolean(x))
      .map(comHttps);
    let url: string | undefined;
    let vivo: boolean | null = false;
    for (const c of [...new Set(candidatos)]) {
      const v = await linkVivo(c);
      if (v) { url = c; vivo = true; break; }
      if (v === null) vivo = null;
    }

    let grupo: string;
    if (viaLoja) grupo = loja?.previa_url ? "ok" : url ? "ligada, falta o link" : "ligada, sem deploy no ar";
    else if (exatos.length === 1) grupo = "card exato, falta ligar";
    else if (exatos.length > 1) grupo = "mais de um card (à mão)";
    else if (parecidos.length) grupo = "só pelo nome (aprovar)";
    else grupo = "sem card nenhum";
    linhas.push({ ...base, cfg, grupo, card: viaLoja ?? (exatos.length === 1 ? exatos[0] : undefined), sugestoes: exatos.length ? exatos : parecidos, loja, url, vivo });
  }

  /* ---------- gravar ---------- */
  const gravarLoja = async (l: Linha, leadId: string) => {
    const atual = l.loja ?? (await supabase.from("prod_lojas").select("id, arroba, lead_id, previa_url").eq("arroba", l.cfg.ig).maybeSingle<Loja>()).data ?? undefined;
    if (atual?.lead_id && atual.lead_id !== leadId) return `conflito: a loja @${l.cfg.ig} já é de outro card`;
    if (!atual) {
      const { error } = await supabase.from("prod_lojas").insert({ owner_id: dono, arroba: l.cfg.ig, lead_id: leadId, previa_url: l.url ?? null });
      return error ? `erro ao criar a loja: ${error.message}` : `loja criada e ligada${l.url ? ", com o link" : ", sem link (não respondeu)"}`;
    }
    const mudar: Record<string, string> = {};
    if (!atual.lead_id) mudar.lead_id = leadId;
    if (!atual.previa_url && l.url) mudar.previa_url = l.url;
    if (!Object.keys(mudar).length) return l.url ? "nada a mudar" : "sem link no ar";
    const { error } = await supabase.from("prod_lojas").update(mudar).eq("id", atual.id);
    return error ? `erro: ${error.message}` : `gravado: ${Object.keys(mudar).join(" e ")}`;
  };

  if (GRAVAR) {
    for (const l of linhas) {
      if (!l.cfg.ig) { if (!l.grupo.startsWith("fora")) l.acao = "sem @ no config: à mão"; continue; }
      if (l.grupo === "ok") continue;
      if ((l.grupo === "ligada, falta o link" || l.grupo === "card exato, falta ligar") && l.card) {
        l.acao = await gravarLoja(l, l.card.id);
      } else if (l.grupo === "só pelo nome (aprovar)" && APROVADOS.has(l.pasta)) {
        const n = APROVADOS.get(l.pasta) ?? 0;
        const card = n ? l.sugestoes?.[n - 1] : l.sugestoes?.length === 1 ? l.sugestoes[0] : undefined;
        if (!card) { l.acao = "aprovada, mas há mais de um parecido: aprove com pasta#n"; continue; }
        const { error } = await supabase.from("crm_leads").update({ instagram: "@" + l.cfg.ig }).eq("id", card.id);
        l.acao = error ? `erro no @ do card: ${error.message}` : `@ do card corrigido; ${await gravarLoja(l, card.id)}`;
      } else if (l.grupo === "sem card nenhum" && CRIAR_CARDS) {
        const z = fimDoZap(l.cfg.zap);
        const zap = z.length === 8 && z !== ZAP_DO_ESTUDIO ? l.cfg.zap.replace(/\D/g, "") : null;
        const { data: novo, error } = await supabase
          .from("crm_leads")
          .insert({ owner_id: dono, nome: l.cfg.nome || "@" + l.cfg.ig, empresa: l.cfg.nome || null, instagram: "@" + l.cfg.ig, whatsapp: zap, origem: "prospeccao", estagio: "previa", tipo_projeto: "vitrine" })
          .select("id")
          .single<{ id: string }>();
        l.acao = error || !novo ? `erro ao criar o card: ${error?.message}` : `card criado${zap ? "" : " (sem WhatsApp)"}; ${await gravarLoja(l, novo.id)}`;
      }
    }
  }

  /* ---------- quem tem a prévia no ar vai para a etapa Prévia ----------
     Pedido do Rafael em 09/10: "avança para a prévia todos que estão com a
     prévia". É a mesma regra que a oficina aplica ao exportar
     (acoes-producao.ts): só sobe quem está ANTES da prévia; proposta,
     negociação e ganho nunca voltam para trás, e perdido/geladeira ficam
     onde o Rafael os pôs. Roda no fim, depois das ligações acima, para
     pegar também as vitrines que acabaram de ganhar card. */
  const ANTES_DA_PREVIA = ["lista", "contatado", "follow_up", "conversa"];
  const avancados: string[] = [];
  if (GRAVAR) {
    const { data: comLink } = await supabase
      .from("prod_lojas")
      .select("arroba, lead_id")
      .not("previa_url", "is", null)
      .not("lead_id", "is", null)
      .returns<{ arroba: string; lead_id: string }[]>();
    const ids = (comLink ?? []).map((l) => l.lead_id);
    const { data: atras } = ids.length
      ? await supabase.from("crm_leads").select("id, nome, estagio").in("id", ids).in("estagio", ANTES_DA_PREVIA).returns<{ id: string; nome: string; estagio: string }[]>()
      : { data: [] as { id: string; nome: string; estagio: string }[] };
    for (const l of atras ?? []) {
      const { error } = await supabase.from("crm_leads").update({ estagio: "previa" }).eq("id", l.id).in("estagio", ANTES_DA_PREVIA);
      avancados.push(`${l.nome} (${l.estagio} -> previa)${error ? `: erro ${error.message}` : ""}`);
    }
  }

  /* ---------- relatório ---------- */
  const ordem = ["ok", "ligada, falta o link", "card exato, falta ligar", "só pelo nome (aprovar)", "sem card nenhum", "mais de um card (à mão)", "ligada, sem deploy no ar"];
  const grupos = [...new Set(linhas.map((l) => l.grupo))].sort((a, b) => (ordem.indexOf(a) + 1 || 99) - (ordem.indexOf(b) + 1 || 99));
  console.log(`${linhas.length} pastas em ${VITRINES}\n`);
  for (const g of grupos) {
    const doGrupo = linhas.filter((l) => l.grupo === g);
    console.log(`${g.toUpperCase()} (${doGrupo.length})`);
    if (g === "ok") { console.log(""); continue; }
    for (const l of doGrupo) {
      const sug = l.sugestoes?.length ? `  card: ${l.sugestoes.slice(0, 3).map((c) => `${c.empresa || c.nome} [${c.instagram ?? "sem @"}, ${c.estagio}]`).join(" | ")}` : "";
      const link = l.grupo.startsWith("fora") ? "" : `  link: ${l.url ?? (l.vivo === null ? "não deu para conferir" : "nenhum no ar")}`;
      console.log(`   ${l.pasta}  @${l.cfg.ig || "?"}${link}${sug}${l.acao ? `\n      -> ${l.acao}` : ""}`);
    }
    console.log("");
  }
  if (GRAVAR) {
    console.log(`AVANÇARAM PARA A PRÉVIA (${avancados.length})`);
    for (const a of avancados) console.log(`   ${a}`);
  }
  if (!GRAVAR) console.log("(só relatório: nada foi gravado. --gravar liga o que bateu exato e avança para a Prévia quem tem link.)");
}

principal().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
