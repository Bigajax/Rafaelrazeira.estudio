/* ============================================================
   O LEITOR DO WHATSAPP: as regras puras (01/10/2026)

   O scripts/whatsapp-leitor.mts fica conectado ao número do estúdio e só
   lê. Tudo o que ele DECIDE mora aqui, sem rede e sem banco, para poder ser
   conferido com um número de verdade antes de ligar no telefone: de quem é
   a mensagem, o que tem nela, e o que um toque novo faz com o card.

   O plano inteiro está no cofre, em 4 Máquina/crm-leitor-whatsapp.md.
   ============================================================ */
import { destinoDoToque, PADRAO_DO_DESTINO, somarDias } from "./regras";
import { ehAtivo, type Direcao, type Estagio, type Lead } from "./tipos";

/* ---------- o número como chave ----------
   O cadastro guarda "45991120011"; o WhatsApp manda
   "5545991120011@s.whatsapp.net", e conta antiga às vezes vem sem o nono
   dígito ("554591120011"). A chave que casa os três é o DDD mais os oito
   últimos dígitos. Número que não tem cara de telefone brasileiro não vira
   chave, e mensagem sem chave nunca é gravada. */
export function chaveDoNumero(bruto: string | null | undefined): string | null {
  let d = (bruto ?? "").split("@")[0].split(":")[0].replace(/\D/g, "");
  /* O número do WhatsApp sempre traz o país: sem o 55 na frente é de fora,
     e um americano de 11 dígitos não pode casar com um DDD daqui. */
  if (bruto?.includes("@") && !d.startsWith("55")) return null;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  return d.slice(0, 2) + d.slice(-8);
}

/* Conversa de gente com gente: grupo, status, canal e lista de transmissão
   ficam de fora antes de qualquer outra conta. */
