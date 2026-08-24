/* ============================================================
   COLHER FATOS — a parte GRATUITA da pesquisa, para um lote inteiro

   A pesquisa do CRM faz duas coisas bem diferentes: COLHE fatos (perfil
   do Instagram, bio, link da bio aberto e lido) e depois RACIOCINA em
   cima deles (veredito, dor, gancho, as duas mensagens). A primeira
   metade é de graça: são chamadas aos endpoints do Instagram e ao
   próprio link da bio. Só a segunda custa crédito de modelo.

   Este script roda a primeira metade e para. O resultado sai em JSON,
   para os dossiês serem escritos em cima de FATOS CONFERIDOS e não de
   memória. Foi assim que o lote de 17/08 saiu sem gastar nada, e foi
   assim que apareceram as coisas que o lote automático deixava passar:
   arroba de negócio de outra cidade, site escondido dentro do linktree,
   perfil migrando para outro arroba.

   ---------- por que candidatos, e não O arroba ----------
   Lead do garimpo do Maps vem sem Instagram nenhum: só nome, endereço e
   telefone. Pedir "o arroba certo" a qualquer coisa devolve null na
   maioria (a loja assina o perfil com o nome da dona, com "oficial", com
   a cidade colada). Como a Business Discovery CONFERE cada palpite de
   graça, o certo é gerar VÁRIOS candidatos a partir do nome e deixar a
   checagem decidir. Candidato incerto vale mais que lista vazia.

   ---------- o freio ----------
   O endpoint do Instagram rate-limita depois de meia dúzia de consultas
   rápidas, e colheita cortada por limite já fez um dossiê afirmar que
   uma loja com 638 posts não tinha Instagram. Por isso o script anda
   devagar de propósito, e "falhou" NUNCA vira "não tem": vira `null`,
   que é desconhecido, e desconhecido não vira afirmação em dossiê.

   USO:
     npx tsx scripts/colher-fatos.ts --nicho semijoias --saida fatos.json
     npx tsx scripts/colher-fatos.ts --tudo --saida fatos.json --pausa 2500
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { colherLinkDaBio, perfilInstagram } from "@/lib/crm/pesquisa";
import { ehAtivo, type Dossie, type Lead } from "@/lib/crm/tipos";

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

const NICHO = opcao("nicho");
const CIDADE = opcao("cidade");
const LIMITE = Number(opcao("limite") ?? 0) || null;
const PAUSA = Number(opcao("pausa") ?? 2200);
const SAIDA = opcao("saida") ?? "fatos.json";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dono = process.env.CRM_OWNER_ID;
if (!url || !chave || !dono) {
  console.error("Faltam SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou CRM_OWNER_ID no .env.local.");
  process.exit(1);
}
const supabase = createClient(url, chave, { auth: { persistSession: false } });

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- os candidatos a arroba, a partir do nome ----------
   Quatro formas que cobrem quase todo comércio brasileiro: o nome
   colado, com ponto entre as palavras, com a cidade no fim, e com
   "oficial". A ordem importa: a primeira que existir encerra a busca,
   então a mais provável vem primeiro. */
function candidatos(lead: Lead): string[] {
  const bruto = (lead.empresa || lead.nome || "").trim();
  if (!bruto) return [];

  const limpo = bruto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "e");

  /* Palavras que não ajudam a achar ninguém: elas aparecem em metade das
     fichas do Maps e só empurram o arroba para longe do nome real. */
  const vazias = new Set(["ltda", "me", "eireli", "loja", "lojas", "e", "de", "da", "do", "das", "dos"]);
  const todas = limpo.split(/[^a-z0-9]+/).filter(Boolean);
  const partes = todas.filter((p) => !vazias.has(p));
  if (!partes.length) return [];

  const cidade = (lead.cidade || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");

  const colado = partes.join("");
  const pontos = partes.join(".");
  /* O nome SOLETRADO ("A L I N E B O N I N I Jewelry") vira letras
     soltas, e a peneira de palavras vazias come o "e" do meio: sem esta
     variante com tudo colado, "alinebonini" nunca é testado. */
  const inteiro = todas.join("");
  const lista = [colado, pontos, inteiro, `${colado}oficial`, cidade ? `${colado}${cidade}` : null];

  /* O nome longo do Maps ("Sinay Acessórios - Consignação Semi Joias")
     quase nunca é o arroba; as duas primeiras palavras costumam ser. */
  if (partes.length > 2) lista.splice(1, 0, partes.slice(0, 2).join(""));

  const validos = lista.filter((c): c is string => typeof c === "string");
  return [...new Set(validos.filter((c) => c.length >= 3 && c.length <= 30))];
}

/* O link da bio só é aberto quando NÃO é rede social nem atalho de
   contato: abrir o wa.me de novo não ensina nada, e o linktree ensina
   tudo (é lá que mora o site escondido que muda o veredito). */
const CANAL_CONHECIDO =
  /(?:instagram\.com|facebook\.com|fb\.com|wa\.me|api\.whatsapp\.com|whatsapp\.com|t\.me|tiktok\.com|youtube\.com|maps\.app\.goo\.gl|g\.page|ifood\.com)/i;

function linkDaBio(texto: string): string | null {
  const m = texto.match(/^Link da bio: (.+)$/m);
  if (!m || m[1] === "NENHUM") return null;
  const primeiro = m[1].split(" , ")[0].trim();
  return /^https?:\/\//i.test(primeiro) ? primeiro : null;
}

