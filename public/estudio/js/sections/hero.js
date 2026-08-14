/* HERO — status, tagline, headline gigante em lockup de cartaz,
   sub + CTA duplo (formulário primário / WhatsApp discreto) */
import { CONFIG, WHATSAPP_NUMBER } from "../config.js";
import { ponto } from "../lib/ponto.js";

export function hero(){
  const h = CONFIG.hero;
  const f = h.form;   // rótulos e mensagens do formulário do cartão
  /* A ÚLTIMA linha entra dentro da faixa grafite (ver `.hero__faixa`, no
     CSS): ela é onde mora a promessa da página, e passar de tipo chapado
     a objeto é o que a separa da descrição que vem antes.

     O `.hero__line` continua sendo o elemento medido pelo herofit.js, e
     por isso ele segue puro texto: qualquer coisa a mais dentro dele (um
     chip, um ícone) entraria na conta de largura e quebraria o lockup. */
  const ultima = h.headline.length - 1;
  const lines = h.headline.map((l, i) => {
    const linha = `<span class="hero__line">${ponto(l)}</span>`;
    return i === ultima ? `<span class="hero__faixa">${linha}</span>` : linha;
  }).join("");
  // Cada item da prova é inquebrável — a linha só dobra nos separadores "·"
  const proof = h.proof.split("·").map(p => `<span>${p.trim()}</span>`).join(" · ");
  /* ---------- a tagline virou LISTA, e não frase ----------
     Ela era uma string única com pontos no meio ("POSICIONAMENTO ·
     CONVERSÃO · NOVOS NEGÓCIOS"), ou seja, três categorias disfarçadas de
     frase. São três coisas separadas, e agora são três itens de verdade,
     cada um com o filete que o /portfolio usa na linha de inventário.
     O separador some do texto: quem separa passa a ser o traço, que é
     desenho e não pontuação.
     Continua vindo de uma string só no config, então a copy não muda de
     formato para quem edita. */
  const tags = h.tagline.split("·").map(t => `<li>${t.trim()}</li>`).join("");
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(h.whatsMsg)}`;
  /* No eyebrow a ordem virou tagline → status, e não o contrário, porque
     agora os dois vão para pontas OPOSTAS da linha: o que o estúdio faz
     abre à esquerda, se ele pode começar fecha à direita. A régua de duas
     pontas rima com a faixa que fecha o lockup embaixo, e o traço solto
     que separava os dois deixou de ser necessário. */
  return `
  <section class="hero" id="hero">
    <div class="wrap">
      <div class="eyebrow reveal">
        <ul class="eyebrow__tagline">${tags}</ul>
      </div>
      <h1 class="hero__headline reveal">${lines}</h1>
      <div class="hero__bottom" id="hero-card">
        <svg class="hero__selo" viewBox="0 0 100 100" role="img" aria-label="Carimbo: agenda aberta">
          <defs>
            <path id="seloArcoTopoEstudio" d="M50 50 m-34.5 0 a34.5 34.5 0 0 1 69 0" fill="none" />
          </defs>
          <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="2.6" />
          <circle cx="50" cy="50" r="40.5" fill="none" stroke="currentColor" stroke-width="1" />
          <text font-size="6.6" letter-spacing=".45">
            <textPath href="#seloArcoTopoEstudio" startOffset="50%" text-anchor="middle">RAFAEL RAZEIRA ESTÚDIO</textPath>
          </text>
          <text x="50" y="48.5" font-size="14" letter-spacing=".4" text-anchor="middle">AGENDA</text>
          <text x="50" y="62.5" font-size="14" letter-spacing=".4" text-anchor="middle">ABERTA</text>
          <line x1="31" y1="69.5" x2="69" y2="69.5" stroke="currentColor" stroke-width="1" />
          <text x="50" y="79.5" font-size="7.2" letter-spacing=".5" text-anchor="middle">MARINGÁ · PR</text>
        </svg>
        <p class="hero__sub reveal">${h.subheadline}</p>
        <div class="hero__ctas reveal">
          <form id="hero-form" class="hero-form" novalidate>
            <div class="hero-form__par">
              <div class="hero-form__linha">
                <label class="hero-form__campo">
                  <span>${f.nome.label}</span>
                  <input name="nome" type="text" autocomplete="name" placeholder="${f.nome.ph}" />
                </label>
                <p class="hero-form__err" id="h-err-nome" hidden>${f.errNome}</p>
              </div>
              <div class="hero-form__linha">
                <label class="hero-form__campo">
                  <span>${f.whatsapp.label}</span>
                  <input name="whatsapp" type="tel" inputmode="numeric" autocomplete="tel" placeholder="${f.whatsapp.ph}" />
                </label>
                <p class="hero-form__err" id="h-err-whats" hidden>${f.errWhats}</p>
              </div>
            </div>

            <div class="hero-form__linha">
              <label class="hero-form__campo">
                <span>${f.instagram.label}</span>
                <input name="instagram" type="text" placeholder="${f.instagram.ph}" />
              </label>
            </div>

            <input name="_gotcha" class="hero-form__pote" tabindex="-1" autocomplete="off" aria-hidden="true" />

            <button type="submit" class="hero-form__btn">${f.enviar}</button>
            <p class="hero-form__erro" role="alert" hidden></p>
          </form>

          <p class="hero__proof">${proof}</p>
        </div>

        <div class="hero-ok" role="status">
          <h2 class="hero-ok__titulo">${f.okTitulo}</h2>
          <p class="hero-ok__texto">${f.okTexto}</p>
          <a id="hero-ok-cta" class="hero-form__btn" href="${waLink}" target="_blank" rel="noopener"
             data-cta="hero_pos_envio" data-cta-dest="whatsapp">${f.okCta}</a>
        </div>
      </div>
      <div class="cue hero__cue reveal">
        <a href="#about"><span class="cue__label">${CONFIG.cue}</span><span class="cue__arrow" aria-hidden="true">↓</span></a>
      </div>
    </div>
  </section>`;
}
