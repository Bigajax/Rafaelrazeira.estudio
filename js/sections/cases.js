/* CASES — headline + grid de projetos (vídeo em mockup de iPhone, imagem ou placeholder) */
import { CONFIG } from "../config.js";

function media(it){
  if (it.video) return `
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
              <video src="${it.video}" muted loop playsinline preload="auto"
                     aria-label="Demonstração em vídeo — ${it.name}"></video>
            </div>
          </div>
        </div>`;
  if (it.img) return `<img src="${it.img}" alt="${it.name}" loading="lazy" width="800" height="1000" />`;
  return `<div class="case__placeholder"><span>${it.name}</span></div>`;
}

export function cases(){
  const c = CONFIG.cases;
  const items = c.items.map(it => `
    <article class="case reveal">
      <div class="case__media">${media(it)}</div>
      <div class="case__cat">${it.category}</div>
      <h3 class="case__name">${it.name}</h3>
      <p class="case__result">${it.result}</p>
    </article>`).join("");
  return `
  <section class="cases" id="cases">
    <div class="wrap">
      <h2 class="cases__head reveal">${c.headline}</h2>
      <div class="cases__grid">${items}</div>
    </div>
  </section>`;
}
