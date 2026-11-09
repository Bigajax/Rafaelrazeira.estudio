"use client";

/* ============================================================
   A /loja-online-v2 (08/11/2026), pedido do Rafael: "uma segunda versão
   neste estilo [a página de cadastro do TikTok for Business] para vender
   loja online. Simples, direto e mostrando resultado; neste primeiro
   momento pode ser fake".

   A estrutura da referência, nas cores da casa (tinta no lugar do preto,
   o rosa do botão, o verde da batida):
   1. a faixa de cima com a oferta;
   2. o hero escuro: manchete grande, uma linha, o botão; à direita a compra
      no celular sobre dois círculos;
   3. o formulário NA página (Passo 1 de 2), sem modal;
   4. o bloco escuro dos resultados: a lista e o cartão do gráfico;
   5. as histórias de sucesso, três cartões com o número em rosa;
   6. o bloco escuro de "no ar em 15 dias úteis", com o painel;
   7. o rodapé de uma linha.

   O QUE É ILUSTRATIVO: o cartão do gráfico (RESULTADO) e as três histórias
   (HISTORIAS). Ficam nas constantes abaixo, cada um com o aviso na tela
   ("Dados ilustrativos", como a própria referência faz) e sem nome de loja
   real: atribuir número inventado a cliente de verdade seria mentir em nome
   dele. Antes de anúncio apontar para cá: trocar por número medido ou tirar.

   O TERMO (08/11, "vamos tentar e-commerce"): aqui o produto se chama
   "e-commerce" no texto todo, para testar contra o "loja online" da v1. O
   preço e o formulário são os mesmos (FormAmostra produto="e-commerce").

   O formulário é o mesmo da /loja-online (FormAmostra): o lead entra como
   e-commerce no CRM e a rota confere o @. A medição separa a página
   (initTracking com page "loja-online-v2").
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import s from "./loja-online.module.css";
import t from "./v2.module.css";
import { FormAmostra, VideoNaTela } from "./LojaOnline";
import { initTracking } from "@/components/vitrine/tracking";
import { ligarAncoras } from "@/components/vitrine/ancora";
import { linkWhatsApp } from "@/lib/contato";
import { DEGRAUS, MENSALIDADE_ECOMMERCE } from "@/lib/oferta-performance";

const LOJA = DEGRAUS.loja;
const real = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
const IMPLANTACAO = real(LOJA.cheio);
const MENSAL = real(MENSALIDADE_ECOMMERCE);
const CTA = "Quero a minha amostra";

/* ---------- ILUSTRATIVO: trocar por número medido antes do anúncio ---------- */
const RESULTADO = {
  cresceu: "+38%", valor: "R$ 18.420", legenda: "em vendas pagas no site, no último mês",
  /* o impacto em dinheiro (09/11, "dê mais impacto financeiro e de crescimento") */
  numeros: [["+R$ 5.080", "a mais por mês"], ["R$ 60.960", "a mais em 12 meses"], ["62%", "das vendas fora do horário"]] as [string, string][],
  /* o gráfico no jeito da referência do Rafael: a barra cinza é o que já vendia, a verde
     é o que entra pelo site, e a seta sobe por cima */
  meses: ["Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov"],
  cinza: [52, 60, 58, 66, 70, 76, 86], verde: [30, 38, 34, 46, 50, 58, 72],
};
/* 09/11 ("o que dá para melhorar o impacto aqui?", sugestões 1, 2 e 3 aprovadas): um número
   gigante por cartão, o antes e o depois EM REAIS por mês com a barrinha, e o primeiro
   cartão em destaque. Continua ILUSTRATIVO, com o selo "Exemplo" e a nota. */
