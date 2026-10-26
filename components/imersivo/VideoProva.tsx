"use client";

import { useEffect, useRef } from "react";

/* O site conceito da Monster sendo rolado (gravado quadro a quadro em 15/10), em loop e mudo:
   a prova do hero é o SITE funcionando, não só o filme.
   Com "reduzir movimento" ele fica parado no pôster e ganha os controles:
   quem quiser ver, aperta o play. */
export function VideoProva({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.controls = true;
      return;
    }
    v.play().catch(() => {
      // autoplay bloqueado (modo economia): mostra os controles no lugar
      v.controls = true;
    });
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src="/assets/imersivo/monster-site.mp4"
      poster="/assets/imersivo/monster-site-poster.webp"
      muted
      loop
      playsInline
      preload="metadata"
      width={960}
      height={540}
      aria-label="Um site imersivo sendo rolado: o título abre sobre a lata na selva, o cenário muda com o scroll entre selva, gelo e trópico, os benefícios entram em cada cena e no fim as três latas mostram a ficha ao passar o mouse"
    />
  );
}