export const ehConversaDireta = (jid: string | null | undefined) =>
  !!jid && (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"));

/* ---------- o que tem na bolha ----------
   O tipo do Baileys é o protobuf inteiro; aqui só interessa a forma, então
   o parâmetro é solto de propósito e a leitura é defensiva. Mensagem de
   sistema (reação, apagada, editada, chave de criptografia) devolve null e
   não vira bolha. */
/* `segundos` só no áudio: é o que decide se ele é transcrito. */
export type Conteudo = { tipo: string; texto: string | null; segundos?: number | null };

type Bolha = Record<string, any> | null | undefined;

export function conteudoDaMensagem(m: Bolha): Conteudo | null {
  if (!m) return null;
  /* Mensagem temporária e de visualização única chegam embrulhadas. */
  const dentro =
    m.ephemeralMessage?.message ??
    m.viewOnceMessage?.message ??
    m.viewOnceMessageV2?.message ??
    m.documentWithCaptionMessage?.message;
  if (dentro) return conteudoDaMensagem(dentro);

  if (typeof m.conversation === "string") return { tipo: "texto", texto: m.conversation };
  if (m.extendedTextMessage) return { tipo: "texto", texto: m.extendedTextMessage.text ?? null };
  if (m.imageMessage) return { tipo: "foto", texto: m.imageMessage.caption || null };
  if (m.videoMessage) return { tipo: "video", texto: m.videoMessage.caption || null };
  if (m.audioMessage) return { tipo: "audio", texto: null, segundos: m.audioMessage.seconds ?? null };
  if (m.documentMessage)
    return { tipo: "documento", texto: m.documentMessage.caption || m.documentMessage.fileName || null };
  if (m.stickerMessage) return { tipo: "figurinha", texto: null };
  if (m.contactMessage) return { tipo: "outro", texto: `Contato: ${m.contactMessage.displayName ?? ""}`.trim() };
  if (m.locationMessage) return { tipo: "outro", texto: "Localização" };
  return null;
}

/* Como a bolha aparece no resumo do toque: o texto, ou o que ela era. */
const ROTULO: Record<string, string> = {
  foto: "[foto]",
  video: "[vídeo]",
  audio: "[áudio]",
  documento: "[documento]",
  figurinha: "[figurinha]",
  outro: "[mensagem]",
};
export function linhaDoResumo(c: Conteudo): string {
  const rotulo = c.tipo === "texto" ? "" : ROTULO[c.tipo] ?? "[mensagem]";
  return [rotulo, c.texto?.trim() ?? ""].filter(Boolean).join(" ");
}

/* O resumo do toque junta as bolhas daquela vez de falar. Corta no fim
   para o card não carregar um texto de três telas. */
export const LIMITE_RESUMO = 1500;
export function juntarResumo(anterior: string | null, nova: string): string {
  const texto = anterior ? `${anterior}\n${nova}` : nova;
  return texto.length > LIMITE_RESUMO ? `${texto.slice(0, LIMITE_RESUMO - 1)}…` : texto;
}

/* ---------- o toque que o modal acabou de gravar ----------
   O modal de mensagem registra a saída NO CLIQUE que abre o WhatsApp, e a
   mensagem de verdade sai segundos ou minutos depois. Quando ela chega
   aqui, o toque já existe: o leitor só amarra a bolha nele. Janela de uma
   hora, só toque manual (fonte nula), mesma direção e ainda sem bolha. */
export const JANELA_DO_MODAL_MS = 60 * 60 * 1000;

/* ---------- o que um toque novo faz com o card ----------
   A decisão do Rafael para o leitor (01/10): o simples o CRM faz sozinho,
   mudar de etapa de verdade ele só sugere (etapa 2). Aqui fica o simples:

   - o trilho MECÂNICO de sempre, o mesmo do modal: saída leva Lista para
     Contatado e Contatado para Follow-up; entrada leva os três para
     Conversa. Nada além disso muda de etapa.
   - ENTRADA traz o card para hoje: quem escreveu tem que aparecer na fila
     do dia, mesmo com um "cobrar em 3 dias" marcado antes da resposta.
   - SAÍDA mandada pelo celular empurra o retorno para daqui a 3 dias,
     como o padrão do modal, mas só quando a data estava vencida ou vazia:
     uma data futura escolhida à mão vence.

   Ganho e perdido ninguém mexe: reabrir negócio é decisão de quadro. */
export type Mudanca = Partial<Pick<Lead, "estagio" | "proximo_passo" | "proxima_acao_em" | "motivo_perda">>;

const PASSO_RESPONDER = "Responder a conversa";
const PASSO_COBRAR = "Cobrar retorno no WhatsApp";

export function efeitoDoToque(
  direcao: Direcao,
  lead: Pick<Lead, "estagio" | "proximo_passo" | "proxima_acao_em">,
  hoje: string,
): Mudanca | null {
  if (!ehAtivo(lead.estagio)) return null;
  const mudanca: Mudanca = {};
  const destino: Estagio | null = destinoDoToque(direcao, lead.estagio);
  if (destino && destino !== lead.estagio) mudanca.estagio = destino;

  const passo = lead.proximo_passo?.trim() || null;
  if (direcao === "entrada") {
    if (!lead.proxima_acao_em || lead.proxima_acao_em > hoje) mudanca.proxima_acao_em = hoje;
    if (!passo || passo.startsWith("Cobrar retorno")) mudanca.proximo_passo = PASSO_RESPONDER;
  } else {
    const padrao = destino ? PADRAO_DO_DESTINO[destino] : null;
    if (!lead.proxima_acao_em || lead.proxima_acao_em <= hoje) {
      mudanca.proxima_acao_em = somarDias(hoje, padrao?.dias ?? 3);
    }
    if (!passo || passo === PASSO_RESPONDER) mudanca.proximo_passo = padrao?.passo ?? PASSO_COBRAR;
  }
  return Object.keys(mudanca).length ? mudanca : null;
}
