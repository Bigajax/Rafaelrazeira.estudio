/* Tela de carregamento: segura o overlay até a página estar pronta
   (window load) — com tempo mínimo p/ a marca aparecer e teto de
   segurança p/ conexões lentas — e sai "pixelando": uma grade de
   quadrados pretos que somem de baixo para cima, com jitter.
   O overlay em si é HTML estático no index.html (#loader). */

const MIN_SHOW = 700;    // ms mínimos com a logo na tela (evita "flash")
const MAX_WAIT = 7000;   // teto: sai mesmo se algum asset demorar
const ROW_STEP = 55;     // ms entre uma fileira e a de cima
const JITTER   = 110;    // aleatoriedade por quadrado (o "pixelado")

export function initLoader(){
  const loader = document.getElementById("loader");
  if (!loader) return;

  const t0 = performance.now();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let leaving = false;
  const leave = () => {
    if (leaving) return;   // load + teto de segurança podem chamar 2x
    leaving = true;
    // Grade de "pixels": ~9 colunas no celular, quadrados de ~120px no desktop
    const cell = Math.min(Math.max(window.innerWidth / 9, 44), 120);
    const cols = Math.ceil(window.innerWidth  / cell);
    const rows = Math.ceil(window.innerHeight / cell);

    if (!reduced){
      const grid = document.createElement("div");
      grid.className = "loader__grid";
      grid.setAttribute("aria-hidden", "true");
      grid.style.gridTemplateColumns = `repeat(${cols},1fr)`;
      grid.style.gridTemplateRows = `repeat(${rows},1fr)`;
      let maxDelay = 0;
      for (let r = 0; r < rows; r++){
        for (let c = 0; c < cols; c++){
          const s = document.createElement("span");
          const delay = (rows - 1 - r) * ROW_STEP + Math.random() * JITTER;
          s.style.transitionDelay = `${delay.toFixed(0)}ms`;
          maxDelay = Math.max(maxDelay, delay);
          grid.appendChild(s);
        }
      }
      loader.appendChild(grid);
      // dois frames: garante que a grade pintou antes de o fundo sumir
      requestAnimationFrame(() => requestAnimationFrame(() => {
        loader.classList.add("leaving");
        setTimeout(done, maxDelay + 350);
      }));
    } else {
      loader.classList.add("leaving");
      setTimeout(done, 450);
    }
  };

  const done = () => {
    loader.remove();
    document.body.classList.remove("loading");
  };

  const exitAfterMin = () => {
    const elapsed = performance.now() - t0;
    setTimeout(leave, Math.max(0, MIN_SHOW - elapsed));
  };

  if (document.readyState === "complete") exitAfterMin();
  else window.addEventListener("load", exitAfterMin, { once: true });
  setTimeout(leave, MAX_WAIT);   // segurança: nunca prende o visitante
}
