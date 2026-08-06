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

/* ---------- desligado NESTE APARELHO, para sempre ----------
   O `?tracking=off` valia só para a aba: fechou o navegador, voltou a medir.
   Como a guarda de produção libera qualquer pessoa no domínio real, o Rafael
   conferindo a página pelo celular entrava na mesma conta de visitantes que
   decide se o anúncio está funcionando. Na campanha de agosto, que teve 16
   visitas, duas conferidas dele já seriam 12% de ruído, e antes desta sprint
   elas ainda disparavam Lead.

   Agora `?tracking=off` grava em localStorage e vale para o APARELHO inteiro,
   em todas as páginas do site, até alguém desfazer com `?tracking=on`. Abra
   uma vez em cada aparelho seu. A chave é a mesma nos três arquivos de
   tracking, então desligar numa página desliga em todas. */
const CHAVE_DESLIGADO = "tracking_desligado";

const avisados = new Set<string>();
function avisarUmaVez(msg: string) {
  if (avisados.has(msg)) return;
  avisados.add(msg);
  console.info(msg);
}

function ambientePermitido() {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(location.search).get("tracking");
    if (q === "off") { localStorage.setItem(CHAVE_DESLIGADO, "1"); sessionStorage.removeItem("tracking_forcado"); }
    if (q === "on") { localStorage.removeItem(CHAVE_DESLIGADO); sessionStorage.setItem("tracking_forcado", "1"); }
    /* vence tudo, inclusive o host de produção: é o aparelho de quem faz o
       site, e ele não pode aparecer no funil nem por engano */
    if (localStorage.getItem(CHAVE_DESLIGADO)) {
      avisarUmaVez("[tracking] desligado NESTE APARELHO. Para religar, abra a página com ?tracking=on.");
      return false;
    }
    if (sessionStorage.getItem("tracking_forcado")) return true;
  } catch {}
  const ok = HOSTS_PRODUCAO.includes(location.hostname);
  if (!ok) avisarUmaVez("[tracking] desligado fora de produção. Para testar nesta aba, adicione ?tracking=on na URL.");
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
   da Mixpanel. O motivo completo está em components/vitrine/tracking.ts.

   `ecommerce_hero_cta` e `ecommerce_secondary_cta` foram aposentados nesta
   sprint. Eram dois nomes de custom event para a mesma ação, cada CTA
   carregava um `onClick` próprio para dispará-los, e nenhum dos dois batia
   com o `ClickCTA` que a vitrine e a landing já usavam: a mesma pergunta
   ("quanta gente clicou em algum CTA?") tinha três respostas com nomes
   diferentes no mesmo projeto. Agora as três páginas falam `ClickCTA`, com
   `location` e `destination`, disparado por um ouvinte delegado só.
   Na Meta os dois nomes antigos param de receber eventos a partir de 06/08;
   o histórico deles continua lá, congelado.

   AO ACRESCENTAR UM EVENTO, acrescente aqui também: o que não estiver no mapa
   passa direto com o nome de código. */
