"use client";

/* ============================================================
   A /vitrine-digital SIMPLIFICADA (28/10/2026), na estrutura do mobbin.com

   Pedido do Rafael, com o print da home do Mobbin de referência: "hero está
   perfeito, agora vamos simplificar". Cada seção tem UMA ideia, o título
   centrado e uma imagem grande, sem texto corrido. Onze seções viraram
   oito: o problema, o como funciona, o processo, o que entra e o painel
   diziam a mesma coisa de quatro jeitos e foram absorvidos pela Jornada e
   pelas Etapas.

   As seções antigas continuam em sections.tsx, sem uso nesta página (a
   /vitrine-v2 tem as dela em vitrine-v2/secoes.tsx). O que esta página
   PERDEU de propósito: o formulário #contratar da oferta, com a caixa do
   Pix à vista; o único formulário agora é o modal do hero, que é o Contact
   da campanha. Os ids que o resto do site procura ficaram: #projetos,
   #como e #oferta (os links da pílula), #oferta e #fim (a barra fixa do
   celular), #faq.

   O texto mora em messages/vitrine.{pt,en}.tsx, na chave `mb`.
   ============================================================ */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import s from "@/app/(pt)/vitrine-digital/vitrine.module.css";
import { useLang, useT } from "@/components/i18n";
import { EMAIL, linkEmail, linkWhatsApp, WHATSAPP_EXIBIDO } from "@/lib/contato";
import { preencher } from "@/lib/idiomas";
import { projetos } from "@/data/portfolio";
import type { VitrineMessages } from "@/messages/vitrine.pt";
import { Bubble, IconeInstagram, IconeWhatsApp, letraALetra, LOJAS_DA_FAIXA, LOJAS_LINKS, LOJAS_NOMES, NO_AR, Pedido } from "@/components/vitrine/sections";

const useVit = () => useT<VitrineMessages>();

/* as sete lojas com site aberto hoje (a JK fica de fora: o site dela está
   em "Pagamento pendente", ver LOJAS_LINKS). A categoria serve às abas; a
   ordem é a mesma das logos do hero. */
const LOJAS_FONE: [string, string][] = [
  ["iconic", "sneakers"], ["japa", "moda"], ["arena", "esporte"], ["sneakerspot", "sneakers"],
  ["fulltime", "skate"], ["mm", "sneakers"], ["fardo", "esporte"],
];
const dominio = (k: string) => (LOJAS_LINKS[k] ?? "").replace(/^https?:\/\/(www\.)?/, "");

/* ---------- a animação do hero nos títulos (28/10) ----------
   Cada seção observa a si mesma; quando um terço entra na tela, ganha
   .mbVisto e o CSS solta o letraSurge no título e o heroSobe no parágrafo.
   O título é montado aqui em duas partes do dicionário (h2a e h2b, a
   segunda em verde), porque o elemento pronto não passa na quebra em
   letras. A frase nítida fica para o leitor de tela. */
function useVisto() {
  const ref = useRef<HTMLElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([x]) => { if (x.isIntersecting) { setVisto(true); io.disconnect(); } }, { threshold: .3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visto] as const;
}
function H2Letras({ a, b }: { a: string; b: string }) {
  return <h2><span className={s.soLeitor}>{a} {b}</span><span aria-hidden>{letraALetra(<>{a} <em>{b}</em></>)}</span></h2>;
}

/* ---------- 2. o placar ----------
   "1,150 apps / 560,700 screens" do Mobbin. Os números saem do dado (NO_AR
   conta o portfólio, as lojas são a lista do hero). Atrás deles, a PAREDE
   com o ícone das 108 vitrines (pedido do Rafael, 28/10): a mesma lista
   que dá o número, então os dois nunca desencontram. Os ícones são o
   /apple-icon.png de cada site, baixados em 28/10 (scripts na sessão);
   nos 10 sites que não servem ícone entrou a capa do portfólio recortada.
   Escuro de propósito: a colina da cena termina no grafite, e esta é a
   noite depois dela. No desktop a parede fica atrás, esmaecida e com o
   miolo vazado para os números; no celular ela vem depois, inteira. */
/* a faixa curada (28/10, quarta versão): o Rafael não gostou da parede
   nem das três faixas com os 94 ícones, que misturavam marca limpa com
   foto e texto miúdo. Agora UMA faixa, ícones de 80px, e só os 32
   escolhidos a dedo pela limpeza do símbolo. O 108 continua contando
   todas as vitrines; a faixa é prateleira, não prova. Dos clientes do
   hero entram Fardo, Full Time, Arena e M&M; Japa e SneakerSpot ficam
   fora porque o ícone delas é carregado. A ordem alterna escuro, claro e
   colorido. Cada ícone abre a loja; fora da ordem de tabulação porque 32
   paradas num trilho rolando seriam ruído para o teclado. */
