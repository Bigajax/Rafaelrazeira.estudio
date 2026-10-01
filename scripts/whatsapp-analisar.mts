/* ============================================================
   A LEITURA DA CONVERSA, RODANDO NO PC (01/10/2026, etapa 2)

   O leitor do WhatsApp (scripts/whatsapp-leitor.mts) chama isto a cada
   poucos segundos: pega o pedido mais antigo de crm_analises, monta a
   conversa inteira do lead (os toques registrados à mão e as bolhas que o
   leitor guardou), lê o MÉTODO direto do cofre e pede a leitura ao
   `claude -p` da ASSINATURA. Grátis por pedido, e sem o OpenRouter, que
   zerou o crédito em 01/10.

   ---------- de onde vem o jeito de responder ----------
   Das notas do cofre, lidas a cada pedido, sem cópia: melhorou a nota de
   abordagem, a próxima análise já responde do jeito novo.

   ---------- a armadilha que isto desarma ----------
   A mesma do time de marketing: se o `claude -p` herdar a
   ANTHROPIC_API_KEY, ele cobra na API em vez da assinatura. O ambiente do
   filho sai daqui sem ela e sem as CLAUDE_CODE_*. O runner é uma cópia
   enxuta do rodarClaude de scripts/marketing-agentes.ts, sem a parte de
   visão; mudou lá o jeito de chamar, mudar aqui também.
   ============================================================ */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarLeitura, type Leitura } from "../lib/crm/analise";
import { NOME_ESTAGIO, type Dossie, type Estagio } from "../lib/crm/tipos";

const BIN_PADRAO = path.join(os.homedir(), ".local", "bin", "claude.exe");
const CLAUDE_BIN = process.env.MKT_CLAUDE_BIN || (fs.existsSync(BIN_PADRAO) ? BIN_PADRAO : "claude");
const COFRE = process.env.COFRE_DIR || path.join(os.homedir(), "Desktop", "rafaelrazeira.estúdio");
const NOTAS = [
  "1 Processos/abordagem-whatsapp-previas.md",
  "1 Processos/fechar-e-receber.md",
  "2 Regras da casa/entrada-199-regra.md",
  "2 Regras da casa/copy-sem-travessoes.md",
];

const SEM_FERRAMENTAS =
  "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task,TodoWrite,Skill,SlashCommand,NotebookEdit," +
  "KillShell,BashOutput,EnterPlanMode,ExitPlanMode,ListMcpResourcesTool,ReadMcpResourceTool";

/* Quem acabou de responder costuma mandar mais uma bolha em seguida. A
   análise automática espera a conversa ficar quieta por este tempo. */
const QUIETO_MS = 60_000;

export const claudeDisponivel = () => CLAUDE_BIN === "claude" || fs.existsSync(CLAUDE_BIN);

function rodarClaude(prompt: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const env = {} as NodeJS.ProcessEnv;
    for (const [k, v] of Object.entries(process.env)) {
      if (k === "ANTHROPIC_API_KEY" || k === "CLAUDECODE" || k === "CLAUDE_PID") continue;
      if (k.startsWith("CLAUDE_CODE_")) continue;
      env[k] = v;
    }
    const args = [
      "-p", "--output-format", "json",
      "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
      "--max-turns", "3",
      "--disallowedTools", SEM_FERRAMENTAS,
    ];
    const filho = spawn(CLAUDE_BIN, args, { cwd: os.tmpdir(), env, windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(filho.pid), "/T", "/F"], { windowsHide: true });
      else filho.kill("SIGKILL");
      reject(new Error("A análise passou de 3 minutos e foi interrompida."));
    }, 180_000);
    filho.stdout.on("data", (d) => (out += d));
    filho.stderr.on("data", (d) => (err += d));
    filho.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Não consegui abrir o claude (${CLAUDE_BIN}): ${e.message}`));
    });
    filho.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`O claude saiu com código ${code}: ${(out || err).slice(0, 300)}`));
      let fora: { subtype?: string; result?: string };
      try {
        fora = JSON.parse(out);
      } catch {
        return reject(new Error("O claude respondeu fora do JSON."));
      }
      if (fora.subtype !== "success" || typeof fora.result !== "string") {
        return reject(new Error(`A análise não terminou (${fora.subtype ?? "?"}).`));
      }
      const cerca = fora.result.match(/```(?:json)?\s*([\s\S]*?)```/);
      const bruto = cerca ? cerca[1] : fora.result.slice(fora.result.indexOf("{"));
      try {
        resolve(JSON.parse(bruto.slice(0, bruto.lastIndexOf("}") + 1)));
      } catch {
        reject(new Error(`A resposta não veio em JSON: ${fora.result.slice(0, 200)}`));
      }
    });
    filho.stdin.on("error", () => {});
    filho.stdin.write(prompt);
    filho.stdin.end();
  });
}

/* ---------- o método, do cofre ---------- */
function lerMetodo(): string {
  return NOTAS.map((rel) => {
    const p = path.join(COFRE, rel);
    if (!fs.existsSync(p)) return "";
    const corpo = fs.readFileSync(p, "utf8").replace(/^---[\s\S]*?\n---\n/, "").trim();
    return `### ${path.basename(rel, ".md")}\n\n${corpo}`;
  })
    .filter(Boolean)
    .join("\n\n");
}

