"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import s from "@/app/vitrine-digital/vitrine.module.css";
import { initTracking, refDaVisita, trackLead } from "@/components/vitrine/tracking";

const ZAP = "https://wa.me/5544999997219?text=";
const MSG_DUVIDAS = "Olá, Rafael! Conheci a Vitrine Digital e gostaria de tirar dúvidas.";
/* a mensagem do caminho principal da oferta pede a demonstração, não tira
   dúvida: o convite da página é "quero ver para a minha loja", e a mensagem
   precisa continuar essa frase, senão a conversa começa desalinhada */
const MSG_VER = "Olá, Rafael! Quero ver como a Vitrine Digital ficaria para a minha loja.";

/* A mensagem do WhatsApp leva o código da visita no fim. Quando a venda
   fechar, esse código vai junto no registro em /api/venda-fechada, e a Meta
   amarra a compra à visita exata que veio do anúncio.
   Só depois da montagem: no servidor não existe localStorage, então o
   primeiro render usa o link puro e o código entra logo em seguida. Sem isso
   o HTML gerado no build carregaria o código de quem buildou. */
function useWhatsapp(msg: string = MSG_DUVIDAS) {
  const [href, setHref] = useState(ZAP + encodeURIComponent(msg));
  useEffect(() => {
    const ref = refDaVisita();
    if (ref) setHref(ZAP + encodeURIComponent(`${msg}\n\nRef: ${ref}`));
  }, [msg]);
  return href;
}

export function Analytics() { useEffect(() => { initTracking(); }, []); return null; }

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
function Bubble({ out = false, time, tick, delay = 0, children }: { out?: boolean; time: string; tick?: "sent" | "read"; delay?: number; children: React.ReactNode }) {
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

const ChatStrip = ({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) =>
  <div className={s.chatStrip}>
    <small className={s.stripLabel}>{label}</small>
    {children}
    {note && <small className={s.stripNote}>{note}</small>}
  </div>;

/* Navegação enxuta: só os passos desta oferta. Serviços e E-commerce saem
   do topo e continuam no rodapé, para o tráfego pago não ter porta de saída. */
export function Header() {
  const [open, setOpen] = useState(false);
  return <header className={s.header}>
    <Link className={s.brand} href="/estudio/"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></Link>
    <button className={s.menu} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "FECHAR" : "MENU"}</button>
    <nav className={open ? s.open : ""} onClick={() => setOpen(false)}>
      <a href="#como">COMO FUNCIONA</a>
      <a href="#projetos">PROJETOS</a>
      <a href="#inclui">O QUE INCLUI</a>
      <a href="#faq">DÚVIDAS</a>
      <a className={s.navcta} href="#oferta" data-cta="nav">CONTRATAR ↗</a>
    </nav>
  </header>;
}

/* Demonstração no mockup do hero — vídeo real gravado na vitrine da Xavier's,
   com legendas por passo: catálogo → pronta entrega → produto (Brasil Home
   2026) → escolhe o tamanho → pedido pronto no WhatsApp. Gerado pelo script
   scripts/record-xavier-hero.mjs. Com reduced-motion ativo, mostra um frame
   estático limpo da página do produto. */
/* O vídeo tem 1,2 MB e vinha com preload="auto": o navegador baixava ele
   inteiro, imediatamente, disputando banda com as fontes e com a imagem, antes
   de a pessoa ver qualquer coisa. Era 72% do peso da página. Com 38% dos
   cliques do anúncio se perdendo antes de a página abrir, isso sai caro.

   Agora a primeira carga leva só o quadro estático, otimizado pelo next/image
   no tamanho real do aparelho (o `sizes` importa: sem ele o Next servia uma
   versão de 1920px para uma tela de 300px). O vídeo entra no DOM só depois do
   evento `load`, quando nada mais está competindo, e só fica visível quando já
   tem quadro para mostrar, então não há piscada preta nem espera em branco.
   A imagem fica embaixo o tempo todo, o vídeo aparece por cima.

   Com "reduzir movimento" ligado o vídeo nunca chega a ser montado. */
function VitrineDemo() {
  const [montar, setMontar] = useState(false);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ligar = () => setMontar(true);
    if (document.readyState === "complete") { ligar(); return; }
    window.addEventListener("load", ligar, { once: true });
    return () => window.removeEventListener("load", ligar);
  }, []);
  return <div className={s.screen}>
    <Image className={s.shot} src="/assets/demo/xavier-hero-still.jpg" width={780} height={1688} sizes="300px" priority alt="" />
    {montar && <video
      className={s.demoVideo} src="/assets/demo/xavier-hero.mp4"
      autoPlay muted loop playsInline preload="auto"
      style={{ opacity: visivel ? 1 : 0 }}
      onCanPlay={() => setVisivel(true)}
    />}
  </div>;
}