const NOME_MP: Record<string, string> = {
  PageView:                           "Abriu a página",
  Scroll:                             "Rolou",
  Saida:                              "Saiu da página",
  ClickCTA:                           "Clicou em CTA",
  ecommerce_admin_section_view:       "Viu o painel",
  ecommerce_integration_section_view: "Viu as integrações",
  ecommerce_case_view:                "Viu a prova",
  ecommerce_faq_open:                 "Abriu uma dúvida",
  ecommerce_form_start:               "Tocou no formulário",
  ecommerce_form_step_complete:       "Passou da etapa 1",
  /* Mesmo nome da vitrine desde 06/08, e agora com o mesmo significado nas
     duas: o momento em que o WhatsApp abre. Antes esta página dizia "Abriu o
     WhatsApp" e a vitrine dizia "Abriu WhatsApp", que eram dois eventos
     distintos no painel, com gatilhos distintos, impossíveis de somar. */
  ecommerce_whatsapp_click:           "Abriu o WhatsApp",
  /* `Lead` NÃO aparece aqui, e não é esquecimento: ele não vai mais para a
     Mixpanel. Desde que saiu dos cinco CTAs de âncora, o Lead desta página
     dispara exatamente junto do Contact, no mesmo submit. Mandar os dois
     criaria duas linhas no painel para uma ação só, que é justamente o
     problema que "Sinalizou interesse" tinha. Na Meta os dois continuam: são
     nomes de conversão diferentes, a campanha otimiza por Contact e o Lead
     fica de reserva se a entrega travar. */
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

/* ---------- handoff para o WhatsApp ----------
   Portado da vitrine em 06/08, e o motivo é o mesmo: `window.open`, que era o
   que esta página usava no envio do formulário, é tratado como pop-up pelo
   navegador interno do Instagram, que é de onde vem o tráfego da campanha. Ou
   ele bloqueia calado, ou abre uma aba fantasma que aparece em branco e morre.
   A pessoa via "tudo certo", nada acontecia, e do lado de cá ficava um Contact
   disparado sem conversa nenhuma chegando: exatamente o sintoma que a gente
   estava tentando explicar nos números.

   `location.href` na mesma aba entrega o link ao app do WhatsApp. Os 300ms
   existem só para o Pixel terminar de sair: o fbevents.js manda o evento por
   requisição de imagem, que a navegação cancela se acontecer no mesmo quadro.
   Mixpanel e CAPI já vão por fetch com keepalive e sobrevivem sozinhos.
   Sem tracking (localhost, preview, aparelho desligado) não há o que esperar. */
const ESPERA_TRACKING = 300;
let navegando = false;

/* A trava contra toque duplo tem que soltar quando a pessoa VOLTA, senão ela
   vira o próximo bug: quem abre o WhatsApp, desiste de enviar e volta encontra
   o botão de socorro morto. No celular a volta quase nunca recarrega nada
   (bfcache no Android, troca de app no iOS), então o estado do módulo
   sobrevive inteiro. Os dois eventos cobrem os dois caminhos de volta. */
let ouvindoVolta = false;
function soltarNaVolta() {
  if (ouvindoVolta) return;
  ouvindoVolta = true;
  const soltar = () => { navegando = false; };
  addEventListener("pageshow", soltar);
  addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") soltar(); });
}

export function irParaWhatsapp(href: string) {
  if (navegando) return;              // toque duplo não agenda dois redirects
  navegando = true;
  soltarNaVolta();
  const ir = () => { location.href = href; };
  if (!podeRastrear()) { ir(); return; }
  setTimeout(ir, ESPERA_TRACKING);
}

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
  /* PageView pelos DOIS caminhos, deduplicado pelo mesmo event_id, desde
     06/08. Antes ele saía só do navegador, e no navegador interno do Instagram
     o fbevents.js falha com frequência: o PageView se perdia, o Lead e o
     Contact chegavam pela CAPI, e a razão visita/lead saía otimista justamente
     no segmento que mais precisa ser lido. Denominador e numerador agora têm a
     mesma chance de chegar. */
  const idPageView = idAleatorio();
  fbq("track", "PageView", {}, { eventID: idPageView });
  enviarCapi("PageView", idPageView);
  mpTrack("PageView");

  medirLeitura();

  // Seções-chave vistas (1x por sessão cada)
  observarSecao("painel", "ecommerce_admin_section_view", "ec_view_painel");
  observarSecao("integracoes", "ecommerce_integration_section_view", "ec_view_integracoes");
  observarSecao("case", "ecommerce_case_view", "ec_view_case");

  /* ---------- ClickCTA ----------
     Este ouvinte disparava `Lead` até 06/08, um por CTA de âncora. Eram cinco
     botões que não saem da página, e o resultado é conhecido: 12 "leads" no
     Ads Manager de 04/08 sem uma conversa no WhatsApp. Cada Lead falso ensina
     a Meta a procurar mais gente que clica e não fala. Agora o clique vira o
     que ele sempre foi, um evento custom de leitura de página, e o Lead só
     acontece no contato de verdade, como na vitrine.

     Um ouvinte delegado em vez de onClick em cada botão: os CTAs nascem e
     morrem com o estado do React (a barra fixa some, o formulário troca de
     etapa) e um listener por elemento se perderia nessas trocas. É também o
     que garante 1 evento por clique quando um CTA novo nascer: basta o
     `data-cta`, sem ninguém precisar lembrar de plugar o track. */
  document.addEventListener("click", (e) => {
    const alvo = (e.target as HTMLElement)?.closest?.("[data-cta]") as HTMLElement | null;
    if (!alvo) return;
    track("ClickCTA", { location: alvo.dataset.cta || "", destination: alvo.dataset.ctaDest || "form" });
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
  /* Sem mpTrack: ver a nota no NOME_MP. Desde que o Lead saiu dos CTAs de
     âncora ele dispara no mesmo submit que o Contact, e o painel não precisa
     de duas linhas para uma ação só. Na Meta os dois seguem valendo. */
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