const CURADOS = ["star-point","movvo-style","fardo-esportes","verit-lab","anvi-calcados","goplay","lancellotti","sejanous","arena-imports","pr-grife","vaylw","baixudos","fulltime","atelie-malha","hg-surf-wear","sublimestreetstore","marimar-shoes","joy-street-wear","serra-calcados","padelco","storeblessed","box66","almultimarcas","mm-calcados","agsoutletshoes","worldsports","fabriciostoreshoes","effectsunglass","vallox","ortobom-aracaju","wluki7","fantoche"];
const FAIXA = CURADOS.map(k => projetos.find(p => p.slug === k)).filter((p): p is NonNullable<typeof p> => Boolean(p)).map(p => ({ slug: p.slug, nome: p.nome, url: p.url as string }));
/* duas fileiras (28/10, pedido do Rafael): metade em cada, a de baixo ao
   contrário. A lista vai QUATRO vezes no trilho porque 16 ícones x 72px dão
   1152px, menos que o monitor de 1812 do Rafael; a animação anda metade
   (duas cópias), então o laço continua sem emenda. */
const FILEIRAS = [FAIXA.filter((_, k) => k % 2 === 0), FAIXA.filter((_, k) => k % 2 === 1)];
/* ---------- a animação do placar (28/10, pedido do Rafael) ----------
   A mesma do hero, disparada quando a seção entra na tela (um terço
   visível, uma vez só): o primeiro número conta de 0 até a centena cheia
   ("+100"), os outros dois nascem letra por letra no desfoque, e as
   legendas sobem logo atrás. O texto nítido fica para o leitor de tela e
   para quem está sem JavaScript; para quem pede menos movimento, o CSS
   mostra tudo parado no estado final. */
