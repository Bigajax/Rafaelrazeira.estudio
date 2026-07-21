/* HEADER fixo — logo + CTA no topo */
import { CONFIG } from "../config.js";

export function header(){
  const b = CONFIG.brand;
  return `
  <header class="site-header">
    <div class="wrap">
      <a href="#top" class="logo"><b>${b.name}</b> <span class="suffix">${b.suffix}</span></a>
      <nav class="header-actions" aria-label="Navegação principal">
        <a href="/servicos" class="nav-product">SERVIÇOS</a>
        <a href="/vitrine-digital/" class="nav-product">VITRINE DIGITAL</a>
        <a href="#contato" class="nav-cta" data-cta="header" data-cta-dest="form">${b.navCta} <span class="arrow">↗</span></a>
      </nav>
    </div>
  </header>`;
}
