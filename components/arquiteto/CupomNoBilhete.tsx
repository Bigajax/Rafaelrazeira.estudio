"use client";

import { useEffect, useRef } from "react";
import { linkWhatsApp } from "@/lib/contato";
import { reaisCentavos } from "@/lib/raspadinha";
import { BENEFICIOS_SORTEIO, VALOR_SITE_CENTAVOS, type ResultadoBilhete } from "@/lib/sorteio-arquitetos";
import { SalvarBilhete } from "./SalvarBilhete";
import s from "./raspadinha.module.css";

export function CupomNoBilhete({ resultado, nome, previa, codigo, utilizado }: {
  resultado: Exclude<ResultadoBilhete, "site">; nome: string; previa: boolean; codigo?: string; utilizado?: boolean;
}) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const oferta = BENEFICIOS_SORTEIO[resultado];
  const especial = resultado === "cupom50";
  useEffect(() => { titulo.current?.focus({ preventScroll: true }); }, []);
  return <section className={`${s.cupomNoBilhete} ${especial ? s.cupomMeia : s.cupomTrezentos}`} aria-label="Resultado do bilhete" data-cupom={resultado}>
    <p className={s.rotuloCupom}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
        {especial ? <path d="M12 2c0 7-3 10-10 10 7 0 10 3 10 10 0-7 3-10 10-10-7 0-10-3-10-10Z" /> : <><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Z" /><path d="M8 5v14" strokeDasharray="2 2" /></>}
      </svg>{especial ? "Cupom especial" : "Um presente do estúdio"}
    </p>
    <h2 ref={titulo} tabIndex={-1}><span className={s.chamadaCupom}>Você ganhou</span>{" "}<strong>{oferta.destaque.replace("R$ ", "R$\u00a0")}</strong>{" "}<span className={s.legendaCupom}>de desconto!</span></h2>
    <p className={s.destinoCupom}>No site do seu escritório.</p>
    <div className={s.precoNoBilhete}>
      <span>De <s>{reaisCentavos(VALOR_SITE_CENTAVOS)}</s> por</span>
      <strong>{reaisCentavos(oferta.finalCentavos)}</strong>
    </div>
    {!previa && utilizado ? <p className={s.cupomUtilizado} role="status">Este cupom já foi utilizado.</p> : <a className={`${s.botao} ${s.ctaNoBilhete}`}
      href={previa ? "/arquitetos" : linkWhatsApp(`Oi Rafael! Sou ${nome}, participei da palestra da Bloco Arquitetura e ganhei ${oferta.rotulo}. Meu cupom é ${codigo}. Quero o site do meu escritório por ${reaisCentavos(oferta.finalCentavos)}, de ${reaisCentavos(VALOR_SITE_CENTAVOS)}.`)}
      target="_blank" rel="noreferrer">Usar meu cupom<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></a>}
    <p className={s.condicoesNoBilhete}>Uso único. Não cumulativo.</p>
    <SalvarBilhete resultado={resultado} codigo={codigo} previa={previa} utilizado={utilizado} />
  </section>;
}
