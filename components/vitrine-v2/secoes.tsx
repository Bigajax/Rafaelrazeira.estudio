"use client";

/* ============================================================
   AS SEÇÕES DA /vitrine-v2 (05/10/2026)

   Uma seção por parte do roteiro de 12 do Rafael. A primeira versão
   desta página reaproveitava as seções da /vitrine-digital e ele
   respondeu "ficou igual à outra... não tem a parte da VSL". Agora só
   duas continuam emprestadas, pelo dicionário: os projetos (a "Prova") e
   o FAQ. Todo o resto é desenho próprio, com os tokens da casa (papel,
   grafite, esmeralda, rosa só na ação, sombra dura), mas não o layout de
   lá.

   s = o CSS da vitrine (tokens, botões, títulos de duas larguras)
   c = o CSS desta página (v2.module.css)
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import s from "@/app/(pt)/vitrine-digital/vitrine.module.css";
import c from "./v2.module.css";
import { ligarAncoras } from "@/components/vitrine/ancora";
import { InstaDoEstudio } from "@/components/vitrine/sections";
import { initTracking } from "@/components/vitrine/tracking";
import { useT } from "@/components/i18n";
import { linkWhatsApp } from "@/lib/contato";
import type { VitrineMessages } from "@/messages/vitrine.pt";
import type { V2Messages } from "@/messages/vitrine-v2.pt";

/* O dicionário chega pelo provider, montado no servidor (page.tsx). Este
   arquivo NUNCA importa o valor de messages/vitrine-v2.pt, só o tipo,
   senão o lib/propostas.ts inteiro (os preços de todos os clientes) iria
   no JavaScript da página. */
type Msgs = VitrineMessages & { v2: V2Messages };
const useV2 = () => useT<Msgs>().v2;
const useBase = () => useT<Msgs>();

/* ---------- medição e checkout, num ponto de montagem só ----------
   1. initTracking com page "vitrine-v2": é o que separa as duas páginas
      no Mixpanel e na Meta durante o teste. O ViewContent sai sozinho
      quando o #oferta aparece, como na /vitrine-digital.
   2. O checkout é o mesmo das propostas (public/estudio/js/proposta-checkout.js):
      ele lê data-proposta do <body> e se prende aos botões com
      data-checkout-item. Os botões vêm do servidor, então basta pôr o
      atributo e injetar o script, como no CheckoutLoader da baixudos-pr.
      Ao aprovar, ele abre o WhatsApp comigo: é o começo do onboarding. */
export function MontagemV2({ valor }: { valor: number }) {
  useEffect(() => {
    initTracking({ page: "vitrine-v2", valor, currency: "BRL", lang: "pt" });
    ligarAncoras();

    document.body.setAttribute("data-proposta", "vitrine-v2");
    if (!document.getElementById("ck-css")) {
      const link = document.createElement("link");
      link.id = "ck-css";
      link.rel = "stylesheet";
      link.href = "/css/proposta-checkout.css";
      document.head.appendChild(link);
    }
    if (!document.getElementById("ck-js")) {
      const script = document.createElement("script");
      script.id = "ck-js";
      script.src = "/js/proposta-checkout.js";
      document.body.appendChild(script);
    }
    return () => document.body.removeAttribute("data-proposta");
  }, [valor]);
  return null;
}

export function HeaderV2() {
  const t = useBase();
  return <header className={s.header}>
    <a className={s.brand} href="#topo"><b>{t.marca.nome}</b><span>{t.marca.sufixo}</span></a>
    <InstaDoEstudio />
    <div className={s.headRight}>
      <a className={s.headCta} href="#oferta" data-cta="header" data-cta-dest="oferta">{t.v2.header.cta}</a>
    </div>
  </header>;
}

/* ---------- o celular do hero: uma compra de verdade na vérít.lab ----------
   Pedido do Rafael em 05/10: o aparelho não mostra mais a loja rolando,
   mostra a COMPRA. Gravado no site real dela (390x844, celular): a vitrine,
   o toque no Mickey Mapa, a página da peça com o preço, o "QUERO ESSA" e o
   WhatsApp com a mensagem que o próprio site monta. A última tela é uma
   reprodução do WhatsApp (o app não abre num navegador automatizado), com
   o texto tirado do link do botão. Gravado em 390x704, a proporção da
   tela do aparelho (0,55), senão o "cover" corta a mensagem no fim. 15 s, em
   public/assets/v2/veritlab-compra.{webm,mp4}.

   O padrão de carga é o da VitrineDemo da /vitrine-digital: a primeira
   pintura leva só a capa (27KB, o primeiro quadro do vídeo); o vídeo
   (0,9 a 1,25MB) só é montado depois do `load`. Com "reduzir movimento" ele
   nunca é montado e fica a capa. WebM primeiro (menor), MP4 para o iPhone. */
function DemoVerit() {
  const [montar, setMontar] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ligar = () => setMontar(true);
    if (document.readyState === "complete") { ligar(); return; }
    window.addEventListener("load", ligar, { once: true });
    return () => window.removeEventListener("load", ligar);
  }, []);
  return <div className={s.screen}>
    <Image className={s.shot} src="/assets/v2/veritlab-compra-poster.webp" width={498} height={900} sizes="300px" priority alt="" />
    {montar && <video className={c.telaVideo} autoPlay muted loop playsInline preload="auto" poster="/assets/v2/veritlab-compra-poster.webp">
      <source src="/assets/v2/veritlab-compra.webm" type="video/webm" />
      <source src="/assets/v2/veritlab-compra.mp4" type="video/mp4" />
    </video>}
  </div>;
}

/* ---------- 1. HERO ----------
   Sem etiqueta e sem formulário: um botão só, com o preço dentro, que
   desce até a oferta. A dúvida vai ao WhatsApp como link pequeno; o
   tracking.ts transforma o clique em Lead sozinho (data-cta-dest). */
