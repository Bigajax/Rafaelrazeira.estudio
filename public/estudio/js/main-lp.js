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
import { faq }      from "./sections/faq.js";
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

/* a FAQ (12/09) entra depois do "quem faz" e antes do formulário: é onde a objeção aparece */
const page = [hero, marquee, audience, process, cases, precos, about, faq, contact, marquee];

/* A raiz ganha a classe `lp`: é o único gancho de CSS que separa as duas
   páginas, e serve para o que o config não alcança (o botão do cabeçalho
   no celular, ver header.css). Tudo o mais continua vindo do CONFIG_LP. */
/* ---------- a página do anúncio abre no topo (11 e 12/09/2026) ----------
   O navegador embutido da Meta rola a página até o formulário do fim
   depois da carga (muito provavelmente o preenchimento automático dele,
   que procura nome e telefone), e o scroll-behavior:smooth do base.css
   transforma isso numa rolagem de sete telas que parece travar. A URL dos
   anúncios NÃO tem #contato (conferido em 12/09); o fragmento que aparece
   na URL dos leads é do clique da própria pessoa nos botões da página.
   A regra: até 3,5s depois do load, rolagem de mais de meia tela sem
   touchstart/wheel/teclado antes não é da pessoa, e a página volta ao
   topo com a rolagem suave desligada. Fragmento de formulário na URL é
   apagado antes de o DOM ser montado e força o topo na carga. Mesma
   lógica em components/vitrine/SemAncoraDoAnuncio.tsx. */
const ANCORA_DE_FORMULARIO = /^#(contato|hero-card|hero-form|form)$/;
const temHash = ANCORA_DE_FORMULARIO.test(location.hash);
const limparHash = () => { if (ANCORA_DE_FORMULARIO.test(location.hash)) history.replaceState(null, "", location.pathname + location.search); };
if (temHash) limparHash();
try { history.scrollRestoration = "manual"; } catch {}
/* com outro fragmento na URL (#precos compartilhado), a guarda nem liga: o salto é o pedido */
if (!location.hash || temHash) {
  let tocou = false;
  const marcar = () => { tocou = true; };
  addEventListener("touchstart", marcar, { passive: true, once: true });
  addEventListener("wheel", marcar, { passive: true, once: true });
  addEventListener("keydown", marcar, { once: true });
  /* o clique também é da pessoa: o CTA do topo rola até o formulário nos primeiros segundos */
  addEventListener("pointerdown", marcar, { passive: true, once: true, capture: true });
  const topo = () => {
    if (tocou) return;
    limparHash();
    document.documentElement.style.scrollBehavior = "auto";
    scrollTo(0, 0);
    setTimeout(() => { document.documentElement.style.scrollBehavior = ""; }, 50);
  };
  let ate = Date.now() + 8000;
  addEventListener("load", () => { ate = Date.now() + 3500; if (temHash) { topo(); setTimeout(topo, 250); setTimeout(topo, 900); } });
  addEventListener("scroll", () => { if (tocou || Date.now() > ate) return; if (scrollY > innerHeight * 0.5) topo(); }, { passive: true });
}

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
