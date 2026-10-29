"use client";

import Image from "next/image";
import Link from "next/link";
import { cloneElement, CSSProperties, FormEvent, isValidElement, useEffect, useRef, useState } from "react";
import s from "@/app/(pt)/vitrine-digital/vitrine.module.css";
import { CampoIsca, useGuardaDeFormulario } from "@/components/form-guarda";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { emailValido, telefoneInternacionalValido } from "@/components/telefone-intl";
import { ligarAncoras } from "@/components/vitrine/ancora";
import { diagnosticoDoArroba, enviarLeadVitrine, registrarSuspeito, type DiagnosticoArroba } from "@/components/vitrine/lead-flow";
import type { LojaEncontrada } from "@/components/lead";
import { linkEmail, linkWhatsApp } from "@/lib/contato";
import { focarSemContar, initTracking } from "@/components/vitrine/tracking";
import { projetos } from "@/data/portfolio";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { useLang, useT } from "@/components/i18n";
import { PerguntasDaPrevia } from "@/components/vitrine/obrigado";
import { PARES, preencher } from "@/lib/idiomas";
import { OFERTA } from "@/lib/oferta";
import type { VitrineMessages } from "@/messages/vitrine.pt";

/* ---------- os dois idiomas (11/09/2026) ----------
   Todo texto desta página saiu daqui para messages/vitrine.pt.tsx e
   vitrine.en.tsx, e os componentes leem pelo provider (components/i18n).
   As notas de decisão de cada frase ficaram onde estavam, ao lado do
   lugar em que a frase é usada; o que mudou é só de onde ela vem. O que
   muda de comportamento com o idioma está marcado nos formulários: no en
   o contato obrigatório é o e-mail, o telefone é opcional e internacional,
   e o botão pós-envio é um mailto: em vez do wa.me. */
const useVit = () => useT<VitrineMessages>();

/* a URL pt desta página, chave do mapa de irmãs (lib/idiomas.ts) */
const PAGINA_PT = "/vitrine-digital";

/* ---------- o placar de projetos parou de ser digitado (28/08) ----------
   A página dizia NOVE em três lugares (o canhoto da etiqueta, o Quem Faz e
   o link do portfólio) e o /portfolio já mostrava DEZ, porque ele conta o
   dado e a vitrine escrevia o número à mão. O décimo entrou e ninguém
   avisou os três lugares.

   Numa página cujo argumento inteiro é fato conferível, número que não bate
   com a prova a um clique de distância é a coisa mais cara que pode estar
   escrita: quem duvida clica, conta e encontra a página mentindo por um.

   Agora os três leem daqui, com a mesma régua do /portfolio: vale o projeto
   que tem endereço público, porque "no ar" é exatamente isso. No dia em que
   entrar o décimo primeiro, os três se corrigem sozinhos. */
export const NO_AR = projetos.filter(p => p.url).length;

/* ============================================================
   O WHATSAPP SAIU DO CAMINHO DE LEITURA (13/08)

   Aqui moravam `ZAP`, `MSG_VER`, `MSG_DUVIDAS` e o hook `useWhatsapp`, que
   montavam o link do wa.me para os oito CTAs espalhados pela página: a
   porta 02 do hero, o Quem Faz, o Como Funciona, o card da oferta, o CTA
   final, a pill flutuante e a barra fixa do celular.

   Por que saiu, em números. Em 12-13/08 sete visitantes clicaram em algum
   desses botões (seis na barra fixa, dois no hero, três nos dois caminhos)
   e ZERO mensagens chegaram. Não foi a primeira medição: entre 9 e 11/08
   o botão do topo sozinho levou 14 pessoas ao WhatsApp, também sem uma
   única conversa. O link abre a mensagem PRONTA mas NÃO ENVIADA, e o passo
   que falta (tocar em enviar, já dentro de outro app) é onde todo mundo
   desiste. A tela "Falta um toque" existia justamente para socorrer isso.

   Pior que não converter: o Contact do formulário é o evento pelo qual a
   campanha otimiza, e cada saída pelo WhatsApp era uma pessoa levada para
   fora antes de ele poder disparar. Com zero conversões registradas a Meta
   não tem sinal nenhum para aprender, e a entrega colapsa num anúncio só
   (em 12-13/08, um criativo levou 64% das impressões e 72% do gasto).

   O WhatsApp continua vivo em DOIS lugares, os dois DEPOIS do envio, onde
   o Contact já disparou e ele não custa mais nada: a tela de confirmação
   ("quer agilizar?") e o fallback de quando a gravação no banco falha, em
   lead-flow.ts. Esses usam o `linkWa` que volta do envio, não este hook.

   tracking.ts não mudou de propósito: a regra de Lead lê `data-cta-dest`
   do elemento clicado, então links de WhatsApp que deixam de existir
   simplesmente param de disparar. Nada lá dentro sabia os nomes destes
   botões, que é exatamente por que aquela regra foi escrita assim.
   ============================================================ */

/* O nome diz analytics e a segunda linha não é analytics, e isso é de
   propósito: este é o único ponto de montagem de comportamento de cliente
   desta página, e inventar um segundo componente vazio só para pendurar um
   `useEffect` custaria mais do que este comentário. `ligarAncoras` cuida da
   velocidade e do foco dos dez `href="#..."`; o porquê está em ancora.ts. */
export function Analytics() {
  const lang = useLang();
  useEffect(() => {
    /* a página, o valor e a moeda do funil vêm do idioma (ver tracking.ts) */
    initTracking({ page: lang === "en" ? "vitrine-digital-en" : "vitrine-digital", valor: OFERTA[lang].vitrine.total, currency: OFERTA[lang].moeda, lang });
    ligarAncoras();
  }, [lang]);
  return null;
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => <p className={s.eyebrow}>{children}</p>;
const Button = ({ href, children, outline = false, onClick, cta, dest }: { href?: string; children: React.ReactNode; outline?: boolean; onClick?: () => void; cta?: string; dest?: string }) =>
  href
    ? <a className={`${s.button} ${outline ? s.outline : s.primary}`} href={href} data-cta={cta} data-cta-dest={dest}>{children}</a>
    : <button type="button" className={`${s.button} ${outline ? s.outline : s.primary}`} onClick={onClick} data-cta={cta} data-cta-dest={dest}>{children}</button>;

/* ---------- fio de conversa (assinatura da página) ----------
   Uma única venda contada em balões de WhatsApp reais que atravessam a
   página: as perguntas sem resposta na seção do problema, o pedido já
   resolvido no como funciona, e na oferta quem manda a mensagem é o
   lojista. O confere (✓ cinza sem resposta, ✓✓ azul lida) carrega o
   argumento. Cada balão revela no scroll com "digitando…"; sem JS ou com
   reduced motion o texto já vem visível, então nada fica escondido. */
export function Bubble({ out = false, time, tick, delay = 0, children }: { out?: boolean; time: string; tick?: "sent" | "read"; delay?: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setTyping(true);
    let t: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(([x]) => {
      if (!x.isIntersecting) return;
      io.disconnect();
      t = setTimeout(() => setTyping(false), 650 + delay);
    }, { rootMargin: "-12% 0px" });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [delay]);
  return <div ref={ref} className={`${s.bubble} ${out ? s.bubbleOut : ""}`}>
    {typing
      ? <span className={s.typing} aria-hidden><i /><i /><i /></span>
      : <>
        <p>{children}</p>
        <span className={s.bubbleMeta}>{time}{tick && <b className={tick === "read" ? s.tickRead : s.tickSent}>{tick === "read" ? "✓✓" : "✓"}</b>}</span>
      </>}
  </div>;
}

/* ---------- o botão da confirmação, por idioma ----------
   No pt reabre o WhatsApp com a mensagem pronta (`reabrir_whats`, fora da
   regra de Lead: quem clica já disparou o Lead do formulário). No en é o
   mailto: pré-preenchido, com destino "email", que o ouvinte de cliques
   não intercepta: vira ClickCTA e navega. */
function ReabrirCta({ href, rotulo }: { href: string; rotulo: string }) {
  const en = useLang() === "en";
  return <a className={`${s.button} ${s.primary}`} href={href} data-cta={en ? "reabrir_email" : "reabrir_whats"} data-cta-dest={en ? "email" : "whatsapp"}>{rotulo}</a>;
}

/* Antes daqui saía "Tudo certo. Abrindo o WhatsApp…", que dizia à pessoa
   que estava feito quando não estava: a mensagem abre pronta mas não
   enviada, e sem tocar em enviar nada chega. Agora o passo que falta é
   dito com todas as letras, e o botão cobre o caso de a abertura falhar,
   e o de quem voltou do WhatsApp sem enviar. No en o mesmo bloco cobre a
   gravação que falhou: sem WhatsApp para abrir, ele oferece o e-mail. */
function Pendente({ href }: { href: string }) {
  const t = useVit();
  return <div className={s.pendente} role="status">
    <b>{t.form.pendenteTitulo}</b>
    <p>{t.form.pendenteTexto}</p>
    <ReabrirCta href={href} rotulo={t.form.pendenteCta} />
  </div>;
}

/* ---------- a mensagem do campo do @ (12/09/2026) ----------
   Três situações, em ordem de custo: o que a pessoa digitou tem cara de
   telefone ou de e-mail (dito antes de qualquer envio); a Meta recusou o
   @ uma vez (a mensagem de sempre, mais o "onde achar"); a Meta recusou
   duas vezes (quase sempre conta pessoal: a mensagem explica como mudar
   e oferece a saída pela conversa, que é socorro e não Lead, ver
   `arroba_ajuda` no tracking). Sem isso, três pessoas ficaram presas num
   loop de até doze envios nos 14 dias anteriores. */
function ErroArroba({ arroba, diag, recusas }: { arroba: string; diag: DiagnosticoArroba | null; recusas: number }) {
  const t = useVit();
  const lang = useLang();
  if (!arroba && !diag) return null;
  const a = arroba.replace(/^@+/, "");
  const ajuda = lang === "en" ? linkEmail(t.form.ajudaMsg) : linkWhatsApp(t.form.ajudaMsg);
  return <small role="alert" style={{ color: "#b3261e" }}>
    {diag === "telefone" ? t.form.errInstaTel
      : diag === "email" ? t.form.errInstaEmail
      : recusas >= 2 ? <>{t.form.errInstaPessoal1}<b>@{a}</b>{t.form.errInstaPessoal2}</>
      : <>{t.form.errInsta1}<b>@{a}</b>{t.form.errInsta2}</>}
    {recusas < 2 && <> {t.form.errInstaOnde}</>}
    {recusas >= 2 && <> <a href={ajuda} target={lang === "en" ? undefined : "_blank"} rel="noopener" data-cta="arroba_ajuda" data-cta-dest={lang === "en" ? "email" : "whatsapp"} style={{ color: "inherit", textDecoration: "underline" }}>{t.form.ajudaCta}</a></>}
  </small>;
}

/* a loja que a Meta encontrou, dita na confirmação: quem digitou o @ errado
   percebe na hora, e quem tem loja de verdade vê que o formulário entendeu */
function LojaAchada({ loja }: { loja: LojaEncontrada | null }) {
  const t = useVit();
  const lang = useLang();
  if (!loja) return null;
  return <p className={s.lojaAchada}>{t.form.lojaAchada1}<b>@{loja.arroba}</b>{preencher(t.form.lojaAchada2, { n: (loja.seguidores ?? 0).toLocaleString(lang === "en" ? "en-US" : "pt-BR") })}</p>;
}

const ChatStrip = ({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) =>
  <div className={s.chatStrip}>
    <small className={s.stripLabel}>{label}</small>
    {children}
    {note && <small className={s.stripNote}>{note}</small>}
  </div>;

/* Header de tráfego pago (07/08): só a logo e uma ação. O menu inteiro saiu,
   inclusive o hambúrguer: numa página de anúncio, cada rota do topo é uma
   rota de fuga, e as âncoras das seções continuam vivas para os links
   internos e externos.

   A ação levava ao WhatsApp até 11/08, e os números mandaram trocar: dos 19
   cliques de WhatsApp em 9-11/08, 14 saíram deste botão, quase todos nos
   primeiros segundos, com 0% de rolagem, e NENHUMA mensagem chegou. Era o
   primeiro botão visível servindo de porta de saída para quem nem leu a
   página. Agora ele desce para o formulário do hero, que é o Contact pelo
   qual a campanha otimiza; o WhatsApp continua nos CTAs de quem já rolou
   (porta 02, oferta, final). */
/* ---------- o Instagram do estúdio no topo (09/10/2026) ----------
   Mora no vão entre a logo e o botão, onde ficava o "RESPOSTA NO MESMO
   DIA" (o Rafael pediu para tirar). A foto dele num círculo com o
   filete de tinta do próprio header, o @ e, embaixo, o símbolo e a
   palavra "Instagram": é a palavra que diz o que o link é.
   A primeira versão, do mesmo dia, tinha anel de story em degradê
   esmeralda até o rosa, giro no hover e o slogan "o designer que mostra
   o número" no lugar da palavra. O Rafael pediu "mais profissional": cor,
   giro e slogan saíram. No celular sobra a foto com um selo grafite do
   Instagram no canto, que faz o papel da palavra. Abre em outra aba:
   quem veio do anúncio não perde a página. */
const GlifoInstagram = () => <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden focusable="false">
  <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
</svg>;

export function InstaDoEstudio() {
  const { insta } = useVit().header;
  const url = `https://www.instagram.com/${insta.handle.replace(/^@/, "")}/`;
  return <a className={s.insta} href={url} target="_blank" rel="noopener" aria-label={insta.aria} data-cta="instagram_header" data-cta-dest="instagram">
    <span className={s.instaAnel} aria-hidden>
      <Image src="/assets/rafael-avatar.webp" width={64} height={64} alt="" />
      <i className={s.instaSelo}><GlifoInstagram /></i>
    </span>
    <span className={s.instaTexto} aria-hidden>
      <b>{insta.handle}</b>
      <span><GlifoInstagram />{insta.linha}</span>
    </span>
  </a>;
}

/* ---------- o Instagram virou só o símbolo (28/10) ----------
   O bloco de cima (foto, @ e a palavra) saiu do meio do header da
   /vitrine-digital a pedido do Rafael: ficou um ícone discreto no canto
   direito, depois do botão. A /vitrine-v2 continua com o InstaDoEstudio. */
/* os dois símbolos nas cores das marcas (28/10): o do Instagram no degradê
   radial do app, o do WhatsApp no verde dele. O id do degradê é por uso,
   porque dois <svg> com o mesmo id na página brigam pelo mesmo gradiente. */
/* os dois símbolos no desenho do ÍCONE DO APP (28/10, à tarde): o Rafael
   achou o contorno fino do Instagram ruim. O do Instagram é o quadrado
   arredondado cheio do degradê, com a câmera em branco; o do WhatsApp, o
   círculo verde com o balão e o telefone em branco, no contorno da marca
   (Simple Icons, CC0). É o desenho que se reconhece de relance.
   O id do degradê é por uso: dois <svg> com o mesmo id na página brigam pelo
   mesmo gradiente. */
export function IconeInstagram({ id, size = 24 }: { id: string; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false">
    <defs>
      <radialGradient id={id} cx="30%" cy="107%" r="150%">
        <stop offset="0" stopColor="#fdf497" /><stop offset=".05" stopColor="#fdf497" />
        <stop offset=".45" stopColor="#fd5949" /><stop offset=".6" stopColor="#d6249f" /><stop offset=".9" stopColor="#285aeb" />
      </radialGradient>
    </defs>
    <rect width="24" height="24" rx="6.5" fill={`url(#${id})`} />
    <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" />
    <circle cx="15.9" cy="8.1" r="1" fill="#fff" />
  </svg>;
}
export function IconeWhatsApp({ size = 24 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false">
    <circle cx="12" cy="12" r="12" fill="#25D366" />
    <path fill="#fff" transform="translate(4.6 4.6) scale(.617)" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>;
}

function InstaIcone() {
  const { insta } = useVit().header;
  const url = `https://www.instagram.com/${insta.handle.replace(/^@/, "")}/`;
  return <a className={s.instaIcone} href={url} target="_blank" rel="noopener" aria-label={insta.aria} data-cta="instagram_header" data-cta-dest="instagram">
    <IconeInstagram id="insta-degrade" />
  </a>;
}

/* true quando o botão do hero já passou para baixo da barra do topo. Sem o
   botão do hero na página, o do topo fica sempre à vista. A margem de -80px
   em cima é a altura da pílula: o botão "sai" quando some atrás dela. */
function useCtaDoTopo() {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    const alvo = document.querySelector('[data-cta="hero_abrir"]');
    if (!alvo) { setMostrar(true); return; }
    const io = new IntersectionObserver(([x]) => setMostrar(!x.isIntersecting && x.boundingClientRect.top < 80), { rootMargin: "-80px 0px 0px 0px" });
    io.observe(alvo);
    return () => io.disconnect();
  }, []);
  return mostrar;
}

export function Header() {
  const t = useVit();
  const ctaNoTopo = useCtaDoTopo();
  return <header className={s.header}>
    {/* a logo volta ao hero desta página, não para /estudio: quem chega do
        anúncio e toca no topo quer recomeçar a leitura, não trocar de site */}
    {/* o monograma RR (28/10) fica no lazy padrão, sem `priority` nem
        `loading="eager"`: os dois emitem um preload que entra na fila ANTES
        da imagem do hero, o mesmo que saiu desta página em 05/08 (ver
        app/(pt)/vitrine-digital/page.tsx). Medido: com eager o preload volta.
        O 51x30 é o tamanho desenhado, para o srcset não pedir 384px.
        ---------- a logo oficial (28/10, à tarde) ----------
        O Rafael mandou o arquivo da marca (Desktop/Estúdio/marca/LOGO RR/
        RR.png): monograma em cima e o nome embaixo, vertical. A 60px de
        pílula o nome sairia com 6px, então os DOIS PEDAÇOS do próprio
        arquivo vão lado a lado (recortados pelas faixas de tinta, sem
        redesenhar nada); o nome digitado em Archivo saiu, porque a logo é
        o arquivo e nunca texto (2 Regras da casa/feedback-sem-texto-vazado).
        O nome da marca vai no aria-label, já que as duas imagens são alt="". */}
    <a className={`${s.brand} ${s.brandComRR}`} href="#topo" aria-label={`${t.marca.nome} ${t.marca.sufixo}`}>
      {/* o encaixe do RR (28/10): o monograma é um R espelhado encostado
          num R. O mesmo arquivo entra duas vezes, cada cópia recortada numa
          metade, e as duas chegam dos lados até se encontrarem; depois o
          nome sai de dentro dele. Ver `.brandMono` no CSS. */}
      <span className={s.brandMono}>
        <Image className={`${s.brandRR} ${s.rrEsq}`} src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
        <Image className={`${s.brandRR} ${s.rrDir}`} src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
      </span>
      <Image className={s.brandNome} src="/assets/marca/rr-nome.webp" width={150} height={25} alt="" />
    </a>
    {/* O seletor de idioma e o CTA andam juntos (11/09/2026): à esquerda
        do botão, onde todo site põe, e visível também no celular, senão
        quem não fala português nunca acha. Ver components/idioma. */}
    {/* ---------- os links no meio da pílula (28/10/2026) ----------
        O centro estava vazio. Três atalhos para quem chega do anúncio e quer
        pular direto para as lojas, o passo a passo ou o preço. Só no
        desktop: no celular não cabem e a barra fixa do rodapé já leva ao
        formulário. */}
    <nav className={s.headNav} aria-label={t.header.navAria}>
      {t.header.nav.map(([href, rotulo]) =>
        <a key={href} href={href} data-cta={`header_nav_${href.slice(1)}`} data-cta-dest={href.slice(1)}>{rotulo}</a>)}
    </nav>
    <div className={s.headRight}>
      <SeletorIdioma atual={useLang()} ptHref={PAGINA_PT} enHref={PARES[PAGINA_PT]} className={s.idiomaSuave} />
      <InstaIcone />
      {/* o botão por último, na ponta direita, onde o olho termina a barra;
          rosa e com o mesmo texto do botão do hero, porque é a mesma ação
          (28/10: era grafite e dizia "Ver minha loja"). Some em ≤520px.
          Desde 28/10 (pedido do Rafael) ele só entra depois que o botão do
          hero passa para baixo da barra: os dois juntos na primeira tela
          disputavam o olho com a mesma frase. Ver `useCtaDoTopo`. */}
      <a className={`${s.headCta} ${ctaNoTopo ? "" : s.headCtaOculto}`} href="#hero-form" data-cta="header" data-cta-dest="form"
        aria-hidden={!ctaNoTopo} tabIndex={ctaNoTopo ? undefined : -1}>{t.header.cta}</a>
    </div>
  </header>;
}

/* 28/10/2026: o celular passou a rolar a Iconic Sneakers (pedido do Rafael),
   capturada pelo mesmo script com a URL e o destino por argumento. O --dur
   segue o RITMO que a Sölo tinha (16188px em 96s, ~169px/s da imagem), não a
   régua do script, que sugeria 17s e faria a loja correr na tela.

   Demonstração no mockup do hero (07/08): a VITRINE COMPLETA da Sölo Urb
   rolando em loop dentro do aparelho, do topo ao rodapé, no lugar do vídeo da
   Xavier's. Pedido do Rafael: a primeira coisa que a página mostra passa a
   ser uma loja inteira, não um recorte de jornada. Captura e derivados por
   scripts/capture-solourb-hero.mjs.

   O padrão de carga é o mesmo que o vídeo usava, e pelo mesmo motivo: a
   captura completa tem ~490KB em AVIF e numa página de tráfego 4G isso não
   pode disputar a primeira pintura. A primeira carga leva só o quadro do topo
   (61KB, next/image com `sizes` no tamanho real do aparelho); o rolo inteiro
   entra no DOM depois do evento `load` e cobre o quadro parado.

   Com "reduzir movimento" ligado o rolo nunca é montado e a animação do
   pageScroll já é desligada pelo bloco de reduced-motion do CSS. */
function VitrineDemo() {
  const [montar, setMontar] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ligar = () => setMontar(true);
    if (document.readyState === "complete") { ligar(); return; }
    window.addEventListener("load", ligar, { once: true });
    return () => window.removeEventListener("load", ligar);
  }, []);
  return <div className={s.screen}>
    <Image className={s.shot} src="/assets/demo/iconic-hero-still.jpg" width={500} height={1082} sizes="300px" priority alt="" />
    {montar && <picture>
      <source type="image/avif" srcSet="/assets/demo/iconic-vitrine.avif" />
      <source type="image/webp" srcSet="/assets/demo/iconic-vitrine.webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.phoneShot} src="/assets/demo/iconic-vitrine.jpg" width={500} height={7503} style={{ "--dur": "44s" } as React.CSSProperties} alt="" />
    </picture>}
  </div>;
}

