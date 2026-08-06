/* ============================================================
   META PIXEL + CONVERSIONS API + MIXPANEL — tracking condicionado
   a consentimento.
   ------------------------------------------------------------
   • PIXEL_ID: troque abaixo se o dataset mudar (Events Manager).
   • O token do CAPI NUNCA fica aqui — vive na variável de ambiente
     META_CAPI_ACCESS_TOKEN, lida só pelo servidor (api/meta-capi.js).
   • Mixpanel: espelha os mesmos eventos via API HTTP (sem lib externa),
     sem nenhum dado pessoal — liga colando MIXPANEL_TOKEN em js/config.js.
   • Modelo OPT-OUT: a medição roda desde o load para todos; quem desativar
     na Política de Privacidade (cookie_consent = "declined") sai de tudo.
   • Só produção: em dev e em preview o tracking fica mudo (HOSTS_PRODUCAO).
     Para testar de propósito, abra a página com `?tracking=on`.
   • Os nomes que chegam na Mixpanel não são estes: NOME_MP traduz cada um
     para o que ele significa NESTA página. Ver o mapa mais abaixo.
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

/* Opt-out: rastreia a menos que a pessoa tenha desativado explicitamente */
const consentido = () => getConsent() !== "declined";

/* ---------- onde o tracking tem permissão de rodar ----------
   Esta guarda existia em /vitrine-digital e em /e-commerce, e NÃO existia
   aqui: esta página mandava para o mesmo PIXEL_ID e para o mesmo projeto da
   Mixpanel rodando em localhost e em qualquer preview da Vercel. Ou seja, cada
   `npm run dev` entrava na mesma conta de visitantes que decide se o anúncio
   está funcionando.

   Regra: só produção. Para testar de propósito (Test Events do Meta, conferir
   o funil na Mixpanel), abra com `?tracking=on`, que vale para a aba toda;
   `?tracking=off` desliga. É a mesma chave para os três destinos.

   AO TROCAR DE DOMÍNIO, acrescente aqui: senão o tracking some em produção, em
   silêncio, e o aviso no console é a única pista. */
const HOSTS_PRODUCAO = [
  "rafaelrazeira-estudio.vercel.app",
  "rafaelrazeira.com",       // ainda sem DNS, já deixado pronto
  "www.rafaelrazeira.com",
];

/* ---------- desligado NESTE APARELHO, para sempre ----------
   O `?tracking=off` valia só para a aba, e a guarda acima libera qualquer
   pessoa no domínio real: quem fez o site conferindo a página pelo celular
   entrava na mesma conta de visitantes que decide se o anúncio funciona.

   Agora `?tracking=off` grava em localStorage e vale para o APARELHO inteiro,
   até alguém desfazer com `?tracking=on`. A chave é a MESMA dos arquivos de
   tracking da vitrine e do e-commerce, de propósito: desligar numa página do
   site desliga em todas. Abra uma vez em cada aparelho seu. */
const CHAVE_DESLIGADO = "tracking_desligado";

const avisados = new Set();
function avisarUmaVez(msg){
  if (avisados.has(msg)) return;
  avisados.add(msg);
  console.info(msg);
}

function ambientePermitido(){
  try{
    const q = new URLSearchParams(location.search).get("tracking");
    if (q === "off"){ localStorage.setItem(CHAVE_DESLIGADO, "1"); sessionStorage.removeItem("tracking_forcado"); }
    if (q === "on"){ localStorage.removeItem(CHAVE_DESLIGADO); sessionStorage.setItem("tracking_forcado", "1"); }
    /* vence tudo, inclusive o host de produção */
    if (localStorage.getItem(CHAVE_DESLIGADO)){
      avisarUmaVez("[tracking] desligado NESTE APARELHO. Para religar, abra a página com ?tracking=on.");
      return false;
    }
    if (sessionStorage.getItem("tracking_forcado")) return true;
  }catch(e){}
  const ok = HOSTS_PRODUCAO.includes(location.hostname);
  if (!ok) avisarUmaVez("[tracking] desligado fora de produção. Para testar nesta aba, adicione ?tracking=on na URL.");
  return ok;
}

/* Portão único dos três destinos: Pixel, Conversions API e Mixpanel */
const podeRastrear = () => consentido() && ambientePermitido();

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

/* $browser/$os pelo user agent — para segmentar o funil por dispositivo.
   "Instagram" vem primeiro: o navegador interno do IG é o segmento que
   mais importa para os anúncios (UA dele também contém "Safari"/"Chrome"). */
function mpDispositivo(){
  const ua = navigator.userAgent || "";
  let os = "";
  if (/Windows/i.test(ua))            os = "Windows";
  else if (/Android/i.test(ua))       os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Macintosh/i.test(ua))     os = "Mac OS X";
  else if (/Linux/i.test(ua))         os = "Linux";
  let browser = "";
  if (/Instagram/i.test(ua))          browser = "Instagram";
  else if (/FBAN|FBAV/i.test(ua))     browser = "Facebook";
  else if (/Edg\//i.test(ua))         browser = "Microsoft Edge";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/OPR\/|Opera/i.test(ua))   browser = "Opera";
  else if (/Chrome|CriOS/i.test(ua))  browser = "Chrome";
  else if (/FxiOS|Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua))        browser = "Safari";
  return { $browser: browser, $os: os };
}
const MP_DISPOSITIVO = mpDispositivo();