const CENTENA = Math.floor(NO_AR / 100) * 100;
function Contador({ ate, ativo }: { ate: number; ativo: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(ate); return; }
    const t0 = performance.now(); const dur = 1500; let raf = 0;
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - t0) / dur);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * ate));
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [ativo, ate]);
  return <>{v}</>;
}
export function Placar() {
  const t = useVit();
  const m = t.mb.placar;
  const valores: Record<string, string> = { n: String(NO_AR), c: String(CENTENA) };
  const ref = useRef<HTMLElement>(null);
  const [visto, setVisto] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([x]) => { if (x.isIntersecting) { setVisto(true); io.disconnect(); } }, { threshold: .35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <section ref={ref} className={`${s.mb} ${s.placar} ${visto ? s.placarVisto : ""}`} aria-label={m.rotulo}>
    <div className={s.placarMiolo}>
      {/* o rótulo "Como funciona, em três números" saiu da tela em 28/10: +100
          vitrines não é "como funciona", e os números se explicam pelas
          legendas. Fica no aria-label da seção, para o leitor de tela. */}
      <ul className={s.placarNumeros}>
        {m.itens.map(([num, rotulo], i) => <li key={rotulo}>
          <b>
            <span className={s.soLeitor}>{preencher(num, valores)}</span>
            {i === 0
              ? <span className={s.placarConta} aria-hidden>+<Contador ate={CENTENA} ativo={visto} /></span>
              : <span aria-hidden>{letraALetra(num)}</span>}
          </b>
          <span className={s.placarLegenda} style={{ "--i": i } as React.CSSProperties}>{rotulo}</span>
        </li>)}
      </ul>
    </div>
    <div className={s.placarFaixas} aria-hidden>
      {FILEIRAS.map((fila, f) => <div key={f} className={`${s.placarFaixa} ${f === 1 ? s.placarFaixaInversa : ""}`}>
        <div className={s.placarTrilho}>
          {[...fila, ...fila, ...fila, ...fila].map(({ slug, nome, url }, k) =>
            <a key={k} href={url} target="_blank" rel="noopener" tabIndex={-1} title={nome} style={{ "--i": k } as React.CSSProperties} data-cta={`placar_${slug}`} data-cta-dest="loja">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/assets/icones/${slug}.webp`} width={80} height={80} alt="" loading="lazy" decoding="async" />
            </a>)}
        </div>
      </div>)}
    </div>
  </section>;
}

/* ---------- 3. as lojas no ar ----------
   "Find design patterns in seconds": abas e uma fila de telas. As abas
   filtram por tipo de loja; cada celular é a primeira tela da vitrine
   real, capturada a 390px em 28/10, e abre o site numa aba nova. */
export function LojasNoAr() {
  const t = useVit();
  const m = t.mb.lojasAr;
  const [aba, setAba] = useState("todas");
  /* a manchete nasce letra por letra como a do hero (28/10, pedido do
     Rafael, só nesta seção): o observador marca .mbVisto quando um terço
     entra na tela, e o CSS solta o letraSurge; o parágrafo sobe atrás. A
     frase nítida fica para o leitor de tela. */
  const [ref, visto] = useVisto();
  return <section ref={ref} className={`${s.section} ${s.mb} ${s.mbAnim} ${s.lojasAr} ${visto ? s.mbVisto : ""}`} id="projetos">
    <H2Letras a={m.h2a} b={m.h2b} />
    <p className={s.mbLead}>{m.lead}</p>
    <div className={s.abas} role="tablist" aria-label={m.abasAria}>
      {m.abas.map(([k, rotulo]) =>
        <button key={k} type="button" role="tab" aria-selected={aba === k} className={s.aba} onClick={() => setAba(k)}>{rotulo}</button>)}
    </div>
    {/* ---------- a fila no desenho do Mobbin (28/10, medido lá) ----------
        O "Design research took hours" da home: cartões cinza de 576x384 com
        cantos de 32px, a tela entrando 32px do topo e da esquerda com cantos
        de 8px e cortada embaixo e à direita, o ícone do app de 63px (cantos
        30%) sobre o canto da tela, sem moldura de celular e sem nome. O
        trilho leva a lista duas vezes e anda metade, em laço; pausa no
        mouse. O nome e o endereço ficam no aria-label do link e no title.
        Com um filtro, o trilho para e centra as filtradas. */}
    <div className={`${s.fonesJanela} ${aba === "todas" ? s.fonesRolando : ""}`}>
      <ul className={s.fones}>
        {[0, 1].map(copia => LOJAS_FONE.map(([k, tipo]) =>
          <li key={copia + k} className={s.fone} hidden={(aba !== "todas" && aba !== tipo) || (copia === 1 && aba !== "todas")} aria-hidden={copia === 1 || undefined}>
            <a href={LOJAS_LINKS[k]} target="_blank" rel="noopener" tabIndex={copia === 1 ? -1 : undefined} title={`${LOJAS_NOMES[k]} · ${dominio(k)}`} aria-label={preencher(m.abrir, { nome: LOJAS_NOMES[k] })} data-cta={`fones_${k}`} data-cta-dest="loja">
              <span className={s.foneTela}>
                <picture>
                  {/* a primeira dobra em DESKTOP (28/10): a de celular a 512px de
                      largura virava só a barra da loja */}
                  <source type="image/avif" srcSet={`/assets/fones/${k}-desk.avif`} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/assets/fones/${k}-desk.webp`} width={1024} height={640} alt="" loading="lazy" decoding="async" />
                </picture>
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={s.foneIcone} src={`/assets/lojas/${k}-icone.webp`} width={63} height={63} alt="" loading="lazy" decoding="async" />
            </a>
          </li>))}
      </ul>
    </div>
  </section>;
}

/* ---------- 4. a jornada (FORA DA PÁGINA desde 28/10, à tarde) ----------
   Saiu a pedido do Rafael ("não faz tanto sentido"): repetia o celular da
   Iconic pela terceira vez e o "pedido chega montado" já está no hero.
   Fica aqui sem uso, para voltar com um comando se a ideia for retomada.
   "Explore entire user journeys with flows": dois cartões grandes. O da
   esquerda é a vitrine no celular (o cliente escolhe sozinho); o da
   direita, a conversa que chega montada (os balões do antigo Como
   Funciona, com o Bubble de lá). */
export function Jornada() {
  const t = useVit();
  const m = t.mb.jornada;
  return <section className={`${s.section} ${s.mb} ${s.jornada}`} id="como">
    <h2>{m.h2}</h2>
    <div className={s.jornadaGrid}>
      <article className={s.jornadaCard}>
        <div className={`${s.jornadaVisual} ${s.jornadaFone}`} aria-hidden>
          <span className={s.foneTela}>
            <picture>
              <source type="image/avif" srcSet="/assets/fones/iconic.avif" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/fones/iconic.webp" width={780} height={1688} alt="" loading="lazy" decoding="async" />
            </picture>
          </span>
        </div>
        <h3>{m.cartoes[0].t}</h3>
        <p>{m.cartoes[0].p}</p>
      </article>
      <article className={s.jornadaCard}>
        <div className={`${s.jornadaVisual} ${s.jornadaZap}`} aria-hidden>
          <div className={s.jornadaZapTopo}><IconeWhatsApp size={22} /><b>{m.zapNome}</b></div>
          <Bubble time="19:08" tick="read">{t.como.balao1}</Bubble>
          <span className={s.jornadaIntervalo}>{t.como.intervalo}</span>
          <Bubble out time="19:09" tick="read">{t.como.balao2}</Bubble>
        </div>
        <h3>{m.cartoes[1].t}</h3>
        <p>{m.cartoes[1].p}</p>
      </article>
    </div>
  </section>;
}

/* ---------- 5. da prévia à loja no ar ----------
   "From inspiration to creation": três cartões, cada um com uma peça de
   interface pequena. É o processo e o preço em três passos; o que entra
   na entrega mora no cartão do preço, logo abaixo. */
export function Etapas() {
  const t = useVit();
  const m = t.mb.etapas;
  const bt = m.bento;
  /* id="como" desde 28/10: a Jornada saiu da página (repetia o hero e a fila
     das lojas, e a conversa de exemplo era de outra loja), e o link "Como
     funciona" da pílula passou a cair aqui.
     ---------- os passos viraram linha, e entrou o bento (28/10, à tarde) ----------
     Pedido do Rafael: os três cartões cinzas com uma pecinha cada não
     mostravam o produto. Agora os passos são uma linha fina (o roteiro) e,
     abaixo, quatro cartões com tela de verdade, no desenho do "One library
     for all your needs" do Mobbin: o painel grande, a prévia chegando no
     WhatsApp, o pedido montado (o balão do hero) e o R$0 por mês. */
  const [ref, visto] = useVisto();
  return <section ref={ref} className={`${s.section} ${s.mb} ${s.mbAnim} ${s.etapas} ${visto ? s.mbVisto : ""}`} id="como">
    <H2Letras a={m.h2a} b={m.h2b} />
    <ol className={s.passosLinha}>
      {m.itens.map((it, i) => <li key={it.n} style={{ "--i": i } as React.CSSProperties}><span className={s.etapaN}>{it.n}</span><b>{it.t}</b></li>)}
    </ol>
    <div className={s.bento}>
      <article className={`${s.bentoCard} ${s.bentoPainel}`}>
        <h3>{bt.painel.t}</h3>
        <ul className={s.bentoLista}>{bt.painel.p.map(x => <li key={x}>{x}</li>)}</ul>
        {/* o vídeo do cadastro (28/10): gravado no painel do molde em modo
            local, com a foto real do New Balance 9060 da Iconic, 28s em
            laço, sem som. Quem pede menos movimento vê a capa parada. */}
        <figure className={s.bentoTela}>
          <VideoPainel alt={bt.painel.alt} />
          <figcaption>{bt.painel.legenda}</figcaption>
        </figure>
      </article>
      <Cartao className={s.bentoPrevia}>
        <h3>{bt.previa.t}</h3>
        <p>{bt.previa.p}</p>
        <div className={s.bentoZap} aria-hidden>
          <span className={s.foneTela}>
            <picture>
              <source type="image/avif" srcSet="/assets/fones/japa.avif" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/fones/japa.webp" width={780} height={1688} alt="" loading="lazy" decoding="async" />
            </picture>
          </span>
          <span className={s.digitando}><i /><i /><i /></span>
          <div className={s.bentoBalao}>
            <IconeWhatsApp size={18} />
            <span>{bt.previa.msg}<br /><u>{bt.previa.link}</u></span>
          </div>
        </div>
      </Cartao>
      <Cartao className={s.bentoPedido}>
        <h3>{bt.pedido.t}</h3>
        <p>{bt.pedido.p}</p>
        <div className={s.bentoPedidoBalao} aria-hidden><Pedido className={s.bentoNotif} /></div>
      </Cartao>
      <Cartao className={s.bentoMensal}>
        <h3>{bt.mensal.t}</h3>
        {/* o zero num rolo de odômetro (28/10): os dígitos giram e param no
            0. Nenhum valor de partida fica parado na tela, porque não há
            mensalidade real de concorrente publicada para usar aqui. */}
        <p className={s.bentoZero}>
          <b>
            <span className={s.soLeitor}>{bt.mensal.valor}</span>
            <span aria-hidden>{bt.mensal.valor.slice(0, -1)}<span className={s.rolo}><span>{"9876543210".split("").map(d => <span key={d}>{d}</span>)}</span></span></span>
          </b>
          <span>{bt.mensal.sufixo}</span>
        </p>
        <p>{bt.mensal.p}</p>
        {/* os doze meses (28/10, "melhora este"): o cartão sobrava vazio no
            carrossel do celular; agora mostra o argumento, o ano inteiro a
            zero, e cada mês acende em sequência quando o cartão entra */}
        <ol className={s.meses} aria-hidden>
          {bt.mensal.meses.map((mes, k) => <li key={mes} style={{ "--k": k } as React.CSSProperties}><span>{mes}</span><b>{bt.mensal.valor}</b></li>)}
        </ol>
      </Cartao>
    </div>
  </section>;
}

/* cada cartão do bento anima quando ELE entra na tela, não quando a seção
   entra: os de baixo terminariam antes de alguém chegar neles */
function Cartao({ className, children }: { className: string; children: React.ReactNode }) {
  const [ref, visto] = useVisto();
  return <article ref={ref} className={`${s.bentoCard} ${className} ${visto ? s.cartaoVisto : ""}`}>{children}</article>;
}

function VideoPainel({ alt }: { alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { v.pause(); v.removeAttribute("autoplay"); return; }
    /* só roda quando está na tela: 28s em laço fora da tela é bateria à toa.
       Desde 28/10 também só BAIXA perto da tela: era 1,4MB no carregamento
       da página, lá no fim dela; agora o preload é "none" e o vídeo começa a
       vir quando o cartão está a uma tela de distância. */
    const perto = new IntersectionObserver(([x]) => { if (x.isIntersecting) { v.preload = "auto"; v.load(); perto.disconnect(); } }, { rootMargin: "100% 0px" });
    perto.observe(v);
    const io = new IntersectionObserver(([x]) => { if (x.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: .2 });
    io.observe(v);
    return () => { io.disconnect(); perto.disconnect(); };
  }, []);
  /* 960x600 desde 28/10 (era 1280x800 e 1,4MB no webm; agora ~310KB), e o
     mp4 vem primeiro só se for menor: hoje os dois empatam */
  return <video ref={ref} className={s.bentoVideo} muted loop playsInline preload="none" poster="/assets/demo/painel-cadastro-capa.webp" width={960} height={600} aria-label={alt}>
    <source src="/assets/demo/painel-cadastro.webm" type="video/webm" />
    <source src="/assets/demo/painel-cadastro.mp4" type="video/mp4" />
  </video>;
}

/* ---------- quem faz, curto ----------
   O Mobbin não tem, mas aqui vende: é um designer, não uma agência. Uma
   faixa clara, a foto, a manchete e o parágrafo de sempre (t.quem). */
export function QuemFazCurto() {
  const t = useVit();
  const insta = t.header.insta;
  const [ref, visto] = useVisto();
  return <section ref={ref} className={`${s.section} ${s.mb} ${s.mbAnim} ${s.quemCurto} ${visto ? s.mbVisto : ""}`}>
    <div className={s.quemCurtoGrid}>
      <div className={s.quemCurtoFoto}>
        <Image src="/assets/rafael-quemfaz-cor.webp" width={520} height={693} sizes="(max-width: 720px) 60vw, 300px" alt={t.quem.alt} />
      </div>
      <div>
        {/* sem o "QUEM FAZ" em cima (28/10): o título já diz quem faz */}
        <H2Letras a={t.quem.h2a} b={t.quem.h2b} />
        <p className={s.mbLead}>{preencher(t.mb.quem.texto, { c: String(CENTENA) })}</p>
        {/* a assinatura: o monograma da logo (o arquivo, nada redesenhado)
            com o mesmo encaixe das duas metades do topo da página, tocando
            quando a seção entra na tela; antes disso fica invisível */}
        <p className={s.quemAssina}>
          <span className={s.brandMono} aria-hidden>
            <Image className={`${s.brandRR} ${visto ? s.rrEsq : s.rrEspera}`} src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
            <Image className={`${s.brandRR} ${s.rrSegunda} ${visto ? s.rrDir : s.rrEspera}`} src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
          </span>
          <span>{t.mb.quem.assinatura}</span>
        </p>
        <div className={s.mbAcoes}>
          <a className={`${s.button} ${s.acao}`} href="#hero-form" data-cta="quem_faz" data-cta-dest="form">{t.mb.fim.cta}</a>
          <a className={`${s.button} ${s.outline}`} href={`https://www.instagram.com/${insta.handle.replace(/^@/, "")}/`} target="_blank" rel="noopener" data-cta="instagram_quem" data-cta-dest="instagram"><IconeInstagram id="insta-degrade-quem" size={18} />{insta.handle}</a>
        </div>
      </div>
    </div>
  </section>;
}

/* O checkout da compra direta (28/10), o mesmo da /vitrine-v4 (ver
   components/vitrine-v4/MontagemV4.tsx): o script lê a proposta no
   data-proposta do <body> e liga todo botão com data-checkout-item que já
   existir quando ele roda; por isso entra depois do render. O valor vem do
   servidor (pages/api/proposta-pagamento.js), nunca daqui. */
function useCheckoutDireto(ligado: boolean) {
  useEffect(() => {
    if (!ligado) return;
    document.body.setAttribute("data-proposta", "vitrine-direta");
    if (!document.getElementById("ck-css")) {
      const link = document.createElement("link");
      link.id = "ck-css"; link.rel = "stylesheet"; link.href = "/css/proposta-checkout.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("ck-js")) {
      const script = document.createElement("script");
      script.id = "ck-js"; script.src = "/js/proposta-checkout.js";
      document.body.appendChild(script);
    }
    return () => { document.body.removeAttribute("data-proposta"); };
  }, [ligado]);
}

/* ---------- 6. o preço, num cartão só ----------
   Os números vêm de lib/oferta.ts pelo dicionário; aqui nada é digitado.
   O botão abre o modal do hero (todo href="#hero-form" abre). */
export function Preco() {
  const t = useVit();
  const m = t.mb.preco;
  const [ref, visto] = useVisto();
  useCheckoutDireto(!!m.direto);
  return <section ref={ref} className={`${s.section} ${s.mb} ${s.mbAnim} ${s.preco} ${visto ? s.mbVisto : ""}`} id="oferta">
    <p className={s.mbEyebrow}>{m.eyebrow}</p>
    <H2Letras a={m.h2a} b={m.h2b} />
    <p className={s.mbLead}>{m.lead}</p>
    <div className={s.precoCard}>
      {/* o pagamento como trilho (28/10): dois pontos ligados por um fio, o
          mesmo fio verde dos passos, que se desenha quando o cartão entra.
          As duas caixas iguais liam como dois preços; o trilho diz "metade
          agora, metade no fim". Os rótulos são os de sempre: nada de "hoje",
          porque os R$500 só são pagos depois de a prévia agradar. */}
      <ol className={s.precoTrilho}>
        {m.linhas.map(([valor, rotulo]) => <li key={rotulo}><b>{valor}</b><span>{rotulo}</span></li>)}
      </ol>
      {m.pix && <p className={s.precoPix}>{m.pix}</p>}
      <div className={s.precoGrupos}>
        {(() => { let k = 0; return m.grupos.map(([titulo, ids]) => <div key={titulo}>
          <p className={s.precoGrupoT}>{titulo}</p>
          <ul className={s.precoItens}>
            {ids.map(id => <li key={id} style={{ "--k": k++ } as React.CSSProperties}>{t.oferta.itens[id]}</li>)}
          </ul>
        </div>); })()}
      </div>
      <a className={`${s.button} ${s.acao}`} href="#hero-form" data-cta="oferta_abrir" data-cta-dest="form">{m.cta}</a>
      <p className={s.precoNota}>{m.nota} <Link href={t.processo.termosHref}>{m.termos}</Link></p>
      {/* o atalho de quem já decidiu (28/10): uma linha de texto com o botão
          como link, e não um segundo botão do tamanho do rosa. O
          proposta-checkout.js liga o botão pelo data-checkout-item; ver
          `useCheckoutDireto` */}
      {m.direto && <p className={s.precoDireto}>
        {m.direto.texto} <button type="button" className={s.precoPagar} data-checkout-item="entrada_pix" data-cta="oferta_entrada_pix" data-cta-dest="checkout">{m.direto.botao}</button>
      </p>}
    </div>
  </section>;
}

/* ---------- 7. o que dizem no WhatsApp ----------
   Medido no mobbin.com em 28/10 (a seção "Trusted by teams"): uma faixa
   cinza clara de borda a borda, 160px em cima e 100px embaixo, a manchete
   centrada, e UM depoimento numa grade de 16 colunas: as aspas (80px) e a
   frase (44px/48px, semibold, -0.4px) nas colunas 2 a 9; quem falou nas
   colunas 12 a 15, alinhado ao pé da frase, com a foto redonda de 48px e
   um selo de 16px da empresa no canto dela. Sem cartão, sem pontinhos.
   Lá é um depoimento só; aqui as sete se revezam em silêncio a cada 8s
   (pausa com o mouse; parado para quem pede menos movimento), porque
   descartar seis frases reais seria caro. Cada frase foi copiada da
   conversa (os prints estão com o Rafael, 28/10). A foto: por ora o
   ícone da loja ou a inicial; o Rafael manda as fotos dos clientes. */
const TROCA_MS = 8000;
export function Depoimentos() {
  const t = useVit();
  const m = t.mb.depo;
  const n = m.itens.length;
  const [i, setI] = useState(0);
  const [parado, setParado] = useState(false);
  const [refDepo, vistoDepo] = useVisto();
  useEffect(() => {
    if (n < 2 || parado || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI(x => (x + 1) % n), TROCA_MS);
    return () => clearInterval(id);
  }, [parado, n]);
  const it = m.itens[i];
  const papel = it.loja ? `${it.loja} · ${it.cliente ? m.cliente : m.previa}` : (it.cliente ? m.cliente : m.previa);
  /* sem manchete e sobre o branco (28/10, pedido do Rafael): a frase grande
     já é o título da seção; aria-label guarda o nome para o leitor de tela */
  return <section ref={refDepo} className={`${s.mb} ${s.depo} ${vistoDepo ? s.depoVisto : ""}`} aria-label={m.titulo} onMouseEnter={() => setParado(true)} onMouseLeave={() => setParado(false)}>
    {/* ---------- a seção mais curta (28/10, "muitas margens e muito longo") ----------
        Eram nove linhas de 34px e o Luciano perdido no canto. Agora: o
        trecho que vende em destaque (as palavras dele, recortadas com
        reticências), a mensagem inteira embaixo em corpo de leitura, ele
        colado no texto, e na metade que sobrava a vitrine da Iconic no
        celular, que é a prova do que ele elogia. */}
    <figure key={i} className={`${s.depoGrade} ${it.tela ? s.depoComTela : ""}`} aria-live="polite">
      <div className={s.depoTexto}>
      <blockquote className={`${s.depoFrase} ${it.destaque ? s.depoComDestaque : it.q.join("").length > 160 ? s.depoLonga : ""}`}>
        {/* as aspas penduradas na margem, na linha do começo do texto */}
        <span className={s.depoAspas} aria-hidden>“</span>
        {/* a frase sobe palavra por palavra quando a seção entra (28/10) */}
        {it.destaque && <p className={s.depoDestaque} aria-hidden>{it.destaque.split(" ").map((w, k) => <span key={k} className={s.depoPalavra} style={{ "--i": k } as React.CSSProperties}>{w} </span>)}</p>}
        <div className={s.depoInteira}>{it.q.map(p => <p key={p}>{p}</p>)}</div>
      </blockquote>
      <figcaption className={s.depoQuem}>
        <span className={s.depoFoto}>
          {/* a foto da pessoa; sem foto, o ícone da loja; sem loja, a inicial */}
          {it.foto || it.k
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={it.foto ?? `/assets/lojas/${it.k}-icone.webp`} width={48} height={48} alt="" loading="lazy" decoding="async" />
            : <span className={s.depoAvatar} aria-hidden>{it.quem[0]}</span>}
          {/* o selo da empresa no canto da foto, como no Mobbin; só quando há loja com ícone */}
          {it.k && <span className={s.depoSelo} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/assets/lojas/${it.k}-icone.webp`} width={16} height={16} alt="" loading="lazy" decoding="async" />
          </span>}
        </span>
        <span className={s.depoNome}><span>{it.quem}</span><span className={s.depoPapel}>{papel}</span></span>
      </figcaption>
      </div>
      {it.tela && it.site && <a className={s.depoTela} href={it.site} target="_blank" rel="noopener" data-cta={`depo_${it.k ?? "loja"}`} data-cta-dest="loja">
        <span className={s.depoFone}>
          <picture>
            <source type="image/avif" srcSet={`${it.tela}.avif`} />
            <source type="image/webp" srcSet={`${it.tela}.webp`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${it.tela}.jpg`} width={500} height={7503} alt={`A vitrine da ${it.loja} no celular`} loading="lazy" decoding="async" />
          </picture>
        </span>
        <span className={s.depoDominio}><i aria-hidden />{it.dominio}</span>
      </a>}
    </figure>
  </section>;
}

