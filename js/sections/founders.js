/* PROJETOS FUNDADORES — seção escura antes do contato: card central
   com borda esmeralda sutil, convite para os primeiros cases do estúdio.
   Tom de acesso antecipado ("founding partners"), nunca de promoção. */
import { CONFIG } from "../config.js";

export function founders(){
  const f = CONFIG.founders;
  const items = f.benefits.map(b => `
        <li class="founders__benefit"><span class="founders__check" aria-hidden="true">✓</span>${b}</li>`).join("");
  return `
  <section class="founders dark" id="fundadores">
    <div class="wrap">
      <div class="founders__card reveal">
        <span class="founders__icon" aria-hidden="true">◆</span>
        <div class="eyebrow founders__eyebrow">
          <span class="dot"></span><span class="status">${f.status}</span>
        </div>
        <h2 class="founders__title">${f.title}</h2>
        <p class="founders__text">${f.text}</p>
        <ul class="founders__benefits">${items}
      </ul>
        <p class="founders__limited">${f.limited}</p>
        <div class="founders__action">
          <p class="founders__cta-line">${f.ctaLine}</p>
          <a href="#contato" class="founders__btn" data-cta="founders" data-cta-dest="form">
            <span class="arrow">↗</span> ${f.cta}
          </a>
        </div>
      </div>
    </div>
  </section>`;
}
