/* Lockup de cartaz: cada linha da headline é redimensionada para
   preencher exatamente a largura da coluna ("TRANSFORME" maior,
   linhas longas menores, todas alinhadas). No desktop o tamanho do
   CSS vira TETO — linha curta não passa dele, linha longa encolhe. */
export function initHeroFit(){
  const head = document.querySelector(".hero__headline");
  if (!head) return;
  const lines = head.querySelectorAll(".hero__line");
  if (!lines.length) return;

  const fit = () => {
    const target = head.clientWidth;
    const cap = window.innerWidth >= 1024 ? parseFloat(getComputedStyle(head).fontSize) : Infinity;
    lines.forEach(l => {
      l.style.fontSize = "100px";                      // base de medição
      const w = l.getBoundingClientRect().width;
      if (w > 0) l.style.fontSize = `${Math.min(100 * target / w * .995, cap).toFixed(2)}px`;
    });
  };

  let raf;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fit);
  });
  // refaz a medida quando a Archivo terminar de carregar (evita medir com fallback)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  fit();
}