/* ---------- A ETIQUETA: o formulário do hero ----------
   Era a "porta 01" de 07/08, um retângulo branco com dois placeholders
   cinza. Virou uma etiqueta de preço em 13/08, e a forma não é enfeite: a
   página inteira argumenta "foto, preço e tamanho sem precisar perguntar",
   que é literalmente o que uma etiqueta pendurada na peça entrega. O objeto
   mais banal da loja da cliente é a prova do que a vitrine faz.

   Três coisas mudaram junto com o visual, e as três vêm de 12-13/08:

   1. O PREÇO ENTROU NA ETIQUETA. Ele era uma linha em mono solta acima do
      formulário, e uma etiqueta sem preço não é etiqueta. Como efeito, o
      hero perdeu um bloco empilhado.
   2. OS CAMPOS TÊM 16px. Tinham 13px, e abaixo de 16 o Safari do iPhone dá
      zoom ao focar: a página salta de escala e volta desalinhada. Das
      quatro pessoas que tocaram no formulário, as três que largaram
      pararam no PRIMEIRO campo, que é onde esse solavanco acontece.
   3. OS CAMPOS TÊM RÓTULO VISÍVEL. Eram só placeholder, que some quando a
      pessoa digita e deixa o campo anônimo na hora de conferir.

   O envio segue as mesmas regras do formulário da oferta, via lead-flow.ts:
   Lead com cta_position "hero_form", gravação antes de qualquer navegação,
   WhatsApp só como fallback. O botão de submit NÃO tem data-cta: o Lead
   deste caminho sai do submit, senão o mesmo envio contaria duas vezes. */
/* ---------- o confete do pedido (28/10, ideia do Rafael) ----------
   Uma chuva curta de papel caindo do topo da JANELA, na largura toda, junto
   com o ✓ se desenhando. A primeira versão era uma explosão saindo do ✓:
   no vídeo do Rafael ela ficava presa num canto, a borda de cima cortava o
   leque e o resto parecia pó (papel pequeno sumindo em 1s). Agora: 44
   papéis nas cores da página, maiores, que caem balançando e virando
   (rotate3d dá o efeito de papel girando no ar) e somem em ~1,8s, por
   cima das perguntas, sem bloquear o toque. Sem biblioteca: cada papel é
   um <i> com o caminho em variáveis CSS, sorteado uma vez na montagem (só
   existe depois do envio, então não há hidratação a casar). Quem pede
   menos movimento não vê nenhum (CSS). */
const CORES_CONFETE = ["#0a8a55", "#e31b62", "#14181a", "#25d366", "#f4b740"];
function Confete() {
  const [papeis] = useState(() => Array.from({ length: 44 }, (_, i) => {
    const redondo = i % 5 === 0;
    const larg = redondo ? 7 : 6 + Math.random() * 4;
    return {
      left: `${2 + Math.random() * 96}%`,
      width: `${larg}px`,
      height: `${redondo ? 7 : larg * (1.4 + Math.random() * .6)}px`,
      "--cai": `${240 + Math.random() * 200}px`,
      "--balanco": `${(Math.random() - .5) * 70}px`,
      "--giro": `${(Math.random() < .5 ? -1 : 1) * (360 + Math.random() * 540)}deg`,
      "--atraso": `${180 + Math.random() * 420}ms`,
      "--dur": `${1300 + Math.random() * 600}ms`,
      background: CORES_CONFETE[i % CORES_CONFETE.length],
      borderRadius: redondo ? "50%" : "1.5px",
    } as CSSProperties;
  }));
  return <span className={s.confete} aria-hidden>{papeis.map((st, i) => <i key={i} style={st} />)}</span>;
}

