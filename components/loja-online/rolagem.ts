"use client";

/* O motor das seções editoriais da /loja-online (07/11/2026): um só ouvinte
   de rolagem (passivo, num rAF) grava em cada [data-p] dentro de `ref` a
   própria fração na tela, de 0 a 1, na variável --p. O CSS faz o resto.

   data-p="passa": 0 quando o topo encosta embaixo da tela, 1 quando o fim sai em cima.
   data-p="entra": 0 com o topo a 90% da tela, 1 com o topo a 35% (para frases).

   Com "reduzir movimento", --p fica em 1 e o CSS de cada seção para tudo. */

import { RefObject, useEffect } from "react";

export function useRolagem(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    const alvos = [...raiz.querySelectorAll<HTMLElement>("[data-p]")];
    if (raiz.dataset.p) alvos.push(raiz);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      alvos.forEach(a => a.style.setProperty("--p", "1"));
      return;
    }
    let pedido = 0;
    const medir = () => {
      pedido = 0;
      const vh = window.innerHeight;
      for (const a of alvos) {
        const r = a.getBoundingClientRect();
        const p = a.dataset.p === "entra"
          ? (vh * .9 - r.top) / (vh * .55)
          : (vh - r.top) / (vh + r.height);
        a.style.setProperty("--p", String(Math.min(1, Math.max(0, p))));
      }
    };
    const pedir = () => { if (!pedido) pedido = requestAnimationFrame(medir); };
    medir();
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    return () => { window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); cancelAnimationFrame(pedido); };
  }, [ref]);
}
