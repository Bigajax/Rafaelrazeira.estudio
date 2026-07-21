/* ============================================================
   MIXPANEL — funil da Vitrine Digital (espelha o funil da landing
   principal: PageView → ViewContent → ClickCTA → InitiateCheckout
   → Lead), via API HTTP, sem lib externa e sem dado pessoal.
   • Mesmo token e mesmo distinct_id (localStorage) da landing em
     js/config.js — os dois funis vivem no projeto 4043044 e são
     separados pela propriedade `page` ou por $current_url.
   • Modelo OPT-OUT: desativa só com localStorage
     cookie_consent = "declined" (botão na Política de Privacidade).
   • ViewContent aqui = seção da oferta visível (1x por sessão);
     InitiateCheckout = primeiro foco no formulário (1x por sessão).
   • Fire-and-forget: falha de rede nunca afeta a página.
   ============================================================ */

const MIXPANEL_TOKEN = "56f4afa648bf59c45e417b084fdb4aa4";
const MP_URL = "https://api.mixpanel.com/track?ip=1";

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

  mpTrack("PageView");

  // ViewContent — visitante viu a oferta (1x por sessão)
  const oferta = document.getElementById("oferta");
  if (oferta) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach(en => {
        if (!en.isIntersecting) return;
        obs.disconnect();
        umaVezPorSessao("mp_vc_oferta", () => mpTrack("ViewContent", { content_name: "oferta-vitrine" }));
      });
    }, { threshold: 0.3 });
    obs.observe(oferta);
  }

  // ClickCTA — 1 evento por clique em [data-cta], com location/destination
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement)?.closest?.("[data-cta]") as HTMLElement | null;
    if (!el) return;
    mpTrack("ClickCTA", { location: el.dataset.cta, destination: el.dataset.ctaDest || "form" });
  });

  // InitiateCheckout — primeiro foco no formulário de contratação (1x por sessão)
  document.addEventListener("focusin", (e) => {
    if (!(e.target as HTMLElement)?.closest?.("#contratar")) return;
    umaVezPorSessao("mp_ic_vitrine", () => mpTrack("InitiateCheckout"));
  });
}

/* Submit do formulário — conversão do funil. Sem dado pessoal:
   só o plano escolhido vai como propriedade. */
export function trackLead(plano: string) {
  mpTrack("Lead", { $insert_id: idAleatorio(), plano });
}