/* ---------- 8. o fim: o convite com os carretéis de ícones ----------
   O "Designing in fintech?" do mobbin.com, medido em 28/10: de cada lado
   do texto, uma coluna com CINCO estações fixas (de cima para baixo: 72px
   desfocado 2,76px, 83px nítido, 99px nítido e à frente, 83px nítido, 72px
   desfocado), e os ícones girando por elas. A cada ~2,2s todos sobem uma
   estação numa mola de meio segundo; o de cima sai esmaecendo, e um novo
   entra por baixo, também esmaecendo. O deslocamento em X é o que dá o
   arco: as estações do meio ficam mais para fora. As posições lá são (a
   partir do canto do carretel de 141,6 x 318,4): 69.6/0 · 32/50.4 · 0/109.6
   · 32/184.8 · 69.6/246.4, e no carretel da direita o arco é espelhado.
   Aqui: 16 lojas por carretel (as 32 curadas, metade em cada), rodando com
   setInterval + transição CSS, sem biblioteca. A faixa de pílulas que
   ficava embaixo saiu. */
const ESTACOES = [
  { x: 69.6, y: 0, s: .7258, blur: 2.756, z: 72 },
  { x: 32, y: 50.4, s: .8387, blur: 0, z: 83 },
  { x: 0, y: 109.6, s: 1, blur: 0, z: 99 },
  { x: 32, y: 184.8, s: .8387, blur: 0, z: 83 },
  { x: 69.6, y: 246.4, s: .7258, blur: 2.756, z: 72 },
];
const PASSO_MS = 2200;
function Carretel({ lojas, espelhado, ativo, atraso = 0 }: { lojas: { slug: string; nome: string }[]; espelhado?: boolean; ativo: boolean; atraso?: number }) {
  /* o índice da loja que está na estação 0 (topo); as outras quatro vêm a seguir */
  const [topo, setTopo] = useState(0);
  const [andando, setAndando] = useState(false);
  useEffect(() => {
    if (!ativo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id: ReturnType<typeof setInterval>;
    const t0 = setTimeout(() => {
      setAndando(true);
      id = setInterval(() => setTopo(i => (i + 1) % lojas.length), PASSO_MS);
    }, atraso);
    return () => { clearTimeout(t0); clearInterval(id); };
  }, [ativo, atraso, lojas.length]);
  const n = lojas.length;
  /* cada loja tem um lugar: a distância dela até o topo diz a estação; fora
     das cinco, ela espera escondida na estação de baixo (a próxima a entrar)
     ou na de cima (a que acabou de sair), que é como o Mobbin faz com os
     "fantasmas" */
  return <div className={`${s.carretel} ${espelhado ? s.carretelEspelhado : ""} ${andando ? s.carretelAndando : ""}`} aria-hidden>
    {lojas.map((l, k) => {
      const d = (k - topo + n) % n;
      const saiu = d === n - 1;
      const dentro = d < 5;
      const e = dentro ? ESTACOES[d] : saiu ? ESTACOES[0] : ESTACOES[4];
      const y = saiu ? e.y - 28 : dentro ? e.y : e.y + 28;
      const x = espelhado ? 141.6 - 99.2 * e.s - e.x : e.x;
      return <span key={l.slug} className={s.carretelIcone} title={l.nome}
        style={{ transform: `translate(${x}px, ${y}px) scale(${e.s})`, filter: `blur(${e.blur}px)`, opacity: dentro ? 1 : 0, zIndex: e.z }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/assets/icones/${l.slug}.webp`} width={99} height={99} alt="" loading="lazy" decoding="async" />
      </span>;
    })}
  </div>;
}
export function FimNovo() {
  const t = useVit();
  const m = t.mb.fim;
  const [ref, visto] = useVisto();
  const metade = Math.ceil(FAIXA.length / 2);
  return <section ref={ref} className={`${s.section} ${s.mb} ${s.mbAnim} ${s.fimNovo} ${visto ? s.mbVisto : ""}`} id="fim">
    <div className={s.fimGrade}>
      <Carretel lojas={FAIXA.slice(0, metade)} ativo={visto} />
      <div className={s.fimMiolo}>
        <H2Letras a={m.h2a} b={m.h2b} />
        <p className={s.mbLead}>{m.lead}</p>
        <div className={s.mbAcoes}>
          <a className={`${s.button} ${s.acao}`} href="#hero-form" data-cta="final" data-cta-dest="form">{m.cta}</a>
          <a className={`${s.button} ${s.outline}`} href="#oferta" data-cta="final_reserva" data-cta-dest="oferta">{m.cta2}</a>
        </div>
      </div>
      <Carretel lojas={FAIXA.slice(metade)} espelhado ativo={visto} atraso={1100} />
    </div>
  </section>;
}

/* o rodapé saiu de dentro do FimNovo em 28/10: com o FAQ por último, ele
   precisa vir depois do <main>, e não colado no convite final */
export function Rodape() {
  const t = useVit();
  const lang = useLang();
  /* ---------- o rodapé claro com a logo de verdade (28/10, pedido do Rafael) ----------
     Era um bloco grafite com "RAFAEL RAZEIRA / ESTÚDIO" DIGITADO, contra a
     regra da logo em arquivo (2 Regras da casa/feedback-sem-texto-vazado).
     Agora a logo são os dois pedaços do arquivo, como na pílula do topo,
     sobre fundo claro (a verde original, sem filtro); a frase do que o
     estúdio faz; os links; e o contato direto. O WhatsApp daqui não conta
     como Lead (`rodape_contato` em FORA_DO_LEAD, tracking.ts). */
  return <footer className={`${s.footer} ${s.rodapeNovo}`}>
    <div className={s.rodapeTopo}>
      <div className={s.rodapeMarca}>
        <a href="#topo" aria-label={`${t.marca.nome} ${t.marca.sufixo}`}>
          <Image className={s.rodapeRR} src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
          <Image className={s.rodapeNome} src="/assets/marca/rr-nome.webp" width={150} height={25} alt="" />
        </a>
        <p>{t.mb.rodape.frase}</p>
      </div>
      <nav aria-label={t.mb.rodape.navAria}>{t.rodape.links.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
      <div className={s.rodapeContato}>
        <p>{t.mb.rodape.contato}</p>
        {lang === "en"
          ? <a href={linkEmail(t.mb.rodape.msg)} data-cta="rodape_contato" data-cta-dest="email">{EMAIL}</a>
          : <a href={linkWhatsApp(t.mb.rodape.msg)} target="_blank" rel="noopener" data-cta="rodape_contato" data-cta-dest="whatsapp"><IconeWhatsApp size={16} />{WHATSAPP_EXIBIDO}</a>}
        <a href={`https://www.instagram.com/${t.header.insta.handle.replace(/^@/, "")}/`} target="_blank" rel="noopener" data-cta="instagram_rodape" data-cta-dest="instagram"><IconeInstagram id="insta-degrade-rodape" size={16} />{t.header.insta.handle}</a>
      </div>
    </div>
    <small>{t.mb.rodape.copy}</small>
  </footer>;
}
