"use client";

import { useEffect, useRef } from "react";
import { linkWhatsApp } from "@/lib/contato";
import { reaisCentavos } from "@/lib/raspadinha";
import { VALOR_SITE_CENTAVOS } from "@/lib/sorteio-arquitetos";
import { SalvarBilhete } from "./SalvarBilhete";
import s from "./raspadinha.module.css";

function SeloConquista() {
  return <svg className={s.seloNoBilhete} viewBox="0 0 80 80" fill="none" aria-hidden="true">
    <path d="m40 2 7 6 9-1 4 8 9 3 1 9 7 6-4 8 1 9-8 5-3 9-9 1-7 7-8-4-9 1-5-8-9-3-1-9-7-7 4-8-1-9 8-4 3-9 9-1Z" fill="#c2e4ba" />
    <circle cx="40" cy="39" r="25" stroke="#71a571" strokeWidth=".8" />
    <path d="m29 39 8 8 15-16" stroke="#046c40" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function ConquistaSite({ nome, previa, codigo, entregue }: { nome: string; previa: boolean; codigo?: string; entregue?: boolean }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titulo.current?.focus({ preventScroll: true }); }, []);
  return <section className={s.conquistaNoBilhete} aria-label="Resultado do bilhete" data-conquista="site">
    <div className={s.rotuloNoBilhete}><SeloConquista /><span>O prêmio principal é seu</span></div>
    <h2 ref={titulo} tabIndex={-1}><span>Você ganhou</span>{" "}<strong>um site!</strong></h2>
    <p className={s.valorNoBilhete}>Uma criação de <strong>{reaisCentavos(VALOR_SITE_CENTAVOS)}</strong>,<br />de presente para o seu escritório.</p>
    {entregue && !previa ? <p className={s.status}>Seu site já foi entregue pelo Rafael.</p> : <a className={`${s.botao} ${s.ctaNoBilhete}`}
      href={previa ? "/arquitetos" : linkWhatsApp(`Oi Rafael! Sou ${nome}, ganhei o site na palestra da Bloco Arquitetura. Meu código é ${codigo}. Quero começar o site do meu escritório!`)}
      target="_blank" rel="noreferrer">Quero começar meu site<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M5 12h14m-6-6 6 6-6 6" /></svg></a>}
    <SalvarBilhete resultado="site" codigo={codigo} previa={previa} entregue={entregue} />
  </section>;
}
