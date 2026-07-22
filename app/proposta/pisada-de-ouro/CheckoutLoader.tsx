"use client";

import { useEffect } from "react";

/* Liga o checkout das propostas (Pix + cartão, modal + WhatsApp automático
   na confirmação) que já existe em /js/proposta-checkout.js. O next.config
   serve esse arquivo e o CSS a partir de public/estudio via rewrite.

   O script lê data-proposta do <body> e se prende aos botões que têm
   data-checkout-item. Por isso setamos o atributo e só então injetamos o
   script — os botões já vêm no HTML da página (renderizados no servidor). */
export default function CheckoutLoader() {
  useEffect(() => {
    document.body.setAttribute("data-proposta", "pisada-de-ouro");

    if (!document.getElementById("ck-css")) {
      const link = document.createElement("link");
      link.id = "ck-css";
      link.rel = "stylesheet";
      link.href = "/css/proposta-checkout.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("ck-js")) {
      const script = document.createElement("script");
      script.id = "ck-js";
      script.src = "/js/proposta-checkout.js";
      document.body.appendChild(script);
    }

    return () => {
      document.body.removeAttribute("data-proposta");
    };
  }, []);

  return null;
}
