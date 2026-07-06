/* ============================================================
   META PIXEL + CONVERSIONS API — tracking condicionado a consentimento.
   ------------------------------------------------------------
   • PIXEL_ID: troque abaixo se o dataset mudar (Events Manager).
   • O token do CAPI NUNCA fica aqui — vive na variável de ambiente
     META_CAPI_ACCESS_TOKEN, lida só pelo servidor (api/meta-capi.js).
   • Nada roda sem cookie_consent = "accepted" (js/lib/consent.js).
   Eventos: PageView (load) · ViewContent (bloco da garantia, 1x/sessão)
            · Lead (submit do formulário, browser + servidor, mesmo event_id)
   ============================================================ */
import { getConsent } from "./consent.js";

const PIXEL_ID      = "2445872572575348";   // ⬅ Pixel/Dataset ID
const CAPI_ENDPOINT = "/api/meta-capi";     // função serverless (Vercel)

const consentido = () => getConsent() === "accepted";

function getCookie(nome){
  const m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

/* fbclid da URL → persistido para compor o fbc (formato fb.1.<ts>.<fbclid>) */
function salvarFbclid(){
  try{
    const fbclid = new URLSearchParams(location.search).get("fbclid");
    if (fbclid) localStorage.setItem("meta_fbclid", `${Date.now()}.${fbclid}`);
  }catch(e){}
}
function getFbc(){
  const cookie = getCookie("_fbc");
  if (cookie) return cookie;
  try{
    const salvo = localStorage.getItem("meta_fbclid");
    if (salvo){
      const i = salvo.indexOf(".");
      return `fb.1.${salvo.slice(0, i)}.${salvo.slice(i + 1)}`;
    }
  }catch(e){}
  return "";
}

/* Loader oficial do fbevents.js (só chega aqui com consentimento) */
function carregarPixel(){
  if (window.fbq) return;
  const n = window.fbq = function(){ n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
  if (!window._fbq) window._fbq = n;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  const t = document.createElement("script");
  t.async = true; t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
}

/* ViewContent quando o bloco da garantia entra na tela — uma vez por sessão */
function observarGarantia(){
  const alvo = document.querySelector(".guarantee");
  if (!alvo) return;
  try{ if (sessionStorage.getItem("meta_vc_garantia")) return; }catch(e){}
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach(en => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      try{ sessionStorage.setItem("meta_vc_garantia", "1"); }catch(e){}
      window.fbq && window.fbq("track", "ViewContent", { content_name: "garantia-risco-zero" });
    });
  }, { threshold: 0.4 });
  obs.observe(alvo);
}

/* Chamado pelo main.js após o aceite (ou no load, se já aceito antes) */
export function initTracking(){
  if (!consentido()) return;
  salvarFbclid();
  carregarPixel();
  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
  observarGarantia();
}

/* Lead deduplicado: mesmo event_id no Pixel (browser) e no CAPI (servidor).
   Fire-and-forget — falha de tracking nunca bloqueia o formulário. */
export function trackLead(eventId, dados){
  if (!consentido()) return;
  window.fbq && window.fbq("track", "Lead", {}, { eventID: eventId });
  try{
    fetch(CAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_id: eventId,
        email: dados.email || "",
        phone: dados.phone || "",
        fbp: getCookie("_fbp"),
        fbc: getFbc(),
        event_source_url: location.href,
      }),
    }).catch(() => {});
  }catch(e){}
}
