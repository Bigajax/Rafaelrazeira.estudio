/* ============================================================
   A medição da /black (05/11/2026, pedido do Rafael).
   ------------------------------------------------------------
   A transmissão da Black chegou a 71 amostras, 34 leram e 0 responderam,
   e a página não media nada: não dava para saber se ninguém tocou no botão
   ou se tocou, viu os R$ 799 e parou. Agora mede, com o MESMO pixel e o
   MESMO projeto do Mixpanel da /vitrine-digital, e as mesmas travas:

   • Só produção (HOSTS_PRODUCAO). Para testar: `?tracking=on`.
     `?tracking=off` desliga no APARELHO (a mesma chave das outras páginas).
   • Quem recusou na Política de Privacidade (cookie_consent = "declined")
     fica de fora.
   • O mp_distinct_id e o visita_ref são os mesmos do site: quem veio da
     /vitrine-digital é a mesma pessoa no Mixpanel.

   NUNCA disparar Lead nem Contact aqui: o Contact é o que a campanha
   otimiza, e quem chega pela Black são amostras antigas, não lead novo.
   Somar isso ao anúncio ensinaria a Meta com gente que não veio dele.

   Eventos (Mixpanel, com page = "black"):
     "Abriu a Black"        (PageView também no pixel e na CAPI)
     "Tocou em pagar"       (InitiateCheckout no pixel e na CAPI), item
     "Abriu o WhatsApp"     (o "Me chama no WhatsApp" da página)
     "Pagou na Black"       (a tela "Pagamento confirmado" apareceu), item
     "Saiu da página"       com os segundos na página e se tocou em pagar
   ============================================================ */
(function () {
  "use strict";

  var PIXEL_ID = "2445872572575348";
  var MIXPANEL_TOKEN = "56f4afa648bf59c45e417b084fdb4aa4";
  var MP_URL = "https://api.mixpanel.com/track?ip=1";
  var CAPI = "/api/meta-capi";
  var PAGINA = "black";
  var HOSTS_PRODUCAO = [
    "rafaelrazeira.com.br",
    "www.rafaelrazeira.com.br",
    "rafaelrazeira-estudio.vercel.app",
    "rafaelrazeira.com",
    "www.rafaelrazeira.com",
  ];

  function permitido() {
    try {
      var q = new URLSearchParams(location.search).get("tracking");
      if (q === "off") { localStorage.setItem("tracking_desligado", "1"); sessionStorage.removeItem("tracking_forcado"); }
      if (q === "on") { localStorage.removeItem("tracking_desligado"); sessionStorage.setItem("tracking_forcado", "1"); }
      if (localStorage.getItem("tracking_desligado")) return false;
      if (localStorage.getItem("cookie_consent") === "declined") return false;
      if (sessionStorage.getItem("tracking_forcado")) return true;
    } catch (_) {}
    return HOSTS_PRODUCAO.indexOf(location.hostname) !== -1;
  }
  if (!permitido()) { console.info("[tracking] mudo fora da produção. Para testar, abra com ?tracking=on."); return; }

  var ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function idAleatorio() {
    try { return crypto.randomUUID(); } catch (_) { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
  }
  function guardado(chave, criar) {
    try {
      var v = localStorage.getItem(chave);
      if (!v) { v = criar(); localStorage.setItem(chave, v); }
      return v;
    } catch (_) { return ""; }
  }
  var distinctId = guardado("mp_distinct_id", idAleatorio);
  var externalId = guardado("visita_ref", function () {
    return Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(8)), function (b) { return ALFABETO[b % 32]; }).join("");
  }).toLowerCase();

  function cookie(nome) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function fbc() {
    var c = cookie("_fbc");
    if (c) return c;
    var id = new URLSearchParams(location.search).get("fbclid");
    return id ? "fb.1." + Date.now() + "." + id : "";
  }
  var utm = {};
  try {
    var q = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) { var v = q.get(k); if (v) utm[k] = v; });
  } catch (_) {}
  var celular = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  /* ---------- Mixpanel (HTTP, sem biblioteca) ---------- */
  function mp(evento, props, id) {
    var p = { token: MIXPANEL_TOKEN, distinct_id: distinctId, time: Date.now(), $insert_id: id || idAleatorio(),
      $current_url: location.href, $referrer: document.referrer || "", page: PAGINA, dispositivo: celular ? "celular" : "computador" };
    for (var k in utm) p[k] = utm[k];
    for (var j in props || {}) p[j] = props[j];
    try {
      fetch(MP_URL, { method: "POST", keepalive: true, body: new URLSearchParams({ data: JSON.stringify([{ event: evento, properties: p }]) }) }).catch(function () {});
    } catch (_) {}
  }

  /* ---------- Pixel + CAPI, amarrados pelo mesmo event_id ---------- */
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0;
    t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", PIXEL_ID, { external_id: externalId });

  function meta(evento, extra) {
    var id = idAleatorio();
    try { window.fbq("track", evento, {}, { eventID: id }); } catch (_) {}
    var corpo = { event_name: evento, event_id: id, external_id: externalId, fbp: cookie("_fbp"), fbc: fbc(), event_source_url: location.href };
    for (var k in extra || {}) corpo[k] = extra[k];
    try { fetch(CAPI, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify(corpo) }).catch(function () {}); } catch (_) {}
    return id;
  }

  var abriuEm = Date.now();
  var tocouEmPagar = false;
  var ultimoItem = "";

  mp("Abriu a Black", {}, meta("PageView"));

  document.addEventListener("click", function (e) {
    var alvo = e.target.closest ? e.target.closest("[data-checkout-item], a.duvida") : null;
    if (!alvo) return;
    if (alvo.hasAttribute("data-checkout-item")) {
      tocouEmPagar = true;
      ultimoItem = alvo.getAttribute("data-checkout-item");
      mp("Tocou em pagar", { item: ultimoItem }, meta("InitiateCheckout", { content_name: "black-799", content_category: ultimoItem }));
    } else {
      try { window.fbq("trackCustom", "ClickCTA", { location: "black", destination: "whatsapp" }); } catch (_) {}
      mp("Abriu o WhatsApp", { origem: "duvida" });
    }
  }, true);

  /* a tela de "Pagamento confirmado" é montada pelo proposta-checkout.js;
     aqui só se observa, para não mexer no checkout de todas as propostas */
  var pagou = false;
  new MutationObserver(function () {
    if (pagou || !document.querySelector(".ck-success")) return;
    pagou = true;
    mp("Pagou na Black", { item: ultimoItem });
  }).observe(document.body, { childList: true, subtree: true });

  var saiu = false;
  function sair() {
    if (saiu) return;
    saiu = true;
    mp("Saiu da página", { segundos: Math.round((Date.now() - abriuEm) / 1000), tocou_em_pagar: tocouEmPagar, pagou: pagou });
  }
  window.addEventListener("pagehide", sair);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") sair(); });
})();
