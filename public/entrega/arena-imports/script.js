/* Cartilha de Entrega · Arena Imports Floripa
   Interações: menu mobile, seção ativa no sumário, imprimir. */
(function () {
  "use strict";

  var sidebar = document.getElementById("sidebar");
  var scrim = document.getElementById("scrim");
  var menuBtn = document.getElementById("menuBtn");
  var toc = document.getElementById("toc");
  var printBtn = document.getElementById("printBtn");

  function openMenu() {
    sidebar.classList.add("open");
    scrim.classList.add("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    sidebar.classList.remove("open");
    scrim.classList.remove("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }
  function toggleMenu() {
    if (sidebar.classList.contains("open")) closeMenu();
    else openMenu();
  }

  if (menuBtn) menuBtn.addEventListener("click", toggleMenu);
  if (scrim) scrim.addEventListener("click", closeMenu);

  // Fechar o menu ao clicar num link (mobile)
  if (toc) {
    toc.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (a && window.matchMedia("(max-width: 900px)").matches) closeMenu();
    });
  }

  // Fechar com Esc
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  // Botão imprimir / salvar PDF
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  // Botão de aceite — abre o WhatsApp com a mensagem de recebimento pronta
  var aceiteBtn = document.getElementById("btnAceite");
  if (aceiteBtn) {
    aceiteBtn.addEventListener("click", function () {
      var whats = aceiteBtn.getAttribute("data-whats");
      var agora = new Date();
      var data = agora.toLocaleDateString("pt-BR");
      var hora = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      var msg =
        "Ola, Rafael! Sou o Andre, da Arena Imports Floripa. " +
        "Confirmo o recebimento e o aceite da entrega do projeto (versao 1.0.0) em " +
        data + " as " + hora + ". Esta tudo certo, pode considerar aceito.";
      var url = "https://wa.me/" + whats + "?text=" + encodeURIComponent(msg);
      window.open(url, "_blank", "noopener");
    });
  }

  // Indicador de seção ativa no sumário
  var links = toc ? Array.prototype.slice.call(toc.querySelectorAll("a")) : [];
  var byId = {};
  links.forEach(function (a) {
    var id = a.getAttribute("href").slice(1);
    byId[id] = a;
  });
  var sections = document.querySelectorAll("section[id]");

  if ("IntersectionObserver" in window && sections.length) {
    var current = null;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            if (byId[id] && id !== current) {
              if (current && byId[current]) byId[current].classList.remove("active");
              byId[id].classList.add("active");
              current = id;
            }
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (s) {
      observer.observe(s);
    });
  }
})();