/* ---------- a conversa, em ordem ---------- */
type Lead = {
  id: string;
  nome: string | null;
  empresa: string | null;
  instagram: string | null;
  nicho: string | null;
  cidade: string | null;
  origem: string | null;
  estagio: Estagio;
  entrou_no_estagio_em: string | null;
  proximo_passo: string | null;
  proxima_acao_em: string | null;
  ticket_estimado: number | null;
  notas: string | null;
  dossie: Dossie | null;
};

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

async function montarConversa(supabase: SupabaseClient, leadId: string) {
  const [{ data: toques }, { data: bolhas }] = await Promise.all([
    supabase.from("crm_interacoes").select("id, canal, direcao, resumo, fonte, created_at").eq("lead_id", leadId).order("created_at"),
    supabase.from("crm_mensagens").select("interacao_id, direcao, tipo, texto, enviada_em").eq("lead_id", leadId).order("enviada_em"),
  ]);
  /* Toque com bolhas: as bolhas contam a história com as palavras de
     verdade. Toque sem bolha (registrado à mão, ou de antes do leitor):
     entra pelo resumo, marcado como registro. */
  const comBolha = new Set((bolhas ?? []).map((b) => b.interacao_id).filter(Boolean));
  const linhas: { t: string; texto: string }[] = [];
  for (const i of toques ?? []) {
    if (comBolha.has(i.id) || i.fonte === "whatsapp") continue;
    const quem = i.direcao === "saida" ? "Rafael" : "Lead";
    linhas.push({ t: i.created_at, texto: `[${quando(i.created_at)}] ${quem} (registro no CRM, ${i.canal}): ${i.resumo ?? "sem resumo"}` });
  }
  for (const b of bolhas ?? []) {
    const quem = b.direcao === "saida" ? "Rafael" : "Lead";
    const rotulo = b.tipo === "texto" ? "" : `[${b.tipo}${b.tipo === "audio" && b.texto ? ", transcrito" : ""}] `;
    linhas.push({ t: b.enviada_em, texto: `[${quando(b.enviada_em)}] ${quem}: ${rotulo}${b.texto ?? ""}`.trim() });
  }
  linhas.sort((a, b) => a.t.localeCompare(b.t));
  return { texto: linhas.map((l) => l.texto).join("\n"), bolhas: bolhas?.length ?? 0 };
}

