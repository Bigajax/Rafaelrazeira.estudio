/* ============================================================
   GUARDA ANTI-BOT DOS FORMULÁRIOS — isca e relógio.

   Dois filtros silenciosos, usados pelos quatro formulários de captura
   (hero e completo, na /vitrine-digital e na /e-commerce):

   • ISCA: um campo "email" invisível. Nenhum formulário do estúdio pede
     e-mail, então gente de verdade nunca o vê nem o preenche; robô que
     preenche formulário por nome de campo preenche. `tabIndex -1` e
     `aria-hidden` tiram o campo do teclado e do leitor de tela, para a
     armadilha não pegar justamente quem navega sem mouse.

   • RELÓGIO: envio em menos de 3 segundos desde a montagem da página não
     é gente. O relógio começa num useEffect (só roda no cliente, depois
     da hidratação), e o submit também exige JS, então humano real sempre
     tem o relógio contando bem antes de conseguir tocar em enviar.

   QUANDO UM DOS DOIS ACUSA: o formulário mostra a MESMA tela de
   confirmação e não grava, não avisa e não mede nada. Recusar com erro
   ensinaria o robô a tentar de novo diferente; "sucesso" de mentira
   encerra o assunto. O custo de um falso positivo é um lead perdido em
   silêncio, e é por isso que a régua do relógio é curta e a isca é um
   campo que humano não encontra.
   ============================================================ */

import { useEffect, useRef } from "react";

/* o name "email" é a isca inteira: atraente para robô, inexistente para
   gente. NÃO transformar em campo real de e-mail um dia; se o formulário
   passar a pedir e-mail de verdade, renomear a isca antes. */
export const NOME_DA_ISCA = "email";

export function CampoIsca() {
  return (
    <input
      name={NOME_DA_ISCA}
      type="text"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
    />
  );
}

const MINIMO_HUMANO_MS = 3000;

/* Devolve `envioSuspeito(form)`: true quando a isca foi preenchida ou o
   envio veio rápido demais. Um retorno só, porque a reação é uma só. */
export function useGuardaDeFormulario() {
  const montadoEm = useRef(0);
  useEffect(() => {
    montadoEm.current = Date.now();
  }, []);
  return function envioSuspeito(form: HTMLFormElement): boolean {
    const isca = new FormData(form).get(NOME_DA_ISCA);
    if (typeof isca === "string" && isca.trim()) return true;
    return montadoEm.current > 0 && Date.now() - montadoEm.current < MINIMO_HUMANO_MS;
  };
}
