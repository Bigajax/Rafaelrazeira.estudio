/* ============================================================
   O LEITOR DO WHATSAPP (01/10/2026, etapa 1 do plano)

   Fica conectado ao número do estúdio como aparelho, igual ao WhatsApp
   Web, e SÓ LÊ. Cada mensagem trocada com um número que já é lead no CRM
   entra na linha do tempo do card; conversa com quem não é lead nunca sai
   do celular (nem o texto, nem o número: só um contador no fim).

       npx tsx scripts/whatsapp-leitor.mts     (ou dois cliques em
                                                 scripts/ligar-leitor-whatsapp.cmd)

   Na primeira vez aparece um QR code: no celular do estúdio, WhatsApp >
   Aparelhos conectados > Conectar um aparelho. A sessão fica na pasta
   .whatsapp-sessao/, que é a CHAVE do WhatsApp do estúdio: nunca versionar,
   nunca copiar para outro lugar. Para desconectar de vez, tirar o aparelho
   pelo celular e apagar a pasta.

   O QUE NUNCA FAZER AQUI: enviar. O Baileys não é oficial, e o que derruba
   número é o padrão de envio. A trava está no código (`sendMessage` e
   `relayMessage` jogam erro), não na boa vontade de quem mexer depois.
   O leitor também não marca nada como lido e não aparece "online": o
   celular continua recebendo as notificações como sempre.

   É .mts e não .ts porque o Baileys 7 só existe como módulo ESM: como .ts
   o tsx carrega em CommonJS e quebra no require do whatsapp-rust-bridge.

   O plano inteiro: cofre, 4 Máquina/crm-leitor-whatsapp.md.
   As regras (número, bolha, efeito no card): lib/crm/whatsapp.ts.
   ============================================================ */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  useMultiFileAuthState,
  type WAMessage,
} from "baileys";
import pino from "pino";
import { MAIS_LONGO_SEGUNDOS, transcrever, transcricaoDisponivel } from "./whatsapp-transcrever.mts";
import qrcode from "qrcode-terminal";
import QRCode from "qrcode";
import { exec } from "node:child_process";
import { hojeSP } from "../lib/crm/regras";
import type { Direcao, Lead } from "../lib/crm/tipos";
import {
  chaveDoNumero,
  conteudoDaMensagem,
  efeitoDoToque,
  ehConversaDireta,
  JANELA_DO_MODAL_MS,
  juntarResumo,
  linhaDoResumo,
} from "../lib/crm/whatsapp";

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

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const chaveSupabase = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chaveSupabase) {
  console.error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local.");
  process.exit(1);
}
const supabase = createClient(url, chaveSupabase, { auth: { persistSession: false } });

const PASTA_SESSAO = path.resolve(process.cwd(), ".whatsapp-sessao");
/* O registro detalhado do Baileys, para quando o pareamento falha e a
   janela não diz por quê. Fica fora da pasta da sessão de propósito: dá
   para mandar o log sem mandar a chave. Nunca tem texto de mensagem. */
const ARQUIVO_LOG = path.resolve(process.cwd(), "whatsapp-leitor.log");

/* ---------- o QR como imagem ----------
   O QR desenhado com caracteres no cmd sai esticado conforme a fonte e o
   zoom da janela, e o celular lê mal (01/10). Ele também sai como imagem
   numa página que se atualiza sozinha, aberta uma vez no navegador. */
