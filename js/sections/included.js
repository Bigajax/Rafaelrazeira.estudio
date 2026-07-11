/* O QUE ESTÁ INCLUSO — o "romaneio" do projeto: as 6 entregas que
   saem do estúdio com toda página. Fica entre o processo e os cases. */
import { CONFIG } from "../config.js";

export function included(){
  const inc = CONFIG.included;
  const items = inc.items.map(it => `
    <li class="inc__item reveal">
      <span class="inc__num">${it.num}</span>
      <h3 class="inc__title">${it.title}</h3>
      <p class="inc__text">${it.text}</p>
    </li>`).join("");
  return `
  <section class="included" id="incluso">
    <div class="wrap">
      <div class="section-label reveal">${inc.label}</div>
      <h2 class="inc__head reveal">${inc.headline}</h2>
      <ol class="inc__grid">${items}</ol>
    </div>
  </section>`;
}