type Fato = {
  id: string;
  nome: string;
  empresa: string | null;
  cidade: string | null;
  nicho: string | null;
  whatsapp: string | null;
  notas: string | null;
  /* o arroba que EXISTE e respondeu, ou null para desconhecido */
  arroba: string | null;
  perfil: string | null;
  perfil_fraco: boolean;
  bio_aberta: string | null;
  candidatos_testados: string[];
  /* o Instagram não respondeu para algum candidato: "sem arroba" aqui
     significa NÃO SEI, e não "não tem". A diferença decide se o lead pode
     virar dossiê ou tem que ser recolhido. */
  incompleto?: boolean;
};

async function principal() {
  let q = supabase.from("crm_leads").select("*").eq("owner_id", dono);
  if (NICHO) q = q.eq("nicho", NICHO);
  if (CIDADE) q = q.eq("cidade", CIDADE);
  const { data, error } = await q.order("created_at", { ascending: true }).returns<Lead[]>();
  if (error) throw new Error(error.message);

  /* A MESMA fila de quem falta dossiê que pesquisar-lote.ts usa: qualquer
     estágio ativo (era só "lista", e o lote de 24/08 tinha um lead em
     Prévia esperando dossiê), sem dossiê OU com a marca de erro que uma
     rodada falhada deixa para trás. Ganho e perdido ficam de fora: cliente
     fechado não se prospecta. */
  const comDossieVivo = (d: Dossie | null | undefined) => Boolean(d) && d?.status !== "erro";
  const fila = (LIMITE ? (data ?? []).slice(0, LIMITE) : (data ?? [])).filter(
    (l) => ehAtivo(l.estagio) && !comDossieVivo(l.dossie),
  );
  console.log(`colhendo ${fila.length} leads${NICHO ? ` · ${NICHO}` : ""}${CIDADE ? ` · ${CIDADE}` : ""}`);

  /* Retomada: se o arquivo já existe, o que já foi colhido não é colhido
     de novo. Uma queda no meio de duzentos leads não recomeça do zero. */
  const jaFeito = new Map<string, Fato>();
  if (fs.existsSync(SAIDA)) {
    for (const f of JSON.parse(fs.readFileSync(SAIDA, "utf8")) as Fato[]) jaFeito.set(f.id, f);
    console.log(`retomando: ${jaFeito.size} já colhidos`);
  }

  const fatos: Fato[] = [];
  let achados = 0;

  for (const [i, lead] of fila.entries()) {
    const antes = jaFeito.get(lead.id);
    if (antes) {
      fatos.push(antes);
      if (antes.arroba) achados++;
      continue;
    }

    const fato: Fato = {
      id: lead.id,
      nome: lead.nome,
      empresa: lead.empresa,
      cidade: lead.cidade,
      nicho: lead.nicho,
      whatsapp: lead.whatsapp,
      notas: lead.notas,
      arroba: null,
      perfil: null,
      perfil_fraco: false,
      bio_aberta: null,
      candidatos_testados: [],
    };

    /* Instagram já anotado no cadastro dispensa palpite. */
    const tentativas = lead.instagram ? [lead.instagram] : candidatos(lead);

    /* ---------- por que "falhou" INTERROMPE a fila de candidatos ----------
       Custou uma rodada inteira: sob limite de consultas, o candidato mais
       provável ("helarajoias") volta como "falhou", o laço seguia para o
       próximo e aceitava "helarajoiasoficial", que é OUTRA CONTA. Um
       arroba errado no cadastro é pior que arroba nenhum, porque a
       mensagem sai para a pessoa errada com cara de quem pesquisou.

       Então: "nao_existe" é resposta, e a fila segue. "falhou" é ausência
       de resposta, e nada abaixo dele pode ser promovido; o candidato é
       repetido com espera crescente e, se nem assim responder, o lead sai
       marcado como incompleto para ser recolhido depois. */
    for (const c of tentativas) {
      fato.candidatos_testados.push(c);

      let colheita = await perfilInstagram(c);
      for (let tent = 0; colheita.tipo === "falhou" && tent < 2; tent++) {
        await dormir(15000 * (tent + 1));
        colheita = await perfilInstagram(c);
      }
      await dormir(PAUSA);

      if (colheita.tipo === "ok") {
        fato.arroba = c.replace(/^@/, "");
        fato.perfil = colheita.texto;
        fato.perfil_fraco = colheita.fraco;
        break;
      }
      if (colheita.tipo === "falhou") {
        fato.incompleto = true;
        break;
      }
    }

    if (fato.perfil) {
      achados++;
      const link = linkDaBio(fato.perfil);
      if (link && !CANAL_CONHECIDO.test(link)) {
        fato.bio_aberta = await colherLinkDaBio(link);
        await dormir(600);
      }
    }

    fatos.push(fato);
    console.log(
      `${String(i + 1).padStart(3)}/${fila.length} ` +
        `${fato.arroba ? `@${fato.arroba}` : fato.incompleto ? "INCOMPLETO" : "sem arroba"} · ${lead.nome}`,
    );

    /* Grava a cada lead: colheita de duas horas não pode morrer inteira
       por causa de um Ctrl-C. */
    fs.writeFileSync(SAIDA, JSON.stringify(fatos, null, 1));
  }

  console.log(`\npronto: ${fatos.length} leads · ${achados} com perfil confirmado · ${SAIDA}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
