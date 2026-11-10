"use client";

/* ============================================================
   A /vitrine/iphone no desenho da /loja-online (09/11/2026, pedido do
   Rafael: "pega a referência da loja online").

   É o lote 17 (docs/lotes/lote-17-iphone.md): quem vende iPhone pelo
   Instagram. A primeira versão era a /vitrine-digital com outro texto;
   esta é a gramática da /loja-online (o topo de vidro, a manchete grande à
   esquerda, a pílula rosa com a seta, a faixa do nome, as seções presas aos
   fios, o "quem faz" grande, o preço nas metades e o FAQ), com o produto da
   VITRINE: R$ 999 sem mensalidade, pedido no WhatsApp.

   Copiado e não importado: o LojaOnline.tsx tem tudo isso preso ao texto
   dele (constantes no arquivo) e outra sessão mexe nele. As classes são as
   dele (loja-online.module.css e quem-faz.module.css), então o visual anda
   junto; o que muda está aqui.

   SEM TÊNIS (pedido do Rafael no mesmo dia): nenhuma loja de cliente
   aparece, porque todas são de tênis e moda. As telas são da amostra da JS
   Imports (Maringá, iPhone e Xiaomi), capturadas em 09/11 sem a faixa das
   marcas, que traz a maçã; o painel é o do modo local dela. É AMOSTRA, não
   cliente, e as legendas dizem isso.

   Honesto: nenhum preço de aparelho (a amostra não tem); o pedido de exemplo
   é um aparelho que está no catálogo dela; o preço vem de lib/oferta.ts.
   ============================================================ */

