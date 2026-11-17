"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import s from "./raspadinha.module.css";

const CORES = ["#b49747", "#625222", "#d8c489", "#e8ddbc", "#8a7842", "#fffdf2"];
const fracao = (n: number) => { const v = Math.sin(n * 127.1 + 31.7) * 43758.5453; return v - Math.floor(v); };

export function CelebracaoRaspadinha({ intensidade }: { intensidade: "principal" | "cupom" }) {
  const [ativa, setAtiva] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ativa || !area.current) return;
    const el = area.current;
    const medir = () => {
      el.style.setProperty("--largura", `${el.clientWidth}px`);
      el.style.setProperty("--queda", `${el.clientHeight + 40}px`);
    };
    medir();
    const observer = new ResizeObserver(medir); observer.observe(el);
    return () => observer.disconnect();
  }, [ativa]);
  useEffect(() => {
    const movimento = matchMedia("(prefers-reduced-motion: reduce)");
    if (movimento.matches) return;
    setAtiva(true);
    const parar = () => { if (movimento.matches) setAtiva(false); };
    movimento.addEventListener("change", parar);
    const t = setTimeout(() => setAtiva(false), intensidade === "principal" ? 2300 : 1400);
    return () => { clearTimeout(t); movimento.removeEventListener("change", parar); };
  }, [intensidade]);
  if (!ativa) return null;
  return <div ref={area} className={`${s.celebracao} ${intensidade === "cupom" ? s.celebracaoCupom : ""}`} aria-hidden="true" data-celebracao={intensidade}>
    {Array.from({ length: intensidade === "principal" ? 64 : 22 }, (_, i) => <i key={i} className={s.confete} style={{
      "--origem": `${15 + fracao(i + 1) * 70}%`, "--deriva": `calc(var(--largura, 500px) * ${(fracao(i + 101) - .5) * .7})`,
      "--giro": `${(fracao(i + 211) - .5) * 1100}deg`, "--atraso": `${fracao(i + 311) * 160}ms`,
      "--duracao": `${(intensidade === "principal" ? 1650 : 850) + fracao(i + 401) * 350}ms`,
      width: 4 + fracao(i + 501) * 5, height: 7 + fracao(i + 601) * 8,
      backgroundColor: CORES[i % CORES.length], borderRadius: i % 4 === 0 ? "50%" : "1px",
    } as CSSProperties} />)}
  </div>;
}
