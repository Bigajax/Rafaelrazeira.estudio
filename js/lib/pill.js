/* CTA pill flutuante — esconde ao chegar no formulário (não cobrir o CTA real) */
export function initPill(){
  const pill = document.getElementById("floating-pill");
  const contato = document.getElementById("contato");
  if (!pill || !contato || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => pill.classList.toggle("is-hidden", en.isIntersecting));
  }, { threshold:.18 });
  io.observe(contato);
}
