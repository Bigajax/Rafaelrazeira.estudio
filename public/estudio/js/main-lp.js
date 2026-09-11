/* ============================================================
   MAIN da /landing-page — ponto de entrada da segunda página.

   Ela compartilha TUDO com a /estudio: o mesmo CSS, os mesmos módulos de
   seção, o mesmo js/lib. O que muda são duas coisas, e só duas:

     1. O CONTEÚDO, que sai de CONFIG_LP em js/config.js (a escolha entre
        os dois conjuntos é feita lá, pelo caminho da URL).
     2. A ORDEM E O ELENCO de seções, que é este arquivo.

   Fora da lista: o que está incluso, os valores, os depoimentos, os
   projetos fundadores e o letreiro do nome. Nenhum deles fala com quem
   já anuncia, e página de tráfego pago paga cada seção em atenção.

   A ordem tem uma lógica de leitura:
     hero      pega quem clicou e já pede a prévia
     tira      corta e muda de assunto
     vazamento cria o problema e prova que eu entendo dele
     processo  mostra que o começo é o que ela já podia ter feito
     projetos  a prova
     preços    o número, e só depois de ela já querer
     quem faz  quem responde do outro lado
     contato   o formulário completo, para quem não preencheu lá em cima
   ============================================================ */
import { header }   from "./sections/header.js";
import { hero }     from "./sections/hero.js";
import { marquee }  from "./sections/marquee.js";
import { audience } from "./sections/audience.js";
import { process }  from "./sections/process.js";
import { cases }    from "./sections/cases.js";
import { precos }   from "./sections/precos.js";
import { about }    from "./sections/about.js";
import { contact }  from "./sections/contact.js";
import { footer }   from "./sections/footer.js";
import { pill }     from "./sections/pill.js";

import { initReveal }     from "./lib/reveal.js";
import { initHeroFit }    from "./lib/herofit.js";
import { initForm }       from "./lib/form.js";
import { initHeroForm }   from "./lib/hero-form.js";
import { initPill }       from "./lib/pill.js";
import { initCaseVideos } from "./lib/videos.js";
import { initPrecos }     from "./lib/precos.js";
import { initTracking }   from "./lib/tracking.js";
import { CONFIG }         from "./config.js";

const page = [hero, marquee, audience, process, cases, precos, about, contact, marquee];

/* A raiz ganha a classe `lp`: é o único gancho de CSS que separa as duas
   páginas, e serve para o que o config não alcança (o botão do cabeçalho
   no celular, ver header.css). Tudo o mais continua vindo do CONFIG_LP. */
/* ---------- o anúncio chega com #contato (11/09/2026) ----------
   A URL dos anúncios apontava para o formulário do fim, e o navegador
   pulava a primeira dobra inteira; com o scroll-behavior:smooth do
   base.css o salto virava uma rolagem de sete telas que o Rafael viu
   "travando" no navegador do Instagram. O fragmento é apagado AQUI,
   antes de o DOM ser montado: sem elemento e sem fragmento, a página
   abre no topo. Só os fragmentos de formulário; um link para #precos
   compartilhado de propósito continua funcionando. O mesmo vale para a
   vitrine em components/vitrine/SemAncoraDoAnuncio.tsx. */
if (/^#(contato|hero-card|hero-form|form)$/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);

document.documentElement.classList.add("lp", CONFIG.lang);
const app = document.getElementById("app");
app.innerHTML =
  header() +
  `<main id="top">${page.map(s => s()).join("")}</main>` +
  footer() +
  pill();

initReveal();
initHeroFit();
initForm();
initHeroForm();
initPill();
initCaseVideos();
initPrecos();
initTracking();
