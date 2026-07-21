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

const Chat = ({ children, from = "cliente" }: { children: React.ReactNode; from?: "cliente" | "loja" }) =>
  <div className={`${s.chat} ${from === "loja" ? s.chatLoja : ""}`}><small>{from === "loja" ? "SUA LOJA" : "CLIENTE"}</small><p>{children}</p></div>;

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
  return <section className={s.hero}>
    <div className={s.heroGrid}>
      <div className={s.heroCopy}>
        <Eyebrow>● VITRINE DIGITAL PARA LOJAS</Eyebrow>
        <h1>TRANSFORME SEU INSTAGRAM EM UMA <em>LOJA ORGANIZADA.</em></h1>
        <p className={s.lead}>Apresente seus produtos em um catálogo profissional e receba clientes mais preparados no WhatsApp.</p>
        <div className={s.actions}>
          <Button href="#oferta" cta="hero">COMEÇAR COM R$500 ↗</Button>
          <a className={s.ghost} href="#projetos" data-cta="hero_projetos" data-cta-dest="projetos">VER PROJETOS ↓</a>
        </div>
        <small className={s.micro}>PROJETO COMPLETO POR R$999 · ATÉ 20 PRODUTOS · ENTREGA EM ATÉ 7 DIAS ÚTEIS</small>
      </div>
      <div className={s.heroVisual}>
        <div className={s.phone} role="img" aria-label="Demonstração da vitrine da Xavier's Sports: o cliente navega no catálogo, abre a camisa Brasil Retrô 2004, escolhe o tamanho M e envia o pedido pelo WhatsApp">
          <VitrineDemo />
        </div>
        <small className={s.demoTag}>DEMONSTRAÇÃO REAL · XAVIER&apos;S SPORTS</small>
      </div>
    </div>
    <ul className={s.heroPoints}>{heroPoints.map(x => <li key={x}>{x}</li>)}</ul>
  </section>;
}

