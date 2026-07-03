/* VÍDEOS DOS CASES — toca em loop só quando o card está visível.
   Pausa fora da tela para economizar bateria e dados. */
export function initCaseVideos(){
  const videos = document.querySelectorAll(".case__stage video");
  if (!videos.length) return;

  // Tenta tocar; se o vídeo ainda não carregou, tenta de novo quando estiver pronto
  const tryPlay = v => {
    v.muted = true;                  // garante autoplay (política dos navegadores)
    v.play().catch(() => {
      v.addEventListener("canplay", () => v.play().catch(() => {}), { once:true });
    });
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(({ target: v, isIntersecting }) => {
      if (isIntersecting) tryPlay(v);
      else v.pause();
    });
  }, { threshold: .25 });

  videos.forEach(v => io.observe(v));
}
