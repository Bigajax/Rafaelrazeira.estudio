/* ============================================================
   MAIN — ponto de entrada.
   Monta as seções na ordem e liga as interações.
   Para reordenar a página, mude a ordem no array `page` abaixo.
   Cada seção mora em js/sections/<nome>.js
   ============================================================ */
import { header }       from "./sections/header.js";
import { hero }         from "./sections/hero.js";
import { marquee }      from "./sections/marquee.js";
import { about }        from "./sections/about.js";
import { brandband }    from "./sections/brandband.js";
import { process }      from "./sections/process.js";
import { included }     from "./sections/included.js";
import { cases }        from "./sections/cases.js";
import { values }       from "./sections/values.js";
import { founder }      from "./sections/founder.js";
import { audience }     from "./sections/audience.js";
import { testimonials } from "./sections/testimonials.js";
import { contact }      from "./sections/contact.js";
import { footer }       from "./sections/footer.js";
import { pill }         from "./sections/pill.js";

import { initReveal }     from "./lib/reveal.js";
import { initHeroFit }    from "./lib/herofit.js";
import { initForm }       from "./lib/form.js";
import { initPill }       from "./lib/pill.js";
import { initCaseVideos } from "./lib/videos.js";
import { initTracking }   from "./lib/tracking.js";

// Ordem das seções DENTRO do <main> (não inclui header/footer/pill)
// (o cue "conheça mais" agora vive dentro do hero — js/sections/hero.js)
const page = [ hero, marquee, about, brandband, process, included, cases, audience, values, founder, testimonials, contact, marquee ];

const app = document.getElementById("app");
app.innerHTML =
  header() +
  `<main id="top">${ page.map(s => s()).join("") }</main>` +
  footer() +
  pill();

// Interações (rodam depois do HTML montado)
initReveal();
initHeroFit();
initForm();
initPill();
initCaseVideos();
initTracking();   // opt-out: medição roda no load; desativa-se em /privacidade
