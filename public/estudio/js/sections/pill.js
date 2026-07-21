/* CTA PILL flutuante — fixo em todas as seções (comportamento em js/lib/pill.js).
   É o CTA fixo do mobile: some ao chegar no formulário e o tracking o
   reporta como "sticky_mobile" abaixo de 1024px (js/lib/tracking.js). */
import { CONFIG } from "../config.js";

export function pill(){
  return `
  <a href="#contato" class="pill" id="floating-pill" data-cta="pill" data-cta-dest="form">
    <span class="arrow">→</span><span class="divider"></span><span>${CONFIG.pillText}</span>
  </a>`;
}