function HeroForm() {
  const t = useVit();
  const lang = useLang();
  const [leadDetalhes, setLeadDetalhes] = useState<{ id: string; whatsapp: string } | null>(null);
  const [linkWa, setLinkWa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [festa, setFesta] = useState(false);
  const [telInvalido, setTelInvalido] = useState(false);
  /* o e-mail é o contato obrigatório da versão em inglês (11/09/2026) */
  const [emailInvalido, setEmailInvalido] = useState(false);
  /* o @ que a rota não achou na Meta (10/09): guarda o texto para a
     mensagem dizer QUAL @ não existe, que é o que faz a pessoa conferir */
  const [instaInvalido, setInstaInvalido] = useState("");
  /* o campo do @ recebeu telefone ou e-mail (12/09): dito na hora, sem ir à rota */
  const [instaDiag, setInstaDiag] = useState<DiagnosticoArroba | null>(null);
  /* quantas vezes a Meta recusou o @ nesta sessão: na segunda, a mensagem muda */
  const [recusas, setRecusas] = useState(0);
  /* a loja que a Meta encontrou, mostrada na confirmação */
  const [loja, setLoja] = useState<LojaEncontrada | null>(null);
  const envioSuspeito = useGuardaDeFormulario();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;              // toque duplo não grava duas linhas
    /* Os campos são lidos ANTES de qualquer coisa: `setEnviado` troca o
       formulário pela confirmação, e depois disso não existe mais de onde
       ler. */
    const f = new FormData(e.currentTarget);
    /* Robô cai na tela de confirmação e não ensina nada à campanha, mas
       desde 01/09 o envio é GRAVADO como suspeito em vez de descartado: se
       for gente, o lead existe. Ver o porquê inteiro em form-guarda.tsx. */
    const suspeito = envioSuspeito(e.currentTarget);
    if (suspeito) {
      registrarSuspeito({
        nome: String(f.get("nome") || ""),
        whatsapp: String(f.get("whatsapp") || ""),
        email: String(f.get("email") || ""),
        instagram: String(f.get("instagram") || ""),
        motivo: suspeito,
        lang,
      });
      setEnviado(true);
      return;
    }
    /* telefone inválido nem vira evento: o Contact é o que a campanha
       otimiza, e número lixo aqui seria falso positivo ensinando a Meta.
       No en a mesma régua vale para o e-mail, que é o contato de lá. */
    if (lang === "en") {
      if (!emailValido(String(f.get("email") || ""))) { setEmailInvalido(true); return; }
    } else if (!whatsappValido(String(f.get("whatsapp") || ""))) { setTelInvalido(true); return; }
    /* telefone ou e-mail no campo do @ nem vai à rota (ver ErroArroba) */
    const diag = diagnosticoDoArroba(String(f.get("instagram") || ""));
    if (diag) { setInstaDiag(diag); return; }
    setEnviando(true);
    const { salvo, linkWa: link, arrobaInvalido, loja: lojaAchada, id: leadId } = await enviarLeadVitrine({
      nome: String(f.get("nome") || ""),
      whatsapp: String(f.get("whatsapp") || ""),
      email: String(f.get("email") || ""),
      /* o lead-flow já sabia receber `instagram` desde 07/08 (o formulário
         da oferta manda), e é ele que vira a linha "Loja:" da mensagem do
         WhatsApp e a coluna `canal` no banco. Só o hero não mandava. */
      instagram: String(f.get("instagram") || ""),
      ctaPosition: "hero_form",
      lang,
    });
    setEnviando(false);
    /* o @ não existe na Meta: o campo volta para a pessoa, sem WhatsApp e
       sem confirmação, porque não há prévia possível a partir dele */
    if (arrobaInvalido) { setInstaInvalido(String(f.get("instagram") || "")); setRecusas(n => n + 1); return; }
    setLoja(lojaAchada);
    setLinkWa(link);
    if (salvo) {
      setEnviado(true);
      /* o confete e a vibração curta só no envio gravado de verdade (o
         suspeito também cai na confirmação, mas sem festa) */
      setFesta(true);
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.(28);
    }
    /* ---------- a continuação no modal (28/10, pedido do Rafael) ----------
       Com o lead gravado, a confirmação traz as quatro perguntas opcionais
       logo abaixo, na mesma janela (ver `PerguntasDaPrevia`). Guarda o id e
       o WhatsApp, que a rota de detalhes confere juntos. Só no pt. */
    if (salvo && lang === "pt") setLeadDetalhes(leadId ? { id: leadId, whatsapp: String(f.get("whatsapp") || "") } : null);
  }
  /* a confirmação ocupa a própria porta: estado do React, sem navegação,
     então aparece igual no navegador interno do Instagram */
  {/* o id fica também na confirmação: o CTA do topo desce para cá por
      âncora, e sem isso quem já enviou clicaria num link morto */}
  /* com as perguntas embaixo, o "Pedido recebido" vira uma linha com o ✓
     pequeno ao lado (28/10): grande, ele empurrava a janela para fora da
     tela do celular */
  if (enviado) return <div id="hero-form" className={`${s.tag} ${s.tagConfirm}${leadDetalhes ? ` ${s.tagConfirmCurta}` : ""}`} role="status">
    {/* o alfinete saiu em 28/10, a pedido do Rafael (a anatomia dele está no histórico do git) */}
    {/* o ✓ que se desenha (28/10): a confirmação no desenho da página, no
        lugar do título em caixa alta e do mono */}
    <span className={s.okIcone} aria-hidden><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg></span>
    {festa && <Confete />}
    <p className={s.formTitle}>{t.form.okTitulo}<br /><span>{t.form.okSub}</span></p>
    <LojaAchada loja={loja} />
    {leadDetalhes && <PerguntasDaPrevia id={leadDetalhes.id} whatsapp={leadDetalhes.whatsapp} />}
    {/* o único WhatsApp que sobrou no hero, e só depois do envio: aqui o
        Contact já disparou, então a saída não custa mais conversão nenhuma */}
    <ReabrirCta href={linkWa} rotulo={t.form.okCta} />
  </div>;
  return <form id="hero-form" className={s.tag} onSubmit={submit}>
    {/* o alfinete saiu em 28/10, a pedido do Rafael (a anatomia dele está no histórico do git) */}
    {/* ---------- o carimbo ----------
        SEM mês e SEM contagem de vagas de propósito. "AGOSTO" apodrece
        sozinho no dia 1º de setembro, e um número de vagas que não seja
        verdade quebra na primeira conferência, numa página cujo resto é
        só fato verificável (os projetos no ar, 7 dias úteis, R$0 de
        mensalidade, todos conferíveis no /portfolio).
        "AGENDA ABERTA" é o mesmo que a página já diz na seção do CTA
        final, então o carimbo não inventa nada: ele repete perto do
        formulário o que o rodapé já promete.
        Não leva aria-hidden: é uma afirmação, não enfeite. */}
    {/* SEM mês e SEM contagem de vagas de propósito. "AGOSTO" apodrece
        sozinho no dia 1º de setembro, e um número de vagas que não seja
        verdade quebra na primeira conferência, numa página cujo resto é
        só fato verificável. "AGENDA ABERTA" é o que a seção do CTA final
        já promete, e "MARINGÁ · PR" é o que o Quem Faz já diz.
        `role="img"` + `aria-label`: o leitor de tela anuncia o selo como
        uma coisa só, em vez de soletrar as quatro linhas soltas. */}
    {/* o carimbo "AGENDA ABERTA" saiu em 28/10, a pedido do Rafael, junto com o alfinete */}
    {/* ---------- a etiqueta parou de ser fatura (23/08) ----------
        O corpo do cartão era a CONTA: R$199 em corpo 48, "+ 4 parcelas de
        R$200,00", "= no total R$999,00". Três linhas amarradas por sinal
        de mais e de igual, ou seja, fita de calculadora e não etiqueta de
        loja. Este cartão é o primeiro objeto da página e o único lugar
        onde se age nela: quem chegava de um anúncio recebia um carnê de
        pagamento antes de saber o que compraria, e o olho lia CHECKOUT
        onde havia formulário de contato.

        A regra de 20/08 continua de pé, e é ela que impede esta troca de
        virar isca: "etiqueta que anuncia a entrada e cala o total é
        isca". Por isso NENHUM número saiu da primeira tela. Os três (a
        entrada, o total e o prazo do saldo) desceram inteiros para o
        `.tagMicro`, embaixo do botão, onde são condição de quem já
        decidiu agir, e não pedágio de quem ainda está decidindo.

        O que sobe no lugar é o trabalho que este cartão sempre teve e
        que nunca esteve escrito nele: ele não vende, ele marca uma
        conversa.

        Herança do bloco antigo que sobrevive: o `padding-right` de 66px.
        Ele não é respiro de layout, é o que reserva o canto do selo da
        agenda e impede a manchete de correr por baixo dele. */}
    {/* ---------- a oferta virou objeto (26/08) ----------
        "Te mostro como ela ficaria" era promessa de CONVERSA: quem lia
        não sabia o que ia receber, e mesmo assim o cartão pedia o esforço
        de quem vai pedir orçamento. Agora o que se ganha aqui é uma
        coisa, a vitrine desenhada, e o preço dela é dito na mesma
        respiração: nenhum.
        A oferta subiu para a manchete no mesmo dia (ver a nota longa no
        Hero): o cartão foi o primeiro lugar a receber a promessa nova e
        deixou de ser o único assim que os criativos foram liberados.
        "Algumas peças" não é modéstia, é o escopo: a prévia é a loja
        montada com uma amostra, e o catálogo inteiro é trabalho pago.
        Sem esse limite escrito, cada lead pago custa um catálogo. */}
    {/* o cartão NÃO repete a manchete: "antes de pagar" agora é dito em
        corpo de manchete duas linhas acima, e dizer de novo aqui
        gastaria a peça mais cara da dobra com uma informação que a
        pessoa acabou de ler. Aqui ele diz a MECÂNICA, que é a dúvida
        seguinte: em que ordem as coisas acontecem.
        Duas frases de onze caracteres: a 34px, com os 66px reservados
        para o selo, é o que cabe em duas linhas num celular de 390px
        sem virar três. */}
    <p className={s.tagLead}>{t.etiqueta.lead}</p>
    {/* ---------- o aparte SAIU (28/10) ----------
        A pedido do Rafael, na revisão do cartão: "de graça" repetia o
        "A prévia é por minha conta" do `.tagMicro`, a três linhas dali.
        O histórico de quando ele quis manter fica abaixo.

        ---------- o aparte (28/08) ----------
        A frase é do Rafael e FICA: ele gosta dela, e ela diz o preço e a
        saída na mesma respiração. O que mudou foi o lugar e o corpo, não o
        conteúdo. No fim de uma linha de prosa de 13,5px ela morria de
        cansaço, e ela é a única fala do cartão: precisa soar como fala.
        Agora é linha própria, na condensada da casa, em esmeralda escura.

        "Mesmo" e "nenhum" não são enfeite nem enchimento: são exatamente o
        que a boca acrescenta quando quer ser acreditada. "De graça, sem
        compromisso" é a frase escrita; "de graça mesmo, sem compromisso
        nenhum" é a frase dita, e num cartão em que só existe uma voz, a
        segunda é a certa.

        Fica registrado o que NÃO passou, para a ideia não voltar do zero:
        propus trocar tudo por "Você não paga para ver", argumentando que a
        página já tinha aposentado "de graça" uma vez (ver a nota do
        `.tagMicro`, onde "A prévia é de graça" saiu por ser a frase que
        qualquer isca de landing page escreve) e que "sem compromisso" é
        vocabulário de quem vende orçamento. O Rafael manteve a dele, e a
        chamada é dele: aqui em cima a leitora ainda está decidindo se lê, e
        as duas palavras que ela procura nesse momento são exatamente essas
        duas. O trabalho fino de desarmar o dedo continua sendo do
        `.tagMicro`, a uma tela de distância, perto do botão. */}
    <p className={s.tagSub}>{t.etiqueta.sub}</p>
    <hr className={s.tagRule} />
    <div className={s.tagCampos}>
      {/* rótulo visível E placeholder, que não é contradição: o rótulo é
          quem sobrevive à digitação (o campo não pode ficar anônimo na
          hora de conferir), e o placeholder é o exemplo. Este campo era o
          único dos três sem exemplo, e era o primeiro da fila: o rótulo
          ficava sozinho sobre um vão vazio enquanto os dois de baixo
          mostravam texto, e o vão lia como campo quebrado. */}
      {/* O NOME saiu do cartão do hero (11/09/2026): não é matéria-prima da
          prévia (o @ é), e custava 55px que devolvem o botão de envio à
          primeira tela do celular depois de o balão do pedido entrar acima
          do cartão. A /api/lead usa o @ como nome de exibição quando ele
          falta, e o nome de gente chega na primeira resposta do WhatsApp.
          O formulário do fim da página continua pedindo. */}
      {/* a máscara reescreve o valor a cada tecla; digitar limpa o erro para a
          mensagem não continuar acusando um número que já foi corrigido */}
      {/* ---------- o contato, por idioma (11/09/2026) ----------
          No pt é o WhatsApp com a máscara brasileira; no en é o e-mail, que é
          por onde a prévia volta (não há WhatsApp na versão gringa). O campo
          que existe no DOM é o que o submit valida. */}
      {lang === "en"
        ? <>
          <label><span>{t.form.email}</span><input name="email" type="email" inputMode="email" autoComplete="email" placeholder={t.form.emailPh} required
                 onInput={() => { if (emailInvalido) setEmailInvalido(false); }} /></label>
          {emailInvalido && <small className={s.tagErro} role="alert">{t.form.errEmail}</small>}
        </>
        : <>
          {/* o rótulo virou o símbolo do WhatsApp na cor dele (28/10); o nome
              do campo passa para o aria-label, senão o leitor de tela fica sem */}
          <label><span className={s.campoIcone} aria-hidden><IconeWhatsApp /></span><input name="whatsapp" aria-label={t.form.whatsapp} type="tel" autoComplete="tel" placeholder={t.form.whatsappPh} required maxLength={16}
                 onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); if (telInvalido) setTelInvalido(false); }} /></label>
          {telInvalido && <small className={s.tagErro} role="alert">{t.form.errTel}</small>}
        </>}
    {/* ---------- o terceiro campo (13/08) ----------
        Entrou a pedido do Rafael e OBRIGATÓRIO, e deixou de ser em
        23/08, igualando-se ao mesmo campo no formulário da oferta. Ele
        custava: a etiqueta vendia "dois campos" e das quatro pessoas que
        tocaram no formulário em 12-13/08 as três que largaram pararam no
        primeiro campo, ou seja, a fricção aqui é real e já mordeu.

        O comentário antigo previa a saída pelo abandono medido
        (`form_ultimo_campo` = `hero_instagram` no evento Saida). Quem
        cobrou a conta antes foi o roteiro: o CTA1 dos anúncios promete
        "dois campos, dez segundos" e a tela do anúncio escreve
        `2 CAMPOS`. Três campos obrigatórios desmentem o anúncio no exato
        ponto de maior atrito, e uma promessa quebrada custa mais caro
        que um @ que falta.

        O campo FICA, porque a promessa que a página faz duas vezes
        ("vou olhar sua loja antes de falar com você") depende dele: sem
        o @ a primeira mensagem chega genérica. Ele só deixa de ser
        pedágio e vira convite. Por isso o rótulo continua não pedindo o
        dado, e sim dizendo o que vai ser FEITO com o dado.

        `lead-flow.ts` já aguentava vazio antes desta troca: o tipo
        declara `instagram?`, a linha "Loja:" da mensagem só é montada se
        houver valor, e `canal` cai para "".

        O `@` fica FORA do input, como prefixo fixo: dentro, ele seria
        apagado por quem digita por cima, e a limpeza no onInput cobre os
        três jeitos de errar que a pessoa tem (digitar o @ de novo, colar
        a URL inteira do perfil, ou deixar espaço no meio). */}
      {/* ---------- o @ virou o próprio rótulo (23/08) ----------
          Com o nome do campo impresso na linha, a coluna da esquerda já é
          o lugar do prefixo: o `@` deixa de ser um enfeite dentro da
          linha e passa a ocupar a mesma casa em que NOME e WHATSAPP estão
          impressos. Um elemento a menos e o alinhamento dos três campos
          fica na mesma prumada.
          O `aria-label` é obrigatório aqui: "@" sozinho não nomeia campo
          nenhum para quem ouve a página. O `<span>` fica `aria-hidden`
          para o leitor de tela não anunciar o símbolo duas vezes. */}
      <label>
        {/* o @ virou o símbolo do Instagram no degradê dele (28/10) */}
        <span className={s.campoIcone} aria-hidden><IconeInstagram id="insta-degrade-campo" /></span>
        <input name="instagram" aria-label={t.etiqueta.instaAria} autoCapitalize="off" autoCorrect="off" spellCheck={false} required placeholder={t.etiqueta.instaPh}
               onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/^\s*(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "").replace(/[@\s]/g, "").replace(/\/.*$/, ""); if (instaInvalido) setInstaInvalido(""); if (instaDiag) setInstaDiag(null); }} />
        {/* o "opcional" saiu em 26/08: o cartão logo acima passou a
            prometer DESENHO, e sem o @ não existe o que desenhar. O campo
            mais caro da dobra (68px medidos) virou o insumo do produto, e
            de quebra filtra quem só queria espiar preço. */}
      </label>
      {/* A rota conferiu o @ na Meta e não achou (10/09). Diz QUAL @ e o
          que precisa ser, porque os dois erros mais comuns da primeira
          semana foram digitar o e-mail neste campo e dar o @ pessoal em
          vez do da loja. O mesmo vermelho do erro de telefone. */}
      <ErroArroba arroba={instaInvalido} diag={instaDiag} recusas={recusas} />
      <CampoIsca />
    </div>
    {/* O rótulo era "ME CHAMA HOJE", e ele passou a brigar com a linha
        de baixo: "eu olho sua loja ANTES de te chamar" promete estudo, o
        botão prometia agora. Duas velocidades no mesmo par de linhas, e
        a que a pessoa lê primeiro é a do botão.
        Agora o botão nomeia o que se ganha (a vitrine, que é o produto e
        a palavra do rótulo lá em cima) e a microcopy fica sozinha com o
        quando. Um trabalho cada: o rótulo diz o prêmio, a linha abaixo
        diz quem faz, em que ordem e quando.
        A manchete virou pergunta e perdeu o imperativo; o botão é onde
        ele volta, agora na voz de quem clica. */}
    <button className={`${s.button} ${s.acao}`} disabled={enviando}>{enviando ? t.etiqueta.enviando : t.etiqueta.enviar}</button>
    {linkWa
      ? <Pendente href={linkWa} />
      : <small className={s.tagMicro}>
          {/* aqui aterrissa a conta que saiu do topo. A ordem é a da
              decisão de quem já vai agir: primeiro o total (para a linha
              não ser isca), depois quanto custa hoje, depois o que
              protege o resto, e por último a única frase que desarma o
              medo de clicar. "Nada é cobrado agora" existia só no
              formulário da oferta, a uma página de distância do lugar
              onde o susto acontece. */}
          {/* ---------- a linha que desarma o dedo ----------
              "A prévia é de graça" estava CORRETO e não tinha dono: é a
              frase que qualquer isca de landing page escreve, e numa
              página cujo argumento inteiro é "quem faz sou eu" ela soava
              como termo de uso. "Por minha conta" é a mesma informação
              dita por uma pessoa, e é de graça do jeito que se fala de
              graça no balcão.
              A segunda metade é a saída honrosa, e ela vale mais aqui do
              que qualquer garantia: quem não sabe COMO recusar não pede.
              "Me diz sem dó" é a mesma expressão do template de prévia
              do CRM, ou seja, é o que eu digo no WhatsApp quando mando a
              página pronta. A pessoa lê aqui e ouve igual depois.
              O "resto só depois de você aprovar" saiu: virou a quarta
              condição de uma linha que já tinha três, e ela continua
              dita no passo 04 e no selo do processo. */}
          {t.etiqueta.micro}
        </small>}
    {/* o canhoto: o picote separa o que você dá do que eu já provei, que são
        as duas metades da decisão. Fatos verificáveis, não adjetivos: os 9
        são o catálogo inteiro do /portfolio, e "PROJETOS" e não "LOJAS"
        porque dois dos nove não são loja. */}
    <p className={s.tagStub}><span><b>{NO_AR}</b> {t.etiqueta.stub.projetos}</span><span><b>{t.etiqueta.stub.prazo}</b> {t.etiqueta.stub.prazoRotulo}</span><span><b>{t.etiqueta.stub.mensal}</b> {t.etiqueta.stub.mensalRotulo}</span></p>
  </form>;
}

/* ---------- primeira dobra: a dor primeiro ----------
   A manchete vendia o MECANISMO ("seus produtos em um link só"), e mecanismo
   só interessa a quem já concordou que tem um problema. Com 85% dos
   visitantes saindo sem chegar na oferta e sessão mediana de 8,6 segundos,
   não existe tempo de convencer alguém de que ele tem o problema: a página
   precisa nomeá-lo na primeira linha e ser reconhecida na hora.
   Agora a manchete é a dor ("pare de perder venda no direct"), que é a mesma
   cena que o anúncio c1-direct mostra, então quem clica encontra do outro
   lado o que veio buscar. O mecanismo não sumiu: virou o rótulo, que é onde
   ele serve, explicando o que a página vende sem gastar a manchete nisso.

   Some daqui a variante por anúncio (`useVeioDoC1`): ela existia para o
   coorte do c1 ver uma manchete que continuasse o anúncio, e a manchete
   nova já é essa continuação para todo mundo. Manter as duas faria 15% do
   tráfego (justamente o que motivou a mudança) nunca ver a versão nova. */
/* ---------- o pedido chegando (11/09/2026) ----------
   Um balão de WhatsApp com um pedido de verdade, no formato que a vitrine
   manda (peça e tamanho, sem preço porque o da Sölo Urb muda). É a prova
   da segunda metade do lead ("o pedido chega montado no WhatsApp"),
   pendurado no aparelho nas duas larguras: no desktop no vão entre o
   cartão e o celular, no celular na quina de baixo à esquerda da tela.
   (Chegou a ficar logo abaixo do lead no celular, em 11/09, e o Rafael
   pediu de volta para perto do aparelho: o balão só faz sentido saindo
   da tela da loja.) Decorativo para leitor de tela: a frase já está no
   lead. */
export function Pedido({ className }: { className?: string }) {
  const t = useVit();
  /* desde 28/10 é uma NOTIFICAÇÃO do WhatsApp, como a do celular: o ícone
     do app, o título e a hora numa linha, a mensagem embaixo. Era um balão
     de borda preta e sombra dura, a gramática de carimbo que a página largou */
  return <div className={`${s.pedido} ${className ?? ""}`} aria-hidden>
    <span className={s.pedidoTopo}><IconeWhatsApp size={20} /><span className={s.pedidoK}>{t.hero.pedido.k}</span><i>{t.hero.pedido.hora}</i></span>
    <p>{t.hero.pedido.texto}</p>
  </div>;
}

/* ---------- a manchete que aparece letra por letra (28/10/2026) ----------
   A animação da velvetica.studio, pedida pelo Rafael: cada letra nasce
   desfocada e transparente e fica nítida, uma depois da outra, e o resto da
   frase espera escondido no desfoque. Lá é GSAP com SplitType; aqui a quebra
   é feita NO RENDER (o HTML do servidor já sai em letras) e a animação é
   CSS puro, então não depende de JavaScript para começar nem pisca.
   Cada palavra é um bloco que não quebra, para a linha nunca partir no
   meio de uma palavra. O <em> (a batida verde) é preservado: a quebra entra
   nos filhos dele. O índice da letra vai em --i e vira o atraso no CSS. */
export function textoDe(n: React.ReactNode): string {
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textoDe).join("");
  if (isValidElement<{ children?: React.ReactNode }>(n)) return textoDe(n.props.children);
  return "";
}
export function letraALetra(n: React.ReactNode, cont = { i: 0 }): React.ReactNode {
  if (typeof n === "string") {
    return n.split(/(\s+)/).map((pedaco, k) => /^\s+$/.test(pedaco) || !pedaco ? pedaco
      : <span key={k} className={s.palavra}>{[...pedaco].map((letra, j) =>
          <span key={j} className={s.letra} style={{ "--i": cont.i++ } as React.CSSProperties}>{letra}</span>)}</span>);
  }
  if (Array.isArray(n)) return n.map((x, k) => <span key={k} style={{ display: "contents" }}>{letraALetra(x, cont)}</span>);
  if (isValidElement<{ children?: React.ReactNode }>(n)) return cloneElement(n, undefined, letraALetra(n.props.children, cont));
  return n;
}

/* as logos das lojas no ar, no hero: [arquivo em /assets/lojas, largura a 56px de altura] */
export const LOJAS_DA_FAIXA: [string, number][] = [["iconic", 188], ["japa", 316], ["arena", 91], ["sneakerspot", 201], ["jk", 94], ["fulltime", 85], ["mm", 54], ["fardo", 191]];
/* o site de cada loja (28/10, pedido do Rafael): todos abertos com curl no
   mesmo dia, o domínio próprio quando a loja tem. A JK fica SEM link: o
   jkimports.vercel.app cai em "Pagamento pendente" (o saldo em aberto), e
   mandar um visitante para lá seria mostrar a loja bloqueada. Quando ela
   quitar, é só pôr o endereço aqui. */
