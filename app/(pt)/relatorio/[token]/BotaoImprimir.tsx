"use client";

import s from "./relatorio.module.css";

/* baixar em PDF: abre a janela de impressão do navegador, onde o destino
   "Salvar como PDF" gera o arquivo (o CSS de impressão monta a folha A4 e
   esconde este botão). Sem biblioteca e sem servidor gerando arquivo. */
export function BotaoImprimir() {
  return (
    <div className={s.baixar}>
      <button type="button" className={s.imprimir} onClick={() => window.print()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
        Baixar PDF
      </button>
      <small>Na janela que abrir, escolha “Salvar como PDF”.</small>
    </div>
  );
}