const ARQUIVO_QR = path.join(PASTA_SESSAO, "qr.html");
let qrAberto = false;
async function mostrarQR(qr: string) {
  fs.mkdirSync(PASTA_SESSAO, { recursive: true });
  const img = await QRCode.toDataURL(qr, { width: 420, margin: 2 });
  fs.writeFileSync(
    ARQUIVO_QR,
    `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="4"><title>Conectar o leitor</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f1ea;font:16px system-ui">
<div style="text-align:center"><img src="${img}" width="420" height="420" alt="QR code do WhatsApp">
<p>No celular do estúdio: WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho.</p>
<p style="color:#666">O código troca sozinho a cada 20 segundos.</p></div></body>`,
  );
  if (!qrAberto) {
    qrAberto = true;
    exec(`start "" "${ARQUIVO_QR}"`);
  }
}
function fecharQR() {
  if (!fs.existsSync(ARQUIVO_QR)) return;
  fs.writeFileSync(ARQUIVO_QR, `<!doctype html><meta charset="utf-8"><title>Leitor conectado</title><body style="font:20px system-ui;padding:40px">Conectado. Pode fechar esta aba.</body>`);
}
/* Bolhas da mesma pessoa com menos de 6 horas entre elas são a mesma vez
   de falar. Duas mensagens minhas com dias de distância são dois retornos,
   e a escada do silêncio precisa contar as duas. */
const JANELA_DO_TURNO_MS = 6 * 60 * 60 * 1000;

/* ---------- desde quando ler ----------
   O leitor começa no dia em que foi ligado. Conversa antiga já foi
   registrada à mão pelo modal, e trazê-la de volta duplicaria os toques e
   bagunçaria a escada de todo card que já anda. */
const ARQUIVO_INICIO = path.join(PASTA_SESSAO, "lendo-desde.txt");
/* Marcado na primeira conexão aberta, não na partida: um QR que ninguém leu
   não pode decidir a data. Antes de conectar, o marco é "agora". */
function lendoDesde(): number {
  if (!fs.existsSync(ARQUIVO_INICIO)) return Date.now();
  return Date.parse(fs.readFileSync(ARQUIVO_INICIO, "utf8").trim());
}
function marcarInicio() {
  if (fs.existsSync(ARQUIVO_INICIO)) return;
  fs.mkdirSync(PASTA_SESSAO, { recursive: true });
  fs.writeFileSync(ARQUIVO_INICIO, new Date().toISOString());
}

/* ---------- os leads, por número ---------- */
export type LeadDoLeitor = Pick<
  Lead,
  "id" | "owner_id" | "nome" | "empresa" | "whatsapp" | "estagio" | "proximo_passo" | "proxima_acao_em" | "updated_at"
>;
let porNumero = new Map<string, LeadDoLeitor>();
let lidoEm = 0;

export async function carregarLeads(forcar = false) {
  if (!forcar && Date.now() - lidoEm < 2 * 60 * 1000) return;
  const { data, error } = await supabase
    .from("crm_leads")
    .select("id, owner_id, nome, empresa, whatsapp, estagio, proximo_passo, proxima_acao_em, updated_at")
    .not("whatsapp", "is", null)
    .returns<LeadDoLeitor[]>();
  if (error) throw new Error(`Não li os leads: ${error.message}`);
  /* Dois cards com o mesmo número: vale o ativo, e entre ativos o mais
     mexido. */
  const ativo = (l: LeadDoLeitor) => (l.estagio !== "ganho" && l.estagio !== "perdido" ? 1 : 0);
  const mapa = new Map<string, LeadDoLeitor>();
  for (const l of data ?? []) {
    const chave = chaveDoNumero(l.whatsapp);
    if (!chave) continue;
    const atual = mapa.get(chave);
    if (!atual || ativo(l) > ativo(atual) || (ativo(l) === ativo(atual) && l.updated_at > atual.updated_at)) {
      mapa.set(chave, l);
    }
  }
  porNumero = mapa;
  lidoEm = Date.now();
}

const nomeDoLead = (l: LeadDoLeitor) => (l.empresa || l.nome || "lead").split(" | ")[0].trim();
const hora = () => new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
let ignoradas = 0;

