/* ============================================================
   CONFERIR VITRINES — a ficha do cofre batida contra a realidade

   Memória de texto envelhece em silêncio: ninguém percebe, e o custo é
   direto. Em 23/09/2026 a primeira rodada disto achou DEZESSEIS vitrines
   no ar cuja ficha dizia "falta a Vercel". Dezesseis prévias prontas que
   nós duas achávamos que não existiam, cada uma um link que podia estar
   num WhatsApp.

   Por isso este script não reclama: ele CORRIGE a ficha e diz o que
   corrigiu. O que ele não conseguir conferir, ele declara em vez de
   chutar.

   O que confere, por vitrine:
     1. a URL responde?              -> acerta `status` e `site`
     2. a pasta local existe?        -> ~/Desktop/vitrines/<loja>
     3. ainda está em modo prévia?   -> PREVIA em data/site.config.ts
     4. a previa_url está no CRM?    -> prod_lojas.previa_url

   O cruzamento que vale dinheiro é o 1 + 4: vitrine no ar com a ficha
   da loja sem previa_url é prévia pronta que o CRM não sabe entregar.

   USO:
     npx tsx scripts/conferir-vitrines.ts            # confere e corrige
     npx tsx scripts/conferir-vitrines.ts --seco     # só relata
     npx tsx scripts/conferir-vitrines.ts --gravar-crm  # + grava a previa_url que falta

   O --gravar-crm é opt-in de propósito: ele escreve no banco. Só grava
   endereço que RESPONDEU agora, e só em ficha vazia, nunca por cima de
   uma que já tem link.
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { prepararOficina } from "./oficina-cli";

const SECO = process.argv.includes("--seco");
const GRAVAR_CRM = process.argv.includes("--gravar-crm");
const CASA = process.env.USERPROFILE || process.env.HOME || "";
const COFRE = path.join(CASA, "Desktop", "rafaelrazeira.estúdio", "3 Clientes");
const VITRINES = path.join(CASA, "Desktop", "vitrines");

type Ficha = {
  arquivo: string;
  slug: string;
  cliente: string;
  status: string;
  site: string;
  repo: string;
  instagram: string;
};

function lerCampo(texto: string, campo: string): string {
  const m = texto.match(new RegExp(`^${campo}:[ \\t]*(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

function trocarCampo(texto: string, campo: string, valor: string): string {
  const re = new RegExp(`^${campo}:[ \\t]*.*$`, "m");
  return re.test(texto) ? texto.replace(re, `${campo}: ${valor}`) : texto;
}

/* Um HEAD com prazo curto. Erro de rede não é "fora do ar": devolve null
   para o chamador não confundir as duas coisas. */
async function responde(url: string): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(url, { method: "GET", signal: ctrl.signal, redirect: "follow" });
    clearTimeout(t);
    return r.status;
  } catch {
    return null;
  }
}

