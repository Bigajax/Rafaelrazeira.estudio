/* MARQUEE — frases em loop horizontal infinito (duplicadas p/ loop contínuo).
   Aceita uma frase (string) ou várias (array) em CONFIG.marquee. */
import { CONFIG } from "../config.js";

export function marquee(){
  const phrases = Array.isArray(CONFIG.marquee) ? CONFIG.marquee : [CONFIG.marquee];
  const unit = phrases.map(p => `<span>${p}</span>`).join("");
  const repeats = Math.max(4, Math.ceil(8 / phrases.length));
  return `
  <div class="marquee" aria-hidden="true">
    <div class="marquee__track">${unit.repeat(repeats)}</div>
  </div>`;
}