export function HeroV2() {
  const h = useV2().hero;
  /* Áreas da grade (ver .heroGrid no CSS): no desktop o celular ocupa a
     coluna da direita inteira; no celular ele desce para o lado do botão,
     pequeno, para a compra gravada aparecer na primeira tela. */
  return <section className={`${s.hero} ${c.hero}`} id="topo">
    <div className={c.heroGrid}>
      <div className={c.heroTopo}>
        <p className={s.eyebrow}>{h.eyebrow}</p>
        <h1 className={c.heroH1}>{h.h1}</h1>
        <p className={c.heroLead}>{h.lead}</p>
      </div>
      <div className={c.heroAcao}>
        <a className={`${s.button} ${s.acao} ${c.heroCta}`} href="#oferta" data-cta="hero" data-cta-dest="oferta">{h.cta}</a>
        <p className={c.heroParcela}>{h.parcela}</p>
        <p className={c.heroRisco}>{h.risco}</p>
      </div>
      <div className={c.heroResto}>
        <ul className={c.micro}>{h.micro.map(mm => <li key={mm}>{mm}</li>)}</ul>
        <div className={c.heroQuem}>
          <Image src={h.quem.foto} alt={h.quem.nome} width={56} height={56} />
          <span>
            <b>{h.quem.nome}</b> · {h.quem.diz}
            <a className={c.linkDuvida} href={linkWhatsApp(h.duvidaMsg)} target="_blank" rel="noopener" data-cta="hero_duvida" data-cta-dest="whatsapp">{h.duvida}</a>
          </span>
        </div>
        <p className={c.heroProva}><span>{h.prova.rotulo}</span> {h.prova.lojas.map((l, i) => <b key={l}>{l}{i < h.prova.lojas.length - 1 ? "," : ""}</b>)}</p>
      </div>
      <figure className={c.heroFoneArea}>
        <div className={s.phoneWrap}>
          <div className={`${s.phone} ${c.heroFone}`} role="img" aria-label={h.demo.aria}>
            <DemoVerit />
          </div>
        </div>
        <figcaption className={c.heroLegenda}><i aria-hidden />{h.legenda}</figcaption>
      </figure>
    </div>
  </section>;
}

/* ---------- a VSL ----------
   Logo abaixo da dobra, em faixa escura de ponta a ponta, 16:9. Sem o
   arquivo, a moldura do player aparece com "vídeo em gravação": a página
   é teste e não vai para anúncio antes do vídeo. */
export function VideoV2() {
  const v = useV2().video;
  return <section className={`${s.section} ${s.dark} ${c.vsl}`} id="video">
    <div className={c.vslWrap}>
      <p className={s.eyebrow}>{v.eyebrow}</p>
      <h2 className={c.vslTitulo}>{v.titulo}</h2>
      <figure className={c.player}>
        {v.src
          ? <video src={v.src} poster={v.poster ?? undefined} controls playsInline preload="none" />
          : <div className={c.playerVazio} role="img" aria-label={v.pendente}>
              <span className={c.play} aria-hidden />
              <b>{v.pendente}</b>
            </div>}
        <figcaption><span>{v.duracao}</span> {v.legenda}</figcaption>
      </figure>
    </div>
  </section>;
}

/* ---------- 2. NÃO É SÓ UM SITE ----------
   A equação: três cartões que mostram o trabalho de cada parcela (design,
   CRO, WhatsApp), somados, e o resultado carimbado em rosa. Os cartões
   são objetos da casa (borda de tinta, sombra dura) e cada um gira para
   um lado, como fichas soltas na mesa. A definição de CRO mora DENTRO do
   cartão de CRO, que é onde a pergunta "o que é isso?" aparece. */
/* A chegada: o único movimento de algumas seções. O estado base do CSS
   é o FINAL (tudo visível); `esperando` só é posto quando dá para animar,
   e `chegando` quando a seção entra na tela. Sem JS, sem
   IntersectionObserver ou com "reduzir movimento", nada some. */
function useChegada<T extends HTMLElement>(limiar = 0.35) {
  const ref = useRef<T>(null);
  const [fase, setFase] = useState<"parado" | "esperando" | "chegando">("parado");
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setFase("esperando");
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setFase("chegando");
    }, { threshold: limiar });
    io.observe(el);
    return () => io.disconnect();
  }, [limiar]);
  return { ref, classe: fase === "esperando" ? c.esperando : fase === "chegando" ? c.chegando : "" };
}

function Equacao() {
  const x = useV2().site;
  const e = x.equacao;
  const { ref, classe } = useChegada<HTMLDivElement>();
  return <div ref={ref} className={`${c.equacao} ${classe}`}>
    <article className={`${c.parcela} ${c.pDesign}`}>
      <h3 className={c.parcelaNome}>{e.design.nome}</h3>
      <div className={c.leque} aria-label="Três vitrines de clientes, cada uma com a sua identidade">
        {e.design.telas.map(t => <figure key={t.loja} className={c.lequeTela}>
          <Image src={t.img} alt={`Página inicial da ${t.loja}`} width={1280} height={800} sizes="200px" />
          <figcaption>{t.loja}</figcaption>
        </figure>)}
      </div>
      <p className={c.parcelaDiz}>{e.design.diz}</p>
    </article>
    <span className={c.sinal} aria-hidden>+</span>
    <article className={`${c.parcela} ${c.pCro}`}>
      <h3 className={c.parcelaNome}>{e.cro.nome}</h3>
      <div className={c.croVisual}>
        <div className={c.miniFone}>
          <Image src={e.cro.tela} alt="A página do quadro Mickey Mapa, com o preço, os detalhes e o botão de pedir" width={400} height={722} sizes="120px" />
          <i className={c.toque} style={{ top: `${e.cro.marcas[2][1]}%` }} aria-hidden />
        </div>
        <ol className={c.caminhoCro}>
          {e.cro.marcas.map(([rot, y]) => <li key={rot} style={{ top: `${y}%` }}>{rot}</li>)}
        </ol>
      </div>
      <p className={c.parcelaDiz}>{e.cro.diz}</p>
      <details className={c.oQueE}>
        <summary>O que é CRO?</summary>
        <p><b>{x.croTitulo}</b> {x.croTexto}</p>
      </details>
    </article>
    <span className={c.sinal} aria-hidden>+</span>
    <article className={`${c.parcela} ${c.pWhats}`}>
      <h3 className={c.parcelaNome}>{e.whats.nome}</h3>
      <div className={c.whatsVisual}>
        <div className={c.miniFone}>
          <Image src={e.whats.tela} alt="A mensagem do Mickey Mapa chegando no WhatsApp da loja" width={400} height={723} sizes="120px" />
        </div>
        <div className={c.notificacao} aria-hidden>
          <span className={c.notifTopo}><i />{e.whats.app} · {e.whats.hora}</span>
          <b>{e.whats.quem}</b>
          <span>{e.whats.texto}</span>
        </div>
      </div>
      <p className={c.parcelaDiz}>{e.whats.diz}</p>
    </article>
    <span className={c.sinal} aria-hidden>=</span>
    <div className={c.resultado}>
      <p className={c.carimbo}>{e.resultado}</p>
      <small>{e.resultadoNota}</small>
    </div>
  </div>;
}

/* FORA DA PÁGINA desde 05/10/2026 (o corte de 16 para 9 seções, pedido
   do Rafael: "não acha que tem muito conteúdo?"). Fica no arquivo para
   voltar com uma linha na page.tsx. */
