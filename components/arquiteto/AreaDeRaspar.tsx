"use client";

import { PointerEvent, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { BENEFICIOS_SORTEIO, type ResultadoBilhete } from "@/lib/sorteio-arquitetos";
import s from "./raspadinha.module.css";

const COLUNAS = 64, LINHAS = 24, LIMIAR = .4;
const CENTRO_X0 = 10, CENTRO_X1 = 54, CENTRO_Y0 = 7, CENTRO_Y1 = 17;
const CELULAS_CENTRAIS = (CENTRO_X1 - CENTRO_X0) * (CENTRO_Y1 - CENTRO_Y0);
type Ponto = { x: number; y: number };
type Motor = {
  ctx: CanvasRenderingContext2D; largura: number; altura: number;
  pincel: HTMLCanvasElement; diametro: number; anterior: Ponto | null;
  cobertura: Uint8Array; apagados: number; centraisApagados: number; ponteiro: number | null;
};
type Feedback = "inicio" | "raspando" | "suficiente";

function raspagemSuficiente(m: Motor) {
  const total = m.apagados / m.cobertura.length;
  // A mensagem já legível no centro não exige raspar as bordas restantes.
  return total >= LIMIAR || (total >= .24 && m.centraisApagados / CELULAS_CENTRAIS >= .72);
}

function criarPincel() {
  const pincel = document.createElement("canvas"); pincel.width = pincel.height = 80;
  const ctx = pincel.getContext("2d")!;
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(40, 40, 33, 0, Math.PI * 2); ctx.fill();
  // Pequenas lascas na borda; o centro apaga por completo, sem exigir pressão.
  for (let i = 0; i < 160; i++) {
    const angulo = i * 2.399963, raio = 33 + (i % 7);
    ctx.globalAlpha = .35 + (i % 5) * .13;
    ctx.beginPath(); ctx.arc(40 + Math.cos(angulo) * raio, 40 + Math.sin(angulo) * raio, 1 + (i % 3) * .4, 0, Math.PI * 2); ctx.fill();
  }
  return pincel;
}

function pintarPrata(ctx: CanvasRenderingContext2D, largura: number, altura: number) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  const prata = ctx.createLinearGradient(0, 0, largura, altura);
  [[0, "#b9bdc1"], [.22, "#e3e5e7"], [.4, "#fafafa"], [.51, "#d5d8db"], [.72, "#edf0f2"], [1, "#bcc1c5"]].forEach(([n, cor]) => prata.addColorStop(Number(n), String(cor)));
  ctx.fillStyle = prata; ctx.fillRect(0, 0, largura, altura);
  ctx.lineWidth = .5; ctx.strokeStyle = "#ffffff18";
  for (let y = 1; y < altura; y += 3) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(largura, y); ctx.stroke();
  }
  for (let i = 0; i < Math.min(6500, largura * altura / 8); i++) {
    ctx.fillStyle = i % 2 ? "#ffffff1c" : "#40464d0b";
    ctx.fillRect((i * 139.3) % largura, (i * 53.7) % altura, .8, .65);
  }
  ctx.strokeStyle = "#ffffff80"; ctx.strokeRect(.5, .5, largura - 1, altura - 1);
  const centroX = largura / 2, centroY = altura / 2;
  ctx.save(); ctx.translate(centroX, centroY - 30);
  ctx.strokeStyle = "#59636e"; ctx.lineWidth = 1.25; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.stroke(new Path2D("M-3 12-11 3Q-13 0-10-1Q-8-2-6 1L-3 4V-10Q-3-14 0-14Q3-14 3-10V-2Q4-5 7-4L12-2Q16 0 16 5L14 14Q13 18 8 18H3Q0 18-3 12Z"));
  ctx.stroke(new Path2D("M-14-17Q0-24 14-17M10-21 14-17 10-13M-10-21-14-17-10-13"));
  ctx.restore();
  ctx.textAlign = "center"; ctx.fillStyle = "#303a43";
  ctx.font = `400 ${Math.max(22, Math.min(30, largura * .09))}px Georgia, serif`;
  ctx.fillText("Raspe aqui", centroX, centroY + 21, largura - 24);
  ctx.font = `${largura < 260 ? 11 : 12}px system-ui, sans-serif`;
  ctx.fillStyle = "#53606b";
  ctx.fillText("para revelar seu presente", centroX, centroY + 43, largura - 24);
  ctx.restore();
}

