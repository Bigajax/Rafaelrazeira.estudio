/* COMO FUNCIONA — o processo em 3 passos numerados (briefing → design → publicação) */
import { CONFIG } from "../config.js";

export function process(){
  const p = CONFIG.process;
  /* A coluna da esquerda virou o trilho do tempo: o número em corpo de
     manchete e, embaixo dele, o PRAZO daquele passo em mono.

     O prazo é opcional e só existe onde o dado é real (ver `prazo` nos
     passos, em js/config.js). Ele não inventa promessa nenhuma: as três
     frases já estavam dentro dos parágrafos, enterradas no meio do texto,
     e é justamente esse o compromisso que o cliente de tráfego pago está
     tentando descobrir enquanto lê. */
  const steps = p.steps.map(s => `
    <li class="proc__step reveal">
      <span class="proc__num">
        <b>${s.num}</b>
        ${s.prazo ? `<i>${s.prazo}</i>` : ""}
      </span>
      <div>
        <h3 class="proc__title">${s.title}</h3>
        <p class="proc__text">${s.text}</p>
      </div>
    </li>`).join("");
  return `
  <section class="process" id="como-funciona">
    <div class="wrap">
      <div class="section-label process__label reveal">${p.label}</div>
      <ol class="proc__list">${steps}</ol>
      ${p.note ? `<a href="#contato" class="proc__note reveal" data-cta="process" data-cta-dest="form"><span class="arrow" aria-hidden="true">→</span> ${p.note}</a>` : ""}
    </div>
  </section>`;
}
