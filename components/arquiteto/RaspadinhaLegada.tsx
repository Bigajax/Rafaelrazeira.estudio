"use client";

import { FormEvent, PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { linkWhatsApp } from "@/lib/contato";
import { RASPADINHA, reaisCentavos, type EstadoRaspadinha } from "@/lib/raspadinha";
import s from "./raspadinha-legada.module.css";

function AreaDeRaspar({ aoRevelar }: { aoRevelar: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const ultimo = useRef<{ x: number; y: number } | null>(null);
  const [pronto, setPronto] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const revelar = useCallback(() => { setRevelado(true); aoRevelar(); }, [aoRevelar]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const gradiente = ctx.createLinearGradient(0, 0, 600, 320);
    gradiente.addColorStop(0, "#d9ddd7"); gradiente.addColorStop(.45, "#f2f1eb"); gradiente.addColorStop(1, "#c9cec7");
    ctx.fillStyle = gradiente; ctx.fillRect(0, 0, 600, 320);
    ctx.strokeStyle = "#89978d30"; ctx.lineWidth = 1;
    for (let i = -320; i < 600; i += 24) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 320, 320); ctx.stroke(); }
    ctx.fillStyle = "#283e32"; ctx.textAlign = "center";
    ctx.font = "500 35px system-ui, sans-serif"; ctx.fillText("Raspe aqui", 300, 154);
    ctx.font = "20px system-ui, sans-serif"; ctx.fillText("e descubra o seu presente", 300, 193);
    setPronto(true);
  }, []);

  function raspar(e: PointerEvent<HTMLCanvasElement>, inicio = false) {
    if (revelado || (!inicio && !ultimo.current)) return;
    const el = e.currentTarget;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const r = el.getBoundingClientRect();
    const ponto = { x: (e.clientX - r.left) * 600 / r.width, y: (e.clientY - r.top) * 320 / r.height };
    if (inicio) { if (!e.isPrimary || e.button !== 0) return; el.setPointerCapture(e.pointerId); ultimo.current = ponto; }
    const de = ultimo.current!;
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 62; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(de.x, de.y); ctx.lineTo(ponto.x + .01, ponto.y + .01); ctx.stroke();
    ultimo.current = ponto;
  }

  function terminar() {
    if (!ultimo.current) return;
    ultimo.current = null;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const dados = ctx.getImageData(0, 0, 600, 320).data;
    let apagados = 0;
    for (let i = 3; i < dados.length; i += 64) if (dados[i] < 128) apagados++;
    if (apagados / (dados.length / 64) > .38) revelar();
  }

  return <>
    <div className={`${s.raspar} ${revelado ? s.revelado : ""}`}>
      <div className={s.premio} aria-hidden={!revelado}>
        <span>O site do seu escritório com</span>
        <strong>50<span>%</span></strong>
        <span>de desconto</span>
      </div>
      {!revelado && <>
        <canvas ref={canvas} width={600} height={320} aria-hidden="true"
          onPointerDown={e => raspar(e, true)} onPointerMove={e => raspar(e)}
          onPointerUp={terminar} onPointerCancel={terminar} onLostPointerCapture={terminar} />
        {!pronto && <span className={s.preparando}>Preparando a raspadinha…</span>}
      </>}
    </div>
    {!revelado && <button type="button" className={s.textoBotao} onClick={revelar}>Revelar sem raspar</button>}
  </>;
}