/* O hero tinha quatro camadas dizendo a mesma coisa: manchete, segunda
   frase repetindo a promessa, lead listando as features e os pontos
   listando as features de novo. Agora cada peça tem um trabalho só e não
   se repete: a manchete promete, o lead entrega o resultado, os pontos
   listam o que vem no projeto. O que sobrou de fato (preço cheio, prazo,
   quantidade de produtos) já é dito na oferta, então saiu daqui.
   O ganho real é de espaço: a demonstração era o argumento mais forte da
   página e começava fora da primeira dobra no celular. */
const heroPoints = ["Design personalizado", "Catálogo organizado", "WhatsApp integrado", "Pronta em 7 dias úteis"];

/* ---------- coerência com o anúncio ----------
   O c1-direct fecha prometendo "vitrine digital pronta em 7 dias úteis,
   R$999, saldo só depois de você aprovar". Quem clicava caía numa manchete
   diferente ("seus produtos em um link só"), e no primeiro fim de semana
   63% do tráfego de Facebook e Instagram não rolou a primeira dobra.
   O teste: quem chega do c1 vê a manchete continuar a promessa do anúncio,
   e "um link só" desce para a lista de pontos, trocando de lugar com o
   prazo. Nada disso precisa de flag para medir: todo evento da Mixpanel
   já sai com utm_content, então a leitura é comparar o coorte do c1 antes
   e depois desta mudança entrar no ar.
   O estado começa falso e vira no mount porque o HTML é gerado no build,
   onde não existe query string: no servidor todo mundo é a versão padrão. */
const AD_C1_DIRECT = "120250180921710201";
const heroPointsC1 = ["Design personalizado", "Catálogo organizado", "WhatsApp integrado", "Seus produtos em um link só"];
function useVeioDoC1() {
  const [veio, setVeio] = useState(false);
  useEffect(() => {
    try { setVeio(new URLSearchParams(location.search).get("utm_content") === AD_C1_DIRECT); } catch {}
  }, []);
  return veio;
}

export function Hero() {
  const c1 = useVeioDoC1();
  return <section className={s.hero} id="topo">
    <div className={s.heroGrid}>
      <div className={s.heroCopy}>
        <Eyebrow>VITRINE DIGITAL PARA LOJAS DE INSTAGRAM</Eyebrow>
        <h1>{c1 ? <>SUA VITRINE PRONTA EM <em>7 DIAS ÚTEIS.</em></> : <>SEUS PRODUTOS EM <em>UM LINK SÓ.</em></>}</h1>
        <p className={s.lead}>O cliente escolhe sozinho e chega no seu WhatsApp com o pedido pronto.</p>
        <div className={s.actions}>
          <Button href="#oferta" cta="hero">RESERVAR POR R$500 ↗</Button>
        </div>
        <small className={s.micro}>Total de R$999 · o saldo só após você aprovar</small>
      </div>
      <div className={s.heroVisual}>
        <div className={s.phone} role="img" aria-label="Demonstração da vitrine da Xavier's Sports: o cliente filtra por pronta entrega, abre a camisa Brasil Home 2026, escolhe o tamanho e envia o pedido pelo WhatsApp já preenchido">
          <VitrineDemo />
        </div>
        {/* a legenda do mockup e o antigo link "ver uma vitrine funcionando"
            diziam a mesma coisa em dois lugares. Viraram um elemento só: a
            bolinha marca que a vitrine está no ar, o nome diz de quem é, e o
            próprio rótulo leva para a seção onde ela aparece inteira. */}
        <a className={s.demoTag} href="#projetos" data-cta="hero_projetos" data-cta-dest="projetos">
          <b aria-hidden>●</b> NO AR: XAVIER&apos;S SPORTS · VER INTEIRA ↓
        </a>
      </div>
      {/* os pontos entram no próprio grid do hero: no desktop viram uma
          coluna estreita ao lado da demonstração, encostada na margem
          direita da página, e no celular voltam a ser a faixa embaixo */}
      <ul className={s.heroPoints}>{(c1 ? heroPointsC1 : heroPoints).map(x => <li key={x}>{x}</li>)}</ul>
    </div>
  </section>;
}

/* As quatro perguntas de sempre viram os próprios balões: o argumento é
   ver quatro mensagens verdes seguidas com o confere cinza, sem resposta. */
