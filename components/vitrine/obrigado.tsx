"use client";

/* ============================================================
   AS PERGUNTAS DA PRÉVIA, NA CONTINUAÇÃO DO MODAL (28/10/2026)

   Pedido do Rafael: depois de enviar o formulário, a janela continua. Abaixo
   do "Pedido recebido" entram quatro perguntas OPCIONAIS para a prévia sair
   mais certeira: o que a loja mais vende, quantas peças tem, se já tem site
   e o melhor horário para a conversa.

   UMA PERGUNTA POR VEZ (mesmo dia, "uma pergunta por vez..."): as quatro
   juntas eram uma parede de chips. Agora um passo de cada vez, com a barra
   de 4 trechos em cima. Pergunta de uma resposta só avança no próprio toque;
   todo passo pode ser pulado e, do segundo em diante, desfeito com "Voltar".
   No fim as respostas saem de uma vez.

   A ARRUMAÇÃO (mesmo dia, "o que da pra melhorar?"):
   • o "Continuar" mora SEMPRE na linha de baixo, apagado até ter resposta:
     antes ele surgia no primeiro toque e empurrava o WhatsApp 70px;
   • a pergunta do passo é o texto grande; o "Quer uma prévia mais
     certeira?" saiu (a linha de contexto que o substituiu também, a pedido
     do Rafael), e o "1 de 4" também (a
     barra já diz);
   • Voltar, Pular e Continuar numa linha só, o Continuar preto e pequeno,
     para não brigar com o WhatsApp de baixo;
   • os chips numa grade de 3 colunas (sem o "Outro" sozinho na linha), e o
     "Outro" abre um campo curto, como o "Sim" do site;
   • quem fecha a janela (ou sai da página) no meio grava o que já
     respondeu, por sendBeacon, e a janela reaberta mostra "Anotado".

   (No mesmo dia elas moraram numa página própria, /vitrine-digital/obrigado;
   o Rafael preferiu que a janela continuasse, e a página saiu.)

   As respostas vão para /api/lead-detalhes, que confere id + WhatsApp + 24h
   antes de gravar no lead e nas notas do card do CRM. Nada aqui dispara
   evento de conversão: o Lead e o Contact já saíram no envio.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import s from "./obrigado.module.css";

type Estado = "pergunta" | "enviando" | "feito" | "pulado" | "erro";
type Respostas = { vende: string[]; vendeOutro: string; pecas: string; temSite: string; site: string; horario: string };

const VENDE: [string, string][] = [["tenis", "Tênis"], ["roupas", "Roupas"], ["acessorios", "Acessórios"], ["praia", "Moda praia"], ["outro", "Outro"]];
const PECAS: [string, string][] = [["ate30", "Até 30"], ["de30a100", "De 30 a 100"], ["mais100", "Mais de 100"]];
const SITE: [string, string][] = [["nao", "Não"], ["sim", "Sim"]];
const HORARIO: [string, string][] = [["manha", "Manhã"], ["tarde", "Tarde"], ["noite", "Noite"]];
const TOTAL = 4;
/* o chip marcado aparece preto antes de a pergunta deslizar */
const PAUSA_MS = 260;

const respondeuAlgo = (r: Respostas) => r.vende.length > 0 || !!r.pecas || !!r.temSite || !!r.horario;

function Chips({ opcoes, marcado, alternar, multi = false }: { opcoes: [string, string][]; marcado: (k: string) => boolean; alternar: (k: string) => void; multi?: boolean }) {
  return <div className={s.chips} role={multi ? "group" : "radiogroup"}>
    {opcoes.map(([k, rotulo]) => <button key={k} type="button" className={s.chip}
      {...(multi ? { "aria-pressed": marcado(k) } : { role: "radio", "aria-checked": marcado(k) })}
      onClick={() => alternar(k)}>{rotulo}</button>)}
  </div>;
}