export function RaspadinhaLegada({ token, previa = false }: { token?: string; previa?: boolean }) {
  const [estado, setEstado] = useState<EstadoRaspadinha | null>(previa ? { estado: "disponivel" } : null);
  const [revelado, setRevelado] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const aoRevelar = useCallback(() => setRevelado(true), []);
  const endpoint = `/api/arquitetos/raspadinha/${token}`;

  useEffect(() => {
    if (previa) return;
    const ctrl = new AbortController();
    setErro("");
    fetch(endpoint, { cache: "no-store", signal: ctrl.signal }).then(async r => {
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || "Não consegui abrir a raspadinha.");
      setEstado(dados);
    }).catch(e => { if (!ctrl.signal.aborted) setErro(e.message || "Confira sua conexão e tente novamente."); });
    return () => ctrl.abort();
  }, [endpoint, previa, tentativa]);

  async function confirmar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando || previa) return;
    const campos = new FormData(e.currentTarget);
    const nome = String(campos.get("nome") || "").trim();
    const whatsapp = String(campos.get("whatsapp") || "");
    if (nome.length < 2 || !whatsappValido(whatsapp)) { setErro("Preencha seu nome e um WhatsApp válido com DDD."); return; }
    setEnviando(true); setErro("");
    try {
      const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, whatsapp }) });
      const dados = await r.json();
      if (dados.estado) setEstado(dados);
      else throw new Error(dados.erro || "Não consegui confirmar. Tente novamente.");
    } catch (e) { setErro(e instanceof Error ? e.message : "Confira a conexão e tente novamente."); }
    finally { setEnviando(false); }
  }

  const recebido = estado?.estado === "resgatado" || estado?.estado === "utilizado";
  return <div className={s.page}>
    <div className={s.fotoFundo} aria-hidden="true" />
    <header className={s.topo}>
      <a href="/arquitetos" aria-label="Rafael Razeira Estúdio — sites para arquitetos">
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
      </a>
      <span>Um presente para o seu escritório</span>
    </header>
    <main className={s.main}>
      <section className={s.cartao} aria-labelledby="titulo-raspadinha">
        <p className={s.etiqueta}>{previa ? "Prévia · sem resgate real" : "Palestra · Bloco Arquitetura"}</p>
        <h1 id="titulo-raspadinha">{recebido ? <>O presente <em>é seu.</em></> : estado?.estado === "indisponivel" ? <>Este presente <em>já tem dono.</em></> : <>A próxima surpresa <em>é sua.</em></>}</h1>
        {!estado && !erro && <p role="status">Preparando o seu presente…</p>}
        {estado?.estado === "disponivel" && <>
          <p className={s.intro}>Um presente do Rafael Razeira Estúdio para quem vai dar um novo espaço aos próprios projetos.</p>
          <AreaDeRaspar aoRevelar={aoRevelar} />
          {revelado && <div className={s.resultado} aria-live="polite">
            <p className={s.linhaPreco}>De <s>{reaisCentavos(RASPADINHA.originalCentavos)}</s> por <strong>{reaisCentavos(RASPADINHA.finalCentavos)}</strong></p>
            <p className={s.detalhe}>Na criação do site do seu escritório de arquitetura. Um único prêmio, para a pessoa sorteada na palestra.</p>
            {previa ? <div className={s.aviso}>Esta é a prévia. O QR code real será gerado pelo Rafael e entregue à pessoa sorteada.</div> : <form onSubmit={confirmar} className={s.form}>
              <p className={s.formTitulo}>Deixe o presente no seu nome.</p>
              <label>Seu nome<input name="nome" autoComplete="name" required minLength={2} maxLength={100} placeholder="Como você se chama?" /></label>
              <label>Seu WhatsApp<input name="whatsapp" type="tel" autoComplete="tel" inputMode="tel" required maxLength={16} placeholder="(44) 99999-0000" onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); }} /></label>
              <p className={s.detalhe}>Usaremos esses dados para identificar o ganhador e combinar o site. <a href="/privacidade" target="_blank" rel="noreferrer">Privacidade</a></p>
              <button className={s.botao} type="submit" disabled={enviando}>{enviando ? "Confirmando…" : "Resgatar meu presente"}</button>
              <p className={s.micro}>Confirme apenas se você é a pessoa sorteada. Este cupom tem um único resgate.</p>
            </form>}
          </div>}
          {!revelado && <p className={s.micro}>Passe o dedo na área acima para revelar.</p>}
        </>}
        {recebido && <div className={s.resultado} aria-live="polite">
          <p className={s.intro}>{estado.nome}, seu desconto de 50% está registrado.</p>
          <div className={s.recibo}><span>Seu cupom</span><strong>{estado.codigo}</strong><span>{estado.estado === "utilizado" ? "Cupom já utilizado" : "Resgate confirmado · uso único"}</span></div>
          <p className={s.linhaPreco}>De <s>{reaisCentavos(RASPADINHA.originalCentavos)}</s> por <strong>{reaisCentavos(RASPADINHA.finalCentavos)}</strong></p>
          {estado.estado !== "utilizado" && <a className={s.botao} href={linkWhatsApp(`Oi Rafael! Sou ${estado.nome}, a pessoa sorteada na palestra da Bloco Arquitetura. Resgatei o cupom ${estado.codigo} de 50% para o site do meu escritório: de R$ 1.499,00 por R$ 749,50.`)} target="_blank" rel="noreferrer">Combinar meu site com o Rafael</a>}
          <p className={s.micro}>Guarde o código ou uma captura desta tela. O resgate também fica registrado com o Rafael.</p>
        </div>}
        {estado?.estado === "indisponivel" && <p className={s.intro}>O único cupom desta palestra já foi resgatado. Se você é a pessoa sorteada e precisa de ajuda, <a href={linkWhatsApp("Oi Rafael! Preciso de ajuda com meu cupom da palestra da Bloco Arquitetura.")} target="_blank" rel="noreferrer">fale com o Rafael</a>.</p>}
        {erro && <div className={s.erro} role="alert"><p>{erro}</p>{!estado && <button className={s.textoBotao} type="button" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button>}</div>}
        <a className={s.conhecer} href="/arquitetos" target="_blank" rel="noreferrer">Conheça o site para o seu escritório <span aria-hidden>↗</span></a>
      </section>
      <footer className={s.rodape}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/marca/rr-nome.webp" width={150} height={25} alt="Rafael Razeira Estúdio" />
        <span>Sites à altura dos seus projetos.</span>
      </footer>
    </main>
  </div>;
}
