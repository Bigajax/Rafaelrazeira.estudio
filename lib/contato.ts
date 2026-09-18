/* ============================================================
   OS DOIS CANAIS DO ESTÚDIO, num lugar só

   O número do WhatsApp estava literal em lead-flow.ts, no /portfolio e no
   config.js da estática; o e-mail, só no config.js. Com a versão em
   inglês, o CTA gringo vai para e-mail (não há Stripe nem Calendly nesta
   primeira versão), então os dois precisam de um endereço único.
   ============================================================ */
export const WHATSAPP = "5544991246187";
export const WHATSAPP_EXIBIDO = "(44) 99124-6187";
export const EMAIL = "rafael.rbarbon@gmail.com";

export function linkWhatsApp(mensagem: string): string {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
}

/* mailto: com assunto e corpo pré-preenchidos. Os clientes de e-mail
   entendem \n no corpo depois de encodeURIComponent. */
export function linkEmail(assunto: string, corpo = ""): string {
  const q = [`subject=${encodeURIComponent(assunto)}`, corpo ? `body=${encodeURIComponent(corpo)}` : ""]
    .filter(Boolean).join("&");
  return `mailto:${EMAIL}?${q}`;
}