const questions: [string, string, number][] = [
  ["oi! quanto custa a camisa do story?", "19:02", 0],
  ["tem em outro modelo?", "19:03", 500],
  ["quais tamanhos vocês têm?", "19:05", 1000],
  ["consegue mandar as fotos de novo? não achei no feed", "19:07", 1500],
];
export function PainSolution() {
  return <section className={s.section}>
    <div className={s.wrap}>
      <div className={s.split}>
        <div>
          <Eyebrow>O PROBLEMA E A SOLUÇÃO</Eyebrow>
          {/* quebra combinada: "quantas vendas sua loja perde" / "porque o
              cliente não encontrou o produto?" — só em coluna dupla; no
              celular o span volta a fluir com o texto */}
          <h2>Quantas vendas sua loja perde <span className={s.h2Line}>porque o cliente não encontrou o produto?</span></h2>
          <p className={s.lead}>Quando os produtos ficam espalhados entre stories, destaques e publicações antigas, o cliente precisa perguntar tudo antes de decidir. Cada atendimento começa do zero: foto, preço e tamanho, um por um. E muitas vezes ele desiste antes mesmo de chamar.</p>
          <div className={s.shiftAfter}>
            <small>COM A VITRINE</small>
            <p>O cliente encontra os produtos, escolhe o que quer e chama sua loja pelo WhatsApp com o pedido já identificado.</p>
          </div>
        </div>
        <div className={s.shift}>
          <ChatStrip label="HOJE · O CLIENTE ESPERANDO NO DIRECT" note="Quatro perguntas antes de escolher qualquer coisa. Visualizado só às 21:40, e a vontade de comprar não espera duas horas.">
            {questions.map(([text, time, delay]) => <Bubble key={time} out time={time} tick="sent" delay={delay}>{text}</Bubble>)}
          </ChatStrip>
        </div>
      </div>
      {/* três batidas: no celular cada frase é um bloco (nada de palavra
          órfã entre frases); no desktop os spans fluem como sempre */}
      <p className={s.manifesto}><span>O INSTAGRAM APRESENTA.</span> <span>A VITRINE <em>ORGANIZA.</em></span> <span>O WHATSAPP FECHA.</span></p>
    </div>
  </section>;
}

