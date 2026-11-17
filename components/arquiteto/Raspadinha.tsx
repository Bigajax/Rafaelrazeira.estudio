"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AreaDeRaspar } from "./AreaDeRaspar";
import { ConquistaSite } from "./ConquistaSite";
import { CupomNoBilhete } from "./CupomNoBilhete";
import { CelebracaoRaspadinha } from "./CelebracaoRaspadinha";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { linkWhatsApp } from "@/lib/contato";
import { type EstadoSorteio, type ResultadoBilhete } from "@/lib/sorteio-arquitetos";
import s from "./raspadinha.module.css";

const ENDPOINT = "/api/arquitetos/sorteio";

function Estrela({ className = "" }: { className?: string }) {
  return <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2c0 7-3 10-10 10 7 0 10 3 10 10 0-7 3-10 10-10-7 0-10-3-10-10Z" stroke="currentColor" /></svg>;
}

function Bilhete({ resultado, liberado, aoRevelar, revelado, nome, previa, codigo, entregue, utilizado }: { resultado: ResultadoBilhete; liberado: boolean; aoRevelar: () => void; revelado: boolean; nome: string; previa: boolean; codigo?: string; entregue?: boolean; utilizado?: boolean }) {
  return <div className={s.pilha}>
    <div className={`${s.bilheteFundo} ${s.fundoUm}`} aria-hidden="true"><span>Um presente para o seu escritório.</span></div>
    <div className={`${s.bilheteFundo} ${s.fundoDois}`} aria-hidden="true" />
    <div className={s.sombraBilhete}><div className={s.bilhete} data-bilhete>
      {revelado && resultado !== "cupom300" && <CelebracaoRaspadinha intensidade={resultado === "site" ? "principal" : "cupom"} />}
      <div className={s.impresso}>
      <span className={s.lateral}>Bloco Arquitetura</span>
      <div className={s.miolo}>
        <Estrela className={s.estrela} />
        {/* eslint-disable-next-line @next/next/no-img-element */}<img className={s.marcaBilhete} src="/assets/marca/rr-nome.webp" width={250} height={42} alt="Rafael Razeira Estúdio" />
        <p className={s.fraseBilhete}>Um novo espaço para os seus projetos.</p>
        <AreaDeRaspar resultado={resultado} liberado={liberado} aoRevelar={aoRevelar}
          premioRevelado={revelado ? resultado === "site" ? <ConquistaSite nome={nome} previa={previa} codigo={codigo} entregue={entregue} /> : <CupomNoBilhete resultado={resultado} nome={nome} previa={previa} codigo={codigo} utilizado={utilizado} /> : undefined} />
        <p className={s.assinaturaBilhete}>Feito para o seu próximo capítulo.</p>
      </div>
      <span className={`${s.lateral} ${s.lateralDireita}`}>Um presente do estúdio</span>
    </div></div></div>
  </div>;
}

function EscopoSite({ presente = true }: { presente?: boolean }) {
  return <details className={s.escopo}>
    <summary>{presente ? "O que vem no site de presente?" : "O que vem no site?"}<span aria-hidden>+</span></summary>
    <div><p>O site do seu escritório, criado pelo Rafael Razeira Estúdio:</p><ul>
      <li>Até oito projetos, cada um com sua página.</li><li>Apresentação do escritório e do seu jeito de trabalhar.</li>
      <li>Contato com briefing direto no seu WhatsApp.</li><li>Versão para celular, preparação para o Google e publicação.</li>
    </ul><p>As fotos e os textos são fornecidos pelo escritório. Domínio e fotografia dos projetos ficam por conta do escritório.</p></div>
  </details>;
}

