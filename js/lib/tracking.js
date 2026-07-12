/* ============================================================
   META PIXEL + CONVERSIONS API + MIXPANEL — tracking condicionado
   a consentimento.
   ------------------------------------------------------------
   • PIXEL_ID: troque abaixo se o dataset mudar (Events Manager).
   • O token do CAPI NUNCA fica aqui — vive na variável de ambiente
     META_CAPI_ACCESS_TOKEN, lida só pelo servidor (api/meta-capi.js).
   • Mixpanel: espelha os mesmos eventos via API HTTP (sem lib externa),
     sem nenhum dado pessoal — liga colando MIXPANEL_TOKEN em js/config.js.
   • Nada roda sem cookie_consent = "accepted" (js/lib/consent.js).
   Eventos: PageView (load) · ViewContent (bloco da garantia, 1x/sessão)
            · ClickCTA (custom — 1 evento por clique em elementos [data-cta],
              com location/destination; pill vira "sticky_mobile" no mobile)
            · InitiateCheckout (passo 1 → 2 do formulário)
            · Lead (submit do formulário, browser + servidor, mesmo event_id)
   ============================================================ */
import { getConsent } from "./consent.js";
import { MIXPANEL_TOKEN } from "../config.js";

const PIXEL_ID      = "2445872572575348";   // ⬅ Pixel/Dataset ID
const CAPI_ENDPOINT = "/api/meta-capi";     // função serverless (Vercel)
const MP_URL        = "https://api.mixpanel.com/track?ip=1"; // residência UE: api-eu.mixpanel.com

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

/* ---------- Mixpanel — funil próprio via API HTTP ----------
   Sem dado pessoal: o distinct_id é um UUID aleatório do aparelho.
   UTMs da URL vão junto para segmentar o funil por campanha/criativo.
   Fire-and-forget: falha de rede nunca afeta a página. */
const idAleatorio = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function mpDistinctId(){
  try{
    let id = localStorage.getItem("mp_distinct_id");
    if (!id){ id = idAleatorio(); localStorage.setItem("mp_distinct_id", id); }
    return id;
  }catch(e){ return "anon"; }
}

function mpTrack(evento, props){
  if (!MIXPANEL_TOKEN || !consentido()) return;
  const utm = {};
  try{
    const q = new URLSearchParams(location.search);
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]
      .forEach(k => { const v = q.get(k); if (v) utm[k] = v; });
  }catch(e){}
  const corpo = [{
    event: evento,
    properties: {
      token: MIXPANEL_TOKEN,
      distinct_id: mpDistinctId(),
      time: Math.floor(Date.now() / 1000),
      $insert_id: (props && props.$insert_id) || idAleatorio(),
      $current_url: location.href,
      $referrer: document.referrer || "",
      ...utm,
      ...props,
    },
  }];
  try{
    // form-urlencoded (não JSON): evita preflight de CORS, exigência da API no browser
    fetch(MP_URL, {
      method: "POST",
      keepalive: true,
      body: new URLSearchParams({ data: JSON.stringify(corpo) }),
    }).catch(() => {});
  }catch(e){}
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
      mpTrack("ViewContent", { content_name: "garantia-risco-zero" });
    });
  }, { threshold: 0.4 });
  obs.observe(alvo);
}

/* ClickCTA — separa "clicou no anúncio por curiosidade" de "demonstrou
   interesse na página". Cada CTA marca data-cta="<location>" e
   data-cta-dest="<form|whatsapp>"; um único listener delegado garante
   exatamente 1 evento por clique. Só roda após o consentimento. */
function observarCliquesCTA(){
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest("[data-cta]");
    if (!el) return;
    let location = el.dataset.cta;
    if (location === "pill" && window.innerWidth < 1024) location = "sticky_mobile";
    const dados = { location, destination: el.dataset.ctaDest || "form" };
    window.fbq && window.fbq("trackCustom", "ClickCTA", dados);
    mpTrack("ClickCTA", dados);
  });
}

/* Chamado pelo main.js após o aceite (ou no load, se já aceito antes) */
export function initTracking(){
  if (!consentido()) return;
  salvarFbclid();
  carregarPixel();
  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
  mpTrack("PageView");
  observarGarantia();
  observarCliquesCTA();
}

/* InitiateCheckout — sinal intermediário: visitante avançou do passo 1
   para o passo 2 do formulário. Só browser; Lead continua sendo a conversão. */
export function trackInitiateCheckout(){
  if (!consentido()) return;
  window.fbq && window.fbq("track", "InitiateCheckout");
  mpTrack("InitiateCheckout");
}

/* Lead deduplicado: mesmo event_id no Pixel (browser) e no CAPI (servidor).
   Fire-and-forget — falha de tracking nunca bloqueia o formulário. */
export function trackLead(eventId, dados){
  if (!consentido()) return;
  window.fbq && window.fbq("track", "Lead", {}, { eventID: eventId });
  mpTrack("Lead", { $insert_id: eventId });   // mesmo id do Meta p/ cruzar os números
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