export function PainSolution() {
  return <section className={s.section}>
    <div className={s.wrap}>
      <div className={s.split}>
        <div>
          <Eyebrow>O PROBLEMA E A SOLUÇÃO</Eyebrow>
          <h2>SEU CLIENTE NÃO DEVERIA PROCURAR PRODUTOS NO MEIO DO FEED.</h2>
          <p className={s.lead}>Stories desaparecem, publicações antigas ficam difíceis de encontrar e o atendimento começa com pedidos de fotos, preços e tamanhos.</p>
        </div>
        <div className={s.shift}>
          <div className={s.shiftBefore}>
            <small>HOJE</small>
            <span>Stories que somem</span><span>Feed antigo</span><span>Fotos no direct</span><span>Preço por mensagem</span>
          </div>
          <div className={s.shiftAfter}>
            <small>COM A VITRINE</small>
            <p>Seus produtos ficam organizados em um único link. O cliente navega, escolhe e chama sua loja com o produto definido.</p>
          </div>
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
      <h2>DO INSTAGRAM AO PEDIDO EM QUATRO PASSOS.</h2>
      <div className={s.split}>
        <div>
          <ol className={s.steps}>{steps.map((x, i) => <li key={x[0]}><b>0{i + 1}</b><div><h3>{x[0]}</h3><p>{x[1]}</p></div></li>)}</ol>
          <div className={s.actions}><Button href="#oferta" cta="como_funciona">QUERO ISSO NA MINHA LOJA ↗</Button></div>
        </div>
        <div className={s.howVisual}>
          <div className={s.phoneSmall}>
            <Image src="/assets/case-solourb.jpg" fill sizes="300px" alt="Vitrine digital da Solo Urb aberta no celular" />
          </div>
          <div className={s.howChat}>
            <Chat>Olá! Vi o New Balance 9060 na vitrine. Tem disponível no tamanho 39?</Chat>
            <Chat from="loja">Tem sim! Quer que eu separe o seu?</Chat>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

const projects = [
  { img: "/assets/case-xavier.jpg", name: "XAVIER'S SPORTS", tag: "CAMISAS ESPORTIVAS", copy: "Catálogo por clubes, seleções e modelos retrô, com pedido direto no WhatsApp." },
  { img: "/assets/case-solourb.jpg", name: "SOLO URB", tag: "STREETWEAR E SNEAKERS", copy: "Lançamentos, categorias e páginas de produto com reserva pela sacola." },
];
export function Projects() {
  return <section className={`${s.section} ${s.dark}`} id="projetos">
    <div className={s.wrap}>
      <Eyebrow>PROJETOS</Eyebrow>
      <h2>UMA DIREÇÃO CRIADA PARA CADA LOJA.</h2>
      <div className={s.projects}>
        {projects.map(x => <article key={x.name}>
          <div className={s.cover}><Image src={x.img} fill sizes="(max-width: 800px) 100vw, 44vw" alt={`Vitrine digital do projeto ${x.name}`} /></div>
          <small>{x.tag}</small>
          <h3>{x.name}</h3>
          <p>{x.copy}</p>
          <a className={`${s.button} ${s.outlineDark}`} href={x.img} target="_blank" rel="noopener">ABRIR PROJETO ↗</a>
        </article>)}
      </div>
      <p className={s.note}>Alguns projetos são conceitos demonstrativos criados para apresentar possibilidades de aplicação.</p>
    </div>
  </section>;
}

const included = [
  ["Design personalizado", "Visual alinhado à identidade da loja."],
  ["Página inicial e catálogo", "Categorias e produtos organizados."],
  ["Página de produto", "Fotos, descrição, preço e variações."],
  ["WhatsApp integrado", "Mensagem automática com o produto escolhido."],
  ["Até 20 produtos", "Cadastro inicial incluso."],
  ["Publicação completa", "Responsividade, domínio e uma rodada de ajustes."],
];
export function Included() {
  return <section className={s.section} id="inclui">
    <div className={s.wrap}>
      <Eyebrow>O QUE ESTÁ INCLUSO</Eyebrow>
      <h2>SUA LOJA PRONTA PARA APRESENTAR E VENDER MELHOR.</h2>
      <div className={s.grid}>{included.map(x => <article key={x[0]}><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div>
      <details className={s.accordion}>
        <summary>O que preciso enviar?</summary>
        <ul className={s.check}>{["Logo", "Fotos", "Produtos", "Preços", "Categorias", "Informações da loja"].map(x => <li key={x}>{x}</li>)}</ul>
      </details>
    </div>
  </section>;
}

const offerItems = ["Design personalizado", "Página inicial", "Catálogo", "Página de produto", "WhatsApp integrado", "Até 20 produtos", "Publicação", "Uma rodada de ajustes"];
export function Offer() {
  const [plan, setPlan] = useState("Entrada de R$500");
  const [status, setStatus] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  function choose(p: string) {
    setPlan(p);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    (formRef.current?.elements.namedItem("nome") as HTMLInputElement | null)?.focus({ preventScroll: true });
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    trackLead(plan);
    setStatus("Tudo certo. Abrindo o WhatsApp para concluir a contratação…");
    const text = encodeURIComponent(`Olá, Rafael! Quero contratar a Vitrine Digital.\nNome: ${f.get("nome")}\nLoja: ${f.get("loja")}\nInstagram: ${f.get("instagram")}\nWhatsApp: ${f.get("whatsapp")}\nPlano: ${plan}`);
    window.open(`https://wa.me/5544999997219?text=${text}`, "_blank", "noopener");
  }
  return <section className={`${s.section} ${s.offer}`} id="oferta">
    <div className={s.wrap}>
      <Eyebrow>OFERTA E CONTRATAÇÃO</Eyebrow>
      <h2>VITRINE DIGITAL COMPLETA POR <em>R$999.</em></h2>
      <p className={s.lead}>Uma página personalizada para organizar seus produtos, valorizar sua marca e facilitar os pedidos pelo WhatsApp.</p>
      <div className={s.offerGrid}>
        <article className={s.pricecard}>
          <small>VITRINE DIGITAL</small>
          <div className={s.price}>R$<strong>999</strong></div>
          <p className={s.installments}><b>R$500 PARA INICIAR</b><br />R$499 APÓS A APROVAÇÃO</p>
          <ul className={s.check}>{offerItems.map(x => <li key={x}>{x}</li>)}</ul>
          <Button onClick={() => choose("Entrada de R$500")} cta="oferta_entrada">COMEÇAR COM R$500 ↗</Button>
          <Button onClick={() => choose("À vista R$999")} outline cta="oferta_avista">PAGAR R$999 À VISTA</Button>
          <a className={s.ghost} href={whatsapp} target="_blank" rel="noopener" data-cta="oferta_whats" data-cta-dest="whatsapp">TIRAR DÚVIDAS NO WHATSAPP</a>
          <small className={s.micro}>O saldo é pago depois da apresentação e aprovação do projeto.</small>
        </article>
        <form ref={formRef} onSubmit={submit} className={s.form} id="contratar">
          <p className={s.formTitle}>COMECE AGORA<br /><span>Plano escolhido: {plan}</span></p>
          <label>NOME<input name="nome" autoComplete="name" required /></label>
          <label>WHATSAPP<input name="whatsapp" type="tel" autoComplete="tel" required /></label>
          <label>NOME DA LOJA<input name="loja" required /></label>
          <label>INSTAGRAM<input name="instagram" placeholder="@sualoja" required /></label>
          <button className={`${s.button} ${s.primary}`}>CONTINUAR CONTRATAÇÃO ↗</button>
          <p className={s.micro} role="status">{status || "Nenhum dado de cartão é solicitado nesta etapa."}</p>
        </form>
      </div>
    </div>
  </section>;
}

const process = [
  ["Contratação", "Você paga R$500 e envia o briefing."],
  ["Criação", "Eu desenvolvo a estrutura, o design e o catálogo."],
  ["Aprovação", "Você revisa e solicita a rodada de ajustes."],
  ["Publicação", "Após a aprovação e o saldo, a página entra no ar."],
];
export function Process() {
  return <section className={`${s.section} ${s.dark}`}>
    <div className={s.wrap}>
      <Eyebrow>PROCESSO E SEGURANÇA</Eyebrow>
      <h2>VOCÊ ACOMPANHA O PROJETO ANTES DE CONCLUIR O PAGAMENTO.</h2>
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
  ["Quantos produtos estão incluídos?", "Até 20 produtos no cadastro inicial. Novos cadastros podem ser combinados depois."],
  ["Existe mensalidade?", "Não. O projeto custa R$999 uma única vez. Serviços externos, como domínio próprio, podem ter custos anuais próprios."],
  ["Posso atualizar depois?", "Sim. Você pode solicitar atualizações pontuais ou combinar um pacote de manutenção quando precisar."],
  ["Quanto tempo demora?", "Até 7 dias úteis depois do envio de todos os materiais da loja."],
  ["Preciso pagar tudo antes?", "Não. São R$500 para iniciar e R$499 somente depois da apresentação e aprovação do projeto."],
];
export function FAQ() {
  return <section className={s.section} id="faq">
    <div className={s.wrap}>
      <Eyebrow>DÚVIDAS FREQUENTES</Eyebrow>
      <h2>ANTES DE CONTRATAR.</h2>
      <div className={s.faq}>{faq.map(x => <details key={x[0]}><summary>{x[0]}</summary><p>{x[1]}</p></details>)}</div>
    </div>
  </section>;
}

export function FinalCTA() {
  return <>
    <section className={`${s.section} ${s.dark} ${s.final}`}>
      <Eyebrow>AGENDA ABERTA</Eyebrow>
      <h2>SUA LOJA JÁ TEM PRODUTOS. AGORA PRECISA <em>FACILITAR A ESCOLHA.</em></h2>
      <p className={s.lead}>Transforme o link da bio em uma vitrine profissional e receba clientes mais preparados no WhatsApp.</p>
      <div className={s.actions}>
        <Button href="#oferta" cta="final">COMEÇAR MINHA VITRINE ↗</Button>
        <a className={s.ghost} href={whatsapp} target="_blank" rel="noopener" data-cta="final_whats" data-cta-dest="whatsapp">FALAR COM RAFAEL</a>
      </div>
    </section>
    <footer className={s.footer}>
      <div className={s.brand}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav><Link href="/estudio/">INÍCIO</Link><Link href="/termos">TERMOS</Link><Link href="/privacidade">PRIVACIDADE</Link></nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
    </footer>
    <a className={s.pill} href={whatsapp} target="_blank" rel="noopener" data-cta="pill" data-cta-dest="whatsapp">FALAR COM RAFAEL ↗</a>
  </>;
}

export function MobileBar() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const offer = document.getElementById("oferta");
    let focused = false, inOffer = false;
    const update = () => setHidden(focused || inOffer);
    const onFocus = (e: FocusEvent) => { focused = !!(e.target as HTMLElement)?.closest?.("form"); update(); };
    const onBlur = () => { focused = false; update(); };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    const io = offer && new IntersectionObserver(([x]) => { inOffer = x.isIntersecting; update(); }, { rootMargin: "-30% 0px" });
    if (offer && io) io.observe(offer);
    return () => { document.removeEventListener("focusin", onFocus); document.removeEventListener("focusout", onBlur); io?.disconnect(); };
  }, []);
  return <div className={`${s.bar} ${hidden ? s.barHidden : ""}`}>
    <span>VITRINE DIGITAL · <b>R$999</b></span>
    <a className={`${s.button} ${s.primary}`} href="#oferta" data-cta="sticky_mobile">CONTRATAR</a>
  </div>;
}
