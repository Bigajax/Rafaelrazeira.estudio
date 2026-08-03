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

/* ---------- onde o tracking tem permissão de rodar ----------
   Sem esta guarda, `npm run dev` e todo deploy de preview mandam PageView,
   ClickCTA e Lead para o MESMO dataset da campanha: o número que decide se o
   anúncio está funcionando passa a incluir você mexendo na página.

   Regra: só produção. Em preview e em localhost o tracking fica mudo, e o
   console avisa, para ninguém achar que quebrou.

   Para testar de propósito (Test Events do Meta, conferir o funil na
   Mixpanel), abra a página com `?tracking=on`: a permissão vale para a aba
   toda, e `?tracking=off` desliga. É a mesma chave para os três destinos,
   então não existe caso de ligar um e esquecer o outro.

   Lista de hosts em vez de variável de ambiente: ler
   `process.env.NEXT_PUBLIC_VERCEL_ENV` no escopo do módulo quebra o prerender
   do build (o macro de env do Next explode em __NEXT_PRIVATE_MINIMIZE_MACRO).
   Cada preview da Vercel tem subdomínio próprio, então cai fora sozinho.
   AO TROCAR DE DOMÍNIO, acrescente aqui: senão o tracking some em produção,
   em silêncio. O aviso no console é a única pista. */
const HOSTS_PRODUCAO = [
  "rafaelrazeira-estudio.vercel.app",
  "rafaelrazeira.com",       // ainda sem DNS, já deixado pronto
  "www.rafaelrazeira.com",
];

let avisou = false;
function ambientePermitido() {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(location.search).get("tracking");
    if (q === "on") sessionStorage.setItem("tracking_forcado", "1");
    if (q === "off") sessionStorage.removeItem("tracking_forcado");
    if (sessionStorage.getItem("tracking_forcado")) return true;
  } catch {}
  const ok = HOSTS_PRODUCAO.includes(location.hostname);
  if (!ok && !avisou) {
    avisou = true;
    console.info("[tracking] desligado fora de produção. Para testar nesta aba, adicione ?tracking=on na URL.");
  }
  return ok;
}

/* Portão único dos três destinos: Pixel, Conversions API e Mixpanel */
const podeRastrear = () => consentido() && ambientePermitido();

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

/* ---------- código da visita ----------
   Oito caracteres, e curto de propósito: ele viaja na mensagem do WhatsApp e
   alguém vai copiar na mão ao registrar a venda em /api/venda-fechada. UUID
   de 36 caracteres ninguém copia certo.

   É o MESMO valor mandado como external_id no Pixel e na Conversions API. Só
   por isso a Meta consegue amarrar a venda de quinta à visita de terça, e aí
   você descobre qual criativo traz comprador em vez de qual traz clique.
   Se este valor divergir entre os dois lados, nada quebra e nada avisa: a
   amarração simplesmente não acontece.

   Alfabeto sem I, O, 0 e 1, que são os que se confundem ao ler de um celular.
   32 símbolos e 8 posições dão 1,1 trilhão de combinações, e 256/32 é exato,
   então o resto do byte não enviesa o sorteio.
   Separado do mp_distinct_id: identidade do Mixpanel e chave de casamento da
   Meta são coisas diferentes, e juntar deixaria uma refém da outra. */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function codigoVisita() {
  try {
    let c = localStorage.getItem("visita_ref");
    if (!c) {
      c = Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(byte => ALFABETO[byte % 32]).join("");
      localStorage.setItem("visita_ref", c);
    }
    return c;
  } catch { return ""; }
}

/* Vazio quando o tracking está desligado: sem consentimento não se carimba
   identificador na mensagem de ninguém. A venda ainda casa pelo telefone. */
export const refDaVisita = () => (podeRastrear() ? codigoVisita() : "");