/* ---------- gravar uma bolha ---------- */
export async function gravar(lead: LeadDoLeitor, waId: string, direcao: Direcao, tipo: string, texto: string | null, linha: string, quando: Date) {
  const { data: nova, error } = await supabase
    .from("crm_mensagens")
    .upsert(
      { owner_id: lead.owner_id, lead_id: lead.id, wa_id: waId, direcao, tipo, texto, enviada_em: quando.toISOString() },
      { onConflict: "wa_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(`Não gravei a mensagem: ${error.message}`);
  if (!nova?.length) return; // já estava gravada (reconexão)
  const idMensagem = nova[0].id as string;
  const nome = nomeDoLead(lead);
  const seta = direcao === "entrada" ? "↓" : "↑";

  /* 1. A mesma vez de falar: a bolha anterior é da mesma pessoa e recente. */
  const { data: anteriores } = await supabase
    .from("crm_mensagens")
    .select("direcao, interacao_id, enviada_em")
    .eq("lead_id", lead.id)
    .neq("id", idMensagem)
    .lte("enviada_em", quando.toISOString())
    .order("enviada_em", { ascending: false })
    .limit(1);
  const anterior = anteriores?.[0];
  if (
    anterior &&
    anterior.direcao === direcao &&
    anterior.interacao_id &&
    quando.getTime() - Date.parse(anterior.enviada_em) < JANELA_DO_TURNO_MS
  ) {
    const { data: toque } = await supabase
      .from("crm_interacoes")
      .select("resumo, fonte")
      .eq("id", anterior.interacao_id)
      .single();
    /* O toque manual guarda o nome do template no resumo; o texto da bolha
       fica só em crm_mensagens para não misturar os dois. */
    if (toque?.fonte === "whatsapp") {
      await supabase
        .from("crm_interacoes")
        .update({ resumo: juntarResumo(toque.resumo, linha) })
        .eq("id", anterior.interacao_id);
    }
    await supabase.from("crm_mensagens").update({ interacao_id: anterior.interacao_id }).eq("id", idMensagem);
    console.log(`${hora()} ${seta} ${nome}: mais uma bolha na mesma conversa`);
    return;
  }

  /* 2. O toque que o modal gravou no clique, antes de a mensagem sair. */
  const { data: manuais } = await supabase
    .from("crm_interacoes")
    .select("id, created_at")
    .eq("lead_id", lead.id)
    .eq("direcao", direcao)
    .is("fonte", null)
    .gte("created_at", new Date(quando.getTime() - JANELA_DO_MODAL_MS).toISOString())
    .lte("created_at", new Date(quando.getTime() + 5 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false });
  for (const m of manuais ?? []) {
    const { count } = await supabase
      .from("crm_mensagens")
      .select("id", { count: "exact", head: true })
      .eq("interacao_id", m.id);
    if (count) continue;
    await supabase.from("crm_mensagens").update({ interacao_id: m.id }).eq("id", idMensagem);
    console.log(`${hora()} ${seta} ${nome}: casada com o toque que o CRM já tinha registrado`);
    return;
  }

  /* 3. Toque novo. A data é a da mensagem, não a de agora: a escada do
     silêncio conta pela ordem em que a conversa aconteceu. */
  const { data: toque, error: erroToque } = await supabase
    .from("crm_interacoes")
    .insert({
      owner_id: lead.owner_id,
      lead_id: lead.id,
      canal: "whatsapp",
      direcao,
      resumo: linha || null,
      fonte: "whatsapp",
      created_at: quando.toISOString(),
    })
    .select("id")
    .single();
  if (erroToque) throw new Error(`Não gravei o toque: ${erroToque.message}`);
  await supabase.from("crm_mensagens").update({ interacao_id: toque.id }).eq("id", idMensagem);

  /* O card é relido agora: a etapa pode ter mudado na tela desde a carga. */
  const { data: atual } = await supabase
    .from("crm_leads")
    .select("estagio, proximo_passo, proxima_acao_em")
    .eq("id", lead.id)
    .single<Pick<Lead, "estagio" | "proximo_passo" | "proxima_acao_em">>();
  const mudanca = atual ? efeitoDoToque(direcao, atual, hojeSP()) : null;
  if (mudanca) {
    const { error: erroCard } = await supabase.from("crm_leads").update(mudanca).eq("id", lead.id);
    if (erroCard) console.error(`${hora()} ${nome}: não mexi no card (${erroCard.message})`);
  }
  const etapa = mudanca?.estagio ? ` (${atual!.estagio} → ${mudanca.estagio})` : "";
  console.log(`${hora()} ${seta} ${nome}: ${direcao === "entrada" ? "respondeu" : "mensagem sua pelo celular"}${etapa}`);
}

/* ---------- a conexão ---------- */

/* A versão do WhatsApp Web que o leitor diz ser. Com versão velha o
   celular recusa o pareamento com "Verifique sua conexão e tente
   novamente" (01/10, primeira tentativa): o fetchLatestBaileysVersion lê do
   GitHub, a leitura caiu (ECONNRESET) e ele voltou em silêncio para a
   versão embutida no pacote, meses atrás da atual. Por isso a fonte
   primeira é o próprio web.whatsapp.com, e o GitHub fica de reserva. */
async function versaoDoWhatsApp() {
  try {
    const web = await fetchLatestWaWebVersion({});
    if (web.isLatest) return web.version;
  } catch {}
  const gh = await fetchLatestBaileysVersion();
  if (!gh.isLatest) console.log("Aviso: não consegui ler a versão atual do WhatsApp Web; o pareamento pode falhar.");
  return gh.version;
}
let fila: Promise<void> = Promise.resolve();

async function ligar() {
  let desde = lendoDesde();
  const { state, saveCreds } = await useMultiFileAuthState(PASTA_SESSAO);
  const version = await versaoDoWhatsApp();

  /* Detalhado só até conectar: é o pareamento que precisa de diagnóstico.
     Conectado, cai para avisos e erros, e nada de conversa passa pelo log. */
  const logger = pino({ level: "debug" }, pino.destination({ dest: ARQUIVO_LOG, append: true, sync: false }));

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.windows("CRM do estúdio (só leitura)"),
    markOnlineOnConnect: false,
    /* O histórico fica LIGADO, mesmo sem uso: o Baileys avisa que desligá-lo
       corta o mapa dos ids anônimos (@lid) e derruba a sessão. A conversa
       antiga não entra pelo filtro de data em `ler`, não por aqui. */
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });

  /* A TRAVA. Nenhuma linha deste arquivo envia, e se alguém um dia
     escrever uma, ela quebra aqui em vez de sair pelo número do estúdio. */
  const trava = async () => {
    throw new Error("O leitor do WhatsApp não envia mensagens. Envio é pelo modal do CRM, na mão.");
  };
  (sock as any).sendMessage = trava;
  (sock as any).relayMessage = trava;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nNo celular do estúdio: WhatsApp > Aparelhos conectados > Conectar um aparelho.\n");
      qrcode.generate(qr, { small: true });
      void mostrarQR(qr);
    }
    if (connection === "open") {
      marcarInicio();
      fecharQR();
      logger.level = "warn";
      desde = lendoDesde();
      console.log(`${hora()} Conectado. Lendo as conversas com leads desde ${new Date(desde).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`);
      console.log("Deixe esta janela aberta (pode minimizar). Para desligar, feche a janela.\n");
    }
    if (connection === "close") {
      const codigo = (lastDisconnect?.error as any)?.output?.statusCode;
      if (codigo === DisconnectReason.loggedOut) {
        console.log("\nO aparelho foi desconectado pelo celular. Para ligar de novo, apague a pasta .whatsapp-sessao e rode outra vez.");
        process.exit(0);
      }
      const motivo = (lastDisconnect?.error as any)?.message;
      console.log(`${hora()} A conexão caiu (${codigo ?? "sem código"}${motivo ? `: ${motivo}` : ""}). Religando em 5 segundos...`);
      setTimeout(() => void ligar(), 5000);
    }
  });

  sock.ev.on("messages.upsert", ({ messages }) => {
    const ordenadas = [...messages].sort((a, b) => Number(a.messageTimestamp ?? 0) - Number(b.messageTimestamp ?? 0));
    for (const msg of ordenadas) {
      const marco = desde;
      fila = fila.then(() => ler(sock, msg, marco)).catch((e) => console.error(`${hora()} ${e.message}`));
    }
  });
}

