"use client";

/* ============================================================
   A FICHA POR CIMA DO QUADRO

   Este é o casco. O miolo é o mesmo <Ficha /> que a página /crm/lead/[id]
   usa quando alguém chega pela URL direta.

   ---------- por que modal, e não página ----------
   Trabalhar o pipeline é varrer o quadro e mexer num lead de cada vez. Com
   a ficha como página, cada olhada custava sair do quadro, perder a rolagem
   horizontal, perder o filtro digitado, e voltar. O modal devolve o quadro
   intacto atrás, e é isso que faz "abrir três leads seguidos" ser uma
   sequência em vez de três viagens.

   ---------- e por que a URL continua existindo ----------
   Rota interceptada do Next: o modal só aparece quando a navegação sai de
   dentro do CRM. Colar a URL na barra, dar F5 ou mandar o link para você
   mesmo abre a PÁGINA cheia, porque nesses casos não há quadro atrás para
   preservar. Uma coisa e outra, sem duplicar o painel.

   Fechar é `router.back()` e não `push`: o modal é um passo no histórico, e
   voltar é literalmente o que ele desfaz. Com `push` o botão de voltar do
   navegador reabriria a ficha que a pessoa acabou de fechar.
   ============================================================ */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Ficha, type DadosFicha } from "./Ficha";
import s from "@/app/crm/crm.module.css";

export function FichaModal(dados: DadosFicha) {
  const router = useRouter();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      /* Só fecha se o Escape não foi consumido por um modal de cima (o de
         mensagem, o de passagem de estágio). Sem isso, apertar Escape com o
         modal de perda aberto fechava os dois de uma vez e a pessoa perdia
         o motivo que estava escolhendo. */
      if (e.key === "Escape" && !e.defaultPrevented) router.back();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [router]);

  /* O foco entra na caixa ao abrir: sem isso o teclado continua no card do
     quadro, atrás do modal, e o Tab passeia pelo que está escondido. */
  useEffect(() => {
    caixa.current?.focus();
  }, []);

  return (
    <div
      className={s.fundo}
      onMouseDown={(e) => e.target === e.currentTarget && router.back()}
    >
      <div
        ref={caixa}
        tabIndex={-1}
        className={s.fichaCaixa}
        role="dialog"
        aria-modal="true"
        aria-label={`Ficha de ${dados.lead.nome}`}
      >
        <button
          type="button"
          className={s.fechar}
          onClick={() => router.back()}
          aria-label="Fechar a ficha"
        >
          ✕
        </button>

        <Ficha {...dados} />
      </div>
    </div>
  );
}
