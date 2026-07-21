/* MÍDIA DOS CASES — vídeo toca e captura rola só com o card visível.
   Pausa fora da tela para economizar bateria e dados. */
export function initCaseVideos(){
  const videos = document.querySelectorAll(".case__stage video");

  // Tenta tocar; se o vídeo ainda não carregou, tenta de novo quando estiver pronto
  const tryPlay = v => {
    v.muted = true;                  // garante autoplay (política dos navegadores)
    v.play().catch(() => {
      v.addEventListener("canplay", () => v.play().catch(() => {}), { once:true });
    });
  };

  if (videos.length){
    const io = new IntersectionObserver(entries => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) tryPlay(v);
        else v.pause();
      });
    }, { threshold: .25 });
    videos.forEach(v => io.observe(v));
  }

  // Capturas com rolagem automática (.phone__feed) — a animação CSS só corre
  // enquanto o card estiver na tela (classe .is-inview)
  const cards = document.querySelectorAll(".case");
  const hasFeed = document.querySelector(".phone__feed");
  if (cards.length && hasFeed){
    const io = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        target.classList.toggle("is-inview", isIntersecting);
      });
    }, { threshold: .25 });
    cards.forEach(c => io.observe(c));
  }
}
