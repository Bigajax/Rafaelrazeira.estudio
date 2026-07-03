/* CTA PILL flutuante — fixo em todas as seções (comportamento em js/lib/pill.js) */
import { CONFIG } from "../config.js";

export function pill(){
  return `
  <a href="#contato" class="pill" id="floating-pill">
    <span class="arrow">→</span><span class="divider"></span><span>${CONFIG.pillText}</span>
  </a>`;
}
