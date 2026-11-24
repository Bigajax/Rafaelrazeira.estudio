"use client";

/* ============================================================
   O TEMA ESCURO E A LUZ DO VIDRO (24/11/2026)

   <BotaoTema>   troca o painel entre claro e escuro. A escolha fica em
                 localStorage (crm_tema) e é aplicada no <html> como
                 data-crm-tema, que é o que o CSS lê. Quem aplica na primeira
                 pintura é o script inline do app/(pt)/crm/layout.tsx, para a
                 tela não piscar clara antes de escurecer; aqui só se troca.
                 O claro é o padrão: o escuro é escolha de quem clica.

   <LuzDoVidro>  o brilho na borda do cartão de vidro que acompanha o mouse.
                 Um ouvinte só, no documento, que procura o cartão marcado
                 com data-luz sob o cursor e escreve nele --lx e --ly (em px).
                 O desenho é do CSS. Roda no máximo uma vez por quadro, só
                 com mouse de verdade, e some com "reduzir movimento".
   ============================================================ */

import { useEffect, useState } from "react";
import s from "@/app/(pt)/crm/crm.module.css";

const CHAVE = "crm_tema";

export function BotaoTema() {
  const [escuro, setEscuro] = useState(false);
  useEffect(() => {
    setEscuro(document.documentElement.dataset.crmTema === "escuro");
  }, []);
  const trocar = () => {
    const novo = !escuro;
    setEscuro(novo);
    if (novo) document.documentElement.dataset.crmTema = "escuro";
    else delete document.documentElement.dataset.crmTema;
    try {
      localStorage.setItem(CHAVE, novo ? "escuro" : "claro");
    } catch {
      /* sem armazenamento (aba anônima): o tema vale até fechar */
    }
  };
  return (
    <button type="button" className={s.botaoTema} onClick={trocar} aria-pressed={escuro} title={escuro ? "Voltar para o tema claro" : "Passar para o tema escuro"}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {escuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
      {escuro ? "Claro" : "Escuro"}
    </button>
  );
}

export function LuzDoVidro() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    let ultimo: PointerEvent | null = null;
    const pintar = () => {
      quadro = 0;
      const e = ultimo;
      if (!e) return;
      const cartao = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-luz]");
      if (!cartao) return;
      const r = cartao.getBoundingClientRect();
      cartao.style.setProperty("--lx", `${Math.round(e.clientX - r.left)}px`);
      cartao.style.setProperty("--ly", `${Math.round(e.clientY - r.top)}px`);
    };
    const aoMover = (e: PointerEvent) => {
      ultimo = e;
      if (!quadro) quadro = requestAnimationFrame(pintar);
    };
    document.addEventListener("pointermove", aoMover, { passive: true });
    return () => {
      document.removeEventListener("pointermove", aoMover);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, []);
  return null;
}
