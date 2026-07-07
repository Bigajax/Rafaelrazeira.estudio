/* ============================================================
   BRIEFING — autosave local, progresso no pill, upload de
   arquivos (Cloudinary) e envio pelo WhatsApp (briefing.html).
   Sem backend: as respostas viram uma mensagem formatada e os
   arquivos sobem direto do navegador para o Cloudinary.
   ============================================================ */
(function () {
  "use strict";

  var WHATSAPP = "5544999997219";
  var EMAIL = "rafael.rbarbon@gmail.com";
  var STORE_KEY = "briefing-razeira-v1";
  var FILES_KEY = STORE_KEY + "-arquivos";

  /* Upload direto para o Cloudinary (sem servidor próprio).
     cloudName: painel inicial · uploadPreset: Settings → Upload →
     Upload presets, com Signing mode = Unsigned.
     Enquanto estiver vazio, os botões de anexo ficam escondidos. */
  var CLOUDINARY = {
    cloudName: "bsiunx3m",
    uploadPreset: "briefing",
  };

  /* Estrutura do briefing — mesma ordem do documento */
  var BLOCOS = [
    { titulo: "QUEM RESPONDE", campos: [
      ["q-nome", "Nome"],
      ["q-empresa", "Empresa / projeto"],
    ]},
    { titulo: "1. SOBRE O NEGÓCIO", campos: [
      ["q-vende", "O que vende, em uma frase"],
      ["q-historia", "Tempo de negócio e história"],
      ["q-diferencial", "Diferencial / por que escolhem você"],
    ]},
    { titulo: "2. PÚBLICO", campos: [
      ["q-cliente", "Cliente ideal"],
      ["q-problema", "Problema ou desejo principal"],
      ["q-objecoes", "Dúvidas e objeções"],
    ]},
    { titulo: "3. OFERTA E OBJETIVO", campos: [
      ["q-oferta", "O que a página vende/oferece"],
      ["q-acao", "Ação do visitante"],
      ["q-preco", "Preço / condição / promessa"],
      ["q-origem", "De onde vêm os visitantes"],
    ]},
    { titulo: "4. PROVA E CREDIBILIDADE", campos: [
      ["q-depoimentos", "Depoimentos (quantos, formato)"],
      ["q-numeros", "Números / certificações / registros"],
    ]},
    { titulo: "5. ESTILO E REFERÊNCIAS", campos: [
      ["q-referencias", "Sites de referência e o que gosta"],
      ["q-naoquer", "O que NÃO quer na página"],
      ["q-marca", "Cores e logotipo da marca"],
    ]},
    { titulo: "7. APROVAÇÃO", campos: [
      ["q-aprova", "Quem aprova o projeto"],
      ["q-horario", "Melhor dia/horário para a chamada"],
    ]},
  ];

  var MATERIAIS = [
    ["m-logo", "Logotipo em boa qualidade"],
    ["m-fotos", "Fotos do negócio/produto"],
    ["m-depoimentos", "Depoimentos"],
    ["m-textos", "Textos de apoio"],
    ["m-dominio", "Dados de domínio e hospedagem"],
  ];

  /* Nomes dos pontos de anexo (data-upload) — na ordem da mensagem */
  var CATEGORIAS = {
    depoimentos: "Depoimentos",
    marca: "Logotipo / marca",
    materiais: "Fotos e materiais",
  };

  var campos = Array.prototype.slice.call(document.querySelectorAll("[data-save]"));
  var textuais = campos.filter(function (el) { return el.type !== "checkbox"; });
  var pill = document.getElementById("btn-enviar");
  var pillCount = document.getElementById("pill-count");

  /* ---------- Autosave (localStorage) ---------- */
  function salvar() {
    var dados = {};
    campos.forEach(function (el) {
      dados[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(dados)); } catch (e) {}
  }

  function restaurar() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (!raw) return;
    var dados;
    try { dados = JSON.parse(raw); } catch (e) { return; }
    campos.forEach(function (el) {
      if (!(el.id in dados)) return;
      if (el.type === "checkbox") el.checked = !!dados[el.id];
      else el.value = dados[el.id] || "";
    });
  }

  /* ---------- Textareas que crescem com o texto ---------- */
  function autosize(el) {
    if (el.tagName !== "TEXTAREA") return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }

  /* ---------- Progresso no pill ---------- */
  function atualizar() {
    var total = textuais.length;
    var feitos = textuais.filter(function (el) { return el.value.trim() !== ""; }).length;
    pillCount.textContent = feitos + "/" + total;
    pill.classList.toggle("is-complete", feitos === total);
    textuais.forEach(function (el) {
      el.classList.toggle("is-filled", el.value.trim() !== "");
    });
  }

  /* ---------- Monta a mensagem final ---------- */
  function montarMensagem() {
    var hoje = new Date().toLocaleDateString("pt-BR");
    var linhas = ["*BRIEFING — LANDING PAGE*", "Enviado em " + hoje];

    BLOCOS.forEach(function (bloco) {
      var respostas = bloco.campos
        .map(function (par) {
          var el = document.getElementById(par[0]);
          var valor = el ? el.value.trim() : "";
          if (!valor) return null;
          return "— " + par[1] + ":\n" + valor;
        })
        .filter(Boolean);
      if (respostas.length) {
        linhas.push("");
        linhas.push("*" + bloco.titulo + "*");
        linhas.push(respostas.join("\n"));
      }
    });

    var marcados = MATERIAIS.filter(function (par) {
      var el = document.getElementById(par[0]);
      return el && el.checked;
    }).map(function (par) { return "✓ " + par[1]; });
    linhas.push("");
    linhas.push("*6. MATERIAIS QUE VOU ENVIAR JUNTO*");
    linhas.push(marcados.length ? marcados.join("\n") : "(nenhum marcado ainda)");

    if (arquivos.length) {
      linhas.push("");
      linhas.push("*ARQUIVOS ENVIADOS* (" + arquivos.length + ")");
      Object.keys(CATEGORIAS).forEach(function (cat) {
        var doCat = arquivos.filter(function (a) { return (a.cat || "materiais") === cat; });
        if (!doCat.length) return;
        linhas.push("_" + CATEGORIAS[cat] + ":_");
        doCat.forEach(function (a) {
          linhas.push("• " + a.nome + "\n" + a.url);
        });
      });
    }

    var vazias = textuais.filter(function (el) { return el.value.trim() === ""; }).length;
    if (vazias > 0) {
      linhas.push("");
      linhas.push("_" + vazias + " pergunta(s) em branco — resolvemos na conversa._");
    }

    return linhas.join("\n");
  }

  /* ---------- Upload de arquivos (Cloudinary, direto do navegador) ----------
     Cada .bf-upload[data-upload] é um ponto de anexo independente;
     a categoria agrupa os links na mensagem final. */
  var arquivos = [];   /* [{nome, url, tipo, cat}] — só os que subiram com sucesso */
  var listas = {};     /* cat → <ul> correspondente */

  function salvarArquivos() {
    try { localStorage.setItem(FILES_KEY, JSON.stringify(arquivos)); } catch (e) {}
  }

  function linhaArquivo(nome, tipo, url) {
    var li = document.createElement("li");
    li.className = "bf-file";
    var ehImagem = /^image\//.test(tipo) && url;
    var thumb;
    if (ehImagem) {
      thumb = document.createElement("img");
      thumb.className = "bf-file__thumb";
      thumb.alt = "";
      /* miniatura leve gerada pelo próprio Cloudinary */
      thumb.src = url.replace("/upload/", "/upload/w_72,h_72,c_fill,q_auto/");
    } else {
      thumb = document.createElement("span");
      thumb.className = "bf-file__thumb bf-file__thumb--icon";
      thumb.textContent = (nome.split(".").pop() || "?").slice(0, 4).toUpperCase();
    }
    var span = document.createElement("span");
    span.className = "bf-file__name";
    span.textContent = nome;
    li.appendChild(thumb);
    li.appendChild(span);
    return li;
  }

  /* Redesenha os arquivos concluídos de uma categoria,
     preservando as linhas ainda em progresso/erro */
  function renderLista(cat) {
    var lista = listas[cat];
    if (!lista) return;
    var vivas = Array.prototype.slice.call(
      lista.querySelectorAll(".bf-file--enviando, .bf-file--erro")
    );
    lista.innerHTML = "";
    arquivos.forEach(function (a) {
      if ((a.cat || "materiais") !== cat) return;
      var li = linhaArquivo(a.nome, a.tipo, a.url);
      li.classList.add("bf-file--ok");
      var status = document.createElement("span");
      status.className = "bf-file__status";
      status.textContent = "✓ enviado";
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "bf-file__remove";
      rm.setAttribute("aria-label", "Remover " + a.nome + " da lista");
      rm.textContent = "×";
      rm.addEventListener("click", function () {
        var i = arquivos.indexOf(a);
        if (i > -1) arquivos.splice(i, 1);
        salvarArquivos();
        renderLista(cat);
      });
      li.appendChild(status);
      li.appendChild(rm);
      lista.appendChild(li);
    });
    vivas.forEach(function (p) { lista.appendChild(p); });
  }

  function subirArquivo(file, cat) {
    var lista = listas[cat];
    var ehVideo = /^video\//.test(file.type);
    var limite = ehVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    var li = linhaArquivo(file.name, "", null);

    if (file.size > limite) {
      li.classList.add("bf-file--erro");
      var aviso = document.createElement("span");
      aviso.className = "bf-file__status";
      aviso.textContent = ehVideo ? "acima de 100MB — envie pelo WhatsApp" : "acima de 10MB — envie pelo WhatsApp";
      li.appendChild(aviso);
      lista.appendChild(li);
      return;
    }

    li.classList.add("bf-file--enviando");
    var bar = document.createElement("span");
    bar.className = "bf-file__bar";
    var fill = document.createElement("i");
    bar.appendChild(fill);
    var status = document.createElement("span");
    status.className = "bf-file__status";
    status.textContent = "0%";
    li.appendChild(bar);
    li.appendChild(status);
    lista.appendChild(li);

    var dados = new FormData();
    dados.append("file", file);
    dados.append("upload_preset", CLOUDINARY.uploadPreset);
    dados.append("folder", "briefing");
    dados.append("tags", "briefing," + cat);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.cloudinary.com/v1_1/" + CLOUDINARY.cloudName + "/auto/upload");
    xhr.upload.addEventListener("progress", function (ev) {
      if (!ev.lengthComputable) return;
      var pct = Math.round((ev.loaded / ev.total) * 100);
      fill.style.width = pct + "%";
      status.textContent = pct + "%";
    });
    xhr.addEventListener("load", function () {
      var resp = null;
      try { resp = JSON.parse(xhr.responseText); } catch (e) {}
      if (xhr.status >= 200 && xhr.status < 300 && resp && resp.secure_url) {
        arquivos.push({ nome: file.name, url: resp.secure_url, tipo: file.type, cat: cat });
        salvarArquivos();
        li.remove();
        renderLista(cat);
      } else {
        marcarFalha();
      }
    });
    xhr.addEventListener("error", marcarFalha);

    function marcarFalha() {
      li.classList.remove("bf-file--enviando");
      li.classList.add("bf-file--erro");
      bar.remove();
      status.textContent = "falhou";
      var retry = document.createElement("button");
      retry.type = "button";
      retry.className = "bf-file__remove";
      retry.setAttribute("aria-label", "Tentar enviar " + file.name + " de novo");
      retry.textContent = "↻";
      retry.addEventListener("click", function () {
        li.remove();
        subirArquivo(file, cat);
      });
      li.appendChild(retry);
    }

    xhr.send(dados);
  }

  if (CLOUDINARY.cloudName && CLOUDINARY.uploadPreset) {
    try { arquivos = JSON.parse(localStorage.getItem(FILES_KEY) || "[]"); } catch (e) { arquivos = []; }
    if (!Array.isArray(arquivos)) arquivos = [];

    Array.prototype.slice.call(document.querySelectorAll(".bf-upload[data-upload]")).forEach(function (area) {
      var cat = area.getAttribute("data-upload");
      var input = area.querySelector('input[type="file"]');
      var btn = area.querySelector(".bf-upload__btn");
      listas[cat] = area.querySelector(".bf-files");
      area.hidden = false;
      btn.addEventListener("click", function () { input.click(); });
      input.addEventListener("change", function () {
        Array.prototype.slice.call(input.files).forEach(function (f) { subirArquivo(f, cat); });
        input.value = "";
      });
      renderLista(cat);
    });
  }

  /* ---------- Validação mínima antes de enviar ---------- */
  var toast = document.getElementById("toast");
  var toastTimer = null;

  function avisar(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 4000);
  }

  function pedirCampo(el, msg) {
    avisar(msg);
    el.classList.add("is-invalid");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(function () { el.focus({ preventScroll: true }); }, 450);
  }

  /* Exige o nome + pelo menos uma resposta; o resto pode ir em branco */
  function podeEnviar() {
    var nome = document.getElementById("q-nome");
    if (nome.value.trim() === "") {
      pedirCampo(nome, "Antes de enviar, me diga pelo menos seu nome.");
      return false;
    }
    var respondidas = textuais.filter(function (el) { return el.value.trim() !== ""; }).length;
    if (respondidas < 2 && !arquivos.length) {
      var primeiraVazia = textuais.filter(function (el) { return el.value.trim() === ""; })[0];
      pedirCampo(primeiraVazia, "Responda pelo menos uma pergunta — o resto pode ficar em branco.");
      return false;
    }
    return true;
  }

  /* ---------- Ações ---------- */
  pill.addEventListener("click", function () {
    if (!podeEnviar()) return;
    var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(montarMensagem());
    window.open(url, "_blank", "noopener");
  });

  document.getElementById("btn-copiar").addEventListener("click", function () {
    var texto = montarMensagem();
    var ok = function () {
      document.getElementById("copiado").hidden = false;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(ok, function () { fallbackCopy(texto); ok(); });
    } else {
      fallbackCopy(texto); ok();
    }
  });

  function fallbackCopy(texto) {
    var ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  document.getElementById("btn-email").addEventListener("click", function (ev) {
    ev.preventDefault();
    if (!podeEnviar()) return;
    var assunto = "Briefing — Landing Page";
    var nome = document.getElementById("q-nome").value.trim();
    if (nome) assunto += " — " + nome;
    location.href = "mailto:" + EMAIL +
      "?subject=" + encodeURIComponent(assunto) +
      "&body=" + encodeURIComponent(montarMensagem().replace(/\*/g, ""));
  });

  document.getElementById("btn-limpar").addEventListener("click", function () {
    if (!confirm("Apagar todas as respostas salvas neste aparelho?")) return;
    try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(FILES_KEY); } catch (e) {}
    arquivos = [];
    Object.keys(listas).forEach(function (cat) { listas[cat].innerHTML = ""; });
    campos.forEach(function (el) {
      if (el.type === "checkbox") el.checked = false;
      else { el.value = ""; autosize(el); }
    });
    document.getElementById("copiado").hidden = true;
    atualizar();
  });

  /* ---------- Liga tudo ---------- */
  campos.forEach(function (el) {
    el.addEventListener("input", function () {
      el.classList.remove("is-invalid");
      autosize(el);
      atualizar();
      salvar();
    });
    el.addEventListener("change", salvar);
  });

  restaurar();
  textuais.forEach(autosize);
  atualizar();
})();
