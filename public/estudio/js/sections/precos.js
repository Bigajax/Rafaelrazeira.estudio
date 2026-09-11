/* ============================================================
   PREÇOS — a folha de orçamento da /landing-page.

   Só a /landing-page usa esta seção. A /estudio não tem `precos` no
   config, e a função devolve string vazia se ela faltar: assim o módulo
   pode ser importado pelas duas sem quebrar nenhuma.

   ---------- por que é uma FOLHA e não três cartões ----------
   O reflexo aqui seria o kit de sempre: três cartões arredondados iguais,
   a mesma sombra debaixo de cada um e o do meio destacado com um selo de
   "mais escolhido". Ele não serve por dois motivos.

   O primeiro é de conteúdo: estes três não são degraus de um mesmo
   produto. Uma landing, um site e uma loja são trabalhos diferentes para
   negócios diferentes, e nenhum é o upsell do outro. Cartão com destaque
   promete uma escada que não existe, e quem vem do anúncio já sabe qual
   é o caso dele antes de chegar aqui: a seção não precisa recomendar, só
   precisa deixar achar.

   O segundo é de cor. A casa trabalha em 60/30/10 e o rosa é a AÇÃO, um
   lugar só por tela. Um cartão em destaque rosa criaria um segundo lugar
   para onde ir, e aí nem ele nem o botão flutuante seriam O botão.

   Então: três linhas do mesmo peso, filete entre elas, valor alinhado à
   direita como numa conta. O que decide não é o desenho da caixa, é a
   coluna dos números.

   ---------- a linha inteira é o caminho ----------
   Cada linha é um link para o formulário e carrega o `data-tipo`. Quando
   a pessoa clica, o js/lib/precos.js grava aquele tipo no campo escondido
   do briefing, que já viaja no payload e vai ao Meta como propriedade do
   Lead. Ela não digita nada a mais e você passa a saber, no relatório,
   quem veio por landing e quem veio por loja.

   Sem botão próprio no fim: o pill flutuante desta página já é o botão, e
   um segundo CTA aqui embaixo repetiria o que a linha toda já faz.
   ============================================================ */
import { CONFIG } from "../config.js";
import { ponto } from "../lib/ponto.js";

export function precos(){
  const p = CONFIG.precos;
  if (!p) return "";

  /* ---------- a folha virou ETIQUETA (11/09/2026) ----------
     As três linhas viraram uma. Com um preço só, a lista de conta não faz
     mais sentido (não há o que comparar), e o objeto certo é a etiqueta
     de preço da /vitrine-digital: papel com filete de tinta sobre o
     grafite, o número em corpo de manchete e o que está incluso com o ✓
     na margem. É o único objeto de papel desta seção, e a etiqueta inteira
     é o link para o formulário, com o `data-tipo` que o js/lib/precos.js
     grava no campo escondido. */
  const i = p.item;
  const incluso = (i.incluso || []).map(t => `<li>${t}</li>`).join("");

  return `
  <section class="precos dark" id="precos">
    <div class="wrap">
      <div class="section-label pr__label reveal">${p.label}</div>
      <h2 class="pr__head reveal">${ponto(p.headline)}</h2>
      <p class="pr__intro reveal">${p.intro}</p>
      <a class="pr__etiqueta reveal" href="#contato" data-tipo="${i.tipoProjeto}" data-cta="precos" data-cta-dest="form">
        <span class="et__tipo">${i.tipo}</span>
        <span class="et__valor">${i.valor}</span>
        <span class="et__escopo">${i.escopo}</span>
        <ul class="et__incluso">${incluso}</ul>
        <span class="et__entrada">${p.entrada}</span>
        <span class="et__acao">${i.acao} <span class="arrow" aria-hidden="true">→</span></span>
      </a>
      <p class="pr__nota reveal">${p.nota}</p>
    </div>
  </section>`;
}
