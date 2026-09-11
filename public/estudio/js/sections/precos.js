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

  const linhas = p.items.map(i => `
    <li class="pr__linha reveal">
      <a class="pr__item" href="#contato" data-tipo="${i.tipoProjeto}" data-cta="precos" data-cta-dest="form">
        <span class="pr__tipo">${i.tipo}</span>
        <span class="pr__escopo">${i.escopo}</span>
        <span class="pr__valor">${i.valor}</span>
        <span class="pr__acao">PEDIR A MINHA <span class="arrow" aria-hidden="true">→</span></span>
      </a>
    </li>`).join("");

  return `
  <section class="precos dark" id="precos">
    <div class="wrap">
      <div class="section-label pr__label reveal">${p.label}</div>
      <h2 class="pr__head reveal">${ponto(p.headline)}</h2>
      <p class="pr__intro reveal">${p.intro}</p>
      <ul class="pr__lista">${linhas}</ul>
      <p class="pr__entrada reveal">${p.entrada}</p>
      <p class="pr__nota reveal">${p.nota}</p>
    </div>
  </section>`;
}
