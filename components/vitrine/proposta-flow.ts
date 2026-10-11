import { salvarLeadDetalhado } from "@/components/lead";
import { contextoDaSessao, mpTrack, trackLead } from "./tracking";
import { linkContato } from "./lead-flow";
import type { MotivoSuspeito } from "@/components/form-guarda";

export type PedidoVitrine = { nome: string; whatsapp: string; instagram: string; plano: string };

export async function pedirPropostaVitrine(dados: PedidoVitrine, suspeito: MotivoSuspeito | null) {
  const resposta = await salvarLeadDetalhado({
    ...contextoDaSessao(), pagina: "vitrine-v3", lang: "pt", objetivo: "proposta",
    nome: dados.nome, whatsapp: dados.whatsapp, canal: dados.instagram, plano: dados.plano,
    ...(suspeito ? { suspeito } : {}),
  });
  if (resposta.ok && !suspeito && !resposta.repetido) {
    trackLead({ ctaPosition: "form", plano: dados.plano, nome: dados.nome, whatsapp: dados.whatsapp, abriuWhats: false });
    mpTrack("PropostaSolicitada", { versao: "vitrine-v3", plano: dados.plano });
  }
  return { salvo: resposta.ok, link: linkContato("pt", dados), repetido: Boolean(resposta.repetido) };
}
