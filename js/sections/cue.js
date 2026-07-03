/* CUE — convite para rolar ("conheça mais"), entre a faixa e o quem somos */
import { CONFIG } from "../config.js";

export function cue(){
  return `
  <div class="cue">
    <a href="#about"><span class="cue__arrow" aria-hidden="true">▾</span> ${CONFIG.cue}</a>
  </div>`;
}
