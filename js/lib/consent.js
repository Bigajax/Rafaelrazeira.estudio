/* Consentimento de cookies (LGPD) — banner simples com aceitar/recusar.
   A escolha fica em localStorage("cookie_consent") = "accepted" | "declined".
   NADA de rastreamento roda sem "accepted" — o gate é usado por js/lib/tracking.js. */

const KEY = "cookie_consent";

export function getConsent(){
  try{ return localStorage.getItem(KEY); }catch(e){ return null; }
}

function salvar(valor){
  try{ localStorage.setItem(KEY, valor); }catch(e){ /* navegação privada: segue sem persistir */ }
}

/* Mostra o banner se ainda não houve escolha.
   `onAccept` roda no aceite (agora ou em visita anterior). */
export function initConsent(onAccept){
  const escolha = getConsent();
  if (escolha === "accepted"){ onAccept(); return; }
  if (escolha === "declined") return;

  const el = document.createElement("div");
  el.className = "consent";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Aviso de cookies");
  el.innerHTML = `
    <p class="consent__text">
      Usamos cookies para medir nossos anúncios e melhorar o site.
      Sem o seu aceite, nada é rastreado.
      <a href="/privacidade">Política de Privacidade</a>
    </p>
    <div class="consent__actions">
      <button type="button" class="consent__btn consent__btn--ok">Aceitar</button>
      <button type="button" class="consent__btn consent__btn--no">Recusar</button>
    </div>`;
  document.body.appendChild(el);

  el.querySelector(".consent__btn--ok").addEventListener("click", () => {
    salvar("accepted");
    el.remove();
    onAccept();
  });
  el.querySelector(".consent__btn--no").addEventListener("click", () => {
    salvar("declined");
    el.remove();
  });
}