export const LOJAS_LINKS: Record<string, string> = {
  iconic: "https://iconicsneakers.com.br", japa: "https://www.japamodasurf.com.br",
  arena: "https://www.arenaimportsfloripa.com", sneakerspot: "https://sneakerspotbr.com.br",
  fulltime: "https://fulltimeskateboards.com.br", mm: "https://mm-calcados.vercel.app",
  fardo: "https://fardoesportes.com.br",
};
export const LOJAS_NOMES: Record<string, string> = { iconic: "Iconic Sneakers", japa: "Japa Modas", arena: "Arena Imports", sneakerspot: "SneakerSpot", jk: "JK Imports", fulltime: "Full Time Skateboards", mm: "M&M Calçados", fardo: "Fardo Esportes" };
export function Hero() {
  const t = useVit();
  return <section className={s.hero} id="topo">
    <div className={s.heroGrid}>
      <div className={s.heroCopy}>
        {/* "PARA LOJAS" era categoria, não público, e loja é todo mundo.
            O rótulo agora nomeia quem a página quer, que é o mesmo
            público que o anúncio interrompe.
            O tamanho não é folga, é o teto medido: 36 caracteres a
            10.5px mono com .24em de tracking dão ~318px contra os 350px
            úteis de uma tela de 390px. O rabo "· SEUS PRODUTOS EM UM
            LINK SÓ" saiu por estourar exatamente esse limite, então aqui
            não entra mais nada sem sair outra coisa. */}
        {/* a etiqueta virou selo claro (28/10): o símbolo do Instagram na frente,
            a frase em caixa de frase; era bloco preto em mono, torto */}
        <p className={`${s.eyebrow} ${s.seloHero}`}><IconeInstagram id="insta-degrade-selo" size={16} />{t.hero.eyebrow}</p>
        {/* ---------- a manchete virou a OFERTA (26/08) ----------
            Aqui morava a pergunta do direct ("quantas vendas você perdeu
            essa semana"), que era o hook H01 do lote 01 palavra por
            palavra: a página e o vídeo diziam a mesma frase, e por isso
            ela não podia ser tocada enquanto o lote rodasse.

            O Rafael liberou trocar os criativos junto, e isso desamarra
            a manchete. O que sobe para cá é a inversão de risco, que é
            a única coisa que a concorrência de template não consegue
            oferecer: a loja existe ANTES de a pessoa pagar. A dor não
            some da página, ela continua inteira na seção de baixo (os
            balões verdes sem resposta) e no manifesto; o que ela perde é
            a primeira tela, onde quem manda agora é a oferta.

            A DOBRA GANHOU FÔLEGO, e isso não é detalhe: a nota antiga
            media o botão de envio em 670px numa dobra de 740, "na
            beira", com o navegador interno do Instagram comendo mais uns
            60. A pergunta ocupava três linhas (98px) e esta frase ocupa
            duas, então o campo do @ (68px), que virou obrigatório com a
            oferta nova, cabe sem empurrar o botão para fora da tela.

            O <em> leva "você pagar", e não "pagar" sozinho: é a pessoa
            que a frase quer nomear, e o ponto final em rosa cai depois
            do nome dela. Sem noBreak: o grupo aqui teria 20 caracteres e
            forçaria uma linha larga demais em 390px, ao contrário do
            "NO DIRECT?" antigo, que tinha dez.

            AO TROCAR OS CRIATIVOS: o hook do vídeo tem que voltar a
            dizer esta frase, porque é o que faz a pessoa reconhecer a
            página como o lugar em que ela clicou. E anotar a data no doc
            do lote (docs/matriz-anuncios-vitrine.md), senão o CPL de
            antes e o de depois viram a mesma média. */}
        {/* a frase nítida para o leitor de tela; a quebrada em letras, só visual */}
        <h1><span className={s.soLeitor}>{textoDe(t.hero.h1)}</span><span aria-hidden>{letraALetra(t.hero.h1)}</span></h1>
        {/* encurtado em 13/08: a versão anterior tinha 27 palavras e ocupava
            cinco linhas num celular de 390px, empurrando a etiqueta para
            fora da dobra. Depois caiu de três linhas para DUAS, para
            devolver à dobra 26 dos 32px que a manchete em pergunta
            custou (a conta inteira está na nota acima).
            "De tudo" virou "de cada peça": o genérico não deixa imagem
            na cabeça, e a peça é o objeto em que a etiqueta logo abaixo
            está pendurada. "O cliente chega decidido" virou "o pedido
            chega pronto", que é o hook H13 da matriz e troca um estado
            de espírito por uma coisa que chega na sua mão.
            O "seu" antes de WhatsApp foi medido e SAIU: com ele são
            quatro caracteres que devolvem a terceira linha e os 26px
            junto. É o único lugar da frase onde cabe cortar sem perder
            um argumento, porque de quem é o WhatsApp já está dito no
            botão, na microcopy e na etiqueta inteira. */}
        {/* o negrito não muda uma palavra da frase: ele dá espinha a ela.
            "Foto, preço e tamanho" é a promessa inteira do produto em três
            palavras, e a página repete essa tríade no anúncio, no corpo e
            no canhoto da etiqueta. Aqui ela fica em tinta cheia e o resto
            da frase recua para o cinza. Ver `.heroCopy .lead b` no CSS. */}
        <p className={s.lead}>{t.hero.lead}</p>
        {/* ---------- a faixa, ACIMA da etiqueta ----------
            Ela nasceu embaixo e foi medida a 800px numa dobra de 740, ou
            seja, fora da primeira tela, que era o único lugar onde ela
            faria diferença. Subiu. O custo são ~30px empurrando o botão
            de envio para baixo, pagos cortando quatro palavras do lead
            logo acima ("monta o pedido sozinho e"), que já eram ditas
            pelo "chega já decidido" da mesma frase.
            O cordão da etiqueta atravessa a faixa por cima, o que é o
            que amarra as duas peças em vez de empilhá-las.
            aria-hidden: as duas frases já são ditas em texto no canhoto
            da etiqueta e na oferta; aqui seriam a terceira repetição.
            8 repetições e percurso de -50% no keyframe: a trilha precisa
            conter o conteúdo DUAS vezes para o laço fechar sem emenda. */}
        {/* a faixa rosa saiu do hero em 28/10: virou a fileira de logos
            logo abaixo do formulário (ver `.logosLojas`) */}
        {/* ---------- uma porta só (13/08) ----------
            Aqui ficavam duas portas lado a lado, a segunda abrindo o
            WhatsApp, mais a linha de preço e a faixa de prova soltas. Agora
            é a etiqueta e nada mais: o preço virou o corpo dela, a prova
            virou o canhoto, e a porta que ninguém atravessava saiu. O
            porquê em números está na nota no topo deste arquivo. */}
        {/* ---------- dois botões no lugar do formulário (28/10/2026) ----------
            A estrutura do mobbin.com, pedida pelo Rafael: título, texto, um
            botão cheio e um contornado, as logos e o site grande. O formulário
            saiu da primeira tela e abre num modal por cima (ver o <dialog>
            no fim do Hero). Custo conhecido: um toque a mais antes do
            formulário, que é o Contact da campanha. Se o Contact cair, é o
            primeiro suspeito. */}
        <div className={s.heroAcoes}>
          <a className={`${s.button} ${s.acao}`} href="#hero-form" data-cta="hero_abrir" data-cta-dest="form">{t.hero.cta}</a>
          <a className={`${s.button} ${s.outline}`} href="#projetos" data-cta="hero_lojas" data-cta-dest="projetos">{t.hero.cta2}</a>
        </div>
        {/* ---------- as lojas que já estão no ar (28/10/2026) ----------
            Pedido do Rafael, no molde do "Trusted by" de site de produto:
            uma legenda pequena e as logos em cinza, paradas, sobre o branco.
            SÓ quem fechou: Arena, Iconic, Japa, JK, SneakerSpot, Full Time
            (conferidas no cofre) e M&M e Fardo (confirmadas por ele). Amostra
            que não virou cliente aqui seria prova falsa.
            Os arquivos são as logos reais de cada vitrine tingidas pelo alfa
            (a da Japa é o nome recortado do selo, que tem onda, sol e
            telefone); o cinza sai do CSS, então o mesmo arquivo serve claro
            e escuro. A legenda diz "no ar", não "vendem": venda não medi. */}
        <div className={s.logosLojas}>
          <p>{t.hero.lojas}</p>
          {/* no celular a fileira roda numa linha só (28/10, pedido do Rafael:
              "não quero 2 linhas"); a segunda volta (`copia`) só existe para o
              laço não ter emenda, some no desktop e fica fora do leitor de tela */}
          <div>
            {[0, 1].flatMap(copia => LOJAS_DA_FAIXA.map(([k, w]) => {
              /* eslint-disable-next-line @next/next/no-img-element */
              const logo = <img src={`/assets/lojas/${k}-branca.webp`} width={w} height={56} alt={copia ? "" : LOJAS_NOMES[k]} loading="lazy" decoding="async" />;
              const extra = copia ? { className: s.logosCopia, "aria-hidden": true, tabIndex: -1 } : {};
              return LOJAS_LINKS[k]
                ? <a key={`${copia}-${k}`} href={LOJAS_LINKS[k]} target="_blank" rel="noopener" data-cta={`hero_logo_${k}`} data-cta-dest="loja" {...extra}>{logo}</a>
                : <span key={`${copia}-${k}`} {...extra}>{logo}</span>;
            }))}
          </div>
        </div>
        {/* a seta que pede a rolagem (28/10): fina, cinza, descendo e voltando
            devagar. É link para a moldura logo abaixo, então também serve de
            atalho; parada para quem pede menos movimento */}
        <a className={s.setaRolar} href="#vitrine-no-ar" aria-label={t.hero.rolar} data-cta="hero_seta" data-cta-dest="vitrine">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
        </a>
      </div>
    </div>
    {/* ---------- a moldura grande no lugar do celular (28/10/2026) ----------
        Pedido do Rafael, com a velvetica.studio de referência: título e
        texto centrados, e o site inteiro numa moldura larga logo abaixo.
        O formulário NÃO desceu para depois dela (escolha dele, o híbrido):
        ele é o Contact da campanha e continua na primeira tela.
        A moldura é o mesmo navegador dos projetos (barra, pontos, NO AR e a
        página rolando por pageScroll); no celular ela troca a captura de
        desktop pela de celular, que a 350px é a única que se lê.
        Lazy e com prioridade baixa: fica abaixo do formulário, e a primeira
        pintura continua sendo o texto. */}
    {/* ---------- a cena em volta da moldura (28/10/2026) ----------
        A velvetica.studio de novo, pedida pelo Rafael: o site fica numa
        paisagem, com morros atrás e uma colina na frente cobrindo a base, e
        ao rolar ele sobe de trás da colina. Lá é foto 3D de folhagem; aqui é
        SVG em esmeralda, minimalista: leve, nítido em qualquer largura e sem
        mais uma imagem pesada na primeira tela. As camadas são só desenho
        (aria-hidden); o movimento está no CSS (.cena). */}
    <div className={s.cena}>
    <CenaFundo />
    <div className={s.moldura} id="vitrine-no-ar">
      <div className={s.molduraTela} role="img" aria-label={t.hero.phoneAria}>
        <div className={s.browserBar}>
          <span className={s.dots} aria-hidden><i /><i /><i /></span>
          <span className={s.urlChip}>iconicsneakers.com.br</span>
          <span className={s.live}><i aria-hidden /> {t.projetos.live}</span>
        </div>
        <div className={s.molduraCover}>
          <picture>
            <source media="(max-width: 720px)" type="image/avif" srcSet="/assets/demo/iconic-vitrine.avif" />
            <source media="(max-width: 720px)" type="image/webp" srcSet="/assets/demo/iconic-vitrine.webp" />
            {/* a de 1100px desde 28/10: a moldura mostra no máximo 1040px, e a de
                1440 custava 368KB na primeira tela do desktop */}
            <source type="image/avif" sizes="min(1040px, 72vw)" srcSet="/assets/case-iconic-desk-1100.avif 1100w, /assets/case-iconic-desk.avif 1440w" />
            <source type="image/webp" sizes="min(1040px, 72vw)" srcSet="/assets/case-iconic-desk-1100.webp 1100w, /assets/case-iconic-desk.webp 1440w" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.molduraShot} src="/assets/case-iconic-desk.jpg" width={1440} height={6470} alt="" loading="lazy" decoding="async" fetchPriority="low" />
          </picture>
        </div>
      </div>
      <Pedido />
      <a className={s.liveTag} href="#projetos" data-cta="hero_projetos" data-cta-dest="projetos">
        <i aria-hidden /> {t.hero.liveTag}
      </a>
    </div>
    <CenaFrente />
    </div>
    <ModalDoFormulario />
  </section>;
}

/* as duas camadas da paisagem, geradas pelo Rafael em 28/10 (eram SVG):
   o fundo, morros esmeralda na névoa com o céu branco em cima (o céu é o
   branco da página, então a cena não tem borda); e a frente, a colina de
   musgo com o topo transparente e a base no grafite #14181A do Quem Faz.
   O halo verde-limão da crista, sobra do recorte do gerador, foi limpo
   antes de converter. Arquivos em /assets/cena, AVIF e WebP em dois tamanhos.
   Lazy: a cena só espia na primeira tela, e o texto pinta antes.
   À tarde o Rafael trocou pela versão noturna (noite-*): morros escuros sob
   céu verde-acinzentado e a vegetação em U, que abraça o site pelos lados.
   A versão clara (morros.*, colina.*) continua em /assets/cena.
   No celular (28/10, ainda): duas imagens próprias, geradas pelo Rafael em
   1300x1210, quase quadradas, porque a colina larga mostrava só o meio do U
   numa tela de 360 e os matinhos viravam uma tira escura. O `sizes` de 55vw
   é de propósito (28/10): numa tela de 3x ele faz o celular escolher a de
   760px e não a de 1300px, que custava 160KB a mais num fundo decorativo.
   Entram pelo
   `media` do <picture>; o desktop segue com as de cima. */
function CenaFundo() {
  return <picture className={s.cenaFundo} aria-hidden>
    <source media="(max-width: 720px)" type="image/avif" sizes="(max-width: 720px) 55vw" srcSet="/assets/cena/noite-morros-celular-760.avif 760w, /assets/cena/noite-morros-celular.avif 1300w" />
    <source media="(max-width: 720px)" type="image/webp" sizes="(max-width: 720px) 55vw" srcSet="/assets/cena/noite-morros-celular-760.webp 760w, /assets/cena/noite-morros-celular.webp 1300w" />
    <source type="image/avif" sizes="100vw" srcSet="/assets/cena/noite-morros-900.avif 900w, /assets/cena/noite-morros.avif 1672w" />
    <source type="image/webp" sizes="100vw" srcSet="/assets/cena/noite-morros-900.webp 900w, /assets/cena/noite-morros.webp 1672w" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {/* sem lazy desde 28/10: medido em produção, os morros são o maior elemento da
        primeira tela (o LCP), no celular e no desktop, e o lazy os deixava
        para depois; a versão do celular tem 27KB */}
    <img src="/assets/cena/noite-morros.webp" width={1672} height={941} alt="" decoding="async" />
  </picture>;
}
function CenaFrente() {
  return <picture className={s.cenaFrente} aria-hidden>
    <source media="(max-width: 720px)" type="image/avif" sizes="(max-width: 720px) 55vw" srcSet="/assets/cena/noite-colina-celular-760.avif 760w, /assets/cena/noite-colina-celular.avif 1300w" />
    <source media="(max-width: 720px)" type="image/webp" sizes="(max-width: 720px) 55vw" srcSet="/assets/cena/noite-colina-celular-760.webp 760w, /assets/cena/noite-colina-celular.webp 1300w" />
    <source type="image/avif" sizes="max(100vw, 900px)" srcSet="/assets/cena/noite-colina-1086.avif 1086w, /assets/cena/noite-colina.avif 2172w" />
    <source type="image/webp" sizes="max(100vw, 900px)" srcSet="/assets/cena/noite-colina-1086.webp 1086w, /assets/cena/noite-colina.webp 2172w" />
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/assets/cena/noite-colina.webp" width={2172} height={724} alt="" loading="lazy" decoding="async" />
  </picture>;
}

/* ---------- o formulário num modal (28/10/2026) ----------
   O mesmo HeroForm de antes (WhatsApp e @, o Contact da campanha), dentro de
   um <dialog> nativo: Esc fecha, o foco fica preso nele e o leitor de tela o
   anuncia como diálogo, sem biblioteca.
   Quem abre: todo link para #hero-form (o botão do hero, o CTA da pílula do
   topo e o do Quem Faz). O clique é interceptado na CAPTURA e só leva
   preventDefault, nunca stopPropagation: o ClickCTA do tracking escuta o
   mesmo clique no document e precisa recebê-lo.
   O foco vai para o campo do WhatsApp por focarSemContar: abrir o modal não
   pode contar como "começou a preencher".
   O #contratar (o formulário da oferta, mais abaixo) continua onde está. */
function ModalDoFormulario() {
  const t = useVit();
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
  return <dialog ref={ref} className={s.modalForm} aria-label={t.hero.modalAria}
    onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    <button type="button" className={s.modalFechar} aria-label={t.hero.modalFechar} onClick={() => ref.current?.close()}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <HeroForm />
  </dialog>;
}