const HISTORIAS: { loja: string; contexto: string; grande: string; legenda: string; antes: number; depois: number; extra: [string, string] }[] = [
  { loja: "Loja de tênis", contexto: "Vendia só pelo direct.", grande: "2,4x", legenda: "mais vendas pelo site",
    antes: 4200, depois: 10080, extra: ["42%", "dos pedidos pagos fora do horário comercial"] },
  { loja: "Moda praia", contexto: "Fechava cada venda na conversa.", grande: "+31%", legenda: "nas vendas pelo site",
    antes: 6800, depois: 8900, extra: ["2,3", "peças por pedido, em média"] },
  { loja: "Moda feminina", contexto: "Respondia tamanho e Pix o dia todo.", grande: "3 dias", legenda: "até a primeira venda paga no site",
    antes: 0, depois: 5600, extra: ["60%", "menos perguntas no direct"] },
];
const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/* os três passos da compra, com a ilustração (arquivo em /assets/undraw, viewBox) */
const COMPRA: [string, number, number, string, string][] = [
  ["add-to-cart", 960, 710, "Escolhe e põe na sacola", "Vê a numeração que tem e junta quantas peças quiser, sem perguntar no direct."],
  ["qr-code-scan", 399, 800, "Paga no Pix ou no cartão", "O frete aparece pelo CEP e o pagamento cai na conta da loja."],
  ["mobile-app-data", 799, 880, "O pedido chega pago", "Você vê no painel do celular o que vendeu, para quem e o que separar."],
];

/* a linha do tempo do prazo (09/11) */
const PASSOS_PRAZO: [string, string][] = [
  ["Hoje", "Você manda o @ da loja"],
  ["Em até 24h", "A amostra com as suas peças chega no WhatsApp"],
  ["Você aprova", "Gostou da amostra? A montagem começa"],
  [`${LOJA.prazo.charAt(0).toUpperCase()}${LOJA.prazo.slice(1)}`, "O e-commerce no ar, vendendo"],
];

const Check = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="M7 12.4 10.4 15.8 17 9" fill="none" stroke="var(--ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Seta = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>;

/* ---------- o iPhone com o vídeo rodando na tela (09/11, "o vídeo não vai rolar?") ----------
   A moldura do mockup do Unblast com a tela VAZADA (iphone-moldura-800.webp) por cima, e
   por baixo a tela de 390x844: a barra 9:41, a ilha e o vídeo da compra regravado no tamanho
   da tela (gravar.mjs iphone, 390x794 a 2x, 09/11; o de 4:5 cortava as laterais). A tela entra em perspectiva pela mesma homografia do encaixe estático
   (scripts/loja-online-video/iphone-compor), nas coordenadas do JPG de 2500x2857; o
   palco tem o tamanho do recorte (1060x1660) e é escalado para a largura do aparelho. */
const TELA_3D = "matrix3d(1.59805,-0.240212,0,-5.9e-05,-0.403932,1.63728,0,-5.33e-05,0,0,1,0,1043.5,695.8,0,1)";
function IphoneComVideo() {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = caixa.current; if (!el) return;
    const medir = () => el.style.setProperty("--k", String(el.clientWidth / 1060));
    medir(); const ro = new ResizeObserver(medir); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div ref={caixa} className={t.iphoneCaixa}>
    <div className={t.iphonePalco}>
      <div className={t.iphoneOrigem}>
        <div className={t.iphoneTela} style={{ transform: TELA_3D }}>
          <div className={t.statusBar}><span>9:41</span><span className={t.statusIcones}><b /><b /></span></div>
          <i className={t.ilha} />
          <VideoNaTela className={t.iphoneVideo} largura={780} altura={1588} capa="/assets/demo/loja-online-compra-iphone-capa.webp"
            fontes={[["/assets/demo/loja-online-compra-iphone.webm", "video/webm"], ["/assets/demo/loja-online-compra-iphone.mp4", "video/mp4"]]}
            rotulo="Demonstração de uma compra no e-commerce, no celular." />
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={t.iphoneMoldura} src="/assets/lojas-no-ar/iphone-moldura-800.webp" width={800} height={1253} alt="" />
    </div>
  </div>;
}

