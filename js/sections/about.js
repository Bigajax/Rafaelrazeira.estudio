/* QUEM SOMOS — label + texto editorial grande + link de conversa */
import { CONFIG } from "../config.js";

export function about(){
  const a = CONFIG.about;
  const text = a.paragraphs.map(p => `<p>${p}</p>`).join("");
  return `
  <section class="about" id="about">
    <div class="wrap">
      <div class="section-label reveal">${a.label}</div>
      <div class="about__text reveal">
        ${text}
        <a href="#contato" class="about__cta"><span class="arrow" aria-hidden="true">↗</span> ${a.cta}</a>
      </div>
    </div>
  </section>`;
}
