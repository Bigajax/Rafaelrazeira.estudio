/* O QUE ESTÁ INCLUSO — o "romaneio" do projeto: as 6 entregas que
   saem do estúdio com toda página. Fica entre o processo e os cases. */
import { CONFIG } from "../config.js";
import { ponto } from "../lib/ponto.js";

export function included(){
  const inc = CONFIG.included;
  /* O miolo vai num <div> próprio porque o `.inc__item` virou uma linha
     de dois lados: conteúdo à esquerda, ✓ encostado na margem direita
     (o ✓ nasce no `::after`, em css/sections/included.css). O `.inc__num`
     continua no HTML e escondido no CSS: a numeração saiu do desenho, mas
     o dado segue em js/config.js e volta sem edição se for preciso. */
  const items = inc.items.map(it => `
    <li class="inc__item reveal">
      <div>
        <span class="inc__num">${it.num}</span>
        <h3 class="inc__title">${it.title}</h3>
        <p class="inc__text">${it.text}</p>
      </div>
    </li>`).join("");
  return `
  <section class="included" id="incluso">
    <div class="wrap">
      <div class="section-label reveal">${inc.label}</div>
      <h2 class="inc__head reveal">${ponto(inc.headline)}</h2>
      <ol class="inc__grid">${items}</ol>
    </div>
  </section>`;
}
