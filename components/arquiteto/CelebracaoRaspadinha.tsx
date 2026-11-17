"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import s from "./raspadinha.module.css";

const CORES = ["#fff9e9", "#b8d7bf", "#46946b", "#f1eedb", "#7db48d", "#046c40"];
const fracao = (n: number) => { const v = Math.sin(n * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };

export function CelebracaoRaspadinha({ intensidade }: { intensidade: "principal" | "cupom" }) {
  const [ativa, setAtiva] = useState(false);
  const [compacta, setCompacta] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ativa || !area.current) return;
    const el = area.current;
    const caixa = el.getBoundingClientRect();
    const premio = el.closest("[data-bilhete]")?.querySelector('[aria-label="Resultado do bilhete"]')?.getBoundingClientRect();
    if (!premio) return;
    const inicioEsquerda = premio.left - caixa.left + 8;
    const inicioDireita = premio.right - caixa.left - 8;
    // O disparo acompanha os cantos do prêmio, mesmo durante a expansão do cartão.
    const origemY = premio.top - caixa.top + Math.min(80, premio.height * .22);
    const escala = Math.min(1.2, Math.max(.5, premio.width / 500));
    const animacoes: Animation[] = [];
    let fim = 0;
    el.querySelectorAll<HTMLElement>("i").forEach((peca, i) => {
      const esquerda = i % 2 === 0;
      const duracao = (intensidade === "principal" ? 1500 : 950) + fracao(i + 401) * (intensidade === "principal" ? 500 : 300);
      const atraso = fracao(i + 311) * 80;
      const vx = (esquerda ? 1 : -1) * (105 + fracao(i + 101) * 160) * escala;
      const vy = -(100 + fracao(i + 1) * 110) * (intensidade === "principal" ? 1 : .8);
      const gravidade = 220 + fracao(i + 701) * 100;
      const giro = (fracao(i + 211) - .5) * 440;
      peca.style.left = `${esquerda ? inicioEsquerda : inicioDireita}px`;
      peca.style.top = `${origemY + fracao(i + 801) * 9}px`;
      // Trajetória balística com resistência horizontal; só transform e opacity por quadro.
      const quadros = Array.from({ length: 25 }, (_, k) => {
        const progresso = k / 24, segundos = progresso * duracao / 1000;
        const x = vx * (1 - Math.exp(-.7 * segundos)) / .7;
        const y = vy * segundos + .5 * gravidade * segundos * segundos;
        return {
          offset: progresso,
          opacity: Math.min(1, progresso / .05, (1 - progresso) / .3),
          transform: `translate3d(${x}px,${y}px,0) rotate(${giro * progresso}deg) rotateX(${(120 + fracao(i + 901) * 180) * progresso}deg)`,
        };
      });
      animacoes.push(peca.animate(quadros, { duration: duracao, delay: atraso, easing: "linear", fill: "both" }));
      fim = Math.max(fim, duracao + atraso);
    });
    const t = setTimeout(() => setAtiva(false), fim + 40);
    return () => { clearTimeout(t); animacoes.forEach(a => a.cancel()); };
  }, [ativa, intensidade, compacta]);
  useEffect(() => {
    const movimento = matchMedia("(prefers-reduced-motion: reduce)");
    if (movimento.matches) return;
    setCompacta(matchMedia("(max-width: 480px)").matches);
    setAtiva(true);
    const parar = () => { if (movimento.matches) setAtiva(false); };
    movimento.addEventListener("change", parar);
    return () => movimento.removeEventListener("change", parar);
  }, [intensidade]);
  if (!ativa) return null;
  return <div ref={area} className={`${s.celebracao} ${intensidade === "cupom" ? s.celebracaoCupom : ""}`} aria-hidden="true" data-celebracao={intensidade}>
    {Array.from({ length: intensidade === "principal" ? compacta ? 120 : 180 : compacta ? 40 : 60 }, (_, i) => <i key={i} className={s.confete} style={{
      width: 4 + fracao(i + 501) * 4, height: 6 + fracao(i + 601) * 7,
      backgroundColor: i % 13 === 0 ? "#e31b62" : CORES[i % CORES.length], borderRadius: i % 5 === 0 ? "50%" : "1px",
    }} />)}
  </div>;
}