/* ---------- quem faz (07/08) ----------
   A seção que a página nunca teve: o rosto. Tráfego frio compra de gente,
   não de landing page, e "do primeiro oi até a loja no ar: sou eu" é o
   diferencial que nenhum revendedor de template consegue dizer, porque
   nele sempre existe um terceiro que fez o site. Vem logo depois do hero
   porque é a segunda pergunta de quem chegou por anúncio: "quem está me
   vendendo isso?".

   A foto é P&B puro no arquivo e ganha o duotone grafite/papel em CSS
   (mix-blend-mode sobre o fundo escuro): a cor da foto segue os tokens da
   página, e trocar a paleta nunca exige regerar o asset. Óculos e blur
   funcionam AQUI (autoridade, personagem), não funcionariam no hero, onde o
   trabalho da dobra é confiança imediata no produto. */
export function QuemFaz() {
  const t = useVit();
  return <section className={s.quem}>
    <div className={s.quemPhoto}>
      {/* A foto voltou a ser COLORIDA em 28/10, a pedido do Rafael: a
          mesma da neve, sem o grayscale e sem o duotone do `.quemShot`.
          Arquivo novo (`rafael-quemfaz-cor.webp`) e não o
          `rafael-quemfaz.jpg`, que segue P&B na /e-commerce; o nome novo
          também fura o cache do otimizador do Next, que serve a versão
          antiga quando o arquivo é trocado com o mesmo nome. */}
      {/* `.quemShot` é a janela do impresso e NÃO é embrulho decorativo:
          ela dá à foto um fundo grafite próprio. Sem ele, o pedaço do
          retrato que sobe por cima da borda da seção ficaria sobre papel,
          e o `mix-blend-mode: screen` do duotone estouraria ali em branco.
          Ver a nota longa em `.quem`, no CSS. */}
      <div className={s.quemShot}>
        <Image src="/assets/rafael-quemfaz-cor.webp" fill sizes="(max-width: 900px) 92vw, 34vw" alt={t.quem.alt} />
      </div>
      {/* fora da janela e dentro da margem do impresso: era uma linha
          vertical branca por cima da imagem, e com a foto de neve virou
          branco sobre branco. Margem de foto revelada é onde legenda vive. */}
      <span className={s.quemLegenda} aria-hidden>{t.quem.legenda}</span>
    </div>
    <div className={s.quemTxt}>
      <Eyebrow>{t.quem.eyebrow}</Eyebrow>
      {/* ---------- a manchete parou de se definir pela negativa ----------
          Era "Uma pessoa. Não uma agência.". Duas coisas erradas com
          ela: "uma pessoa" é uma CATEGORIA, e o leitor não compra
          categoria, compra o que ela faz por ele; e "não uma agência"
          se define pelo que eu NÃO sou, o que obriga quem lê a pensar
          em agência, palavra que para uma parte dele soa maior e mais
          segura. Dar o quadro de referência ao concorrente é caro.
          A frase nova promete a jornada inteira e é a única coisa que
          um revendedor de template não consegue dizer. Ela não nasceu
          aqui: estava enterrada no meio do parágrafo abaixo, que é o
          pior lugar de todos para o argumento central da seção.
          Três linhas, mas a seção NÃO cresce: o parágrafo perdeu
          exatamente a frase que subiu.
          Os dois pontos, e não o ponto final, são o que faz "SOU EU"
          cair como resposta em vez de virar uma terceira frase solta. */}
      <h2>{t.quem.h2}</h2>
      {/* "Rafael Razeira" e não "Eu sou o Rafael": o "sou eu" já está
          dito, em corpo de manchete, dois centímetros acima. */}
      <p>{t.quem.p1}</p>
      {/* ---------- a conta tem que fechar ----------
          Dizia "as duas lojas desta página (...) os outros sete projetos
          do portfólio", e a conta parou de fechar em 07/08, quando a
          Sölo Urb entrou no celular do hero: quem lê acabou de ver TRÊS
          lojas, e o chip embaixo do aparelho diz o nome da terceira.
          Duas mais sete davam dez, num portfólio de nove.
          Agora são três nomeadas aqui e o RESTO contado do dado (ver
          `NO_AR` no topo do arquivo): três mais sete fecham os dez que o
          /portfólio mostra. O número deixou de ser digitado em 28/08
          justamente porque ele já tinha errado uma vez, e numa página cujo
          argumento inteiro é fato conferível, número que não fecha é a
          coisa mais cara que pode estar escrita.
          "De clientes" ficou só nas duas de baixo, porque é o que elas
          são: a Sölo Urb é projeto meu, e chamá-la de cliente seria
          ganhar uma prova de graça. */}
      {/* a Sölo Urb passou a ser NOMEADA aqui em 23/08. Ela ocupa a
          primeira tela inteira (é a loja que rola dentro do celular do
          hero) e era a única das três marcas da página sem uma segunda
          menção: a Xavier's aparece cinco vezes e a PR Grife quatro, cada
          uma com link para a loja no ar, e a Sölo Urb só existia no chip
          colado na base do aparelho. Marca que enche a primeira dobra e
          nunca mais é dita lê como imagem de banco, não como cliente.
          Nomear aqui custa duas palavras e não mexe em estrutura: este
          parágrafo já apontava para ela ("a loja que rola no celular aí em
          cima"), só que sem dizer o nome.
          Ela também é o corpo C1 dos anúncios ("a vitrine da Sölo Urb
          rolando do topo ao rodapé"), então quem chega por um C1 precisa
          reencontrar o nome dentro da página. */}
      <p>{preencher(t.quem.p2, { n: NO_AR - 2 })}</p>
      {/* AQUI NÃO ENTRA UMA LINHA DE DEFESA. Existiu por meia hora um
          terceiro parágrafo respondendo "uma pessoa só dá conta?" com o
          prazo e a condição de pagamento, e o Rafael cortou.
          O motivo vale para a próxima vez que a ideia voltar: obrigado a
          responder, o texto precisa primeiro FAZER a pergunta, e quem
          leu "uma pessoa, não uma agência" como vantagem (que é como a
          manchete a vende) sai daqui com uma dúvida que não tinha ao
          entrar. Prazo e pagamento já estão na faixa do hero e na
          microcopy da etiqueta, ditos como oferta e não como desculpa,
          que é o lugar certo deles. */}
      <ul className={s.quemFacts}>
        {[t.quem.fatos.cidade, preencher(t.quem.fatos.projetos, { n: NO_AR }), t.quem.fatos.resposta].map(x => <li key={x}>{x}</li>)}
      </ul>
      {/* volta para a etiqueta, que está a uma tela acima: esta seção é a
          segunda pergunta de quem chegou pelo anúncio ("quem me vende
          isso?"), e a resposta devolve a pessoa ao mesmo campo.
          O rótulo era "DEIXAR MEU CONTATO ↑", que nomeia o que a pessoa
          DÁ. Agora diz a mesma frase do botão de envio lá em cima, que é
          o que ela GANHA: quem clica aqui aterrissa num botão escrito
          igual, e o clique de cá e o de lá viram a mesma promessa em vez
          de duas ações diferentes.
          O `data-cta` NÃO muda: quem_faz é a posição no funil, e trocar
          o rótulo não pode reiniciar a série histórica. O do header
          continua "DEIXAR CONTATO ↓" por largura, e não por vocabulário:
          lá o texto divide os 350px úteis com a logo. */}
      <a className={`${s.button} ${s.acao}`} href="#hero-form" data-cta="quem_faz" data-cta-dest="form">{t.quem.cta}</a>
      {/* AQUI FICAVA `RAFAEL RAZEIRA · ESTÚDIO` em mono. Saiu em 13/08: o
          letreiro logo abaixo diz o mesmo nome em corpo de 3,4rem, então
          a assinatura era a segunda vez em menos de cem pixels. Assinar
          duas vezes seguidas não assina mais, assina menos. */}
    </div>
  </section>;
}

/* ---------- faixa da marca (07/08) ----------
   O letreiro do /estudio portado para cá: o nome da marca gigante rolando
   devagar na costura entre o Quem Faz (escuro) e o problema (claro). Mesma
   receita de lá: peso regular, não black (presença, não grito), sentido
   esquerda→direita, aria-hidden porque é decoração. Aqui o nome vai em
   minúsculas, formato de handle, com o ponto em verde: é o mesmo nome do
   Instagram, e a faixa assina a página logo depois do rosto. */
export function BrandBand() {
  const t = useVit();
  return <div className={s.brandband} aria-hidden>
    {/* `.brandband` é um chão RETO em grafite e `.brandTira` é a tira rosa
        girada dentro dele. Os dois níveis existem porque uma diagonal
        cruzando uma borda reta sempre deixa cunhas de fundo sobrando dos
        dois lados: com o chão próprio, o grafite continua por baixo da
        tira e o corte para o papel acontece depois dela, reto contra
        reto. O porquê está por extenso em `.brandband`, no CSS. */}
    <div className={s.brandTira}>
      <div className={s.brandTrack}>
        {Array.from({ length: 6 }, (_, i) => <span key={i}>{t.marca_faixa}</span>)}
      </div>
    </div>
  </div>;
}

/* As quatro perguntas de sempre viram os próprios balões: o argumento é
   ver quatro mensagens verdes seguidas com o confere cinza, sem resposta. */
export function PainSolution() {
  const t = useVit();
  /* as perguntas vêm do dicionário; o atraso de cada balão é meio segundo
     a mais que o anterior, como sempre foi */
  const questions = t.dor.perguntas;
  return <section className={s.section}>
    <div className={s.wrap}>
      <div className={s.split}>
        <div>
          {/* "O PROBLEMA E A SOLUÇÃO" prometia uma metade que não existe
              mais: o box escuro da solução saiu em 13/08 (ver a nota logo
              abaixo) e a virada passou a ser o manifesto no pé da seção.
              Rótulo que anuncia o que a seção não entrega gasta a
              confiança de quem confere, e esta página inteira é feita
              para ser conferida. Agora ele diz a função real do bloco:
              explicar a causa da pergunta que o hero fez. */}
          <Eyebrow>{t.dor.eyebrow}</Eyebrow>
          {/* ---------- a manchete parou de repetir o hero ----------
              Era "Quantas vendas sua loja perde porque o cliente não
              encontrou o produto?", escrita quando o hero vendia o
              mecanismo. Com o hero em "QUANTAS VENDAS VOCÊ PERDEU ESSA
              SEMANA NO DIRECT?", as duas viraram a MESMA pergunta a uma
              tela de distância, e a segunda não acrescentava nada: quem
              chegou aqui já respondeu essa pergunta lá em cima.
              A frase nova não é nova, é promoção: "cada atendimento
              começa do zero" estava no meio do segundo período do
              parágrafo abaixo, que é onde o argumento da seção menos
              pesa. Ela é o custo que a lojista paga TODO DIA, e por isso
              fala dela, não do cliente: a dor do hero é a venda perdida,
              a daqui é o trabalho repetido que a produz.
              O `.h2Line` saiu junto: ele forçava a quebra de uma frase
              longa em coluna dupla, e quatro palavras não precisam. */}
          {/* "do zero." em linha própria pelo mesmo motivo do hero e do
              Quem Faz: ele é a batida final da frase, e inline ele chegava
              com o peso do preparo. Ver `.split h2 em` no CSS. */}
          <h2>{t.dor.h2}</h2>
          {/* o parágrafo perdeu a frase que virou manchete e ganhou a
              ordem certa: primeiro a causa (produto espalhado), depois o
              efeito (o interrogatório), por último o custo (some antes de
              chamar). Antes ele abria pela causa numa oração subordinada,
              o que empurrava o sujeito para a terceira linha. */}
          {/* os três lugares em rosa e cada um torto para um lado: a frase
              diz "espalhados" e agora a linha faz isso, em vez de só
              informar. Ver `.split .espalhado` no CSS, inclusive a razão de
              o desalinho ser mínimo. */}
          <p className={s.lead}>{t.dor.lead.antes}<span className={s.espalhado}>{t.dor.lead.lugares[0]}</span>{t.dor.lead.sep}<span className={s.espalhado}>{t.dor.lead.lugares[1]}</span>{t.dor.lead.e}<span className={s.espalhado}>{t.dor.lead.lugares[2]}</span>{t.dor.lead.depois}</p>
          {/* ---------- a conta da dor (13/08) ----------
              O número que prova a seção estava enterrado em 11px na legenda
              do chat ("Quatro perguntas antes de escolher qualquer coisa"),
              que é o menor tipo desta dobra. E embaixo deste parágrafo
              sobravam uns 300px de nada, porque a coluna de texto é bem
              mais curta que a do chat ao lado.

              Os dois problemas eram um só, e a troca resolve os dois: o
              número sobe para corpo de manchete e ocupa o vão, e a legenda
              fica com o que só ela sabe (a hora do visualizado). Argumento
              à esquerda, evidência à direita, e agora o custo aparece do
              lado do argumento, no tamanho do argumento.

              `questions.length` e não "4" escrito na mão: o número é a
              contagem das bolhas ao lado. Se um dia entrar ou sair uma
              pergunta do array, a prova continua batendo com a evidência
              sozinha, e é exatamente esse tipo de número que apodrece
              calado numa página que se propõe a ser conferida. */}
          <p className={s.contaDaDor}>
            <b>{questions.length}</b>
            <span>{t.dor.conta}</span>
          </p>
          {/* Aqui morava o box escuro "COM A VITRINE: o cliente encontra os
              produtos, escolhe o que quer e chama sua loja pelo WhatsApp com
              o pedido já identificado". Saiu porque virou repetição: o
              subtítulo do hero passou a dizer isso na primeira tela, e esta
              seção agora tem um trabalho só, que é aprofundar a dor que a
              manchete abriu. A virada continua na página, dita pelo material
              em vez de por uma caixa de texto: as quatro perguntas sem
              resposta ao lado, e o manifesto logo abaixo. */}
        </div>
        <div className={s.shift}>
          <ChatStrip label={t.dor.tira.label} note={t.dor.tira.nota}>
            {questions.map(([text, time], i) => <Bubble key={time} out time={time} tick="sent" delay={i * 500}>{text}</Bubble>)}
          </ChatStrip>
        </div>
      </div>
      {/* ---------- a virada da seção, em três batidas ----------
          Era "O INSTAGRAM APRESENTA. A VITRINE ORGANIZA. O WHATSAPP
          FECHA.", e tinha dois problemas.
          O primeiro é o verbo do meio, que é justamente o nosso:
          apresentar e fechar são resultados, organizar é arrumação, o
          que uma planilha também faz. "Responde" é a única palavra que
          pega no que a seção acabou de mostrar, que são quatro perguntas
          com o confere cinza e nenhuma resposta: a vitrine responde
          elas antes de serem feitas.
          O segundo é que a frase tinha três sujeitos e nenhum era a
          lojista. A terceira batida deixou de ser um aplicativo e virou
          ela: se a vitrine responde, o que sobra para ela é só fechar.
          O WhatsApp não perde nada com isso, ele é dito em outros nove
          lugares da página, e aqui ele era o sujeito de uma frase que
          precisava falar de quem lê.
          As três batidas são três LINHAS em qualquer largura: a regra
          do span em bloco saiu do ≤900px e virou geral, junto com o
          `text-wrap: balance`, que quebrava onde bem entendesse. */}
      <p className={s.manifesto}><span>{t.dor.manifesto[0]}</span> <span>{t.dor.manifesto[1]}</span> <span>{t.dor.manifesto[2]}</span></p>
    </div>
  </section>;
}

/* Os quatro passos moram no dicionário (t.como.passos). A nota do terceiro:
   O título era "Visualiza o produto", que é o verbo mais fraco dos quatro
     e não diz nada: visualizar o quê? Agora ele carrega a tríade que a
     página inteira repete ("foto, preço e tamanho"), nas MESMAS palavras
     do lead do hero e do canhoto da etiqueta. Repetir de propósito é o que
     faz uma promessa virar refrão em vez de virar ruído.
     A descrição amarra na seção anterior: lá em cima quatro balões verdes
     ficaram sem resposta, e o manifesto disse "A VITRINE RESPONDE". Aqui é
     o passo em que isso acontece de fato. "Antes de ele digitar" é o que
     transforma a informação em economia de trabalho SEU, que é a única
     coisa que a lojista compra nesta lista. */