async function ler(sock: ReturnType<typeof makeWASocket>, msg: WAMessage, desde: number) {
  const jid = msg.key.remoteJid;
  if (!ehConversaDireta(jid) || !msg.key.id) return;
  const quando = new Date(Number(msg.messageTimestamp ?? 0) * 1000);
  if (quando.getTime() < desde) return;

  const conteudo = conteudoDaMensagem(msg.message);
  if (!conteudo) return;

  /* O número de verdade. Conta nova chega com um id anônimo (@lid) no lugar
     do telefone; o próprio WhatsApp manda o par, e o Baileys guarda. */
  let numero: string | null | undefined = jid!.endsWith("@lid") ? msg.key.remoteJidAlt : jid;
  if (!numero && jid!.endsWith("@lid")) {
    numero = await sock.signalRepository.lidMapping.getPNForLID(jid!).catch(() => null);
  }
  const chave = chaveDoNumero(numero);
  await carregarLeads();
  const lead = chave ? porNumero.get(chave) : undefined;
  if (!lead) {
    ignoradas++;
    return;
  }

  /* O áudio vira texto aqui, DEPOIS de saber que é lead: áudio de conversa
     pessoal nem é baixado. Falhou ou é longo demais, fica "[áudio]". */
  if (conteudo.tipo === "audio" && transcricaoDisponivel()) {
    if ((conteudo.segundos ?? 0) > MAIS_LONGO_SEGUNDOS) {
      conteudo.texto = `(${Math.round((conteudo.segundos ?? 0) / 60)} min, longo demais para transcrever)`;
    } else {
      try {
        const audio = await downloadMediaMessage(msg, "buffer", {});
        conteudo.texto = await transcrever(audio);
      } catch (e) {
        console.error(`${hora()} Não transcrevi um áudio de ${nomeDoLead(lead)}: ${(e as Error).message}`);
      }
    }
  }

  await gravar(
    lead,
    msg.key.id,
    msg.key.fromMe ? "saida" : "entrada",
    conteudo.tipo,
    conteudo.texto,
    linhaDoResumo(conteudo),
    quando,
  );
}

/* ---------- a partida ---------- */
async function main() {
  /* Sem `head`: a consulta só de cabeçalho volta "204, sem erro" mesmo com a
     tabela inexistente, e o leitor seguia para conectar sem ter onde gravar. */
  const { error } = await supabase.from("crm_mensagens").select("id").limit(1);
  if (error) {
    console.error("A tabela crm_mensagens ainda não existe. Rode supabase/whatsapp-leitor.sql no SQL Editor do Supabase e tente de novo.");
    process.exit(1);
  }
  await carregarLeads(true);
  console.log(`${porNumero.size} leads com WhatsApp no CRM.`);
  console.log(transcricaoDisponivel() ? "Áudios de lead: transcritos no PC, pelo Whisper." : "Áudios de lead: sem transcrição (whisper não encontrado em ~/whisper).");
  await ligar();

  /* O contador de quem não é lead, de hora em hora: dá para ver que o
     filtro está trabalhando sem gravar nada de ninguém. */
  setInterval(() => {
    if (ignoradas) console.log(`${hora()} ${ignoradas} mensagens de quem não é lead ficaram no celular.`);
    ignoradas = 0;
  }, 60 * 60 * 1000);
}

/* Só liga quando é rodado direto: importado (o teste do gravar), não conecta. */
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
