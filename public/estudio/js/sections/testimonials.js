/* DEPOIMENTOS — 2 vídeos. Retorna vazio se enabled:false no config. */
import { CONFIG } from "../config.js";

export function testimonials(){
  const t = CONFIG.testimonials;
  if (!t.enabled) return "";

  const items = t.items.map(it => `
    <div class="reveal">
      <a class="testi__video" ${it.video ? `href="${it.video}" target="_blank" rel="noopener"` : ""}>
        ${it.thumb ? `<img src="${it.thumb}" alt="${it.name}" loading="lazy" />` : ""}
        <span class="testi__play" aria-hidden="true">▶</span>
      </a>
      <div class="testi__name">${it.name}</div>
      <div class="testi__role">${it.role}</div>
    </div>`).join("");

  return `
  <section class="testi dark" id="testimonials">
    <div class="wrap">
      <span class="eyebrow testi__label">${t.label}</span>
      <div class="testi__grid">${items}</div>
    </div>
  </section>`;
}