export function HowItWorks() {
  const t = useVit();
  const steps = t.como.passos;
  return <section className={s.section} id="como">
    <div className={s.wrap}>
      <Eyebrow>{t.como.eyebrow}</Eyebrow>
      {/* A manchete contava os passos e parava aí. Contar passo serve para
          uma coisa só, que é fazer parecer simples, e isso ela já fazia.
          O que faltava é de quem são os passos: os quatro da lista são do
          CLIENTE, do primeiro toque no link até a mensagem pronta. A
          lojista entra depois do quarto, e é isso que ela compra.
          Por isso a frase nova não muda a lista, ela muda quem lê a lista:
          "nenhum deles é seu" transforma quatro tarefas em quatro tarefas
          que saíram do seu dia. E é verdade conferível na própria lista
          logo abaixo, onde o sujeito de todos os quatro é o cliente. */}
      <h2 className={s.h2Duplo}>{t.como.h2}</h2>
      <div className={s.split}>
        <div>
          {/* ---------- a marca da chegada, só no último passo ----------
              A manchete promete "nenhum deles é seu" e a lista prova isso
              sozinha: o sujeito dos quatro passos é o cliente. Mas o lugar
              onde ISSO VIRA VANTAGEM é o quarto, que é quando a coisa
              desemboca no WhatsApp dela. A etiqueta diz essa passagem no
              ponto exato em que ela acontece, em vez de deixar quem lê
              fazer a conta sozinho três parágrafos depois.
              Só no último item, por definição: se aparecesse em todos,
              deixaria de marcar a virada e viraria enfeite de linha. */}
          <ol className={s.steps}>{steps.map((x, i) => <li key={x[0]}>
            <b>0{i + 1}</b>
            <div>
              <h3>{x[0]}{i === steps.length - 1 && <i className={s.chegada}>{t.como.chegada}</i>}</h3>
              <p>{x[1]}</p>
            </div>
          </li>)}</ol>
          {/* no celular o botão não pode vir antes da prova: esta instância
              some e a cópia abaixo do chat assume; no desktop é o contrário */}
          {/* daqui para baixo o formulário mais perto é o da oferta, não o
              do hero: mandar a pessoa subir uma página inteira é pedir para
              ela desistir no caminho */}
          {/* O rótulo era "QUERO UMA ASSIM ↓". Em 23/08 a página passou a
              ter DOIS vocabulários de CTA e só dois: "QUERO MINHA PRÉVIA"
              em tudo que está no fluxo de leitura e nos dois botões de
              envio, e "DEIXAR CONTATO" nas duas superfícies fixas (header
              e barra do celular), que não é escolha de vocabulário e sim
              de largura, como diz a nota lá no QuemFaz.
              Antes disso eram cinco frases para a mesma ação, e nenhuma
              delas aterrissava num botão escrito igual.
              O `data-cta` NÃO muda: como_funciona é a posição no funil, e
              trocar o rótulo não pode reiniciar a série histórica. */}
          <div className={`${s.actions} ${s.hideMobile}`}><a className={`${s.button} ${s.acao}`} href="#contratar" data-cta="como_funciona" data-cta-dest="form">{t.como.cta}</a></div>
        </div>
        <div className={s.howVisual}>
          {/* Captura do catálogo da vérít.lab (verit-lab.vercel.app/pecas),
              que substituiu a grade da PR Grife em 13/08. As duas provam o
              mesmo mecanismo, mas esta tem cara: peça única, numerada,
              fundo escuro, foto na parede de alguém. A da PR Grife eram
              camisas brancas em fundo branco, e catálogo genérico faz o
              leitor pensar em template, que é exatamente o que a página
              inteira jura não ser.
              O corte começa na GRADE, não no topo: o que prova o passo é
              nome, medida e preço na tela. A conta do recorte e as duas
              tentativas descartadas estão em
              scripts/capture-veritlab-catalogo.mjs. */}
          <div className={s.phoneSmall}>
            <Image src="/assets/demo/veritlab-catalogo.jpg" fill sizes="300px" alt={t.como.alt} />
          </div>
          {/* O BALÃO MUDOU JUNTO COM A CAPTURA, e não é detalhe: ele citava
              "polo piquet branca, tamanho M", que era uma peça visível na
              grade da PR Grife. Trocar a imagem e deixar a mensagem falando
              de uma camisa poria o chat a contradizer o aparelho logo acima,
              que é o tipo de descuido que só o leitor atento vê, e é ele
              quem compra.
              Agora a mensagem nomeia uma peça que está na tela, com a
              medida no lugar do tamanho (quadro não tem P/M/G), e a
              resposta usa o argumento que é verdade nesse acervo: peça
              única. "Ainda tem?" deixa de ser pergunta de estoque e vira a
              pergunta certa para uma loja onde vendeu, não volta. */}
          <div className={s.howChat}>
            <ChatStrip label={t.como.tira.label} note={t.como.tira.nota}>
              <Bubble time="19:11">{t.como.balao1}</Bubble>
              {/* ---------- o intervalo dito em voz alta ----------
                  O argumento desta tira é a VELOCIDADE, e ela estava
                  escondida em dois carimbos de hora de 9px que ninguém
                  compara: 19:11 e 19:12. A pílula não inventa nada, só lê
                  em voz alta a diferença entre as duas horas que já
                  estavam ali.
                  Forma de divisória de data do WhatsApp de propósito: é o
                  elemento que o app usa para marcar passagem de tempo, e
                  a tira inteira é feita do material real dele.
                  Fica ENTRE os dois balões porque é onde o tempo passa;
                  na legenda, viraria mais uma frase para ler. */}
              <span className={s.intervalo}>{t.como.intervalo}</span>
              <Bubble out time="19:12" tick="read" delay={700}>{t.como.balao2}</Bubble>
            </ChatStrip>
          </div>
          <div className={`${s.actions} ${s.mobileOnly}`}><a className={`${s.button} ${s.acao}`} href="#contratar" data-cta="como_funciona" data-cta-dest="form">{t.como.cta}</a></div>
        </div>
      </div>
    </div>
  </section>;
}

/* Captura desktop da página inteira de cada site (1440px de largura),
   exibida na tela de um MacBook com scroll automático em loop.
   A duração acompanha a altura da página para o ritmo ser parecido
   (por volta de 250px por segundo nas duas).
   As duas são lojas de clientes no ar. O que separa uma da outra é o
   segmento e a lista de fatos, não uma etiqueta de demonstração:
   prova vaga não convence ninguém. */
/* o que não traduz (capturas, endereços, nomes, ids de CTA) fica aqui; o
   texto de cada card está em t.projetos.itens, na mesma ordem */
const projects = [
  /* a Iconic entrou no lugar da Xavier's em 28/10, a pedido do Rafael: loja
     paga, entregue e no domínio dela. Captura de iconicsneakers.com.br a
     1440px, derivados pelo scripts/webp-assets.mjs */
  { img: "/assets/case-iconic-desk.jpg", w: 1440, h: 6470, dur: "26s", url: "https://iconicsneakers.com.br/", dom: "iconicsneakers.com.br", name: "ICONIC SNEAKERS", ctaId: "case_iconic" },
  /* e a Japa Modas no lugar da PR Grife, no mesmo dia: a loja dos criativos
     do lote 13, no domínio dela. 12.483px a ~250px/s dão os 50s */
  { img: "/assets/case-japa-desk.jpg", w: 1440, h: 12483, dur: "50s", url: "https://www.japamodasurf.com.br/", dom: "japamodasurf.com.br", name: "JAPA MODAS", ctaId: "case_japa" },
];
export function Projects() {
  const t = useVit();
  return <section className={`${s.section} ${s.dark}`} id="projetos">
    <div className={s.wrap}>
      <Eyebrow>{t.projetos.eyebrow}</Eyebrow>
      {/* ---------- a única seção que se pode CONFERIR ----------
          Era "Duas vitrines de clientes, no ar agora.", que é legenda:
          descreve o que tem dentro da seção e não pede nada. Só que esta
          é a única parte da página onde o leitor não precisa acreditar em
          nada, porque pode abrir e usar. A manchete agora diz isso em voz
          alta, e é a mesma regra que rege a página inteira (fato
          conferível, nunca adjetivo) dita no único lugar onde ele pode
          agir sobre ela na hora.
          Convidar a duvidar de mim só funciona porque as duas abrem
          mesmo, com produto e preço reais. Numa página com um único link
          quebrado, esta frase seria a mais cara de todas.
          A linha do test-drive ("você pode navegar por elas inteiras
          antes de decidir") não sumiu: ela virou a manchete. Estava
          enterrada no fim do parágrafo, que é onde ninguém a lia. */}
      <h2 className={s.h2Duplo}>{t.projetos.h2}</h2>
      <p className={`${s.lead} ${s.leadDark}`}>{t.projetos.lead}</p>
      <div className={s.projects}>
        {projects.map((x, i) => { const tx = t.projetos.itens[i]; return <article key={x.name}>
          <div className={s.laptop}>
            <div className={s.lapScreen}>
              <div className={s.browserBar}>
                <span className={s.dots} aria-hidden><i /><i /><i /></span>
                <span className={s.urlChip}>{x.dom}</span>
                {/* o ponto era o caractere "●", parado. Numa seção cuja
                    afirmação inteira é "estas estão no ar AGORA", o sinal
                    de vida ser um glifo morto é a contradição mais cara
                    que a dobra tinha. Agora é o mesmo `<i>` pulsante do
                    chip do aparelho no hero, com o mesmo keyframe: a
                    página já tinha o vocabulário, esta seção é que não
                    estava usando. */}
                <span className={s.live}><i aria-hidden /> {t.projetos.live}</span>
              </div>
              <a className={s.cover} href={x.url} target="_blank" rel="noopener" aria-label={preencher(t.projetos.abrir, { nome: x.name })}>
                {/* O mesmo <picture> da /e-commerce (07/08): os derivados AVIF e
                    WebP já existem versionados (scripts/webp-assets.mjs), e o
                    JPEG cru de ~1MB por captura ficava só aqui. O otimizador do
                    Next continua fora: não lida com capturas de 9 mil pixels.
                    A redução -720 é proporcional, então width/height e o --dur
                    da animação, calibrado pela altura EXIBIDA, seguem valendo.
                    Ordem obrigatória: o navegador pega a primeira source que
                    casa media e type, celular antes de desktop. */}
                <picture>
                  <source media="(max-width: 720px)" type="image/avif" srcSet={x.img.replace(/\.jpg$/, "-720.avif")} />
                  <source media="(max-width: 720px)" type="image/webp" srcSet={x.img.replace(/\.jpg$/, "-720.webp")} />
                  <source type="image/avif" srcSet={x.img.replace(/\.jpg$/, ".avif")} />
                  <source type="image/webp" srcSet={x.img.replace(/\.jpg$/, ".webp")} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={s.pageShot} src={x.img} width={x.w} height={x.h} style={{ "--dur": x.dur } as React.CSSProperties} alt={preencher(t.projetos.alt, { nome: x.name })} loading="lazy" decoding="async" fetchPriority="low" />
                </picture>
              </a>
            </div>
            {/* o `.deck`, que desenhava a base do MacBook com o chanfro do
                trackpad, morava aqui e saiu junto com o resto do notebook.
                O porquê está por extenso em `.lapScreen`, no CSS: a prova
                desta seção é o ENDEREÇO, não o aparelho. */}
          </div>
          <div className={s.projMeta}>
            <small>{tx.tag}</small>
            <span className={s.kind}>{t.projetos.tipo}</span>
          </div>
          <h3>{x.name}</h3>
          <p>{tx.copy}</p>
          <ul className={s.facts}>{tx.fatos.map(f => <li key={f}>{f}</li>)}</ul>
          <a className={`${s.button} ${s.acao}`} href={x.url} target="_blank" rel="noopener" data-cta={x.ctaId} data-cta-dest="case">
            {tx.cta}
          </a>
        </article>; })}
      </div>
      {/* a ponte para o catálogo inteiro: os dois cards acima são a prova
          detalhada, o portfólio é o volume. Link discreto de propósito, para
          não competir com os CTAs verdes dos cards; `data-cta-dest`
          "portfolio" nunca dispara Lead, só ClickCTA. */}
      <Link className={`${s.ghost} ${s.projMore}`} href={t.projetos.portfolioHref} data-cta="projetos_portfolio" data-cta-dest="portfolio">
        {preencher(t.projetos.portfolio, { n: NO_AR })}
      </Link>
    </div>
  </section>;
}

/* Quatro cards resumem a entrega; o detalhe fino (que antes eram nove
   blocos altos, quase três telas no celular) fica a um toque, no acordeão. */
/* as listas moram no dicionário (t.inclui.cards e t.inclui.lista); na
   lista longa, os dois itens de pós-entrega ficam juntos: o painel é o
   que você faz sozinho, a linha seguinte é o que continua passando por mim */