export function SiteV2() {
  const x = useV2().site;
  return <section className={s.section} id="nao-e-site">
    <div className={s.wrap}>
      <h2 className={s.h2Duplo}>{x.h2}</h2>
      <p className={`${s.lead} ${c.secLead}`}>{x.lead}</p>
      <Equacao />
    </div>
  </section>;
}

/* ---------- 3. A DOR ----------
   As perguntas do direct como balões de verdade, empilhados e sem
   resposta (o ✓ cinza de entregue e não lido). */
export function DorV2() {
  const x = useV2().dor;
  return <section className={s.section} id="dor">
    <div className={`${s.wrap} ${c.dorGrid}`}>
      <div>
        <h2 className={s.h2Duplo}>{x.h2}</h2>
        <p className={`${s.lead} ${c.secLead}`}>{x.lead}</p>
      </div>
      <Inbox />
    </div>
  </section>;
}

/* ---------- a caixa do WhatsApp lotada ----------
   Um celular na lista de conversas do WhatsApp (tema escuro): seis
   conversas não lidas, cada uma com uma das perguntas, o contador verde
   e o horário subindo de 20:39 a 21:40. É a cena que o lojista reconhece na hora,
   e não balões soltos.

   O ÚNICO movimento da seção: quando ela entra na tela, as conversas
   chegam de baixo para cima, da mais antiga à mais nova, e o contador do
   filtro "Não lidas" aparece no fim. O estado base do CSS é o FINAL (tudo visível): a
   classe `chegando` só é posta pelo JS, então sem JS, sem
   IntersectionObserver ou com "reduzir movimento" a caixa já aparece
   cheia. */
function Inbox() {
  const x = useV2().dor.inbox;
  const ref = useRef<HTMLDivElement>(null);
  const [fase, setFase] = useState<"parado" | "esperando" | "chegando">("parado");
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setFase("esperando");
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setFase("chegando");
    }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const n = x.conversas.length;
  return <div ref={ref} className={`${c.inbox} ${fase === "esperando" ? c.esperando : ""} ${fase === "chegando" ? c.chegando : ""}`}>
    <div className={c.inboxTopo}>
      <b>{x.titulo}</b>
      <span className={c.inboxIcones} aria-hidden><i /><i /></span>
    </div>
    <ul className={c.filtros} aria-hidden>
      {x.filtros.map((f, i) => <li key={f} className={i === 1 ? c.filtroAtivo : ""}>{f}{i === 1 && <b>{n}</b>}</li>)}
    </ul>
    <ul className={c.conversas} aria-label={`${n} conversas não lidas no WhatsApp`}>
      {x.conversas.map(([nome, msg, hora, qtd], i) => <li key={nome} style={{ "--ordem": n - 1 - i } as React.CSSProperties}>
        <span className={c.avatar} aria-hidden>{nome[0]}</span>
        <span className={c.conversa}>
          <b>{nome}</b>
          <span>{msg}</span>
        </span>
        <span className={c.horaQtd}>
          <small>{hora}</small>
          <i aria-label={`${qtd} não lida${qtd > 1 ? "s" : ""}`}>{qtd}</i>
        </span>
      </li>)}
    </ul>
    <p className={c.inboxRodape}>{x.rodape}</p>
  </div>;
}

/* ---------- 4. A TRANSFORMAÇÃO ----------
   Os dois caminhos desenhados. O de hoje é uma linha tracejada torta: as
   fichas sobem e descem, duas placas de espera com relógio interrompem o
   caminho, e o fim é um "talvez compre" apagado com um "?" rosa. O da
   vitrine é uma faixa escura com um trilho verde reto, fichas alinhadas,
   e o fim é o "Pedido ✓" verde. A diferença se vê antes de se ler. */
/* FORA DA PÁGINA desde 05/10/2026 (o corte de 16 para 9 seções, pedido
   do Rafael: "não acha que tem muito conteúdo?"). Fica no arquivo para
   voltar com uma linha na page.tsx. */
export function ViradaV2() {
  const x = useV2().virada;
  return <section className={s.section} id="virada">
    <div className={s.wrap}>
      <h2 className={s.h2Duplo}>{x.h2}</h2>
      <div className={c.caminhos}>
        <div className={c.caminhoTorto}>
          <div className={c.caminhoCabeca}>
            <p className={c.caminhoRotulo}>{x.antesRotulo}</p>
            <p className={c.caminhoConta}>{x.antesConta.map(k => <span key={k}>{k}</span>)}</p>
          </div>
          <ol>
            {x.antes.map(([txt, tipo], i) => <li key={i} className={tipo === "espera" ? c.parada : tipo === "fim" ? c.talvez : c.ficha}>
              {tipo === "espera" && <i className={c.relogio} aria-hidden />}{txt}{tipo === "fim" && <b aria-hidden>?</b>}
            </li>)}
          </ol>
        </div>
        <div className={c.caminhoReto}>
          <div className={c.caminhoCabeca}>
            <p className={c.caminhoRotulo}>{x.depoisRotulo}</p>
            <p className={c.caminhoConta}>{x.depoisConta.map(k => <span key={k}>{k}</span>)}</p>
          </div>
          <ol>
            {x.depois.map((e, i) => <li key={e} className={i === x.depois.length - 1 ? c.chegou : ""}>{e}{i === x.depois.length - 1 && <b aria-hidden>✓</b>}</li>)}
          </ol>
        </div>
      </div>
      <p className={c.fraseGrande}><span>{x.frase[0]}</span> <em>{x.frase[1]}</em></p>
    </div>
  </section>;
}

/* ---------- 5. A DEMONSTRAÇÃO ----------
   Quatro celulares, um por passo, contando a MESMA compra do vídeo do
   hero: perfil, vitrine, peça, WhatsApp. Numerados porque é uma
   sequência, e em escada (cada um um pouco mais baixo), que é a leitura
   do caminho descendo até o pedido. */
export function DemoV2() {
  const x = useV2().demo;
  return <section className={`${s.section} ${s.dark}`} id="demonstracao">
    <div className={s.wrap}>
      <h2 className={s.h2Duplo}>{x.h2}</h2>
      <ol className={c.passosTelas}>
        {x.passos.map((p, i) => <li key={p.titulo}>
          <div className={c.passoTexto}>
            <span className={c.passoNum} aria-hidden>{i + 1}</span>
            <h3>{p.titulo}</h3>
            <p>{p.diz}</p>
          </div>
          <div className={c.miniCel}>
            {p.tela
              ? <Image src={p.tela} alt={x.alt.replace("{n}", String(i + 1)).replace("{t}", p.titulo)} width={400} height={722} sizes="(max-width: 760px) 42vw, 220px" />
              : <PerfilInsta />}
          </div>
        </li>)}
      </ol>
      <p className={c.demoFecho}>{x.fecho}</p>
    </div>
  </section>;
}

