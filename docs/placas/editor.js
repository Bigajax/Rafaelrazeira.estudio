/* Fonte do editor; gerar o HTML portátil com scripts/gerar-molde-placas.mjs. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const inicio = {
    tipo: "vendas", marco: "10", familia: "registrada", acabamento: "champanhe",
    numero: "10", unidade: "mil", rotulo: "em vendas registradas", moeda: true,
    loja: "Loja Modelo", data: "2026-10-19", topo: "Uma conquista da sua loja",
    frase: "Feito de trabalho. Celebrado com orgulho."
  };
  const tipos = {
    visitas: { familia: "medida", unidade: "pessoas", rotulo: "na sua vitrine", moeda: false,
      marcos: [["1.000", "1.000 pessoas", "verde"], ["5.000", "5.000 pessoas", "verde-claro"], ["20.000", "20.000 pessoas", "ouro"]],
      criterio: "Preencha com o total de pessoas medido pela plataforma." },
    whatsapp: { familia: "medida", unidade: "chamadas", rotulo: "no WhatsApp pela sua vitrine", moeda: false,
      marcos: [["100", "100 chamadas", "verde"], ["500", "500 chamadas", "metal"], ["2.000", "2.000 chamadas", "ouro"]],
      criterio: "Chamadas são contatos iniciados pela vitrine. Confirme o total no painel." },
    tempo: { familia: "medida", unidade: "ano", rotulo: "com a sua vitrine no ar", moeda: false,
      marcos: [["1", "1 ano", "prata"], ["2", "2 anos", "ouro"]],
      criterio: "Use o período de atividade confirmado para a vitrine." },
    vendas: { familia: "registrada", unidade: "mil", rotulo: "em vendas registradas", moeda: true,
      marcos: [["10", "R$ 10 mil", "champanhe"], ["20", "R$ 20 mil", "bronze"], ["50", "R$ 50 mil", "metal"], ["100", "R$ 100 mil", "prata"], ["300", "R$ 300 mil", "ouro"], ["500", "R$ 500 mil", "ouro"]],
      criterio: "Use o total de vendas registrado pela loja. Não equivale a pagamento verificado." },
    personalizado: { marcos: [["livre", "Marco livre", "verde"]], criterio: "Edite o número, a unidade e a descrição em “Ajustar os textos da placa”." }
  };
  let salvo;
  try { salvo = JSON.parse($("configuracao-salva").textContent); } catch { salvo = null; }
  let estado = { ...inicio, ...(salvo && typeof salvo === "object" ? salvo : {}) };
  if (!tipos[estado.tipo]) estado.tipo = inicio.tipo;
  const iframe = $("previa");
  const fontes = JSON.parse($("fontes-placa").textContent);
  let pronto = false;
  let ultimaAtualizacao = Promise.resolve();
  let ocupado = false;
  const campos = ["loja", "data", "numero", "unidade", "rotulo", "topo", "frase"];
  const status = texto => { $("status").textContent = texto; };

  function preencher() {
    campos.forEach(campo => { $(campo).value = estado[campo]; });
    $("moeda").checked = estado.moeda;
    $("tipo").value = estado.tipo;
    const tipo = tipos[estado.tipo];
    $("marco").replaceChildren(...tipo.marcos.map(([valor, nome]) => new Option(nome, valor)));
    $("marco").value = tipo.marcos.some(m => m[0] === estado.marco) ? estado.marco : tipo.marcos[0][0];
    $("marco").disabled = estado.tipo === "personalizado";
    $("criterio").textContent = tipo.criterio;
    document.querySelectorAll("[data-tom]").forEach(botao => {
      const ativo = botao.dataset.tom === estado.acabamento;
      botao.setAttribute("aria-pressed", String(ativo));
      if (ativo) $("nome-acabamento").textContent = botao.getAttribute("aria-label");
    });
  }

  function dataFormatada() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(estado.data)) return "data a definir";
    const data = new Date(estado.data + "T12:00:00Z");
    if (!Number.isFinite(data.getTime())) return "data a definir";
    return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(data);
  }

  function atualizar() {
    if (!pronto) return;
    ultimaAtualizacao = iframe.contentWindow.atualizarPlaca({ ...estado, data: dataFormatada() });
    ultimaAtualizacao.catch(() => status("Não foi possível atualizar a prévia. Reabra o molde para tentar novamente."));
  }

  function preset(tipo, marco) {
    const t = tipos[tipo];
    estado.tipo = tipo;
    if (tipo !== "personalizado") {
      const m = t.marcos.find(m => m[0] === marco) || t.marcos[0];
      Object.assign(estado, {familia:t.familia, marco:m[0], numero:m[0], unidade:t.unidade,
        rotulo:t.rotulo, moeda:t.moeda, acabamento:m[2]});
      if (tipo === "tempo" && m[0] !== "1") estado.unidade = "anos";
    } else {
      estado.marco = "livre";
      document.querySelector("details").open = true;
    }
    preencher();
    atualizar();
  }

  $("formulario").addEventListener("submit", event => event.preventDefault());
  campos.forEach(campo => $(campo).addEventListener("input", () => {
    estado[campo] = $(campo).value;
    if (["numero", "unidade", "rotulo"].includes(campo)) {
      estado.tipo = "personalizado";
      estado.marco = "livre";
      $("tipo").value = estado.tipo;
      $("marco").replaceChildren(new Option("Marco livre", "livre"));
      $("marco").disabled = true;
      $("criterio").textContent = tipos.personalizado.criterio;
    }
    atualizar();
  }));
  $("moeda").addEventListener("change", () => { estado.moeda = $("moeda").checked; atualizar(); });
  $("tipo").addEventListener("change", () => preset($("tipo").value));
  $("marco").addEventListener("change", () => preset(estado.tipo, $("marco").value));
  document.querySelectorAll("[data-tom]").forEach(botao => botao.addEventListener("click", () => {
    estado.acabamento = botao.dataset.tom;
    preencher();
    atualizar();
  }));
  $("restaurar").addEventListener("click", () => {
    estado = { ...inicio };
    preencher();
    atualizar();
    status("Modelo inicial restaurado. Você pode personalizar novamente.");
  });

  const nomeArquivo = () => (estado.loja || "loja").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "loja";
  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function bloquear(valor) {
    ocupado = valor;
    document.querySelectorAll("fieldset, .acoes button").forEach(el => { el.disabled = valor; });
    $("baixar").textContent = valor ? "Preparando a arte…" : "Baixar arte em PNG ↓";
  }
  $("baixar").addEventListener("click", async () => {
    if (ocupado || !pronto) return;
    if (!$("data").reportValidity()) return;
    bloquear(true);
    status("Gerando PNG em 1080 × 1920 px…");
    try {
      await ultimaAtualizacao;
      const corpo = iframe.contentDocument.body;
      const svgUrl = await htmlToImage.toSvg(corpo, { width: 1080, height: 1920, pixelRatio: 1,
        fontEmbedCSS: fontes, skipAutoScale: true });
      // O navegador absolutiza referências de gradientes do iframe como about:srcdoc#id.
      // Na imagem independente, essas referências precisam voltar a ser locais.
      const estilo = iframe.contentWindow.getComputedStyle(corpo);
      const svg = decodeURIComponent(svgUrl.slice(svgUrl.indexOf(",") + 1))
        .replace(/url\((?:&quot;|["'])?[^)#]*#([\w-]+)(?:&quot;|["'])?\)/g, "url(#$1)")
        // html-to-image copia o SVG interno sem resolver suas variáveis de cor.
        .replace(/var\((--[\w-]+)\)/g, (original, nome) => estilo.getPropertyValue(nome).trim() || original);
      const imagem = new Image();
      imagem.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      await imagem.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      canvas.getContext("2d").drawImage(imagem, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob || blob.size < 1000) throw new Error("Imagem vazia");
      baixar(blob, `placa-performance-${nomeArquivo()}.png`);
      status("PNG pronto. O download foi solicitado ao navegador.");
    } catch (erro) {
      console.error(erro);
      status("Não foi possível gerar o PNG. Tente no Chrome ou Edge, ou salve seu molde para continuar depois.");
    } finally { bloquear(false); }
  });
  $("salvar").addEventListener("click", () => {
    const copia = document.documentElement.cloneNode(true);
    copia.querySelector("body").removeAttribute("data-ambiente");
    copia.querySelector("#configuracao-salva").textContent = JSON.stringify(estado).replace(/</g, "\\u003c");
    copia.querySelector("#previa").removeAttribute("srcdoc");
    copia.querySelector(".rodape a")?.remove();
    copia.querySelector("#status").textContent = "Molde salvo. Edite os campos para criar uma nova arte.";
    copia.querySelectorAll("fieldset, .acoes button").forEach(el => { el.disabled = false; });
    baixar(new Blob(["<!doctype html>\n" + copia.outerHTML], {type:"text/html;charset=utf-8"}), `molde-performance-${nomeArquivo()}.html`);
    status("Molde salvo com seus dados. Abra o HTML baixado para editar novamente.");
  });

  const redimensionar = () => { iframe.style.transform = `scale(${$('palco').clientWidth / 1080})`; };
  new ResizeObserver(redimensionar).observe($("palco"));
  iframe.addEventListener("load", () => {
    pronto = typeof iframe.contentWindow.atualizarPlaca === "function";
    if (!pronto) { status("Não foi possível abrir a arte. Reabra o arquivo no Chrome ou Edge."); return; }
    atualizar();
    redimensionar();
  });
  preencher();
  iframe.srcdoc = JSON.parse($("modelo-placa").textContent);
})();