const steps = [
  ["O cliente acessa o link da bio", "Um endereço fixo, sempre atualizado, no lugar mais visto do seu perfil."],
  ["Navega pelas categorias", "Produtos agrupados do jeito que a sua loja vende."],
  ["Visualiza o produto", "Fotos, preço, tamanhos e disponibilidade em uma página só."],
  ["Chama a loja pelo WhatsApp", "A mensagem já chega com o produto escolhido."],
];
export function HowItWorks() {
  return <section className={s.section} id="como">
    <div className={s.wrap}>
      <Eyebrow>COMO FUNCIONA</Eyebrow>
      <h2>Do Instagram ao pedido em quatro passos.</h2>
      <div className={s.split}>
        <div>
          <ol className={s.steps}>{steps.map((x, i) => <li key={x[0]}><b>0{i + 1}</b><div><h3>{x[0]}</h3><p>{x[1]}</p></div></li>)}</ol>
          {/* no celular o botão não pode vir antes da prova: esta instância
              some e a cópia abaixo do chat assume; no desktop é o contrário */}
          <div className={`${s.actions} ${s.hideMobile}`}><Button href="#oferta" cta="como_funciona">RESERVAR POR R$500 ↗</Button></div>
        </div>
        <div className={s.howVisual}>
          {/* captura do catálogo da PR Grife, loja de cliente no ar. O corte
              começa na grade de produtos: o que prova o passo é preço, tamanho
              e botão de pedir na tela, não a barra de navegação. */}
          <div className={s.phoneSmall}>
            <Image src="/assets/demo/prgrife-catalogo.jpg" fill sizes="300px" alt="Catálogo da vitrine da PR Grife com a grade de produtos, preços e botão de pedir" />
          </div>
          <div className={s.howChat}>
            <ChatStrip label="COM A VITRINE · O PEDIDO CHEGA PRONTO" note="A mesma noite, sem uma foto sequer no direct: o cliente escolheu sozinho.">
              <Bubble time="19:11">escolhi pela vitrine: polo piquet branca, tamanho M. ainda tem?</Bubble>
              <Bubble out time="19:12" tick="read" delay={700}>tem sim! separei a sua, te mando o Pix</Bubble>
            </ChatStrip>
          </div>
          <div className={`${s.actions} ${s.mobileOnly}`}><Button href="#oferta" cta="como_funciona">RESERVAR POR R$500 ↗</Button></div>
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
const projects = [
  {
    img: "/assets/case-xavier-desk.jpg", w: 1440, h: 8965, dur: "36s",
    url: "https://xavier-s-sports.vercel.app/", dom: "xavier-s-sports.vercel.app",
    name: "XAVIER'S SPORTS", tag: "CAMISAS ESPORTIVAS",
    copy: "Vitrine no ar, navegável agora. Abra pelo celular e faça o caminho que o cliente faz.",
    facts: ["Catálogo por clubes e seleções", "Página para cada produto", "Controle de pronta entrega", "Pedido direto no WhatsApp"],
    cta: "ABRIR A VITRINE DA XAVIER'S ↗", ctaId: "case_xavier",
  },
  {
    img: "/assets/case-prgrife-desk.jpg", w: 1440, h: 5559, dur: "22s",
    url: "https://pr-grife.vercel.app/", dom: "pr-grife.vercel.app",
    name: "PR GRIFE", tag: "MULTIMARCAS DE ALTO PADRÃO",
    copy: "Loja com ponto físico em Maringá. Entreguei a vitrine e o painel: o dono publica peça e ajusta o estoque sozinho.",
    facts: ["Catálogo por marca e categoria", "Página para cada produto", "Painel de estoque para o dono", "Pedido com forma de pagamento escolhida"],
    cta: "ABRIR A VITRINE DA PR GRIFE ↗", ctaId: "case_prgrife",
  },
];
export function Projects() {
  return <section className={`${s.section} ${s.dark}`} id="projetos">
    <div className={s.wrap}>
      <Eyebrow>PROJETOS NO AR</Eyebrow>
      <h2>Duas vitrines de clientes, no ar agora.</h2>
      <p className={`${s.lead} ${s.leadDark}`}>A Xavier&apos;s Sports vende camisas esportivas. A PR Grife é multimarcas e tem loja física em Maringá. As duas estão publicadas e você pode navegar por elas inteiras antes de decidir qualquer coisa.</p>
      <div className={s.projects}>
        {projects.map(x => <article key={x.name}>
          <div className={s.laptop}>
            <div className={s.lapScreen}>
              <div className={s.browserBar}>
                <span className={s.dots} aria-hidden><i /><i /><i /></span>
                <span className={s.urlChip}>{x.dom}</span>
                <span className={s.live}>● NO AR</span>
              </div>
              <a className={s.cover} href={x.url} target="_blank" rel="noopener" aria-label={`Abrir o site do projeto ${x.name} em nova aba`}>
                {/* img simples: o otimizador de imagem não lida bem com capturas de 10 mil pixels */}
                <img className={s.pageShot} src={x.img} width={x.w} height={x.h} style={{ "--dur": x.dur } as React.CSSProperties} alt={`Página completa da vitrine da ${x.name}`} loading="lazy" decoding="async" />
              </a>
            </div>
            <div className={s.deck} aria-hidden />
          </div>
          <div className={s.projMeta}>
            <small>{x.tag}</small>
            <span className={s.kind}>LOJA DE CLIENTE</span>
          </div>
          <h3>{x.name}</h3>
          <p>{x.copy}</p>
          <ul className={s.facts}>{x.facts.map(f => <li key={f}>{f}</li>)}</ul>
          <a className={`${s.button} ${s.primary}`} href={x.url} target="_blank" rel="noopener" data-cta={x.ctaId} data-cta-dest="case">
            {x.cta}
          </a>
        </article>)}
      </div>
    </div>
  </section>;
}

/* Quatro cards resumem a entrega; o detalhe fino (que antes eram nove
   blocos altos, quase três telas no celular) fica a um toque, no acordeão. */
const included = [
  ["Design personalizado", "Visual alinhado à identidade da sua loja, não um modelo pronto."],
  ["Catálogo e produtos", "Página inicial, categorias e até 20 produtos cadastrados por mim."],
  ["WhatsApp integrado", "O pedido chega com o produto já identificado."],
  ["Publicação completa", "Vitrine no ar, endereço configurado e uma rodada de ajustes."],
];
const includedDetails = [
  ["Até 20 produtos", "Eu cadastro todos no lançamento. Acima disso, combinamos à parte."],
  ["Domínio e endereço", "Coloco a vitrine no ar. O domínio próprio é opcional, anual e pago direto no registrador."],
  ["Páginas de produto", "Fotos, descrição, preço, tamanhos e variações em uma página só."],
  ["Uma rodada de ajustes", "Você revisa e aponta as correções antes de a página entrar no ar."],
  ["Entrega em até 7 dias úteis", "Contados a partir do envio de todos os materiais da loja."],
  /* os dois itens de pós-entrega ficam juntos: o painel é o que você faz
     sozinho, a linha seguinte é o que continua passando por mim */
  ["Painel de gestão", "Na identidade da sua loja: produtos, preços, fotos, estoque e disponibilidade."],
  ["Atualizações quando precisar", "Você pede alterações pontuais depois e eu orço na hora. Nada é obrigatório."],
];
export function Included() {
  return <section className={s.section} id="inclui">
    <div className={s.wrap}>
      <Eyebrow>O QUE ESTÁ INCLUSO</Eyebrow>
      <h2>Tudo o que está incluído no projeto.</h2>
      <div className={s.grid}>{included.map(x => <article key={x[0]}><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div>
      <details className={s.accordion}>
        <summary>Ver tudo o que está incluído</summary>
        <ul className={s.moreList}>{includedDetails.map(([t, d]) => <li key={t}><b>{t}</b>{d}</li>)}</ul>
      </details>
      <details className={s.accordion}>
        <summary>O que preciso enviar?</summary>
        <ul className={s.check}>{["Logo", "Fotos", "Produtos", "Preços", "Categorias", "Informações da loja"].map(x => <li key={x}>{x}</li>)}</ul>
      </details>
    </div>
  </section>;
}

/* Responde a objeção "quem atualiza isso depois?" com a tela real do painel,
   uma dobra antes do preço, e é o que sustenta o "sem mensalidade obrigatória"
   do card: a loja só não fica refém se conseguir mexer sozinha.

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
const panelProof = [
  "Troca preço, foto e descrição na hora",
  "Marca esgotado, últimas unidades ou pronta entrega",
  "Cadastra produto novo e ele entra na vitrine na mesma hora",
];
export function Panel() {
  return <section className={`${s.section} ${s.dark} ${s.panelSec}`} id="painel">
    <div className={s.wrap}>
      <Eyebrow>DEPOIS DA ENTREGA</Eyebrow>
      <h2>Depois de publicada, a vitrine é sua.</h2>
      <p className={`${s.lead} ${s.leadDark}`}>Junto com a vitrine, você recebe um painel de gestão na identidade da sua loja. Atualizar não depende de programador, nem de mim.</p>
      <ul className={s.check}>{panelProof.map(x => <li key={x}>{x}</li>)}</ul>
      {/* a sombra deslocada mora na moldura, não no figure: com ela no figure
          a mancha clara passava por baixo da legenda também */}
      <figure className={s.panelShot}>
        <div className={s.panelScreen}>
          <div className={s.browserBar}>
            <span className={s.dots} aria-hidden><i /><i /><i /></span>
            <span className={s.urlChip}>xavier-s-sports.vercel.app/admin</span>
            <span className={s.live}>● PAINEL DA LOJA</span>
          </div>
          <div className={s.panelFrame}>
            <Image src="/assets/demo/xavier-painel.jpg" fill sizes="(max-width: 900px) 100vw, 960px" alt="Tela de produtos e estoque do painel da Xavier's Sports: cada camisa com foto, preço, estoque por tamanho e status de pronta entrega" />
          </div>
        </div>
        <figcaption className={s.panelNote}>Painel real da Xavier&apos;s Sports. Cada loja recebe o seu, na própria identidade.</figcaption>
      </figure>
      <p className={s.panelClaim}>Sem mensalidade obrigatória: a estrutura é sua.</p>
    </div>
  </section>;
}

const offerItems = ["Design personalizado", "Página inicial e catálogo", "Páginas de produto", "WhatsApp integrado", "Até 20 produtos cadastrados", "Painel de gestão da loja", "Publicação e endereço configurado", "Uma rodada de ajustes", "Entrega em até 7 dias úteis"];
export function Offer() {
  /* Inversão de 04/08, decidida com dados: na primeira campanha 23 pessoas
     leram a página inteira, 4 tocaram no formulário, ZERO enviaram e zero
     conversas chegaram. O primeiro pedido da página a um desconhecido era um
     compromisso de R$500, e o caminho de conversar estava rebaixado a link
     fantasma (zero cliques). Agora o convite principal é a conversa, que é
     onde uma venda de R$999 fecha de verdade, e a reserva por R$500 vira o
     atalho de quem já decidiu. O preço continua inteiro à vista de todos:
     esconder valor filtra menos e piora a conversa.
     O pagamento à vista segue como opção dentro do formulário, escolhida
     depois que a pessoa já decidiu contratar. */
  const [avista, setAvista] = useState(false);
  const [linkWa, setLinkWa] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const waVer = useWhatsapp(MSG_VER);
  const plan = avista ? "À vista R$999" : "Entrada de R$500";
  function goToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    (formRef.current?.elements.namedItem("nome") as HTMLInputElement | null)?.focus({ preventScroll: true });
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    /* Sem campo de telefone: a mensagem sai do WhatsApp da própria pessoa,
       então pedir o número é fricção para uma informação que já chega junto.
       O nome vai para a Conversions API porque sem telefone e sem e-mail ele
       é uma das poucas chaves de casamento que sobram (o servidor pega só o
       primeiro nome e hasheia; nada em texto puro sai daqui).
       O botão CONTINUAR NO WHATSAPP não tem data-cta de propósito: quem
       dispara o Lead deste caminho é este submit, e não o ouvinte de cliques,
       senão o mesmo envio contaria duas vezes. */
    /* "form" não é um rótulo qualquer: é o valor que o tracking usa para saber
       que este caminho é contratação, e o único que chega na Mixpanel. */
    trackLead({ ctaPosition: "form", plano: plan, nome: String(f.get("nome") || "") });
    /* O código da visita fecha a mensagem. Ao registrar a venda em
       /api/venda-fechada, ele vai no campo `ref` e a Meta amarra a compra à
       visita que veio do anúncio. Fica na última linha para ser fácil de
       copiar e para não atrapalhar a leitura do pedido. */
    const ref = refDaVisita();
    const text = encodeURIComponent(`Olá, Rafael! Quero contratar a Vitrine Digital.\nNome: ${f.get("nome")}\nLoja: ${f.get("loja")}\nInstagram: ${f.get("instagram")}\nPlano: ${plan}${ref ? `\nRef: ${ref}` : ""}`);
    const link = `https://wa.me/5544999997219?text=${text}`;
    /* Guardar o link é o conserto do vazamento. Enviar o formulário NÃO manda
       mensagem nenhuma: o WhatsApp abre com o texto pronto e a pessoa ainda
       precisa tocar em enviar. Se o pop-up for bloqueado, e no navegador
       interno do Instagram isso acontece, ela ficava numa tela dizendo "tudo
       certo" sem nada ter acontecido. Agora o link fica na tela como saída. */
    setLinkWa(link);
    window.open(link, "_blank", "noopener");
  }
  return <section className={`${s.section} ${s.offer}`} id="oferta">
    <div className={s.wrap}>
      <Eyebrow>OFERTA E CONTRATAÇÃO</Eyebrow>
      <h2>Vitrine digital completa por <em>R$999.</em></h2>
      <p className={s.lead}>Estrutura pronta para transformar visita do Instagram em pedido no WhatsApp. Você reserva com R$500, acompanha o desenvolvimento e só paga o saldo depois de aprovar.</p>
      {/* prova antes do preço: fato verificável, sem citação inventada. Quando
          existir depoimento de cliente, ele entra aqui no lugar desta linha. */}
      <p className={s.proof}><b>PROVA NO AR</b> A PR Grife, multimarcas com loja física em Maringá, publica peça e ajusta o estoque sozinha no painel. <a href="#projetos" data-cta="oferta_projetos" data-cta-dest="projetos">Veja a loja dela acima.</a></p>
      <div className={s.offerGrid}>
        <article className={s.pricecard}>
          <small>VITRINE DIGITAL</small>
          <div className={s.price}>R$<strong>999</strong></div>
          <p className={s.installments}><b>R$500 PARA RESERVAR</b><br />R$499 APÓS A SUA APROVAÇÃO</p>
          <p className={s.nomensal}>SEM MENSALIDADE OBRIGATÓRIA</p>
          <ul className={s.check}>{offerItems.map(x => <li key={x}>{x}</li>)}</ul>
          {/* o convite principal custa zero para quem está do outro lado; a
              reserva vira o atalho de quem já decidiu. `oferta_ver` é um
              data-cta NOVO de propósito: o antigo `oferta_whats` era o link
              fantasma de dúvidas, e reaproveitar o id misturaria na leitura
              dois botões com papéis diferentes. Botão de link cru em vez do
              componente Button porque o WhatsApp precisa de target _blank,
              que o Button não tem. */}
          <a className={`${s.button} ${s.primary}`} href={waVer} target="_blank" rel="noopener" data-cta="oferta_ver" data-cta-dest="whatsapp">VER COMO FICA PARA A MINHA LOJA ↗</a>
          <Button outline onClick={goToForm} cta="oferta_entrada">JÁ DECIDI: RESERVAR POR R$500</Button>
          <p className={s.guarantee}>O saldo de R$499 é pago somente depois que você visualizar e aprovar o projeto.</p>
        </article>
        <div className={s.formCol}>
          <ChatStrip label="SUA PRÓXIMA MENSAGEM">
            <Bubble out time="19:15" tick="read">Rafael, quero uma vitrine dessas pra minha loja</Bubble>
          </ChatStrip>
          <form ref={formRef} onSubmit={submit} className={s.form} id="contratar">
            <p className={s.formTitle}>RESERVAR MINHA VITRINE<br /><span>Entrada de R$500. O saldo só depois da sua aprovação.</span></p>
            <label>NOME<input name="nome" autoComplete="name" required /></label>
            <label>NOME DA LOJA<input name="loja" required /></label>
            <label>INSTAGRAM<input name="instagram" placeholder="@sualoja" required /></label>
            <label className={s.avista}>
              <input type="checkbox" name="avista" checked={avista} onChange={e => setAvista(e.target.checked)} />
              Prefiro pagar os R$999 à vista
            </label>
            <button className={`${s.button} ${s.primary}`}>CONTINUAR NO WHATSAPP ↗</button>
            {/* Antes daqui saía "Tudo certo. Abrindo o WhatsApp…", que dizia à
                pessoa que estava feito quando não estava: a mensagem abre
                pronta mas não enviada, e sem tocar em enviar nada chega.
                Agora o passo que falta é dito com todas as letras, e o botão
                cobre o caso do pop-up bloqueado, comum no navegador do
                Instagram. O clique tem data-cta próprio para dar para medir
                quantas pessoas precisam dele. */}
            {linkWa
              ? <div className={s.pendente} role="status">
                  <b>Falta um toque.</b>
                  <p>Abri o WhatsApp com sua mensagem pronta. Toque em <b>enviar</b> lá para eu receber, senão ela não chega.</p>
                  <a className={`${s.button} ${s.primary}`} href={linkWa} target="_blank" rel="noopener" data-cta="reabrir_whats" data-cta-dest="whatsapp">
                    ABRIR O WHATSAPP ↗
                  </a>
                </div>
              : <p className={s.micro} role="status">Ao continuar, você confirma os detalhes comigo no WhatsApp. Não peço dados de cartão nesta etapa.</p>}
          </form>
        </div>
      </div>
    </div>
  </section>;
}