/* ---------- vocabulário da Mixpanel ----------
   Esquerda: o nome que vai para a Meta. Direita: o nome que aparece no painel
   da Mixpanel. O motivo completo está em components/vitrine/tracking.ts.

   Aqui a tradução é o que conserta a pior colisão do projeto: as três páginas
   mandam para o MESMO projeto da Mixpanel, e `ViewContent` significa o bloco
   da garantia nesta página e a seção da oferta na vitrine, enquanto
   `InitiateCheckout` é o passo 1→2 do formulário aqui e o primeiro toque no
   formulário lá. Mesmo nome, dois números somados, nenhum aviso. Com nomes
   próprios, cada página passa a contar o que de fato aconteceu nela.

   AO ACRESCENTAR UM EVENTO, acrescente aqui também: o que não estiver no mapa
   passa direto com o nome de código. */
const NOME_MP = {
  PageView:         "Abriu a página",
  ViewContent:      "Viu a garantia",
  ClickCTA:         "Clicou em CTA",
  InitiateCheckout: "Passou da etapa 1",
  Lead:             "Enviou o formulário",
};

function mpTrack(evento, props){
  if (!MIXPANEL_TOKEN || !podeRastrear()) return;
  const utm = {};
  try{
    const q = new URLSearchParams(location.search);
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"]
      .forEach(k => { const v = q.get(k); if (v) utm[k] = v; });
  }catch(e){}
  const corpo = [{
    event: NOME_MP[evento] || evento,
    properties: {
      token: MIXPANEL_TOKEN,
      distinct_id: mpDistinctId(),
      /* MILISSEGUNDOS, não segundos: com segundos, dois eventos no mesmo tique
         empatam e a Mixpanel não sabe ordenar, o que quebra o funil de quem
         entra e sai rápido. Ver o comentário longo em vitrine/tracking.ts. */
      time: Date.now(),
      $insert_id: (props && props.$insert_id) || idAleatorio(),
      $current_url: location.href,
      $referrer: document.referrer || "",
      /* Esta página era a única sem `page`, e sem ele não dava para separar o
         funil dela do da vitrine nem do e-commerce: virava um resto anônimo
         que só se identificava pela AUSÊNCIA da propriedade. */
      page: "estudio",
      ...MP_DISPOSITIVO,
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

/* ---------- Conversions API ----------
   Extraído de dentro do trackLead em 06/08, quando o PageView passou a sair
   pelos dois caminhos também. Fire-and-forget: erro aqui nunca afeta a página.
   O `event_name` vai explícito; o endpoint mantém o default "Lead" para os
   consumidores que não mandam o campo. */
function enviarCapi(evento, eventId, extra){
  try{
    fetch(CAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_name: evento,
        event_id: eventId,
        fbp: getCookie("_fbp"),
        fbc: getFbc(),
        event_source_url: location.href,
        ...(extra || {}),
      }),
    }).catch(() => {});
  }catch(e){}
}

/* Chamado pelo main.js após o aceite (ou no load, se já aceito antes) */
export function initTracking(){
  if (!podeRastrear()) return;
  salvarFbclid();
  carregarPixel();
  window.fbq("init", PIXEL_ID);
  /* PageView pelos DOIS caminhos, deduplicado pelo mesmo event_id: sem isso o
     denominador (visitas) se perde onde o fbevents.js falha, enquanto o Lead
     chega pela CAPI, e a razão visita/lead fica otimista. */
  const idPageView = idAleatorio();
  window.fbq("track", "PageView", {}, { eventID: idPageView });
  enviarCapi("PageView", idPageView);
  mpTrack("PageView");
  observarGarantia();
  observarCliquesCTA();
}

/* InitiateCheckout — sinal intermediário: visitante avançou do passo 1
   para o passo 2 do formulário. Só browser; Lead continua sendo a conversão. */
export function trackInitiateCheckout(){
  if (!podeRastrear()) return;
  window.fbq && window.fbq("track", "InitiateCheckout");
  mpTrack("InitiateCheckout");
}

/* Lead deduplicado: mesmo event_id no Pixel (browser) e no CAPI (servidor).
   tipo_projeto vai como custom property no Lead (segmentação no Meta).
   Fire-and-forget — falha de tracking nunca bloqueia o formulário. */
export function trackLead(eventId, dados){
  if (!podeRastrear()) return;
  const props = dados.tipo_projeto ? { tipo_projeto: dados.tipo_projeto } : {};
  window.fbq && window.fbq("track", "Lead", props, { eventID: eventId });
  mpTrack("Lead", { $insert_id: eventId, ...props });   // mesmo id do Meta p/ cruzar os números
  enviarCapi("Lead", eventId, { email: dados.email || "", phone: dados.phone || "" });
}
