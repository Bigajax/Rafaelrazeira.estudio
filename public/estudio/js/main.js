/* ============================================================
   MAIN — ponto de entrada.
   Monta as seções na ordem e liga as interações.
   Para reordenar a página, mude a ordem no array `page` abaixo.
   Cada seção mora em js/sections/<nome>.js
   ============================================================ */
import { header }       from "./sections/header.js";
import { hero }         from "./sections/hero.js";
import { process }      from "./sections/process.js";
import { cases }        from "./sections/cases.js";
import { founder }      from "./sections/founder.js";
import { testimonials } from "./sections/testimonials.js";
import { precos }       from "./sections/precos.js";
import { contact }      from "./sections/contact.js";
import { footer }       from "./sections/footer.js";
import { pill }         from "./sections/pill.js";

import { initLoader }     from "./lib/loader.js";
import { initReveal }     from "./lib/reveal.js";
import { initForm }       from "./lib/form.js";
import { initHeroForm }   from "./lib/hero-form.js";
import { initPill }       from "./lib/pill.js";
import { initCaseVideos } from "./lib/videos.js";
import { initTracking }   from "./lib/tracking.js";
import { initPrecos }     from "./lib/precos.js";

// Ordem das seções DENTRO do <main> (não inclui header/footer/pill)
// (o cue "conheça mais" agora vive dentro do hero: js/sections/hero.js)
/* 20/10/2026: os "projetos fundadores" ("estou selecionando os primeiros
   cases") saíram, porque o estúdio passou de 100 projetos no ar; o config
   deles fica. Os preços entraram depois dos cases: a pessoa vê as lojas
   antes de ver o número. */
/* 29/10/2026, a página mais curta (pedido do Rafael, "ta muito longo"): eram
   10.372px no desktop e 10.877px no celular. Saíram as duas faixas que
   rodavam, o "quem somos" (o quem faz, com a foto, diz o mesmo), o nome
   gigante, o "incluso" (os cartões de preço já listam), o "para quem é" e
   as palavras grandes. A ordem é a da /vitrine-digital: existe? (as lojas)
   como funciona? quem faz? quanto custa? E o convite. Os módulos e o config
   das seções que saíram ficam: a /landing-page usa vários deles. */
const page = [ hero, cases, process, founder, precos, testimonials, contact ];
document.body.classList.add("pg-estudio");

const app = document.getElementById("app");
app.innerHTML =
  header() +
  `<main id="top">${ page.map(s => s()).join("") }</main>` +
  footer() +
  pill();
/* o "Conheça mais" do hero apontava para o #about, que saiu em 29/10: agora
   leva às lojas no ar, a seção seguinte. O hero.js fica igual (a LP tem #about). */
app.querySelector('.hero__cue a[href="#about"]')?.setAttribute("href", "#cases");

// Interações (rodam depois do HTML montado)
initLoader();   // tela de carregamento — sai em pixel dissolve quando tudo pintou
initReveal();
/* o herofit (uma linha do título por largura de coluna) saiu em 29/10: era o
   cartaz em caixa alta do papel e tinta. No design novo o título corre
   como frase. A /landing-page segue chamando o dela, em main-lp.js. */
initForm();
initHeroForm();   // captura curta no cartão da 1ª dobra (grava na mesma tabela)
initPill();
initCaseVideos();
initPrecos();     // a etiqueta clicada marca o tipo de projeto no passo 2
initTracking();   // opt-out: medição roda no load; desativa-se em /privacidade
