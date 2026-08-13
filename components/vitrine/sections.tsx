"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import s from "@/app/vitrine-digital/vitrine.module.css";
import { CampoIsca, useGuardaDeFormulario } from "@/components/form-guarda";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { enviarLeadVitrine } from "@/components/vitrine/lead-flow";
import { initTracking } from "@/components/vitrine/tracking";

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
export function Header() {
  return <header className={s.header}>
    {/* a logo volta ao hero desta página, não para /estudio: quem chega do
        anúncio e toca no topo quer recomeçar a leitura, não trocar de site */}
    <a className={s.brand} href="#topo"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></a>
    {/* a mesma frase que o Quem Faz lista como fato, antecipada para o
        topo: é a pergunta que tráfego frio faz antes de qualquer outra.
        Ver a nota em `.headStatus`, no CSS. */}
    <span className={s.headStatus}><i aria-hidden /> RESPOSTA NO MESMO DIA</span>
    {/* encurtado em 13/08: "QUERO MINHA VITRINE ↓" e a logo somavam mais
        que os 350px úteis de uma tela de 390, e os dois quebravam em duas
        linhas cada um, deixando o cabeçalho com o dobro da altura */}
    <a className={s.headCta} href="#hero-form" data-cta="header" data-cta-dest="form">DEIXAR CONTATO ↓</a>
  </header>;
}