export function Included() {
  const t = useVit();
  const included = t.inclui.cards;
  const includedDetails = t.inclui.lista;
  return <section className={s.section} id="inclui">
    <div className={s.wrap}>
      {/* ---------- a palavra "incluso" era dita três vezes ----------
          Eyebrow "O QUE ESTÁ INCLUSO", manchete "Tudo o que está incluído
          no projeto" e o acordeão "Ver tudo o que está incluído": a mesma
          palavra três vezes na mesma tela, e a manchete gastava o maior
          corpo tipográfico da página repetindo o rótulo logo acima dela.
          Agora cada um tem um trabalho: o eyebrow rotula E amarra a lista
          ao número que o leitor está calculando (o preço aparece uma dobra
          depois, então aqui ele ainda está fazendo a conta de cabeça); a
          manchete diz o argumento; o acordeão diz o que o acordeão faz.

          O ARGUMENTO ESTAVA ESCONDIDO NO SEGUNDO ACORDEÃO. Lendo a lista
          inteira, o trabalho é todo meu: cadastro os 20 produtos, coloco no
          ar, configuro o endereço. O que sobra para a lojista é logo,
          fotos, produtos, preços e categorias, que é exatamente o conteúdo
          do "O que preciso enviar?". A manchete nova diz isso, e o segundo
          acordeão vira a resposta da primeira metade dela: que material?

          O QUE A MANCHETE NÃO PODE DIZER: "sem custo extra". A própria
          lista informa que domínio próprio é anual e pago no registrador,
          que acima de 20 produtos se combina à parte e que atualização
          posterior é orçada. Essa honestidade é ativo da página, e
          manchete que a atropela quebra na primeira leitura do acordeão. */}
      <Eyebrow>{t.inclui.eyebrow}</Eyebrow>
      <h2 className={s.h2Duplo}>{t.inclui.h2}</h2>
      <div className={s.grid}>{included.map(x => <article key={x[0]}><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div>
      <details className={s.accordion}>
        <summary>{t.inclui.listaTitulo}</summary>
        <ul className={s.moreList}>{includedDetails.map(([t, d]) => <li key={t}><b>{t}</b>{d}</li>)}</ul>
      </details>
      <details className={s.accordion}>
        <summary>{t.inclui.enviarTitulo}</summary>
        <ul className={s.check}>{t.inclui.enviar.map(x => <li key={x}>{x}</li>)}</ul>
      </details>
    </div>
  </section>;
}

/* Responde a objeção "quem atualiza isso depois?" com a tela real do painel,
   uma dobra antes do preço, e é o que sustenta o "sem mensalidade" que a
   faixa do hero, o canhoto da etiqueta, o card e a FAQ afirmam: a loja só
   não fica refém se conseguir mexer sozinha. Sem esta seção, "sem
   mensalidade" seria promessa; com ela, é consequência.

   O print é a tela de Produtos do painel da Xavier's filtrada por pronta
   entrega, sem nenhum dado alterado. O dashboard foi descartado porque os
   números reais são três zeros e dois alertas vermelhos, e porque ele mostra
   métrica, não a ação: as colunas Preço, Estoque por tamanho e Status provam
   os três checks um a um, e o subtítulo da própria tela já diz o argumento.

   Fundo escuro pelo mesmo motivo da seção de projetos: o print é claro e
   acende contra o --night, a moldura de browser (.browserBar) já é desenhada
   para fundo escuro, e o bloco corta a sequência clara entre "o que está
   incluso" e a oferta, empurrando o olho para o card de preço.

   Sem CTA de propósito: nenhum data-cta novo, o funil não muda. */
export function Panel() {
  const t = useVit();
  const panelProof = t.painel.provas;
  return <section className={`${s.section} ${s.dark} ${s.panelSec}`} id="painel">
    <div className={s.wrap}>
      {/* ---------- duas colunas em vez de empilhado (13/08) ----------
          O print ocupava 960px de largura embaixo do texto, e a seção
          virava a mais alta da página por causa de uma imagem que só
          precisa ser reconhecida, não lida linha por linha: ninguém vai
          conferir o estoque da Xavier's aqui, a pessoa precisa ver que
          existe um painel de verdade com a cara da loja dela.
          Ao lado do argumento ele continua reconhecível e a seção encolhe
          quase pela metade. O texto é a coluna estreita porque é ele que
          tem limite de leitura; o print fica com a larga. */}
      <div className={s.painelGrid}>
        <div>
          {/* o eyebrow era "DEPOIS DA ENTREGA", e lido em sequência com a
              manchete dava "depois da entrega / depois de publicada". A
              manchete é a melhor linha desta página e não se toca; quem sai é
              o rótulo, que ainda por cima repetia o "quando" que ela já diz.
              "O PAINEL DA LOJA" é o mesmo texto do chip na barra do navegador
              ao lado, então o rótulo e o print passam a se confirmar. */}
          <Eyebrow>{t.painel.eyebrow}</Eyebrow>
          <h2 className={s.h2Duplo}>{t.painel.h2}</h2>
          <p className={`${s.lead} ${s.leadDark}`}>{t.painel.lead}</p>
          <ul className={s.check}>{panelProof.map(x => <li key={x}>{x}</li>)}</ul>
          {/* ---------- "OBRIGATÓRIA" ERA UMA CONTRADIÇÃO ----------
              A frase dizia "Sem mensalidade obrigatória: a estrutura é sua", e
              o adjetivo abria uma porta que a página fecha em todo lugar: o
              canhoto da etiqueta diz R$0 DE MENSALIDADE, seco, e o card da
              oferta também. "Obrigatória" faz o leitor perguntar em que caso
              ela passa a ser cobrada, e a resposta é NENHUM: não existe plano
              mensal à venda aqui. O adjetivo é resto de quando existia.
              A segunda metade também saiu: "a estrutura é sua" repetia a
              manchete três blocos acima ("a vitrine é sua") com uma palavra
              pior. No lugar entrou o motivo de não haver mensalidade, que é o
              que fecha a objeção de verdade: o painel não é um serviço
              cobrado à parte, é parte do que ela já pagou.
              O que continua fora daqui, de propósito: domínio próprio é
              anual e pago no registrador, e isso é dito no acordeão da
              `Included`, que é onde o leitor está comparando escopo. Era "a
              dobra anterior" até 23/08, quando esta seção desceu para
              depois da `Offer` e a comparação de escopo ficou três blocos
              acima.
              O ROSA vai só em "Sem mensalidade", que é o fato que fecha a
              objeção mais cara desta dobra. Ele é a única cor de acento da
              seção, e marca uma coisa só. */}
          <p className={s.panelClaim}>{t.painel.claim}</p>
        </div>
        <figure className={s.panelShot}>
        <div className={s.panelScreen}>
          <div className={s.browserBar}>
            <span className={s.dots} aria-hidden><i /><i /><i /></span>
            <span className={s.urlChip}>xavier-s-sports.vercel.app/admin</span>
            <span className={s.live}>{t.painel.chip}</span>
          </div>
          <div className={s.panelFrame}>
            <Image src="/assets/demo/xavier-painel.jpg" fill sizes="(max-width: 900px) 100vw, 960px" alt={t.painel.alt} />
          </div>
        </div>
          <figcaption className={s.panelNote}>{t.painel.legenda}</figcaption>
        </figure>
      </div>
    </div>
  </section>;
}

export function Offer() {
  const t = useVit();
  const lang = useLang();
  const offerItems = t.oferta.itens;
  /* Inversão de 04/08, decidida com dados: na primeira campanha 23 pessoas
     leram a página inteira, 4 tocaram no formulário, ZERO enviaram e zero
     conversas chegaram. O primeiro pedido da página a um desconhecido era um
     compromisso de R$500, e o caminho de conversar estava rebaixado a link
     fantasma (zero cliques). Agora o convite principal é a conversa, que é
     onde uma venda de R$999 fecha de verdade, e a entrada menor vira o
     atalho de quem já decidiu. O preço continua inteiro à vista de todos:
     esconder valor filtra menos e piora a conversa.
     O pagamento à vista segue como opção dentro do formulário, escolhida
     depois que a pessoa já decidiu contratar. */
  const [avista, setAvista] = useState(false);
  /* o @ que a rota não achou na Meta (10/09), igual ao mini-formulário do hero */
  const [instaInvalido, setInstaInvalido] = useState("");
  /* o campo do @ recebeu telefone ou e-mail (12/09): dito na hora, sem ir à rota */
  const [instaDiag, setInstaDiag] = useState<DiagnosticoArroba | null>(null);
  /* quantas vezes a Meta recusou o @ nesta sessão: na segunda, a mensagem muda */
  const [recusas, setRecusas] = useState(0);
  /* a loja que a Meta encontrou, mostrada na confirmação */
  const [loja, setLoja] = useState<LojaEncontrada | null>(null);
  const [linkWa, setLinkWa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [telInvalido, setTelInvalido] = useState(false);
  const [emailInvalido, setEmailInvalido] = useState(false);
  const envioSuspeito = useGuardaDeFormulario();
  const formRef = useRef<HTMLFormElement>(null);
  /* ---------- a entrada voltou para R$500, os 50% (28/10/2026) ----------
     Decisão do Rafael, com o histórico abaixo à vista: o argumento de
     20/08 era que R$500 espera o fim do mês e o lead esfria ali. Se o
     Contact ou o fechamento caírem depois desta troca, é o primeiro
     suspeito. Os números moram em lib/oferta.ts.

     ---------- a entrada caiu de R$500 para R$199 (20/08) ----------
     O TOTAL NÃO MUDOU, e não é para mudar: R$999 é o número que separa
     esta página de agência, e "sem mensalidade" é o argumento mais
     repetido do site (canhoto da etiqueta, cabeçalho do card, FAQ), então
     trocar o preço fechado por uma parcela mensal desmentiria a própria
     página no lugar onde ela é mais forte.
     O que trava a lojista não é o total, é o PRIMEIRO valor: ela não
     decide "tenho R$999?", decide "tenho R$500 hoje?". R$199 é decisão de
     impulso para quem fatura com loja; R$500 espera o fim do mês, e o fim
     do mês é onde o lead esfria. O saldo passa a caber em 4x, e o Pix à
     vista ganha 10% de desconto: é a única forma de pagamento que não me
     custa taxa de parcelamento, então é a que precisa ter motivo.
     Custo conhecido da mudança: entrada baixa filtra menos, então a
     desistência DEPOIS do sim tende a subir. A defesa continua sendo a
     mesma e já está escrita na FAQ e no `includedDetails`: os 7 dias úteis
     só começam quando o material da loja chega.
     Este texto vai inteiro para a coluna `plano` do Supabase e para a
     mensagem do WhatsApp (ver pages/api/lead.js). É texto livre, nada
     ramifica nele, mas é o que eu leio para saber o que combinar. */
  const plan = avista && t.oferta.plano.avista ? t.oferta.plano.avista : t.oferta.plano.parcelado;
  /* O foco continua: depois de um salto dentro da página, deixar o foco no
     botão que ficou para trás quebra a navegação por teclado e por leitor de
     tela. O que mudou é ele passar pelo `focarSemContar`, senão este clique
     no CTA vira um "tocou no formulário" que ninguém tocou. */
  function goToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    focarSemContar(formRef.current?.elements.namedItem("nome") as HTMLInputElement | null);
  }
  /* ---------- o envio, invertido em 06/08 (igual à /e-commerce) ----------
     As regras inteiras (Lead antes, gravação antes de navegar, WhatsApp só
     como fallback) moram em lead-flow.ts desde 07/08, compartilhadas com o
     mini-formulário do hero. Aqui fica só o estado de tela.

     O botão de envio continua sem data-cta: quem dispara o Lead deste
     caminho é este submit, e não o ouvinte de cliques, senão o mesmo envio
     contaria duas vezes. */
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;              // toque duplo não grava duas linhas
    /* mesmas guardas do mini-formulário do hero, na mesma ordem: campos
       lidos antes de trocar a tela, envio suspeito gravado em vez de
       descartado, e telefone inválido não virando evento */
    const f = new FormData(e.currentTarget);
    const suspeito = envioSuspeito(e.currentTarget);
    if (suspeito) {
      registrarSuspeito({
        nome: String(f.get("nome") || ""),
        whatsapp: String(f.get("whatsapp") || ""),
        email: String(f.get("email") || ""),
        instagram: String(f.get("instagram") || ""),
        plano: plan,
        motivo: suspeito,
        lang,
      });
      setEnviado(true);
      return;
    }
    /* no en o e-mail é obrigatório e o telefone, se vier, é internacional
       (components/telefone-intl.ts); no pt a régua brasileira de sempre */
    if (lang === "en") {
      if (!emailValido(String(f.get("email") || ""))) { setEmailInvalido(true); return; }
      const tel = String(f.get("whatsapp") || "");
      if (tel.trim() && !telefoneInternacionalValido(tel)) { setTelInvalido(true); return; }
    } else if (!whatsappValido(String(f.get("whatsapp") || ""))) { setTelInvalido(true); return; }
    /* telefone ou e-mail no campo do @ nem vai à rota (ver ErroArroba) */
    const diag = diagnosticoDoArroba(String(f.get("instagram") || ""));
    if (diag) { setInstaDiag(diag); return; }
    setEnviando(true);
    const { salvo, linkWa: link, arrobaInvalido, loja: lojaAchada } = await enviarLeadVitrine({
      nome: String(f.get("nome") || ""),
      whatsapp: String(f.get("whatsapp") || ""),
      email: String(f.get("email") || ""),
      instagram: String(f.get("instagram") || ""),
      plano: plan,
      ctaPosition: "form",
      lang,
    });
    setEnviando(false);
    /* o @ não existe na Meta: o campo volta para a pessoa (mesma regra do
       mini-formulário do hero) */
    if (arrobaInvalido) { setInstaInvalido(String(f.get("instagram") || "")); setRecusas(n => n + 1); return; }
    setLoja(lojaAchada);
    /* guardado nos dois caminhos: serve à confirmação e ao "Falta um toque" */
    setLinkWa(link);
    if (salvo) setEnviado(true);
  }
  return <section className={`${s.section} ${s.offer}`} id="oferta">
    <div className={s.wrap}>
      <Eyebrow>{t.oferta.eyebrow}</Eyebrow>
      <h2>{t.oferta.h2}</h2>
      {/* Abria com "Estrutura pronta para transformar visita do Instagram
          em pedido no WhatsApp": "estrutura" é palavra de quem constrói, e
          "transformar visita em pedido" é jargão de marketing, os dois
          fora da voz de uma página que fala em foto, preço e tamanho.
          Pior: descrevia o produto de novo, do zero, para alguém que
          acabou de rolar por duas lojas abertas e por um painel real. A
          frase nova aponta para essa prova em vez de repetir a descrição,
          e é o jeito mais curto de responder "o que exatamente eu compro":
          aquilo que você acabou de abrir. A segunda frase não mudou, é
          onde as condições de pagamento moram. */}
      <p className={s.lead}>{t.oferta.lead}</p>
      {/* prova antes do preço: fato verificável, sem citação inventada. Quando
          existir depoimento de cliente, ele entra aqui no lugar desta linha. */}
      <p className={s.proof}><b>{t.oferta.prova.rotulo}</b> {t.oferta.prova.texto}<a href="#projetos" data-cta="oferta_projetos" data-cta-dest="projetos">{t.oferta.prova.link}</a></p>
      <div className={s.offerGrid}>
        <article className={s.pricecard}>
          {/* ---------- o "sem mensalidade" subiu para o topo ----------
              Ele ocupava uma faixa inteira entre as condições e a lista, e
              gastava ~50px de altura para dizer duas palavras. Aqui em cima
              ele faz par com o rótulo do produto e a faixa superior do card
              passa a ter dois elementos em vez de um. E o lugar é melhor
              pelo argumento também: ele é uma qualidade do PREÇO, então
              pertence à linha do preço, não ao meio da lista de escopo. */}
          <div className={s.priceHead}>
            <small>{t.oferta.produto}</small>
            {/* o mesmo "obrigatória" que saiu do fecho da seção do painel:
                a faixa do hero, o canhoto da etiqueta e a FAQ ("Existe
                mensalidade?" → "Não") afirmam sem adjetivo, e o hedge só
                fazia o leitor procurar a pegadinha. */}
            <p className={s.nomensal}>{t.oferta.semMensal}</p>
          </div>
          {/* mesma anatomia da etiqueta do hero: moeda e centavos pequenos e
              alçados à altura de maiúscula, inteiro enorme no meio. Os dois
              maiores números da página estavam escritos de jeitos
              diferentes, e é o MESMO preço. */}
          {/* ---------- o número grande virou a ENTRADA (28/08) ----------
              O card abria com R$999 em corpo 108, e esse é o número que
              afasta: quem chega do anúncio ouviu "você só paga se gostar" e
              a primeira coisa que a seção do preço mostrava era o total
              inteiro, sem dizer que ele não é cobrado de uma vez nem agora.
              A informação que decide o próximo passo é quanto custa
              COMEÇAR, e ela estava em corpo 21, dentro de uma das duas
              portas, competindo com o Pix ao lado.

              O que NÃO muda é a regra de 20/08, que vale para esta peça
              tanto quanto para a etiqueta do hero: "anunciar a entrada e
              calar o total é isca". Por isso o R$999 não virou letra
              miúda nem desceu para a lista: ele fica na linha seguinte, na
              mesma condensada dos números das portas, colado no 199. Quem
              lê o primeiro lê o segundo no mesmo movimento do olho.

              A coluna PARCELADO perdeu a linha da entrada porque ela subiu
              para cá: repetir "R$199,00 para começar" a 60px de distância
              do 199 gigante gastaria a porta com um eco. O "+" que abre a
              coluna agora soma contra o número grande, que é exatamente o
              que ele sempre quis dizer. */}
          <div className={s.price}><i>{t.oferta.preco.moeda}</i><strong>{t.oferta.preco.inteiro}</strong><i>{t.oferta.preco.centavos}</i><b>{t.oferta.preco.rotulo}</b></div>
          <p className={s.priceTotal}><strong>{t.oferta.total.valor}</strong>{t.oferta.total.sufixo}</p>
          {/* AS DUAS PORTAS DO BALCÃO: eram três linhas de mono do mesmo
              corpo e da mesma tinta, uma embaixo da outra, e a terceira (o
              Pix) lia como rodapé das duas primeiras quando é a ALTERNATIVA
              a elas. Ver o bloco de mesmo nome no CSS. */}
          <div className={s.pagamento}>
            <div>
              <small>{t.oferta.parcelado.rotulo}</small>
              <p><em>+</em>{t.oferta.parcelado.antes}<strong>{t.oferta.parcelado.valor}</strong>{t.oferta.parcelado.depois}</p>
              <i>{t.oferta.parcelado.nota}</i>
            </div>
            {/* a segunda porta: o Pix no pt; no en, como se paga (por e-mail) */}
            {t.oferta.avista && <div>
              <small>{t.oferta.avista.rotulo}<b>{t.oferta.avista.selo}</b></small>
              <p><strong>{t.oferta.avista.valor}</strong>{t.oferta.avista.depois}</p>
              <i>{t.oferta.avista.nota}</i>
            </div>}
          </div>
          {/* nove itens em DUAS COLUNAS: em uma só eles somavam ~330px e
              faziam do card a peça mais alta da página, com o botão saindo
              de qualquer tela. Item de escopo tem três a cinco palavras e
              não precisa da largura do card inteiro. */}
          <ul className={`${s.check} ${s.checkDuplo}`}>{offerItems.map(x => <li key={x}>{x}</li>)}</ul>
          {/* UM botão, não dois (13/08). O card tinha "VER COMO FICA" abrindo
              o WhatsApp e "JÁ DECIDI: RESERVAR" rolando até o formulário:
              com o WhatsApp fora, os dois passariam a fazer a mesma coisa, e
              duas portas para o mesmo lugar só adiam a decisão. */}
          {/* ---------- o botão parou de prometer uma reserva ----------
              Dizia "QUERO RESERVAR A MINHA ↓", e reservar é um ato: trava
              vaga, cobra entrada. O formulário lá embaixo não faz nenhum
              dos dois, ele grava nome e WhatsApp e eu chamo. A prova de
              que o rótulo estava errado é que a tela de confirmação
              precisava DESMENTIR ele ("sua reserva não foi cobrada"):
              quando a microcopy existe para desfazer a expectativa que o
              botão criou, quem muda é o botão.
              As condições de pagamento continuam logo acima, no corpo do
              card, onde são informação e não promessa de ato.
              O `data-cta` NÃO muda: oferta_entrada é a posição no funil, e
              trocar o rótulo não pode reiniciar a série histórica. */}
          {/* e em 23/08 virou "QUERO MINHA PRÉVIA ↓", junto com os outros
              três da página. A razão de cima continua valendo: o rótulo
              não pode prometer um ato que o formulário não pratica. Este
              não promete, ele nomeia o que a pessoa GANHA, e a garantia
              logo abaixo continua respondendo a mesma pergunta. */}
          <Button onClick={goToForm} cta="oferta_entrada">{t.oferta.cta}</Button>
          <p className={s.guarantee}>{t.oferta.garantia}</p>
        </article>
        <div className={s.formCol}>
          <ChatStrip label={t.oferta.tira.label}>
            <Bubble out time={t.oferta.tira.hora} tick="read">{t.oferta.tira.balao}</Bubble>
          </ChatStrip>
          {/* ---------- a confirmação, quando o lead está gravado ----------
              Ocupa o lugar do formulário. Estado do React, sem navegação e sem
              pop-up, então aparece igual no navegador interno do Instagram,
              que é onde o fluxo antigo quebrava calado. */}
          {enviado ? <div className={`${s.form} ${s.confirmado}`} role="status">
            <p className={s.formTitle}>{t.form.okTitulo}<br /><span>{t.form.okSub}</span></p>
            <LojaAchada loja={loja} />
            {/* A segunda frase era "Sua reserva não foi cobrada: nada é
                pago antes de a gente combinar os detalhes", e ela existia
                para consertar o susto que o botão "QUERO RESERVAR" dava.
                Com o botão dizendo a verdade e o formulário avisando
                "nada é cobrado agora" ANTES do envio, ela virou a negação
                de uma coisa que ninguém prometeu, e negação assim planta
                a dúvida em quem não tinha. */}
            <p>{t.oferta.okTexto}</p>
            <ReabrirCta href={linkWa} rotulo={t.form.okCta} />
          </div> : <form ref={formRef} onSubmit={submit} className={s.form} id="contratar">
            {/* mesma correção do botão do card: o título dizia "RESERVAR
                MINHA VITRINE" e a linha abaixo dele anunciava uma entrada,
                o que faz o formulário parecer um checkout. Ele não é.
                "Quando a gente combinar" é o que estava faltando: a
                condição continua dita, mas com o momento dela junto, e a
                segunda frase fecha a porta da dúvida antes de o dedo
                chegar no primeiro campo. */}
            <p className={s.formTitle}>{t.oferta.formTitulo}<br /><span>{t.oferta.formSub}</span></p>
            <label>{t.form.nome}<input name="nome" autoComplete="name" required /></label>
            {/* O campo que esta página nunca teve. Ver a nota longa no submit:
                sem número não dá para cumprir a promessa da tela de
                confirmação, e era o handoff que carregava essa informação. */}
            {/* ---------- o contato, por idioma (11/09/2026) ----------
                pt: o WhatsApp com a máscara brasileira. en: o e-mail obrigatório
                e o telefone opcional, internacional, sem máscara. */}
            {lang === "en"
              ? <>
                <label>{t.form.email}<input name="email" type="email" inputMode="email" autoComplete="email" placeholder={t.form.emailPh} required
                       onInput={() => { if (emailInvalido) setEmailInvalido(false); }} /></label>
                {emailInvalido && <small role="alert" style={{ color: "#b3261e" }}>{t.form.errEmail}</small>}
                <label>{t.form.telefone}<input name="whatsapp" type="tel" autoComplete="tel" placeholder={t.form.telefonePh} maxLength={24}
                       onInput={() => { if (telInvalido) setTelInvalido(false); }} /></label>
                {telInvalido && <small role="alert" style={{ color: "#b3261e" }}>{t.form.errTel}</small>}
              </>
              : <>
                <label>{t.form.whatsapp}<input name="whatsapp" type="tel" autoComplete="tel" placeholder={t.form.whatsappPh} required maxLength={16}
                       onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); if (telInvalido) setTelInvalido(false); }} /></label>
                {telInvalido && <small role="alert" style={{ color: "#b3261e" }}>{t.form.errTel}</small>}
              </>}
            <CampoIsca />
            {/* "NOME DA LOJA" saiu: o @ do instagram já entrega o nome, e eram
                dois campos obrigatórios para uma informação só. O que sobrou
                virou opcional, porque nome e telefone bastam para eu chamar. */}
            <label>{t.oferta.insta}<input name="instagram" placeholder={t.oferta.instaPh} required autoCapitalize="off" autoCorrect="off" spellCheck={false}
                   onInput={() => { if (instaInvalido) setInstaInvalido(""); if (instaDiag) setInstaDiag(null); }} /></label>
            <ErroArroba arroba={instaInvalido} diag={instaDiag} recusas={recusas} />
            {/* a caixa do Pix existe só onde há Pix (pt) */}
            {t.oferta.avistaCheck && <label className={s.avista}>
              <input type="checkbox" name="avista" checked={avista} onChange={e => setAvista(e.target.checked)} />
              {t.oferta.avistaCheck}
            </label>}
            {/* sem a seta ↗: o envio agora acontece na própria tela. Rosa
                porque é um dos três lugares da página que a cor dos 10%
                ocupa, e os três são a mesma ação. */}
            {/* o mesmo rótulo do botão de envio da etiqueta do hero, e de
                propósito: os dois formulários fazem exatamente a mesma
                coisa (gravam o contato e eu chamo), então chamar um de
                "reservar" e o outro de "quero minha vitrine" era inventar
                uma diferença que não existe. Uma ação, um nome. */}
            <button className={`${s.button} ${s.acao}`} disabled={enviando}>
              {enviando ? t.form.enviando : t.form.enviar}
            </button>
            {/* Antes daqui saía "Tudo certo. Abrindo o WhatsApp…", que dizia à
                pessoa que estava feito quando não estava: a mensagem abre
                pronta mas não enviada, e sem tocar em enviar nada chega.
                Agora o passo que falta é dito com todas as letras, e o botão
                cobre o caso de a abertura falhar, e o de quem voltou do
                WhatsApp sem enviar. O clique tem data-cta próprio para dar
                para medir quantas pessoas precisam dele, e `reabrir_whats`
                está na lista de exceção do Lead: quem chega aqui já disparou
                o Lead do formulário segundos antes. */}
            {linkWa
              ? <Pendente href={linkWa} />
              : <p className={s.micro} role="status">{t.oferta.micro}</p>}
          </form>}
        </div>
      </div>
    </div>
  </section>;
}

