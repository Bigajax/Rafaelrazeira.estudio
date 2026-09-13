/* ============================================================
   FAQ — as perguntas que travam quem já anuncia (12/09/2026)

   A landing não tinha FAQ; a vitrine tem, e é a única dobra dela onde os
   LIMITES do que se compra aparecem antes de a pessoa perguntar. Aqui o
   trabalho é o mesmo, com as perguntas de quem já paga anúncio: preciso
   já anunciar? e se eu não gostar? quanto tempo? domínio? mensalidade?
   Entra depois do "quem faz" e antes do formulário, que é onde a objeção
   aparece.

   O empréstimo do visonstudios.com é a saída no fim da lista ("não achou
   a sua? contato"): quem chegou até aqui com uma dúvida que não está na
   lista precisa de um caminho, e o caminho desta página é o formulário,
   com o mesmo rótulo de sempre.

   <details> nativo: abre sem JavaScript, o leitor de tela anuncia o
   estado, e o "+" que vira "×" é só CSS.
   ============================================================ */
import { CONFIG } from "../config.js";

export function faq(){
  const f = CONFIG.faq;
  if (!f) return "";
  const itens = f.itens.map(({ p, r }) => `
      <details class="faq__item reveal">
        <summary class="faq__pergunta"><span>${p}</span><i class="faq__mais" aria-hidden="true"></i></summary>
        <p class="faq__resposta">${r}</p>
      </details>`).join("");
  return `
  <section class="faq" id="faq">
    <div class="wrap">
      <div class="section-label reveal">${f.label}</div>
      <h2 class="faq__head reveal">${f.headline}</h2>
      <div class="faq__lista">${itens}</div>
      <p class="faq__saida reveal">${f.saida.texto} <a href="#contato" data-cta="faq" data-cta-dest="form">${f.saida.cta} <span class="arrow" aria-hidden="true">↓</span></a></p>
    </div>
  </section>`;
}
