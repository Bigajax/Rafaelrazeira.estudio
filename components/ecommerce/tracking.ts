/* ============================================================
   META PIXEL + CONVERSIONS API + MIXPANEL — funil da página
   /e-commerce. Espelha o padrão da Vitrine Digital e da landing
   principal (mesmo dataset e mesmo mp_distinct_id); os funis se
   separam no Meta por event_source_url (/e-commerce) e no Mixpanel
   pela propriedade `page`.
   • Sem valor comercial: o e-commerce não tem preço fixo, então o
     Lead é disparado SEM value/currency — nada de faturamento falso.
   • Modelo OPT-OUT: desativa só com localStorage
     cookie_consent = "declined" (botão na Política de Privacidade).
   • Eventos de seção (painel, integrações, case) por
     IntersectionObserver, 1x por sessão.
   • Fire-and-forget: falha de rede nunca afeta a página.
   ============================================================ */

const MIXPANEL_TOKEN = "56f4afa648bf59c45e417b084fdb4aa4";
const MP_URL = "https://api.mixpanel.com/track?ip=1";
const PIXEL_ID = "2445872572575348";
const CAPI_ENDPOINT = "/api/meta-capi";

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
      page: "e-commerce",
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

/* Evento genérico da página: Mixpanel + Meta (custom). Consent-gated.
   É o que os cliques de CTA, o FAQ e o formulário chamam. */
export function track(evento: string, props: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !consentido()) return;
  mpTrack(evento, props);
  fbq("trackCustom", evento, props);
}

/* Uma vez por sessão (sobrevive a re-render, morre com a aba) */
function umaVezPorSessao(chave: string, fn: () => void) {
  try { if (sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, "1"); } catch {}
  fn();
}

/* Observa uma seção e dispara o evento 1x quando ela entra na tela */
function observarSecao(id: string, evento: string, chave: string) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  const obs = new IntersectionObserver((entradas) => {
    entradas.forEach(en => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      umaVezPorSessao(chave, () => track(evento));
    });
  }, { threshold: 0.3 });
  obs.observe(alvo);
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

  // Seções-chave vistas (1x por sessão cada)
  observarSecao("painel", "ecommerce_admin_section_view", "ec_view_painel");
  observarSecao("integracoes", "ecommerce_integration_section_view", "ec_view_integracoes");
  observarSecao("case", "ecommerce_case_view", "ec_view_case");

  // Primeiro foco no formulário de diagnóstico (1x por sessão)
  document.addEventListener("focusin", (e) => {
    if (!(e.target as HTMLElement)?.closest?.("#diagnostico form")) return;
    umaVezPorSessao("ec_form_start", () => track("ecommerce_form_start"));
  });
}

/* Submit do formulário — a conversão do funil, deduplicada: mesmo
   event_id no Pixel (browser) e na Conversions API (servidor), que
   recebe o WhatsApp do formulário e o hasheia antes de enviar à Meta.
   SEM value: o e-commerce não tem preço fixo. Fire-and-forget. */
export function trackLead(whatsapp?: string) {
  if (!consentido()) return;
  const eventId = idAleatorio();
  fbq("track", "Lead", { content_name: "e-commerce" }, { eventID: eventId });
  mpTrack("ecommerce_form_submit", { $insert_id: eventId });
  mpTrack("Lead", { $insert_id: eventId, content_name: "e-commerce" });
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
      }),
    }).catch(() => {});
  } catch {}
}
