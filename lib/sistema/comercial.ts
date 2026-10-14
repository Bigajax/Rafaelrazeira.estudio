export const ORDEM_COMERCIAL = [
  "lista",
  "contatado",
  "follow_up",
  "conversa",
  "previa",
  "proposta",
  "negociacao",
  "ganho",
];
export type EventoEtapa = {
  id: string;
  lead_id: string;
  etapa: string;
  anterior: string | null;
  motivo: string | null;
  ocorrido_em: string;
  inicial: boolean;
};
export function avancouLead(
  lead: { id: string; estagio: string },
  eventos: EventoEtapa[] | null,
  etapa: string,
) {
  const registrados = (eventos ?? []).filter((e) => e.lead_id === lead.id && !e.inicial);
  const passagens = registrados.flatMap((e) => [
    ORDEM_COMERCIAL.indexOf(e.etapa),
    ORDEM_COMERCIAL.indexOf(e.anterior ?? ""),
  ]);
  const legado = eventos === null || eventos.some((e) => e.lead_id === lead.id && e.inicial);
  const atual = legado ? ORDEM_COMERCIAL.indexOf(lead.estagio) : -1;
  return Math.max(atual, ...passagens) >= ORDEM_COMERCIAL.indexOf(etapa);
}
