/* HEADER fixo — logo + CTA no topo */
import { CONFIG, IDIOMA } from "../config.js";

/* ---------- o seletor PT | EN (11/09/2026) ----------
   Só nas páginas que têm irmã em inglês (IDIOMA.irma existe). Bandeiras
   em SVG, nunca emoji: o Chrome no Windows não tem o glifo e mostra
   "BR"/"US" em letras. Os links levam ?lang=, que o middleware transforma
   em cookie e redireciona para a URL limpa: funciona sem JavaScript. */
const BANDEIRA = {
  pt: `<svg viewBox="0 0 14 10" width="14" height="10" aria-hidden="true" focusable="false"><rect width="14" height="10" fill="#0C9159"/><path d="M7 1.4 12.4 5 7 8.6 1.6 5Z" fill="#F2D24B"/><circle cx="7" cy="5" r="1.9" fill="#1B3F8B"/></svg>`,
  en: `<svg viewBox="0 0 14 10" width="14" height="10" aria-hidden="true" focusable="false"><rect width="14" height="10" fill="#F2EFE6"/><path d="M0 1h14M0 3h14M0 5h14M0 7h14M0 9h14" stroke="#C8102E" stroke-width="1"/><rect width="6" height="5" fill="#1B3F8B"/></svg>`,
};
function seletorIdioma(){
  if (!IDIOMA.irma) return "";
  const item = (lang, href, sigla, nome, code) => {
    const ativo = IDIOMA.atual === lang;
    return `<a href="${href}" hreflang="${code}" lang="${code}" aria-label="${nome}"${ativo ? ` aria-current="page"` : ""} data-cta="idioma" data-cta-dest="${lang}">${BANDEIRA[lang]}${sigla}</a>`;
  };
  const pt = IDIOMA.atual === "pt" ? location.pathname : IDIOMA.irma;
  const en = IDIOMA.atual === "en" ? location.pathname : IDIOMA.irma;
  return `<nav class="lang" aria-label="Idioma / Language">${item("pt", `${pt}?lang=pt`, "PT", "Português", "pt-BR")}${item("en", `${en}?lang=en`, "EN", "English", "en")}</nav>`;
}

export function header(){
  const b = CONFIG.brand;
  return `
  <header class="site-header">
    <div class="wrap">
      <a href="#top" class="logo"><b>${b.name}</b> <span class="suffix">${b.suffix}</span></a>
      <nav class="header-actions" aria-label="Navegação principal">
        ${seletorIdioma()}
        <a href="/servicos" class="nav-product">SERVIÇOS</a>
        <a href="/vitrine-digital/" class="nav-product">VITRINE DIGITAL</a>
        <a href="/portfolio" class="nav-product">PORTFÓLIO</a>
        <a href="#contato" class="nav-cta" data-cta="header" data-cta-dest="form">${b.navCta} <span class="arrow">↗</span></a>
      </nav>
    </div>
  </header>`;
}
