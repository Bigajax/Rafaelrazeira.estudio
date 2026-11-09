"use client";

/* ============================================================
   A /loja-online (07/11/2026): a página que vende a Loja online para
   o lead frio do anúncio. Pedidos do Rafael no mesmo dia: "copy focada
   em aumentar suas vendas com loja online" e, depois da primeira
   versão, "um vídeo real de uma loja atuando, tipo a da vitrine; faz a
   estrutura da vitrine também".

   A estrutura é a da /vitrine-digital: hero centrado com a vitrine real
   da Iconic rolando na moldura sobre a cena da noite, o placar, as lojas
   no ar, o depoimento, como funciona, quem faz, o preço, o convite e as
   perguntas. Os blocos que só mudam de texto são os MESMOS componentes
   da vitrine (mobbin.tsx), com o dicionário trocado aqui embaixo.

   O que segura a página honesta, e por quê:
   • O checkout ainda não está no ar em loja nenhuma (cofre, 4 Máquina/
     checkout-da-vitrine). A Iconic e as outras lojas aparecem como
     VITRINES que o estúdio pôs no ar, com o pedido no WhatsApp; nenhuma é
     mostrada pagando no site. A compra paga fica na Loja de exemplo, com
     o rótulo de demonstração o tempo todo. Decisão do Rafael em 07/11.
   • O preço vem de lib/oferta-performance.ts (DEGRAUS.loja), nunca
     escrito à mão: implantação e mensalidade sempre juntas.
   • O formulário é o mesmo caminho da /vitrine-digital (lead-flow.ts),
     com `pagina: "loja-online"`: a rota confere o @, o card nasce como
     e-commerce e leva a nota do degrau.

   O CSS: os blocos da vitrine vivem cada um no próprio invólucro `.site`
   (VITRINE abaixo), porque o vitrine.module.css tem regras de elemento
   (`.site h2`, `.site p`, `.site a`) que venceriam as classes das seções
   desta página. As seções próprias ficam fora dele, no loja-online.module.css.
   ============================================================ */

import { cloneElement, CSSProperties, FormEvent, Fragment, isValidElement, ReactNode, useEffect, useRef, useState } from "react";
import s from "./loja-online.module.css";
import v from "@/app/(pt)/vitrine-digital/vitrine.module.css";
import { CampoIsca, useGuardaDeFormulario } from "@/components/form-guarda";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { diagnosticoDoArroba, enviarLeadVitrine, registrarSuspeito, type DiagnosticoArroba } from "@/components/vitrine/lead-flow";
import type { LojaEncontrada } from "@/components/lead";
import { focarSemContar, initTracking } from "@/components/vitrine/tracking";
import { ligarAncoras } from "@/components/vitrine/ancora";
import { IconeInstagram, IconeWhatsApp, letraALetra, textoDe } from "@/components/vitrine/sections";
import Link from "next/link";
import { LojasFotos } from "./LojasFotos";
import { QuemFazGrande } from "./QuemFazGrande";
import q from "./quem-faz.module.css";
import { LangProvider } from "@/components/i18n";
import { pt } from "@/messages/vitrine.pt";
import { linkWhatsApp, WHATSAPP_EXIBIDO } from "@/lib/contato";
import { DEGRAUS, MENSALIDADE_ECOMMERCE } from "@/lib/oferta-performance";

const PAGINA = "loja-online";
const ABERTURA = "Oi Rafael! Quero ver a amostra da minha loja online.";
const LOJA = DEGRAUS.loja;
const real = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
const IMPLANTACAO = real(LOJA.cheio);
const MENSAL = real(MENSALIDADE_ECOMMERCE);
/* o convite único da página (07/11, escolhido pelo Rafael entre quatro): diz o
   que a pessoa faz ao clicar, já que o formulário só pede o @ e o WhatsApp */
const CTA = "Mandar o @ da minha loja";

/* o invólucro dos blocos da vitrine: as mesmas classes da página dela */
const VITRINE = `${v.site} ${v.botoesApple} ${v.tipoTitulo} ${v.estruturaCentro} ${v.semFontesExtras}`;

/* ---------- o dicionário da vitrine, com o texto desta página ----------
   Só o que os blocos reaproveitados mostram. "Amostra" no lugar de
   "prévia", e as lojas ditas como vitrines do estúdio, com o pedido no
   WhatsApp: é o que elas fazem hoje. */
const MSGS = {
  ...pt,
  /* o rodapé fala da loja online e aponta para ela (07/11, revisão da copy) */
  rodape: { ...pt.rodape, links: pt.rodape.links.map(l => l.href === "/e-commerce" ? { label: "LOJA ONLINE", href: "/loja-online" } : l) },
  mb: {
    ...pt.mb,
    rodape: { ...pt.mb.rodape, frase: "Vitrines e lojas online para quem vende pelo Instagram. Maringá, PR." },
    placar: { ...pt.mb.placar, itens: [pt.mb.placar.itens[0], ["24h", "até a amostra"], [pt.mb.placar.itens[2][0], "para ver a sua"]] as [string, string][] },
    lojasAr: {
      ...pt.mb.lojasAr,
      /* 07/11 (pedido do Rafael): a ponte entre "o estúdio entrega" e "é isto que
         você compra". É verdade: a loja online é a vitrine do molde com o checkout */
      /* trocado no mesmo dia pela opção 6 que o Rafael escolheu */
      h2a: "Veja o que já está", h2b: "no ar.",
      lead: "Vitrines de clientes do estúdio. Toque numa para abrir.",
    },
    fim: {
      ...pt.mb.fim,
      lead: "Deixa o @ que eu monto a amostra da sua loja online em até 24h, sem custo.",
      cta: CTA,
      cta2: "Ver o preço",
    },
  },
};

