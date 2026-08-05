/* ============================================================
   META PIXEL + CONVERSIONS API + MIXPANEL — funil da Vitrine
   Digital (PageView → ViewContent → ClickCTA → InitiateCheckout
   → Lead/AbriuWhatsApp), espelhando o padrão da landing principal.
   • Lead = clique que abre o wa.me, e nada mais. A regra vive num
     lugar só, no ouvinte de cliques, lendo `data-cta-dest`.
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

/* ---------- vocabulário da Mixpanel ----------
   Esquerda: o nome que vai para a Meta. Direita: o nome que aparece no painel
   da Mixpanel. Existem separados por dois motivos.

   O primeiro é que `ViewContent` e `InitiateCheckout` são nomes do catálogo da
   Meta, e lá eles são fixos: renomear na origem desliga a otimização da
   campanha. Mas eles não descrevem nada. Quem abre a Mixpanel daqui a três
   meses lê "InitiateCheckout: 2" e entende que duas pessoas começaram uma
   compra, quando duas pessoas tocaram num campo de formulário.

   O segundo é que o MESMO nome já significa coisas diferentes conforme a
   página, e as três mandam para o mesmo projeto: `ViewContent` aqui é a seção
   da oferta, e em js/lib/tracking.js é o bloco da garantia. Traduzindo na
   saída, cada página nomeia o que de fato aconteceu nela e o funil deixa de
   depender de alguém lembrar de filtrar por `page`.

   AO ACRESCENTAR UM EVENTO, acrescente aqui também: o que não estiver no mapa
   passa direto com o nome de código, e aí volta a aparecer em inglês no meio
   dos outros. */
