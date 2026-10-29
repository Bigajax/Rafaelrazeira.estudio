/* ============================================================
   AS ANIMAÇÕES DO DESIGN NOVO (29/10/2026)

   Só a /estudio chama este módulo (js/main.js); a /landing-page, que usa
   os mesmos módulos de seção, não. As quatro vieram da /vitrine-digital,
   a pedido do Rafael:

   1. as logos das lojas clientes logo abaixo do hero (rodando no celular);
   2. a moldura de navegador com uma loja de verdade rolando lá dentro, no
      lugar da faixa de capturas, subindo com o scroll;
   3. os passos do "como funciona" acendendo (o CSS, preso no .in do reveal);
   4. o ✓ se desenhando e o confete no envio dos dois formulários.

   Tudo é montado depois do HTML da página e nada segura o conteúdo: sem JS
   a página é a mesma, só sem os enfeites. O movimento para para quem pede
   menos movimento (css/novo.css).
   ============================================================ */

/* SÓ quem fechou (a mesma lista da /vitrine-digital, conferida no cofre em
   28/10): amostra que não virou cliente aqui seria prova falsa */
const LOJAS = [
  ["iconic", 188, "Iconic Sneakers", "https://iconicsneakers.com.br"],
  ["japa", 316, "Japa Modas", "https://www.japamodasurf.com.br"],
  ["arena", 91, "Arena Imports", "https://www.arenaimportsfloripa.com"],
  ["sneakerspot", 201, "SneakerSpot", "https://sneakerspotbr.com.br"],
  ["jk", 94, "JK Imports", ""],
  ["fulltime", 85, "Full Time Skateboards", "https://fulltimeskateboards.com.br"],
  ["mm", 54, "M&M Calçados", "https://mm-calcados.vercel.app"],
  ["fardo", 191, "Fardo Esportes", "https://fardoesportes.com.br"],
];

function logosDasLojas() {
  const alvo = document.querySelector(".hero .wrap");
  if (!alvo || document.querySelector(".logos-lojas")) return;
  /* a segunda volta só existe para o laço do celular não ter emenda: fora
     do leitor de tela e escondida no desktop */
  const item = ([k, w, nome, url], copia) => {
    const img = `<img src="/assets/lojas/${k}-branca.webp" width="${w}" height="56" alt="${copia ? "" : nome}" loading="lazy" decoding="async" />`;
    const extra = copia ? ` class="logos-copia" aria-hidden="true" tabindex="-1"` : "";
    return url
      ? `<a href="${url}" target="_blank" rel="noopener" data-cta="hero_logo_${k}" data-cta-dest="loja"${extra}>${img}</a>`
      : `<span${extra}>${img}</span>`;
  };
  const div = document.createElement("div");
  div.className = "logos-lojas";
  div.innerHTML = `<p>Lojas que já são clientes do estúdio</p><div>${[0, 1].flatMap(c => LOJAS.map(l => item(l, c))).join("")}</div>`;
  alvo.appendChild(div);
}

function molduraDaLoja() {
  const head = document.querySelector(".cases__head");
  if (!head || document.querySelector(".moldura-loja")) return;
  /* a captura curta no celular (500x3760): a inteira virava no iPhone uma
     camada animada de ~60MB e a moldura ficava cinza (armadilha do cofre,
     "A captura longa some no iPhone", 29/10) */
  const fig = document.createElement("figure");
  fig.className = "moldura-loja";
  fig.innerHTML = `
    <div class="moldura-loja__tela" role="img" aria-label="A vitrine da Iconic Sneakers, no ar, rolando dentro de um navegador">
      <div class="moldura-loja__barra">
        <span class="moldura-loja__pontos" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="moldura-loja__url">iconicsneakers.com.br</span>
        <span class="moldura-loja__ar"><i aria-hidden="true"></i> No ar</span>
      </div>
      <div class="moldura-loja__capa">
        <picture>
          <source media="(max-width: 720px)" type="image/avif" srcset="/assets/demo/iconic-vitrine-curta.avif" />
          <source media="(max-width: 720px)" type="image/webp" srcset="/assets/demo/iconic-vitrine-curta.webp" />
          <source type="image/avif" sizes="min(1040px, 90vw)" srcset="/assets/case-iconic-desk-1100.avif 1100w, /assets/case-iconic-desk.avif 1440w" />
          <source type="image/webp" sizes="min(1040px, 90vw)" srcset="/assets/case-iconic-desk-1100.webp 1100w, /assets/case-iconic-desk.webp 1440w" />
          <img class="moldura-loja__shot" src="/assets/case-iconic-desk.jpg" width="1440" height="6470" alt="" loading="lazy" decoding="async" />
        </picture>
      </div>
    </div>`;
  head.after(fig);
}

/* o ✓ que se desenha, posto no começo da mensagem de sucesso */
const CHECK = `<span class="ok-novo" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg></span>`;
const CORES = ["#0a8a55", "#e31b62", "#14181a", "#25d366", "#f4b740"];

function confete() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const chuva = document.createElement("div");
  chuva.className = "confete-novo";
  chuva.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 44; i++) {
    const redondo = i % 5 === 0;
    const larg = redondo ? 7 : 6 + Math.random() * 4;
    const p = document.createElement("i");
    Object.assign(p.style, {
      left: `${2 + Math.random() * 96}%`,
      width: `${larg}px`,
      height: `${redondo ? 7 : larg * (1.4 + Math.random() * .6)}px`,
      background: CORES[i % CORES.length],
      borderRadius: redondo ? "50%" : "1.5px",
    });
    p.style.setProperty("--cai", `${240 + Math.random() * 200}px`);
    p.style.setProperty("--balanco", `${(Math.random() - .5) * 70}px`);
    p.style.setProperty("--giro", `${(Math.random() < .5 ? -1 : 1) * (360 + Math.random() * 540)}deg`);
    p.style.setProperty("--atraso", `${180 + Math.random() * 420}ms`);
    p.style.setProperty("--dur", `${1300 + Math.random() * 600}ms`);
    chuva.appendChild(p);
  }
  document.body.appendChild(chuva);
  setTimeout(() => chuva.remove(), 3000);
}

/* dispara quando o formulário marca o envio GRAVADO: o hero-form.js põe
   .is-enviado no #hero-card e o form.js põe .show no #form-success, os dois
   só depois da resposta ok do /api/lead */
function aoEnviar(el, classe, mensagem) {
  if (!el) return;
  const msg = mensagem && el.querySelector(mensagem);
  if (msg && !msg.querySelector(".ok-novo")) msg.insertAdjacentHTML("afterbegin", CHECK);
  let foi = false;
  new MutationObserver(() => {
    if (foi || !el.classList.contains(classe)) return;
    foi = true;
    confete();
  }).observe(el, { attributes: true, attributeFilter: ["class"] });
}

export function initNovo() {
  logosDasLojas();
  molduraDaLoja();
  aoEnviar(document.getElementById("hero-card"), "is-enviado", ".hero-ok");
  aoEnviar(document.getElementById("form-success"), "show", null);
  const sucesso = document.getElementById("form-success");
  if (sucesso && !sucesso.querySelector(".ok-novo")) sucesso.insertAdjacentHTML("afterbegin", CHECK);
}