/* O que vai para a Meta é SEMPRE em minúsculas, nos dois lados.
   Motivo: não está documentado com firmeza se o pixel normaliza o external_id
   antes de hashear. Se ele normalizar e o servidor não, os hashes divergem e a
   amarração venda-visita não acontece, sem erro nenhum aparecer em lugar
   nenhum. Mandando já em minúscula, normalizar vira operação nula e os dois
   caminhos batem nas duas hipóteses.
   O código continua exibido em maiúsculas na mensagem, que é mais fácil de
   ler e de copiar de um celular; /api/venda-fechada faz o mesmo toLowerCase
   antes do hash, então tanto faz como o Rafael digitar. */
const externalId = () => codigoVisita().toLowerCase();

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
  if (typeof window === "undefined" || !MIXPANEL_TOKEN || !podeRastrear()) return;
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

/* ---------- Conversions API ----------
   Todo evento de conversão sai pelos dois caminhos com o MESMO event_id:
   o Pixel no browser e a CAPI no servidor. A Meta descarta a cópia, e o
   que chega é o que o navegador entregou OU o que o servidor entregou
   quando o navegador falhou. Isso importa aqui porque a maior parte do
   tráfego vem do navegador interno do Instagram, onde bloqueio de rastreio
   e falha do fbevents.js são rotina.
   Fire-and-forget: erro de CAPI nunca afeta a página. */
type CapiExtra = Record<string, string | number | undefined>;
function enviarCapi(evento: string, eventId: string, extra: CapiExtra = {}) {
  try {
    fetch(CAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_name: evento,
        event_id: eventId,
        external_id: externalId(),
        fbp: getCookie("_fbp"),
        fbc: getFbc(),
        event_source_url: location.href,
        ...extra,
      }),
    }).catch(() => {});
  } catch {}
}

/* Dispara Pixel + CAPI + Mixpanel amarrados pelo mesmo id */
function conversao(evento: string, dadosPixel: Record<string, unknown>, extraCapi: CapiExtra = {}, propsMp: Record<string, unknown> = {}) {
  const eventId = idAleatorio();
  fbq("track", evento, dadosPixel, { eventID: eventId });
  enviarCapi(evento, eventId, extraCapi);
  mpTrack(evento, { $insert_id: eventId, ...propsMp });
}

/* data-cta → cta_position do Lead. Quem não está aqui NÃO dispara Lead:
   `nav` e `hero_projetos` só rolam a página para outra seção e `case` abre o
   site de um cliente. Só `final_falar` foge do vocabulário do brief, que não
   tinha slot para o "FALAR COM RAFAEL" do CTA final (o `flutuante` é a
   pílula, e `duvidas` é o "AINDA TENHO DÚVIDAS" do card de preço). */
/* o único caminho que é contratação de verdade, e não intenção */
const POSICAO_FORMULARIO = "form";
const POSICAO_LEAD: Record<string, string> = {
  hero: "hero",
  como_funciona: "steps",
  oferta_entrada: "pricing_card",
  final: "final",
  sticky_mobile: "sticky",
  oferta_whats: "duvidas",
  final_whats: "final_falar",
  pill: "flutuante",
};

let iniciado = false;

