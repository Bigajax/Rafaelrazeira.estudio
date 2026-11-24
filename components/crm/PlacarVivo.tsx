"use client";

/* ============================================================
   O PLACAR VIVO (24/11/2026)
   Três peças pequenas para os quatro números do alto do Hoje:

   - <Contagem>   o número conta do zero até o valor quando a tela abre.
                  Uma vez por abertura, em 600ms; quando o valor muda depois
                  (um contato saiu da fila), ele troca na hora, sem contar de
                  novo: contar a cada clique seria atraso em tela de trabalho.
   - <Faisca>     o desenho dos últimos 14 dias atrás do número. Só entra
                  onde existe história por dia (preço e fechamento).
   - <Composicao> a fila repartida pelos grupos, numa barra fina: a fila não
                  tem história, mas tem composição, e é ela que diz o que o
                  dia pede.

   Tudo decorativo para o leitor de tela (aria-hidden): o número e o rótulo
   já dizem o que importa, e a série vai num title para quem passa o mouse.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import c from "./atendimento.module.css";

export function Contagem({ valor }: { valor: number }) {
  const [mostrado, setMostrado] = useState(valor);
  const contou = useRef(false);
  useEffect(() => {
    if (contou.current || valor <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      contou.current = true;
      setMostrado(valor);
      return;
    }
    contou.current = true;
    const inicio = performance.now();
    const dura = 600;
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / dura);
      /* ease-out: corre no começo e freia no número certo */
      setMostrado(Math.round(valor * (1 - Math.pow(1 - t, 3))));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    setMostrado(0);
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor]);
  return <>{mostrado}</>;
}

export function Faisca({ serie, rotulo }: { serie: number[]; rotulo: string }) {
  const total = serie.reduce((a, b) => a + b, 0);
  if (serie.length < 2 || total === 0) return null;
  const L = 120, A = 36, teto = Math.max(...serie, 1);
  const x = (i: number) => (i / (serie.length - 1)) * L;
  const y = (v: number) => A - 3 - (v / teto) * (A - 8);
  const linha = serie.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg className={c.faisca} viewBox={`0 0 ${L} ${A}`} preserveAspectRatio="none" aria-hidden>
      <title>{`${rotulo} nos últimos ${serie.length} dias: ${serie.join(", ")}`}</title>
      <path className={c.faiscaArea} d={`${linha} L${L} ${A} L0 ${A} Z`} />
      <path className={c.faiscaLinha} d={linha} pathLength={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Composicao({ partes }: { partes: { id: string; nome: string; n: number }[] }) {
  const total = partes.reduce((a, p) => a + p.n, 0);
  if (!total) return null;
  return (
    <span className={c.composicao} aria-hidden title={partes.filter((p) => p.n).map((p) => `${p.nome}: ${p.n}`).join("\n")}>
      {partes.filter((p) => p.n).map((p) => (
        <i key={p.id} data-grupo={p.id} style={{ flexGrow: p.n }} />
      ))}
    </span>
  );
}
