"use client";

import { useEffect } from "react";
import { ligarAncoras } from "@/components/vitrine/ancora";
import { initTracking, utmsDaSessao } from "@/components/vitrine/tracking";
import checkoutStyles from "./landing-v4.module.css";

// A V4 cobra a entrada da tabela (lib/propostas.ts, "vitrine-direta"), com métricas próprias.
export function MontagemV4({ valor }: { valor: number }) {
  useEffect(() => {
    initTracking({ page: "vitrine-v4", valor, currency: "BRL", lang: "pt" });
    // Guarda as UTMs do primeiro toque já na chegada: a V4 não tem formulário, e o
    // checkout (proposta-checkout.js) lê "utm_sessao" para levar o anúncio até o pagamento.
    utmsDaSessao();
    const desligarAncoras = ligarAncoras();

    const pagina = document.getElementById("principal")?.parentElement;
    const fonte = pagina ? getComputedStyle(pagina) : null;
    const fontes = ["--font-body", "--font-display"].map(nome => ({ nome, antes: document.body.style.getPropertyValue(nome) }));
    for (const { nome } of fontes) {
      const valor = fonte?.getPropertyValue(nome);
      if (valor) document.body.style.setProperty(nome, valor);
    }
    // O checkout é inserido fora da página: mantém o foco na janela e volta ao botão.
    let janela: HTMLElement | null = null;
    let anterior: HTMLElement | null = null;
    const inerteAntes = pagina?.inert ?? false;
    const observarJanela = new MutationObserver(() => {
      const aberta = document.querySelector<HTMLElement>(".ck-overlay");
      if (aberta === janela) return;
      if (aberta) {
        aberta.classList.add(checkoutStyles.checkoutPortal);
        anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (pagina) pagina.inert = true;
        aberta.querySelector<HTMLElement>(".ck-close")?.focus();
      } else {
        if (pagina) pagina.inert = inerteAntes;
        if (anterior?.isConnected) anterior.focus({ preventScroll: true });
      }
      janela = aberta;
    });
    observarJanela.observe(document.body, { childList: true });
    const manterFoco = (e: KeyboardEvent) => {
      if (!janela || e.key !== "Tab") return;
      const campos = Array.from(janela.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],iframe,[tabindex]:not([tabindex='-1'])")).filter(el => el.tabIndex >= 0 && el.getClientRects().length);
      const primeiro = campos[0], ultimo = campos.at(-1);
      if (!primeiro || !ultimo) return;
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    document.addEventListener("keydown", manterFoco);

    document.body.setAttribute("data-proposta", "vitrine-direta");
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
      desligarAncoras();
      observarJanela.disconnect();
      document.removeEventListener("keydown", manterFoco);
      if (pagina) pagina.inert = inerteAntes;
      janela?.remove();
      if (janela) document.body.style.overflow = "";
      for (const { nome, antes } of fontes) { if (antes) document.body.style.setProperty(nome, antes); else document.body.style.removeProperty(nome); }
      document.body.removeAttribute("data-proposta");
    };
  }, [valor]);
  return null;
}
