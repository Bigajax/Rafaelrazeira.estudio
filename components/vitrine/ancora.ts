/* ============================================================
   AS ÂNCORAS DA PÁGINA: perto a pessoa é levada, longe ela é posta lá.

   POR QUE EXISTE: em 13/08 a raiz ganhou `scroll-behavior: smooth` para que
   os dez `href="#..."` andassem na mesma velocidade do `goToForm` da oferta.
   O argumento continua inteiro para salto curto, e está escrito por extenso
   no CSS: a rolagem é o que explica a relação entre o CTA e o destino, e
   salto instantâneo apaga essa relação.

   Só que a barra fixa do celular fica visível a página inteira e aponta para
   `#contratar`, que mora a uns 7000px do topo no desktop e a bem mais no
   celular. Nessa distância a rolagem suave não explica relação nenhuma: são
   segundos de borrão em que a tela não para em nada reconhecível, e a pessoa
   conclui que o toque não pegou. Nos dois primeiros dias da campanha de
   prévia grátis (31/08 e 01/09/2026), 25 pessoas tocaram na barra fixa 60
   vezes, **2,4 toques por pessoa**, e as 3 que tocaram no CTA final tocaram
   9 vezes. Nenhuma enviou o formulário. Cada toque novo reiniciava a mesma
   rolagem, então tocar de novo era literalmente a pior coisa a fazer.

   DUAS REGRAS, e as duas valem para as dez âncoras, não só para a barra:

   1. Acima de duas telas de distância o salto é instantâneo; abaixo continua
      suave. Duas telas é onde a rolagem deixa de ser movimento legível e
      vira só tempo.

   2. Se o destino for um dos dois formulários, o primeiro campo recebe o
      foco. O foco é o RECIBO do toque: cursor piscando e teclado aberto não
      deixam dúvida de que alguma coisa aconteceu, que é exatamente o que
      faltava. O `goToForm` da oferta já fazia isso desde sempre; as âncoras
      nunca fizeram, e eram elas que juntavam os toques repetidos.

   O foco passa pelo `focarSemContar`, senão o próprio clique no CTA viraria
   um "tocou no formulário" que ninguém tocou, e essa é justamente a métrica
   que diz se o buraco fica antes ou depois do formulário.

   COMO, e por que assim: o clique NÃO é sequestrado. Em vez de `preventDefault`
   mais rolagem à mão, aqui só se troca o `scroll-behavior` da raiz por um
   instante e deixa-se o navegador fazer a navegação de fragmento dele. Com
   isso a entrada no histórico, a restauração da posição no botão voltar e o
   `scroll-margin-top` de `.form` e `.section` continuam sendo problema do
   navegador, que os resolve melhor do que qualquer código nosso. A ordem é
   garantida: a ação padrão do clique roda ao fim do despacho do evento, e o
   `setTimeout` que devolve o suave só roda na tarefa seguinte.

   Este arquivo NÃO mede nada. O ClickCTA continua saindo do ouvinte delegado
   de tracking.ts, que roda no mesmo clique e não é afetado por nada daqui.
   ============================================================ */

import { cliqueModificado, focarSemContar } from "@/components/vitrine/tracking";

/* Duas telas. Abaixo disso a rolagem ainda se lê como movimento; acima ela
   só se conta em segundos. */
const TELAS_ATE_SALTAR = 2;

/* `#contratar` e `#hero-form` SÃO os próprios <form>, e qualquer outro alvo
   pode conter um. Quando o formulário já foi enviado o elemento vira o <div>
   da confirmação e não existe campo nenhum: aí não se foca nada, e a pessoa
   cai na confirmação, que é o certo. */
function campoDeEntrada(alvo: HTMLElement): HTMLInputElement | null {
  const form = alvo instanceof HTMLFormElement ? alvo : alvo.querySelector("form");
  return (form?.elements.namedItem("nome") as HTMLInputElement | null) || null;
}

export function ligarAncoras() {
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !a.hash || cliqueModificado(e)) return;
    /* Só âncora desta mesma página. Um link para /portfolio#topo é navegação
       de verdade e não tem nada a ver com isto. */
    if (a.origin !== location.origin || a.pathname !== location.pathname) return;

    const alvo = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!alvo) return;

    /* `top` é a distância com sinal até o topo da tela: para cima é negativo,
       e o que interessa é o tamanho da viagem, não a direção dela. */
    const distancia = Math.abs(alvo.getBoundingClientRect().top);
    if (distancia > window.innerHeight * TELAS_ATE_SALTAR) {
      document.documentElement.style.scrollBehavior = "auto";
    }

    setTimeout(() => {
      /* String vazia remove a regra inline e devolve a palavra ao CSS, que é
         quem decide entre `smooth` e o `auto` do prefers-reduced-motion. */
      document.documentElement.style.scrollBehavior = "";
      focarSemContar(campoDeEntrada(alvo));
    }, 0);
  });
}