/* A tela 1, desenhada no tema claro do Instagram, com os dados REAIS do
   perfil (foto, nome, números, bio e 9 posts) e o link www.verit.com.br
   com o dedo tocando nele. */
function PerfilInsta() {
  const x = useV2().demo.insta;
  return <div className={c.insta} role="img" aria-label={`Passo 1 da compra no celular: o perfil @${x.arroba} no Instagram, com o link ${x.link} na bio`}>
    <div className={c.instaTopo}><b>{x.arroba}</b></div>
    <div className={c.instaPerfil}>
      <Image className={c.instaAvatar} src={x.avatar} alt="" width={96} height={96} />
      <div className={c.instaNumeros}>
        <b>{x.nome}</b>
        <span>{x.numeros.map(([n, r]) => <span key={r}><b>{n}</b> {r}</span>)}</span>
      </div>
    </div>
    <div className={c.instaBio}>
      {x.bio.map(l => <span key={l}>{l}</span>)}
      <span className={c.instaLink}>🔗 {x.link}<i className={c.dedo} aria-hidden /></span>
    </div>
    <div className={c.instaBotoes}>{x.botoes.map(t => <span key={t}>{t}</span>)}</div>
    <Image className={c.instaFeed} src={x.feed} alt="" width={484} height={484} />
  </div>;
}

/* ---------- 6. CRO: a prancha anotada ----------
   Um celular com uma tela real no centro, e os seis princípios como
   anotações de projeto em volta, ligadas por linha tracejada ao aparelho;
   na tela, cada princípio é um retângulo de marcação rosa com o número na
   quina, em volta do elemento (nunca por cima do texto). É como um designer marca um layout,
   e mostra o CRO funcionando em vez de listar. O "celular primeiro" não
   tem retângulo: ele é o aparelho todo. */
export function CroV2() {
  const x = useV2().cro;
  return <section className={s.section} id="cro">
    <div className={s.wrap}>
      <p className={s.eyebrow}>{x.eyebrow}</p>
      <h2 className={s.h2Duplo}>{x.h2}</h2>
      <p className={`${s.lead} ${c.secLead}`}>{x.lead}</p>
      <div className={c.prancha}>
        <div className={c.pranchaCel}>
          <div className={c.pranchaTela}>
            <Image src={x.tela} alt={x.telaAlt} width={400} height={722} sizes="300px" />
            {x.principios.map((p, i) => p.caixa && <span key={p.t} className={c.marca} style={{ top: `${p.caixa[0]}%`, left: `${p.caixa[1]}%`, width: `${p.caixa[2]}%`, height: `${p.caixa[3]}%` }} aria-hidden><b>{i + 1}</b></span>)}
          </div>
        </div>
        <ol className={c.notas}>
          {x.principios.map((p, i) => <li key={p.t} className={p.lado === "esq" ? c.notaEsq : c.notaDir} style={{ "--y": p.ny } as React.CSSProperties}>
            <span className={c.notaNum} aria-hidden>{i + 1}</span>
            <h3>{p.t}</h3>
            <p>{p.d}</p>
          </li>)}
        </ol>
      </div>
      <p className={c.croFecho}>{x.fecho}</p>
    </div>
  </section>;
}

/* ---------- 7. NÃO É TEMPLATE ----------
   Três lojas de cara oposta lado a lado (a vérít.lab escura e grafitada,
   a Japa vermelha de surf, a Full Time de skate): a prova de que não é a mesma página trocando o
   logo está na diferença entre as três, não em texto. */
/* FORA DA PÁGINA desde 05/10/2026 (o corte de 16 para 9 seções, pedido
   do Rafael: "não acha que tem muito conteúdo?"). Fica no arquivo para
   voltar com uma linha na page.tsx. */
export function TemplateV2() {
  const x = useV2().template;
  return <section className={`${s.section} ${s.dark}`} id="nao-e-template">
    <div className={s.wrap}>
      <h2 className={s.h2Duplo}>{x.h2}</h2>
      <p className={`${s.lead} ${s.leadDark} ${c.secLead}`}>{x.lead}</p>
      <ul className={c.lojas}>
        {x.lojas.map(l => <li key={l.nome}>
          <div className={c.lojaTela}><Image src={l.img} alt={`Página inicial da ${l.nome}`} width={1280} height={800} sizes="(max-width: 900px) 92vw, 30vw" /></div>
          <h3>{l.nome}</h3>
          <p>{l.ramo}</p>
        </li>)}
      </ul>
    </div>
  </section>;
}

/* ---------- 8. ESCALA ---------- */
/* FORA DA PÁGINA desde 05/10/2026 (o corte de 16 para 9 seções, pedido
   do Rafael: "não acha que tem muito conteúdo?"). Fica no arquivo para
   voltar com uma linha na page.tsx. */
export function EscalaV2() {
  const x = useV2().escala;
  const k = x.cena;
  const { ref, classe } = useChegada<HTMLDivElement>(0.3);
  /* onde as etiquetas aparecem na multidão: posições fixas, espalhadas */
  const comEtiqueta = [2, 7, 11, 16, 20, 25];
  return <section className={s.section} id="escala">
    <div className={s.wrap}>
      <h2 className={s.h2Duplo}>{x.h2}</h2>
      <p className={`${s.lead} ${c.secLead}`}>{x.lead}</p>
      <div ref={ref} className={`${c.cenas} ${classe}`}>
        <figure className={c.cenaDirect}>
          <figcaption><b>{x.linhas[0][0]}</b><span>{x.linhas[0][1]}</span></figcaption>
          <div className={c.atendimento} aria-hidden>
            <span className={c.voce}>{k.voce}</span>
            <span className={c.respondendo}>{k.respondendo}</span>
            <span className={`${c.pessoa} ${c.pessoaAtendida}`} />
          </div>
          <div className={c.fila} aria-hidden>
            {Array.from({ length: k.fila }, (_, i) => <span key={i} className={c.pessoa} style={{ "--i": i } as React.CSSProperties}><i className={c.relogioMini} /></span>)}
          </div>
          <p className={c.cenaLegenda} aria-hidden>{k.esperando}</p>
        </figure>
        <figure className={c.cenaVitrine}>
          <figcaption><b>{x.linhas[1][0]}</b><span>{x.linhas[1][1]}</span></figcaption>
          <span className={c.aoVivo}><i aria-hidden />{k.navegando}</span>
          <div className={c.multidao} aria-hidden>
            {Array.from({ length: k.multidao }, (_, i) => {
              const e = comEtiqueta.indexOf(i);
              return <span key={i} className={c.pessoa} style={{ "--i": i } as React.CSSProperties}>{e >= 0 && <em className={c.etiquetaMini}>{k.etiquetas[e]}</em>}</span>;
            })}
          </div>
        </figure>
      </div>
      <p className={c.escalaFecho}>{x.fecho}</p>
    </div>
  </section>;
}