async function principal() {
  if (!fs.existsSync(COFRE)) {
    console.error(`O cofre não está em ${COFRE}. Nada foi conferido.`);
    process.exit(1);
  }

  /* as fichas de vitrine do cofre (proposta e entrega não têm URL própria) */
  const fichas: Ficha[] = [];
  for (const arquivo of fs.readdirSync(COFRE).filter((f) => f.startsWith("vitrine-") && f.endsWith(".md"))) {
    const texto = fs.readFileSync(path.join(COFRE, arquivo), "utf8");
    fichas.push({
      arquivo,
      slug: arquivo.replace(/^vitrine-|\.md$/g, ""),
      cliente: lerCampo(texto, "cliente"),
      status: lerCampo(texto, "status"),
      site: lerCampo(texto, "site"),
      repo: lerCampo(texto, "repo"),
      instagram: lerCampo(texto, "instagram"),
    });
  }

  /* o que o CRM sabe: arroba -> previa_url */
  const previaPorArroba = new Map<string, string | null>();
  let oficina: ReturnType<typeof prepararOficina> | null = null;
  try {
    oficina = prepararOficina();
    const { data } = await oficina.supabase.from("prod_lojas").select("arroba, previa_url, status").eq("owner_id", oficina.dono);
    for (const l of (data ?? []) as { arroba: string; previa_url: string | null }[]) {
      previaPorArroba.set(l.arroba.toLowerCase(), l.previa_url);
    }
    console.log(`CRM: ${previaPorArroba.size} lojas na oficina\n`);
  } catch (e) {
    console.log(`CRM indisponível (${e instanceof Error ? e.message : e}). A conferência do previa_url fica de fora.\n`);
  }

  /* o que o --gravar-crm vai escrever: arroba -> url que respondeu agora */
  const aGravar = new Map<string, string>();

  const acertos: string[] = [];
  const entregar: string[] = [];
  const foraDoAr: string[] = [];
  const semPasta: string[] = [];
  const aindaPrevia: string[] = [];
  const naoDeuPraConferir: string[] = [];

  for (const f of fichas) {
    /* 1. a URL. Tenta o campo `site` E o endereço derivado do repo, porque
       o `site` às vezes guarda o site MORTO do cliente (uma Nuvemshop
       desativada, por exemplo), e não a vitrine. Vale a que responder. */
    const candidatos = [f.site, f.repo ? `${f.repo.split("/")[1]}.vercel.app` : ""].filter(Boolean);
    let noAr = false;
    let candidato = candidatos[0] ?? "";
    const falhas: string[] = [];
    for (const c of candidatos) {
      const codigo = await responde(c.startsWith("http") ? c : `https://${c}`);
      if (codigo !== null && codigo >= 200 && codigo < 400) { noAr = true; candidato = c; break; }
      falhas.push(`${c}: ${codigo === null ? "sem resposta" : "HTTP " + codigo}`);
    }
    if (candidatos.length && !noAr) {
      const tudoSemResposta = falhas.every((x) => x.endsWith("sem resposta"));
      (tudoSemResposta ? naoDeuPraConferir : foraDoAr).push(`${f.slug} (${falhas.join(" · ")})`);
    }

    /* 2. a pasta local e 3. o modo prévia. Duas casas possíveis: a pasta
       nova (~/Desktop/vitrines/, regra de 18/09) e o Desktop direto, onde
       moram as quinze anteriores a ela. */
    const pasta = [path.join(VITRINES, f.slug), path.join(CASA, "Desktop", f.slug)].find((p) => fs.existsSync(p));
    if (!pasta) semPasta.push(f.slug);
    else {
      const config = path.join(pasta, "data", "site.config.ts");
      if (fs.existsSync(config)) {
        const txt = fs.readFileSync(config, "utf8");
        if (!/PREVIA[^=]*=\s*null/.test(txt)) aindaPrevia.push(f.slug);
      }
    }

    /* 4. o CRM */
    const arroba = f.instagram.toLowerCase();
    const temPrevia = arroba && previaPorArroba.has(arroba) ? Boolean(previaPorArroba.get(arroba)) : null;
    if (noAr && temPrevia === false) {
      entregar.push(`${f.slug} -> ${candidato}`);
      aGravar.set(arroba, candidato.startsWith("http") ? candidato : `https://${candidato}`);
    }

    /* corrige a ficha */
    if (SECO) continue;
    const caminho = path.join(COFRE, f.arquivo);
    let texto = fs.readFileSync(caminho, "utf8");
    let mudou = false;
    if (noAr && f.status !== "no ar" && f.status !== "entregue" && f.status !== "fechado") {
      texto = trocarCampo(texto, "status", "no ar");
      acertos.push(`${f.slug}: status "${f.status}" -> "no ar"`);
      mudou = true;
    }
    if (noAr && !f.site && candidato) {
      texto = trocarCampo(texto, "site", candidato);
      mudou = true;
    }
    if (mudou) fs.writeFileSync(caminho, texto);
  }

  const bloco = (titulo: string, lista: string[]) => {
    if (!lista.length) return;
    console.log(`\n${titulo} (${lista.length})`);
    for (const l of lista) console.log("   " + l);
  };

  console.log(`${fichas.length} fichas de vitrine conferidas`);
  bloco("FICHAS ACERTADAS (a nota estava desatualizada)", acertos);
  bloco("NO AR E SEM previa_url NO CRM — prévia pronta que ninguém entregou", entregar);
  bloco("FORA DO AR", foraDoAr);
  bloco("AINDA EM MODO PRÉVIA (o botão cai no estúdio)", aindaPrevia);
  bloco("SEM PASTA LOCAL (só existe no ar e no repo)", semPasta);
  bloco("NÃO DEU PARA CONFERIR", naoDeuPraConferir);

  /* grava no CRM a previa_url que falta, para o painel conseguir montar a
     mensagem de entrega: sem ela o {link} do template sai como lacuna. */
  if (GRAVAR_CRM && !SECO && oficina && aGravar.size) {
    console.log(`\nGRAVANDO NO CRM (${aGravar.size})`);
    for (const [arroba, url] of aGravar) {
      const { error } = await oficina.supabase
        .from("prod_lojas")
        .update({ previa_url: url })
        .eq("owner_id", oficina.dono)
        .eq("arroba", arroba)
        .is("previa_url", null);
      console.log(`   ${error ? "recusado" : "ok"}  ${arroba} -> ${url}${error ? " (" + error.message + ")" : ""}`);
    }
  } else if (aGravar.size && !GRAVAR_CRM) {
    console.log(`\nPara gravar essas ${aGravar.size} previa_url no CRM: --gravar-crm`);
  }

  if (SECO) console.log("\n(--seco: nenhuma ficha foi alterada)");
}

principal().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
