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
      <p class="contact__pricing-note reveal">${c.pricingNote}</p>

      <div class="form-card reveal">
        <div class="stepper">
          <div class="step step--active"><small>${c.steps[0].num}.</small><span>${c.steps[0].label}</span></div>
          <div class="step step--muted"><small>${c.steps[1].num}.</small><span>${c.steps[1].label}</span></div>
        </div>

        <form id="briefing-form" novalidate>
          <input type="text" name="_gotcha" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />

          <!-- Passo 1 — seus dados -->
          <fieldset class="fstep is-active" data-fstep="1">
            <div class="field">
              <label for="f-nome">${f.nome.label}</label>
              <input id="f-nome" name="nome" type="text" placeholder="${f.nome.placeholder}" required autocomplete="name" aria-describedby="err-nome" />
              <p class="field__err" id="err-nome" hidden>${f.nome.err}</p>
            </div>
            <div class="field">
              <label for="f-whats">${f.whatsapp.label}</label>
              <input id="f-whats" name="whatsapp" type="tel" inputmode="tel" placeholder="${f.whatsapp.placeholder}" required autocomplete="tel" aria-describedby="err-whats" />
              <p class="field__err" id="err-whats" hidden>${f.whatsapp.err}</p>
            </div>
            <div class="field">
              <label for="f-insta">${f.instagram.label}</label>
              <input id="f-insta" name="instagram" type="text" placeholder="${f.instagram.placeholder}" autocomplete="url" />
            </div>
            <button type="button" class="btn-submit" id="btn-continue">${f.continueBtn} <span class="arrow">→</span></button>
          </fieldset>

          <!-- Passo 2 — sobre o projeto -->
          <fieldset class="fstep" data-fstep="2">
            <div class="field">
              <label id="lb-tipo">${f.tipoProjeto.label}</label>
              <div class="choices" role="radiogroup" aria-labelledby="lb-tipo" aria-describedby="err-tipo">
                ${f.tipoProjeto.options.map(o => `
                <label class="choice">
                  <input type="radio" name="tipo_projeto" value="${o}" />
                  <span>${o}</span>
                </label>`).join("")}
              </div>
              <p class="field__err" id="err-tipo" hidden>${f.tipoProjeto.err}</p>
            </div>
            <div class="field">
              <label for="f-vende">${f.vende.label}</label>
              <input id="f-vende" name="vende" type="text" placeholder="${f.vende.placeholder}" aria-describedby="err-vende" />
              <p class="field__err" id="err-vende" hidden>${f.vende.err}</p>
            </div>
            ${dropdown("objetivo", "objetivo", f.objetivo)}
            ${dropdown("identidade", "identidade", f.identidade)}
            <div class="field">
              <label for="f-detalhes">${f.detalhes.label}</label>
              <textarea id="f-detalhes" name="detalhes" rows="3" placeholder="${f.detalhes.placeholder}"></textarea>
            </div>
            <button type="submit" class="btn-submit" data-cta="form" data-cta-dest="form">${f.submit} <span class="arrow">→</span></button>
            <button type="button" class="btn-voltar" id="btn-back">${f.backBtn}</button>
          </fieldset>

          <p class="form-note">${f.note}</p>
        </form>

        <div class="form-success" id="form-success">
          <h3>${f.successTitle}</h3>
          <p>${f.successText}</p>
          <a class="btn-submit form-success__cta" id="schedule-cta"
             href="${c.schedule.url || `${CONFIG.footer.whatsapp.url}?text=${encodeURIComponent("Olá, Rafael! Acabei de enviar meu projeto pelo site e quero adiantar a conversa.")}`}"
             target="_blank" rel="noopener" data-cta="final" data-cta-dest="whatsapp">${c.schedule.cta} <span class="arrow">→</span></a>
        </div>
      </div>
    </div>
  </section>`;
}