/* ---------- a medição ---------- */
function Analytics() {
  useEffect(() => {
    initTracking({ page: PAGINA, valor: LOJA.cheio, currency: "BRL", lang: "pt" });
    ligarAncoras();
  }, []);
  return null;
}

/* ---------- o formulário da amostra ----------
   Dois campos, como no hero da vitrine: o WhatsApp (por onde a amostra
   volta) e o @ (de onde saem as peças). O id `hero-form` é o que a
   medição já reconhece como o formulário do hero. */
/* `produto` (08/11): a v2 testa "e-commerce" no lugar de "loja online" no texto */
export function FormAmostra({ produto = "loja online", semTitulo = false }: { produto?: string; semTitulo?: boolean }) {
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
    const r = await enviarLeadVitrine({ nome: "", whatsapp, instagram, plano: PAGINA, ctaPosition: "hero_form", lang: "pt", pagina: PAGINA, abertura: ABERTURA });
    setEnviando(false);
    if (r.arrobaInvalido) { setInstaInvalido(instagram); setRecusas(n => n + 1); return; }
    setLinkWa(r.linkWa);
    setLoja(r.loja);
    /* sem gravar, o lead-flow já abriu o WhatsApp com a mensagem pronta */
    if (r.salvo) setEnviado(true);
  }

  if (enviado) return <div id="hero-form" className={`${s.form} ${s.ok}`} role="status">
    <p className={s.okLinha}><span className={s.okIcone} aria-hidden><Check /></span>Pedido recebido.</p>
    <p>Em até 24h eu te mando no WhatsApp a amostra {produto === "loja online" ? "da sua loja online" : `do seu ${produto}`}, montada com as suas peças.</p>
    {loja && <p className={s.micro}>Encontrei <b>@{loja.arroba}</b> no Instagram{loja.seguidores ? `, com ${loja.seguidores.toLocaleString("pt-BR")} seguidores` : ""}. Se não for a sua loja, me avisa.</p>}
    {linkWa && <a className={`${s.botao} ${s.whats}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">Me chama no WhatsApp agora</a>}
  </div>;

  const a = instaInvalido.replace(/^@+/, "");
  return <form id="hero-form" className={s.form} onSubmit={enviar} noValidate>
    {/* `semTitulo` (09/11): na v2 o título é o da própria seção */}
    {!semTitulo && <><p className={s.formTitulo}>{produto === "loja online" ? "Veja a sua loja online antes de pagar" : `Veja o seu ${produto} antes de pagar`}</p>
    <p className={s.formSub}>Manda o @ da loja. Em até 24h eu te mando uma amostra com as suas peças.</p></>}
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
        : recusas >= 2 ? <>A Meta não reconhece <b>@{a}</b> como conta profissional, e as peças da amostra saem do perfil. Se preferir, <a href={linkWhatsApp("Oi Rafael! Tentei mandar o @ da minha loja pela página da loja online e não deu certo. Pode me ajudar?")} target="_blank" rel="noopener" data-cta="arroba_ajuda" data-cta-dest="whatsapp">me chama no WhatsApp</a>.</>
        : <>Não achei <b>@{a}</b> no Instagram. Confere o @ da loja: precisa ser a conta profissional, é dela que eu tiro as fotos.</>}
    </small>}
    <button type="submit" className={`${s.botao} ${s.rosa}`} disabled={enviando}>{enviando ? "Enviando..." : CTA}</button>
    <p className={s.micro}>A amostra é por minha conta. Se gostar, a loja sai por <b>{IMPLANTACAO}</b> e, depois da entrega, <b>{MENSAL} por mês</b>.</p>
  </form>;
}

/* ---------- o formulário num modal, como na vitrine ----------
   Todo link para #hero-form abre o <dialog>. O clique é interceptado na
   captura e só leva preventDefault: o tracking escuta o mesmo clique.
   Abrir não conta como "começou a preencher" (focarSemContar). */
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
  return <dialog ref={ref} className={s.modal} aria-label="Pedir a amostra da sua loja online"
    onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    <button type="button" className={s.modalFechar} aria-label="Fechar" onClick={() => ref.current?.close()}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <FormAmostra />
  </dialog>;
}

const Xis = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>;
const Check = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5 10 17.5 19 7" /></svg>;

/* ---------- o hero, na estrutura da vitrine ----------
   O mesmo desenho da /vitrine-digital (classes dela): selo, manchete letra
   a letra, os dois botões, as logos dos clientes e a cena da noite com a
   vitrine REAL da Iconic rolando na moldura. A Iconic aparece como o que
   ela é: uma vitrine do estúdio no ar. Sem o balão de pedido, que aqui
   pareceria uma venda paga que não aconteceu. */
/* a manchete escolhida pelo Rafael em 07/11, entre dez variações (a 9) */
/* a batida verde vai numa linha só dela (quem-faz.module.css, .heroTitulo em): no celular o "com" subia sozinho para a
   linha do "vendas" (medido em 390) */
const H1 = <>Aumente suas vendas <em>com a loja online.</em></>;
/* ---------- a faixa do nome, igual à do wolfstudio.cc (07/11) ----------
   Medido lá em 1280: Inter Tight 400, 147px (11,5vw), espaçamento normal, preto
   puro, o ponto colado no fim ("WOLF STUDIO."), andando a 200px por segundo
   (grupo de 15s). Aqui na fonte de títulos da casa, com o mesmo tamanho, peso,
   cor e velocidade: a duração sai da largura medida de uma cópia, para dar os
   mesmos 200px/s em qualquer tela. */
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

function Hero() {
  /* 07/11, segunda rodada (pedido do Rafael: "seguindo o conceito do Wolf, sem
     alterar cores"; "este CTA está ruim"): a manchete sai do centro e vai para a
     esquerda, grande; o texto e os botões na metade da direita. O botão é a pílula com a seta
     no fim, num círculo branco, a mesma do botão flutuante. Classes em quem-faz.module.css. */
  return <section className={`${v.hero} ${q.fiosHero} ${q.heroW}`} id="topo">
    {/* a linha de rótulos presa aos fios saiu no mesmo dia (pedido do Rafael: "não gosto dessa parte") */}
    <h1 className={q.heroTitulo}><span className={v.soLeitor}>{textoDe(H1)}</span><span aria-hidden>{letraALetra(H1)}</span></h1>
    <div className={q.heroBase}>
      <p className={q.heroLead}>Pix, cartão e frete direto no seu site: a venda fecha mesmo quando você não pode responder. Amostra com as suas peças em até 24h, sem custo.</p>
      <div className={q.heroAcoes} data-hero-acoes>
        {/* o texto escolhido pelo Rafael em 07/11, entre quatro: diz o que a pessoa
            faz ao clicar (o formulário só pede o @ e o WhatsApp) */}
        <a className={q.heroCta} href="#hero-form" data-cta="hero_abrir" data-cta-dest="form"><span>{CTA}</span><span className={q.heroCtaSeta} aria-hidden><SetaDireita /></span></a>
        <a className={`${q.heroLink} ${q.heroDesce}`} href="#como-funciona" data-cta="hero_como" data-cta-dest="como-funciona">Ver como funciona<span className={q.heroDesceSeta}><SetaBaixo /></span></a>
      </div>
    </div>
    {/* a faixa de logos e a seta para a moldura saíram em 07/11 (pedido do Rafael):
        repetiam a prova da moldura, do placar e das lojas no ar */}
    <div className={`${v.cena} ${q.heroCena}`}>
      {/* os morros e a colina saíram em 07/11 (pedido do Rafael): a moldura fica no
          branco, com os fios do hero passando atrás, e o vídeo é a única imagem */}
      <div className={v.moldura} id="vitrine-no-ar">
        {/* ---------- a compra simulada na Iconic (07/11, pedido do Rafael) ----------
            Gravada no site real dela até a peça, o tamanho e o botão; o
            "Comprar agora" e as telas do pagamento foram desenhados por cima,
            só no navegador da gravação, porque o checkout dela ainda não está
            no ar. Por isso o chip diz "Demonstração", e não "No ar". A medição
            da loja ficou bloqueada na gravação. O roteiro e o sim.js estão na
            nota do cofre (4 Máquina/pagina-loja-online). */}
        {/* a legenda de cima da moldura saiu em 07/11 (pedido do Rafael). O aviso de
            demonstração fica no chip "Demonstração" da barra do navegador e no rótulo
            do vídeo: o chip NÃO pode sair, o checkout não está no ar em loja nenhuma. */}
        <div className={`${v.molduraTela} ${q.molduraTelaW}`}>
          <div className={v.browserBar}>
            <span className={v.dots} aria-hidden><i /><i /><i /></span>
            <span className={v.urlChip}>iconicsneakers.com.br</span>
            <span className={v.live}><i aria-hidden /> Demonstração</span>
          </div>
          <div className={v.molduraCover}>
            <VideoNaTela className={s.compraDesk} noTopo="(min-width: 721px)" largura={1280} altura={800} capa="/assets/demo/loja-online-compra-capa.webp"
              fontes={[["/assets/demo/loja-online-compra.webm", "video/webm"], ["/assets/demo/loja-online-compra.mp4", "video/mp4"]]}
              rotulo="Demonstração de uma compra na vitrine da Iconic Sneakers: a peça, o tamanho 41, o frete pelo CEP, o Pix e o pagamento aprovado." />
            <VideoNaTela className={s.compraCel} noTopo="(max-width: 720px)" largura={800} altura={1000} capa="/assets/demo/loja-online-compra-celular-capa.webp"
              fontes={[["/assets/demo/loja-online-compra-celular.webm", "video/webm"], ["/assets/demo/loja-online-compra-celular.mp4", "video/mp4"]]}
              rotulo="Demonstração de uma compra no celular, na vitrine da Iconic Sneakers: a peça, o tamanho, o frete, o Pix e o pagamento aprovado." />
          </div>
        </div>
      </div>
    </div>
    {/* ---------- a faixa do nome (07/11, pedido do Rafael, com o desenho dele) ----------
        "RAFAEL RAZEIRA . ESTÚDIO" gigante, na tinta e no tipo do RAFAEL do "quem faz",
        correndo de lado logo abaixo da moldura. (Uma faixa gigante já tinha saído no
        mesmo dia, mas aquela era outra, no meio da página; esta foi pedida aqui.)
        Pela armadilha da Japa (5 Armadilhas/windows-reduced-motion): com "reduzir
        movimento" ela anda devagar em vez de parar, e não pausa no toque. */}
    <FaixaNome />
  </section>;
}

/* ---------- o convite final (07/11, pedido do Rafael) ----------
   O da vitrine, com os quadrados girando dos dois lados, mas com as logos das
   marcas (as mesmas da faixa da primeira dobra) no lugar dos ícones. */

/* ---------- o depoimento, simples (07/11, pedido do Rafael) ----------
   O da vitrine repetia a frase (o destaque e a mensagem inteira embaixo) e
   mostrava a Iconic num celular, que o hero desta página já mostra. Aqui fica
   só o trecho, com as palavras EXATAS do Luciano (o "destaque" do dicionário,
   tirado da conversa de 28/10), e quem disse. Fala do estúdio, não de venda. */
const DEPO = pt.mb.depo.itens[0];
/* o trecho trocado em 07/11 (pedido do Rafael: "quero alterar o comentário"),
   da mesma conversa do Luciano (28/10, 23:03, print no WhatsApp). Palavras
   EXATAS dele; só o acento de "tínhamos", que faltava na mensagem. Fala de
   antecipar e de entregar rápido, que é o que a página promete. O dicionário
   da vitrine segue com o trecho da Black Friday, porque a /vitrine-digital usa. */
/* os dois trechos da mensagem (07/11, pedido do Rafael): o "Parabéns" grande,
   o resto bem menor logo abaixo */
const DEPO_GRANDE = "Parabéns pela agilidade e prestatividade!";
const DEPO_FRASE = "Você se antecipou em várias coisas que não tínhamos pedido e principalmente em fazer uma entrega com rapidez.";
function Depoimento() {
  return <Secao className={s.depo} aria-label="O que diz um cliente do estúdio">
    <figure className={s.depoFigura}>
      {/* o rótulo no lugar das aspas verdes (08/11, "faz sentido não ter título aqui?"): a frase
          já é o título; o rótulo põe o depoimento no mesmo sistema das outras seções */}
      <p className={`${s.rotuloW} ${s.depoRotulo} ${s.sobe}`} style={d(0)}>(Quem já contratou)</p>
      <blockquote className={`${s.depoFrase} ${s.sobe}`} style={d(0)}><span className={s.depoGrande}>{DEPO_GRANDE}</span>{" "}<span className={s.depoResto}>{DEPO_FRASE}</span></blockquote>
      <figcaption className={`${s.depoQuem} ${s.sobe}`} style={d(2)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {DEPO.foto && <img src={DEPO.foto} width={44} height={44} alt="" loading="lazy" decoding="async" />}
        <span><b>{DEPO.quem}</b>{DEPO.loja}, cliente do estúdio</span>
      </figcaption>
    </figure>
  </Secao>;
}

/* ---------- a entrada das seções (07/11, pedido do Rafael: "as animações na
   página inteira") ----------
   As seções que vieram da vitrine já entram animadas; estas são as próprias
   desta página, com a mesma entrada: o título letra a letra saindo do
   desfoque, e o resto (marcado com .sobe e a ordem em --d) subindo 14px logo
   atrás, na curva da régua. Dispara uma vez, quando a seção entra na tela.
   Não arma: com "reduzir movimento", e na seção que já está na tela quando a
   página abre (senão ela piscaria: visível, some, entra). Sem JavaScript, tudo
   aparece, porque a classe que esconde só entra depois de montar. */
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
/* o título letra a letra: a palavra inteira fica junta (não quebra no meio), o
   <em> verde é mantido, e o texto nítido vai para o leitor de tela */
/* ---------- os dois relógios (07/11, pedido do Rafael: os itens 1 e 2) ----------
   Quando os cartões entram na tela, cada um ganha um relógio. O do direct anda
   de 10:12 a 18:31 em 2,8s, e cada mensagem aparece quando ele passa pela hora
   dela; no fim, "8 horas, sem venda". O da loja online anda de 10:12 a 10:14 em
   1s, os quatro passos acendem, e "2 minutos, venda paga" chega bem antes. Os
   dois horários são do exemplo, e o cartão diz isso. Com "reduzir movimento",
   ou sem IntersectionObserver, tudo já nasce no estado final. O texto inteiro
   fica no DOM o tempo todo (só a opacidade muda), para o leitor de tela. */
const hm = (min: number) => `${Math.floor(min / 60)}:${String(Math.floor(min % 60)).padStart(2, "0")}`;
const DIRECT: [string, number][] = [["Tem o 41?", 612], ["Quanto fica o frete?", 832], ["Me passa o Pix?", 1085], ["Já comprei em outra loja", 1111]];
const LOJA_PASSOS: [string, number][] = [["Escolhe o tamanho", 612], ["Vê o frete pelo CEP", 613], ["Paga no Pix ou no cartão", 613], ["O pedido chega pago no painel", 614]];
/* um relógio por cartão, cada um começando quando o PRÓPRIO cartão aparece:
   no celular eles ficam um embaixo do outro, e o verde terminava antes de a
   pessoa rolar até ele (medido em 390, 07/11) */
function useRelogio() {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(-1); /* ms desde o começo; -1 = ainda não começou */
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { setT(1e9); return; }
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const passo = (agora: number) => { const x = agora - t0; setT(x); if (x < 3400) raf = requestAnimationFrame(passo); };
      raf = requestAnimationFrame(passo);
    }, { threshold: .6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  /* anda com um leve freio no fim */
  const hora = (de: number, ate: number, dur: number, atraso = 350) => {
    if (t < 0) return de;
    const x = Math.min(1, Math.max(0, (t - atraso) / dur));
    return de + (ate - de) * (1 - Math.pow(1 - x, 2));
  };
  return [ref, hora] as const;
}
function DoisCaminhos() {
  const [refD, horaD] = useRelogio();
  const [refL, horaL] = useRelogio();
  const minD = horaD(612, 1111, 2800), minL = horaL(612, 614, 1000);
  const fimD = minD >= 1111, fimL = minL >= 614;
  /* 07/11, terceira rodada ("não estou gostando aqui"): sem os cartões. Duas
     colunas abertas separadas pelo fio do meio, cada uma com o tempo gigante
     como título (8h em vermelho, 2min em verde), o relógio andando ao lado e a
     lista com os horários embaixo */
  return <div className={`${s.metades} ${s.caminhosW}`}>
    <div ref={refD} className={s.sobe} style={d(1)} aria-label="No direct, um exemplo">
      <p className={s.rotuloW}>(No direct)<span className={s.relogio} aria-hidden>{hm(minD)}</span></p>
      <p className={`${s.tempoGrande} ${s.tempoRuim} ${fimD ? s.chegou : s.espera}`}>8h<span>sem venda</span></p>
      <ol className={s.passosC}>
        {DIRECT.map(([txt, h], i) => <li key={txt} className={`${minD >= h ? s.chegou : s.espera} ${i === 3 ? s.apagado : ""}`}><span>{txt}</span><time>{hm(h)}</time></li>)}
      </ol>
      <p className={s.exemplo}>Exemplo de uma conversa comum de compra.</p>
    </div>
    <div ref={refL} className={s.sobe} style={d(2)} aria-label="Na loja online, um exemplo">
      <p className={s.rotuloW}>(Na loja online)<span className={`${s.relogio} ${s.relogioBom}`} aria-hidden>{hm(minL)}</span></p>
      <p className={`${s.tempoGrande} ${s.tempoBom} ${fimL ? s.chegou : s.espera}`}>2min<span>venda paga</span></p>
      <ol className={s.passosC}>
        {LOJA_PASSOS.map(([txt, h], i) => <li key={txt} className={minL >= h + (i === 2 ? .5 : 0) ? s.chegou : s.espera}><Check size={14} /><span>{txt}</span><time>{hm(h)}</time></li>)}
      </ol>
      <p className={s.exemplo}>Exemplo de uma compra no site, sem você responder.</p>
    </div>
  </div>;
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

/* ---------- o topo (07/11, pedido do Rafael: "copie o header do wolfstudio.cc,
   quando rola também") ----------
   A barra de ponta a ponta, transparente e com desfoque: o que passa por baixo
   na rolagem aparece borrado. Um fio fino em volta, os links em caixa alta
   pequena e o convite como texto com a seta, sem botão. A marca segue só o
   monograma (pedido do Rafael no mesmo dia, antes). */
/* para os links que descem na própria página (08/11): o ↗ dizia "outro site" */
const SetaBaixo = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 5v14M6 13l6 6 6-6" /></svg>;
/* para o que abre fora da página (o WhatsApp do topo) */
const SetaDiagonal = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 18 18 6M9 6h9v9" /></svg>;
const SetaDireita = () => <svg viewBox="0 0 32 24" width="28" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 12h25M21 5l7 7-7 7" /></svg>;
function Topo() {
  return <header className={s.topo}>
    {/* o monograma volta ao topo da própria página (08/11, pedido do Rafael); antes ia para /estudio */}
    <a className={s.marca} href="/loja-online" aria-label="Rafael Razeira Estúdio, voltar ao topo"
       onClick={e => { e.preventDefault(); scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>
      {/* só o monograma no topo (07/11, pedido do Rafael); maior no mesmo dia ("aumenta a logo"), 66px, na proporção do arquivo (55x30) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/marca/rr-monograma.webp" width={66} height={36} alt="" />
    </a>
    <nav className={s.topoNav} aria-label="Seções">
      <a href="#projetos">Lojas no ar</a>
      <a href="#como-funciona">Como funciona</a>
      <a href="#oferta">Preço</a>
    </nav>
    {/* o convite saiu do topo em 08/11 (pedido do Rafael: "este CTA está repetindo"): o hero e a
       pílula flutuante já levam o "Mandar o @"; no topo fica a conversa direta */}
    <a className={s.topoCta} href={linkWhatsApp("Oi Rafael! Vim pela página da loja online e quero tirar uma dúvida.")} target="_blank" rel="noopener" data-cta="topo_whatsapp" data-cta-dest="whatsapp" aria-label="Vamos conversar no WhatsApp"><SetaDiagonal />Vamos conversar</a>
  </header>;
}

/* ---------- um vídeo que só baixa perto da tela e só roda nela ----------
   Como o do painel da /vitrine-digital. Escondido por CSS (o do celular no
   desktop e vice-versa) ele nunca entra na tela, então nunca é baixado. Com
   menos movimento, fica a capa. As fontes vão na ordem do menor arquivo.

   `noTopo` (09/11/2026, a revisão de velocidade das páginas de anúncio): o
   vídeo que abre a página. Medido no Lighthouse do celular, a CAPA dele é o
   maior elemento da tela (o LCP), e o vídeo de 1,2 a 1,4 MB começava a baixar
   junto com ela, porque o "perto da tela" já é verdade no primeiro quadro: o
   LCP ia a 3,9 e 4,4 s. Com `noTopo`, a capa é pedida no <head> com prioridade
   alta (só na largura em que esse vídeo aparece, o valor de `noTopo`) e o
   vídeo só começa depois do `load` da página. Nunca tirar: sem isso a capa
   volta a disputar a banda com o vídeo no 4G. */
export function VideoNaTela({ fontes, capa, largura, altura, rotulo, className, noTopo }: { fontes: [string, string][]; capa: string; largura: number; altura: number; rotulo: string; className?: string; noTopo?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const comecar = () => { el.preload = "auto"; el.load(); };
    const depoisDoLoad = () => { espera = setTimeout(comecar, 200); };
    const perto = new IntersectionObserver(([x]) => {
      if (!x.isIntersecting) return;
      perto.disconnect();
      if (!noTopo || document.readyState === "complete") comecar();
      else addEventListener("load", depoisDoLoad, { once: true });
    }, { rootMargin: "100% 0px" });
    const io = new IntersectionObserver(([x]) => { if (x.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: .2 });
    perto.observe(el); io.observe(el);
    return () => { perto.disconnect(); io.disconnect(); removeEventListener("load", depoisDoLoad); clearTimeout(espera); };
  }, [noTopo]);
  return <>
    {/* o React 19 leva este <link> para o <head> do HTML do servidor */}
    {noTopo && <link rel="preload" as="image" href={capa} media={noTopo} fetchPriority="high" />}
    <video ref={ref} className={className} muted loop playsInline preload="none" poster={capa} width={largura} height={altura} aria-label={rotulo}>
      {fontes.map(([src, tipo]) => <source key={src} src={src} type={tipo} />)}
    </video>
  </>;
}

/* ---------- o painel: o mesmo pedido chegando pago (simulação, 07/11) ----------
   Desenhado no painel real (as telas de Pedidos e Estoque), com a Iconic e as
   fotos dela: o pedido 1048 chega pago, é aberto, sai com rastreio, e o 41
   baixa de 2 para 1. O checkout não está ligado em loja nenhuma. */
function VideoPainel() {
  return <VideoNaTela largura={960} altura={600} capa="/assets/demo/loja-online-painel-capa.webp"
    fontes={[["/assets/demo/loja-online-painel.mp4", "video/mp4"], ["/assets/demo/loja-online-painel.webm", "video/webm"]]}
    rotulo="Simulação do painel da loja: o pedido chega pago, é marcado como enviado com o rastreio, e o estoque do tamanho baixa sozinho." />;
}

/* ---------- o botão flutuante (07/11, no jeito do wolfstudio.cc) ----------
   Era a barra larga do celular; agora é a pílula no canto, em todas as
   larguras: a seta, um fio, o convite, no rosa claro da casa (o deles é
   verde-limão). Entra depois do hero e sai no convite final, que tem o mesmo botão.
   Por rolagem e getBoundingClientRect, que é testável. */
function BarraCelular() {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    let agendado = false;
    const medir = () => {
      agendado = false;
      const h = innerHeight;
      const acoes = document.querySelector("[data-hero-acoes]")?.getBoundingClientRect();
      /* some no convite final e não volta no rodapé, que vem depois dele */
      const fim = document.getElementById("fim")?.getBoundingClientRect();
      /* e sai do caminho enquanto a pílula do preço está na tela (08/11): as duas
         juntas se cobriam no celular */
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

/* para quem é (07/11): três perfis, sugeridos e aprovados pelo Rafael */
const PARA_QUEM: [string, string][] = [
  ["Quem já vende pelo Instagram", "E perde venda esperando para responder o direct."],
  ["Lojas com estoque por tamanho", "Roupa, tênis e acessório: o cliente vê a numeração que tem e escolhe sozinho."],
  ["Quem quer receber pelo site", "Pix e cartão caindo na conta da loja, sem fechar cada venda na conversa."],
];

const PERGUNTAS: [string, string][] = [
  ["O dinheiro da venda cai para quem?", "Para a sua loja. O pagamento entra na conta do Mercado Pago da loja, e as taxas são as do Mercado Pago, cobradas por ele. O estúdio não passa a mão no dinheiro da venda."],
  ["Posso continuar vendendo pelo WhatsApp?", "Pode. Dá para deixar o cliente escolher entre pagar no site ou chamar no WhatsApp, ou ficar só com um dos dois. Quem prefere conversar continua conversando."],
  ["Como funciona o frete?", "O cliente digita o CEP e vê as opções do Melhor Envio com prazo e preço. Você também pode oferecer entrega na sua região e retirada na loja."],
  ["A loja online emite nota e etiqueta?", "Não sozinha. Cada pedido pago chega com o nome, o CPF e o endereço do cliente, que é o que você usa para emitir a nota e a etiqueta. Quando você despacha, marca como enviado com o rastreio e o cliente recebe por e-mail."],
  ["Para que serve a mensalidade?", `São ${MENSAL} por mês, só depois da entrega: para a loja ficar sempre no ar, com os relatórios de quem entrou e o que olharam, e o suporte comigo.`],
  /* 07/11: a primeira dúvida prática de quem paga. Sem "eu te ajudo a abrir":
     é promessa do Rafael, e ele não confirmou */
  ["Preciso ter conta no Mercado Pago?", "Sim, no nome da loja: é nela que o dinheiro das vendas cai."],
  ["Quanto tempo leva para ficar pronta?", `A loja fica pronta em ${LOJA.prazo}, com as suas peças cadastradas e o pagamento ligado na sua conta.`],
  ["O que é a amostra?", "É a sua loja montada com peças do seu Instagram, para você ver como ficaria antes de decidir. Ela não custa nada e não obriga a nada."],
];

/* ---------- o rodapé (07/11, "ajusta esta parte") ----------
   Era o Rodape da vitrine, no cinza. Agora no branco, com um fio em cima e as
   quatro colunas presas aos fios: a marca (a logo em arquivo, nunca digitada),
   os links, o contato e o copyright com a volta ao topo. O WhatsApp daqui não
   conta como Lead (rodape_contato em FORA_DO_LEAD, tracking.ts). */
function RodapeLoja() {
  const r = MSGS.mb.rodape;
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
    <nav aria-label="Rodapé">{MSGS.rodape.links.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
    <div>
      <p className={s.rotuloW}>({r.contato})</p>
      <a href={linkWhatsApp(r.msg)} target="_blank" rel="noopener" data-cta="rodape_contato" data-cta-dest="whatsapp"><IconeWhatsApp size={16} />{WHATSAPP_EXIBIDO}</a>
      <a href={`https://www.instagram.com/${pt.header.insta.handle.replace(/^@/, "")}/`} target="_blank" rel="noopener" data-cta="instagram_rodape" data-cta-dest="instagram"><IconeInstagram id="insta-degrade-rodape-loja" size={16} />{pt.header.insta.handle}</a>
    </div>
    <div>
      <small>{r.copy}</small>
      <a href="#topo" className={s.rodapeTopo}>Voltar ao topo ↑</a>
    </div>
  </footer>;
}

export function LojaOnline() {
  return <LangProvider lang="pt" messages={MSGS}><div className={s.page}>
    <Topo />
    <main>
      <div className={VITRINE}><Hero /></div>
      {/* o placar saiu em 07/11 e, na revisão da copy do mesmo dia, a faixa de logos
          também: o convite final já mostra as mesmas marcas girando */}

      {/* sem as abas de filtro (07/11, pedido do Rafael): na página de anúncio, filtrar
          lojas é uma decisão que não leva à amostra; a fileira roda sozinha em "Todas" */}
      {/* o carrossel de capturas virou as fotos no jeito do Wolf (07/11, pedido do Rafael) */}
      <LojasFotos />
      <Depoimento />

      {/* "A mesma venda, dois caminhos" fora da página em 08/11 (pedido do Rafael: "retire isso").
          O DoisCaminhos e o useRelogio ficam no arquivo; para voltar, é tirar o false. */}
      {false && <Secao className={`${s.secao} ${s.secaoFios}`} id="o-problema">
        {/* ---------- a mesma venda, dois caminhos (07/11, opção A do Rafael) ----------
            Trocou a conversa longa e os dois parágrafos: a diferença tem de se ver
            batendo o olho, sem ler. O direct é um exemplo (os horários e as 8 horas
            são do próprio exemplo, de 10:12 a 18:31); a loja online é o que o
            checkout faz. O cartão da loja online leva o fio verde: é o que vence. */}
        <div className={s.wrap}>
          {/* 07/11, segunda rodada (pedido do Rafael: "fundo branco e glassmorphism nos
              cartões"): o branco com os fios, duas manchas de luz (rosa atrás do direct,
              verde atrás da loja online) que o vidro dos cartões desfoca, e o título à
              esquerda como no hero e nas lojas no ar */}
          <Titulo className={`${s.h2} ${s.tituloEsq}`}>A mesma venda, <em>dois caminhos.</em></Titulo>
          <DoisCaminhos />
        </div>
      </Secao>}

      {/* ---------- para quem é (07/11, pedido do Rafael, no jeito do wolfstudio.cc) ----------
          Logo depois da comparação: quem chegou pelo anúncio se reconhece (ou não)
          em segundos. O rótulo na metade da esquerda, os três perfis numerados na
          da direita, a partir do fio do meio. Nada de promessa de resultado: são
          perfis de loja e o que a loja online faz. */}
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

      <Secao className={`${s.secao} ${s.secaoFios}`} id="como-funciona">
        {/* ---------- da amostra à loja vendendo (07/11, opção A do Rafael) ----------
            Era "Do Instagram ao pedido pago" com o celular da Loja de exemplo: os
            passos da compra já estão no cartão "Na loja online" logo acima, e o
            vídeo do hero mostra a compra. Aqui fica o que faltava antes do preço:
            o que acontece depois que a pessoa manda o @. Prazo e valores vêm de
            DEGRAUS.loja; a amostra em 24h é a promessa da casa. */}
        <div className={s.wrap}>
          {/* 07/11 (pedido do Rafael: "faz nesse também"): o título à esquerda e as
              quatro etapas presas às quatro colunas dos fios, uma por coluna */}
          <Titulo className={`${s.h2} ${s.tituloEsq}`}>Da amostra à <em>loja vendendo.</em></Titulo>
          <ol className={s.etapas}>
            <li className={s.sobe} style={d(1)}><span className={s.num}>(01)</span><p className={s.passoTitulo}>Manda o @ da loja</p><p>Em até 24h você recebe a amostra com as suas peças, sem custo.</p></li>
            <li className={s.sobe} style={d(2)}><span className={s.num}>(02)</span><p className={s.passoTitulo}>Gostou? {IMPLANTACAO} para montar a sua loja</p><p>No Pix ou no cartão em até 12x.</p></li>
            <li className={s.sobe} style={d(3)}><span className={s.num}>(03)</span><p className={s.passoTitulo}>Pronta em {LOJA.prazo}</p><p>Com as peças cadastradas e o pagamento caindo na conta da loja.</p></li>
            <li className={s.sobe} style={d(4)}><span className={s.num}>(04)</span><p className={s.passoTitulo}>{MENSAL} por mês, só depois da entrega</p><p>A loja sempre no ar, os relatórios e o suporte comigo.</p></li>
          </ol>
        </div>
      </Secao>

      {/* 07/11 (pedido do Rafael: "agora aqui"): o cinza saiu, o branco com os fios, o
          texto na metade da esquerda e o painel na da direita, a partir do fio do meio */}
      <Secao className={`${s.secao} ${s.secaoFios}`} id="painel">
        <div className={`${s.wrap} ${s.painel}`}>
          <div>
            <Titulo className={s.h2}>Você cuida da loja <em>pelo celular.</em></Titulo>
            <p className={`${s.lead} ${s.sobe}`} style={d(1)}>A loja vem com um painel feito para quem vende, não para programador.</p>
            {/* os quatro itens em uma linha cada (08/11, a sugestão 3 aprovada pelo Rafael) */}
            <ul className={s.lista}>
              <li className={s.sobe} style={d(2)}>Peça com foto, preço e estoque por tamanho.</li>
              <li className={s.sobe} style={d(3)}>Vendeu no balcão? Um toque baixa o estoque.</li>
              <li className={s.sobe} style={d(4)}>Pedidos pagos numa lista, prontos para enviar.</li>
              <li className={s.sobe} style={d(5)}>Relatório de quem entrou e do que olharam.</li>
            </ul>
          </div>
          <div className={`${s.moldura} ${s.sobe}`} style={d(2)}><VideoPainel /></div>
        </div>
      </Secao>

      <QuemFazGrande cta={CTA} insta={pt.header.insta.handle} />

      {/* ---------- o preço nas colunas dos fios (07/11, "ajusta esta parte") ----------
          Era o cartão cinza centrado. Agora: o título à esquerda; de borda a borda,
          com um fio em cima, o valor na metade da esquerda e o que vem na loja na
          da direita, a partir do fio do meio. A linha de baixo do título saiu: o
          "começa depois da entrega" já está na mensalidade. */}
      <Secao className={`${s.secao} ${s.secaoFios} ${q.ctaZona}`} id="oferta">
        <div className={s.wrap}>
          <Titulo className={`${s.h2} ${s.tituloEsq}`}>Loja online por <em>{IMPLANTACAO}.</em></Titulo>
        </div>
        <div className={`${s.metades} ${s.precoW} ${s.sobe}`} style={d(1)}>
          <div>
            <p className={s.rotuloW}>(Para montar a loja)</p>
            <p className={s.valor}>{IMPLANTACAO}</p>
            <p className={s.nota}>No Pix à vista ou no cartão em até 12x, com os juros do cartão.</p>
            <div className={s.mensal}>
              <b>{MENSAL} por mês</b>
              <span>Começa depois da entrega: a loja sempre no ar, os relatórios e o suporte comigo.</span>
            </div>
            <div className={s.acoesW}>
              <a className={q.heroCta} href="#hero-form" data-cta="oferta" data-cta-dest="form"><span>{CTA}</span><span className={q.heroCtaSeta} aria-hidden><SetaDireita /></span></a>
            </div>
          </div>
          <div>
            <p className={s.rotuloW}>(O que vem na loja)</p>
            <ul className={s.lista}>
              {LOJA.inclui.map(i => <li key={i}>{i}</li>)}
              <li>O painel no celular, com estoque por tamanho</li>
              <li>Pronta em {LOJA.prazo}</li>
            </ul>
            <p className={s.jaTem}><b>Já tem a vitrine do estúdio?</b> O que você pagou nela abate do valor, e a loja online sai por {real(LOJA.valor)}.</p>
          </div>
        </div>
      </Secao>

      {/* ---------- o convite final (07/11, "ajusta esta parte") ----------
          Era o FimNovo da vitrine, centrado, com as logos das lojas girando em
          cartões borrados dos lados (a M&M entre elas, que saiu das fotos no mesmo
          dia). Agora no jeito do hero: o título gigante à esquerda e o texto com
          os botões na metade da direita. O id "fim" é o que esconde o botão
          flutuante. */}
      <Secao className={`${s.fimW} ${q.ctaZona}`} id="fim">
        <Titulo className={s.fimTitulo}>Sua loja pode ser <em>a próxima.</em></Titulo>
        <div className={`${s.fimBase} ${s.sobe}`} style={d(2)}>
          <p>Deixa o @ que eu monto a amostra da sua loja online em até 24h, sem custo.</p>
          <div className={s.acoesW}>
            <a className={q.heroCta} href="#hero-form" data-cta="final" data-cta-dest="form"><span>{CTA}</span><span className={q.heroCtaSeta} aria-hidden><SetaDireita /></span></a>
            <a className={`${q.heroLink} ${q.heroDesce}`} href="#oferta" data-cta="final_reserva" data-cta-dest="oferta">Ver o preço<span className={`${q.heroDesceSeta} ${q.heroSobe}`}><SetaBaixo /></span></a>
          </div>
        </div>
      </Secao>

      {/* as perguntas nas metades dos fios (07/11): o cinza saiu */}
      <Secao className={`${s.secao} ${s.secaoFios}`} id="perguntas">
        <div className={`${s.metades} ${s.faqW}`}>
          <div>
            <Titulo className={s.h2}>Perguntas antes de contratar</Titulo>
            <p className={`${s.corpo} ${s.sobe}`} style={d(1)}>Não achou a sua? <a className={s.link} href={linkWhatsApp("Oi Rafael! Tenho uma dúvida sobre a loja online.")} target="_blank" rel="noopener" data-cta="faq_duvida" data-cta-dest="whatsapp">Me chama no WhatsApp</a></p>
          </div>
          <div className={s.faq}>
            {PERGUNTAS.map(([p, r], k) => <details key={p} className={s.sobe} style={d(k + 1)}><summary>{p}</summary><p>{r}</p></details>)}
          </div>
        </div>
      </Secao>
    </main>
    <RodapeLoja />
    <ModalAmostra />
    <BarraCelular />
    <Analytics />
  </div></LangProvider>;
}