export function PerguntasDaPrevia({ id, whatsapp }: { id: string; whatsapp: string }) {
  const [r, setR] = useState<Respostas>({ vende: [], vendeOutro: "", pecas: "", temSite: "", site: "", horario: "" });
  const [passo, setPasso] = useState(0);
  const [sentido, setSentido] = useState<"frente" | "tras">("frente");
  const [estado, setEstado] = useState<Estado>("pergunta");
  const raiz = useRef<HTMLElement>(null);

  /* ---------- quem sai no meio não perde o que respondeu ----------
     O dialog fecha (X, fundo, Esc) sem desmontar nada, então a escuta é o
     evento `close` dele; `pagehide` cobre quem sai da página. sendBeacon
     porque o fetch comum morre junto com a página. Os refs carregam as
     respostas e o estado mais novos para dentro da escuta. */
  const ultimo = useRef({ r, estado });
  ultimo.current = { r, estado };
  useEffect(() => {
    const salvarParcial = () => {
      const { r: atual, estado: est } = ultimo.current;
      if (est !== "pergunta" || !respondeuAlgo(atual)) return;
      const corpo = new Blob([JSON.stringify({ id, whatsapp, respostas: atual })], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/lead-detalhes", corpo)) setEstado("feito");
    };
    const dialogo = raiz.current?.closest("dialog");
    dialogo?.addEventListener("close", salvarParcial);
    window.addEventListener("pagehide", salvarParcial);
    return () => {
      dialogo?.removeEventListener("close", salvarParcial);
      window.removeEventListener("pagehide", salvarParcial);
    };
  }, [id, whatsapp]);

  async function enviar(final: Respostas) {
    if (!respondeuAlgo(final)) { setEstado("pulado"); return; }
    setEstado("enviando");
    try {
      const res = await fetch("/api/lead-detalhes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, whatsapp, respostas: final }),
      });
      setEstado(res.ok ? "feito" : "erro");
    } catch {
      setEstado("erro");
    }
  }

  /* avança com as respostas já atualizadas (o setState ainda não chegou) */
  function avancar(atual: Respostas = r) {
    if (passo >= TOTAL - 1) { void enviar(atual); return; }
    setSentido("frente");
    setPasso(p => p + 1);
  }
  function voltar() { setSentido("tras"); setPasso(p => Math.max(0, p - 1)); }
  /* tocar na resposta já marcada (quem voltou para conferir) mantém a
     marcação e segue, em vez de desmarcar e prender a pessoa no passo;
     para não responder, existe o Pular */
  function escolher(campo: "pecas" | "temSite" | "horario", valor: string) {
    const novo = { ...r, [campo]: valor };
    setR(novo);
    /* o "Sim" do site abre o campo e espera o Continuar */
    if (!(campo === "temSite" && valor === "sim")) setTimeout(() => avancar(novo), PAUSA_MS);
  }

  if (estado === "feito" || estado === "pulado") return <section ref={raiz} className={s.cartao} aria-live="polite">
    <div className={s.feito}>
      <span className={s.okPequeno} aria-hidden><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg></span>
      <div>{estado === "feito"
        ? <><h3>Anotado.</h3><p>Isso vai direto para a sua prévia.</p></>
        : <><h3>Sem problema.</h3><p>A prévia sai do mesmo jeito.</p></>}</div>
    </div>
  </section>;

  const perguntas = [
    { titulo: "O que você mais vende?", nota: "Pode marcar mais de um.", corpo: <>
        <Chips multi opcoes={VENDE} marcado={k => r.vende.includes(k)} alternar={k => setR(v => ({ ...v, vende: v.vende.includes(k) ? v.vende.filter(x => x !== k) : [...v.vende, k] }))} />
        {r.vende.includes("outro") && <input className={s.campo} type="text" maxLength={60} placeholder="O quê? Ex.: bolsas, perfumes" value={r.vendeOutro} onChange={e => setR(v => ({ ...v, vendeOutro: e.target.value }))} aria-label="O que mais você vende" autoFocus />}
      </>, pronto: r.vende.length > 0 },
    { titulo: "Quantas peças você tem hoje?", corpo: <Chips opcoes={PECAS} marcado={k => r.pecas === k} alternar={k => escolher("pecas", k)} />, pronto: !!r.pecas },
    { titulo: "Já tem site?", corpo: <>
        <Chips opcoes={SITE} marcado={k => r.temSite === k} alternar={k => escolher("temSite", k)} />
        {r.temSite === "sim" && <input className={s.campo} type="url" inputMode="url" placeholder="Cole o link, se quiser" value={r.site} onChange={e => setR(v => ({ ...v, site: e.target.value }))} aria-label="Link do site" autoFocus />}
      </>, pronto: !!r.temSite },
    { titulo: "Melhor horário para eu te chamar?", corpo: <Chips opcoes={HORARIO} marcado={k => r.horario === k} alternar={k => escolher("horario", k)} />, pronto: !!r.horario },
  ];
  const q = perguntas[passo];
  const enviando = estado === "enviando";

  return <section ref={raiz} className={s.cartao} aria-live="polite">
    <div className={s.barra} role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={passo + 1} aria-label={`Pergunta ${passo + 1} de ${TOTAL}`}>
      {perguntas.map((_, i) => <i key={i} className={i <= passo ? s.cheio : ""} />)}
    </div>

    <div key={passo} className={`${s.pergunta} ${sentido === "frente" ? s.entraFrente : s.entraTras}`}>
      <h3>{q.titulo}{q.nota && <span>{q.nota}</span>}</h3>
      {q.corpo}
    </div>

    {estado === "erro" && <p className={s.erro}>Não consegui salvar agora. Se quiser, me conta no WhatsApp.</p>}

    <div className={s.rodape}>
      {passo > 0 ? <button type="button" className={s.texto} onClick={voltar} disabled={enviando}>Voltar</button> : <span />}
      <div className={s.acoes}>
        <button type="button" className={s.texto} onClick={() => avancar()} disabled={enviando}>Pular</button>
        <button type="button" className={s.seguir} disabled={!q.pronto || enviando} onClick={() => avancar()}>
          {enviando ? "Enviando…" : passo === TOTAL - 1 ? "Enviar" : "Continuar"}
        </button>
      </div>
    </div>
  </section>;
}
