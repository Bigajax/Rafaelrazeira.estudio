/* CASES — headline + grid de projetos (vídeo ou captura em mockup de iPhone, ou placeholder) */
import { CONFIG } from "../config.js";

function phone(inner){
  return `
        <div class="case__stage">
          <div class="phone">
            <span class="phone__island" aria-hidden="true"></span>
            <div class="phone__screen">
              <div class="phone__statusbar" aria-hidden="true">
                <span class="phone__time">9:41</span>
                <svg class="phone__icons" viewBox="0 0 50 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="8" width="3" height="4" rx="1"/>
                  <rect x="4.5" y="6" width="3" height="6" rx="1"/>
                  <rect x="9" y="4" width="3" height="8" rx="1"/>
                  <rect x="13.5" y="2" width="3" height="10" rx="1"/>
                  <path d="M21.5 6.4a8 8 0 0 1 11 0l-1.6 1.7a5.7 5.7 0 0 0-7.8 0z"/>
                  <circle cx="27" cy="10.4" r="1.6"/>
                  <rect x="36" y="2.5" width="11" height="7" rx="2" fill="none" stroke="currentColor"/>
                  <rect x="37.5" y="4" width="6" height="4" rx="1"/>
                  <rect x="48" y="4.5" width="1.5" height="3" rx=".75"/>
                </svg>
              </div>
              ${inner}
            </div>
          </div>
        </div>`;
}

function media(it){
  if (it.video) return phone(`<video src="${it.video}" muted loop playsinline preload="auto"
                     aria-label="Demonstração em vídeo — ${it.name}"></video>`);
  /* ---------- AVIF e WebP, com o JPEG de reserva ----------
     Cada captura de página inteira tem ~760KB em JPEG, e são duas ou três
     por página: a /landing-page fechava em 1,68MB, quase tudo aqui. Numa
     página de tráfego pago, que argumenta justamente que o celular é onde
     tudo quebra, esse era o pior lugar para gastar banda. O AVIF corta uns
     65% e o WebP uns 42%.

     Os derivados são gerados por scripts/webp-assets.mjs e entram
     versionados. O `<img>` continua sendo o elemento que o CSS anima
     (`.phone__feed img`), então a rolagem dentro do aparelho não muda.

     A ordem importa: o navegador pega a PRIMEIRA source que entende. */
  if (it.img) {
    const base = it.img.replace(/\.jpe?g$/i, "");
    return phone(`<div class="phone__feed"><picture>
                <source type="image/avif" srcset="${base}.avif" />
                <source type="image/webp" srcset="${base}.webp" />
                <img src="${it.img}" alt="Página de ${it.name} aberta no celular" loading="lazy" decoding="async" fetchpriority="low" />
              </picture></div>`);
  }
  return `<div class="case__placeholder"><span>${it.name}</span></div>`;
}

export function cases(){
  const c = CONFIG.cases;
  const items = c.items.map(it => `
    <article class="case reveal">
      <div class="case__media">${media(it)}</div>
      <div class="case__cat">${it.category}</div>
      ${it.tag ? `<div class="case__tag">${it.tag}</div>` : ""}
      <h3 class="case__name">${it.name}</h3>
      <p class="case__result">${it.result}</p>
    </article>`).join("");
  return `
  <section class="cases" id="cases">
    <div class="wrap">
      <p class="cases__eyebrow reveal">${c.label}</p>
      <h2 class="cases__head reveal">${c.headline}</h2>
      <p class="cases__intro reveal">${c.intro}</p>
      <div class="cases__grid">${items}</div>
      <div class="cases__ctawrap reveal">
        <a href="#contato" class="cases__cta" data-cta="cases" data-cta-dest="form"><span class="arrow" aria-hidden="true">→</span> ${c.cta}</a>
      </div>
    </div>
  </section>`;
}
