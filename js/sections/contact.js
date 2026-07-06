/* CONTATO / CTA FINAL — headline, escassez, e-mail e formulário de briefing.
   Comportamento de envio e dropdowns: js/lib/form.js */
import { CONFIG } from "../config.js";

/* Dropdown customizado (o <select> nativo não aceita glassmorphism).
   O valor vive num input hidden — o envio continua lendo form.<name>.value */
function dropdown(id, name, cfg){
  const opts = cfg.options.map((o, i) =>
    `<li class="dd__opt${i === 0 ? " is-selected" : ""}" role="option" data-value="${o}">${o}</li>`).join("");
  return `
    <div class="field">
      <label id="lb-${id}">${cfg.label}</label>
      <div class="dd" data-dd>
        <input type="hidden" name="${name}" value="${cfg.options[0]}" />
        <button type="button" class="dd__btn" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="lb-${id}">
          <span class="dd__value">${cfg.options[0]}</span>
          <svg class="dd__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <ul class="dd__list" role="listbox">${opts}</ul>
      </div>
    </div>`;
}

export function contact(){
  const c = CONFIG.contact, f = c.form;

  return `
  <section class="contact dark" id="contato">
    <div class="contact__glow" aria-hidden="true"><span></span><span></span></div>
    <div class="wrap">
      <div class="eyebrow reveal"><span class="dot"></span><span class="status">${c.status}</span></div>
      <h2 class="contact__head reveal">${c.headline}</h2>
      <p class="contact__intro reveal">${c.intro}</p>
      <p class="contact__scarcity reveal">${c.scarcity}</p>
      <a href="mailto:${c.email}" class="contact__email reveal"><span class="arrow">→</span> ${c.email}</a>

      <aside class="guarantee reveal">
        <span class="guarantee__label">${c.guarantee.label}</span>
        <h3 class="guarantee__title">${c.guarantee.title}</h3>
        <p class="guarantee__text">${c.guarantee.text}</p>
      </aside>

      <p class="contact__pricing reveal">${c.pricing}</p>

      <div class="form-card reveal">
        <div class="stepper">
          <div class="step step--active"><small>${c.steps[0].num}.</small><span>${c.steps[0].label}</span></div>
          <div class="step step--muted"><small>${c.steps[1].num}.</small><span>${c.steps[1].label}</span></div>
        </div>

        <form id="briefing-form" novalidate>
          <input type="text" name="_gotcha" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />

          <div class="field">
            <label for="f-nome">${f.nome.label}</label>
            <input id="f-nome" name="nome" type="text" placeholder="${f.nome.placeholder}" required autocomplete="name" />
          </div>
          <div class="field">
            <label for="f-email">${f.email.label}</label>
            <input id="f-email" name="email" type="email" placeholder="${f.email.placeholder}" required autocomplete="email" />
          </div>
          <div class="field">
            <label for="f-whats">${f.whatsapp.label}</label>
            <input id="f-whats" name="whatsapp" type="tel" inputmode="tel" placeholder="${f.whatsapp.placeholder}" required autocomplete="tel" />
          </div>
          <div class="field">
            <label for="f-empresa">${f.empresa.label}</label>
            <input id="f-empresa" name="empresa" type="text" placeholder="${f.empresa.placeholder}" autocomplete="organization" />
          </div>

          ${dropdown("cargo", "cargo", f.cargo)}
          ${dropdown("need", "necessidade", f.need)}
          ${dropdown("inicio", "inicio", f.inicio)}
          ${dropdown("invest", "investimento", f.investimento)}
          ${dropdown("canal", "canal", f.canal)}

          <button type="submit" class="btn-submit">${f.submit} <span class="arrow">→</span></button>
          <p class="form-note">${f.note}</p>
        </form>

        <div class="form-success" id="form-success">
          <h3>${f.successTitle}</h3>
          <p>${f.successText}</p>
          <a class="btn-submit form-success__cta" id="schedule-cta"
             href="${c.schedule.url || `${CONFIG.footer.whatsapp.url}?text=${encodeURIComponent("Olá, Rafael! Acabei de enviar o briefing pelo site e quero agendar nossa conversa.")}`}"
             target="_blank" rel="noopener">${c.schedule.cta} <span class="arrow">→</span></a>
        </div>
      </div>
    </div>
  </section>`;
}
