/* HEADER fixo — logo + CTA no topo */
import { CONFIG } from "../config.js";

export function header(){
  const b = CONFIG.brand;
  return `
  <header class="site-header">
    <div class="wrap">
      <a href="#top" class="logo"><b>${b.name}</b> <span class="suffix">${b.suffix}</span></a>
      <a href="#contato" class="nav-cta">${b.navCta} <span class="arrow">↗</span></a>
    </div>
  </header>`;
}
