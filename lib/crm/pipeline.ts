import { dinheiroCurto, urgencia } from "./regras";
import { ehNoPipeline, type Estagio, type LeadPainel } from "./tipos";

export type FocoPipeline = "todos" | "hoje" | "atrasados" | "sem_passo";
export const ETAPAS_VISUAIS: Record<
  Estagio,
  { descricao: string; vazio: string }
> = {
  lista: {
    descricao: "Quem você ainda vai conhecer",
    vazio: "Seu próximo cliente começa aqui.",
  },
  contatado: {
    descricao: "Primeira mensagem enviada",
    vazio: "Os primeiros contatos aparecem aqui.",
  },
  follow_up: {
    descricao: "Hora de retomar o contato",
    vazio: "Guarde aqui as conversas para retomar.",
  },
  conversa: {
    descricao: "Entenda o que o cliente precisa",
    vazio: "Uma boa conversa abre o caminho.",
  },
  previa: {
    descricao: "Mostre como o projeto pode ficar",
    vazio: "As prévias em apresentação ficam aqui.",
  },
  proposta: {
    descricao: "Preço e escopo na mesa",
    vazio: "Acompanhe as propostas enviadas.",
  },
  negociacao: {
    descricao: "Ajustes para fechar o projeto",
    vazio: "Os últimos detalhes antes do sim.",
  },
  ganho: {
    descricao: "Projetos fechados",
    vazio: "Os projetos fechados aparecem aqui.",
  },
  perdido: {
    descricao: "Oportunidades encerradas",
    vazio: "Nenhuma oportunidade encerrada nesta seleção.",
  },
  geladeira: {
    descricao: "Retomar na data combinada",
    vazio: "Quem pediu mais tempo fica aqui.",
  },
};
export function noFoco(lead: LeadPainel, foco: FocoPipeline, hoje: string) {
  if (foco === "todos") return true;
  if (!ehNoPipeline(lead.estagio)) return false;
  return urgencia(lead, hoje) === (foco === "atrasados" ? "atrasado" : foco);
}
export function resumoPipeline(leads: LeadPainel[], hoje: string) {
  const ativos = leads.filter((l) => ehNoPipeline(l.estagio));
  const naMesa = ativos.filter(
    (l) => l.estagio === "proposta" || l.estagio === "negociacao",
  );
  const atrasados = ativos.filter(
    (l) => urgencia(l, hoje) === "atrasado",
  ).length;
  const semPasso = ativos.filter(
    (l) => urgencia(l, hoje) === "sem_passo",
  ).length;
  return {
    ativos: ativos.length,
    aberto: ativos.reduce((s, l) => s + Number(l.ticket_estimado ?? 0), 0),
    propostas: naMesa.length,
    naMesa: naMesa.reduce((s, l) => s + Number(l.ticket_estimado ?? 0), 0),
    hoje: ativos.filter((l) => urgencia(l, hoje) === "hoje").length,
    atrasados,
    semPasso,
    esperando: atrasados + semPasso,
  };
}
export const valorPipeline = (valor: number) => dinheiroCurto(valor) || "R$ 0";