import { cloneElement, CSSProperties, FormEvent, Fragment, isValidElement, ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import s from "@/components/loja-online/loja-online.module.css";
import q from "@/components/loja-online/quem-faz.module.css";
import v from "@/app/(pt)/vitrine-digital/vitrine.module.css";
import p from "./preta.module.css";
import { QuemFazGrande } from "@/components/loja-online/QuemFazGrande";
import { CampoIsca, useGuardaDeFormulario } from "@/components/form-guarda";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { diagnosticoDoArroba, enviarLeadVitrine, ESPACO_NO_ARROBA, registrarSuspeito, temEspaco, type DiagnosticoArroba } from "@/components/vitrine/lead-flow";
import type { LojaEncontrada } from "@/components/lead";
import { focarSemContar, initTracking } from "@/components/vitrine/tracking";
import { ligarAncoras } from "@/components/vitrine/ancora";
import { Bubble, IconeInstagram, IconeWhatsApp, letraALetra, textoDe } from "@/components/vitrine/sections";
import { LangProvider } from "@/components/i18n";
import { pt } from "@/messages/vitrine.pt";
import { ptIphone } from "@/messages/vitrine.iphone.pt";
import { linkWhatsApp, WHATSAPP_EXIBIDO } from "@/lib/contato";
import { OFERTA } from "@/lib/oferta";

const PAGINA = "vitrine-digital-iphone";
const ABERTURA = "Oi Rafael! Vendo iPhone e quero ver a amostra da minha vitrine.";
const o = OFERTA.pt;
const VIT = o.vitrine;
const R = o.preco;
/* o convite único, o mesmo da /loja-online: diz o que a pessoa faz ao clicar */
const CTA = "Mandar o @ da minha loja";
/* o invólucro dos blocos que usam as classes da vitrine (a moldura, o celular, os balões) */
const VITRINE = `${v.site} ${v.botoesApple} ${v.tipoTitulo} ${v.estruturaCentro} ${v.semFontesExtras}`;
/* a versão preta (09/11): os tokens da vitrine vão inline no invólucro, que
   vence a regra .site dela; o resto do preto está em preta.module.css */
const TOKENS_VITRINE = { "--paper": "#0b0b0c", "--paper-2": "#161618", "--ink": "#f5f5f3", "--ink-soft": "#a9adaf", "--green": "#2fc983", "--green-dark": "#1fa86b", background: "transparent" } as CSSProperties;
/* os balões do WhatsApp são claros: lá dentro a tinta volta a ser a escura */
const TOKENS_ZAP = { "--ink": "#14181a", "--ink-soft": "#3a4144", background: "transparent" } as CSSProperties;

/* ---------- a medição ---------- */
function Analytics() {
  useEffect(() => {
    initTracking({ page: PAGINA, valor: VIT.total, currency: "BRL", lang: "pt" });
    ligarAncoras();
  }, []);
  return null;
}

/* ---------- o formulário da amostra (o da /loja-online, com o texto da vitrine) ----------
   O lead entra como `vitrine-digital-iphone`: a rota confere o @ e o card do
   CRM nasce como vitrine, com a nota "VEIO DA /vitrine/iphone". */
function FormAmostra() {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [linkWa, setLinkWa] = useState("");
  const [loja, setLoja] = useState<LojaEncontrada | null>(null);
  const [telInvalido, setTelInvalido] = useState(false);
  const [instaDiag, setInstaDiag] = useState<DiagnosticoArroba | null>(null);
  const [instaInvalido, setInstaInvalido] = useState("");
  const [recusas, setRecusas] = useState(0);
  const envioSuspeito = useGuardaDeFormulario();

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    const f = new FormData(e.currentTarget);
    const whatsapp = String(f.get("whatsapp") || "");
    const instagram = String(f.get("instagram") || "");
    const suspeito = envioSuspeito(e.currentTarget);
    if (suspeito) {
      registrarSuspeito({ nome: "", whatsapp, instagram, motivo: suspeito, lang: "pt", pagina: PAGINA });
      setEnviado(true);
      return;
    }
    if (!whatsappValido(whatsapp)) { setTelInvalido(true); return; }
    const diag = diagnosticoDoArroba(instagram);
    if (diag) { setInstaDiag(diag); return; }
    setEnviando(true);
    const r = await enviarLeadVitrine({ nome: "", whatsapp, instagram, ctaPosition: "hero_form", lang: "pt", pagina: PAGINA, abertura: ABERTURA });
    setEnviando(false);
    if (r.arrobaInvalido) { setInstaInvalido(instagram); setRecusas(n => n + 1); return; }
    setLinkWa(r.linkWa);
    setLoja(r.loja);
    /* sem gravar, o lead-flow já abriu o WhatsApp com a mensagem pronta */
    if (r.salvo) setEnviado(true);
  }

  if (enviado) return <div id="hero-form" className={`${s.form} ${s.ok}`} role="status">
    <p className={s.okLinha}><span className={s.okIcone} aria-hidden><Check /></span>Pedido recebido.</p>
    <p>Em até 24h eu te mando no WhatsApp a amostra da sua vitrine, montada com os seus aparelhos.</p>
    {loja && <p className={s.micro}>Encontrei <b>@{loja.arroba}</b> no Instagram{loja.seguidores ? `, com ${loja.seguidores.toLocaleString("pt-BR")} seguidores` : ""}. Se não for a sua loja, me avisa.</p>}
    {linkWa && <a className={`${s.botao} ${s.whats}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">Me chama no WhatsApp agora</a>}
  </div>;

  const a = instaInvalido.replace(/^@+/, "");
  return <form id="hero-form" className={s.form} onSubmit={enviar} noValidate>
    <p className={s.formTitulo}>Veja a sua vitrine antes de pagar</p>
    <p className={s.formSub}>Manda o @ da loja. Em até 24h eu te mando uma amostra com os seus aparelhos.</p>
    <div className={s.campos}>
      <label className={s.campo}>
        <span>Seu WhatsApp</span>
        <input name="whatsapp" type="tel" autoComplete="tel" placeholder="(44) 99999-0000" required maxLength={16} aria-invalid={telInvalido || undefined}
               onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); if (telInvalido) setTelInvalido(false); }} />
      </label>
      <label className={s.campo}>
        <span>O @ da loja</span>
        <input name="instagram" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="@sualoja" required aria-invalid={!!(instaDiag || instaInvalido) || undefined}
               onInput={() => { if (instaDiag) setInstaDiag(null); if (instaInvalido) setInstaInvalido(""); }} />
      </label>
    </div>
    <CampoIsca />
    {telInvalido && <small className={s.erro} role="alert">Confere o número: é por ele que eu te mando a amostra. Ex.: (44) 99999-0000.</small>}
    {(instaDiag || instaInvalido) && <small className={s.erro} role="alert">
      {instaDiag === "telefone" ? "Isso é um telefone. Aqui eu preciso do @ da loja no Instagram, o nome logo abaixo da foto do perfil."
        : instaDiag === "email" ? "Isso é um e-mail. Aqui eu preciso do @ da loja no Instagram, o nome logo abaixo da foto do perfil."
        : recusas >= 2 ? <>A Meta não reconhece <b>@{a}</b> como conta profissional, e os aparelhos da amostra saem do perfil. Se preferir, <a href={linkWhatsApp("Oi Rafael! Tentei mandar o @ da minha loja pela página da vitrine de iPhone e não deu certo. Pode me ajudar?")} target="_blank" rel="noopener" data-cta="arroba_ajuda" data-cta-dest="whatsapp">me chama no WhatsApp</a>.</>
        : temEspaco(a) ? ESPACO_NO_ARROBA
        : <>Não achei <b>@{a}</b> no Instagram. Confere o @ da loja: precisa ser a conta profissional, é dela que eu tiro as fotos.</>}
    </small>}
    <button type="submit" className={`${s.botao} ${s.rosa}`} disabled={enviando}>{enviando ? "Enviando..." : CTA}</button>
    <p className={s.micro}>A amostra é por minha conta. Se gostar, a vitrine sai por <b>{R(VIT.total)}</b>, sem mensalidade. Se não gostar, não paga nada.</p>
  </form>;
}

/* o formulário num modal: todo link para #hero-form abre o <dialog> */
function ModalAmostra() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const abrir = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href="#hero-form"]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const d = ref.current;
      if (!d || d.open) return;
      d.showModal();
      focarSemContar(d.querySelector("input"));
    };
    document.addEventListener("click", abrir, true);
    return () => document.removeEventListener("click", abrir, true);
  }, []);
  return <dialog ref={ref} className={s.modal} aria-label="Pedir a amostra da sua vitrine"
    onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    <button type="button" className={s.modalFechar} aria-label="Fechar" onClick={() => ref.current?.close()}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <FormAmostra />
  </dialog>;
}

const Check = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5 10 17.5 19 7" /></svg>;
const SetaBaixo = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M6 13l6 6 6-6" /></svg>;
const SetaDiagonal = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 18 18 6M9 6h9v9" /></svg>;
const SetaDireita = () => <svg viewBox="0 0 32 24" width="28" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12h25M21 5l7 7-7 7" /></svg>;

/* ---------- a entrada das seções e o título letra a letra (os da /loja-online) ---------- */
const d = (n: number) => ({ "--d": n }) as CSSProperties;
function Secao({ className = "", children, ...resto }: React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<"" | "armado" | "visto">("");
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight * .9 && r.bottom > 0) return;
    setEstado("armado");
    const io = new IntersectionObserver(([x]) => { if (x.isIntersecting) { setEstado("visto"); io.disconnect(); } }, { rootMargin: "0px 0px -18% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const anim = estado === "armado" ? s.anim : estado === "visto" ? `${s.anim} ${s.visto}` : "";
  return <section ref={ref} className={`${className} ${anim}`} {...resto}>{children}</section>;
}
function Titulo({ className = "", children }: { className?: string; children: ReactNode }) {
  let i = 0;
  const parte = (txt: string) => txt.split(/(\s+)/).map((w, k) => /^\s+$/.test(w) || !w ? w
    : <span key={k} className={s.palavra}>{[...w].map((c, j) => <span key={j} className={s.letra} style={{ "--i": i++ } as CSSProperties}>{c}</span>)}</span>);
  const letras = (n: ReactNode): ReactNode => {
    if (typeof n === "string" || typeof n === "number") return parte(String(n));
    if (Array.isArray(n)) return n.map((x, k) => <Fragment key={k}>{letras(x)}</Fragment>);
    if (isValidElement<{ children?: ReactNode }>(n)) return cloneElement(n, undefined, letras(n.props.children));
    return n;
  };
  return <h2 className={className}><span className={s.soLeitor}>{textoDe(children)}</span><span aria-hidden>{letras(children)}</span></h2>;
}

/* ---------- o topo de vidro ---------- */
function Topo() {
  return <header className={s.topo}>
    <a className={s.marca} href="/vitrine/iphone" aria-label="Rafael Razeira Estúdio, voltar ao topo"
       onClick={e => { e.preventDefault(); scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/marca/rr-monograma.webp" width={66} height={36} alt="" />
    </a>
    <nav className={s.topoNav} aria-label="Seções">
      <a href="#como-funciona">Como funciona</a>
      <a href="#painel">O painel</a>
      <a href="#oferta">Preço</a>
    </nav>
    <a className={s.topoCta} href={linkWhatsApp("Oi Rafael! Vim pela página da vitrine de iPhone e quero tirar uma dúvida.")} target="_blank" rel="noopener" data-cta="topo_whatsapp" data-cta-dest="whatsapp" aria-label="Vamos conversar no WhatsApp"><SetaDiagonal />Vamos conversar</a>
  </header>;
}

/* ---------- a faixa do nome, a 200px por segundo ---------- */
const FAIXA_PX_S = 200;
function FaixaNome() {
  const trilho = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trilho.current;
    if (!el) return;
    const medir = () => { const copia = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0; if (copia) el.style.animationDuration = `${copia / FAIXA_PX_S}s`; };
    medir();
    addEventListener("resize", medir);
    document.fonts?.ready.then(medir);
    return () => removeEventListener("resize", medir);
  }, []);
  return <div className={q.faixaNome} aria-hidden>
    <div ref={trilho} className={q.faixaTrilho}>
      {[0, 1, 2, 3].map(k => <span key={k}>RAFAEL RAZEIRA ESTÚDIO.</span>)}
    </div>
  </div>;
}

/* ---------- o hero ----------
   A manchete é a fala 1 do meio do vídeo ("eu monto uma amostra da sua
   vitrine... e não te cobro nada por ela"). Na moldura, a amostra da JS
   Imports rolando do topo ao rodapé (a mesma animação da /vitrine-digital),
   com o chip "Amostra", nunca "No ar" de loja de cliente. */
/* o "é" entra no verde: solto, ele caía sozinho numa linha em 1440 (o <em> tem linha própria) */
const H1 = <>A amostra da sua vitrine <em>é por minha conta.</em></>;
function Hero() {
  return <section className={`${v.hero} ${q.fiosHero} ${q.heroW}`} id="topo">
    <h1 className={q.heroTitulo}><span className={v.soLeitor}>{textoDe(H1)}</span><span aria-hidden>{letraALetra(H1)}</span></h1>
    <div className={q.heroBase}>
      <p className={q.heroLead}>Para quem vende iPhone pelo Instagram. Eu monto com os seus aparelhos em até 24h: o cliente vê preço, memória, cor e fotos sem te perguntar, e o pedido chega pronto no seu WhatsApp.</p>
      <div className={q.heroAcoes} data-hero-acoes>
        <a className={q.heroCta} href="#hero-form" data-cta="hero_abrir" data-cta-dest="form"><span>{CTA}</span><span className={q.heroCtaSeta} aria-hidden><SetaDireita /></span></a>
        <a className={`${q.heroLink} ${q.heroDesce}`} href="#como-funciona" data-cta="hero_como" data-cta-dest="como-funciona">Ver como funciona<span className={q.heroDesceSeta}><SetaBaixo /></span></a>
      </div>
    </div>
    <div className={`${v.cena} ${q.heroCena}`}>
      <div className={v.moldura} id="vitrine-no-ar">
        <div className={`${v.molduraTela} ${q.molduraTelaW}`} role="img" aria-label="A amostra da vitrine da JS Imports rolando do topo ao rodapé: iPhone, Xiaomi e o pedido pelo WhatsApp">
          <div className={v.browserBar}>
            <span className={v.dots} aria-hidden><i /><i /><i /></span>
            <span className={v.urlChip}>js-imports-eight.vercel.app</span>
            <span className={v.live}><i aria-hidden /> Amostra</span>
          </div>
          <div className={v.molduraCover}>
            {/* 09/11/2026 (revisão de velocidade): esta captura é o maior elemento do topo no
                celular (o LCP) e estava com lazy e prioridade baixa, a 3,4 s no Lighthouse. Agora
                vem cedo e com prioridade alta. Nunca voltar a pôr lazy em imagem do topo. */}
            <picture>
              <source media="(max-width: 720px)" type="image/webp" srcSet="/assets/demo/js-imports-vitrine-curta.webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={v.molduraShot} src="/assets/demo/js-imports-desk-1100.webp" width={1100} height={4847} alt="" loading="eager" fetchPriority="high" />
            </picture>
          </div>
        </div>
      </div>
    </div>
    <FaixaNome />
  </section>;
}

/* ---------- o botão flutuante: entra depois do hero, sai no preço e no fim ---------- */
function BarraCelular() {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    let agendado = false;
    const medir = () => {
      agendado = false;
      const h = innerHeight;
      const acoes = document.querySelector("[data-hero-acoes]")?.getBoundingClientRect();
      const fim = document.getElementById("fim")?.getBoundingClientRect();
      const preco = document.querySelector('[data-cta="oferta"]')?.getBoundingClientRect();
      const precoNaTela = !!preco && preco.bottom > 0 && preco.top < h;
      setVisivel(!!acoes && acoes.bottom < 0 && !!fim && fim.top > h && !precoNaTela);
    };
    const aoRolar = () => { if (!agendado) { agendado = true; requestAnimationFrame(medir); } };
    addEventListener("scroll", aoRolar, { passive: true });
    medir();
    return () => removeEventListener("scroll", aoRolar);
  }, []);
  return <a className={`${s.flutua} ${visivel ? s.flutuaVisivel : ""}`} aria-hidden={!visivel} href="#hero-form" tabIndex={visivel ? 0 : -1} data-cta="barra" data-cta-dest="form">
    <span>{CTA}</span><span className={s.flutuaSeta}><SetaDireita /></span>
  </a>;
}

/* para quem é: os três começos do vídeo, ditos como perfil */
const PARA_QUEM: [string, string][] = [
  ["Quem vende iPhone pelo Instagram", "E passa o dia respondendo \"quanto tá o 13?\" no direct."],
  ["Quem manda foto um por um", "Na vitrine, cada aparelho tem a sua página, com preço, memória, cor e fotos."],
  ["Quem fecha a venda na conversa", "O pedido chega pronto no WhatsApp, e o pagamento e o parcelamento você combina como sempre."],
];

/* o rodapé no branco, com as quatro colunas */
function Rodape() {
  const r = pt.mb.rodape;
  return <footer className={s.rodapeW}>
    <div>
      <a href="#topo" className={s.rodapeMarca} aria-label="Rafael Razeira Estúdio">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/marca/rr-nome.webp" width={150} height={25} alt="" loading="lazy" decoding="async" />
      </a>
      <p>{r.frase}</p>
    </div>
    <nav aria-label="Rodapé">{pt.rodape.links.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
    <div>
      <p className={s.rotuloW}>({r.contato})</p>
      <a href={linkWhatsApp(r.msg)} target="_blank" rel="noopener" data-cta="rodape_contato" data-cta-dest="whatsapp"><IconeWhatsApp size={16} />{WHATSAPP_EXIBIDO}</a>
      <a href={`https://www.instagram.com/${pt.header.insta.handle.replace(/^@/, "")}/`} target="_blank" rel="noopener" data-cta="instagram_rodape" data-cta-dest="instagram"><IconeInstagram id="insta-degrade-rodape-iphone" size={16} />{pt.header.insta.handle}</a>
    </div>
    <div>
      <small>{r.copy}</small>
      <a href="#topo" className={s.rodapeTopo}>Voltar ao topo ↑</a>
    </div>
  </footer>;
}

export function VitrineIphone() {
  return <LangProvider lang="pt" messages={ptIphone}><div className={`${s.page} ${p.preta}`}>
    <Topo />
    <main>
      <div className={VITRINE} style={TOKENS_VITRINE}><Hero /></div>

      <Secao className={`${s.secao} ${s.secaoFios}`} id="para-quem">
        <div className={s.metades}>
          <div><p className={`${s.rotuloW} ${s.paraQuemRotulo}`}>(Para quem é)</p></div>
          <ol className={s.paraQuem}>
            {PARA_QUEM.map(([titulo, linha], i) => <li key={titulo} className={s.sobe} style={d(i + 1)}>
              <span className={s.paraQuemNum}>{String(i + 1).padStart(2, "0")}.</span>
              <p className={s.paraQuemTitulo}>{titulo}</p>
              <p>{linha}</p>
            </li>)}
          </ol>
        </div>
      </Secao>

      {/* ---------- a vitrine e o pedido (I2 e I3 do vídeo) ----------
          Os dois quadros com as classes da vitrine (o celular e os balões):
          a amostra da JS Imports e a conversa em que a venda fecha. */}
      <Secao className={`${s.secao} ${s.secaoFios}`} id="como-funciona">
        <div className={s.wrap}>
          <Titulo className={`${s.h2} ${s.tituloEsq}`}>Chega de mandar foto <em>um por um.</em></Titulo>
        </div>
        <div className={s.metades}>
          <div className={s.sobe} style={d(1)}>
            <div className={VITRINE} style={TOKENS_VITRINE}><div className={`${v.jornadaVisual} ${v.jornadaFone} ${p.quadro}`} aria-hidden>
              <span className={v.foneTela}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/fones/js-imports.webp" width={780} height={1688} alt="" loading="lazy" decoding="async" />
              </span>
            </div></div>
            <p className={`${s.passoTitulo} ${p.titulo}`} style={{ marginTop: 18 }}>O cliente escolhe sozinho</p>
            <p className={s.corpo}>Preço, memória, cor e as fotos de cada aparelho num link só, na bio. O &quot;quanto tá o 13?&quot; respondido antes de ele digitar.</p>
            <p className={s.exemplo}>Na tela: a amostra que eu montei para a JS Imports, de Maringá.</p>
          </div>
          <div className={s.sobe} style={d(2)}>
            <div className={VITRINE} style={TOKENS_ZAP}><div className={`${v.jornadaVisual} ${v.jornadaZap} ${p.quadroZap}`} aria-hidden>
              <div className={v.jornadaZapTopo}><IconeWhatsApp size={22} /><b>Loja · WhatsApp</b></div>
              <Bubble time="19:08" tick="read">escolhi pela vitrine: o 15 Pro Max, 256 GB. ainda tem?</Bubble>
              <span className={v.jornadaIntervalo}>1 minuto depois</span>
              <Bubble out time="19:09" tick="read">tem sim! separei o seu. quer no Pix ou parcelado?</Bubble>
            </div></div>
            <p className={`${s.passoTitulo} ${p.titulo}`} style={{ marginTop: 18 }}>A venda você fecha na conversa</p>
            <p className={s.corpo}>O pedido chega pronto no seu WhatsApp, com o aparelho escolhido. Pagamento e parcelamento você combina como sempre.</p>
            <p className={s.exemplo}>Exemplo de uma conversa.</p>
          </div>
        </div>
      </Secao>

      <Secao className={`${s.secao} ${s.secaoFios}`} id="etapas">
        <div className={s.wrap}>
          <Titulo className={`${s.h2} ${s.tituloEsq}`}>Da amostra à <em>vitrine no ar.</em></Titulo>
          <ol className={s.etapas}>
            <li className={s.sobe} style={d(1)}><span className={s.num}>(01)</span><p className={s.passoTitulo}>Manda o @ da loja</p><p>Em até 24h você recebe a amostra com os seus aparelhos, sem custo.</p></li>
            <li className={s.sobe} style={d(2)}><span className={s.num}>(02)</span><p className={s.passoTitulo}>Gostou? {R(VIT.entrada)} para começar</p><p>Você manda o material da loja e eu monto o catálogo inteiro.</p></li>
            <li className={s.sobe} style={d(3)}><span className={s.num}>(03)</span><p className={s.passoTitulo}>No ar em até 7 dias úteis</p><p>Com os aparelhos cadastrados e o pedido chegando no seu WhatsApp.</p></li>
            <li className={s.sobe} style={d(4)}><span className={s.num}>(04)</span><p className={s.passoTitulo}>{R(VIT.saldo)} na entrega</p><p>Só depois de você aprovar. E sem mensalidade.</p></li>
          </ol>
        </div>
      </Secao>

      <Secao className={`${s.secao} ${s.secaoFios}`} id="painel">
        <div className={`${s.wrap} ${s.painel}`}>
          <div>
            <Titulo className={s.h2}>Mudou o preço? <em>Troca pelo celular.</em></Titulo>
            <p className={`${s.lead} ${s.sobe}`} style={d(1)}>A vitrine vem com um painel na identidade da sua loja. Atualizar não depende de programador, nem de mim.</p>
            <ul className={s.lista}>
              <li className={s.sobe} style={d(2)}>Troca preço e foto na hora.</li>
              <li className={s.sobe} style={d(3)}>Marca esgotado ou pronta entrega.</li>
              <li className={s.sobe} style={d(4)}>Cadastra aparelho novo e ele entra na vitrine no mesmo minuto.</li>
            </ul>
          </div>
          <figure className={`${s.moldura} ${s.sobe}`} style={{ ...d(2), margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/demo/painel-js-imports.webp" width={1920} height={1200} alt="O painel da amostra da JS Imports: a lista de aparelhos, cada um com foto, linha, marca e os botões de ativo e destaque" loading="lazy" decoding="async"
                 style={{ display: "block", width: "100%", height: "auto", aspectRatio: "960 / 600", objectFit: "cover", objectPosition: "top left", borderRadius: 19, background: "#fff" }} />
          </figure>
        </div>
      </Secao>

      <QuemFazGrande cta={CTA} insta={pt.header.insta.handle} />

      <Secao className={`${s.secao} ${s.secaoFios} ${q.ctaZona}`} id="oferta">
        <div className={s.wrap}>
          <Titulo className={`${s.h2} ${s.tituloEsq}`}>Vitrine completa por <em>{R(VIT.total)}.</em></Titulo>
        </div>
        <div className={`${s.metades} ${s.precoW} ${s.sobe}`} style={d(1)}>
          <div>
            <p className={s.rotuloW}>(Para começar)</p>
            <p className={s.valor}>{R(VIT.entrada)}</p>
            <p className={s.nota}>E {R(VIT.saldo)} na entrega, só depois de você aprovar.</p>
            <div className={s.mensal}>
              <b>Sem mensalidade</b>
              <span>O painel é seu. O domínio próprio é opcional, anual e pago direto no registrador.</span>
            </div>
            <div className={s.acoesW}>
              <a className={q.heroCta} href="#hero-form" data-cta="oferta" data-cta-dest="form"><span>{CTA}</span><span className={q.heroCtaSeta} aria-hidden><SetaDireita /></span></a>
            </div>
          </div>
          <div>
            <p className={s.rotuloW}>(O que vem na vitrine)</p>
            <ul className={s.lista}>
              {pt.oferta.itens.map(i => <li key={i}>{i}</li>)}
            </ul>
          </div>
        </div>
      </Secao>

      <Secao className={`${s.fimW} ${q.ctaZona}`} id="fim">
        <Titulo className={s.fimTitulo}>Sua loja pode ser <em>a próxima.</em></Titulo>
        <div className={`${s.fimBase} ${s.sobe}`} style={d(2)}>
          <p>Deixa o @ que eu monto a amostra da sua vitrine em até 24h, sem custo.</p>
          <div className={s.acoesW}>
            <a className={q.heroCta} href="#hero-form" data-cta="final" data-cta-dest="form"><span>{CTA}</span><span className={q.heroCtaSeta} aria-hidden><SetaDireita /></span></a>
            <a className={`${q.heroLink} ${q.heroDesce}`} href="#oferta" data-cta="final_reserva" data-cta-dest="oferta">Ver o preço<span className={`${q.heroDesceSeta} ${q.heroSobe}`}><SetaBaixo /></span></a>
          </div>
        </div>
      </Secao>

      <Secao className={`${s.secao} ${s.secaoFios}`} id="perguntas">
        <div className={`${s.metades} ${s.faqW}`}>
          <div>
            <Titulo className={s.h2}>Perguntas antes de contratar</Titulo>
            <p className={`${s.corpo} ${s.sobe}`} style={d(1)}>Não achou a sua? <a className={s.link} href={linkWhatsApp("Oi Rafael, vendo iPhone e tenho uma dúvida sobre a vitrine.")} target="_blank" rel="noopener" data-cta="faq_duvida" data-cta-dest="whatsapp">Me chama no WhatsApp</a></p>
          </div>
          <div className={s.faq}>
            {ptIphone.faq.itens.map((it, k) => <details key={it.p} className={s.sobe} style={d(k + 1)}><summary>{it.p}</summary><p>{it.r}</p></details>)}
          </div>
        </div>
      </Secao>
    </main>
    <Rodape />
    <ModalAmostra />
    <BarraCelular />
    <Analytics />
  </div></LangProvider>;
}
