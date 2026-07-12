/* HERO — status, tagline, headline gigante em lockup de cartaz,
   sub + CTA duplo (formulário primário / WhatsApp discreto) */
import { CONFIG, WHATSAPP_NUMBER } from "../config.js";

export function hero(){
  const h = CONFIG.hero;
  const lines = h.headline.map(l => `<span class="hero__line">${l}</span>`).join("");
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(h.whatsMsg)}`;
  return `
  <section class="hero" id="hero">
    <div class="wrap">
      <div class="eyebrow reveal">
        <span class="dot"></span><span class="status">${h.status}</span>
        <span class="eyebrow__dash" aria-hidden="true">—</span>
        <span class="eyebrow__tagline">${h.tagline}</span>
      </div>
      <h1 class="hero__headline reveal">${lines}</h1>
      <div class="hero__bottom">
        <div class="hero__ctas reveal">
          <a href="#contato" class="btn-outline" data-cta="hero" data-cta-dest="form"><span class="arrow">↗</span> ${h.cta}</a>
          <a href="${waLink}" class="hero__whats" target="_blank" rel="noopener"
             data-cta="whatsapp" data-cta-dest="whatsapp">${h.ctaWhats} <span class="arrow" aria-hidden="true">→</span></a>
        </div>
        <p class="hero__sub reveal">${h.subheadline}</p>
      </div>
    </div>
  </section>`;
}
