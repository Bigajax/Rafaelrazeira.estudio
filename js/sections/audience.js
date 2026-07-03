/* PARA QUEM É — blocos numerados 01 / 02 / 03 */
import { CONFIG } from "../config.js";

export function audience(){
  const a = CONFIG.audience;
  const items = a.blocks.map((b, i) => `
    <div class="aud__item reveal">
      <div class="aud__num">${String(i + 1).padStart(2, "0")}</div>
      <div>
        <h3 class="aud__title">${b.title}</h3>
        <p class="aud__text">${b.text}</p>
      </div>
    </div>`).join("");
  return `
  <section class="audience" id="audience">
    <div class="wrap">
      <div class="section-label audience__label reveal">${a.label}</div>
      <div>${items}</div>
    </div>
  </section>`;
}
