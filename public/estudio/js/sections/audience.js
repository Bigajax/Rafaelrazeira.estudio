/* PARA QUEM É — blocos numerados 01 / 02 / 03 */
import { CONFIG } from "../config.js";
import { ponto } from "../lib/ponto.js";

export function audience(){
  const a = CONFIG.audience;
  /* O marcador é OPCIONAL e muda o que a coluna da esquerda mostra.
     Sem ele (a /estudio), ela é o traço esmeralda que abre o bloco: são
     três tipos de cliente, e numerar prometeria uma ordem que a seção não
     tem. Com ele (a /landing-page), vira "VAZAMENTO 01" em rosa, e aí a
     numeração é honesta: a própria intro anuncia "os três vazamentos mais
     caros", então a lista JÁ está enumerada pelo texto. */
  const items = a.blocks.map((b, i) => `
    <div class="aud__item reveal${a.marcador ? " aud__item--marcado" : ""}">
      <div class="aud__num">${a.marcador ? `${a.marcador} ` : ""}${String(i + 1).padStart(2, "0")}</div>
      <div>
        <h3 class="aud__title">${b.title}</h3>
        ${b.text ? `<p class="aud__text">${b.text}</p>` : ""}
      </div>
    </div>`).join("");
  /* ---------- a conta (só a /landing-page, desde 11/09) ----------
     Um recibo de quatro linhas no lugar dos parágrafos: número em corpo de
     manchete, legenda em mono, filete picotado entre as linhas, e o total
     em rosa vivo, que é a cor do que está errado nesta página. Com a
     conta presente, a seção vira duas colunas no desktop: o recibo à
     esquerda e os três vazamentos, só título, à direita. */
  const c = a.conta;
  const conta = c ? `
    <div class="conta reveal" role="figure" aria-label="A conta do clique perdido">
      ${c.linhas.map(l => `<div class="conta__linha"><b>${l.num}</b><span>${l.texto}</span></div>`).join("")}
      <div class="conta__linha conta__total"><b>${c.total.num}</b><span>${c.total.texto}</span></div>
      ${c.nota ? `<p class="conta__nota">${c.nota}</p>` : ""}
    </div>` : "";
  /* Manchete e intro são OPCIONAIS. Na /estudio esta seção é a lista
     "para quem é este trabalho" e o rótulo basta. Na /landing-page ela
     vira "onde o dinheiro vaza", que precisa apresentar o problema antes
     de listar os três: sem a intro, os blocos chegariam sem pergunta. */
  /* `escura` liga o fundo grafite. Não é tema: é a única seção das duas
     páginas que dá uma MÁ NOTÍCIA, e o escuro é o que a separa das outras
     no meio de uma sequência inteira de papel. Ver `.audience.dark`. */
  return `
  <section class="audience${a.escura ? " dark" : ""}" id="audience">
    <div class="wrap">
      <div class="section-label audience__label reveal">${a.label}</div>
      ${a.headline ? `<h2 class="audience__head reveal">${ponto(a.headline)}</h2>` : ""}
      ${a.intro ? `<p class="audience__intro reveal">${a.intro}</p>` : ""}
      ${conta ? `<div class="audience__grade">${conta}<div class="audience__lista">${items}</div></div>` : `<div>${items}</div>`}
    </div>
  </section>`;
}
