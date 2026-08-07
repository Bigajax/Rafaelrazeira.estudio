/* ============================================================
   O ENVIO DE LEAD DA VITRINE — um caminho só para os dois formulários.

   Desde 07/08 a página tem dois pontos de captura: o formulário completo da
   oferta (#contratar) e o mini-formulário do hero (#hero-form). As regras do
   envio são as mesmas e moram aqui para não existirem duas cópias que
   divergem caladas: Lead disparado ANTES de qualquer navegação com
   `abriuWhats: false`, gravação no banco antes de qualquer WhatsApp, e o
   WhatsApp abrindo só como fallback quando a gravação falha, que é quando
   "Abriu o WhatsApp" vira verdade.

   Quem chama fica dono só do estado de tela (enviando/enviado/pendente). O
   contrato de components/lead.ts e da rota /api/lead não muda: o hero manda
   `plano` ausente e a rota o aceita como nulo.
   ============================================================ */

import { salvarLead } from "@/components/lead";
import { contextoDaSessao, irParaWhatsapp, mpTrack, refDaVisita, trackLead } from "@/components/vitrine/tracking";

export async function enviarLeadVitrine(d: {
  nome: string;
  whatsapp: string;
  instagram?: string;
  plano?: string;
  ctaPosition: "form" | "hero_form";
}): Promise<{ salvo: boolean; linkWa: string }> {
  /* `ctaPosition` não é rótulo qualquer: "form" e "hero_form" são os valores
     que o tracking reconhece como contratação (POSICOES_FORMULARIO), os
     únicos que chegam como Lead na Mixpanel. */
  trackLead({ ctaPosition: d.ctaPosition, plano: d.plano, nome: d.nome, whatsapp: d.whatsapp, abriuWhats: false });

  /* A primeira linha é a mesma dos CTAs da página: a conversa começa do
     mesmo jeito, venha de onde vier. O telefone não entra na mensagem de
     propósito (ela sai do WhatsApp da própria pessoa) e o código da visita
     fecha a última linha, para a venda registrada depois amarrar na visita. */
  const ref = refDaVisita();
  const text = encodeURIComponent([
    "Oi Rafael! Quero uma vitrine para minha loja.",
    `Nome: ${d.nome}`,
    d.instagram ? `Loja: ${d.instagram}` : "",
    d.plano ? `Plano: ${d.plano}` : "",
    ref ? `Ref: ${ref}` : "",
  ].filter(Boolean).join("\n"));
  const linkWa = `https://wa.me/5544999997219?text=${text}`;

  const salvo = await salvarLead({
    pagina: "vitrine-digital",
    nome: d.nome,
    whatsapp: d.whatsapp,
    canal: d.instagram || "",
    ...(d.plano ? { plano: d.plano } : {}),
    ...contextoDaSessao(),
  });

  if (salvo) {
    mpTrack("LeadSalvo", { cta_position: d.ctaPosition, plano: d.plano });
    return { salvo: true, linkWa };
  }

  /* Fallback: o comportamento inteiro de antes da inversão de 06/08.
     location.href na mesma aba, 300ms depois do Lead sair, porque
     window.open o navegador do Instagram bloqueia ou abre em aba fantasma. */
  mpTrack("AbriuWhatsApp", { cta_position: d.ctaPosition, plano: d.plano, origem: "fallback" });
  irParaWhatsapp(linkWa);
  return { salvo: false, linkWa };
}
