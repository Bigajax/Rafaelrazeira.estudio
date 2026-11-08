/* Injetado na página da Iconic SÓ no navegador de gravação (nada sai dele).
   Desenha o cursor, a rolagem suave e as telas do pagamento simulado, que
   ainda não existe no site dela: é a demonstração da Loja online. */
(() => {
  const PRETO = "#020760", AZUL = "#014e91", CIANO = "#00afd4", LIMA = "#c6f36b", FUNDO = "#f2f4f5", FIO = "#d3dae1", APOIO = "#4b5283";
  const css = `
  #sim-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:none}
  #sim-cursor svg{display:block;filter:drop-shadow(0 2px 3px #0005)}
  .sim-toque{position:fixed;z-index:2147483646;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:#014e9155;pointer-events:none;animation:simToque .5s ease-out forwards}
  @keyframes simToque{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
  #sim-co{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:${FUNDO};overflow:auto;scrollbar-width:none;font-family:var(--font-corpo,Arial,sans-serif);color:${PRETO};opacity:0;transition:opacity .35s ease}
  #sim-co.on{opacity:1}
  #sim-co *{box-sizing:border-box}
  .sim-wrap{max-width:1100px;margin:0 auto;padding:22px 24px;display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:22px;align-items:start}
  .sim-card{background:#fff;border:1px solid ${FIO};border-radius:14px;padding:22px}
  .sim-h{font-family:var(--font-display,"Arial Black",sans-serif);font-size:22px;line-height:1.1;margin:0 0 4px;color:${PRETO}}
  .sim-sub{margin:0 0 16px;font-size:13px;color:${APOIO}}
  .sim-passos{display:flex;gap:8px;margin:0 0 18px;font-size:12px;font-weight:700;color:${APOIO}}
  .sim-passos span{padding:6px 12px;border-radius:999px;background:${FUNDO}}
  .sim-passos .at{background:${PRETO};color:#fff}
  .sim-passos .ok{background:#e3f3e9;color:#1f7a45}
  .sim-lbl{display:block;font-size:12px;font-weight:700;margin:0 0 6px}
  .sim-campo{display:flex;align-items:center;justify-content:space-between;height:46px;padding:0 14px;border:1.5px solid ${FIO};border-radius:10px;font-size:16px;background:#fff}
  .sim-campo.foco{border-color:${AZUL};box-shadow:0 0 0 3px #014e9122}
  .sim-campo small{font-size:12px;font-weight:700;color:#1f7a45}
  .sim-dados{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 14px}
  .sim-dados div{padding:10px 12px;border-radius:10px;background:${FUNDO};font-size:13px}
  .sim-dados b{display:block;font-size:11px;color:${APOIO};font-weight:700;margin-bottom:2px}
  .sim-ops{display:grid;gap:8px;margin-top:12px}
  .sim-op{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1.5px solid ${FIO};border-radius:10px;font-size:14px;opacity:0;transform:translateY(6px);transition:all .3s ease}
  .sim-op.v{opacity:1;transform:none}
  .sim-op small{display:block;font-size:12px;color:${APOIO}}
  .sim-op b{font-size:14px}
  .sim-op.m{border-color:${PRETO};box-shadow:inset 0 0 0 1px ${PRETO};background:#f7f9ff}
  .sim-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:52px;margin-top:16px;border:0;border-radius:999px;background:${AZUL};color:#fff;font-family:var(--font-display,"Arial Black",sans-serif);font-size:15px;letter-spacing:.01em}
  .sim-btn.lima{background:${LIMA};color:${PRETO}}
  .sim-abas{display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:999px;background:${FUNDO};margin:0 0 16px}
  .sim-abas span{display:grid;place-items:center;height:38px;border-radius:999px;font-weight:700;font-size:14px;color:${APOIO}}
  .sim-abas .a{background:#fff;color:${PRETO};box-shadow:0 1px 3px #0002}
  .sim-pix{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center}
  .sim-qr{width:150px;height:150px;padding:10px;border:1px solid ${FIO};border-radius:12px;background:#fff}
  .sim-qr svg{display:block;width:100%;height:100%}
  .sim-espera{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;color:${APOIO}}
  .sim-espera i{width:14px;height:14px;border-radius:50%;border:2px solid ${FIO};border-top-color:${AZUL};animation:simGira .8s linear infinite}
  @keyframes simGira{to{transform:rotate(360deg)}}
  .sim-aprov{display:grid;justify-items:center;text-align:center;padding:26px 10px 10px}
  .sim-aprov .ck{display:grid;place-items:center;width:74px;height:74px;border-radius:50%;background:#1f7a45;color:#fff;transform:scale(.4);opacity:0;transition:all .45s cubic-bezier(.2,.9,.3,1.3)}
  .sim-aprov.v .ck{transform:none;opacity:1}
  .sim-aprov h3{font-family:var(--font-display,"Arial Black",sans-serif);font-size:28px;margin:16px 0 6px;color:${PRETO}}
  .sim-aprov p{margin:0;font-size:14px;color:${APOIO}}
  .sim-res .item{display:grid;grid-template-columns:84px 1fr;gap:14px;align-items:center;padding-bottom:16px;border-bottom:1px solid ${FIO}}
  .sim-res img{width:84px;height:84px;object-fit:cover;border-radius:10px;background:${FUNDO}}
  .sim-res .nome{font-family:var(--font-display,"Arial Black",sans-serif);font-size:15px;line-height:1.15}
  .sim-res .det{font-size:13px;color:${APOIO};margin-top:4px}
  .sim-lin{display:flex;justify-content:space-between;font-size:14px;margin-top:12px}
  .sim-lin.t{font-size:17px;font-weight:700;padding-top:12px;border-top:1px solid ${FIO}}
  .sim-lin .pix{color:#1f7a45;font-weight:700}
  .sim-seg{display:flex;align-items:center;gap:8px;margin-top:16px;font-size:12px;color:${APOIO}}
  .sim-esc{display:none}
  @media (max-width:700px){
    .sim-wrap{grid-template-columns:minmax(0,1fr);padding:12px;gap:12px}
    .sim-res{display:none}
    .sim-card{padding:16px}
    .sim-h{font-size:19px}
    .sim-dados{display:none}
    .sim-pix{grid-template-columns:110px 1fr;gap:12px}
    .sim-qr{width:110px;height:110px;padding:7px}
    .sim-esc{display:flex}
    .sim-sub{display:none}
    .sim-passos{margin-bottom:12px}
    .sim-op{padding:9px 12px}
    .sim-btn{height:46px;margin-top:12px}
    .sim-aprov{padding:18px 6px 8px}
    .sim-aprov h3{font-size:22px}
  }`;

  const QR = (() => {
    const n = 25, cel = [];
    const canto = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (canto(x, y)) continue;
      if (((x * 7 + y * 13 + x * y * 3) % 5) < 2) cel.push(`M${x} ${y}h1v1h-1z`);
    }
    const olho = (x, y) => `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
    return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${cel.join("")}${olho(0, 0)}${olho(n - 7, 0)}${olho(0, n - 7)}" fill="${PRETO}" fill-rule="evenodd"/></svg>`;
  })();

  function montar() {
    if (document.getElementById("sim-cursor")) return;
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const c = document.createElement("div"); c.id = "sim-cursor";
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 2.5v17.2l4.6-4.3 2.9 6.6 3-1.3-2.9-6.5h6.2z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    /* no celular não existe setinha: só o toque */
    if (matchMedia("(pointer: coarse)").matches) c.style.display = "none";
    addEventListener("mousemove", e => { c.style.transform = `translate(${e.clientX - 4}px,${e.clientY - 2}px)`; }, true);
    addEventListener("mousedown", e => {
      const t = document.createElement("div"); t.className = "sim-toque"; t.style.left = e.clientX + "px"; t.style.top = e.clientY + "px";
      document.body.appendChild(t); setTimeout(() => t.remove(), 600);
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();

  /* o convite do Grupo VIP abre sozinho por cima da peça: some na gravação */
  setInterval(() => {
    for (const el of document.querySelectorAll("body *")) {
      if (el.id && el.id.startsWith("sim-")) continue;
      const cs = getComputedStyle(el);
      /* o convite tem o botão "Entrar no Grupo VIP"; o topo da loja (que também
         fala em Grupo VIP no menu) tem a busca, e nunca é escondido */
      if ((cs.position === "fixed" || cs.position === "sticky") && !el.querySelector('input[placeholder*="Procure"]')
          && [...el.querySelectorAll("button")].some(b => /Entrar no Grupo VIP/i.test(b.textContent || ""))) el.style.display = "none";
    }
    const b = document.getElementById("sim-comprar");
    if (b && !b.dataset.pintado) {
      b.dataset.pintado = "1";
      Object.assign(b.style, { background: AZUL, color: "#fff", borderColor: AZUL, fontWeight: "700" });
    }
  }, 120);

  /* a rolagem suave, com a mesma curva sempre */
  window.__rolar = (alvoY, ms) => new Promise(res => {
    const y0 = scrollY, d = alvoY - y0, t0 = performance.now();
    const passo = agora => {
      const p = Math.min(1, (agora - t0) / ms), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      scrollTo(0, y0 + d * e);
      if (p < 1) requestAnimationFrame(passo); else res();
    };
    requestAnimationFrame(passo);
  });

  /* o toque do celular (sem cursor) */
  window.__toque = (x, y) => {
    const t = document.createElement("div"); t.className = "sim-toque"; t.style.left = x + "px"; t.style.top = y + "px";
    document.body.appendChild(t); setTimeout(() => t.remove(), 600);
  };

  /* o checkout simulado, abaixo do topo real da loja */
  window.__checkout = ({ foto, nome, tam, preco }) => {
    const topo = document.querySelector("header");
    const alto = topo ? Math.max(0, Math.round(topo.getBoundingClientRect().bottom)) : 0;
    const co = document.createElement("div"); co.id = "sim-co"; co.style.top = alto + "px";
    const fmt = v => "R$ " + v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    co.innerHTML = `<div class="sim-wrap">
      <div class="sim-card" id="sim-passo">
        <div class="sim-passos"><span class="ok">Sacola</span><span class="at" id="sp-ent">Entrega</span><span id="sp-pag">Pagamento</span></div>
        <div id="sim-ent">
          <p class="sim-h">Para onde vai o seu par?</p>
          <p class="sim-sub">Digite o CEP para ver o frete e o prazo.</p>
          <div class="sim-dados"><div><b>Nome</b>Mariana Souza</div><div><b>E-mail</b>mariana@email.com</div></div>
          <span class="sim-lbl">CEP</span>
          <div class="sim-campo" id="sim-cep"><span id="sim-cep-txt" style="color:#9aa3b8">00000-000</span><small id="sim-cidade"></small></div>
          <div class="sim-ops">
            <div class="sim-op" data-i="0"><span>PAC<small>até 6 dias úteis</small></span><b>R$ 27,40</b></div>
            <div class="sim-op" data-i="1"><span>SEDEX<small>até 2 dias úteis</small></span><b>R$ 41,90</b></div>
            <div class="sim-op" data-i="2"><span>Retirar na loja<small>pronto em 1 dia útil</small></span><b>grátis</b></div>
          </div>
          <button class="sim-btn" id="sim-ir">Ir para o pagamento</button>
        </div>
        <div id="sim-pag" style="display:none">
          <p class="sim-h">Pagamento</p>
          <p class="sim-sub">Pix com aprovação na hora, ou cartão em até 12x.</p>
          <div class="sim-abas"><span class="a">Pix</span><span>Cartão</span></div>
          <div class="sim-pix"><div class="sim-qr">${QR}</div>
            <div><b style="font-size:20px">${fmt(preco + 27.4)}</b><div class="sim-sub" style="margin:4px 0 0">no Pix, com 5% de desconto</div>
            <button class="sim-btn lima" style="margin-top:12px;height:44px">Copiar o código Pix</button>
            <div class="sim-espera"><i></i><span>Esperando o pagamento</span></div></div>
          </div>
        </div>
        <div id="sim-ok" class="sim-aprov" style="display:none">
          <div class="ck"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg></div>
          <h3>Pagamento aprovado</h3>
          <p>Pedido 1048. O código de rastreio chega no seu e-mail.</p>
        </div>
      </div>
      <div class="sim-card sim-res">
        <p class="sim-h" style="font-size:17px;margin-bottom:14px">Resumo do pedido</p>
        <div class="item"><img src="${foto}" alt=""><div><div class="nome">${nome}</div><div class="det">Numeração ${tam}, 1 par</div></div></div>
        <div class="sim-lin"><span>Peça</span><span>${fmt(preco)} <span class="pix">no Pix</span></span></div>
        <div class="sim-lin"><span>Frete</span><span id="sim-fr">a calcular</span></div>
        <div class="sim-lin t"><span>Total</span><span id="sim-tot">${fmt(preco)}</span></div>
        <div class="sim-seg"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Pagamento seguro pelo Mercado Pago</div>
      </div>
    </div>`;
    document.body.appendChild(co);
    requestAnimationFrame(() => co.classList.add("on"));
    const $ = s => co.querySelector(s);
    return {
      focoCep: () => $("#sim-cep").classList.add("foco"),
      digita: async (txt, ms = 110) => {
        const el = $("#sim-cep-txt"); el.style.color = "inherit"; el.textContent = "";
        for (const ch of txt) { el.textContent += ch; await new Promise(r => setTimeout(r, ms)); }
        $("#sim-cep").classList.remove("foco");
        $("#sim-cidade").textContent = "Curitiba, PR";
      },
      opcoes: async () => { for (const o of co.querySelectorAll(".sim-op")) { o.classList.add("v"); await new Promise(r => setTimeout(r, 160)); } },
      marca: i => {
        co.querySelectorAll(".sim-op").forEach(o => o.classList.toggle("m", o.dataset.i === String(i)));
        $("#sim-fr").textContent = "R$ 27,40"; $("#sim-tot").textContent = fmt(preco + 27.4);
      },
      pagamento: () => { $("#sim-ent").style.display = "none"; $("#sim-pag").style.display = ""; $("#sp-ent").className = "ok"; $("#sp-pag").className = "at"; },
      aprovado: () => {
        $("#sim-pag").style.display = "none"; const ok = $("#sim-ok"); ok.style.display = ""; $("#sp-pag").className = "ok";
        requestAnimationFrame(() => requestAnimationFrame(() => ok.classList.add("v")));
      },
      mostra: s => co.querySelector(s).scrollIntoView({ block: "center", behavior: "smooth" }),
      centro: s => { const r = co.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
    };
  };
})();