const process = [
  ["Reserva", "Você paga R$500 e envia o briefing da loja."],
  ["Criação", "Eu desenvolvo a estrutura, o design e o catálogo."],
  ["Aprovação", "Você revisa a vitrine pronta e pede a rodada de ajustes."],
  ["Publicação", "Depois da sua aprovação e do saldo, a página entra no ar."],
];
export function Process() {
  return <section className={`${s.section} ${s.dark}`}>
    <div className={s.wrap}>
      <Eyebrow>PROCESSO E SEGURANÇA</Eyebrow>
      <h2>Você acompanha o projeto antes de concluir o pagamento.</h2>
      <ol className={s.process}>{process.map((x, i) => <li key={x[0]}><b>0{i + 1}</b><h3>{x[0]}</h3><p>{x[1]}</p></li>)}</ol>
      <div className={s.trust}>
        <span className={s.badge}>✓ PAGAMENTO PROCESSADO EM AMBIENTE SEGURO</span>
        <Link className={s.ghost} href="/termos">VER ESCOPO E TERMOS</Link>
      </div>
    </div>
  </section>;
}

const faq = [
  ["A vitrine recebe pagamentos dos meus clientes?", "Não. A vitrine organiza o catálogo e leva o pedido pronto para o WhatsApp da loja, onde você combina pagamento e entrega."],
  ["Quantos produtos estão incluídos?", "Até 20 produtos no cadastro inicial, todos cadastrados por mim. Novos cadastros podem ser combinados depois."],
  ["Existe mensalidade?", "Não. O projeto custa R$999 uma única vez. Um domínio próprio é opcional e tem custo anual pago direto no registrador."],
  ["Quem atualiza a vitrine depois?", "Você mesmo, pelo painel que acompanha a vitrine: troca preço e foto, marca esgotado ou pronta entrega e cadastra produtos novos."],
  ["Quanto tempo demora?", "Até 7 dias úteis depois do envio de todos os materiais da loja."],
  ["Preciso pagar tudo antes?", "Não. São R$500 para reservar e R$499 somente depois da apresentação e da sua aprovação do projeto."],
];
export function FAQ() {
  return <section className={s.section} id="faq">
    <div className={s.wrap}>
      <Eyebrow>DÚVIDAS FREQUENTES</Eyebrow>
      <h2>Antes de contratar.</h2>
      <div className={s.faq}>{faq.map(x => <details key={x[0]}><summary>{x[0]}</summary><p>{x[1]}</p></details>)}</div>
    </div>
  </section>;
}

