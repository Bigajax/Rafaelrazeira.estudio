/* ============================================================
   META PIXEL + CONVERSIONS API + MIXPANEL — funil da Vitrine
   Digital (PageView → ViewContent → ClickCTA → InitiateCheckout
   → Lead), espelhando o padrão da landing principal.
   • Pixel: mesmo dataset da landing (js/lib/tracking.js); os funis
     se separam no Meta por event_source_url (/vitrine-digital) e
     no Mixpanel pela propriedade `page`.
   • Lead deduplicado: mesmo event_id no Pixel (browser) e na
     Conversions API (pages/api/meta-capi.js), que hasheia o
     WhatsApp do formulário em SHA-256 no servidor. O token do
     CAPI vive só na variável de ambiente da Vercel.
   • Modelo OPT-OUT: desativa só com localStorage
     cookie_consent = "declined" (botão na Política de Privacidade).
   • ViewContent = seção da oferta visível (1x por sessão);
     InitiateCheckout = primeiro foco no formulário (1x por sessão).
   • Fire-and-forget: falha de rede nunca afeta a página.
   ============================================================ */

const MIXPANEL_TOKEN = "56f4afa648bf59c45e417b084fdb4aa4";
const MP_URL = "https://api.mixpanel.com/track?ip=1";
const PIXEL_ID = "2445872572575348";
const CAPI_ENDPOINT = "/api/meta-capi";
const VALOR_OFERTA = 999;

type Fbq = (...args: unknown[]) => void;
interface FbqStub extends Fbq { callMethod?: Fbq; queue: unknown[][]; push: unknown; loaded: boolean; version: string }
declare global {
  interface Window { fbq?: FbqStub; _fbq?: unknown }
}

function getCookie(nome: string) {
  const m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : "";
}

/* fbclid da URL → persistido para compor o fbc (formato fb.1.<ts>.<fbclid>) */
function salvarFbclid() {
  try {
    const fbclid = new URLSearchParams(location.search).get("fbclid");
    if (fbclid) localStorage.setItem("meta_fbclid", `${Date.now()}.${fbclid}`);
  } catch {}
}
function getFbc() {
  const cookie = getCookie("_fbc");
  if (cookie) return cookie;
  try {
    const salvo = localStorage.getItem("meta_fbclid");
    if (salvo) {
      const i = salvo.indexOf(".");
      return `fb.1.${salvo.slice(0, i)}.${salvo.slice(i + 1)}`;
    }
  } catch {}
  return "";
}

/* Loader oficial do fbevents.js (só chega aqui com consentimento) */
function carregarPixel() {
  if (window.fbq) return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args); else n.queue.push(args);
  } as FbqStub;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
}

const fbq: Fbq = (...args) => { try { window.fbq?.(...args); } catch {} };

const consentido = () => {
  try { return localStorage.getItem("cookie_consent") !== "declined"; } catch { return true; }
};

const idAleatorio = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function mpDistinctId() {
  try {
    let id = localStorage.getItem("mp_distinct_id");
    if (!id) { id = idAleatorio(); localStorage.setItem("mp_distinct_id", id); }
    return id;
  } catch { return "anon"; }
}

/* $browser/$os pelo user agent — "Instagram" primeiro: o navegador
   interno do IG é o segmento que mais importa para os anúncios. */
function mpDispositivo() {
  const ua = navigator.userAgent || "";
  let os = "";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Macintosh/i.test(ua)) os = "Mac OS X";
  else if (/Linux/i.test(ua)) os = "Linux";
  let browser = "";
  if (/Instagram/i.test(ua)) browser = "Instagram";
  else if (/FBAN|FBAV/i.test(ua)) browser = "Facebook";
  else if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome|CriOS/i.test(ua)) browser = "Chrome";
  else if (/FxiOS|Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua)) browser = "Safari";
  return { $browser: browser, $os: os };
}

