/* CUE — convite para rolar, no pé do hero.
   Uma aba com filete de tinta e sombra dura: nesta página, sombra dura
   quer dizer "isto é uma coisa, e dá para apertar", e ele é um link.
   A seta é ↓ e não o ▾ antigo: o glifo cheio segura o peso da aba.
   Ver css/sections/cue.css. */
import { CONFIG } from "../config.js";

export function cue(){
  return `
  <div class="cue">
    <a href="#about"><span class="cue__label">${CONFIG.cue}</span><span class="cue__arrow" aria-hidden="true">↓</span></a>
  </div>`;
}
