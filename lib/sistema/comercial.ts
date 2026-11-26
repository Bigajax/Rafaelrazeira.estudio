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

/* O valor CONTRATADO de um lead (26/11/2026): os contratos de projeto ativos
   dele; sem contrato, o valor_fechado do card ganho (os ganhos de antes do
   Caixa). Era a regra escrita à mão no `metricas()` de lib/crm/dados.ts e
   passou a ser usada também pela aba Criativos: uma verdade só. */
export function valorContratado(
  lead: { id: string; estagio: string; valor_fechado?: number | null },
  contratos: { lead_id: string; tipo: string; status: string; valor_total: number | null }[],
) {
  const seus = contratos.filter((c) => c.lead_id === lead.id && c.tipo === "projeto");
  if (seus.length) return seus.filter((c) => c.status === "ativo").reduce((v, c) => v + Number(c.valor_total ?? 0), 0);
  return lead.estagio === "ganho" ? Number(lead.valor_fechado ?? 0) : 0;
}
