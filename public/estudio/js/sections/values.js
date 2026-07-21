/* VALORES — seção escura: lista de palavras grandes + parágrafo */
import { CONFIG } from "../config.js";

export function values(){
  const v = CONFIG.values;
  const words = v.words.map(w => `<li>${w}</li>`).join("");
  return `
  <section class="values dark" id="values">
    <div class="wrap">
      <ul class="values__words reveal">${words}</ul>
      <p class="values__para reveal">${v.paragraph}</p>
    </div>
  </section>`;
}