export function mpTrack(evento: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined" || !MIXPANEL_TOKEN || !consentido()) return;
  const utm: Record<string, string> = {};
  try {
    const q = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
      .forEach(k => { const v = q.get(k); if (v) utm[k] = v; });
  } catch {}
  const corpo = [{
    event: evento,
    properties: {
      token: MIXPANEL_TOKEN,
      distinct_id: mpDistinctId(),
      time: Math.floor(Date.now() / 1000),
      $insert_id: (props && (props.$insert_id as string)) || idAleatorio(),
      $current_url: location.href,
      $referrer: document.referrer || "",
      page: "vitrine-digital",
      ...mpDispositivo(),
      ...utm,
      ...props,
    },
  }];
  try {
    // form-urlencoded (não JSON): evita preflight de CORS, exigência da API no browser
    fetch(MP_URL, {
      method: "POST",
      keepalive: true,
      body: new URLSearchParams({ data: JSON.stringify(corpo) }),
    }).catch(() => {});
  } catch {}
}

/* Uma vez por sessão (sobrevive a re-render, morre com a aba) */
function umaVezPorSessao(chave: string, fn: () => void) {
  try { if (sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, "1"); } catch {}
  fn();
}

let iniciado = false;

/* Chamado no mount da página (componente <Analytics />). */
export function initTracking() {
  if (iniciado || !consentido()) return;   // guarda contra StrictMode/remontagem
  iniciado = true;

  salvarFbclid();
  carregarPixel();
  fbq("init", PIXEL_ID);
  fbq("track", "PageView");
  mpTrack("PageView");

  // ViewContent — visitante viu a oferta (1x por sessão)
  const oferta = document.getElementById("oferta");
  if (oferta) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach(en => {
        if (!en.isIntersecting) return;
        obs.disconnect();
        umaVezPorSessao("mp_vc_oferta", () => {
          fbq("track", "ViewContent", { content_name: "oferta-vitrine", content_category: "vitrine-digital", value: VALOR_OFERTA, currency: "BRL" });
          mpTrack("ViewContent", { content_name: "oferta-vitrine" });
        });
      });
    }, { threshold: 0.3 });
    obs.observe(oferta);
  }

  // ClickCTA — 1 evento por clique em [data-cta], com location/destination
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement)?.closest?.("[data-cta]") as HTMLElement | null;
    if (!el) return;
    const dados = { location: el.dataset.cta, destination: el.dataset.ctaDest || "form" };
    fbq("trackCustom", "ClickCTA", dados);
    mpTrack("ClickCTA", dados);
  });

  // InitiateCheckout — primeiro foco no formulário de contratação (1x por sessão)
  document.addEventListener("focusin", (e) => {
    if (!(e.target as HTMLElement)?.closest?.("#contratar")) return;
    umaVezPorSessao("mp_ic_vitrine", () => {
      fbq("track", "InitiateCheckout", { content_name: "vitrine-digital", value: VALOR_OFERTA, currency: "BRL" });
      mpTrack("InitiateCheckout");
    });
  });
}

/* Submit do formulário — a conversão do funil, deduplicada: mesmo
   event_id no Pixel (browser) e na Conversions API (servidor), que
   recebe o WhatsApp do formulário e o hasheia antes de enviar à Meta.
   Fire-and-forget: falha de tracking nunca bloqueia o formulário. */
export function trackLead(plano: string, whatsapp?: string) {
  if (!consentido()) return;
  const eventId = idAleatorio();
  fbq("track", "Lead", { plano, value: VALOR_OFERTA, currency: "BRL" }, { eventID: eventId });
  mpTrack("Lead", { $insert_id: eventId, plano });   // mesmo id do Meta p/ cruzar os números
  try {
    fetch(CAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_id: eventId,
        phone: whatsapp || "",
        fbp: getCookie("_fbp"),
        fbc: getFbc(),
        event_source_url: location.href,
        value: VALOR_OFERTA,
        currency: "BRL",
        plano,
      }),
    }).catch(() => {});
  } catch {}
}
