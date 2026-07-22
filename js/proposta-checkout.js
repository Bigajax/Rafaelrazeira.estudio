/* ============================================================
   CHECKOUT DAS PROPOSTAS — modal Pix + cartão, sem sair da página.

   Como usar em uma proposta:
   1. <body data-proposta="baixudos">  ← id igual ao da tabela em
      api/proposta-pagamento.js
   2. Botões com data-checkout-item="avista_pix" | "avista_card" |
      "entrada_pix" (os ids dos itens da proposta)
   3. Incluir este arquivo + css/proposta-checkout.css

   Fluxos:
   • Pix   → formulário (nome/e-mail/CPF) → QR code + copia-e-cola
             → polling a cada 4s → confirmação na tela.
   • Cartão → Brick CardPayment do Mercado Pago (campos seguros no
             modal, parcelas calculadas pelo próprio MP) → aprovação
             síncrona → confirmação na tela.
   O valor nunca vive neste arquivo: vem da config no servidor.
   ============================================================ */
(function () {
  "use strict";

  var propostaId = document.body.getAttribute("data-proposta");
  if (!propostaId) return;

  var API = "/api/proposta-pagamento";
  var config = null; // cache da config (itens + public key)
  var pollTimer = null;
  var brickController = null;
  var mpSdkPromise = null;

  /* ——— util ——— */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function brl(v) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function maskCpf(input) {
    input.addEventListener("input", function () {
      var d = input.value.replace(/\D/g, "").slice(0, 11);
      input.value = d
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    });
  }

  /* ——— modal ——— */
  var overlay = null;
  function openModal() {
    if (overlay) closeModal();
    overlay = el("div", "ck-overlay");
    var modal = el("div", "ck-modal");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Pagamento da proposta");
    var close = el("button", "ck-close", "×");
    close.setAttribute("aria-label", "Fechar");
    close.addEventListener("click", closeModal);
    modal.appendChild(close);
    var body = el("div", "ck-body");
    modal.appendChild(body);
    overlay.appendChild(modal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", onEsc);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    return body;
  }
  function onEsc(e) {
    if (e.key === "Escape") closeModal();
  }
  function closeModal() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    if (brickController && brickController.unmount) {
      try { brickController.unmount(); } catch (_) {}
    }
    brickController = null;
    if (overlay) overlay.remove();
    overlay = null;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onEsc);
  }

  function header(body, item) {
    var h = el("div", "ck-header");
    h.appendChild(el("p", "ck-eyebrow", "PAGAMENTO SEGURO · MERCADO PAGO"));
    h.appendChild(el("h3", "ck-title", item.label));
    h.appendChild(el("p", "ck-amount", brl(item.valor)));
    body.appendChild(h);
  }

  function showError(body, msg) {
    var existing = body.querySelector(".ck-error");
    if (existing) existing.remove();
    body.appendChild(el("p", "ck-error", msg));
  }

  function showSuccess(body, metodo, item) {
    body.innerHTML = "";
    var s = el("div", "ck-success");
    s.appendChild(el("div", "ck-success-mark", "✓"));
    s.appendChild(el("h3", "ck-title", "Pagamento confirmado"));
    var whats = config && config.whatsapp;
    var base = metodo === "pix" ? "Recebi a confirmação do Pix. " : "Cartão aprovado. ";
    s.appendChild(
      el(
        "p",
        "ck-text",
        base +
          (whats
            ? "Toque no botão abaixo para me avisar no WhatsApp e já seguimos com os próximos passos."
            : "Vou te chamar no WhatsApp para os próximos passos. Obrigado pela confiança!")
      )
    );
    if (whats) {
      var msg =
        "Olá! Acabei de efetuar o pagamento da proposta" +
        (item ? ": " + item.label + " (" + brl(item.valor) + ")" : "") +
        ". Podemos seguir com os próximos passos?";
      var href =
        "https://wa.me/" +
        String(config.whatsapp).replace(/\D/g, "") +
        "?text=" +
        encodeURIComponent(msg);
      var wa = el("a", "ck-btn", "Avisar no WhatsApp");
      wa.href = href;
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.style.textDecoration = "none";
      s.appendChild(wa);
      // tenta abrir sozinho; se o navegador bloquear, o botão acima resolve
      try { window.open(href, "_blank", "noopener"); } catch (_) {}
    }
    body.appendChild(s);
  }

  /* ——— fluxo Pix ——— */
  function pixFlow(body, item) {
    header(body, item);
    var form = el("form", "ck-form");
    form.noValidate = true;
    form.innerHTML =
      '<label class="ck-label" for="ck-nome">Nome completo</label>' +
      '<input class="ck-field" id="ck-nome" type="text" autocomplete="name" required />' +
      '<label class="ck-label" for="ck-email">E-mail (o comprovante vai para ele)</label>' +
      '<input class="ck-field" id="ck-email" type="email" autocomplete="email" required />' +
      '<label class="ck-label" for="ck-cpf">CPF</label>' +
      '<input class="ck-field" id="ck-cpf" type="text" inputmode="numeric" placeholder="000.000.000-00" required />' +
      '<button class="ck-btn" type="submit">Gerar Pix de ' + brl(item.valor) + "</button>";
    maskCpf(form.querySelector("#ck-cpf"));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = form.querySelector("#ck-nome").value.trim();
      var email = form.querySelector("#ck-email").value.trim();
      var cpf = form.querySelector("#ck-cpf").value;
      if (!nome || !email || cpf.replace(/\D/g, "").length !== 11) {
        return showError(body, "Preencha nome, e-mail e CPF completos.");
      }
      var btn = form.querySelector(".ck-btn");
      btn.disabled = true;
      btn.textContent = "Gerando Pix…";
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposta: propostaId,
          item: item.id,
          payer: { nome: nome, email: email, cpf: cpf },
        }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.j.error || "erro");
          showPixQr(body, item, r.j);
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = "Gerar Pix de " + brl(item.valor);
          showError(body, err.message === "erro" ? "Não foi possível gerar o Pix. Tente de novo." : err.message);
        });
    });
    body.appendChild(form);
  }

  function showPixQr(body, item, data) {
    body.innerHTML = "";
    header(body, item);
    var box = el("div", "ck-pix");
    box.appendChild(el("p", "ck-text", "Abra o app do seu banco e escaneie o QR code, ou use o copia-e-cola:"));
    if (data.qr_code_base64) {
      var img = el("img", "ck-qr");
      img.src = "data:image/png;base64," + data.qr_code_base64;
      img.alt = "QR code do Pix";
      box.appendChild(img);
    }
    var copy = el("button", "ck-btn ck-btn--ghost", "Copiar código Pix");
    copy.addEventListener("click", function () {
      navigator.clipboard.writeText(data.qr_code || "").then(function () {
        copy.textContent = "Copiado ✓";
        setTimeout(function () { copy.textContent = "Copiar código Pix"; }, 2500);
      });
    });
    box.appendChild(copy);
    box.appendChild(el("p", "ck-note", "O código vale por 30 minutos. Assim que o banco confirmar, esta tela atualiza sozinha."));
    var status = el("p", "ck-status", "Aguardando pagamento…");
    box.appendChild(status);
    body.appendChild(box);

    pollTimer = setInterval(function () {
      fetch(API + "?status=" + data.id)
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j.status === "approved") {
            clearInterval(pollTimer);
            pollTimer = null;
            showSuccess(body, "pix", item);
          } else if (j.status === "cancelled" || j.status === "expired") {
            clearInterval(pollTimer);
            pollTimer = null;
            status.textContent = "O Pix expirou. Feche e gere um novo.";
            status.classList.add("ck-status--err");
          }
        })
        .catch(function () {});
    }, 4000);
  }

  /* ——— fluxo cartão (Brick CardPayment) ——— */
  function loadMpSdk() {
    if (mpSdkPromise) return mpSdkPromise;
    mpSdkPromise = new Promise(function (resolve, reject) {
      if (window.MercadoPago) return resolve();
      var s = document.createElement("script");
      s.src = "https://sdk.mercadopago.com/js/v2";
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Não foi possível carregar o Mercado Pago.")); };
      document.head.appendChild(s);
    });
    return mpSdkPromise;
  }

  function cardFlow(body, item) {
    header(body, item);
    var holder = el("div", "ck-brick");
    holder.id = "ck-brick-container";
    body.appendChild(el("p", "ck-text", "Preencha os dados do cartão. As parcelas aparecem no formulário."));
    body.appendChild(holder);
    var loading = el("p", "ck-status", "Carregando formulário seguro…");
    body.appendChild(loading);

    loadMpSdk()
      .then(function () {
        var mp = new window.MercadoPago(config.publicKey, { locale: "pt-BR" });
        return mp.bricks().create("cardPayment", "ck-brick-container", {
          initialization: { amount: item.valor },
          customization: {
            paymentMethods: { minInstallments: 1, maxInstallments: item.maxParcelas || 1 },
            visual: {
              texts: { formSubmit: "Pagar " + brl(item.valor) },
              style: {
                customVariables: {
                  baseColor: "#10B981",
                  borderRadiusMedium: "12px",
                  borderRadiusLarge: "16px",
                  borderRadiusFull: "999px",
                },
              },
            },
          },
          callbacks: {
            onReady: function () { loading.remove(); },
            onError: function (err) {
              console.error("ck_brick_error", err);
              loading.remove();
              showError(body, "Erro no formulário de cartão. Feche o modal e tente de novo.");
            },
            onSubmit: function (data) {
              var fd = (data && data.formData) || data || {};
              return fetch(API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  proposta: propostaId,
                  item: item.id,
                  card: {
                    token: fd.token,
                    payment_method_id: fd.payment_method_id,
                    issuer_id: fd.issuer_id,
                    installments: fd.installments,
                    payer: fd.payer,
                  },
                }),
              })
                .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                .then(function (r) {
                  if (!r.ok) throw new Error(r.j.error || "recusado");
                  if (r.j.status === "approved") {
                    showSuccess(body, "card", item);
                  } else if (r.j.status === "in_process" || r.j.status === "pending") {
                    body.innerHTML = "";
                    var s = el("div", "ck-success");
                    s.appendChild(el("h3", "ck-title", "Pagamento em análise"));
                    s.appendChild(el("p", "ck-text", "O banco está analisando a compra. Você recebe a confirmação por e-mail em instantes, e eu te aviso no WhatsApp."));
                    body.appendChild(s);
                  } else {
                    showError(body, cardDeclineMessage(r.j.status_detail));
                  }
                })
                .catch(function (err) {
                  showError(body, err.message === "recusado" ? "O cartão foi recusado. Confira os dados ou tente outro cartão." : err.message);
                });
            },
          },
        });
      })
      .then(function (controller) { brickController = controller; })
      .catch(function (err) {
        loading.remove();
        showError(body, err.message);
      });
  }

  function cardDeclineMessage(detail) {
    var map = {
      cc_rejected_insufficient_amount: "Cartão sem limite disponível para esta compra.",
      cc_rejected_bad_filled_security_code: "Código de segurança (CVV) incorreto.",
      cc_rejected_bad_filled_date: "Data de validade incorreta.",
      cc_rejected_bad_filled_other: "Algum dado do cartão está incorreto. Confira e tente de novo.",
      cc_rejected_call_for_authorize: "O banco pediu autorização — ligue para o banco e tente novamente.",
      cc_rejected_high_risk: "O pagamento não foi autorizado pelo banco. Tente outro cartão ou o Pix.",
    };
    return map[detail] || "O cartão foi recusado. Confira os dados ou tente outro cartão.";
  }

  /* ——— boot: liga os botões ——— */
  function start(itemId) {
    var run = function () {
      var item = null;
      for (var i = 0; i < config.itens.length; i++) {
        if (config.itens[i].id === itemId) item = config.itens[i];
      }
      if (!item) return;
      var body = openModal();
      if (item.metodo === "pix") pixFlow(body, item);
      else cardFlow(body, item);
    };
    if (config) return run();
    fetch(API + "?proposta=" + encodeURIComponent(propostaId))
      .then(function (r) {
        if (!r.ok) throw new Error("config");
        return r.json();
      })
      .then(function (j) {
        config = j;
        run();
      })
      .catch(function () {
        var body = openModal();
        body.appendChild(el("p", "ck-error", "O checkout está indisponível no momento. Me chame no WhatsApp que resolvemos por lá."));
      });
  }

  document.querySelectorAll("[data-checkout-item]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      start(btn.getAttribute("data-checkout-item"));
    });
  });
})();