/* Demonstração no mockup do hero (07/08): a VITRINE COMPLETA da Sölo Urb
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
    <Image className={s.shot} src="/assets/demo/solourb-hero-still.jpg" width={500} height={1082} sizes="300px" priority alt="" />
    {montar && <picture>
      <source type="image/avif" srcSet="/assets/demo/solourb-vitrine.avif" />
      <source type="image/webp" srcSet="/assets/demo/solourb-vitrine.webp" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.phoneShot} src="/assets/demo/solourb-vitrine.jpg" width={500} height={16188} style={{ "--dur": "36s" } as React.CSSProperties} alt="" />
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
function HeroForm() {
  const [linkWa, setLinkWa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [telInvalido, setTelInvalido] = useState(false);
  const envioSuspeito = useGuardaDeFormulario();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;              // toque duplo não grava duas linhas
    /* robô cai na tela de confirmação e nada acontece: sem gravação, sem
       Contact, sem aviso. Ver o porquê do sucesso falso em form-guarda.tsx. */
    if (envioSuspeito(e.currentTarget)) { setEnviado(true); return; }
    const f = new FormData(e.currentTarget);
    /* telefone inválido nem vira evento: o Contact é o que a campanha
       otimiza, e número lixo aqui seria falso positivo ensinando a Meta */
    if (!whatsappValido(String(f.get("whatsapp") || ""))) { setTelInvalido(true); return; }
    setEnviando(true);
    const { salvo, linkWa: link } = await enviarLeadVitrine({
      nome: String(f.get("nome") || ""),
      whatsapp: String(f.get("whatsapp") || ""),
      /* o lead-flow já sabia receber `instagram` desde 07/08 (o formulário
         da oferta manda), e é ele que vira a linha "Loja:" da mensagem do
         WhatsApp e a coluna `canal` no banco. Só o hero não mandava. */
      instagram: String(f.get("instagram") || ""),
      ctaPosition: "hero_form",
    });
    setLinkWa(link);
    setEnviando(false);
    if (salvo) setEnviado(true);
  }
  /* a confirmação ocupa a própria porta: estado do React, sem navegação,
     então aparece igual no navegador interno do Instagram */
  {/* o id fica também na confirmação: o CTA do topo desce para cá por
      âncora, e sem isso quem já enviou clicaria num link morto */}
  if (enviado) return <div id="hero-form" className={`${s.tag} ${s.tagConfirm}`} role="status">
    {/* ---------- o alfinete ----------
        Quarto objeto a ocupar este canto (cordão, fita crepe, clipe,
        alfinete) e o primeiro que pertence ao mundo da cliente: é com
        alfinete que se prende etiqueta de preço em peça de roupa. O
        porquê de cada troca está por extenso em `.tagPin`, no CSS.

        Montado de baixo para cima, na ordem em que a luz o encontra:
        a sombra de contato onde a agulha entra no papel, a agulha em
        rosé, a base acrílica translúcida e o fio de luz na quina dela.

        A base é `#ffffff8c`, não branco cheio: é acrílico, então a borda
        de tinta do cartão tem que aparecer POR BAIXO. Sem a translucidez
        ele viraria um adesivo branco.

        Decoração, e por isso aria-hidden. */}
    <svg className={s.tagPin} viewBox="0 0 30 42" fill="none" aria-hidden>
      <defs>
        {/* ---------- rosa no plástico, aço na agulha ----------
            O alfinete passou por cobre e por rosé antes de chegar aqui.
            O rosé tinha um problema de matemática: a rampa cruzava o
            marrom no meio, e a 2,4px de espessura o olho só vê o
            meio-tom, então a agulha lia como cobre sujo.

            Agora a cor vai onde ela existe de verdade num percevejo: o
            PLÁSTICO é colorido e a AGULHA é aço. Separar os dois
            materiais é o que impede a peça de virar um borrão de uma cor
            só, e é também o que a faz ler como objeto e não como ícone.

            SOBRE OS 10% DA PALETA: este é o quarto rosa da página, depois
            do botão, da barra fixa e da faixa diagonal. Continua valendo
            porque a regra é de ATENÇÃO, não de contagem: o alfinete tem
            uns 30px, é material de um objeto e não sinal de ação, e o
            botão segue sendo o único rosa cheio cercado de branco no
            centro da tela. Se um dia essa conta virar, quem muda é o
            alfinete, nunca o botão.

            O acrílico fica em `--rosa` a ~66% para continuar translúcido:
            a borda de tinta do cartão tem que aparecer POR BAIXO dele,
            que é o que separa plástico de adesivo. */}
        <linearGradient id="agulhaAco" x1="0" y1="0" x2="1" y2=".3">
          <stop offset="0" stopColor="#cbd1d5" />
          <stop offset=".4" stopColor="#7d858a" />
          <stop offset=".74" stopColor="#b0b7bc" />
          <stop offset="1" stopColor="#767e83" />
        </linearGradient>
        <linearGradient id="colarAco" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d5dade" />
          <stop offset=".5" stopColor="#828a8f" />
          <stop offset="1" stopColor="#b6bdc1" />
        </linearGradient>
      </defs>
      {/* A ORDEM DAS PEÇAS, de baixo para cima, é a de um alfinete
          ESPETADO: sombra de contato, agulha entrando no papel, saia
          apoiada na superfície, cintura e cabeça virada para quem olha.
          Na primeira versão a saia estava para cima e a coisa lia como
          taça de vinho: quando o alfinete está cravado, a parte larga
          encosta no PAPEL e a cabeça fica do lado de cá. */}
      <ellipse cx="16.4" cy="38" rx="6" ry="1.8" fill="#00000022" />
      {/* a agulha some dentro do papel, então a ponta não é desenhada */}
      <path d="M15.3 27 16.4 38.2" stroke="url(#agulhaAco)" strokeWidth="2.4" strokeLinecap="round" />
      {/* a saia cônica apoiada no papel */}
      <path d="M5.8 27.4c0-5.3 4-8 5.8-8.8h6.8c1.8.8 5.8 3.5 5.8 8.8 0 1.9-18.4 1.9-18.4 0Z"
            fill="#E31B62a8" stroke="#8f0f3d4d" strokeWidth=".9" />
      {/* a cintura */}
      <path d="M12.2 12.4h5.6v7h-5.6z" fill="#E31B6294" stroke="#8f0f3d40" strokeWidth=".8" />
      {/* a cabeça, que é onde o dedo empurra */}
      <rect x="5.6" y="4.2" width="19" height="9" rx="2.4"
            fill="#E31B62b8" stroke="#8f0f3d4d" strokeWidth=".9" />
      {/* o colar de metal aparecendo na junta da agulha com a saia */}
      <path d="M13.4 27.2h5.4" stroke="url(#colarAco)" strokeWidth="2.6" strokeLinecap="round" />
      {/* fios de luz na quina de cima à esquerda, a mesma direção de luz
          do resto da página. Branco puro sobre o rosa translúcido é o que
          faz o plástico brilhar em vez de parecer pintado. */}
      <path d="M8 6.4h9.6" stroke="#ffffffcc" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.6 24.4c.4-2.6 1.8-4.4 3-5.4" stroke="#ffffff9e" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
    <p className={s.formTitle}>RECEBI SEUS DADOS<br /><span>Te chamo no WhatsApp ainda hoje.</span></p>
    {/* o único WhatsApp que sobrou no hero, e só depois do envio: aqui o
        Contact já disparou, então a saída não custa mais conversão nenhuma */}
    <a className={`${s.button} ${s.primary}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">QUER AGILIZAR? ME CHAMA AGORA ↗</a>
  </div>;
  return <form id="hero-form" className={s.tag} onSubmit={submit}>
    {/* ---------- o alfinete ----------
        Quarto objeto a ocupar este canto (cordão, fita crepe, clipe,
        alfinete) e o primeiro que pertence ao mundo da cliente: é com
        alfinete que se prende etiqueta de preço em peça de roupa. O
        porquê de cada troca está por extenso em `.tagPin`, no CSS.

        Montado de baixo para cima, na ordem em que a luz o encontra:
        a sombra de contato onde a agulha entra no papel, a agulha em
        rosé, a base acrílica translúcida e o fio de luz na quina dela.

        A base é `#ffffff8c`, não branco cheio: é acrílico, então a borda
        de tinta do cartão tem que aparecer POR BAIXO. Sem a translucidez
        ele viraria um adesivo branco.

        Decoração, e por isso aria-hidden. */}
    <svg className={s.tagPin} viewBox="0 0 30 42" fill="none" aria-hidden>
      <defs>
        {/* ---------- rosa no plástico, aço na agulha ----------
            O alfinete passou por cobre e por rosé antes de chegar aqui.
            O rosé tinha um problema de matemática: a rampa cruzava o
            marrom no meio, e a 2,4px de espessura o olho só vê o
            meio-tom, então a agulha lia como cobre sujo.

            Agora a cor vai onde ela existe de verdade num percevejo: o
            PLÁSTICO é colorido e a AGULHA é aço. Separar os dois
            materiais é o que impede a peça de virar um borrão de uma cor
            só, e é também o que a faz ler como objeto e não como ícone.

            SOBRE OS 10% DA PALETA: este é o quarto rosa da página, depois
            do botão, da barra fixa e da faixa diagonal. Continua valendo
            porque a regra é de ATENÇÃO, não de contagem: o alfinete tem
            uns 30px, é material de um objeto e não sinal de ação, e o
            botão segue sendo o único rosa cheio cercado de branco no
            centro da tela. Se um dia essa conta virar, quem muda é o
            alfinete, nunca o botão.

            O acrílico fica em `--rosa` a ~66% para continuar translúcido:
            a borda de tinta do cartão tem que aparecer POR BAIXO dele,
            que é o que separa plástico de adesivo. */}
        <linearGradient id="agulhaAco" x1="0" y1="0" x2="1" y2=".3">
          <stop offset="0" stopColor="#cbd1d5" />
          <stop offset=".4" stopColor="#7d858a" />
          <stop offset=".74" stopColor="#b0b7bc" />
          <stop offset="1" stopColor="#767e83" />
        </linearGradient>
        <linearGradient id="colarAco" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d5dade" />
          <stop offset=".5" stopColor="#828a8f" />
          <stop offset="1" stopColor="#b6bdc1" />
        </linearGradient>
      </defs>
      {/* A ORDEM DAS PEÇAS, de baixo para cima, é a de um alfinete
          ESPETADO: sombra de contato, agulha entrando no papel, saia
          apoiada na superfície, cintura e cabeça virada para quem olha.
          Na primeira versão a saia estava para cima e a coisa lia como
          taça de vinho: quando o alfinete está cravado, a parte larga
          encosta no PAPEL e a cabeça fica do lado de cá. */}
      <ellipse cx="16.4" cy="38" rx="6" ry="1.8" fill="#00000022" />
      {/* a agulha some dentro do papel, então a ponta não é desenhada */}
      <path d="M15.3 27 16.4 38.2" stroke="url(#agulhaAco)" strokeWidth="2.4" strokeLinecap="round" />
      {/* a saia cônica apoiada no papel */}
      <path d="M5.8 27.4c0-5.3 4-8 5.8-8.8h6.8c1.8.8 5.8 3.5 5.8 8.8 0 1.9-18.4 1.9-18.4 0Z"
            fill="#E31B62a8" stroke="#8f0f3d4d" strokeWidth=".9" />
      {/* a cintura */}
      <path d="M12.2 12.4h5.6v7h-5.6z" fill="#E31B6294" stroke="#8f0f3d40" strokeWidth=".8" />
      {/* a cabeça, que é onde o dedo empurra */}
      <rect x="5.6" y="4.2" width="19" height="9" rx="2.4"
            fill="#E31B62b8" stroke="#8f0f3d4d" strokeWidth=".9" />
      {/* o colar de metal aparecendo na junta da agulha com a saia */}
      <path d="M13.4 27.2h5.4" stroke="url(#colarAco)" strokeWidth="2.6" strokeLinecap="round" />
      {/* fios de luz na quina de cima à esquerda, a mesma direção de luz
          do resto da página. Branco puro sobre o rosa translúcido é o que
          faz o plástico brilhar em vez de parecer pintado. */}
      <path d="M8 6.4h9.6" stroke="#ffffffcc" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9.6 24.4c.4-2.6 1.8-4.4 3-5.4" stroke="#ffffff9e" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
    {/* ---------- o carimbo ----------
        SEM mês e SEM contagem de vagas de propósito. "AGOSTO" apodrece
        sozinho no dia 1º de setembro, e um número de vagas que não seja
        verdade quebra na primeira conferência, numa página cujo resto é
        só fato verificável (9 projetos no ar, 7 dias úteis, R$0 de
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
    <svg className={s.tagStamp} viewBox="0 0 100 100" role="img" aria-label="Carimbo: agenda aberta">
      <defs>
        {/* semicírculo da esquerda para a direita passando POR CIMA
            (varredura 1 = horário): é o que mantém as letras do arco em
            pé. Com varredura 0 elas sairiam de cabeça para baixo. */}
        <path id="seloArcoDoTopo" d="M50 50 m-34.5 0 a34.5 34.5 0 0 1 69 0" fill="none" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="50" cy="50" r="40.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <text fontSize="6.6" letterSpacing=".45">
        <textPath href="#seloArcoDoTopo" startOffset="50%" textAnchor="middle">RAFAEL RAZEIRA ESTÚDIO</textPath>
      </text>
      <text x="50" y="48.5" fontSize="14" letterSpacing=".4" textAnchor="middle">AGENDA</text>
      <text x="50" y="62.5" fontSize="14" letterSpacing=".4" textAnchor="middle">ABERTA</text>
      <line x1="31" y1="69.5" x2="69" y2="69.5" stroke="currentColor" strokeWidth="1" />
      <text x="50" y="79.5" fontSize="7.2" letterSpacing=".5" textAnchor="middle">MARINGÁ · PR</text>
    </svg>
    {/* o preço é o corpo da etiqueta: numa categoria que responde "solicite
        orçamento", o número fechado na primeira tela é a oferta inteira */}
    {/* moeda e centavos em <i> para a regra `.tagPrice b i` alcançá-los:
        eles ficam pequenos e alçados à altura de maiúscula, que é como
        etiqueta de loja escreve preço. Os centavos são autenticidade, não
        precisão: R$999 e R$999,00 são o mesmo valor, e só o segundo se
        parece com uma etiqueta. */}
    {/* ---------- o rótulo do preço deixou de ser adjetivo ----------
        Era "PROJETO COMPLETO". "Completo" é adjetivo, e esta página só
        funciona porque troca adjetivo por fato em todo lugar: 9 projetos
        que dá para abrir, 7 dias úteis, R$0 de mensalidade. "Completo"
        era a única palavra da etiqueta que o leitor tinha que aceitar
        no fio do bigode, e ainda por cima é o que TODO concorrente
        escreve.
        Agora o rótulo diz as duas coisas que entram na caixa, e a
        segunda é a que ninguém entrega junto por esse preço: o painel.
        Ele é o item 6 dos 9 do `offerItems`, tem seção própria com
        print real da tela da Xavier's e resposta na FAQ, então não é
        promessa nova, é a que estava escondida no meio da página.
        "DE ESTOQUE" e não "DE GESTÃO", que é como o resto da página o
        chama: na primeira tela quem lê nunca ouviu falar desse painel,
        e estoque é a única palavra que faz entender para que serve sem
        explicação. "Gestão" fica para depois, quando a seção do painel
        mostra que ele também faz preço, foto e disponibilidade.
        Custo de espaço: ZERO, medido. Os cinco rótulos testados (16 a
        27 caracteres) dão a mesma altura de linha e o botão de envio no
        mesmo pixel, porque o rótulo já quebra para baixo do preço de
        qualquer jeito. O `padding-right: 66px` do `.tagPrice` é o que
        reserva o canto do carimbo, e ele não mudou.
        O que se perde: "completo" também dizia "não tem mais nada para
        pagar". Isso continua dito, e melhor, pelo R$0 DE MENSALIDADE do
        canhoto e pela lista de 9 itens da oferta. */}
    {/* o "+" em <em> e não solto no texto: ele não é pontuação, é a
        DOBRADIÇA da frase. A linha inteira é uma soma de duas entregas, e
        é o sinal que conta isso; em corpo de texto ele desaparecia no meio
        das letras. Ver `.tagPrice span em` no CSS. */}
    <p className={s.tagPrice}><b><i>R$</i>999<i>,00</i></b><span>VITRINE <em>+</em> PAINEL DE ESTOQUE</span></p>
    {/* AS CONDIÇÕES SAÍRAM DAQUI e foram para depois do botão. Duas
        razões, e a segunda é a que importa: elas custavam duas linhas
        entre a pessoa e o primeiro campo, o que atrasava o pedido em
        ~46px de rolagem numa dobra que já estava no limite; e condição
        de pagamento é coisa que se lê DEPOIS de decidir, não antes. O
        preço continua onde estava, que é o que precisa vir na frente. */}
    <hr className={s.tagRule} />
    {/* rótulo visível em vez de placeholder: o placeholder some quando a
        pessoa digita, e aí o campo fica anônimo justamente na hora de
        conferir o que foi escrito */}
    <label>SEU NOME<input name="nome" autoComplete="name" required /></label>
    {/* a máscara reescreve o valor a cada tecla; digitar limpa o erro para a
        mensagem não continuar acusando um número que já foi corrigido */}
    <label>SEU WHATSAPP<input name="whatsapp" type="tel" autoComplete="tel" placeholder="(44) 99999-0000" required maxLength={16}
           onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); if (telInvalido) setTelInvalido(false); }} /></label>
    {telInvalido && <small className={s.tagErro} role="alert">Confere o número: é por ele que eu te chamo. Ex.: (44) 99999-0000.</small>}
    {/* ---------- o terceiro campo (13/08) ----------
        Entrou a pedido do Rafael e OBRIGATÓRIO, ao contrário do mesmo
        campo no formulário da oferta, que é opcional. Ele custa: a
        etiqueta vendia "dois campos" e das quatro pessoas que tocaram no
        formulário em 12-13/08 as três que largaram pararam no primeiro
        campo, ou seja, a fricção aqui é real e já mordeu.

        O que paga o custo é a promessa que a página já faz duas vezes
        ("vou olhar sua loja antes de falar com você"): sem o @ ela não
        acontece, e a primeira mensagem chega genérica. Por isso o rótulo
        não pede o dado, ele diz o que vai ser FEITO com o dado.

        Dá para medir se foi mau negócio: o `form_ultimo_campo` do evento
        Saida grava `hero_instagram` para quem morrer aqui. Se ele virar
        o campo campeão de abandono, o campo vira opcional.

        O `@` fica FORA do input, como prefixo fixo: dentro, ele seria
        apagado por quem digita por cima, e a limpeza no onInput cobre os
        três jeitos de errar que a pessoa tem (digitar o @ de novo, colar
        a URL inteira do perfil, ou deixar espaço no meio). */}
    <label>SUA LOJA NO INSTAGRAM
      <span className={s.tagAt}>
        <i aria-hidden>@</i>
        <input name="instagram" required autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="sualoja"
               onInput={e => { e.currentTarget.value = e.currentTarget.value.replace(/^\s*(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "").replace(/[@\s]/g, "").replace(/\/.*$/, ""); }} />
      </span>
    </label>
    <CampoIsca />
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
    <button className={`${s.button} ${s.acao}`} disabled={enviando}>{enviando ? "ENVIANDO…" : "QUERO MINHA VITRINE"}</button>
    {linkWa
      ? <div className={s.pendente} role="status">
          <b>Falta um toque.</b>
          <p>Abri o WhatsApp com sua mensagem pronta. Toque em <b>enviar</b> lá para eu receber, senão ela não chega.</p>
          <a className={`${s.button} ${s.primary}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">ABRIR O WHATSAPP ↗</a>
        </div>
      : <small className={s.tagMicro}>Eu olho sua loja antes de te chamar no WhatsApp, ainda hoje. Começa com R$500, o saldo só depois de você aprovar.</small>}
    {/* o canhoto: o picote separa o que você dá do que eu já provei, que são
        as duas metades da decisão. Fatos verificáveis, não adjetivos: os 9
        são o catálogo inteiro do /portfolio, e "PROJETOS" e não "LOJAS"
        porque dois dos nove não são loja. */}
    <p className={s.tagStub}><span><b>9</b> PROJETOS NO AR</span><span><b>7</b> DIAS ÚTEIS</span><span><b>R$0</b> DE MENSALIDADE</span></p>
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
export function Hero() {
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
        <Eyebrow>VITRINE PARA QUEM VENDE NO INSTAGRAM</Eyebrow>
        {/* ---------- a ordem virou pergunta ----------
            "Pare de perder venda" AFIRMA que a pessoa perde, e quem
            discorda para de ler na primeira linha. A pergunta faz ela
            mesma fazer a conta, e qualquer resposta maior que zero é a
            pessoa se qualificando sozinha antes de rolar um pixel.
            "Essa semana" é o que impede a resposta preguiçosa: sem
            recorte de tempo a conta é abstrata e a frase vira slogan.
            É o hook H01 do lote 01 palavra por palavra (ver
            docs/matriz-anuncios-vitrine.md), então o vídeo e a primeira
            linha da página passam a dizer a MESMA frase.

            CUSTA UMA LINHA, E A LINHA É DA FORMA, NÃO DO TAMANHO.
            Medido a 390x740, pelo topo do botão de envio:

              595px  manchete anterior, antes do campo do Instagram
              627px  só a pergunta entra          (+32)
              663px  só o campo do Instagram entra (+68)
              695px  as duas coisas
              670px  hoje, com o lead cortado para duas linhas (-26)

            Toda variante de pergunta testada deu as mesmas três linhas
            (98px), inclusive "QUANTAS VENDAS VOCÊ PERDEU NO DIRECT?"
            com 37 caracteres: encurtar a pergunta não devolve nada, o
            que custa é ela ser pergunta. Então ou a pergunta fica
            inteira ou volta a ordem; meio-termo só perde argumento.

            O botão está em 670 numa dobra de 740, e o navegador interno
            do Instagram come mais uns 60: ele está NA BEIRA. Se a taxa
            de quem chega no formulário cair, este é o primeiro suspeito,
            e o campo do Instagram (68px) é o mais caro dos dois.

            A troca também mistura variável de página com variável de
            criativo no meio do lote 01, que a política de LP da matriz
            proíbe: anotar a data no doc do lote, senão o CPL de antes e
            o de depois viram a mesma média.

            "NO DIRECT?" não se separa: é onde a dor acontece, e o nome
            do lugar partido em duas linhas ("no" órfão em cima,
            "direct?" sozinho embaixo) tira a frase da leitura de um
            golpe só. O text-wrap: balance global cuida do resto. */}
        <h1>QUANTAS VENDAS VOCÊ PERDEU ESSA SEMANA <span className={s.noBreak}>NO <em>DIRECT?</em></span></h1>
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
        <p className={s.lead}><b>Foto, preço e tamanho</b> de cada peça em um link só. O pedido chega pronto no WhatsApp.</p>
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
        <div className={s.heroBand} aria-hidden>
          <div className={s.heroBandTrack}>
            {Array.from({ length: 8 }, (_, i) => <span key={i}>Pronta em 7 dias úteis · Sem mensalidade ·</span>)}
          </div>
        </div>
        {/* ---------- uma porta só (13/08) ----------
            Aqui ficavam duas portas lado a lado, a segunda abrindo o
            WhatsApp, mais a linha de preço e a faixa de prova soltas. Agora
            é a etiqueta e nada mais: o preço virou o corpo dela, a prova
            virou o canhoto, e a porta que ninguém atravessava saiu. O
            porquê em números está na nota no topo deste arquivo. */}
        <HeroForm />
      </div>
      <div className={s.heroVisual}>
        <div className={s.phoneWrap}>
          <div className={s.phone} role="img" aria-label="A loja completa da Sölo Urb rolando do topo ao rodapé dentro de um celular: catálogo, páginas de produto e pedido pelo WhatsApp">
            <VitrineDemo />
          </div>
          {/* o chip colado na base do aparelho: a bolinha marca que a loja
              está no ar, o nome diz de quem é, e o rótulo leva para a seção
              com os projetos de clientes */}
          <a className={s.liveTag} href="#projetos" data-cta="hero_projetos" data-cta-dest="projetos">
            <i aria-hidden /> NO AR: SÖLO URB · VER MAIS PROJETOS ↓
          </a>
        </div>
      </div>
    </div>
  </section>;
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
  return <section className={s.quem}>
    <div className={s.quemPhoto}>
      {/* Foto trocada em 13/08 a pedido do Rafael. O arquivo continua P&B
          puro (gerado por `node scripts/foto-quemfaz.mjs <caminho>`, que
          faz resize para 1100px + grayscale): o duotone grafite/papel é
          feito em CSS pelo `.quemPhoto`, e é isso que permite trocar a
          paleta da página sem regerar o asset.
          GOTCHA ao trocar a imagem: o nome do arquivo não muda, então o
          otimizador do Next continua servindo a versão antiga do cache.
          Apagar `.next/cache/images` depois de rodar o script. */}
      {/* `.quemShot` é a janela do impresso e NÃO é embrulho decorativo:
          ela dá à foto um fundo grafite próprio. Sem ele, o pedaço do
          retrato que sobe por cima da borda da seção ficaria sobre papel,
          e o `mix-blend-mode: screen` do duotone estouraria ali em branco.
          Ver a nota longa em `.quem`, no CSS. */}
      <div className={s.quemShot}>
        <Image src="/assets/rafael-quemfaz.jpg" fill sizes="(max-width: 900px) 92vw, 34vw" alt="Rafael Razeira de óculos escuros esportivos, em preto e branco, com montanhas nevadas ao fundo" />
      </div>
      {/* fora da janela e dentro da margem do impresso: era uma linha
          vertical branca por cima da imagem, e com a foto de neve virou
          branco sobre branco. Margem de foto revelada é onde legenda vive. */}
      <span className={s.quemLegenda} aria-hidden>MARINGÁ · PR · EST. 2026</span>
    </div>
    <div className={s.quemTxt}>
      <Eyebrow>QUEM FAZ</Eyebrow>
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
      <h2>Do primeiro oi<br />até a loja no ar:<br /><em>sou eu.</em></h2>
      {/* "Rafael Razeira" e não "Eu sou o Rafael": o "sou eu" já está
          dito, em corpo de manchete, dois centímetros acima. */}
      <p>Rafael Razeira. Desenho, desenvolvo e publico cada vitrine, e é comigo que você fala no WhatsApp. Sem fila de atendimento, sem gerente de conta, sem telefone que ninguém atende.</p>
      {/* ---------- a conta tem que fechar ----------
          Dizia "as duas lojas desta página (...) os outros sete projetos
          do portfólio", e a conta parou de fechar em 07/08, quando a
          Sölo Urb entrou no celular do hero: quem lê acabou de ver TRÊS
          lojas, e o chip embaixo do aparelho diz o nome da terceira.
          Duas mais sete davam dez, num portfólio de nove.
          Agora são três aqui e seis lá. Nove é o número que o canhoto da
          etiqueta, o Quem Faz e o link do portfólio já prometem, e numa
          página cujo argumento inteiro é fato conferível, número que não
          fecha é a coisa mais cara que pode estar escrita.
          "De clientes" ficou só nas duas de baixo, porque é o que elas
          são: a Sölo Urb é projeto meu, e chamá-la de cliente seria
          ganhar uma prova de graça. */}
      <p>A loja que rola no celular aí em cima, e as duas de clientes logo abaixo? Saíram desta mesa, junto com os outros seis projetos do portfólio.</p>
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
        {["MARINGÁ · PR", "9 PROJETOS NO AR", "RESPOSTA NO MESMO DIA"].map(x => <li key={x}>{x}</li>)}
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
      <a className={`${s.button} ${s.acao}`} href="#hero-form" data-cta="quem_faz" data-cta-dest="form">QUERO MINHA VITRINE ↑</a>
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
  return <div className={s.brandband} aria-hidden>
    {/* `.brandband` é um chão RETO em grafite e `.brandTira` é a tira rosa
        girada dentro dele. Os dois níveis existem porque uma diagonal
        cruzando uma borda reta sempre deixa cunhas de fundo sobrando dos
        dois lados: com o chão próprio, o grafite continua por baixo da
        tira e o corte para o papel acontece depois dela, reto contra
        reto. O porquê está por extenso em `.brandband`, no CSS. */}
    <div className={s.brandTira}>
      <div className={s.brandTrack}>
        {Array.from({ length: 6 }, (_, i) => <span key={i}>rafaelrazeira<em>.</em>estudio</span>)}
      </div>
    </div>
  </div>;
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
          {/* "O PROBLEMA E A SOLUÇÃO" prometia uma metade que não existe
              mais: o box escuro da solução saiu em 13/08 (ver a nota logo
              abaixo) e a virada passou a ser o manifesto no pé da seção.
              Rótulo que anuncia o que a seção não entrega gasta a
              confiança de quem confere, e esta página inteira é feita
              para ser conferida. Agora ele diz a função real do bloco:
              explicar a causa da pergunta que o hero fez. */}
          <Eyebrow>POR QUE ISSO ACONTECE</Eyebrow>
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
          <h2>Cada cliente<br />começa<br /><em>do zero.</em></h2>
          {/* o parágrafo perdeu a frase que virou manchete e ganhou a
              ordem certa: primeiro a causa (produto espalhado), depois o
              efeito (o interrogatório), por último o custo (some antes de
              chamar). Antes ele abria pela causa numa oração subordinada,
              o que empurrava o sujeito para a terceira linha. */}
          {/* os três lugares em rosa e cada um torto para um lado: a frase
              diz "espalhados" e agora a linha faz isso, em vez de só
              informar. Ver `.split .espalhado` no CSS, inclusive a razão de
              o desalinho ser mínimo. */}
          <p className={s.lead}>Seus produtos ficam espalhados entre <span className={s.espalhado}>stories</span>, <span className={s.espalhado}>destaques</span> e <span className={s.espalhado}>publicações antigas</span>. Aí o cliente pergunta foto, preço e tamanho, um por um, e muitas vezes desiste antes mesmo de chamar.</p>
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
            <span>perguntas antes de escolher uma peça, e o atendimento recomeça no cliente seguinte</span>
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
          <ChatStrip label="HOJE · O CLIENTE ESPERANDO NO DIRECT" note="Visualizado só às 21:40, e a vontade de comprar não espera duas horas.">
            {questions.map(([text, time, delay]) => <Bubble key={time} out time={time} tick="sent" delay={delay}>{text}</Bubble>)}
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
      <p className={s.manifesto}><span>O INSTAGRAM APRESENTA.</span> <span>A VITRINE <em>RESPONDE.</em></span> <span>VOCÊ SÓ FECHA.</span></p>
    </div>
  </section>;
}

const steps = [
  ["O cliente acessa o link da bio", "Um endereço fixo, sempre atualizado, no lugar mais visto do seu perfil."],
  ["Navega pelas categorias", "Produtos agrupados do jeito que a sua loja vende."],
  /* O título era "Visualiza o produto", que é o verbo mais fraco dos quatro
     e não diz nada: visualizar o quê? Agora ele carrega a tríade que a
     página inteira repete ("foto, preço e tamanho"), nas MESMAS palavras
     do lead do hero e do canhoto da etiqueta. Repetir de propósito é o que
     faz uma promessa virar refrão em vez de virar ruído.
     A descrição amarra na seção anterior: lá em cima quatro balões verdes
     ficaram sem resposta, e o manifesto disse "A VITRINE RESPONDE". Aqui é
     o passo em que isso acontece de fato. "Antes de ele digitar" é o que
     transforma a informação em economia de trabalho SEU, que é a única
     coisa que a lojista compra nesta lista. */
  ["Vê foto, preço e tamanho", "As mesmas perguntas que hoje chegam no seu direct, respondidas antes de ele digitar."],
  ["Chama a loja pelo WhatsApp", "A mensagem já chega com o produto escolhido."],
];
export function HowItWorks() {
  return <section className={s.section} id="como">
    <div className={s.wrap}>
      <Eyebrow>COMO FUNCIONA</Eyebrow>
      {/* A manchete contava os passos e parava aí. Contar passo serve para
          uma coisa só, que é fazer parecer simples, e isso ela já fazia.
          O que faltava é de quem são os passos: os quatro da lista são do
          CLIENTE, do primeiro toque no link até a mensagem pronta. A
          lojista entra depois do quarto, e é isso que ela compra.
          Por isso a frase nova não muda a lista, ela muda quem lê a lista:
          "nenhum deles é seu" transforma quatro tarefas em quatro tarefas
          que saíram do seu dia. E é verdade conferível na própria lista
          logo abaixo, onde o sujeito de todos os quatro é o cliente. */}
      <h2 className={s.h2Duplo}>Do Instagram ao pedido em quatro passos.<br /><em>Nenhum deles é seu.</em></h2>
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
              <h3>{x[0]}{i === steps.length - 1 && <i className={s.chegada}>você entra aqui</i>}</h3>
              <p>{x[1]}</p>
            </div>
          </li>)}</ol>
          {/* no celular o botão não pode vir antes da prova: esta instância
              some e a cópia abaixo do chat assume; no desktop é o contrário */}
          {/* daqui para baixo o formulário mais perto é o da oferta, não o
              do hero: mandar a pessoa subir uma página inteira é pedir para
              ela desistir no caminho */}
          <div className={`${s.actions} ${s.hideMobile}`}><a className={`${s.button} ${s.acao}`} href="#contratar" data-cta="como_funciona" data-cta-dest="form">QUERO UMA ASSIM ↓</a></div>
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
            <Image src="/assets/demo/veritlab-catalogo.jpg" fill sizes="300px" alt="Catálogo da vérít.lab: seis peças em grade, cada uma com nome, medida, preço e selo de peça única" />
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
            <ChatStrip label="COM A VITRINE · O PEDIDO CHEGA PRONTO" note="A mesma noite, sem uma foto sequer no direct: o cliente escolheu sozinho.">
              <Bubble time="19:11">escolhi pela vitrine: o Mickey Mapa, 95 × 65. ainda tem?</Bubble>
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
              <span className={s.intervalo}>1 minuto depois</span>
              <Bubble out time="19:12" tick="read" delay={700}>tem sim! é peça única, separei a sua. te mando o Pix</Bubble>
            </ChatStrip>
          </div>
          <div className={`${s.actions} ${s.mobileOnly}`}><a className={`${s.button} ${s.acao}`} href="#contratar" data-cta="como_funciona" data-cta-dest="form">QUERO UMA ASSIM ↓</a></div>
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
      <h2 className={s.h2Duplo}>Não acredite em mim.<br /><em>Abra as duas.</em></h2>
      <p className={`${s.lead} ${s.leadDark}`}>A Xavier&apos;s Sports vende camisas esportivas. A PR Grife é multimarcas e tem loja física em Maringá. As duas estão no ar, com produto e preço reais, e abrem no seu celular agora.</p>
      <div className={s.projects}>
        {projects.map(x => <article key={x.name}>
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
                <span className={s.live}><i aria-hidden /> NO AR</span>
              </div>
              <a className={s.cover} href={x.url} target="_blank" rel="noopener" aria-label={`Abrir o site do projeto ${x.name} em nova aba`}>
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
                  <img className={s.pageShot} src={x.img} width={x.w} height={x.h} style={{ "--dur": x.dur } as React.CSSProperties} alt={`Página completa da vitrine da ${x.name}`} loading="lazy" decoding="async" fetchPriority="low" />
                </picture>
              </a>
            </div>
            {/* o `.deck`, que desenhava a base do MacBook com o chanfro do
                trackpad, morava aqui e saiu junto com o resto do notebook.
                O porquê está por extenso em `.lapScreen`, no CSS: a prova
                desta seção é o ENDEREÇO, não o aparelho. */}
          </div>
          <div className={s.projMeta}>
            <small>{x.tag}</small>
            <span className={s.kind}>LOJA DE CLIENTE</span>
          </div>
          <h3>{x.name}</h3>
          <p>{x.copy}</p>
          <ul className={s.facts}>{x.facts.map(f => <li key={f}>{f}</li>)}</ul>
          <a className={`${s.button} ${s.acao}`} href={x.url} target="_blank" rel="noopener" data-cta={x.ctaId} data-cta-dest="case">
            {x.cta}
          </a>
        </article>)}
      </div>
      {/* a ponte para o catálogo inteiro: os dois cards acima são a prova
          detalhada, o portfólio é o volume. Link discreto de propósito, para
          não competir com os CTAs verdes dos cards; `data-cta-dest`
          "portfolio" nunca dispara Lead, só ClickCTA. */}
      <Link className={`${s.ghost} ${s.projMore}`} href="/portfolio" data-cta="projetos_portfolio" data-cta-dest="portfolio">
        VER OS 9 PROJETOS NO PORTFÓLIO ↗
      </Link>
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
      <Eyebrow>O QUE ENTRA NOS R$999</Eyebrow>
      <h2 className={s.h2Duplo}>Você manda o material.<br /><em>O resto é comigo.</em></h2>
      <div className={s.grid}>{included.map(x => <article key={x[0]}><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div>
      <details className={s.accordion}>
        <summary>Ver a lista completa, item por item</summary>
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
const panelProof = [
  "Troca preço, foto e descrição na hora",
  "Marca esgotado, últimas unidades ou pronta entrega",
  "Cadastra produto novo e ele entra na vitrine na mesma hora",
];
export function Panel() {
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
          <Eyebrow>O PAINEL DA LOJA</Eyebrow>
          <h2 className={s.h2Duplo}>Depois de publicada,<br /><em>a vitrine é sua.</em></h2>
          <p className={`${s.lead} ${s.leadDark}`}>Junto com a vitrine, você recebe um painel de gestão na identidade da sua loja. Atualizar não depende de programador, nem de mim.</p>
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
              anual e pago no registrador, e isso é dito no acordeão da dobra
              anterior, que é onde o leitor está comparando escopo.
              O ROSA vai só em "Sem mensalidade", que é o fato que fecha a
              objeção mais cara desta dobra. Ele é a única cor de acento da
              seção, e marca uma coisa só. */}
          <p className={s.panelClaim}><b>Sem mensalidade:</b> o painel faz parte da entrega.</p>
        </div>
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
      </div>
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
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [telInvalido, setTelInvalido] = useState(false);
  const envioSuspeito = useGuardaDeFormulario();
  const formRef = useRef<HTMLFormElement>(null);
  const plan = avista ? "À vista R$999" : "Entrada de R$500";
  function goToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    (formRef.current?.elements.namedItem("nome") as HTMLInputElement | null)?.focus({ preventScroll: true });
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
    /* mesmas guardas do mini-formulário do hero: robô ganha a tela de
       confirmação sem efeito nenhum, e telefone inválido nem vira evento */
    if (envioSuspeito(e.currentTarget)) { setEnviado(true); return; }
    const f = new FormData(e.currentTarget);
    if (!whatsappValido(String(f.get("whatsapp") || ""))) { setTelInvalido(true); return; }
    setEnviando(true);
    const { salvo, linkWa: link } = await enviarLeadVitrine({
      nome: String(f.get("nome") || ""),
      whatsapp: String(f.get("whatsapp") || ""),
      instagram: String(f.get("instagram") || ""),
      plano: plan,
      ctaPosition: "form",
    });
    /* guardado nos dois caminhos: serve à confirmação e ao "Falta um toque" */
    setLinkWa(link);
    setEnviando(false);
    if (salvo) setEnviado(true);
  }
  return <section className={`${s.section} ${s.offer}`} id="oferta">
    <div className={s.wrap}>
      <Eyebrow>OFERTA E CONTRATAÇÃO</Eyebrow>
      <h2>Vitrine digital completa por <em>R$999.</em></h2>
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
      <p className={s.lead}>É a mesma vitrine das duas lojas que você abriu aí em cima, com o painel junto. Você reserva com R$500, acompanha o desenvolvimento e só paga o saldo depois de aprovar.</p>
      {/* prova antes do preço: fato verificável, sem citação inventada. Quando
          existir depoimento de cliente, ele entra aqui no lugar desta linha. */}
      <p className={s.proof}><b>PROVA NO AR</b> A PR Grife, multimarcas com loja física em Maringá, publica peça e ajusta o estoque sozinha no painel. <a href="#projetos" data-cta="oferta_projetos" data-cta-dest="projetos">Veja a loja dela acima.</a></p>
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
            <small>VITRINE DIGITAL</small>
            {/* o mesmo "obrigatória" que saiu do fecho da seção do painel:
                a faixa do hero, o canhoto da etiqueta e a FAQ ("Existe
                mensalidade?" → "Não") afirmam sem adjetivo, e o hedge só
                fazia o leitor procurar a pegadinha. */}
            <p className={s.nomensal}>SEM MENSALIDADE</p>
          </div>
          {/* mesma anatomia da etiqueta do hero: moeda e centavos pequenos e
              alçados à altura de maiúscula, inteiro enorme no meio. Os dois
              maiores números da página estavam escritos de jeitos
              diferentes, e é o MESMO preço. */}
          <div className={s.price}><i>R$</i><strong>999</strong><i>,00</i></div>
          <p className={s.installments}><b>R$500 PARA RESERVAR</b><br />R$499 APÓS A SUA APROVAÇÃO</p>
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
          <Button onClick={goToForm} cta="oferta_entrada">QUERO COMEÇAR A MINHA ↓</Button>
          <p className={s.guarantee}>O saldo de R$499 é pago somente depois que você visualizar e aprovar o projeto.</p>
        </article>
        <div className={s.formCol}>
          <ChatStrip label="SUA PRÓXIMA MENSAGEM">
            <Bubble out time="19:15" tick="read">Rafael, quero uma vitrine dessas pra minha loja</Bubble>
          </ChatStrip>
          {/* ---------- a confirmação, quando o lead está gravado ----------
              Ocupa o lugar do formulário. Estado do React, sem navegação e sem
              pop-up, então aparece igual no navegador interno do Instagram,
              que é onde o fluxo antigo quebrava calado. */}
          {enviado ? <div className={`${s.form} ${s.confirmado}`} role="status">
            <p className={s.formTitle}>RECEBI SEUS DADOS<br /><span>Te chamo no WhatsApp ainda hoje.</span></p>
            {/* A segunda frase era "Sua reserva não foi cobrada: nada é
                pago antes de a gente combinar os detalhes", e ela existia
                para consertar o susto que o botão "QUERO RESERVAR" dava.
                Com o botão dizendo a verdade e o formulário avisando
                "nada é cobrado agora" ANTES do envio, ela virou a negação
                de uma coisa que ninguém prometeu, e negação assim planta
                a dúvida em quem não tinha. */}
            <p>Vou olhar sua loja antes de falar com você, para a conversa já começar com uma direção.</p>
            <a className={`${s.button} ${s.primary}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">
              QUER AGILIZAR? ME CHAMA AGORA ↗
            </a>
          </div> : <form ref={formRef} onSubmit={submit} className={s.form} id="contratar">
            {/* mesma correção do botão do card: o título dizia "RESERVAR
                MINHA VITRINE" e a linha abaixo dele anunciava uma entrada,
                o que faz o formulário parecer um checkout. Ele não é.
                "Quando a gente combinar" é o que estava faltando: a
                condição continua dita, mas com o momento dela junto, e a
                segunda frase fecha a porta da dúvida antes de o dedo
                chegar no primeiro campo. */}
            <p className={s.formTitle}>COMEÇAR MINHA VITRINE<br /><span>Entrada de R$500 quando a gente combinar. Nada é cobrado agora.</span></p>
            <label>NOME<input name="nome" autoComplete="name" required /></label>
            {/* O campo que esta página nunca teve. Ver a nota longa no submit:
                sem número não dá para cumprir a promessa da tela de
                confirmação, e era o handoff que carregava essa informação. */}
            <label>WHATSAPP<input name="whatsapp" type="tel" autoComplete="tel" placeholder="(00) 00000-0000" required maxLength={16}
                   onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); if (telInvalido) setTelInvalido(false); }} /></label>
            {telInvalido && <small role="alert" style={{ color: "#b3261e" }}>Confere o número: é por ele que eu te chamo. Ex.: (44) 99999-0000.</small>}
            <CampoIsca />
            {/* "NOME DA LOJA" saiu: o @ do instagram já entrega o nome, e eram
                dois campos obrigatórios para uma informação só. O que sobrou
                virou opcional, porque nome e telefone bastam para eu chamar. */}
            <label>INSTAGRAM OU SITE DA LOJA <i className={s.opcional}>opcional</i><input name="instagram" placeholder="@sualoja" /></label>
            <label className={s.avista}>
              <input type="checkbox" name="avista" checked={avista} onChange={e => setAvista(e.target.checked)} />
              Prefiro pagar os R$999 à vista
            </label>
            {/* sem a seta ↗: o envio agora acontece na própria tela. Rosa
                porque é um dos três lugares da página que a cor dos 10%
                ocupa, e os três são a mesma ação. */}
            {/* o mesmo rótulo do botão de envio da etiqueta do hero, e de
                propósito: os dois formulários fazem exatamente a mesma
                coisa (gravam o contato e eu chamo), então chamar um de
                "reservar" e o outro de "quero minha vitrine" era inventar
                uma diferença que não existe. Uma ação, um nome. */}
            <button className={`${s.button} ${s.acao}`} disabled={enviando}>
              {enviando ? "ENVIANDO…" : "QUERO MINHA VITRINE"}
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
              ? <div className={s.pendente} role="status">
                  <b>Falta um toque.</b>
                  <p>Abri o WhatsApp com sua mensagem pronta. Toque em <b>enviar</b> lá para eu receber, senão ela não chega.</p>
                  <a className={`${s.button} ${s.primary}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">
                    ABRIR O WHATSAPP ↗
                  </a>
                </div>
              : <p className={s.micro} role="status">Ao enviar, recebo seu pedido e te chamo no WhatsApp. Não peço dados de cartão nesta etapa.</p>}
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
const process = [
  ["Reserva", "Você paga R$500 e manda o material da loja."],
  ["Criação", "Eu desenho, desenvolvo e monto o catálogo."],
  ["Aprovação", "Você revisa a vitrine pronta e pede a rodada de ajustes."],
  ["Publicação", "Depois da sua aprovação e do saldo, a vitrine entra no ar."],
];
export function Process() {
  return <section className={`${s.section} ${s.dark}`}>
    <div className={s.wrap}>
      {/* "PROCESSO E SEGURANÇA" prometia uma metade que a seção não
          entrega: a única coisa de "segurança" aqui é o selo do
          processador de pagamento, que fala do meio e não do risco dela.
          O rótulo novo diz o que os quatro passos abaixo realmente são,
          que é o percurso do sim até a loja funcionando. */}
      <Eyebrow>DO SIM À LOJA NO AR</Eyebrow>
      {/* ---------- a garantia dita como gente ----------
          Era "Você acompanha o projeto antes de concluir o pagamento".
          "Concluir o pagamento" é frase de tela de checkout, e "acompanha
          o projeto" é vago: acompanha como, vendo o quê?
          O que de fato acontece é melhor do que a versão burocrática: ela
          vê a loja PRONTA, e só então paga a segunda metade. São R$500 e
          R$499, ou seja, metade fica retida até ela aprovar, e isso é a
          resposta para a única pergunta que sobra nesta altura da página
          ("e se eu pagar e não gostar?").
          Cuidado ao mexer nisto: NÃO existe política de reembolso escrita,
          então a frase pode dizer o que fica retido, e não pode prometer
          devolução do que já foi pago. */}
      <h2>Você vê a loja pronta<br /><em>antes de pagar o resto.</em></h2>
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
        <span className={s.badge}>✓ PAGAMENTO PROCESSADO EM AMBIENTE SEGURO</span>
        <Link className={s.ghost} href="/termos">VER ESCOPO E TERMOS</Link>
      </div>
    </div>
  </section>;
}

/* ============================================================
   A MANCHETE DESTA SEÇÃO CONTA OS "NÃO" DAQUI DE DENTRO.

   Ela diz "três destas respostas começam com não", e hoje são
   exatamente três: pagamento (1ª), mensalidade (3ª) e pagar tudo
   antes (6ª). Quem lê confere em dez segundos, que é o motivo de a
   frase funcionar, e seria também o motivo de ela ser perigosa.

   POR ISSO O NÚMERO NÃO ESTÁ ESCRITO NA MANCHETE: ele é contado
   desta lista a cada render, por `NAOS_DA_FAQ` logo abaixo. Item
   novo que comece com "Não", ou item que saia, e a manchete se
   corrige sozinha, incluindo a concordância do verbo.

   Esse tipo de conta já quebrou uma vez nesta página: o Quem Faz
   dizia "as duas lojas desta página e os outros sete projetos"
   depois que uma terceira loja entrou no hero, e a soma passou a
   dar dez num portfólio de nove. Aquela ficou de manutenção manual
   porque as peças moram em quatro lugares diferentes; esta não
   precisa, porque a lista está aqui do lado.
   ============================================================ */
const faq = [
  ["A vitrine recebe pagamentos dos meus clientes?", "Não. A vitrine organiza o catálogo e leva o pedido pronto para o WhatsApp da loja, onde você combina pagamento e entrega."],
  ["Quantos produtos estão incluídos?", "Até 20 produtos no cadastro inicial, todos cadastrados por mim. Novos cadastros podem ser combinados depois."],
  ["Existe mensalidade?", "Não. O projeto custa R$999 uma única vez. Um domínio próprio é opcional e tem custo anual pago direto no registrador."],
  ["Quem atualiza a vitrine depois?", "Você mesmo, pelo painel que acompanha a vitrine: troca preço e foto, marca esgotado ou pronta entrega e cadastra produtos novos."],
  ["Quanto tempo demora?", "Até 7 dias úteis depois do envio de todos os materiais da loja."],
  ["Preciso pagar tudo antes?", "Não. São R$500 para reservar e R$499 somente depois da apresentação e da sua aprovação do projeto."],
];
/* por extenso porque é manchete: numeral em algarismo no meio de uma frase
   em caixa alta lê como preço, não como quantidade. Sete posições bastam
   (a lista tem seis itens e o índice 0 nunca é usado). */
const PORTEXTENSO = ["nenhuma", "Uma", "Duas", "Três", "Quatro", "Cinco", "Seis"];
const NAOS_DA_FAQ = faq.filter(([, resposta]) => resposta.startsWith("Não.")).length;
export function FAQ() {
  return <section className={s.section} id="faq">
    <div className={s.wrap}>
      {/* eram dois rótulos empilhados ("DÚVIDAS FREQUENTES" e "Antes de
          contratar."), nenhum dos dois dizendo nada. O rótulo desceu para
          o eyebrow, que é o lugar de rótulo, e a manchete passou a fazer
          trabalho: ela conta os "não" da lista logo abaixo.
          Por que contar os "não" é o melhor argumento disponível aqui:
          numa página que promete o tempo todo, esta é a única dobra onde
          o que aparece são os LIMITES do que se compra, e dizê-los antes
          de a pessoa perguntar é a prova mais barata de que o resto é
          verdade. De quebra, número que dá para conferir faz abrir os
          acordeões, que é exatamente o que uma FAQ fechada precisa.
          A contagem tem manutenção: ver a nota grande junto da lista. */}
      <Eyebrow>ANTES DE CONTRATAR</Eyebrow>
      <h2 className={s.h2Duplo}>{PORTEXTENSO[NAOS_DA_FAQ]} desta{NAOS_DA_FAQ > 1 ? "s" : ""} resposta{NAOS_DA_FAQ > 1 ? "s" : ""}<br />começa{NAOS_DA_FAQ > 1 ? "m" : ""} com <em>não.</em></h2>
      {/* ---------- a manchete passou a ser conferível na hora ----------
          Ela promete que três respostas começam com "não", e até 13/08 a
          única forma de verificar isso era abrir os seis acordeões. Numa
          página cujo argumento inteiro é fato conferível, deixar a própria
          manchete precisando de seis cliques para se provar era o pior
          lugar possível para esconder uma informação.

          Agora a etiqueta marca quais são, e ela sai do MESMO teste que
          conta o número na manchete (`resposta.startsWith("Não.")`), não
          de uma lista escrita à mão. Reescrever uma resposta para começar
          com "não", ou tirar o "não" de outra, muda a contagem e as
          etiquetas juntas. Duas fontes de verdade aqui viravam um erro
          silencioso na primeira revisão de copy.

          E o argumento não se perde por ser revelado: quem lê já sabia
          que existem três, a etiqueta só diz ONDE. O que ela ganha é
          quem passa batido pela dobra sem abrir nada, que é a maioria. */}
      <div className={s.faq}>{faq.map(([pergunta, resposta]) => <details key={pergunta}>
        <summary>
          <span className={s.faqPergunta}>
            {pergunta}
            {resposta.startsWith("Não.") && <i className={s.faqNao}>não</i>}
          </span>
        </summary>
        <p>{resposta}</p>
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
  return <>
    <section id="fim" className={`${s.section} ${s.dark} ${s.final}`}>
      <Eyebrow>AGENDA ABERTA</Eyebrow>
      {/* nona e última manchete a entrar na régua de duas larguras, e a
          quebra é o que faltava para ela funcionar: "vender melhor." vinha
          colada no fim da terceira linha, com o mesmo corpo do preparo, e
          a frase inteira chegava como um bloco só. É a promessa que a
          página inteira sustenta, e ela merecia a batida. */}
      <h2 className={s.h2Duplo}>Sua loja já tem produtos.<br />Agora precisa de uma estrutura para<br /><em>vender melhor.</em></h2>
      {/* quem chega aqui leu a página inteira: o pedido pode ser o cheio,
          sem rodeio, e o caminho é o mesmo formulário de sempre */}
      <p className={s.lead}>Deixa seu nome e WhatsApp que eu te chamo hoje e te mostro como a vitrine ficaria para a sua loja. Se você já decidiu, reserva com R$500.</p>
      <div className={s.actions}>
        <a className={`${s.button} ${s.acao}`} href="#contratar" data-cta="final" data-cta-dest="form">DEIXAR MEU CONTATO ↑</a>
        <a className={s.ghost} href="#oferta" data-cta="final_reserva" data-cta-dest="oferta">VER O QUE ESTÁ INCLUSO</a>
      </div>
    </section>
    <footer className={s.footer}>
      <div className={s.brand}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav><Link href="/estudio/">INÍCIO</Link><Link href="/portfolio">PORTFÓLIO</Link><Link href="/servicos">SERVIÇOS</Link><Link href="/e-commerce">E-COMMERCE</Link><Link href="/termos">TERMOS</Link><Link href="/privacidade">PRIVACIDADE</Link></nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
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
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const offer = document.getElementById("oferta");
    const end = document.getElementById("fim");
    let focused = false, inOffer = false, inEnd = false, cedo = true;
    const update = () => setHidden(focused || inOffer || inEnd || cedo);
    const onFocus = (e: FocusEvent) => { focused = !!(e.target as HTMLElement)?.closest?.("form"); update(); };
    const onBlur = () => { focused = false; update(); };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    const medir = () => {
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
    return () => { document.removeEventListener("focusin", onFocus); document.removeEventListener("focusout", onBlur); window.removeEventListener("scroll", medir); window.removeEventListener("resize", medir); offerIO?.disconnect(); endIO?.disconnect(); };
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
  return <div className={`${s.bar} ${hidden ? s.barHidden : ""}`}>
    <span className={s.barCopy}><b>R$999</b><span>Reserva com R$500</span></span>
    <a className={`${s.button} ${s.acao}`} href="#contratar" data-cta="sticky_mobile" data-cta-dest="form">DEIXAR CONTATO</a>
  </div>;
}
