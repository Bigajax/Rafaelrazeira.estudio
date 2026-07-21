/* Animação fade-up on scroll — adiciona .in aos elementos .reveal ao entrarem na tela */
export function initReveal(){
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)){
    els.forEach(el => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold:.12, rootMargin:"0px 0px -8% 0px" });
  els.forEach(el => io.observe(el));
}