/* ---------- 8. ESCALA: a fila contra a multidão ----------
   (acima) No direct, você atende UM, e a fila espera com o reloginho,
   mais apagada quanto mais longe. Na vitrine, uma multidão navega ao
   mesmo tempo, com etiquetas do que está escolhendo. Na chegada, a fila
   se forma devagar, uma pessoa por vez, e a multidão aparece toda numa
   cascata rápida: o contraste está no próprio movimento. */

/* ---------- 9. PROVA: Japa Modas e Full Time ----------
   O mesmo objeto da /vitrine-digital (a janela do navegador com a loja
   inteira rolando sozinha, o selo NO AR pulsando), com as duas lojas que
   o Rafael escolheu e o antes e depois do roteiro. As classes de moldura
   (laptop, lapScreen, pageShot...) são as de lá: o --dur calibra a
   velocidade da rolagem pela altura da captura. */
export function ProvaV2() {
  const x = useV2().prova;
  return <section className={`${s.section} ${s.dark}`} id="projetos">
    <div className={s.wrap}>
      <p className={s.eyebrow}>{x.eyebrow}</p>
      <h2 className={s.h2Duplo}>{x.h2}</h2>
      <p className={`${s.lead} ${s.leadDark} ${c.secLead}`}>{x.lead}</p>
      <div className={`${s.projects} ${c.provaTres}`}>
        {x.lojas.map(l => <article key={l.nome}>
          <div className={s.laptop}>
            <div className={s.lapScreen}>
              <div className={s.browserBar}>
                <span className={s.dots} aria-hidden><i /><i /><i /></span>
                <span className={s.urlChip}>{l.dom}</span>
                <span className={s.live}><i aria-hidden /> {x.live}</span>
              </div>
              <a className={s.cover} href={l.url} target="_blank" rel="noopener" aria-label={`Abrir a vitrine da ${l.nome} em nova aba`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={s.pageShot} src={l.img} width={l.w} height={l.h} style={{ "--dur": l.dur } as React.CSSProperties} alt={`Página inicial completa da vitrine da ${l.nome}`} loading="lazy" decoding="async" />
              </a>
            </div>
          </div>
          <div className={s.projMeta}><small>{l.tag}</small></div>
          <h3>{l.nome}</h3>
          <dl className={c.antesDepois}>
            <div><dt>{x.antesRotulo}</dt><dd>{l.antes}</dd></div>
            <div><dt>{x.depoisRotulo}</dt><dd>{l.depois}</dd></div>
          </dl>
          <a className={`${s.button} ${s.acao}`} href={l.url} target="_blank" rel="noopener" data-cta={`case_${l.dom}`} data-cta-dest="case">{l.cta}</a>
        </article>)}
      </div>
    </div>
  </section>;
}

/* ---------- o painel de desempenho (bônus) ----------
   Um painel inteiro, como ele seria, e não um quadrinho de números: os
   quatro números com minigráfico, visitas e contatos por dia, o funil do
   clique ao WhatsApp, a origem de quem chama e os produtos que mais geram
   contato. Gráficos em SVG puro, calculados aqui a partir das séries do
   dicionário (nenhuma biblioteca). TUDO é exemplo, com o selo na tela.
   Ao lado do título, as perguntas que o painel responde: é a "entrega de
   resultado" que o Rafael pediu em 05/10. */
const num = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/* uma linha que cabe no retângulo w x h, com folga embaixo */
function linha(serie: number[], w: number, h: number) {
  const max = Math.max(...serie), min = Math.min(...serie);
  const passo = w / (serie.length - 1);
  return serie.map((v, i) => `${(i * passo).toFixed(1)},${(h - 4 - ((v - min) / (max - min || 1)) * (h - 8)).toFixed(1)}`).join(" ");
}

function Mini({ serie, viva = false }: { serie: number[]; viva?: boolean }) {
  return <svg className={c.mini} viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden>
    <polyline points={linha(serie, 100, 28)} fill="none" stroke={viva ? "var(--green-live)" : "#9BA6A0"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
  </svg>;
}

/* FORA DA PÁGINA desde 05/10/2026 (o corte de 16 para 9 seções, pedido
   do Rafael: "não acha que tem muito conteúdo?"). Fica no arquivo para
   voltar com uma linha na page.tsx. */
export function DadosV2() {
  const x = useV2().dados;
  const tl = x.tela;
  const visitantes = tl.visitas.reduce((a, b) => a + b, 0);
  const contatos = tl.contatos.reduce((a, b) => a + b, 0);
  const vistos = Math.round(visitantes * tl.vistosPorVisita);
  const taxa = (contatos / visitantes) * 100;
  const viram = Math.round(visitantes * tl.viuProduto);
  const funil = [visitantes, viram, contatos];
  const maiorTopo = Math.max(...tl.topo.map(([, n]) => n));

  /* o gráfico grande: área das visitas e barras dos contatos */
  const W = 640, H = 200, maxV = Math.max(...tl.visitas), maxC = Math.max(...tl.contatos);
  const passo = W / (tl.visitas.length - 1);
  const pontos = tl.visitas.map((v, i) => [i * passo, H - 10 - (v / maxV) * (H - 30)] as const);
  const area = `M0,${H} ${pontos.map(([px, py]) => `L${px.toFixed(1)},${py.toFixed(1)}`).join(" ")} L${W},${H} Z`;

  /* a rosca da origem: um círculo por fatia, com dasharray */
  const R = 42, CIRC = 2 * Math.PI * R;
  let acum = 0;
  const cores = ["var(--green-live)", "var(--rosa)", "#9BA6A0"];

  const kpis = [
    { k: tl.rotulos.visitantes, v: num(visitantes), d: tl.variacao.visitantes, serie: tl.visitas },
    { k: tl.rotulos.vistos, v: num(vistos), d: tl.variacao.vistos, serie: tl.visitas.map(v => v * tl.vistosPorVisita) },
    { k: tl.rotulos.contatos, v: num(contatos), d: tl.variacao.contatos, serie: tl.contatos },
    { k: tl.rotulos.taxa, v: pct(taxa), d: tl.variacao.taxa, serie: tl.contatos.map((cc, i) => cc / tl.visitas[i]), viva: true },
  ];

  return <section className={s.section} id="dados">
    <div className={s.wrap}>
      <div className={c.dadosTopo}>
        <div>
          <p className={s.eyebrow}>{x.eyebrow}</p>
          <h2 className={s.h2Duplo}>{x.h2}</h2>
          <p className={`${s.lead} ${c.secLead}`}>{x.lead}</p>
        </div>
        <div className={c.perguntas}>
          <p className={c.perguntasTitulo}>{x.perguntasTitulo}</p>
          <dl>{x.perguntas.map(([p, r]) => <div key={p}><dt>{p}</dt><dd>{r}</dd></div>)}</dl>
        </div>
      </div>

      <figure className={c.painel} aria-label="Exemplo do painel de desempenho, com dados fictícios">
        <div className={c.painelBarra}>
          <b>{tl.titulo}</b>
          <span className={c.abas}>{tl.abas.map((a, i) => <i key={a} className={i === tl.abas.length - 1 ? c.abaAtiva : ""}>{a}</i>)}</span>
          <span className={c.selo}>{tl.selo}</span>
        </div>

        <dl className={c.kpis}>
          {kpis.map(k => <div key={k.k} className={k.viva ? c.kpiViva : ""}>
            <dt>{k.k}</dt>
            <dd><b>{k.v}</b><Mini serie={k.serie} viva={k.viva} /><small><span>▲ {k.d}</span> {tl.rotulos.mes}</small></dd>
          </div>)}
        </dl>

        <div className={c.painelGrade}>
          <div className={c.cartao}>
            <p className={c.cartaoTitulo}>{tl.graficoTitulo}</p>
            <p className={c.legenda}><i className={c.legV} />{tl.legenda[0]} <i className={c.legC} />{tl.legenda[1]}</p>
            <svg className={c.grafico} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${tl.graficoTitulo}: ${num(visitantes)} visitantes e ${contatos} contatos em 30 dias (exemplo)`}>
              <defs><linearGradient id="v2area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1FBF7A" stopOpacity=".45" /><stop offset="1" stopColor="#1FBF7A" stopOpacity="0" /></linearGradient></defs>
              {[0.25, 0.5, 0.75].map(g => <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#2A3134" strokeWidth="1" />)}
              <path d={area} fill="url(#v2area)" />
              <polyline points={pontos.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")} fill="none" stroke="#1FBF7A" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              {tl.contatos.map((cc, i) => { const hb = (cc / maxC) * (H * 0.38); return <rect key={i} x={i * passo - 5} y={H - hb} width="10" height={hb} fill="#E31B62" rx="2" />; })}
            </svg>
          </div>

          <div className={c.cartao}>
            <p className={c.cartaoTitulo}>{tl.funilTitulo}</p>
            <ol className={c.funil}>
              {funil.map((v, i) => <li key={tl.funil[i]} style={{ "--w": `${Math.max(14, (v / funil[0]) * 100)}%` } as React.CSSProperties}>
                <span className={c.funilBarra}><b>{num(v)}</b></span>
                <span className={c.funilRotulo}>{tl.funil[i]}{i > 0 && <em> {pct((v / funil[0]) * 100)}</em>}</span>
              </li>)}
            </ol>
          </div>

          <div className={c.cartao}>
            <p className={c.cartaoTitulo}>{tl.origemTitulo}</p>
            <div className={c.origem}>
              <svg viewBox="0 0 110 110" className={c.rosca} aria-hidden>
                <circle cx="55" cy="55" r={R} fill="none" stroke="#2A3134" strokeWidth="16" />
                {tl.origem.map(([, p], i) => { const fat = (p / 100) * CIRC; const el = <circle key={i} cx="55" cy="55" r={R} fill="none" stroke={cores[i]} strokeWidth="16" strokeDasharray={`${fat} ${CIRC - fat}`} strokeDashoffset={-acum} transform="rotate(-90 55 55)" />; acum += fat; return el; })}
                <text x="55" y="60" textAnchor="middle" className={c.roscaTexto}>{tl.origem[0][1]}%</text>
              </svg>
              <ul>{tl.origem.map(([o, p], i) => <li key={o}><i style={{ background: cores[i] }} />{o}<b>{p}%</b></li>)}</ul>
            </div>
          </div>

          <div className={c.cartao}>
            <p className={c.cartaoTitulo}>{tl.topoTitulo}</p>
            <ol className={c.topoLista}>
              {tl.topo.map(([nome, n]) => <li key={nome}>
                <span>{nome}</span><b>{n}</b>
                <i style={{ width: `${(n / maiorTopo) * 100}%` }} aria-hidden />
              </li>)}
            </ol>
          </div>
        </div>
      </figure>
      <p className={c.dadosNota}>{x.nota}</p>
    </div>
  </section>;
}

/* ---------- a faixa de bônus do painel de desempenho ----------
   O que sobrou do painel grande no corte de 05/10: os quatro números com
   minigráfico, numa faixa grafite dentro da seção do painel da loja. Os
   totais saem das mesmas séries de dados.tela (então batem com o que o
   painel grande mostrava) e o selo de exemplo continua na tela. */
function BonusDesempenho() {
  const t = useBase().v2;
  const b = t.admin.bonus;
  const tl = t.dados.tela;
  const visitantes = tl.visitas.reduce((a, n) => a + n, 0);
  const contatos = tl.contatos.reduce((a, n) => a + n, 0);
  const kpis = [
    { k: tl.rotulos.visitantes, v: num(visitantes), serie: tl.visitas },
    { k: tl.rotulos.vistos, v: num(Math.round(visitantes * tl.vistosPorVisita)), serie: tl.visitas },
    { k: tl.rotulos.contatos, v: num(contatos), serie: tl.contatos },
    { k: tl.rotulos.taxa, v: pct((contatos / visitantes) * 100), serie: tl.contatos.map((cc, i) => cc / tl.visitas[i]), viva: true },
  ];
  return <aside className={c.bonusFaixa} aria-label={b.titulo}>
    <div className={c.bonusTexto}>
      <span className={c.bonusRotulo}>{b.rotulo}</span>
      <b>{b.titulo}</b>
      <p>{b.texto}</p>
    </div>
    <dl className={c.bonusKpis}>
      {kpis.map(k => <div key={k.k} className={k.viva ? c.kpiViva : ""}><dt>{k.k}</dt><dd><b>{k.v}</b><Mini serie={k.serie} viva={k.viva} /></dd></div>)}
    </dl>
    <span className={c.selo}>{tl.selo}</span>
  </aside>;
}

/* ---------- O PAINEL DA LOJA: um painel que se testa ----------
   O formulário à esquerda é de verdade (estado do React, nada vai para
   servidor nenhum): a pessoa muda o preço ou o estoque, toca em Salvar, e
   o cartão da vitrine à direita muda, com "atualizado agora". É a prova
   do "não depende de programador" feita pela própria pessoa. O Salvar
   leva data-cta, então quem testou aparece no ClickCTA da medição. */
const formatarPreco = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;

export function AdminV2() {
  const x = useV2().admin;
  const [preco, setPreco] = useState(String(x.peca.preco));
  const [estado, setEstado] = useState(x.estados[0][0]);
  const [salvo, setSalvo] = useState({ preco: x.peca.preco, estado: x.estados[0][0] });
  const [aviso, setAviso] = useState(false);
  const mudou = Number(preco) !== salvo.preco || estado !== salvo.estado;

  const salvar = () => {
    const n = Number(preco.replace(/\D/g, "")) || salvo.preco;
    setPreco(String(n));
    setSalvo({ preco: n, estado });
    setAviso(true);
    window.setTimeout(() => setAviso(false), 2600);
  };
  const selo = x.estados.find(e => e[0] === salvo.estado)?.[2] ?? "";

  return <section className={`${s.section} ${c.adminSec}`} id="painel">
    <div className={s.wrap}>
      <p className={s.eyebrow}>{x.eyebrow}</p>
      <h2 className={s.h2Duplo}>{x.h2}</h2>
      <p className={`${s.lead} ${c.secLead}`}>{x.lead}</p>

      <div className={c.adminGrid}>
        <div className={c.admin}>
          <div className={c.adminTopo}>
            <b>{x.peca.loja}</b>
            <span className={c.adminAbas}>{x.abas.map((a, i) => <i key={a} className={i === x.abaAtiva ? c.adminAbaAtiva : ""}>{a}</i>)}</span>
          </div>
          <div className={c.adminPeca}>
            <Image src={x.peca.img} alt="" width={600} height={750} sizes="72px" />
            <span><b>{x.peca.nome}</b><small>{x.peca.detalhe}</small></span>
          </div>
          <label className={c.adminCampo}>
            <span>{x.rotulos.preco}</span>
            <span className={c.adminPreco}>
              <em aria-hidden>R$</em>
              <input inputMode="numeric" value={Number(preco || 0).toLocaleString("pt-BR")} onFocus={e => e.target.select()} onChange={e => setPreco(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-label="Preço da peça em reais" />
            </span>
          </label>
          <div className={c.adminCampo} role="radiogroup" aria-label={x.rotulos.estado}>
            <span>{x.rotulos.estado}</span>
            <span className={c.adminEstados}>
              {x.estados.map(([id, rotulo]) => <button key={id} type="button" role="radio" aria-checked={estado === id} className={estado === id ? c.adminEstadoAtivo : ""} onClick={() => setEstado(id)}>{rotulo}</button>)}
            </span>
          </div>
          <button type="button" className={`${s.button} ${s.acao} ${c.adminSalvar}`} onClick={salvar} disabled={!mudou} data-cta="painel_teste" data-cta-dest="teste">{x.rotulos.salvar}</button>
          <p className={c.adminAviso} role="status">{aviso ? x.rotulos.salvo : ""}</p>
        </div>

        <span className={c.adminSeta} aria-hidden>→</span>

        <div className={c.adminVitrine}>
          <div className={`${c.cardPeca} ${salvo.estado === "esgotado" ? c.cardEsgotado : ""} ${aviso ? c.cardPiscou : ""}`}>
            <div className={c.cardFoto}>
              <Image src={x.peca.img} alt={`Quadro ${x.peca.nome} na vitrine da ${x.peca.loja}`} width={600} height={750} sizes="260px" />
              {selo && <span className={c.cardSelo}>{selo}</span>}
            </div>
            <b className={c.cardNome}>{x.peca.nome}</b>
            <small className={c.cardDetalhe}>{x.peca.detalhe}</small>
            <span className={c.cardPreco}>{formatarPreco(salvo.preco)}</span>
            <span className={c.cardPedir}>{x.rotulos.pedir} →</span>
          </div>
          <span className={`${c.agora} ${aviso ? c.agoraVisivel : ""}`} aria-hidden><i />{x.rotulos.agora}</span>
        </div>
      </div>

      <ul className={c.adminProvas}>{x.provas.map(p => <li key={p}>{p}</li>)}</ul>
      <p className={c.adminClaim}>{x.claim}</p>
      <BonusDesempenho />
    </div>
  </section>;
}

/* ---------- 10. A OFERTA: o cupom e o caixa ----------
   O título em cima; embaixo, à esquerda, o cupom fiscal com tudo o que
   entra, linha por linha, até "Mensalidade R$ 0,00" e o total; à direita,
   o cartão de compra com o carimbo rosa "sem mensalidade".
   ---------- duas saídas, com hierarquia ----------
   Pix em rosa (à vista, a forma que o Rafael prefere receber) e cartão
   em grafite, do mesmo tamanho. A dúvida no WhatsApp vem embaixo, como
   link: quem decidiu não é obrigado a conversar. */
export function OfertaV2() {
  const o = useV2().oferta;
  return <section className={`${s.section} ${s.offer}`} id="oferta">
    <div className={`${s.wrap} ${c.ofertaGrid}`}>
      <div className={c.ofertaTexto}>
        <h2 className={s.h2Duplo}>{o.h2}</h2>
        <p className={`${s.lead} ${c.secLead}`}>{o.lead}</p>
      </div>
      <div className={c.cupom} role="group" aria-label={o.cupom.titulo}>
        <div className={c.cupomCabeca}>
          {o.cupom.cabecalho.map(l => <span key={l}>{l}</span>)}
          <b>{o.cupom.titulo}</b>
        </div>
        <ul className={c.cupomItens}>
          {o.itens.map(x => <li key={x}><span>{x}</span><i aria-hidden /><em>{o.cupom.incluso}</em></li>)}
          <li className={c.cupomBonus}><span>{o.cupom.bonusItem}</span><i aria-hidden /><em>{o.cupom.bonusValor}</em></li>
        </ul>
        <div className={c.cupomSoma}>
          <p><span>{o.cupom.mensalidade}</span><i aria-hidden /><b>{o.cupom.mensalidadeValor}</b></p>
          <p className={c.cupomTotal}><span>{o.cupom.total}</span><i aria-hidden /><b>{o.cupom.totalValor}</b></p>
        </div>
        <span className={c.barras} aria-hidden />
        <p className={c.cupomRodape}>{o.cupom.rodape}</p>
      </div>
      <div className={c.caixa}>
        <p className={c.caixaPreco}>{o.preco}</p>
        <div className={c.caixaLinha}>
          <p className={c.caixaVez}>{o.vez}</p>
          <span className={c.carimboOferta}>{o.carimbo[0]} {o.carimbo[1]}</span>
        </div>
        <p className={c.caixaParcela}>{o.parcela}<span>{o.parcelaNota}</span></p>
        <div className={c.botoes}>
          <button type="button" className={`${s.button} ${s.acao}`} data-checkout-item="avista_pix" data-cta="oferta_pix" data-cta-dest="checkout">{o.pix}</button>
          <button type="button" className={`${s.button} ${s.primary}`} data-checkout-item="avista_card" data-cta="oferta_cartao" data-cta-dest="checkout">{o.cartao}</button>
        </div>
        <p className={c.seguro}>{o.seguro}</p>
        <p className={c.duvida}>
          {o.duvida}{" "}
          <a href={linkWhatsApp(o.duvidaMsg)} target="_blank" rel="noopener" data-cta="oferta_duvida" data-cta-dest="whatsapp">{o.duvidaLink}</a>
        </p>
      </div>
    </div>
  </section>;
}

/* ---------- 11. RISCO: o que acontece depois da compra ----------
   Os quatro passos numa linha do tempo vertical, e ao lado um celular com
   a conversa de WhatsApp em que eles acontecem: o "quem responde sou eu"
   mostrado, não dito. O número do passo é sequência de verdade. */
export function RiscoV2() {
  const x = useV2().risco;
  return <section className={`${s.section} ${s.dark}`} id="depois">
    <div className={`${s.wrap} ${c.riscoGrid}`}>
      <div>
        <h2 className={s.h2Duplo}>{x.h2}</h2>
        <p className={`${s.lead} ${s.leadDark} ${c.secLead}`}>{x.lead}</p>
        <ol className={c.linhaTempo}>
          {x.passos.map(([titulo, texto]) => <li key={titulo}><h3>{titulo}</h3><p>{texto}</p></li>)}
        </ol>
      </div>
      <Conversa />
    </div>
  </section>;
}

function Conversa() {
  const x = useV2().risco.chat;
  return <div className={c.conversaCel} role="img" aria-label="Conversa de exemplo no WhatsApp entre o cliente e o Rafael, do pagamento à loja no ar">
    <div className={c.conversaTopo}>
      <span className={c.conversaAvatar} aria-hidden>RR</span>
      <span><b>{x.nome}</b><small>{x.status}</small></span>
    </div>
    <div className={c.conversaCorpo}>
      {x.mensagens.map((msg, i) => {
        if (msg.tipo === "dia") return <span key={i} className={c.conversaDia}>{msg.texto}</span>;
        const lado = msg.tipo === "cliente" || msg.tipo === "arquivo" ? c.daCliente : c.doRafael;
        return <div key={i} className={`${c.msg} ${lado}`}>
          {msg.tipo === "arquivo"
            ? <span className={c.arquivo}><i aria-hidden /> <span><b>{msg.texto}</b><small>{msg.detalhe}</small></span></span>
            : msg.tipo === "link"
              ? <><span className={c.previa}><i aria-hidden /><b>{msg.link}</b></span>{msg.texto}</>
              : msg.texto}
          <small className={c.msgHora}>{msg.hora}{lado === c.daCliente ? " ✓✓" : ""}</small>
        </div>;
      })}
    </div>
  </div>;
}

/* ---------- O FAQ: a conversa das dúvidas ----------
   Cada pergunta é um <details>: o <summary> é o balão branco recebido, e
   a resposta é o balão verde enviado, que entra deslizando quando a
   pessoa abre (movimento que responde a um toque, e só ele). Sem JS o
   <details> funciona igual. O primeiro já vem aberto, para mostrar que
   abre. */
export function FaqV2() {
  const t = useBase();
  const f = t.v2.faq;
  return <section className={s.section} id="faq">
    <div className={`${s.wrap} ${c.faqGrid}`}>
      <div className={c.faqTexto}>
        <p className={s.eyebrow}>{f.eyebrow}</p>
        <h2 className={s.h2Duplo}>{f.h2}</h2>
        <p className={`${s.lead} ${c.secLead}`}>{f.lead}</p>
        <p className={c.faqOutra}>
          {f.outra}{" "}
          <a href={linkWhatsApp(f.outraMsg)} target="_blank" rel="noopener" data-cta="faq_duvida" data-cta-dest="whatsapp">{f.outraLink}</a>
        </p>
      </div>
      <div className={c.faqChat}>
        {t.faq.itens.map((it, i) => <details key={it.p} className={c.faqItem} open={i === 0}>
          <summary className={c.faqPergunta}>
            <span>{it.p}</span>
            <small><em className={c.faqAbrir}>{f.abrir}</em><em className={c.faqFechar}>{f.fechar}</em></small>
          </summary>
          <p className={c.faqResposta}>{it.r}<small>{f.hora} ✓✓</small></p>
        </details>)}
      </div>
    </div>
  </section>;
}

/* ---------- 12. FECHAMENTO ---------- */
export function FimV2() {
  const t = useBase();
  const f = t.v2.fim;
  return <>
    <section id="fim" className={`${s.section} ${s.dark} ${s.final}`}>
      <h2 className={s.h2Duplo}>{f.h2}</h2>
      <p className={`${s.lead} ${c.secLead}`}>{f.lead}</p>
      <div className={s.actions}>
        <a className={`${s.button} ${s.acao}`} href="#oferta" data-cta="final" data-cta-dest="oferta">{f.cta}</a>
      </div>
    </section>
    <footer className={s.footer}>
      <div className={s.brand}><b>{t.marca.nome}</b><span>{t.marca.sufixo}</span></div>
      <nav>{t.rodape.links.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
      <small>{t.rodape.copyright}</small>
    </footer>
  </>;
}

/* A barra fixa do celular: entra depois de 0,85 de tela e some dentro da
   oferta e do fim, onde o botão já está na tela. Leva o preço, porque
   nesta página o preço É o argumento. */
export function BarraV2() {
  const b = useV2().barra;
  const [oculta, setOculta] = useState(true);
  useEffect(() => {
    let cedo = true, naOferta = false, noFim = false;
    const atualizar = () => setOculta(cedo || naOferta || noFim);
    const medir = () => { cedo = window.scrollY <= window.innerHeight * 0.85; atualizar(); };
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir, { passive: true });
    medir();
    const io = new IntersectionObserver(entradas => {
      for (const e of entradas) {
        if (e.target.id === "oferta") naOferta = e.isIntersecting;
        if (e.target.id === "fim") noFim = e.isIntersecting;
      }
      atualizar();
    }, { rootMargin: "-20% 0px" });
    ["oferta", "fim"].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => { window.removeEventListener("scroll", medir); window.removeEventListener("resize", medir); io.disconnect(); };
  }, []);
  return <div className={`${s.bar} ${oculta ? s.barHidden : ""}`}>
    <span className={s.barCopy}><b>{b.destaque}</b><span>{b.sub}</span></span>
    <a className={`${s.button} ${s.acao}`} href="#oferta" data-cta="sticky_mobile" data-cta-dest="oferta">{b.cta}</a>
  </div>;
}
