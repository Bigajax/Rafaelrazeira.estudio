/* FOOTER — escuro: redes no topo, localização, barra legal
   e o nome da marca gigante cortado na base (como a referência) */
import { CONFIG } from "../config.js";

export function footer(){
  const f = CONFIG.footer;
  const ano = new Date().getFullYear();
  const legal = f.legal.map(l => `<a href="${l.url}">${l.label}</a>`).join("");
  const nome = `${f.name}. `;
  return `
  <footer class="site-footer">
    <div class="wrap">
      <nav class="footer__social" aria-label="Redes e contato">
        <a href="${f.instagram.url}" target="_blank" rel="noopener">INSTAGRAM</a>
        <a href="mailto:${f.email}">E-MAIL</a>
        <a href="${f.whatsapp.url}" target="_blank" rel="noopener" data-cta="footer" data-cta-dest="whatsapp">WHATSAPP</a>
      </nav>
      <p class="footer__location">${f.location}</p>
      <div class="footer__bar">
        <span>© ${ano} — ${f.name} — TODOS OS DIREITOS RESERVADOS</span>
        <div class="footer__legal">${legal}</div>
      </div>
    </div>
    <div class="footer__brand" aria-hidden="true">
      <div class="footer__brandtrack"><span>${nome.repeat(6)}</span><span>${nome.repeat(6)}</span></div>
    </div>
  </footer>`;
}