const NOME_MP: Record<string, string> = {
  PageView:         "Abriu a página",
  Scroll:           "Rolou",
  ViewContent:      "Viu a oferta",
  ClickCTA:         "Clicou em CTA",
  InitiateCheckout: "Tocou no formulário",
  AbriuWhatsApp:    "Abriu WhatsApp",
  Lead:             "Enviou o formulário",
  Saida:            "Saiu da página",
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
      /* MILISSEGUNDOS, não segundos. Com segundos, quem abria e fechava dentro
         do mesmo tique gerava PageView e Saida com o MESMO `time`, e a Mixpanel
         não tinha como saber qual veio primeiro: numa amostra de 32 pessoas,
         12 tinham eventos empatados e 4 apareciam com a saída ANTES da entrada.
         Funil que começa em PageView descarta essa gente. É o comportamento
         típico de quem vem do Audience Network, ou seja, justamente a fatia que
         mais precisa ser medida. A API do /track aceita as duas unidades e
         distingue pela ordem de grandeza. */
      time: Date.now(),
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

/* ---------- quem dispara Lead ----------
   REGRA ÚNICA: Lead sai no clique que ABRE O WHATSAPP, e em nenhum outro
   lugar. Não em PageView, não em scroll, não em "viu a oferta", não em
   botão que só rola a página. A campanha otimiza por este evento: cada
   Lead falso ensina a Meta a procurar mais gente que não conversa.

   A decisão passou a ser lida do próprio `data-cta-dest="whatsapp"` em vez
   de uma lista de nomes. A lista era o vazamento: `oferta_entrada` (o "JÁ
   DECIDI: RESERVAR POR R$500", que só rola até o formulário) e
   `final_reserva` (o mesmo atalho no fim, que rola até a oferta) estavam
   nela e disparavam Lead sem ninguém sair da página. Entre 2 e 5/08 isso
   deu 16 "leads" na Meta para 1 conversa real. Amarrando no destino, um
   CTA novo entra no lugar certo sozinho e a lista não tem como envelhecer
   errado de novo.

   `reabrir_whats` fica FORA de propósito, mesmo sendo destino WhatsApp: é o
   botão de reabrir a mensagem depois de enviar o formulário, então quem clica
   nele já disparou o Lead do formulário segundos antes, e contaria a mesma
   pessoa duas vezes. Ele existe só como ClickCTA, para dar para medir quantas
   pessoas precisam do socorro quando o handoff falha. */
const DESTINO_WHATSAPP = "whatsapp";
const FORA_DO_LEAD = new Set(["reabrir_whats"]);

/* o único caminho que é contratação de verdade, e não intenção */
const POSICAO_FORMULARIO = "form";

/* apelido de leitura do `cta_position` no painel da Meta; o que não estiver
   aqui vai com o próprio nome do data-cta, que já é legível */
const POSICAO_LEAD: Record<string, string> = {
  hero: "hero",
  como_funciona: "steps",
  final: "final",
  sticky_mobile: "sticky",
  oferta_ver: "ver_no_whats",
  pill: "flutuante",
};

/* ---------- handoff para o WhatsApp ----------
   `window.location.href`, nunca `window.open`. O navegador interno do
   Instagram, que é de onde vem quase todo o tráfego desta campanha, trata
   `open` como pop-up: ou bloqueia calado, ou abre uma aba fantasma que
   aparece em branco e morre. A pessoa acha que quebrou e volta. Trocando
   por navegação na mesma aba, o Android entrega o link ao app do WhatsApp
   e a mensagem abre pronta.

   Os 300ms existem só para o Pixel terminar de sair. O fbevents.js manda o
   evento por requisição de imagem, que a navegação cancela se acontecer no
   mesmo quadro: era Lead disparado e Lead não entregue. Mixpanel e CAPI já
   vão por fetch com keepalive e sobrevivem sozinhos.
   Sem tracking (localhost, preview, consentimento negado) não há o que
   esperar: navega na hora. */
const ESPERA_TRACKING = 300;
let navegando = false;

/* A trava contra toque duplo tem que soltar quando a pessoa VOLTA, senão ela
   vira o próximo bug: quem abre o WhatsApp, desiste de enviar e volta para a
   página encontra todos os botões mortos, inclusive o "ABRIR O WHATSAPP" que
   existe justamente como socorro. No celular a volta quase nunca recarrega
   nada (bfcache no Android, troca de app no iOS), então o estado do módulo
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

/* ctrl/cmd/shift/botão do meio: a pessoa pediu outra aba de propósito.
   Deixa o navegador fazer o que ele faz e não sequestra o clique. */
const cliqueModificado = (e: MouseEvent) =>
  e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

/* ---------- leitura da página: onde a pessoa desiste ----------
   Entre "abriu" e "viu a oferta" não existia sinal nenhum. Quem saía antes
   virava um PageView solto, e não dava para saber se leu a manchete, rolou
   metade ou fechou em dois segundos. Nos dois primeiros dias de campanha,
   20 dos 26 visitantes reais foram exatamente isso: um PageView e silêncio.

   Estes eventos vão SÓ para a Mixpanel. São diagnóstico, não conversão: na
   Meta virariam eventos custom que sujam o dataset e não otimizam nada.

   `Saida` é o mais útil dos dois, porque também conta a história de quem não
   rolou nada: sai com o tempo de permanência e a profundidade máxima. */
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

  /* passivo e agendado no próximo quadro: rolagem dispara dezenas de vezes
     por segundo e medir em cada uma travaria a página no celular */
  addEventListener("scroll", () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(medir);
  }, { passive: true });
  medir();

  /* qual campo do formulário a pessoa tocou por último. No primeiro fim de
     semana 4 pessoas tocaram no formulário e nenhuma enviou, e este número
     sozinho não diz se o atrito é o nome, a loja ou o instagram. Vai como
     propriedade do Saida em vez de virar evento próprio: é diagnóstico, e o
     Saida já é o retrato de onde a pessoa desistiu. */
  let ultimoCampo = "";
  addEventListener("focusin", (e) => {
    const alvo = e.target as HTMLInputElement | null;
    if (alvo?.closest?.("#contratar") && alvo.name) ultimoCampo = alvo.name;
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
  medirLeitura();

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
    const cta = el.dataset.cta || "";
    const destino = el.dataset.ctaDest || "form";
    const dados = { location: cta, destination: destino };
    fbq("trackCustom", "ClickCTA", dados);
    mpTrack("ClickCTA", dados);

    /* Daqui para baixo é só o caminho do WhatsApp. Quem rola a página
       (`nav`, `hero_projetos`, `oferta_entrada`, `final_reserva`) ou abre o
       site de um cliente (`case_*`) sai aqui: vira ClickCTA e mais nada. */
    if (destino !== DESTINO_WHATSAPP) return;
    const href = (el as HTMLAnchorElement).href;
    if (!href || cliqueModificado(e)) return;

    /* Segura a navegação de propósito. Antes o clique seguia direto pelo
       href e o Lead saía numa corrida contra o descarregamento da página;
       agora dispara, espera os 300ms e só então navega. Ouvinte delegado em
       vez de onClick nos sete botões: um caminho só, impossível de esquecer
       quando nascer um CTA novo. */
    e.preventDefault();
    if (!FORA_DO_LEAD.has(cta)) trackLead({ ctaPosition: POSICAO_LEAD[cta] || cta });
    irParaWhatsapp(href);
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
   dizendo de onde veio, e SÓ é chamado de dentro do clique que abre o
   wa.me. Deduplicado: o MESMO event_id vai no Pixel (browser)
   e na Conversions API (servidor), então a Meta conta uma vez só e ainda
   recebe o evento quando o navegador falha, que é o caso comum no navegador
   interno do Instagram.

   O formulário não pede telefone (a mensagem sai do WhatsApp da própria
   pessoa), então as chaves de casamento que sobram são external_id, fbp, fbc
   e o primeiro nome, e é por isso que o nome chega até aqui. O servidor
   hasheia; nada em texto puro sai do browser.

   Fire-and-forget: nenhuma falha de rede aqui impede o WhatsApp de abrir. A
   espera dos 300ms antes do redirect é do `irParaWhatsapp`, não daqui, e é
   por conta do Pixel: Mixpanel e CAPI já sobrevivem à navegação pelo
   keepalive do fetch. */
export function trackLead({ ctaPosition, plano, nome }: { ctaPosition: string; plano?: string; nome?: string }) {
  if (!podeRastrear()) return;
  const eventId = idAleatorio();
  const dados: Record<string, unknown> = { content_name: "vitrine-digital", cta_position: ctaPosition, value: VALOR_OFERTA, currency: "BRL" };
  if (plano) dados.plano = plano;
  fbq("track", "Lead", dados, { eventID: eventId });
  /* "Abriu WhatsApp" é o espelho exato do Lead na Mixpanel: mesmo gatilho,
     mesmo momento, mesmo $insert_id. Existe para os dois painéis serem
     conferíveis um contra o outro. Enquanto a Mixpanel só recebia o Lead do
     formulário, um número (16 na Meta) não tinha par nenhum do outro lado, e
     não dava para saber se a diferença era evento falso, bloqueio de rastreio
     ou pessoa que abriu o WhatsApp e não mandou. Agora dá: se estes dois
     divergirem mais que 10%, o problema é entrega de evento, e o que falta
     entre "Abriu WhatsApp" e conversa recebida é a mensagem não enviada. */
  mpTrack("AbriuWhatsApp", { $insert_id: eventId, cta_position: ctaPosition, plano });
  /* E `Lead` continua significando, na Mixpanel, formulário enviado: é um
     passo a mais do funil, não o mesmo evento com outro nome. Só o caminho
     do formulário passa por aqui. */
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