/* Dentro da oferta a pílula sumia atrás do argumento: ela cobria a
   microcopy do formulário e oferecia um terceiro caminho bem na hora de
   decidir. Some enquanto a oferta está na tela. */
function useInOffer() {
  const [inOffer, setInOffer] = useState(false);
  useEffect(() => {
    const offer = document.getElementById("oferta");
    if (!offer) return;
    const io = new IntersectionObserver(([x]) => setInOffer(x.isIntersecting), { rootMargin: "-20% 0px" });
    io.observe(offer);
    return () => io.disconnect();
  }, []);
  return inOffer;
}

export function FinalCTA() {
  const inOffer = useInOffer();
  const waHref = useWhatsapp();
  return <>
    <section id="fim" className={`${s.section} ${s.dark} ${s.final}`}>
      <Eyebrow>AGENDA ABERTA</Eyebrow>
      <h2>Sua loja já tem produtos. Agora precisa de uma estrutura para <em>vender melhor.</em></h2>
      <p className={s.lead}>Reserve a sua vitrine com R$500, acompanhe o projeto e pague o saldo só depois de aprovar.</p>
      <div className={s.actions}>
        <Button href="#oferta" cta="final">RESERVAR POR R$500 ↗</Button>
        <a className={s.ghost} href={waHref} target="_blank" rel="noopener" data-cta="final_whats" data-cta-dest="whatsapp">FALAR COM RAFAEL</a>
      </div>
    </section>
    <footer className={s.footer}>
      <div className={s.brand}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav><Link href="/estudio/">INÍCIO</Link><Link href="/servicos">SERVIÇOS</Link><Link href="/e-commerce">E-COMMERCE</Link><Link href="/termos">TERMOS</Link><Link href="/privacidade">PRIVACIDADE</Link></nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
    </footer>
    <a className={`${s.pill} ${inOffer ? s.pillHidden : ""}`} href={waHref} target="_blank" rel="noopener" data-cta="pill" data-cta-dest="whatsapp">FALAR COM RAFAEL ↗</a>
  </>;
}

