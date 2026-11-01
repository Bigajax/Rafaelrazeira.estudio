import { ehAtivo, ehNoPipeline, type Interacao, type LeadPainel } from "./tipos";
import { momentoDoContato, procurouOEstudio } from "./regras";

export const ABAS_ATENDIMENTO = [
  { id: "novos", nome: "Novos contatos", descricao: "Quem ainda precisa do primeiro atendimento. Continua aqui até você registrar que falou." },
  { id: "responder", nome: "Preciso responder", descricao: "Quem escreveu por último e está esperando sua resposta, mesmo com retorno futuro." },
  { id: "retornos", nome: "Retornos", descricao: "Acompanhamentos vencidos, de hoje e contatos que precisam de um próximo passo." },
  { id: "prospeccao", nome: "Prospecção", descricao: "Trabalhe seus contatos por segmento e mantenha o acompanhamento em dia." },
  { id: "preco", nome: "Viu o preço", descricao: "Quem já recebeu o valor ou está em proposta. É aqui que o funil trava: o preço mais recente no topo." },
] as const;

/* ============================================================
   QUEM VIU O PREÇO (01/11/2026)

   A leitura de 212 conversas mostrou que o funil morre no preço: cerca de
   40 receberam o valor e nenhum fechou pela conversa. E o CRM não sabia
   quem eram: a aba "Em negociação" só via o estágio proposta/negociação,
   e quase ninguém chega lá, porque o preço sai na Prévia.

   O preço é reconhecido pelo RESUMO do toque, que o "Mandar mensagem"
   grava com o título do template. Por isso os prefixos abaixo seguem os
   títulos de `crm_templates`: renomear um template de preço lá pede a
   mesma troca aqui, senão quem recebeu some da fila em silêncio.
   "Preço enviado" é o toque do botão "Já mandei o preço", para o que foi
   por fora do CRM.

   Até 01/11, a "Prévia, mensagem 2: o preço" nunca tinha sido registrada
   (0 de 415 saídas): os ~40 da leitura entram só pelo botão.
   ============================================================ */
export const RESUMOS_DE_PRECO = [
  "Prévia, mensagem 2: o preço",
  "Amostra pronta: condição única R$ 899",
  "Desconto de 10%",
  "Quando o preço trava",
  "Quero colocar no ar: o botão da amostra",
  "Vou ver com o sócio: o resumo",
  "Enviando a proposta",
  "Proposta sem resposta",
  "Proposta comercial",
  "Preço enviado",
] as const;
export const RESUMO_PRECO_A_MAO = "Preço enviado (marcado à mão)";
export const ehToqueDePreco = (resumo: string | null | undefined) => Boolean(resumo && RESUMOS_DE_PRECO.some((p) => resumo.startsWith(p)));
export const viuOPreco = (l: LeadPainel) => Boolean(l.preco_em) || ["proposta", "negociacao"].includes(l.estagio);
export type AbaAtendimento = (typeof ABAS_ATENDIMENTO)[number]["id"];
export type HistoricoAtendimento = Pick<Interacao, "id" | "canal" | "direcao" | "resumo" | "created_at">;

/** Entrada no CRM e primeira saída registrada são fatos distintos da agenda. */
export function novoContato(lead: LeadPainel): boolean {
  return ehNoPipeline(lead.estagio) && lead.toques === lead.toques_entrada;
}
export function precisaResponder(lead: LeadPainel): boolean {
  return ehAtivo(lead.estagio) && !novoContato(lead) && lead.toques_entrada > 0 && lead.saidas_seguidas === 0;
}
export function filasAtendimento(leads: LeadPainel[], hoje: string) {
  const todos = [...new Map(leads.map((l) => [l.id, l])).values()];
  const ativos = todos.filter((l) => ehNoPipeline(l.estagio));
  const dataRetorno = (l: LeadPainel) => [l.cobranca?.quando, l.proxima_acao_em].filter((d): d is string => Boolean(d)).sort()[0] ?? "";
  const prioridade = (l: LeadPainel) => procurouOEstudio(l) ? 0 : l.origem === "indicacao" ? 1 : l.origem === "prospeccao" ? 3 : 2;
  const desempate = (a: LeadPainel, b: LeadPainel) => a.id.localeCompare(b.id);
  return {
    // Quem acabou de chegar está quente; a espera antiga já esfriou (20/10/2026).
    novos: ativos.filter(novoContato).sort((a, b) => prioridade(a) - prioridade(b) || b.created_at.localeCompare(a.created_at) || desempate(a, b)),
    responder: todos.filter(precisaResponder).sort((a, b) => momentoDoContato(a).localeCompare(momentoDoContato(b)) || desempate(a, b)),
    retornos: todos.filter((l) => !novoContato(l) && !precisaResponder(l) && (l.cobranca ? l.cobranca.quando <= hoje : ehAtivo(l.estagio) && (l.estagio === "geladeira" ? Boolean(l.proxima_acao_em && l.proxima_acao_em <= hoje) : !l.proxima_acao_em || l.proxima_acao_em <= hoje))).sort((a, b) => dataRetorno(a).localeCompare(dataRetorno(b)) || desempate(a, b)),
    prospeccao: ativos.filter((l) => l.origem === "prospeccao"),
    // O preço mais recente no topo: os primeiros dias depois do valor são os que ainda fecham.
    preco: ativos.filter(viuOPreco).sort((a, b) => (b.preco_em ?? "").localeCompare(a.preco_em ?? "") || (a.proxima_acao_em || "").localeCompare(b.proxima_acao_em || "") || desempate(a, b)),
  } satisfies Record<AbaAtendimento, LeadPainel[]>;
}

export function tempoDeEspera(instante: string, agora: number): string {
  const minutos = Math.max(0, Math.floor((agora - Date.parse(instante)) / 60000));
  if (!Number.isFinite(minutos)) return "Horário indisponível";
  if (minutos < 1) return "Agora";
  if (minutos < 60) return `${minutos} min de espera`;
  if (minutos < 1440) return `${Math.floor(minutos / 60)} h de espera`;
  const dias = Math.floor(minutos / 1440);
  return `${dias} ${dias === 1 ? "dia" : "dias"} de espera`;
}