/* Os quatro passos falavam a língua de uma agência, que é o contrário do
   que a página vende três dobras acima:
   - "briefing" saiu. A dobra do que está incluso acabou de dizer "você
     manda o material" e listar logo, fotos, produtos, preços e categorias.
     Duas palavras para a mesma coisa, e a pior delas é a que só quem
     trabalha com isso usa.
   - "estrutura" saiu do passo 02 pelo mesmo motivo que saiu do parágrafo
     da oferta: é palavra de quem constrói, não de quem compra. No lugar
     entrou o trio do Quem Faz ("desenho, desenvolvo e publico"), que é a
     mesma pessoa dizendo a mesma coisa em dois lugares da página.
   - "a página entra no ar" virou "a vitrine entra no ar": a coisa vendida
     tem UM nome nesta página, e não é "página". */
/* A PRÉVIA ENTROU COMO PASSO 01 (26/08), e ela não é um passo a mais: é
   o novo começo. O processo abria em "Reserva: você paga R$199", ou seja,
   a primeira coisa que a pessoa lia depois de decidir era um boleto. Com
   a oferta nova o dinheiro sai do primeiro marco e vai para o segundo,
   atrás de um "gostou?".
   Aprovação e publicação viraram UM marco para a lista continuar com
   quatro: o percurso do CSS tem quatro marcos ligados pelo fio, e cinco
   quebram o desenho. Não se perdeu conteúdo, as duas frases estão
   inteiras dentro do mesmo passo. */
export function Process() {
  const t = useVit();
  const process = t.processo.passos;
  return <section className={`${s.section} ${s.dark}`}>
    <div className={s.wrap}>
      {/* "PROCESSO E SEGURANÇA" prometia uma metade que a seção não
          entrega: a única coisa de "segurança" aqui é o selo do
          processador de pagamento, que fala do meio e não do risco dela.
          O rótulo novo diz o que os quatro passos abaixo realmente são,
          que é o percurso do sim até a loja funcionando. */}
      <Eyebrow>{t.processo.eyebrow}</Eyebrow>
      {/* ---------- a garantia dita como gente ----------
          Era "Você acompanha o projeto antes de concluir o pagamento".
          "Concluir o pagamento" é frase de tela de checkout, e "acompanha
          o projeto" é vago: acompanha como, vendo o quê?
          O que de fato acontece é melhor do que a versão burocrática: ela
          vê a loja PRONTA, e só então paga o resto. São R$199 e R$800, ou
          seja, 80% do valor fica retido até ela aprovar, e isso é a
          resposta para a única pergunta que sobra nesta altura da página
          ("e se eu pagar e não gostar?").
          Cuidado ao mexer nisto: NÃO existe política de reembolso escrita,
          então a frase pode dizer o que fica retido, e não pode prometer
          devolução do que já foi pago. */}
      <h2>{t.processo.h2}</h2>
      {/* ---------- o processo também é percurso (13/08) ----------
          Eram quatro células de uma tabela com filete em volta, e o
          conteúdo é uma SEQUÊNCIA no tempo: reserva, criação, aprovação,
          publicação, nessa ordem e sem pular etapa. A página já resolveu
          isso uma vez, nos quatro passos do Como Funciona, e a solução
          vale de novo: marcos ligados por um fio.
          Usar o mesmo dispositivo duas vezes aqui é SISTEMA, não
          repetição: a regra passa a ser "sequência desta página é
          percurso com marcos ligados", e ela agora vale nos dois únicos
          lugares onde existe sequência.
          O `<div>` em volta do título e da descrição existe para o marco
          poder ficar ao lado deles quando o percurso vira vertical no
          celular, exatamente como nos passos. */}
      <ol className={s.process}>{process.map((x, i) => <li key={x[0]}>
        <b>0{i + 1}</b>
        <div><h3>{x[0]}</h3><p>{x[1]}</p></div>
      </li>)}</ol>
      <div className={s.trust}>
        <span className={s.badge}>{t.processo.selo}</span>
        <Link className={s.ghost} href={t.processo.termosHref}>{t.processo.termos}</Link>
      </div>
    </div>
  </section>;
}

/* ---------- o FAQ em duas colunas (28/10, pedido do Rafael) ----------
   A manchete que contava os "não" ("Três destas respostas começam com não")
   pedia conta para ser entendida, e as etiquetas em caixinha mono liam como
   carimbo; saíram as duas, e o "Não." continua no começo de cada resposta,
   que é onde convence. À esquerda o título e a saída para o WhatsApp (presa
   enquanto a lista rola); à direita a lista, em corpo menor. A resposta
   abre deslizando e o + gira para virar x. As perguntas moram no
   dicionário (t.faq.itens); o campo `nao` ficou sem uso. */
export function FAQ() {
  const t = useVit();
  const lang = useLang();
  const d = t.faq.duvida;
  const ajuda = lang === "en" ? linkEmail(d.msg) : linkWhatsApp(d.msg);
  return <section className={`${s.section} ${s.faqSecao}`} id="faq">
    <div className={s.faqGrade}>
      <div className={s.faqLado}>
        <h2>{t.faq.titulo}</h2>
        <p>{d.texto} <a href={ajuda} target={lang === "en" ? undefined : "_blank"} rel="noopener" data-cta="faq_duvida" data-cta-dest={lang === "en" ? "email" : "whatsapp"}>{d.link}</a></p>
      </div>
      <div className={`${s.faq} ${s.faqLista}`}>{t.faq.itens.map(({ p: pergunta, r: resposta }) => <details key={pergunta}>
        <summary><span className={s.faqPergunta}>{pergunta}</span></summary>
        <div className={s.faqResposta}><p>{resposta}</p></div>
      </details>)}</div>
    </div>
  </section>;
}

/* Dentro da oferta a pílula sumia atrás do argumento: ela cobria a
   microcopy do formulário e oferecia um terceiro caminho bem na hora de
   decidir. Some enquanto a oferta está na tela. */
/* O `useInOffer` morava aqui e existia só para esconder a pill flutuante
   dentro da seção da oferta. A pill saiu em 13/08 com os outros CTAs de
   WhatsApp, e o hook foi junto. A barra fixa do celular tem observador
   próprio, dentro do MobileBar. */
export function FinalCTA() {
  const t = useVit();
  return <>
    <section id="fim" className={`${s.section} ${s.dark} ${s.final}`}>
      <Eyebrow>{t.fim.eyebrow}</Eyebrow>
      {/* nona e última manchete a entrar na régua de duas larguras, e a
          quebra é o que faltava para ela funcionar: "vender melhor." vinha
          colada no fim da terceira linha, com o mesmo corpo do preparo, e
          a frase inteira chegava como um bloco só. É a promessa que a
          página inteira sustenta, e ela merecia a batida. */}
      <h2 className={s.h2Duplo}>{t.fim.h2}</h2>
      {/* quem chega aqui leu a página inteira: o pedido pode ser o cheio,
          sem rodeio, e o caminho é o mesmo formulário de sempre */}
      <p className={s.lead}>{t.fim.lead}</p>
      <div className={s.actions}>
        {/* "DEIXAR MEU CONTATO ↑" em 23/08: último dos quatro a entrar no
            vocabulário único. Quem leu a página inteira chega aqui e o
            botão diz a mesma coisa que o do topo e que o de envio. */}
        <a className={`${s.button} ${s.acao}`} href="#contratar" data-cta="final" data-cta-dest="form">{t.fim.cta}</a>
        <a className={s.ghost} href="#oferta" data-cta="final_reserva" data-cta-dest="oferta">{t.fim.ghost}</a>
      </div>
    </section>
    <footer className={s.footer}>
      <div className={s.brand}><b>{t.marca.nome}</b><span>{t.marca.sufixo}</span></div>
      <nav>{t.rodape.links.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
      <small>{t.rodape.copyright}</small>
    </footer>
  </>;
}

/* Barra fixa do celular: entra depois de uma tela de rolagem e some dentro
   da oferta, enquanto a pessoa digita, e no CTA final, para não cobrir o
   formulário nem apertar o rodapé, onde o botão já está na tela.

   ---------- por que uma distância e não o hero (06/08) ----------
   O gatilho era um IntersectionObserver em #topo: enquanto o hero estivesse
   visível, a barra ficava fora. Só que o hero no celular é alto (manchete,
   lead, CTA, microcopy, os quatro checks, o aparelho de 430px, a legenda e o
   balão), então "passou do hero" acontecia lá pelos 1200px de rolagem. A
   barra chegava tarde demais numa página em que a maioria decide antes.
   Agora o gatilho é a distância rolada, que é o que se queria medir desde o
   começo: uma tela cheia é sinal de interesse suficiente para oferecer o
   atalho, e cai perto da demonstração em vez de depois dela.

   Listener de scroll e não um IntersectionObserver porque não há elemento a
   observar: o gatilho é uma distância, e fabricar uma âncora invisível a
   0,85 de tela só para poder observá-la seria dar a volta no problema. Os
   observers de #oferta e #fim continuam sendo observers, que é o caso deles.

   Sem requestAnimationFrame para coalescer, diferente da /e-commerce: lá o
   handler chama getBoundingClientRect, que força layout e precisa mesmo de
   um quadro. Aqui a conta é scrollY contra innerHeight, duas leituras que
   não tocam no layout, então o rAF só adicionaria uma dependência de pintura
   para o estado ficar correto. Com a aba ociosa ou o navegador estrangulado,
   o quadro não vem e a barra congela no estado errado, que foi exatamente o
   que apareceu ao testar a primeira versão desta função. */
const ROLAGEM_PARA_BARRA = 0.85;   // frações de uma tela
export function MobileBar() {
  const t = useVit();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const offer = document.getElementById("oferta");
    const end = document.getElementById("fim");
    let focused = false, inOffer = false, inEnd = false, cedo = true;
    const update = () => setHidden(focused || inOffer || inEnd || cedo);
    /* desde 28/10 a pílula entra quando o botão do hero passa para cima da
       tela, a mesma regra do botão do topo no desktop (`useCtaDoTopo`): os
       dois juntos na primeira tela disputariam o olho com a mesma frase.
       Sem o botão do hero, vale a regra antiga das 0,85 telas. */
    const ctaHero = document.querySelector('[data-cta="hero_abrir"]');
    const heroIO = ctaHero && new IntersectionObserver(([x]) => { cedo = x.isIntersecting || x.boundingClientRect.top > 0; update(); });
    if (ctaHero && heroIO) heroIO.observe(ctaHero);
    const onFocus = (e: FocusEvent) => { focused = !!(e.target as HTMLElement)?.closest?.("form"); update(); };
    const onBlur = () => { focused = false; update(); };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    const medir = () => {
      if (ctaHero) return;
      const passou = window.scrollY > window.innerHeight * ROLAGEM_PARA_BARRA;
      if (passou !== cedo) return;   // cedo é o inverso de passou: nada mudou
      cedo = !passou;
      update();
    };
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir, { passive: true });
    medir();   // quem volta do WhatsApp reabre a página já rolada
    const offerIO = offer && new IntersectionObserver(([x]) => { inOffer = x.isIntersecting; update(); }, { rootMargin: "-30% 0px" });
    if (offer && offerIO) offerIO.observe(offer);
    const endIO = end && new IntersectionObserver(([x]) => { inEnd = x.isIntersecting; update(); }, { rootMargin: "-10% 0px" });
    if (end && endIO) endIO.observe(end);
    return () => { document.removeEventListener("focusin", onFocus); document.removeEventListener("focusout", onBlur); window.removeEventListener("scroll", medir); window.removeEventListener("resize", medir); offerIO?.disconnect(); endIO?.disconnect(); heroIO?.disconnect(); };
  }, []);
  /* a barra passa a levar o preço no lugar do prazo: ela é a única peça que
     acompanha a pessoa a página inteira, e "pronta em 7 dias" já é um dos
     quatro checks do hero. O prazo informa; o preço decide. */
  /* ---------- o botão que mais vazava (13/08) ----------
     Esta barra era o CTA de WhatsApp mais clicado da página: seis dos sete
     cliques de saída de 12-13/08 saíram daqui, e nenhuma mensagem chegou.
     Ela era eficiente no que fazia, e o que fazia era tirar gente da
     página. Agora leva ao formulário da oferta, que é o Contact pelo qual
     a campanha otimiza; a barra some assim que a pessoa chega lá.

     Rosa porque é a terceira e última superfície dos 10% da paleta: sobre
     grafite, é a única coisa desta barra que o olho precisa achar. */
  /* ---------- só a pílula, flutuando (28/10, pedido do Rafael) ----------
     A faixa com "GRÁTIS / Sua vitrine criada" (e depois "Prévia em 24h / sem
     custo") dividia o olho em duas metades, e o texto pequeno repetia o que
     a página já disse. Agora é só o botão, na largura da tela, solto acima
     da borda; o equivalente no celular do botão do topo, que some ali. */
  return <div className={`${s.bar} ${hidden ? s.barHidden : ""}`}>
    {/* "#hero-form" desde 28/10: o "#contratar" (o formulário da oferta antiga)
        não existe mais nesta página, e o toque na barra não fazia NADA */}
    <a className={`${s.button} ${s.acao}`} href="#hero-form" data-cta="sticky_mobile" data-cta-dest="form">{t.barra.cta}</a>
  </div>;
}
