"use client";

import { useEffect, useState } from "react";
import s from "@/app/vitrine-digital/vitrine.module.css";

/* ---------- tela de carregamento ----------
   O mesmo rito das outras páginas do estúdio: pinta preto com a logo no
   primeiro frame e se desfaz em quadrados que somem de baixo para cima
   (js/lib/loader.js na landing principal). Aqui é a tradução para React,
   porque esta página não carrega aquele bundle.

   O overlay sai no HTML do servidor, então cobre a tela antes de qualquer
   JS rodar. A grade da saída só nasce na hora de sair: renderizar centenas
   de spans durante o carregamento seria pagar caro pelo efeito antes de
   ele existir. Os tempos são os mesmos da landing: mínimo para a marca
   registrar, teto para conexão lenta nunca prender ninguém. */

const MIN_SHOW = 700;    // ms mínimos com a logo na tela (evita "flash")
/* Teto de 7s era teto de ninguém: quem espera 7 segundos numa tela preta já
   foi embora. A saída normal é o evento `load`, e `load` só chega depois de
   TODAS as imagens não-lazy e das fontes — no 4G do navegador interno do
   Instagram isso passa fácil de 4 segundos, com a página inteira já pintada
   embaixo do overlay. Com metade das sessões durando menos de 10s, era o
   maior pedaço da visita gasto olhando preto.
   2,2s é o novo teto. Em conexão boa nada muda (o `load` chega antes e o
   MIN_SHOW é quem manda); em conexão ruim o conteúdo aparece no lugar da
   espera. A animação de saída é a mesma, então a página não muda de cara:
   muda só quanto tempo ela demora a ter cara. */
const MAX_WAIT = 2200;   // teto: sai mesmo se algum asset demorar
const ROW_STEP = 55;     // ms entre uma fileira e a de cima
const JITTER   = 110;    // aleatoriedade por quadrado (o "pixelado")

type Grade = { cols: number; rows: number; delays: number[] };

export function Loader() {
  const [grade, setGrade] = useState<Grade | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    const t0 = performance.now();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let deixou = false;

    const leave = () => {
      if (deixou) return;   // load + teto de segurança podem chamar 2x
      deixou = true;
      if (reduced) {
        setSaindo(true);
        timers.push(setTimeout(() => setFim(true), 450));
        return;
      }
      // Grade de "pixels": ~9 colunas no celular, quadrados de ~120px no desktop
      const cell = Math.min(Math.max(window.innerWidth / 9, 44), 120);
      const cols = Math.ceil(window.innerWidth / cell);
      const rows = Math.ceil(window.innerHeight / cell);
      const delays: number[] = [];
      let maxDelay = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = (rows - 1 - r) * ROW_STEP + Math.random() * JITTER;
          delays.push(d);
          maxDelay = Math.max(maxDelay, d);
        }
      }
      setGrade({ cols, rows, delays });
      // dois frames: garante que a grade pintou antes de o fundo sumir
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setSaindo(true);
        timers.push(setTimeout(() => setFim(true), maxDelay + 350));
      }));
    };

    const exitAfterMin = () => {
      const elapsed = performance.now() - t0;
      timers.push(setTimeout(leave, Math.max(0, MIN_SHOW - elapsed)));
    };

    if (document.readyState === "complete") exitAfterMin();
    else window.addEventListener("load", exitAfterMin, { once: true });
    timers.push(setTimeout(leave, MAX_WAIT));   // segurança: nunca prende o visitante

    return () => timers.forEach(clearTimeout);
  }, []);

  /* trava o scroll enquanto o overlay cobre a tela; solta assim que ele sai */
  useEffect(() => {
    document.body.style.overflow = fim ? "" : "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [fim]);

  if (fim) return null;

  return <>
    {/* sem JS o overlay nunca receberia a ordem de sair: some por inteiro */}
    <noscript><style>{`#vitrine-loader{display:none}`}</style></noscript>
    <div id="vitrine-loader" className={`${s.loader} ${saindo ? s.loaderLeaving : ""}`} aria-hidden="true">
      <div className={s.loaderCenter}>
        {/* img crua de propósito: next/image adia e otimiza, e aqui a logo
            precisa estar no primeiro paint, não depois dele */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.loaderLogo} src="/assets/logo-loader.png" alt="" />
        <p className={s.loaderText}>Carregando…</p>
      </div>
      {grade && <div
        className={s.loaderGrid}
        style={{ gridTemplateColumns: `repeat(${grade.cols},1fr)`, gridTemplateRows: `repeat(${grade.rows},1fr)` }}
      >
        {grade.delays.map((d, i) => <span key={i} style={{ transitionDelay: `${d.toFixed(0)}ms` }} />)}
      </div>}
    </div>
  </>;
}
