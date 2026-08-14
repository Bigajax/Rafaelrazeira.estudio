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
     hero      pega quem clicou e já pede a análise
     tira      corta e muda de assunto
     vazamento cria o problema e prova que eu entendo dele
     processo  mostra que o começo é o que ela já podia ter feito
     projetos  a prova
     quem faz  quem responde do outro lado
     contato   o formulário completo, para quem não preencheu lá em cima
   ============================================================ */
import { header }   from "./sections/header.js";
import { hero }     from "./sections/hero.js";
import { marquee }  from "./sections/marquee.js";
import { audience } from "./sections/audience.js";
import { process }  from "./sections/process.js";
import { cases }    from "./sections/cases.js";
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
import { initTracking }   from "./lib/tracking.js";

const page = [hero, marquee, audience, process, cases, about, contact, marquee];

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
initTracking();