export function Raspadinha({ previa = false }: { previa?: boolean }) {
  const [estado, setEstado] = useState<EstadoSorteio | null>(null);
  const [resultadoPrevia, setResultadoPrevia] = useState<ResultadoBilhete>("site");
  const [revelado, setRevelado] = useState(false);
  const [rodadaPrevia, setRodadaPrevia] = useState(0);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [conexao, setConexao] = useState(true);
  const aoRevelar = useCallback(() => setRevelado(true), []);
  const carregar = useCallback(async (signal?: AbortSignal) => {
    const r = await fetch(ENDPOINT, { cache: "no-store", signal }); const dados = await r.json();
    if (!r.ok) throw new Error(dados.erro || "Não foi possível consultar o sorteio.");
    signal?.throwIfAborted();
    setEstado(dados); setConexao(true);
  }, []);
  useEffect(() => {
    if (previa) return;
    const ctrl = new AbortController(); setErro("");
    carregar(ctrl.signal).catch(e => { if (!ctrl.signal.aborted) setErro(e.message || "Confira a conexão e tente novamente."); });
    return () => ctrl.abort();
  }, [carregar, previa, tentativa]);
  useEffect(() => {
    if (previa || estado?.estado !== "aguardando") return;
    let encerrado = false, consulta: AbortController | null = null;
    let proxima: ReturnType<typeof setTimeout> | undefined;
    const agendar = () => {
      clearTimeout(proxima);
      // Espalha as consultas de quem escaneou o telão ao mesmo tempo.
      if (!encerrado && document.visibilityState === "visible") proxima = setTimeout(atualizar, 8000 + Math.random() * 4000);
    };
    async function atualizar() {
      clearTimeout(proxima);
      if (encerrado || consulta || document.visibilityState !== "visible") return;
      consulta = new AbortController();
      const prazo = setTimeout(() => consulta?.abort(), 15000);
      try { await carregar(consulta.signal); }
      catch { if (!encerrado) setConexao(false); }
      finally { clearTimeout(prazo); consulta = null; agendar(); }
    }
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void atualizar();
      else clearTimeout(proxima);
    };
    agendar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar); window.addEventListener("online", aoVoltar);
    return () => {
      encerrado = true; clearTimeout(proxima); consulta?.abort();
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar); window.removeEventListener("online", aoVoltar);
    };
  }, [carregar, estado?.estado, previa]);

  async function participar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (enviando) return;
    const form = new FormData(e.currentTarget);
    const nome = String(form.get("nome") || "").trim(), whatsapp = String(form.get("whatsapp") || "");
    if (nome.length < 2 || !whatsappValido(whatsapp)) { setErro("Preencha seu nome e um WhatsApp válido com DDD."); return; }
    setEnviando(true); setErro("");
    try {
      const r = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, whatsapp, website: form.get("website") }) });
      const dados = await r.json();
      if (dados.estado) setEstado(dados); else throw new Error(dados.erro || "Não foi possível confirmar sua participação.");
    } catch (e) { setErro(e instanceof Error ? e.message : "Confira a conexão e tente novamente."); }
    finally { setEnviando(false); }
  }

  function trocarPrevia(valor: ResultadoBilhete) {
    setResultadoPrevia(valor); setRevelado(false); setRodadaPrevia(n => n + 1);
  }
  const resultadoReal = estado?.estado === "resultado" ? estado : null;
  const resultado: ResultadoBilhete = previa ? resultadoPrevia : resultadoReal?.beneficio ?? "cupom300";
  const liberado = previa || !!resultadoReal;
  const inscricao = !previa && estado?.estado === "inscricoes-abertas";
  const esperando = !previa && estado?.estado === "aguardando";
  const encerrado = !previa && estado?.estado === "encerrado";
  const naoAberto = !previa && estado?.estado === "nao-aberto";
  const nome = estado && "nome" in estado ? estado.nome : "";

  return <div className={`${s.page} ${revelado && resultado === "cupom50" ? s.cupomEspecial : ""}`}>
    <header className={s.topo}>
      <a href="/arquitetos" aria-label="Rafael Razeira Estúdio — sites para arquitetos">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/assets/marca/rr-nome.webp" width={180} height={30} alt="Rafael Razeira Estúdio" /></a>
      <span>Na palestra da Bloco Arquitetura</span>
    </header>
    <main className={s.main}>
      <div className={s.conteudo}>
        <div className={s.abertura}>
          <h1>{encerrado ? "O sorteio já aconteceu." : esperando ? "Seu bilhete está guardado." : inscricao ? "Seus projetos podem ganhar um novo endereço." : "Seus projetos merecem mais espaço."}</h1>
          <p className={s.intro}>{esperando ? `${nome}, sua participação está confirmada. O bilhete será liberado aqui mesmo quando o sorteio acontecer.`
            : inscricao ? "Cadastre-se durante a palestra. No momento do sorteio, um escritório ganha um site, até dois ganham 50% de desconto e todos os demais ganham R$ 300 de desconto."
            : encerrado ? "Abra esta página no mesmo navegador da inscrição para consultar o seu bilhete."
            : naoAberto ? "Um site de presente para um dos escritórios que participarem da palestra. As inscrições abrem em breve."
            : revelado && resultado === "site" ? "Um site para apresentar suas obras, contar a história do escritório e receber o próximo projeto. É por nossa conta."
            : revelado ? "Uma condição especial na criação do site do seu escritório, com até oito projetos e contato direto pelo WhatsApp."
            : "Raspe o bilhete e descubra o presente que preparamos para o seu escritório."}</p>
          {inscricao && <form className={s.form} onSubmit={participar}>
            <label>Seu nome<input name="nome" autoComplete="name" required minLength={2} maxLength={100} placeholder="Como você se chama?" /></label>
            <label>Seu WhatsApp<input name="whatsapp" type="tel" autoComplete="tel" inputMode="tel" required maxLength={16} placeholder="(44) 99999-0000" onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); }} /></label>
            <label className={s.isca} aria-hidden="true">Seu site<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
            <button className={s.botao} type="submit" disabled={enviando}>{enviando ? "Confirmando…" : "Participar do sorteio"}</button>
            <p className={s.micro}>Uma participação por WhatsApp. Usaremos seus dados para o sorteio e a entrega do seu benefício. <a href="/privacidade" target="_blank" rel="noreferrer">Privacidade</a></p>
          </form>}
          {esperando && <div className={s.espera} data-espera-sorteio>
            <p role="status"><span className={s.ponto} />{conexao ? "Inscrição confirmada. Aguardando o sorteio." : "Reconectando… sua inscrição está guardada."}</p>
            <p className={s.explicacaoEspera}>Pode continuar assistindo à palestra. O Rafael vai anunciar o sorteio e liberar os bilhetes. Esta página se atualiza sozinha; a raspagem aparece assim que a liberação for identificada.</p>
            <p className={s.explicacaoEspera}>Se sair, volte pelo mesmo QR code neste navegador. Sua participação continua guardada.</p>
            <button type="button" onClick={() => { carregar().catch(() => setConexao(false)); }}>Atualizar resultado</button>
          </div>}
          {!previa && !estado && !erro && <p className={s.status} role="status">Preparando a sua participação…</p>}
          {!previa && estado?.estado === "nao-aberto" && <p className={s.status}>As inscrições ainda não abriram. Aguarde a orientação do Rafael na palestra.</p>}
          {encerrado && <p className={s.status}><a href={linkWhatsApp("Oi Rafael! Preciso de ajuda para consultar minha participação no sorteio do site da palestra.")} target="_blank" rel="noreferrer">Precisa de ajuda? Fale com o Rafael.</a></p>}
          {revelado && <div className={s.resultado}>
            <EscopoSite presente={resultado === "site"} />
            {previa && <p className={s.notaPrevia}>{resultado === "site" ? "Prévia do prêmio. Nenhum prêmio foi emitido; o botão apresenta o serviço." : "Demonstração do cupom. Nenhum cupom foi emitido; o botão apresenta o serviço."}</p>}
          </div>}
          {erro && <div className={s.erro} role="alert"><p>{erro}</p>{!estado && <button className={s.botaoClaro} type="button" onClick={() => setTentativa(n => n + 1)}>Tentar novamente</button>}</div>}
        </div>
        <div className={s.palco}>
          <Bilhete key={`${resultado}-${rodadaPrevia}`} resultado={resultado} liberado={liberado} aoRevelar={aoRevelar}
            revelado={revelado} nome={nome} previa={previa} codigo={resultadoReal?.codigo} entregue={resultadoReal?.entregue} utilizado={resultadoReal?.utilizado} />
          <p className={s.dica}>{liberado ? revelado ? "Um presente do Rafael Razeira Estúdio." : "Passe o dedo na faixa prateada para revelar." : "O resultado será revelado neste bilhete."}</p>
        </div>
      </div>
      {previa && <aside className={s.previa} aria-label="Controles da demonstração">
        <div><strong>Prévia da experiência</strong><span>Raspe à vontade. Nenhum prêmio é consumido.</span></div>
        <div className={s.opcoesPrevia} aria-label="Resultado para demonstrar">
          <button type="button" aria-pressed={resultadoPrevia === "site"} onClick={() => trocarPrevia("site")}>Site de presente</button>
          <button type="button" aria-pressed={resultadoPrevia === "cupom50"} onClick={() => trocarPrevia("cupom50")}>50% de desconto</button>
          <button type="button" aria-pressed={resultadoPrevia === "cupom300"} onClick={() => trocarPrevia("cupom300")}>R$ 300 de desconto</button>
          {revelado && <button type="button" className={s.recomecar} onClick={() => trocarPrevia(resultadoPrevia)} aria-label="Recomeçar raspadinha">Raspar de novo</button>}
        </div>
      </aside>}
    </main>
    <footer className={s.rodape}><span>Sites à altura dos seus projetos.</span><a href="/arquitetos" target="_blank" rel="noreferrer">Conheça o trabalho do estúdio<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden><path d="M5 15 15 5M5 5h10v10" /></svg></a></footer>
  </div>;
}