export function AreaDeRaspar({ resultado, liberado, aoRevelar, premioRevelado, mensagemBloqueio = "Aguarde o sorteio" }: { resultado: ResultadoBilhete; liberado: boolean; aoRevelar: () => void; premioRevelado?: ReactNode; mensagemBloqueio?: string }) {
  const instrucao = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const janela = useRef<HTMLDivElement>(null);
  const alturaFechada = useRef(0);
  const motor = useRef<Motor | null>(null);
  const fila = useRef<Ponto[]>([]);
  const frame = useRef<number | null>(null);
  const tempoRevelacao = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizado = useRef(false);
  const feedbackAtual = useRef<Feedback>("inicio");
  const [feedback, setFeedback] = useState<Feedback>("inicio");
  const [pronto, setPronto] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const temPremio = !!premioRevelado;

  useLayoutEffect(() => {
    const el = janela.current;
    if (!el || !temPremio) return;
    const inicial = alturaFechada.current, final = el.getBoundingClientRect().height;
    const movimento = matchMedia("(prefers-reduced-motion: reduce)");
    if (!inicial || movimento.matches) return;
    // Só expande depois de soltar; o mesmo cartão continua montado.
    const animacao = el.animate([{ height: `${inicial}px` }, { height: `${final}px` }], {
      duration: 260, easing: "cubic-bezier(.22,1,.36,1)",
    });
    const parar = () => { if (movimento.matches) animacao.cancel(); };
    movimento.addEventListener("change", parar);
    return () => { movimento.removeEventListener("change", parar); animacao.cancel(); };
  }, [temPremio]);

  function informar(valor: Feedback) {
    if (feedbackAtual.current === valor) return;
    feedbackAtual.current = valor; setFeedback(valor);
  }

  const revelar = useCallback(() => {
    if (finalizado.current || !liberado) return;
    finalizado.current = true;
    if (motor.current) motor.current.ponteiro = null;
    fila.current = [];
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    alturaFechada.current = janela.current?.parentElement?.getBoundingClientRect().height || 0;
    setRevelado(true);
    // O resultado ao redor do cartão só muda depois da cobertura desaparecer.
    const duracao = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200;
    tempoRevelacao.current = setTimeout(aoRevelar, duracao);
  }, [aoRevelar, liberado]);

  useEffect(() => {
    if (!liberado || !canvas.current) return;
    const el = canvas.current;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const pincel = criarPincel();
    const redimensionar = () => {
      if (finalizado.current) return;
      const r = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      if (!r.width || !r.height) return;
      const antigo = motor.current;
      if (antigo && Math.abs(antigo.largura - r.width) < .5 && Math.abs(antigo.altura - r.height) < .5 && el.width === Math.round(r.width * dpr)) return;
      let mascara: HTMLCanvasElement | null = null;
      if (antigo) {
        mascara = document.createElement("canvas"); mascara.width = el.width; mascara.height = el.height;
        mascara.getContext("2d")!.drawImage(el, 0, 0);
      }
      el.width = Math.round(r.width * dpr); el.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pintarPrata(ctx, r.width, r.height);
      if (mascara) {
        ctx.globalCompositeOperation = "destination-in";
        ctx.drawImage(mascara, 0, 0, mascara.width, mascara.height, 0, 0, r.width, r.height);
      }
      motor.current = { ctx, largura: r.width, altura: r.height, pincel, diametro: 44,
        anterior: null, cobertura: antigo?.cobertura ?? new Uint8Array(COLUNAS * LINHAS), apagados: antigo?.apagados ?? 0, centraisApagados: antigo?.centraisApagados ?? 0, ponteiro: null };
      fila.current = []; setPronto(true);
    };
    redimensionar();
    const observer = new ResizeObserver(redimensionar); observer.observe(el);
    return () => observer.disconnect();
  }, [liberado]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (tempoRevelacao.current !== null) clearTimeout(tempoRevelacao.current);
  }, []);

  function carimbar(m: Motor, ponto: Ponto) {
    const raio = m.diametro / 2;
    m.ctx.drawImage(m.pincel, ponto.x - raio, ponto.y - raio, m.diametro, m.diametro);
    // Uma grade pequena acompanha a área realmente visitada. Não há leitura
    // dos pixels da tela durante o gesto, evitando travadas em celulares.
    const nucleo = raio * .82;
    const x0 = Math.max(0, Math.floor((ponto.x - nucleo) / m.largura * COLUNAS));
    const x1 = Math.min(COLUNAS - 1, Math.floor((ponto.x + nucleo) / m.largura * COLUNAS));
    const y0 = Math.max(0, Math.floor((ponto.y - nucleo) / m.altura * LINHAS));
    const y1 = Math.min(LINHAS - 1, Math.floor((ponto.y + nucleo) / m.altura * LINHAS));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const indice = y * COLUNAS + x;
      if (!m.cobertura[indice] && Math.hypot((x + .5) * m.largura / COLUNAS - ponto.x, (y + .5) * m.altura / LINHAS - ponto.y) <= nucleo) {
        m.cobertura[indice] = 1; m.apagados++;
        if (x >= CENTRO_X0 && x < CENTRO_X1 && y >= CENTRO_Y0 && y < CENTRO_Y1) m.centraisApagados++;
      }
    }
  }

  function desenhar() {
    frame.current = null;
    const m = motor.current;
    if (!m || finalizado.current) return;
    m.ctx.globalCompositeOperation = "destination-out";
    for (const ponto of fila.current.splice(0)) {
      const anterior = m.anterior || ponto;
      const passos = Math.max(1, Math.ceil(Math.hypot(ponto.x - anterior.x, ponto.y - anterior.y) / (m.diametro * .16)));
      for (let i = 1; i <= passos; i++) carimbar(m, { x: anterior.x + (ponto.x - anterior.x) * i / passos, y: anterior.y + (ponto.y - anterior.y) * i / passos });
      m.anterior = ponto;
    }
    informar(raspagemSuficiente(m) ? "suficiente" : "raspando");
  }

  function enfileirar(e: PointerEvent<HTMLCanvasElement>) {
    const m = motor.current;
    if (!m || m.ponteiro !== e.pointerId || finalizado.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ponto of eventos) fila.current.push({ x: ponto.clientX - r.left, y: ponto.clientY - r.top });
    fila.current.push({ x: e.clientX - r.left, y: e.clientY - r.top });
    if (frame.current === null) frame.current = requestAnimationFrame(desenhar);
  }

  function comecar(e: PointerEvent<HTMLCanvasElement>) {
    const m = motor.current;
    if (!m || !pronto || finalizado.current || !e.isPrimary || e.button !== 0 || m.ponteiro !== null) return;
    m.ponteiro = e.pointerId; m.anterior = null;
    // Medida em pixels visíveis: o dedo não vira um pincel fino no celular.
    m.diametro = e.pointerType === "touch" ? 60 : e.pointerType === "pen" ? 40 : 44;
    e.currentTarget.setPointerCapture(e.pointerId);
    enfileirar(e);
  }

  function terminar(e: PointerEvent<HTMLCanvasElement>, cancelar = false) {
    const m = motor.current;
    if (!m || m.ponteiro !== e.pointerId) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    desenhar(); m.ponteiro = null; m.anterior = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (!cancelar && raspagemSuficiente(m)) revelar();
  }

  return <div className={`${s.interacao} ${premioRevelado ? s.interacaoPremiada : ""} ${!liberado ? s.interacaoBloqueada : ""}`} role="group" aria-label="Bilhete raspável" aria-describedby={liberado && !revelado ? instrucao : undefined} data-raspagem={revelado ? "revelada" : feedback === "suficiente" ? "pronta" : feedback === "raspando" ? "raspando" : "coberta"}>
    <div ref={janela} className={`${s.raspar} ${revelado ? s.revelado : ""} ${premioRevelado ? s.rasparPremiada : ""}`}>
      <div className={s.premio} aria-hidden={!revelado}>
        {premioRevelado || <div className={s.antecipacaoPremio} data-previa-raspagem>
          <span className={s.chamadaRaspada}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" /></svg>
            Você ganhou
          </span>
          <strong>{resultado === "site" ? "um site!" : BENEFICIOS_SORTEIO[resultado].destaque}</strong>
          <span className={s.legendaRaspada}>{resultado === "site" ? "De presente para o seu escritório." : BENEFICIOS_SORTEIO[resultado].legenda}</span>
        </div>}
      </div>
      {liberado ? <>
        <canvas ref={canvas} aria-hidden="true" onPointerDown={comecar} onPointerMove={enfileirar}
          onPointerUp={e => terminar(e)} onPointerCancel={e => terminar(e, true)} onLostPointerCapture={e => terminar(e, true)} draggable={false} />
        {!pronto && !revelado && <span className={s.preparando}>Preparando seu bilhete…</span>}
      </> : <div className={s.bloqueado}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><span>{mensagemBloqueio}</span></div>}
    </div>
    {liberado && !revelado && <>
      <span id={instrucao} className={s.somenteLeitura}>Raspe a faixa com o dedo ou o mouse para revelar seu presente, ou use o botão Revelar sem raspar.</span>
      <div className={s.controlesRaspagem}>
        <span className={s.feedbackRaspagem} role="status">{feedback === "suficiente" ? "Solte para revelar" : feedback === "raspando" ? "Continue raspando" : "Seu presente está aqui"}</span>
        <button className={s.revelar} type="button" onClick={revelar}>Revelar sem raspar</button>
      </div>
    </>}
  </div>;
}
