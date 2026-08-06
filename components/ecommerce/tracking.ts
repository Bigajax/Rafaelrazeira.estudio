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

/* Mesma guarda da vitrine, e pelo mesmo motivo: esta página usa o MESMO
   PIXEL_ID, então rodar ela em dev ou em preview suja o dataset da campanha.
   Só produção; `?tracking=on` libera a aba para testar de propósito.
   Ver o comentário longo em components/vitrine/tracking.ts, inclusive o
   motivo de a lista ser de hosts e não de variável de ambiente. */
const HOSTS_PRODUCAO = [
  "rafaelrazeira-estudio.vercel.app",
  "rafaelrazeira.com",
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

/* A chave de casamento mais forte que sobra num formulário sem e-mail: o
   MESMO id que a Mixpanel usa como distinct_id vira o external_id do Pixel e
   da Conversions API, então os dois lados falam do mesmo visitante. O Pixel
   hasheia sozinho no browser e o servidor hasheia o valor cru, então os dois
   precisam aplicar a MESMA normalização, senão os hashes divergem e a
   amarração simplesmente não acontece, sem erro nenhum aparecer.
   Importa mais aqui do que em qualquer outra página do estúdio: o tráfego
   chega pelo navegador interno do Instagram, onde o fbevents.js falha com
   frequência e o fbp/fbc muitas vezes é tudo o que existe. */
const externalId = () => mpDistinctId().toLowerCase();

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

/* ---------- vocabulário da Mixpanel ----------
   Esquerda: o nome que vai para a Meta. Direita: o nome que aparece no painel
   da Mixpanel. O motivo completo está em components/vitrine/tracking.ts; aqui
   pesa mais o segundo: esta página fala `ecommerce_hero_cta` e a vitrine fala
   `ClickCTA` para a mesma ação, então no painel a mesma pergunta ("quanta gente
   clicou em algum CTA?") tinha duas respostas com nomes diferentes.

   `ecommerce_hero_cta` e `ecommerce_secondary_cta` caem os DOIS em "Clicou em
   CTA" de propósito: a distinção primário/secundário já vive na propriedade
   `origem`, e como dois eventos separados ela só atrapalhava a contagem.

   Do lado da Meta nada muda: os nomes de custom event continuam os mesmos e o
   histórico de lá fica inteiro.

   AO ACRESCENTAR UM EVENTO, acrescente aqui também: o que não estiver no mapa
   passa direto com o nome de código. */
const NOME_MP: Record<string, string> = {
  PageView:                           "Abriu a página",
  Scroll:                             "Rolou",
  Saida:                              "Saiu da página",
  ecommerce_hero_cta:                 "Clicou em CTA",
  ecommerce_secondary_cta:            "Clicou em CTA",
  ecommerce_admin_section_view:       "Viu o painel",
  ecommerce_integration_section_view: "Viu as integrações",
  ecommerce_case_view:                "Viu a prova",
  ecommerce_faq_open:                 "Abriu uma dúvida",
  ecommerce_form_start:               "Tocou no formulário",
  ecommerce_form_step_complete:       "Passou da etapa 1",
  ecommerce_whatsapp_click:           "Abriu o WhatsApp",
  /* NÃO se chama "Enviou o formulário", de propósito. Desde que o Lead passou
     a disparar em todo CTA de conversão, ele conta cinco botões de intenção
     mais um envio de verdade. A vitrine manteve o nome antigo depois da mesma
     mudança e isso já custou uma leitura errada: os "12 leads" do Ads Manager
     de 04/08 eram 12 cliques, e o Rafael conferiu que não havia conversa
     nenhuma no WhatsApp. Quem foi até o fim se distingue pela propriedade
     `cta_position: "form"`. */
  Lead:                               "Sinalizou interesse",
  /* O nome que o Lead deixou vago, e agora ele é verdade: só o envio dispara. */
  Contact:                            "Enviou o formulário",
};

export function mpTrack(evento: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined" || !MIXPANEL_TOKEN || !podeRastrear()) return;
  const utm: Record<string, string> = {};
  try {
    const q = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
      .forEach(k => { const v = q.get(k); if (v) utm[k] = v; });
  } catch {}
  const corpo = [{
    event: NOME_MP[evento] || evento,
    properties: {
      token: MIXPANEL_TOKEN,
      distinct_id: mpDistinctId(),
      /* MILISSEGUNDOS, não segundos: com segundos, dois eventos no mesmo tique
         empatam e a Mixpanel não sabe ordenar, o que quebra o funil de quem
         entra e sai rápido. Ver o comentário longo em vitrine/tracking.ts. */
      time: Date.now(),
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
  if (typeof window === "undefined" || !podeRastrear()) return;
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

/* ============================================================
   ROLAGEM E SAÍDA — diagnóstico, não conversão.

   Vão SÓ para a Mixpanel: na Meta virariam evento custom que suja o dataset
   e não otimiza nada. Sem eles, quem abre e fecha vira um PageView solto e
   não dá para saber se leu a manchete, rolou metade ou fechou em dois
   segundos. Na primeira campanha da vitrine, 20 dos 26 visitantes reais
   foram exatamente isso, e foi este par de eventos que mostrou que o gargalo
   era o topo da página, não a oferta.

   `Saida` é o mais útil dos dois porque também conta a história de quem não
   rolou nada: sai com tempo de permanência e profundidade máxima.
   ============================================================ */
function medirLeitura() {
  const inicio = Date.now();
  const marcos = [25, 50, 75, 100];
  let maior = 0;
  let agendado = false;
  const segundos = () => Math.round((Date.now() - inicio) / 1000);

  const medir = () => {
    agendado = false;
    const rolavel = document.documentElement.scrollHeight - window.innerHeight;
    /* página menor que a tela: não há o que rolar, e dividir por zero daria
       Infinity. Conta como 100% porque a pessoa já viu tudo. */
    const pct = rolavel <= 0 ? 100 : Math.round((window.scrollY / rolavel) * 100);
    for (const m of marcos) {
      if (pct >= m && maior < m) {
        maior = m;
        mpTrack("Scroll", { profundidade: m, segundos: segundos() });
      }
    }
  };
  /* passivo e agendado no próximo quadro: rolagem dispara dezenas de vezes por
     segundo e medir em cada uma travaria a página no celular */
  addEventListener("scroll", () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(medir);
  }, { passive: true });
  medir();

  /* Qual campo do formulário a pessoa tocou por último. Vai como propriedade
     do Saida em vez de virar evento próprio: é diagnóstico, e o Saida já é o
     retrato de onde a pessoa desistiu. Depende do atributo `name` nos campos,
     que existe só por causa disto: o formulário não faz submit nativo. */
  let ultimoCampo = "";
  addEventListener("focusin", (e) => {
    const alvo = e.target as HTMLInputElement | null;
    if (alvo?.closest?.("#diagnostico") && alvo.name) ultimoCampo = alvo.name;
  });

  let saiu = false;
  const aoSair = () => {
    if (saiu) return;
    saiu = true;
    mpTrack("Saida", {
      segundos: segundos(),
      profundidade_max: maior,
      rolou: maior > 0,
      ...(ultimoCampo ? { form_ultimo_campo: ultimoCampo } : {}),
    });
  };
  /* visibilitychange é o único confiável no celular: no iOS o `unload` muitas
     vezes não roda quando a pessoa troca de app ou fecha a aba. O mpTrack usa
     fetch com keepalive, que sobrevive à página morrendo. */
  addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") aoSair(); });
  addEventListener("pagehide", aoSair);
}

/* ---------- de qual botão veio o Lead ----------
   Decisão do Rafael (05/08), a mesma que ele já tinha tomado na vitrine:
   densidade de sinal vale mais que pureza de funil. Com verba pequena e um
   formulário de duas etapas, o Lead só no envio deixaria a Meta dias sem um
   único evento para otimizar.

   Entram os CTAs que levam ao ponto de conversão. Ficam de fora, de propósito:
   o "VER O QUE ESTÁ INCLUSO" do hero (rola para #incluso, é navegação) e os
   botões que abrem o site de um cliente. Ao ler os números, lembre que a maior
   parte destes Leads é INTENÇÃO: quem foi até o fim tem cta_position "form". */
const POSICAO_LEAD: Record<string, string> = {
  hero: "hero",
  header: "header",
  painel: "painel",
  prova: "prova",
  barra_fixa: "barra_fixa",
};

let iniciado = false;

/* Chamado no mount da página (componente <Analytics />). */
export function initTracking() {
  if (iniciado || !podeRastrear()) return;   // guarda contra StrictMode/remontagem
  iniciado = true;

  salvarFbclid();
  carregarPixel();
  /* Configuração automática DESLIGADA, e o motivo é específico desta página:
     todos os cinco CTAs são âncora para #diagnostico, e o fbevents.js trata a
     mudança de hash como navegação de SPA e manda um PageView extra. Medido:
     três cliques geram um PageView a mais por sessão. Parece pouco, mas é
     justamente a conta que o Rafael faz ao ler a campanha (cliques no anúncio
     contra visitas à página, visitas contra leads), e um numerador inflado ali
     leva a conclusão errada sobre o anúncio.
     O que se perde junto é o Automatic Advanced Matching, que garimpa e-mail e
     telefone dos formulários por conta própria. Aqui ele é redundante: o
     external_id, o primeiro nome e o WhatsApp já vão de propósito pela
     Conversions API, que é casamento mais forte e explícito. */
  fbq("set", "autoConfig", false, PIXEL_ID);
  /* external_id no init: o pixel passa a mandar essa chave em todo evento do
     browser, e não só no Lead, o que melhora o casamento de PageView também */
  fbq("init", PIXEL_ID, { external_id: externalId() });
  fbq("track", "PageView");
  mpTrack("PageView");

  medirLeitura();

  // Seções-chave vistas (1x por sessão cada)
  observarSecao("painel", "ecommerce_admin_section_view", "ec_view_painel");
  observarSecao("integracoes", "ecommerce_integration_section_view", "ec_view_integracoes");
  observarSecao("case", "ecommerce_case_view", "ec_view_case");

  /* Um ouvinte delegado no documento em vez de onClick em cada botão: os CTAs
     nascem e morrem com o estado do React (a barra fixa some, o formulário
     troca de etapa) e um listener por elemento se perderia nessas trocas. */
  document.addEventListener("click", (e) => {
    const alvo = (e.target as HTMLElement)?.closest?.("[data-cta]") as HTMLElement | null;
    const posicao = alvo && POSICAO_LEAD[alvo.dataset.cta || ""];
    if (posicao) trackLead({ ctaPosition: posicao });
  });

  // Primeiro foco no formulário de diagnóstico (1x por sessão)
  document.addEventListener("focusin", (e) => {
    if (!(e.target as HTMLElement)?.closest?.("#diagnostico form")) return;
    umaVezPorSessao("ec_form_start", () => track("ecommerce_form_start"));
  });
}

/* A conversão da campanha, deduplicada: mesmo event_id no Pixel (browser) e na
   Conversions API (servidor). Os dois caminhos existem porque o tráfego chega
   pelo navegador interno do Instagram, onde o fbevents.js falha com frequência
   e o beacon do browser simplesmente não sai.

   `cta_position` diz de qual botão veio, e é o que separa intenção (hero,
   header, painel, prova, barra_fixa) de contato de verdade ("form").

   SEM value: o e-commerce não tem preço fixo, e faturamento inventado
   estraga qualquer leitura de ROAS depois. Fire-and-forget: falha de rede
   nunca pode segurar o clique da pessoa. */
function enviarCapi(evento: string, eventId: string, extra: Record<string, unknown> = {}) {
  try {
    fetch(CAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        /* mandar o campo explicitamente. O endpoint tem default "Lead" para os
           consumidores antigos que não mandam nada, e é justamente por isso que
           esse default não pode mudar: `js/lib/tracking.js` depende dele. */
        event_name: evento,
        event_id: eventId,
        /* o servidor hasheia; o first_name ele reduz ao primeiro nome,
           minúsculo e sem pontuação, antes do SHA-256 */
        external_id: externalId(),
        fbp: getCookie("_fbp"),
        fbc: getFbc(),
        content_name: "e-commerce",
        event_source_url: location.href,
        ...extra,
      }),
    }).catch(() => {});
  } catch {}
}

export function trackLead({ ctaPosition, nome, whatsapp }: { ctaPosition: string; nome?: string; whatsapp?: string }) {
  if (!podeRastrear()) return;
  const eventId = idAleatorio();
  const dados = { content_name: "e-commerce", cta_position: ctaPosition };
  fbq("track", "Lead", dados, { eventID: eventId });
  /* Um evento só. O `ecommerce_form_submit` que existia aqui disparava na
     linha de cima do `Lead`, com o mesmo id e o mesmo significado: contava a
     mesma pessoa duas vezes em qualquer soma que juntasse os dois. */
  mpTrack("Lead", { $insert_id: eventId, ...dados });
  enviarCapi("Lead", eventId, { cta_position: ctaPosition, first_name: nome || "", phone: whatsapp || "" });
}

/* ---------- Contact: o envio de verdade ----------
   Decisão do Rafael (05/08): a campanha otimiza por AQUI desde o começo, e a
   conversão de intenção fica criada como plano B se a entrega travar.

   Por que um evento padrão em vez de um `ecommerce_*` próprio: só os nomes da
   allowlist do endpoint (Lead, Contact, ViewContent, InitiateCheckout,
   PageView) têm caminho de servidor. Um custom só existiria no navegador, e o
   tráfego chega pelo navegador interno do Instagram, onde o fbevents.js falha
   com frequência: a campanha seria otimizada justamente sem as conversões que
   a Conversions API existe para recuperar.

   Por que "Contact" e não outro: é literalmente o que aconteceu, a pessoa
   abriu conversa. E, sendo padrão, a Meta traz o que aprendeu com outros
   anunciantes para dentro da otimização, o que um custom nunca dá.

   O envio dispara os DOIS, e de propósito: quem envia também demonstrou
   interesse, então precisa continuar dentro da conversão de intenção. Na Meta
   são eventos distintos, não há contagem dobrada dentro de uma conversão. */
export function trackContact({ nome, whatsapp }: { nome?: string; whatsapp?: string }) {
  if (!podeRastrear()) return;
  const eventId = idAleatorio();
  const dados = { content_name: "e-commerce" };
  fbq("track", "Contact", dados, { eventID: eventId });
  mpTrack("Contact", { $insert_id: eventId, ...dados });
  enviarCapi("Contact", eventId, { first_name: nome || "", phone: whatsapp || "" });
}
