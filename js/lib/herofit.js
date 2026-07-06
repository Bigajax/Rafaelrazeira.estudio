/* Lockup de cartaz no mobile/tablet: cada linha da headline é
   redimensionada para preencher exatamente a largura da coluna
   ("TENHA" maior, "UMA PÁGINA" e "QUE VENDE." menores, todas alinhadas).
   No desktop (≥1024px) a headline volta ao tamanho definido no CSS. */
export function initHeroFit(){
  const head = document.querySelector(".hero__headline");
  if (!head) return;
  const lines = head.querySelectorAll(".hero__line");
  if (!lines.length) return;

  const fit = () => {
    if (window.innerWidth >= 1024){
      lines.forEach(l => { l.style.fontSize = ""; });
      return;
    }
    const target = head.clientWidth;
    lines.forEach(l => {
      l.style.fontSize = "100px";                      // base de medição
      const w = l.getBoundingClientRect().width;
      if (w > 0) l.style.fontSize = `${(100 * target / w * .995).toFixed(2)}px`;
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
