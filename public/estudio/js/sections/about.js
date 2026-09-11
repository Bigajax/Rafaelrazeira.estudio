/* QUEM SOMOS — label + texto editorial grande + link de conversa */
import { CONFIG, T } from "../config.js";
import { ponto } from "../lib/ponto.js";

/* o mesmo `abs` do cases.js: a /en/landing-page mora um nível abaixo e o
   "assets/rafael-quemfaz.jpg" do config resolvia em /en/assets/ */
const abs = (p) => (p && !/^(\/|https?:|data:)/.test(p) ? `/${p}` : p);

export function about(){
  const a = CONFIG.about;
  const text = a.paragraphs.map(p => `<p>${p}</p>`).join("");
  /* ---------- a ficha de quem faz (só a /landing-page, desde 11/09) ----------
     Foto, nome em corpo de manchete, uma frase de papel, três dados na
     régua e o fecho. É a mesma anatomia da ficha dos projetos: quem
     responde do outro lado tratado como um projeto do estúdio. */
  if (a.ficha) return `
  <section class="about about--ficha" id="about">
    <div class="wrap">
      <div class="section-label reveal">${a.label}</div>
      <div class="about__ficha reveal">
        <figure class="about__foto"><img src="${abs(a.foto)}" alt="${T.altFoto(a.nome.replace(/.$/, ""))}" loading="lazy" decoding="async" /></figure>
        <div class="about__corpo">
          <h2 class="about__nome">${ponto(a.nome)}</h2>
          <p class="about__papel">${a.papel}</p>
          <ul class="about__dados">${a.dados.map(d => `<li><b>${d.num}</b><span>${d.texto}</span></li>`).join("")}</ul>
          <p class="about__fecho">${a.fecho}</p>
          <a href="#contato" class="about__cta" data-cta="about" data-cta-dest="form"><span class="arrow" aria-hidden="true">↗</span> ${a.cta}</a>
        </div>
      </div>
    </div>
  </section>`;
  return `
  <section class="about" id="about">
    <div class="wrap">
      <div class="section-label reveal">${a.label}</div>
      <div class="about__text reveal">
        ${text}
        <a href="#contato" class="about__cta" data-cta="about" data-cta-dest="form"><span class="arrow" aria-hidden="true">↗</span> ${a.cta}</a>
      </div>
    </div>
  </section>`;
}
