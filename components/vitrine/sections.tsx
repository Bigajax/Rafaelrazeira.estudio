"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import s from "@/app/vitrine-digital/vitrine.module.css";
import { initTracking, trackLead } from "@/components/vitrine/tracking";

const whatsapp = "https://wa.me/5544999997219?text=Ol%C3%A1%2C%20Rafael!%20Conheci%20a%20Vitrine%20Digital%20e%20gostaria%20de%20tirar%20d%C3%BAvidas.";

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

/* Demonstração no mockup do hero — vídeo real gravado na vitrine da Xavier's:
   catálogo rolando → produto → tamanho M escolhido → pedido no WhatsApp.
   Com reduced-motion ativo, mostra um frame estático da página do produto. */
function VitrineDemo() {
  const [video, setVideo] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setVideo(false);
  }, []);
  return <div className={s.screen}>
    {video
      ? <video className={s.demoVideo} src="/assets/demo/xavier-demo.mp4" autoPlay muted loop playsInline preload="auto" poster="/assets/demo/xavier-produto.jpg" />
      : <Image className={s.shot} src="/assets/demo/xavier-produto.jpg" width={500} height={1600} alt="" />}
  </div>;
}

const heroPoints = ["Design personalizado", "Catálogo organizado", "WhatsApp integrado", "Feita para celular"];
export function Hero() {
  return <section className={s.hero} id="topo">
    <div className={s.heroGrid}>
      <div className={s.heroCopy}>
        <Eyebrow>● VITRINE DIGITAL PARA LOJAS QUE VENDEM PELO INSTAGRAM</Eyebrow>
        <h1>SEUS PRODUTOS EM <em>UM ÚNICO LINK.</em><span className={s.h1sub}>CLIENTES MAIS DECIDIDOS NO WHATSAPP.</span></h1>
        {/* a segunda frase repetia a promessa do próprio título e custava
            duas linhas no celular, empurrando a demonstração para longe */}
        <p className={s.lead}>Eu crio uma vitrine personalizada para sua loja: catálogo organizado, páginas de produto e pedido direto pelo WhatsApp.</p>
        <div className={s.actions}>
          <Button href="#oferta" cta="hero">RESERVAR MINHA VITRINE · R$500 ↗</Button>
          <a className={s.ghost} href="#projetos" data-cta="hero_projetos" data-cta-dest="projetos">VER UMA VITRINE FUNCIONANDO ↓</a>
        </div>
        <small className={s.micro}>Total de R$999 · saldo de R$499 só após a sua aprovação · até 20 produtos · entrega em até 7 dias úteis</small>
      </div>
      <div className={s.heroVisual}>
        <div className={s.phone} role="img" aria-label="Demonstração da vitrine da Xavier's Sports: o cliente navega no catálogo, abre a camisa Brasil Retrô 2004, escolhe o tamanho M e envia o pedido pelo WhatsApp">
          <VitrineDemo />
        </div>
        <small className={s.demoTag}>VITRINE NO AR · XAVIER&apos;S SPORTS</small>
      </div>
    </div>
    <ul className={s.heroPoints}>{heroPoints.map(x => <li key={x}>{x}</li>)}</ul>
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
          <h2>Pare de responder as mesmas perguntas em toda conversa.</h2>
          <p className={s.lead}>Quando os produtos ficam espalhados entre stories, destaques e publicações antigas, o cliente precisa perguntar tudo antes de decidir. E cada atendimento começa do zero: foto, preço e tamanho, um por um.</p>
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
      <p className={s.manifesto}>O INSTAGRAM APRESENTA. A VITRINE <em>ORGANIZA.</em> O WHATSAPP FECHA.</p>
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
          <div className={s.actions}><Button href="#oferta" cta="como_funciona">RESERVAR MINHA VITRINE ↗</Button></div>
        </div>
        <div className={s.howVisual}>
          <div className={s.phoneSmall}>
            <Image src="/assets/demo/solo-maisvendidos.jpg" fill sizes="300px" alt="Catálogo da vitrine da Solo Urb com a grade de produtos e preços" />
          </div>
          <div className={s.howChat}>
            <ChatStrip label="COM A VITRINE · O PEDIDO CHEGA PRONTO" note="A mesma noite, sem uma foto sequer no direct: o cliente escolheu sozinho.">
              <Bubble time="19:11">escolhi pela vitrine: 9060 Rain Cloud, tamanho 39. ainda tem?</Bubble>
              <Bubble out time="19:12" tick="read" delay={700}>tem sim! separei o seu, te mando o Pix</Bubble>
            </ChatStrip>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* Captura desktop da página inteira de cada site (1440px de largura),
   exibida na tela de um MacBook com scroll automático em loop.
   A duração acompanha a altura da página para o ritmo ser parecido.
   Cada card diz o que é: a Xavier's é loja de cliente no ar, a Solo Urb
   é projeto de demonstração. Prova vaga não convence ninguém. */
const projects = [
  {
    img: "/assets/case-xavier-desk.jpg", w: 1440, h: 8965, dur: "36s",
    url: "https://xavier-s-sports.vercel.app/", dom: "xavier-s-sports.vercel.app",
    name: "XAVIER'S SPORTS", tag: "CAMISAS ESPORTIVAS",
    real: true, chip: "● NO AR", kind: "LOJA DE CLIENTE",
    copy: "Vitrine no ar, navegável agora. Abra pelo celular e faça o caminho que o cliente faz.",
    facts: ["Catálogo por clubes, seleções e modelos retrô", "Página individual para cada produto", "Controle de pronta entrega", "Pedido enviado direto no WhatsApp"],
  },
  {
    img: "/assets/case-solourb-desk.jpg", w: 1440, h: 11263, dur: "44s",
    url: "https://s-lo-urb.vercel.app/", dom: "s-lo-urb.vercel.app",
    name: "SOLO URB", tag: "STREETWEAR E SNEAKERS",
    real: false, chip: "● DEMONSTRAÇÃO", kind: "PROJETO DE DEMONSTRAÇÃO",
    copy: "Criei este projeto para mostrar o padrão de entrega em uma loja de streetwear: lançamentos, categorias e reserva pela sacola.",
    facts: [],
  },
];
export function Projects() {
  return <section className={`${s.section} ${s.dark}`} id="projetos">
    <div className={s.wrap}>
      <Eyebrow>PROJETO NO AR</Eyebrow>
      <h2>Veja uma vitrine real em funcionamento.</h2>
      <p className={`${s.lead} ${s.leadDark}`}>A Xavier&apos;s Sports vende camisas esportivas e atende pelo WhatsApp. A vitrine dela está publicada e você pode navegar por ela inteira antes de decidir qualquer coisa.</p>
      <div className={s.projects}>
        {projects.map(x => <article key={x.name}>
          <div className={s.laptop}>
            <div className={s.lapScreen}>
              <div className={s.browserBar}>
                <span className={s.dots} aria-hidden><i /><i /><i /></span>
                <span className={s.urlChip}>{x.dom}</span>
                <span className={x.real ? s.live : s.liveDemo}>{x.chip}</span>
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
            <span className={`${s.kind} ${x.real ? s.kindReal : ""}`}>{x.kind}</span>
          </div>
          <h3>{x.name}</h3>
          <p>{x.copy}</p>
          {x.facts.length > 0 && <ul className={s.facts}>{x.facts.map(f => <li key={f}>{f}</li>)}</ul>}
          <a className={`${s.button} ${x.real ? s.primary : s.outlineDark}`} href={x.url} target="_blank" rel="noopener" data-cta={x.real ? "case_xavier" : "case_solourb"} data-cta-dest="case">
            {x.real ? "ABRIR A VITRINE DA XAVIER'S ↗" : "ABRIR PROJETO ↗"}
          </a>
        </article>)}
      </div>
    </div>
  </section>;
}

const included = [
  ["Design personalizado", "Visual criado a partir da identidade da sua loja, não um modelo pronto."],
  ["Página inicial e catálogo", "Categorias organizadas do jeito que a sua loja vende."],
  ["Página de produto", "Fotos, descrição, preço, tamanhos e variações."],
  ["WhatsApp integrado", "A mensagem chega com o produto já identificado."],
  ["Até 20 produtos", "Eu cadastro todos no lançamento. Acima disso, combinamos à parte."],
  ["Uma rodada de ajustes", "Você revisa e aponta as correções antes de a página entrar no ar."],
  ["Publicação e endereço", "Coloco a vitrine no ar e configuro o endereço. O domínio próprio é opcional, anual e pago direto no registrador."],
  ["Entrega em até 7 dias úteis", "Contados a partir do envio de todos os materiais da loja."],
  ["Atualizações quando precisar", "Você pede alterações pontuais depois e eu orço na hora. Nada é obrigatório."],
];
export function Included() {
  return <section className={s.section} id="inclui">
    <div className={s.wrap}>
      <Eyebrow>O QUE ESTÁ INCLUSO</Eyebrow>
      <h2>Tudo o que está incluído no projeto.</h2>
      <div className={s.grid}>{included.map(x => <article key={x[0]}><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div>
      <details className={s.accordion}>
        <summary>O que preciso enviar?</summary>
        <ul className={s.check}>{["Logo", "Fotos", "Produtos", "Preços", "Categorias", "Informações da loja"].map(x => <li key={x}>{x}</li>)}</ul>
      </details>
    </div>
  </section>;
}

const offerItems = ["Design personalizado", "Página inicial e catálogo", "Páginas de produto", "WhatsApp integrado", "Até 20 produtos cadastrados", "Publicação e endereço configurado", "Uma rodada de ajustes", "Entrega em até 7 dias úteis"];
export function Offer() {
  /* Um caminho só: reservar por R$500. O pagamento à vista deixou de ser um
     segundo botão concorrendo com o principal e virou uma opção dentro do
     formulário, escolhida depois que a pessoa já decidiu contratar. */
  const [avista, setAvista] = useState(false);
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
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
       O Lead na Conversions API perde o hash do telefone e passa a casar só
       por fbp/fbc, e o meta-capi.js já ignora phone vazio. */
    trackLead(plan);
    setStatus("Tudo certo. Abrindo o WhatsApp para concluir a contratação…");
    const text = encodeURIComponent(`Olá, Rafael! Quero contratar a Vitrine Digital.\nNome: ${f.get("nome")}\nLoja: ${f.get("loja")}\nInstagram: ${f.get("instagram")}\nPlano: ${plan}`);
    window.open(`https://wa.me/5544999997219?text=${text}`, "_blank", "noopener");
  }
  return <section className={`${s.section} ${s.offer}`} id="oferta">
    <div className={s.wrap}>
      <Eyebrow>OFERTA E CONTRATAÇÃO</Eyebrow>
      <h2>Vitrine digital completa por <em>R$999.</em></h2>
      <p className={s.lead}>Você reserva o projeto com R$500, acompanha o desenvolvimento e só paga o saldo depois de ver a vitrine pronta e aprovar.</p>
      <div className={s.offerGrid}>
        <article className={s.pricecard}>
          <small>VITRINE DIGITAL</small>
          <div className={s.price}>R$<strong>999</strong></div>
          <p className={s.installments}><b>R$500 PARA RESERVAR</b><br />R$499 APÓS A SUA APROVAÇÃO</p>
          <p className={s.nomensal}>SEM MENSALIDADE OBRIGATÓRIA</p>
          <ul className={s.check}>{offerItems.map(x => <li key={x}>{x}</li>)}</ul>
          <Button onClick={goToForm} cta="oferta_entrada">RESERVAR MINHA VITRINE · R$500 ↗</Button>
          <p className={s.guarantee}>O saldo de R$499 é pago somente depois que você visualizar e aprovar o projeto.</p>
          <a className={s.ghost} href={whatsapp} target="_blank" rel="noopener" data-cta="oferta_whats" data-cta-dest="whatsapp">AINDA TENHO DÚVIDAS: FALAR COM RAFAEL</a>
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
            <p className={s.micro} role="status">{status || "Ao continuar, você confirma os detalhes comigo no WhatsApp. Não peço dados de cartão nesta etapa."}</p>
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
  ["Quem atualiza a vitrine depois?", "Você pede as alterações e eu executo, orçadas por demanda. Se preferir, combinamos um pacote de manutenção. Nada disso é obrigatório."],
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
  return <>
    <section className={`${s.section} ${s.dark} ${s.final}`}>
      <Eyebrow>AGENDA ABERTA</Eyebrow>
      <h2>Sua loja já tem produtos. Agora precisa <em>facilitar a escolha.</em></h2>
      <p className={s.lead}>Reserve a sua vitrine com R$500, acompanhe o projeto e pague o saldo só depois de aprovar.</p>
      <div className={s.actions}>
        <Button href="#oferta" cta="final">RESERVAR MINHA VITRINE · R$500 ↗</Button>
        <a className={s.ghost} href={whatsapp} target="_blank" rel="noopener" data-cta="final_whats" data-cta-dest="whatsapp">FALAR COM RAFAEL</a>
      </div>
    </section>
    <footer className={s.footer}>
      <div className={s.brand}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav><Link href="/estudio/">INÍCIO</Link><Link href="/servicos">SERVIÇOS</Link><Link href="/e-commerce">E-COMMERCE</Link><Link href="/termos">TERMOS</Link><Link href="/privacidade">PRIVACIDADE</Link></nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
    </footer>
    <a className={`${s.pill} ${inOffer ? s.pillHidden : ""}`} href={whatsapp} target="_blank" rel="noopener" data-cta="pill" data-cta-dest="whatsapp">FALAR COM RAFAEL ↗</a>
  </>;
}

/* Barra fixa do celular: entra depois que a pessoa passa do hero e some
   dentro da oferta e enquanto ela digita, para não cobrir o formulário. */
export function MobileBar() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const hero = document.getElementById("topo");
    const offer = document.getElementById("oferta");
    let focused = false, inOffer = false, inHero = !!hero;
    const update = () => setHidden(focused || inOffer || inHero);
    const onFocus = (e: FocusEvent) => { focused = !!(e.target as HTMLElement)?.closest?.("form"); update(); };
    const onBlur = () => { focused = false; update(); };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    const heroIO = hero && new IntersectionObserver(([x]) => { inHero = x.isIntersecting; update(); }, { rootMargin: "-15% 0px" });
    if (hero && heroIO) heroIO.observe(hero);
    const offerIO = offer && new IntersectionObserver(([x]) => { inOffer = x.isIntersecting; update(); }, { rootMargin: "-30% 0px" });
    if (offer && offerIO) offerIO.observe(offer);
    return () => { document.removeEventListener("focusin", onFocus); document.removeEventListener("focusout", onBlur); heroIO?.disconnect(); offerIO?.disconnect(); };
  }, []);
  return <div className={`${s.bar} ${hidden ? s.barHidden : ""}`}>
    <span className={s.barCopy}><b>R$500 PARA RESERVAR</b><span>Saldo só após você aprovar</span></span>
    <a className={`${s.button} ${s.primary}`} href="#oferta" data-cta="sticky_mobile">RESERVAR</a>
  </div>;
}
