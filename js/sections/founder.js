/* FOUNDER — foto do fundador com nome estourado por cima,
   letreiros gigantes ao fundo e bio (headline + parágrafos) */
import { CONFIG } from "../config.js";

export function founder(){
  const f = CONFIG.founder;
  const bgUnit = f.bgWords.map(w => `<span>${w} .</span>`).join("");
  const paragraphs = f.paragraphs.map(p => `<p>${p}</p>`).join("");
  return `
  <section class="founder" id="founder">
    <div class="founder__bg" aria-hidden="true">
      <div class="founder__bgrow"><div class="founder__bgtrack">${bgUnit.repeat(4)}</div></div>
      <div class="founder__bgrow"><div class="founder__bgtrack founder__bgtrack--rev">${bgUnit.repeat(4)}</div></div>
    </div>
    <div class="wrap founder__stage">
      <figure class="founder__photo reveal">
        <img src="${f.photo}" alt="${f.firstName} ${f.lastName}, fundador do estúdio" loading="lazy" />
      </figure>
      <h2 class="founder__name" aria-label="${f.firstName} ${f.lastName}">
        <span class="founder__first reveal" aria-hidden="true">${f.firstName}</span>
        <span class="founder__last reveal" aria-hidden="true">${f.lastName}</span>
      </h2>
    </div>
    <div class="wrap founder__body">
      <h3 class="founder__headline reveal">${f.headline}</h3>
      <div class="founder__text reveal">${paragraphs}</div>
    </div>
  </section>`;
}