/* o gráfico de barras com a seta subindo, em SVG (600x300) */
function Grafico() {
  const n = RESULTADO.meses.length, larg = 600, alt = 260, passo = larg / n, bw = passo * .56;
  const y = (v: number) => alt - (v / 100) * alt;
  const topo = RESULTADO.verde.map((v, i) => [i * passo + passo / 2, y(v)] as const);
  /* a seta: um zigue-zague que sobe acima das verdes e passa do último mês */
  const seta = RESULTADO.verde.map((v, i) => [i * passo + passo / 2, y(v + 10 + (i % 2 ? 16 : 0))] as const);
  const fim = [larg - 24, y(100) + 22] as const;
  const caminho = [...seta, fim].map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}`).join(" ");
  /* a ponta da seta, na direção do último trecho */
  const [ux, uy] = seta[n - 1], dx = fim[0] - ux, dy = fim[1] - uy, d = Math.hypot(dx, dy), ex = dx / d, ey = dy / d;
  const ponta = [[fim[0] + ex * 20, fim[1] + ey * 20], [fim[0] - ex * 10 - ey * 20, fim[1] - ey * 10 + ex * 20], [fim[0] - ex * 10 + ey * 20, fim[1] - ey * 10 - ex * 20]].map(p => p.map(v => v.toFixed(1)).join(",")).join(" ");
  return <svg className={t.graficoSvg} viewBox={`0 0 ${larg} ${alt + 26}`} role="img" aria-label="Vendas por mês subindo de maio a novembro (dados ilustrativos)">
    {RESULTADO.cinza.map((v, i) => <rect key={"c" + i} x={i * passo + (passo - bw) / 2} y={y(v)} width={bw} height={alt - y(v)} rx="3" fill="#4a5156" />)}
    {RESULTADO.verde.map((v, i) => <rect key={"v" + i} className={t.barraVerde} style={{ animationDelay: `${i * 90}ms` }} x={i * passo + (passo - bw) / 2} y={y(v)} width={bw} height={alt - y(v)} rx="3" fill="var(--verde)" />)}
    <polyline points={topo.map(p => p.join(",")).join(" ")} fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" opacity=".85" />
    <path className={t.seta} d={caminho} fill="none" stroke="#fff" strokeWidth="14" strokeLinejoin="round" strokeLinecap="round" pathLength={1} />
    <polygon points={ponta} fill="#fff" className={t.setaPonta} />
    {RESULTADO.meses.map((m, i) => <text key={m} x={i * passo + passo / 2} y={alt + 20} textAnchor="middle" fill="#8a9094" fontSize="14">{m}</text>)}
  </svg>;
}

function Botao({ onde, children = CTA }: { onde: string; children?: React.ReactNode }) {
  return <a className={t.botao} href="#amostra" data-cta={`v2_${onde}`} data-cta-dest="form">{children}</a>;
}

export function LojaOnlineV2() {
  useEffect(() => {
    initTracking({ page: "loja-online-v2", valor: LOJA.cheio, currency: "BRL", lang: "pt" });
    ligarAncoras();
  }, []);

  /* ?previa (09/11, "retire os avisos para eu ver como fica"): esconde os avisos só nesta
     visita, para o Rafael julgar o visual. A página normal mostra todos: os números são de
     exemplo e a Iconic não tem checkout no ar. NUNCA apontar anúncio para o link com ?previa. */
  const [previa, setPrevia] = useState(false);
  /* só no computador do Rafael: no ar, o ?previa não esconde nada */
  useEffect(() => { setPrevia(["localhost", "127.0.0.1", "127.0.0.2", "[::1]"].includes(location.hostname) && new URLSearchParams(location.search).has("previa")); }, []);

  return <div className={`${s.page} ${t.v2} ${previa ? t.semAvisos : ""}`}>
    {/* 1. a faixa da oferta */}
    <a className={t.faixa} href="#amostra" data-cta="v2_faixa" data-cta-dest="form">
      <span>Amostra do seu e-commerce com as suas peças <b>em até 24h, sem custo</b>.</span>
      <span className={t.faixaLink}>Pedir agora <Seta /></span>
    </a>

    <main>
      {/* 2. o hero escuro */}
      <section className={`${t.escuro} ${t.hero}`}>
        <div className={t.heroTexto}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={t.marca} src="/assets/marca/rr-monograma.webp" width={66} height={36} alt="Rafael Razeira Estúdio" />
          <h1 className={t.h1}>Faça a sua loja vender mais com o e-commerce.</h1>
          <p className={t.lead}>O cliente escolhe o tamanho, calcula o frete e paga no Pix ou no cartão, sem esperar você responder o direct. A venda fecha até de madrugada.</p>
          <Botao onde="hero" />
        </div>
        <div className={t.heroCena} aria-hidden>
          {/* 09/11 ("quero um iPhone aqui e as bolas atrás melhores"): o iPhone (primeiro em
              CSS, depois o mockup do Unblast, abaixo) com a tela da Iconic em 390x844. Atrás, um disco verde grande, o rosa menor encostado e dois
              aros finos em volta do aparelho, em vez das três bolas soltas. */}
          <span className={`${t.circulo} ${t.circuloVerde}`} />
          <span className={`${t.circulo} ${t.circuloRosa}`} />
          <span className={`${t.circulo} ${t.aro1}`} />
          <span className={`${t.circulo} ${t.aro2}`} />
          {/* 09/11: o iPhone 16 Pro do Unblast (uso comercial livre), com a tela da Iconic
              encaixada em perspectiva e o fundo recortado (scripts/loja-online-video/iphone-compor) */}
          <div className={t.iphone}>
            <IphoneComVideo />
            {/* a tela é a vitrine REAL da Iconic, que não tem checkout no ar: nada de
                "pedido pago" ao lado dela, só o aviso de demonstração */}
            <span className={t.selo} data-aviso><i />Demonstração</span>
          </div>
        </div>
      </section>

      {/* 3. o formulário na página */}
      <section className={t.cadastro} id="amostra" aria-labelledby="amostra-titulo">
        {/* 09/11 ("preciso melhorar aqui"): um título só (o do formulário saiu), os dois
            passos lado a lado com o atual aceso, os campos um embaixo do outro em cinza
            (no cartão branco eles sumiam) e as garantias embaixo do botão */}
        <h2 id="amostra-titulo" className={t.cadastroTitulo}>Veja o seu e-commerce antes de pagar</h2>
        <p className={t.cadastroSub}>Manda o @ da loja. Eu monto uma amostra com as suas peças e te mando no WhatsApp.</p>
        <ol className={t.passos}>
          <li className={t.passoAtivo}><b>1</b>Você manda o @</li>
          <li><b>2</b>A amostra chega em até 24h</li>
        </ol>
        <div className={t.cadastroForm}>
          <FormAmostra produto="e-commerce" semTitulo />
          <ul className={t.garantias}><li><Check />Sem custo</li><li><Check />Sem compromisso</li><li><Check />Resposta no WhatsApp</li></ul>
        </div>
      </section>

      {/* 3b. como o cliente compra (09/11, as ilustrações do unDraw que o Rafael baixou,
          com o roxo trocado pelo rosa da casa; licença livre, sem crédito). No branco:
          o traço delas é quase preto e sumiria nos blocos escuros. */}
      <section className={t.compra} aria-labelledby="compra-titulo">
        <h2 id="compra-titulo" className={t.h2Claro}>Como o seu cliente compra</h2>
        <ol className={t.compraPassos}>
          {COMPRA.map(([img, w, h, titulo, texto], i) => <li key={img}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/undraw/${img}.svg`} width={w} height={h} alt="" loading="lazy" decoding="async" />
            <p className={t.compraNum}>{String(i + 1).padStart(2, "0")}</p>
            <p className={t.compraTitulo}>{titulo}</p>
            <p className={t.compraTexto}>{texto}</p>
          </li>)}
        </ol>
      </section>

      {/* 4. os resultados */}
      <section className={`${t.escuro} ${t.dupla}`}>
        <div>
          <h2 className={t.h2}>Um e-commerce feito para vender mais.</h2>
          <ul className={t.lista}>
            <li><Check />Pix e cartão no próprio site</li>
            <li><Check />Frete calculado pelo CEP do cliente</li>
            <li><Check />Estoque por tamanho que baixa sozinho</li>
            <li><Check />Suporte direto comigo, no WhatsApp</li>
          </ul>
          <Botao onde="resultados" />
        </div>
        <figure className={t.grafico}>
          <p className={t.graficoTopo}><span>Crescimento</span><b>{RESULTADO.cresceu}</b></p>
          <div className={t.graficoCartao}>
            <p className={t.graficoValor}>{RESULTADO.valor}<span>{RESULTADO.legenda}</span></p>
            <Grafico />
          </div>
          <div className={t.numeros}>{RESULTADO.numeros.map(([n, r]) => <p key={r}><b>{n}</b>{r}</p>)}</div>
          <figcaption className={t.ilustrativo} data-aviso>*Dados ilustrativos</figcaption>
        </figure>
      </section>

      {/* 5. as histórias */}
      <section className={t.historias} aria-labelledby="historias-titulo">
        <h2 id="historias-titulo" className={t.h2Claro}>Lojas que passaram a vender pelo site</h2>
        <div className={t.cartoes}>
          {HISTORIAS.map((h, i) => { const max = Math.max(...HISTORIAS.map(x => x.depois));
            return <article key={h.loja} className={`${t.cartao} ${i === 0 ? t.cartaoDestaque : ""}`}>
            <p className={t.cartaoLoja}>{h.loja}<span data-aviso>Exemplo</span></p>
            <p className={t.cartaoContexto}>{h.contexto}</p>
            <p className={t.cartaoGrande}><b>{h.grande}</b>{h.legenda}</p>
            <div className={t.antesDepois}>
              <p><span>Antes</span><i style={{ width: `${Math.max(2, (h.antes / max) * 100)}%` }} /><b>{reais(h.antes)}</b></p>
              <p><span>Depois</span><i className={t.barraDepois} style={{ width: `${(h.depois / max) * 100}%` }} /><b>{reais(h.depois)}</b></p>
              <small>vendas no site por mês</small>
            </div>
            <p className={t.cartaoExtra}><b>{h.extra[0]}</b> {h.extra[1]}</p>
            <a className={t.cartaoLink} href="#amostra" data-cta="v2_historia" data-cta-dest="form">Quero a minha amostra <Seta /></a>
          </article>; })}
        </div>
        <p className={t.ilustrativoClaro} data-aviso>*Exemplos ilustrativos.</p>
      </section>

      {/* 6. no ar em 15 dias úteis */}
      <section className={`${t.escuro} ${t.dupla}`}>
        <div>
          <h2 className={t.h2}>Seu e-commerce no ar em {LOJA.prazo}.</h2>
          {/* 09/11 (sugestões 2, 3 e 4): a linha do tempo com o prazo em cada ponto, o preço num
              bloco próprio e o painel da Loja Modelo (não o da Iconic, que não vende pelo site) */}
          <ol className={t.tempo}>
            {PASSOS_PRAZO.map(([quando, oque], i) => <li key={quando} className={i === PASSOS_PRAZO.length - 1 ? t.tempoFim : undefined}><b>{quando}</b>{oque}</li>)}
          </ol>
          <div className={t.preco}>
            <p><b>{IMPLANTACAO}</b><span>no Pix ou em até 12x no cartão</span></p>
            <i aria-hidden>+</i>
            <p><b>{MENSAL}<small>/mês</small></b><span>só depois da entrega</span></p>
          </div>
          <Botao onde="prazo" />
        </div>
        {/* 09/11: o MacBook Pro 16 do Unblast (Creatoom, uso comercial livre), com a tela vazada
            (scripts/loja-online-video/macbook-moldura.cjs) e o vídeo do painel por baixo */}
        <div className={t.macbook}>
          <div className={t.macbookTela}>
            <VideoNaTela largura={960} altura={600} capa="/assets/demo/loja-online-painel-modelo-capa.webp"
              fontes={[["/assets/demo/loja-online-painel-modelo.mp4", "video/mp4"], ["/assets/demo/loja-online-painel-modelo.webm", "video/webm"]]}
              rotulo="Simulação do painel da Loja Modelo: o pedido chega pago e o estoque do tamanho baixa sozinho." />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={t.macbookMoldura} src="/assets/lojas-no-ar/macbook-moldura-860.webp" width={860} height={525} alt="" />
        </div>
      </section>
    </main>

    {/* 7. o rodapé */}
    <footer className={t.rodape}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/marca/rr-nome.webp" width={593} height={96} alt="Rafael Razeira Estúdio" />
      <nav aria-label="Contato">
        <a href="/termos">Termos</a>
        <a href="/privacidade">Privacidade</a>
        <a href={linkWhatsApp("Oi Rafael! Vim pela página do e-commerce e quero tirar uma dúvida.")} target="_blank" rel="noopener" data-cta="v2_rodape" data-cta-dest="whatsapp">Fale comigo</a>
      </nav>
    </footer>
  </div>;
}