/* Barra fixa do celular: entra depois que a pessoa passa do hero e some
   dentro da oferta, enquanto ela digita, e no CTA final, para não cobrir o
   formulário nem apertar o rodapé, onde o botão já está na tela. */
export function MobileBar() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const hero = document.getElementById("topo");
    const offer = document.getElementById("oferta");
    const end = document.getElementById("fim");
    let focused = false, inOffer = false, inHero = !!hero, inEnd = false;
    const update = () => setHidden(focused || inOffer || inHero || inEnd);
    const onFocus = (e: FocusEvent) => { focused = !!(e.target as HTMLElement)?.closest?.("form"); update(); };
    const onBlur = () => { focused = false; update(); };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    const heroIO = hero && new IntersectionObserver(([x]) => { inHero = x.isIntersecting; update(); }, { rootMargin: "-15% 0px" });
    if (hero && heroIO) heroIO.observe(hero);
    const offerIO = offer && new IntersectionObserver(([x]) => { inOffer = x.isIntersecting; update(); }, { rootMargin: "-30% 0px" });
    if (offer && offerIO) offerIO.observe(offer);
    const endIO = end && new IntersectionObserver(([x]) => { inEnd = x.isIntersecting; update(); }, { rootMargin: "-10% 0px" });
    if (end && endIO) endIO.observe(end);
    return () => { document.removeEventListener("focusin", onFocus); document.removeEventListener("focusout", onBlur); heroIO?.disconnect(); offerIO?.disconnect(); endIO?.disconnect(); };
  }, []);
  return <div className={`${s.bar} ${hidden ? s.barHidden : ""}`}>
    <span className={s.barCopy}><b>R$500 PARA RESERVAR</b><span>Saldo só após você aprovar</span></span>
    <a className={`${s.button} ${s.primary}`} href="#oferta" data-cta="sticky_mobile">RESERVAR</a>
  </div>;
}
