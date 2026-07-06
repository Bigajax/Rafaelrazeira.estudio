/* COMO FUNCIONA — o processo em 3 passos numerados (briefing → design → publicação) */
import { CONFIG } from "../config.js";

export function process(){
  const p = CONFIG.process;
  const steps = p.steps.map(s => `
    <li class="proc__step reveal">
      <span class="proc__num">${s.num}</span>
      <div>
        <h3 class="proc__title">${s.title}</h3>
        <p class="proc__text">${s.text}</p>
      </div>
    </li>`).join("");
  return `
  <section class="process" id="como-funciona">
    <div class="wrap">
      <div class="section-label process__label reveal">${p.label}</div>
      <ol class="proc__list">${steps}</ol>
      ${p.note ? `<a href="#contato" class="proc__note reveal"><span class="arrow" aria-hidden="true">→</span> ${p.note}</a>` : ""}
    </div>
  </section>`;
}
