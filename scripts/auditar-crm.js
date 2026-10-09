/* ============================================================
   AUDITAR O CRM — medir as rebarbas em vez de fotografar

   Colado (ou injetado) numa aba do CRM já logada, devolve em texto curto
   o que está fora do lugar na tela aberta, na largura atual da janela.
   Nasceu em 09/10/2026, quando o Rafael pediu uma rodada de polimento
   ("rebarbas, itens desenquadrados, linha quebrando") sem gastar token
   com prints: o print de cada tela em quatro larguras custava mais que o
   conserto.

   O que mede:
     1. ROLA     a página anda para o lado (o .app tem overflow-x: clip,
                 então isso some da vista em vez de aparecer)
     2. VAZA     elemento que passa da caixa do pai ou da tela
     3. CORTA    texto cortado por reticências ou overflow hidden
     4. QUEBRA   botão, chip, rótulo ou título curto em duas linhas
     5. ENCAVALA irmãos na mesma linha passando um por cima do outro
     6. TORTO    itens de uma linha flex de botões fora do mesmo topo

   Uso: rodar `auditarCrm()` no console da aba; devolve um array de
   linhas "TIPO | seletor | detalhe". O mesmo arquivo é lido pelo Claude
   e injetado pelo Chrome, por isso é JS puro, sem import.

   Para medir outra largura (o Chrome não encolhe a janela até 390), a
   tela abre num <iframe> do tamanho certo na mesma aba, e a função roda
   lá dentro com `iframe.contentWindow.eval(auditarCrm.toString() + ";auditarCrm()")`.

   DUAS ARMADILHAS DA ABA OCULTA (09/10/2026), as duas custaram meia hora:
   - depois de 5 min oculta, o Chrome solta os setTimeout da página só uma
     vez por minuto: esperar com um timer num Web Worker, que não é segurado;
   - o React só troca o esqueleto do loading.tsx pelo conteúdo no próximo
     quadro de animação, e aba oculta não desenha quadro: a tela fica no
     "Abrindo os projetos..." para sempre. Fazer a troca à mão: cada
     <div id="S:n"> vai para o lugar do <template id="B:n">.
   E janela MINIMIZADA não tem tamanho nenhum: não mede nada.

   O que NÃO é defeito, e a lista confirmou: chip de duas linhas (título +
   descrição), botão menor de propósito ao lado do principal (btnMini,
   btnLeve), e as reticências da tecla de seta do Hoje, que são desenho.
   ============================================================ */

function auditarCrm() {
  const W = window.innerWidth;
  const achados = [];
  const visto = new Set();

  /* Um nome legível para o elemento: a classe do CSS Module sem o hash
     ("crm_btnAcao__x1y2" vira "btnAcao"), o pai junto, e o texto curto. */
  const nome = (el) => {
    const cls = (e) =>
      [...(e.classList || [])].map((c) => c.replace(/^[a-z]+_/, "").replace(/__[A-Za-z0-9_-]+$/, "")).slice(0, 2).join(".") ||
      e.tagName.toLowerCase();
    const txt = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${el.parentElement ? cls(el.parentElement) + " > " : ""}${cls(el)}${txt ? ` "${txt}"` : ""}`;
  };
  const anota = (tipo, el, detalhe) => {
    const chave = tipo + nome(el);
    if (visto.has(chave)) return;
    visto.add(chave);
    achados.push(`${tipo} | ${nome(el)} | ${detalhe}`);
  };
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };
  /* Dentro de um trilho que rola de propósito (overflow-x auto/scroll), sair
     da caixa é o comportamento, não defeito. */
  const dentroDeRolagem = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll") return true;
    }
    return false;
  };

  // 1. a página rola para o lado
  const larguraDoc = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (larguraDoc > W + 1) achados.push(`ROLA | página | ${larguraDoc}px numa janela de ${W}px`);

  const todos = [...document.querySelectorAll("body *")].filter((e) => !e.closest("nextjs-portal")).filter(visivel);

  for (const el of todos) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();

    // 2. vaza da tela (só o que tem texto ou é controle, para não acusar enfeite)
    const temTexto = (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) || /^(BUTTON|A|INPUT|SELECT|TEXTAREA|IMG)$/.test(el.tagName);
    if (temTexto && !dentroDeRolagem(el) && (r.right > W + 1 || r.left < -1) && cs.position !== "fixed") {
      anota("VAZA", el, `sai da tela (${Math.round(r.left)} a ${Math.round(r.right)} de ${W})`);
    }
    // 2b. conteúdo maior que a própria caixa, sem rolagem prevista
    if (temTexto && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && !["auto", "scroll"].includes(cs.overflowX)) {
      const cortado = cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis";
      // 3. corta
      if (cortado) anota("CORTA", el, `${el.scrollWidth - el.clientWidth}px de texto escondidos${cs.textOverflow === "ellipsis" ? " (reticências)" : ""}`);
      else if (!dentroDeRolagem(el)) anota("VAZA", el, `o conteúdo passa ${el.scrollWidth - el.clientWidth}px da caixa`);
    }

    // 4. quebra: controle ou rótulo curto que virou duas linhas
    const curto = /^(BUTTON|A|LABEL)$/.test(el.tagName) || /btn|chip|rotulo|selo|situacao|tag|monte|num/i.test(typeof el.className === "string" ? el.className : "");
    if (curto && temTexto && (el.innerText || "").trim().length <= 40) {
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
      const altTexto = r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth);
      if (altTexto > lh * 1.6 && !/\n/.test(el.innerText || "")) anota("QUEBRA", el, `${Math.round(altTexto / lh)} linhas (${Math.round(r.width)}px de largura)`);
    }
  }

  // 5 e 6. irmãos numa mesma linha flex: encavalados ou fora do mesmo topo
  for (const pai of todos) {
    const cs = getComputedStyle(pai);
    if (!cs.display.includes("flex") || cs.flexDirection.startsWith("column")) continue;
    const filhos = [...pai.children].filter(visivel).filter((f) => !["absolute", "fixed"].includes(getComputedStyle(f).position));
    for (let i = 1; i < filhos.length; i++) {
      const a = filhos[i - 1].getBoundingClientRect();
      const b = filhos[i].getBoundingClientRect();
      const mesmaLinha = Math.abs(a.top - b.top) < Math.min(a.height, b.height) / 2;
      if (mesmaLinha && b.left < a.right - 2 && b.right > a.left + 2) anota("ENCAVALA", filhos[i], `por cima de ${nome(filhos[i - 1])}`);
    }
    const botoes = filhos.filter((f) => /^(BUTTON|A)$/.test(f.tagName) || /btn(?!Leve)|chip/i.test(typeof f.className === "string" ? f.className : ""));
    if (botoes.length >= 2 && cs.alignItems !== "baseline") {
      const tops = botoes.map((f) => Math.round(f.getBoundingClientRect().top));
      const alturas = botoes.map((f) => Math.round(f.getBoundingClientRect().height));
      const linhaUnica = Math.max(...tops) - Math.min(...tops) < Math.max(...alturas);
      if (linhaUnica && (Math.max(...tops) - Math.min(...tops) > 2 || Math.max(...alturas) - Math.min(...alturas) > 2)) {
        anota("TORTO", pai, `botões da mesma linha com topo ${Math.min(...tops)}-${Math.max(...tops)} e altura ${Math.min(...alturas)}-${Math.max(...alturas)}`);
      }
    }
  }
  return achados;
}
