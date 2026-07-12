/* CTA pill flutuante — esconde no hero (que tem CTA próprio) e no
   formulário (não cobrir o CTA real). Aparece só no meio da página. */
export function initPill(){
  const pill = document.getElementById("floating-pill");
  const hero = document.getElementById("hero");
  const contato = document.getElementById("contato");
  if (!pill || !contato || !("IntersectionObserver" in window)) return;

  const visivel = { hero: !!hero, contato: false };
  const aplicar = () => pill.classList.toggle("is-hidden", visivel.hero || visivel.contato);
  aplicar();   // começa escondido: o load acontece com o hero na tela

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.target === hero)    visivel.hero    = en.isIntersecting;
      if (en.target === contato) visivel.contato = en.isIntersecting;
    });
    aplicar();
  }, { threshold:.18 });
  if (hero) io.observe(hero);
  io.observe(contato);
}
