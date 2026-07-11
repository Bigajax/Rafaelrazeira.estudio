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

/* Mostra o cartão se ainda não houve escolha.
   `onAccept` roda no aceite (agora ou em visita anterior).
   Aceitar/Recusar decidem na hora; Configurar abre o painel com a
   categoria de medição e o próprio botão vira "Salvar escolha". */
export function initConsent(onAccept){
  const escolha = getConsent();
  if (escolha === "accepted"){ onAccept(); return; }
  if (escolha === "declined") return;

  const el = document.createElement("div");
  el.className = "consent";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Aviso de cookies");
  el.innerHTML = `
    <p class="consent__eyebrow"><span class="consent__dot" aria-hidden="true"></span> Cookies · LGPD</p>
    <p class="consent__text">
      Usamos cookies para medir nossos anúncios e melhorar o site.
      Sem o seu aceite, nada é rastreado.
      <a href="/privacidade">Política de Privacidade</a>
    </p>
    <div class="consent__config" hidden>
      <label class="consent__opt">
        <input type="checkbox" checked disabled />
        <span><b>Necessários</b> — funcionamento básico do site. Sempre ativos.</span>
      </label>
      <label class="consent__opt">
        <input type="checkbox" id="consent-medicao" />
        <span><b>Medição de anúncios</b> — Meta Pixel, para saber se os anúncios trazem visitas.</span>
      </label>
    </div>
    <div class="consent__actions">
      <button type="button" class="consent__btn consent__btn--ok">Aceitar</button>
      <button type="button" class="consent__btn consent__btn--no">Recusar</button>
      <button type="button" class="consent__btn consent__btn--cfg" aria-expanded="false">Configurar</button>
    </div>`;
  document.body.appendChild(el);
  // entrada suave (2 frames p/ transição pegar); sai na hora da escolha
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));

  const decidir = (valor) => {
    salvar(valor);
    el.remove();
    if (valor === "accepted") onAccept();
  };

  el.querySelector(".consent__btn--ok").addEventListener("click", () => decidir("accepted"));
  el.querySelector(".consent__btn--no").addEventListener("click", () => decidir("declined"));

  const cfg = el.querySelector(".consent__btn--cfg");
  const painel = el.querySelector(".consent__config");
  cfg.addEventListener("click", () => {
    if (painel.hidden){
      painel.hidden = false;
      cfg.textContent = "Salvar escolha";
      cfg.setAttribute("aria-expanded", "true");
      return;
    }
    decidir(el.querySelector("#consent-medicao").checked ? "accepted" : "declined");
  });
}