function montarPrompt(lead: Lead, conversa: string, hoje: string): string {
  const d = lead.dossie?.status === "ok" ? lead.dossie : null;
  const ficha = [
    `Nome: ${lead.nome ?? "?"}`,
    lead.empresa ? `Loja: ${lead.empresa}` : null,
    lead.instagram ? `Instagram: @${lead.instagram.replace(/^@+/, "")}` : null,
    lead.nicho ? `Nicho: ${lead.nicho}` : null,
    lead.cidade ? `Cidade: ${lead.cidade}` : null,
    `Origem: ${lead.origem ?? "?"}`,
    `Etapa atual: ${lead.estagio} (${NOME_ESTAGIO[lead.estagio]})${lead.entrou_no_estagio_em ? `, desde ${quando(lead.entrou_no_estagio_em)}` : ""}`,
    `Próximo passo marcado: ${lead.proximo_passo ?? "nenhum"}${lead.proxima_acao_em ? ` em ${lead.proxima_acao_em}` : ""}`,
    lead.ticket_estimado ? `Ticket estimado: R$ ${lead.ticket_estimado}` : null,
    lead.notas ? `Notas: ${lead.notas}` : null,
    d?.resumo ? `Pesquisa do negócio: ${d.resumo}` : null,
    d?.dor ? `Dor provável: ${d.dor}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Você é o assistente comercial do Rafael Razeira, designer solo que vende vitrines digitais para lojas pequenas (site com catálogo, pedido caindo no WhatsApp da loja e painel para o dono trocar produtos). Hoje é ${hoje}.

Leia a conversa abaixo com este lead e diga ao Rafael, sem rodeio: em que pé ela está, o que a pessoa quis dizer, em que etapa do funil o card deve ficar, o próximo passo e, se for a hora, a próxima mensagem já escrita.

# O método do estúdio (siga à risca; é daqui que vem o jeito de escrever e de cobrar)

${lerMetodo()}

# As etapas do funil (use o código)

lista: ainda não falei com a pessoa
contatado: mandei a primeira mensagem, sem resposta
follow_up: mandei retornos, ainda sem resposta
conversa: a pessoa respondeu e estamos conversando
previa: estou fazendo ou já entreguei a prévia da vitrine
proposta: mandei a proposta ou o preço formal
negociacao: ela está decidindo, negociando valor ou condição
geladeira: pediu para chamar mais pra frente
ganho: fechou e pagou a entrada
perdido: disse não, ou sumiu de vez depois da saída honrosa

# O lead

${ficha}

# A conversa, em ordem (as mais antigas primeiro)

${conversa || "(nenhuma mensagem registrada ainda)"}

# Como responder

- A resposta é para o WhatsApp: curta, como gente digita, no máximo 5 linhas por bolha, uma ideia por parágrafo. Se forem duas bolhas, separe com uma linha em branco.
- NUNCA use travessão (— ou –). Use dois-pontos e vírgulas.
- NUNCA invente preço, prazo, desconto ou condição que não estejam no método acima. Na dúvida, a mensagem pergunta.
- Responda ao que a pessoa disse por último. Se a última mensagem é do Rafael e ninguém respondeu, a resposta segue a escada do silêncio do método (ou é nula, se o certo é esperar).
- "resposta" nula quando não é hora de mandar nada.
- "etapa_sugerida" nula quando o card já está na etapa certa.
- Se a conversa tem pouca coisa registrada, diga isso na "leitura" em vez de supor.

Responda SOMENTE com um JSON, sem texto antes ou depois:
{"situacao": "uma frase", "leitura": "duas ou três frases", "etapa_sugerida": "codigo ou null", "porque_etapa": "uma frase", "proximo_passo": "curto, no infinitivo", "retorno_em_dias": 0, "resposta": "a mensagem pronta ou null", "alerta": "uma frase ou null"}`;
}

/* ---------- a fila ---------- */
export type PedidoAnalise = { id: string; lead_id: string; origem: "botao" | "resposta"; pedida_em: string };

export async function pegarAnalise(supabase: SupabaseClient): Promise<PedidoAnalise | null> {
  const { data } = await supabase
    .from("crm_analises")
    .select("id, lead_id, origem, pedida_em")
    .eq("status", "na_fila")
    .order("pedida_em")
    .limit(10)
    .returns<PedidoAnalise[]>();
  for (const p of data ?? []) {
    /* A automática espera a pessoa terminar de digitar; a do botão, não. */
    if (p.origem === "resposta") {
      const { data: ultima } = await supabase
        .from("crm_mensagens")
        .select("enviada_em")
        .eq("lead_id", p.lead_id)
        .order("enviada_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ultima && Date.now() - Date.parse(ultima.enviada_em) < QUIETO_MS) continue;
    }
    /* A trava: só leva quem ainda está na fila. */
    const { data: meu } = await supabase
      .from("crm_analises")
      .update({ status: "rodando" })
      .eq("id", p.id)
      .eq("status", "na_fila")
      .select("id, lead_id, origem, pedida_em")
      .maybeSingle<PedidoAnalise>();
    if (meu) return meu;
  }
  return null;
}

/* A leitura em si, sem tocar na fila: é o que o teste chama. */
export async function lerConversa(supabase: SupabaseClient, leadId: string): Promise<Leitura> {
  const { data: lead, error } = await supabase.from("crm_leads").select("*").eq("id", leadId).single<Lead>();
  if (error || !lead) throw new Error("O lead sumiu antes da análise.");
  const { texto } = await montarConversa(supabase, lead.id);
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  return normalizarLeitura(await rodarClaude(montarPrompt(lead, texto, hoje)));
}

export async function processarAnalise(supabase: SupabaseClient, pedido: PedidoAnalise): Promise<Leitura> {
  try {
    const leitura = await lerConversa(supabase, pedido.lead_id);
    await supabase
      .from("crm_analises")
      .update({ status: "pronta", resultado: leitura, erro: null, pronta_em: new Date().toISOString() })
      .eq("id", pedido.id);
    return leitura;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("crm_analises")
      .update({ status: "erro", erro: msg.slice(0, 900), pronta_em: new Date().toISOString() })
      .eq("id", pedido.id);
    throw e;
  }
}

/* A análise automática de quem respondeu: uma esperando por lead. Se já tem
   uma na fila, ela vai ler a conversa inteira quando rodar, inclusive esta
   bolha; pedir outra seria gastar duas leituras na mesma conversa. Uma que
   já está RODANDO não conta: ela pode ter lido antes desta bolha chegar. */
export async function pedirAnaliseAutomatica(supabase: SupabaseClient, ownerId: string, leadId: string) {
  const { data: esperando } = await supabase
    .from("crm_analises")
    .select("id")
    .eq("lead_id", leadId)
    .eq("status", "na_fila")
    .limit(1);
  if (esperando?.length) return;
  await supabase.from("crm_analises").insert({ owner_id: ownerId, lead_id: leadId, origem: "resposta" });
}
