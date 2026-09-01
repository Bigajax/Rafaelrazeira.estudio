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
   confirmação. Recusar com erro ensinaria o robô a tentar de novo
   diferente; "sucesso" de mentira encerra o assunto.

   O QUE MUDOU EM 01/09/2026, e por quê:

   1. A ISCA VIROU `display:none`. Ela era `width:1px;height:1px` fora da
      tela, e o raciocínio era que campo minúsculo o autofill do Chrome
      pula. Medida na página no ar, ela não era minúscula coisa nenhuma:
      `.site * { box-sizing: border-box }` mais o padding do input da
      página seguram a caixa no tamanho do padding, e ela renderizava
      **27,6 x 23,6px** no #contratar e 4 x 19px no hero. Ou seja, a única
      proteção contra o autofill nunca existiu de verdade. `display:none` é
      o caso em que o autofill comprovadamente não encosta, e o robô que
      esta armadilha pega lê o HTML e preenche por nome do campo, sem
      renderizar nada: para ele não muda coisa alguma.

   2. NA /vitrine-digital O LEAD DEIXOU DE SER JOGADO FORA. Antes, acusar
      era descartar: nada gravado, nada avisado, nada medido. Se o autofill
      preenchesse a isca de uma pessoa de verdade, ela via "RECEBI SEUS
      DADOS", ia embora achando que tinha mandado, e não sobrava registro em
      lugar nenhum. Isso foi reproduzido de ponta a ponta em 01/09. Agora o
      envio suspeito é GRAVADO com status "suspeito", sem card no CRM, sem
      e-mail e sem evento nenhum para a Meta. O robô continua vendo o mesmo
      sucesso de mentira e continua sem ensinar nada à campanha; o falso
      positivo deixa de custar um cliente. Quem faz isso é o lead-flow da
      vitrine, não este arquivo: aqui só se diz QUAL sinal acusou.

   A /e-commerce continua no comportamento antigo, de descartar. Ela não
   está sob tráfego pago, e mudar as duas de uma vez era mexer em mais
   página do que o problema pedia.
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
      /* `display:none` e nada mais: com o campo fora do fluxo, o resto
         (posição, tamanho, opacidade) não tinha o que fazer além de dar a
         impressão de que o tamanho estava sob controle, que foi exatamente
         o que enganou por três semanas. */
      style={{ display: "none" }}
    />
  );
}

const MINIMO_HUMANO_MS = 3000;

/* Devolve `envioSuspeito(form)`: QUAL sinal acusou, ou null quando nada
   acusou. Era `boolean`, e virou o nome do sinal porque a vitrine grava o
   motivo junto com o lead suspeito: "isca" e "relogio" erram por razões
   diferentes, e daqui a três meses a diferença entre os dois é o que vai
   dizer se a régua está no lugar certo.

   Quem só pergunta "é suspeito?" continua funcionando sem tocar em nada:
   string não vazia é verdadeira e null é falso, então o `if (envioSuspeito(
   form))` da /e-commerce lê igual. */
export type MotivoSuspeito = "isca" | "relogio";

export function useGuardaDeFormulario() {
  const montadoEm = useRef(0);
  useEffect(() => {
    montadoEm.current = Date.now();
  }, []);
  return function envioSuspeito(form: HTMLFormElement): MotivoSuspeito | null {
    const isca = new FormData(form).get(NOME_DA_ISCA);
    if (typeof isca === "string" && isca.trim()) return "isca";
    if (montadoEm.current > 0 && Date.now() - montadoEm.current < MINIMO_HUMANO_MS) return "relogio";
    return null;
  };
}
