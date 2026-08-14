/* ============================================================
   CTA pill flutuante — some quando o CTA de verdade está na tela.

   Ele já sumia no bloco de contato. Passou a sumir também sobre o CARTÃO
   DO HERO, e o motivo apareceu na /landing-page: desde que o cartão virou
   formulário, o botão de envio e o pill ficam a poucos pixels um do
   outro na primeira tela do celular, os dois em rosa cheio, os dois
   dizendo quase a mesma coisa. Duas chamadas idênticas coladas não
   somam, viram pergunta.

   A regra ficou: o pill é para o MEIO da página, onde não há botão à
   vista. Onde existe um CTA real, ele sai da frente.

   Observa os dois alvos com o mesmo observador e mantém uma contagem de
   quantos estão visíveis: com dois `toggle` independentes, sair de um
   alvo reexibia o pill mesmo com o outro ainda na tela.
   ============================================================ */
export function initPill(){
  const pill = document.getElementById("floating-pill");
  if (!pill || !("IntersectionObserver" in window)) return;

  const alvos = ["contato", "hero-card"]
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (!alvos.length) return;

  const visiveis = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) visiveis.add(en.target);
      else visiveis.delete(en.target);
    });
    pill.classList.toggle("is-hidden", visiveis.size > 0);
  }, { threshold: .18 });

  alvos.forEach(a => io.observe(a));
}