/* Chamado no mount da página (componente <Analytics />). */
export function initTracking() {
  if (iniciado || !podeRastrear()) return;   // guarda contra StrictMode/remontagem
  iniciado = true;

  salvarFbclid();
  carregarPixel();
  /* external_id no init: o pixel passa a mandar essa chave em todo evento do
     browser e hasheia sozinho. É o que segura o casamento de um formulário
     sem e-mail e sem telefone, e é o mesmo código que vai na mensagem do
     WhatsApp, para a venda registrada depois amarrar nesta visita. */
  fbq("init", PIXEL_ID, { external_id: externalId() });
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
          conversao("ViewContent",
            { content_name: "oferta-vitrine", content_category: "vitrine-digital", value: VALOR_OFERTA, currency: "BRL" },
            { content_name: "oferta-vitrine", content_category: "vitrine-digital", value: VALOR_OFERTA, currency: "BRL" },
            { content_name: "oferta-vitrine" });
        });
      });
    }, { threshold: 0.3 });
    obs.observe(oferta);
  }

  // ClickCTA — 1 evento por clique em [data-cta], com location/destination.
  // Evento custom: serve para ler a página, não para a Meta otimizar.
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement)?.closest?.("[data-cta]") as HTMLElement | null;
    if (!el) return;
    const dados = { location: el.dataset.cta, destination: el.dataset.ctaDest || "form" };
    fbq("trackCustom", "ClickCTA", dados);
    mpTrack("ClickCTA", dados);

    /* Lead nos CTAs de conversão. Um evento só cobre todo caminho até o
       WhatsApp: com verba baixa, densidade de sinal vale mais que pureza de
       funil, e a qualidade se mede na conversa, não no painel.
       Ouvinte delegado em vez de onClick nos oito botões: um caminho só,
       impossível de esquecer quando nascer um CTA novo.
       Não segura nem atrasa o clique: o listener é passivo e a CAPI vai por
       fetch com keepalive, que sobrevive à navegação. */
    const posicao = POSICAO_LEAD[el.dataset.cta || ""];
    if (posicao) trackLead({ ctaPosition: posicao });
  });

  // InitiateCheckout — primeiro foco no formulário de contratação (1x por sessão)
  document.addEventListener("focusin", (e) => {
    if (!(e.target as HTMLElement)?.closest?.("#contratar")) return;
    umaVezPorSessao("mp_ic_vitrine", () => {
      conversao("InitiateCheckout",
        { content_name: "vitrine-digital", value: VALOR_OFERTA, currency: "BRL" },
        { content_name: "vitrine-digital", value: VALOR_OFERTA, currency: "BRL" });
    });
  });
}

/* ---------- Lead: a conversão da campanha ----------
   Um único evento cobre todos os caminhos até o WhatsApp, com `cta_position`
   dizendo de onde veio. Deduplicado: o MESMO event_id vai no Pixel (browser)
   e na Conversions API (servidor), então a Meta conta uma vez só e ainda
   recebe o evento quando o navegador falha, que é o caso comum no navegador
   interno do Instagram.

   O formulário não pede telefone (a mensagem sai do WhatsApp da própria
   pessoa), então as chaves de casamento que sobram são external_id, fbp, fbc
   e o primeiro nome, e é por isso que o nome chega até aqui. O servidor
   hasheia; nada em texto puro sai do browser.

   Fire-and-forget e sem preventDefault: nunca bloqueia nem atrasa a abertura
   do WhatsApp. O keepalive do fetch cobre a navegação. */
export function trackLead({ ctaPosition, plano, nome }: { ctaPosition: string; plano?: string; nome?: string }) {
  if (!podeRastrear()) return;
  const eventId = idAleatorio();
  const dados: Record<string, unknown> = { content_name: "vitrine-digital", cta_position: ctaPosition, value: VALOR_OFERTA, currency: "BRL" };
  if (plano) dados.plano = plano;
  fbq("track", "Lead", dados, { eventID: eventId });
  /* A Mixpanel só recebe o Lead do formulário. Os disparos de clique existem
     para dar densidade de sinal à campanha da Meta; na Mixpanel eles quebravam
     o funil, porque o Lead passava a acontecer ANTES do ViewContent e do
     InitiateCheckout e uma sessão só gerava três Leads. Lá o clique já é
     contado por ClickCTA com `location`, então o Lead extra não acrescentava
     nada: era só ruído. Aqui Lead continua significando formulário enviado.
     Mesmo id do Meta, para cruzar os números dos dois painéis. */
  if (ctaPosition === POSICAO_FORMULARIO) mpTrack("Lead", { $insert_id: eventId, cta_position: ctaPosition, plano });
  enviarCapi("Lead", eventId, {
    first_name: nome || "",
    content_name: "vitrine-digital",
    cta_position: ctaPosition,
    value: VALOR_OFERTA,
    currency: "BRL",
    plano,
  });
}
