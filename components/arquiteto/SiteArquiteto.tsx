"use client";

/* ============================================================
   A /arquitetos (12/11/2026): a página que vende o site de
   escritório de arquitetura. Pedido do Rafael: "uma landing page voltada
   para a venda de site para arquiteto, a referência é a NEAM"; a proposta
   e o preço foram decididos na sessão (ARQUITETO em lib/oferta.ts).

   O que segura a página honesta, e por quê:
   • A NEAM não aparece (decisão do Rafael, 12/11): o núcleo ainda não
     aprovou o site e a ACIM pede aprovação de toda arte com a logo dela.
     O que herda dela é o desenho: as frentes com a foto num palco à
     esquerda e a lista à direita, trocando a foto por uma "varredura".
   • O escritório da moldura é um EXEMPLO ("Seu nome Arquitetura"), com o
     rótulo o tempo todo. As fotos são do Pexels (licença livre, uso
     comercial sem atribuição): Alef Morais (casa-jardim), e as outras da
     busca de 12/11 em public/arquiteto. Fichas de projeto (área, cidade,
     ano) só existem dentro do exemplo; nenhuma é dada como obra real.
   • Nenhum número de resultado: o estúdio ainda não tem escritório de
     arquitetura no ar pago (cofre, escrever-um-caso: número só medido).

   O formulário é o mesmo caminho da /loja-online (lead-flow.ts), com
   `pagina: "arquitetos"`: a rota confere o @ e o card nasce
   como "site", com a nota de que não é loja.
   ============================================================ */

import { cloneElement, CSSProperties, FormEvent, Fragment, isValidElement, ReactNode, useEffect, useRef, useState } from "react";
import s from "./arquiteto.module.css";
import { CampoIsca, useGuardaDeFormulario } from "@/components/form-guarda";
import { mascararWhatsapp, whatsappValido } from "@/components/telefone";
import { diagnosticoDoArroba, enviarLeadVitrine, ESPACO_NO_ARROBA, registrarSuspeito, temEspaco, type DiagnosticoArroba } from "@/components/vitrine/lead-flow";
import type { LojaEncontrada } from "@/components/lead";
import { focarSemContar, initTracking } from "@/components/vitrine/tracking";
import { ligarAncoras } from "@/components/vitrine/ancora";
import { IconeInstagram, IconeWhatsApp, textoDe } from "@/components/vitrine/sections";
import { linkWhatsApp, WHATSAPP_EXIBIDO } from "@/lib/contato";
import { ARQUITETO } from "@/lib/oferta";

const PAGINA = "arquitetos";
const ABERTURA = "Oi Rafael! Quero ver a amostra do site do meu escritório.";
const real = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const TOTAL = real(ARQUITETO.total);
const ENTRADA = real(ARQUITETO.entrada);
const SALDO = real(ARQUITETO.saldo);
const CTA = "Mandar o @ do escritório";
const d = (n: number) => ({ "--d": n } as CSSProperties);

/* ---------- o escritório de exemplo ----------
   As fotos (12/11, pedido do Rafael com cinco buscas do Pinterest como
   referência: arquitetura brasileira, aesthetic, industrial, loft,
   brutalista). As do Pinterest NÃO entram: são de arquitetos e fotógrafos,
   sem licença. Estas são do Unsplash (licença livre, uso comercial, fora as
   pagas "Unsplash+"), no mesmo clima: casa tropical, concreto quente com
   verde, loft. `pos` é o object-position na tela cheia: o cartão de vidro
   fica embaixo à esquerda, então o assunto vai para cima ou para a direita. */
type Foto = { src: string; alt: string; pos?: string };
const F = (nome: string, alt: string, pos = "50% 50%"): Foto => ({ src: `/arquiteto/${nome}`, alt, pos });
const PROJETOS: (Foto & { nome: string; ficha: string })[] = [
  { ...F("casa-madeira", "Casa de dois andares com o volume de cima revestido de madeira, palmeiras na frente", "50% 45%"), nome: "Casa Madeira", ficha: "Residencial, 280 m², 2025" },
  { ...F("casa-tropical", "Casa térrea com teto jardim, piscina e gramado, sob céu azul", "50% 55%"), nome: "Casa Jardim Alto", ficha: "Residencial, 420 m², 2024" },
  { ...F("casa-curva", "Casa de concreto com telhado curvo no meio da vegetação", "50% 88%"), nome: "Casa Curva", ficha: "Residencial, 190 m², 2025" },
  { ...F("casa-palmeiras", "Volumes brancos e de madeira entre palmeiras", "50% 40%"), nome: "Casa das Palmeiras", ficha: "Residencial, 350 m², 2023" },
  { ...F("interior-concreto", "Salão com pilar de concreto e janelas do chão ao teto", "50% 50%"), nome: "Ateliê Pilar", ficha: "Comercial, 160 m², 2024" },
];
const src = (f: Foto, w: 800 | 1600) => `${f.src}-${w}.webp`;
const srcSet = (f: Foto) => `${f.src}-800.webp 800w, ${f.src}-1600.webp 1600w`;

/* ============================================================ */

function Analytics() {
  useEffect(() => {
    initTracking({ page: PAGINA, valor: ARQUITETO.total, currency: "BRL", lang: "pt" });
    ligarAncoras();
  }, []);
  return null;
}

/* a foto que entra por uma varredura da esquerda, como uma folha nova
   cobrindo a anterior. Uma só classe de troca para a moldura e as frentes. */
function Varredura({ fotos, ativa, sizes, eager = false, fundir = false }: { fotos: Foto[]; ativa: number; sizes: string; eager?: boolean; fundir?: boolean }) {
  const [anterior, setAnterior] = useState(ativa);
  const atual = useRef(ativa);
  useEffect(() => {
    if (ativa === atual.current) return;
    setAnterior(atual.current);
    atual.current = ativa;
  }, [ativa]);
  return <>{fotos.map((f, i) => {
    /* a primeira foto já nasce posta; só a troca varre */
    const troca = fundir ? s.funde : anterior !== ativa ? s.varre : "";
    const papel = i === ativa ? `${s.fotoAtiva} ${troca}` : i === anterior ? s.fotoAnterior : "";
    return /* eslint-disable-next-line @next/next/no-img-element */ <img key={f.src} className={`${s.foto} ${papel}`}
      src={src(f, 1600)} srcSet={srcSet(f)} sizes={sizes} alt={i === ativa ? f.alt : ""} aria-hidden={i !== ativa}
      style={{ objectPosition: f.pos }} loading={eager && i === 0 ? "eager" : "lazy"} decoding="async"
      fetchPriority={eager && i === 0 ? "high" : undefined} />;
  })}</>;
}

/* ---------- a entrada da /vitrine-digital (12/11, "coloca animação igual da vitrine-digital") ----------
   A mesma da vitrine e da /loja-online: o título letra a letra saindo do
   desfoque, e o resto do bloco (marcado com .entra e a ordem em --d) subindo
   14px logo atrás. Dispara uma vez, quando a seção entra na tela. Não arma:
   com "reduzir movimento", e na seção que já está na tela quando a página
   abre (senão piscaria: visível, some, entra). Sem JavaScript, tudo aparece:
   a classe que esconde só entra depois de montar. */
function Secao({ className = "", children, ...resto }: React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<"" | "armado" | "visto">("");
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
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
/* o título letra a letra: a palavra inteira fica junta (não quebra no meio; o
   espaço fica FORA do span, senão gruda na vizinha), o <em> verde é mantido, e
   o texto nítido vai para o leitor de tela. `carga`: o do hero, que anima ao
   abrir a página, sem esperar a rolagem. */
function Titulo({ como: Tag = "h2", className = "", carga = false, children }: { como?: "h1" | "h2"; className?: string; carga?: boolean; children: ReactNode }) {
  let i = 0;
  const parte = (txt: string) => txt.split(/(\s+)/).map((w, k) => /^\s+$/.test(w) || !w ? w
    : <span key={k} className={s.palavra}>{[...w].map((c, j) => <span key={j} className={s.letra} style={{ "--i": i++ } as CSSProperties}>{c}</span>)}</span>);
  const letras = (n: ReactNode): ReactNode => {
    if (typeof n === "string" || typeof n === "number") return parte(String(n));
    if (Array.isArray(n)) return n.map((x, k) => <Fragment key={k}>{letras(x)}</Fragment>);
    if (isValidElement<{ children?: ReactNode }>(n)) return cloneElement(n, undefined, letras(n.props.children));
    return n;
  };
  return <Tag className={`${className} ${carga ? s.carga : ""}`}><span className={s.soLeitor}>{textoDe(children)}</span><span aria-hidden>{letras(children)}</span></Tag>;
}
const E = (n: number, outra = "") => ({ className: `${outra} ${s.entra}`, style: d(n) });

/* ---------- o hero: a manchete e o site de exemplo na moldura ---------- */
function Hero() {
  const [i, setI] = useState(0);
  const [parado, setParado] = useState(false);
  useEffect(() => {
    if (parado || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") setI(n => (n + 1) % PROJETOS.length); }, 4800);
    return () => clearInterval(t);
  }, [parado]);
  const p = PROJETOS[i];
  /* ---------- o hero em tela cheia (12/11, escolha do Rafael entre quatro) ----------
     A tela inteira é o site de exemplo, no formato da bloco.arq.br: a foto trocando
     devagar. O texto num cartão de vidro embaixo à esquerda; a ficha do projeto e o
     rótulo de exemplo embaixo à direita. Manchete escolhida por ele no mesmo dia. */
  return <section className={s.heroCheio} id="topo">
    <div className={s.heroFotos}>
      <Varredura fotos={PROJETOS} ativa={i} sizes="100vw" eager fundir />
    </div>
    <div className={`${s.heroCartao} ${s.sobe}`} style={d(1)}>
      <Titulo como="h1" className={s.h1} carga>Um site à altura <em>dos seus projetos.</em></Titulo>
      <p className={s.heroLead}>Mande o @ do escritório e veja em até {ARQUITETO.amostraHoras}h como ficaria o seu, com as suas obras.</p>
      <FormAmostra noHero />
    </div>
    {/* a ficha da obra num cartão só (12/11, "melhora isso"): eram três peças soltas,
        a caixa escura do nome, o selo do exemplo e os tracinhos. Agora o mesmo vidro
        dos cartões, e os tracinhos viram barra de progresso, como nos stories: a da
        obra atual enche no tempo da troca (4,8s). Parado pelo clique, não enche. */}
    <div className={`${s.heroFicha} ${s.sobe}`} style={d(3)}>
      <p className={s.heroRotulo}>Escritório de exemplo</p>
      <div key={i} className={s.trocaTexto} aria-live="polite">
        <p className={s.demoNome}>{p.nome}</p>
        <p className={s.demoDado}>{p.ficha}</p>
      </div>
      <div className={`${s.demoPassos} ${parado ? "" : s.correndo}`}>
        {PROJETOS.map((x, n) => <button key={x.nome} type="button" aria-label={`Ver ${x.nome}`} aria-pressed={n === i}
          className={n < i ? s.passou : ""} onClick={() => { setI(n); setParado(true); }} />)}
      </div>
    </div>
  </section>;
}

/* ---------- o Instagram e o site, lado a lado ---------- */
function DoisLugares() {
  return <Secao className={s.secao} id="o-problema">
    <div className={s.wrap}>
      <Titulo className={s.h2}>No Instagram, a obra vira post. <em>No site, vira projeto.</em></Titulo>
      <div {...E(1, s.comparar)}>
        <div className={s.cartao}>
          <p className={s.cartaoTitulo}>Só no Instagram</p>
          <ul className={s.marcas}>
            <li><Xis />O projeto picado em vários posts, entre um reels e outro</li>
            <li><Xis />Quem pesquisa o seu nome no Google não acha o seu trabalho</li>
            <li><Xis />A primeira mensagem é &quot;quanto custa um projeto?&quot;</li>
          </ul>
        </div>
        <div className={`${s.cartao} ${s.cartaoSite}`}>
          <p className={s.cartaoTitulo}>Com o site</p>
          <ul className={s.marcas}>
            <li><Check />Cada projeto numa página, com as fotos grandes e a ficha</li>
            <li><Check />O seu nome e a sua cidade escritos do jeito que o Google lê</li>
            <li><Check />A mensagem chega com o tipo de obra, a área e o momento</li>
          </ul>
        </div>
      </div>
    </div>
  </Secao>;
}

/* ---------- o que vem no site ----------
   O seletor em pílula da referência da OpenAI (12/11) trocando o painel:
   texto à esquerda, a foto à direita entrando pela varredura (o giro da
   folha, herdado da NEAM). Não é sequência, então sem número. */
const FRENTES: { aba: string; titulo: string; texto: string; foto: Foto }[] = [
  { aba: "Projetos", titulo: "Os projetos", texto: "Uma página por projeto: as fotos em tela cheia, a ficha (tipo, área, cidade, ano) e a história da obra.", foto: F("concreto-bruto", "Interior de concreto aparente com volumes e aberturas", "50% 40%") },
  { aba: "Escritório", titulo: "O escritório", texto: "Quem assina, a formação, a equipe e o que você faz e não faz. O cliente chega sabendo com quem fala.", foto: F("loft-madeira", "Loft de pé-direito alto com piso de madeira e luz do sol entrando", "60% 50%") },
  { aba: "Processo", titulo: "Como você trabalha", texto: "As etapas do briefing à obra, ditas com as suas palavras. Menos explicação repetida no WhatsApp.", foto: F("galeria-concreto", "Galeria de concreto aberta para a montanha", "60% 50%") },
  { aba: "Contato", titulo: "O contato com briefing", texto: "Quem visita conta a obra antes de falar com você. A mensagem chega pronta no seu WhatsApp.", foto: F("loft-tijolo", "Loft industrial com parede de tijolo e mezanino", "60% 50%") },
  { aba: "Google", titulo: "Pronto para o Google e o celular", texto: "Título, descrição e fotos leves, para abrir rápido no 4G e para o Google entender quem você é e onde atende.", foto: F("sala-sol", "Sala industrial com a sombra das janelas no chão", "60% 50%") },
];

function Frentes() {
  const [i, setI] = useState(0);
  const f = FRENTES[i];
  /* a pílula que desliza (12/11, "falta as transições entre as abas"): mede a aba
     ativa e leva o fundo preto até ela. As abas quebram linha no celular, então
     mede o topo também. Remede ao mudar a largura da tela. */
  const abas = useRef<HTMLDivElement>(null);
  const [pilula, setPilula] = useState<CSSProperties | null>(null);
  useEffect(() => {
    const medir = () => {
      const b = abas.current?.children[i] as HTMLElement | undefined;
      if (b) setPilula({ width: b.offsetWidth, height: b.offsetHeight, transform: `translate(${b.offsetLeft}px, ${b.offsetTop}px)` });
    };
    medir();
    /* remede quando as abas mudam de tamanho, não só a janela (12/11: com a janela
       da aba ao lado, o cartão estreitou, as abas quebraram de linha depois da
       medida e a pílula ficou fora do cartão, na posição antiga) */
    const ro = new ResizeObserver(medir);
    if (abas.current) ro.observe(abas.current);
    document.fonts?.ready.then(medir);
    return () => ro.disconnect();
  }, [i]);
  /* 12/11 ("não tem continuidade de design"): a mesma cena do hero, a foto de ponta a
     ponta e o cartão de vidro; a foto troca com a aba */
  return <Secao className={s.cena} id="o-que-vem">
    <div className={s.cenaFotos}><Varredura fotos={FRENTES.map(x => x.foto)} ativa={i} sizes="100vw" /></div>
    <div className={s.cenaCartao}>
      <Titulo className={s.h2}>Tudo o que o cliente procura <em>antes da primeira reunião.</em></Titulo>
      <p {...E(1, s.cenaDica)}>Toque em cada parte para ver como ela fica no seu site.</p>
      <div {...E(1, `${s.abas} ${pilula ? s.abasComPilula : ""}`)} role="tablist" aria-label="O que vem no site" ref={abas}>
        {FRENTES.map((x, n) => <button key={x.titulo} type="button" role="tab" id={`aba-${n}`} aria-controls="frente-painel" aria-selected={n === i} tabIndex={n === i ? 0 : -1}
          onClick={() => setI(n)}
          onKeyDown={e => { const k = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!k) return; e.preventDefault(); const m = (i + k + FRENTES.length) % FRENTES.length; setI(m); (e.currentTarget.parentElement?.children[m] as HTMLElement)?.focus(); }}>
          {x.aba}</button>)}
        {pilula && <span className={s.pilula} style={pilula} aria-hidden />}
      </div>
      <div key={i} className={`${s.frenteTexto} ${s.trocaTexto}`} role="tabpanel" id="frente-painel" aria-labelledby={`aba-${i}`}>
        <p className={s.frenteTitulo}>{f.titulo}</p>
        <p>{f.texto}</p>
      </div>
    </div>
    {/* 12/11 ("ficou boa mas não dá para entender completamente"): a foto de fundo
        não mostrava o que a aba diz. A janela mostra AQUELA parte do site do
        arquiteto, trocando junto com a aba. Desenhada, não captura. */}
    <div key={`tela-${i}`} className={`${s.janelaAba} ${s.trocaTexto}`} aria-hidden>
      <p className={s.telaBarra}><i /><i /><i /><span>seunome.arq.br{["/projetos/casa-curva", "/escritorio", "/como-trabalhamos", "/contato", ""][i]}</span></p>
      <TelaAba n={i} />
    </div>
  </Secao>;
}

/* o que cada aba mostra do site do arquiteto (o exemplo, com dado de exemplo) */
function TelaAba({ n }: { n: number }) {
  const foto = (f: Foto, pos?: string) => /* eslint-disable-next-line @next/next/no-img-element */ <img src={src(f, 800)} alt="" loading="lazy" decoding="async" style={{ objectPosition: pos ?? f.pos }} />;
  if (n === 0) return <div className={s.abaProjeto}>
    <div className={s.abaFoto}>{foto(PROJETOS[2])}<b>Casa Curva</b></div>
    <dl className={s.abaFicha}>
      <div><dt>Local</dt><dd>Maringá, PR</dd></div><div><dt>Área</dt><dd>190 m²</dd></div>
      <div><dt>Ano</dt><dd>2025</dd></div><div><dt>Tipo</dt><dd>Residencial</dd></div>
    </dl>
    <p className={s.abaTexto}>Uma casa térrea pensada a partir do terreno em declive, com o telhado curvo acompanhando o relevo.</p>
  </div>;
  if (n === 1) return <div className={s.abaEscritorio}>
    <div className={s.abaFotoQuadrada}>{foto(FRENTES[1].foto)}</div>
    <div>
      <p className={s.abaTituloP}>O escritório</p>
      <p className={s.abaTexto}>Arquitetura residencial e de interiores em Maringá. Cada projeto começa ouvindo como a família vive.</p>
      <p className={s.abaRotulo}>Equipe</p>
      <div className={s.abaEquipe}><span>AL</span><span>MR</span><span>JS</span></div>
    </div>
  </div>;
  if (n === 2) return <div className={s.abaProcesso}>
    <p className={s.abaTituloP}>Como trabalhamos</p>
    <ol>{[["Briefing", "a conversa sobre o que você precisa"], ["Estudo", "as primeiras plantas e o volume"], ["Projeto", "o executivo, pronto para a obra"], ["Obra", "o acompanhamento até a entrega"]].map(([t, d], k) =>
      <li key={t}><span>{String(k + 1).padStart(2, "0")}</span><b>{t}</b><em>{d}</em></li>)}</ol>
  </div>;
  if (n === 3) return <div className={s.abaContato}>
    <p className={s.abaTituloP}>Vamos conversar sobre a sua obra</p>
    <p className={s.abaRotulo}>O que você precisa?</p>
    <div className={s.abaChips}><span className={s.abaChipOn}>Casa</span><span>Apartamento</span><span>Interiores</span></div>
    <p className={s.abaRotulo}>Em que momento está?</p>
    <div className={s.abaChips}><span className={s.abaChipOn}>Tenho o terreno</span><span>Vou reformar</span></div>
    <span className={s.abaZap}><IconeWhatsApp size={14} />Enviar pelo WhatsApp</span>
  </div>;
  return <div className={s.abaBusca}>
    <p className={s.abaCampoBusca}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>seu nome arquitetura</p>
    <div className={s.abaResultado}>
      <p className={s.abaUrl}>seunome.arq.br</p>
      <p className={s.abaLink}>Seu Nome Arquitetura | Projetos residenciais em Maringá</p>
      <p className={s.abaTexto}>Casas, apartamentos e interiores. Veja os projetos, conheça o escritório e conte a sua obra pelo WhatsApp.</p>
    </div>
    <div className={s.abaResultado}><p className={s.abaUrl}>instagram.com</p><p className={s.abaLinkFraco}>Seu Nome Arquitetura (@seuescritorio)</p></div>
  </div>;
}

/* ---------- o briefing: o que chega no WhatsApp do arquiteto ----------
   A única parte que se mexe pela mão da pessoa: ela escolhe e vê a
   mensagem que o cliente dela mandaria. */
const TIPOS = ["Casa", "Apartamento", "Comercial", "Interiores"] as const;
const AREAS = ["até 100 m²", "100 a 250 m²", "mais de 250 m²"] as const;
const MOMENTOS = ["Tenho o terreno", "Vou reformar", "Já estou em obra"] as const;

function Chips<T extends string>({ rotulo, opcoes, valor, mudar }: { rotulo: string; opcoes: readonly T[]; valor: T; mudar: (v: T) => void }) {
  return <fieldset className={s.chips}>
    <legend>{rotulo}</legend>
    <div>{opcoes.map(o => <button key={o} type="button" className={s.chip} aria-pressed={o === valor} onClick={() => mudar(o)}>{o}</button>)}</div>
  </fieldset>;
}

function Briefing() {
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("Casa");
  const [area, setArea] = useState<(typeof AREAS)[number]>("100 a 250 m²");
  const [momento, setMomento] = useState<(typeof MOMENTOS)[number]>("Tenho o terreno");
  /* 12/11 ("a copy da mensagem está ruim"): era um telegrama ("Quero o projeto de uma
     casa, 100 a 250 m². Tenho o terreno."). Agora é como gente escreve no WhatsApp. */
  const projeto = { Casa: "fazer o projeto da minha casa", Apartamento: "fazer o projeto do meu apartamento", Comercial: "fazer o projeto do meu espaço comercial", Interiores: "fazer os interiores do meu imóvel" }[tipo];
  const tamanho = { "até 100 m²": "com até 100 m²", "100 a 250 m²": "com 100 a 250 m²", "mais de 250 m²": "com mais de 250 m²" }[area];
  const fase = { "Tenho o terreno": "Já tenho o terreno.", "Vou reformar": "É uma reforma.", "Já estou em obra": "A obra já começou." }[momento];
  return <Secao className={s.secao} id="briefing">
    <div className={`${s.wrap} ${s.briefing}`}>
      <div>
        <Titulo className={s.h2}>O contato já chega <em>com a obra descrita.</em></Titulo>
        <p {...E(1, s.lead)}>No contato do site, quem visita escolhe o tipo, a área e o momento. Você abre o WhatsApp já sabendo se é o projeto que você faz.</p>
        <p {...E(2, s.miudo)}>Experimente: é assim que o formulário do seu site funciona.</p>
      </div>
      <div {...E(2, s.briefingCartao)}>
        <Chips rotulo="O que você precisa?" opcoes={TIPOS} valor={tipo} mudar={setTipo} />
        <Chips rotulo="Qual a área?" opcoes={AREAS} valor={area} mudar={setArea} />
        <Chips rotulo="Em que momento está?" opcoes={MOMENTOS} valor={momento} mudar={setMomento} />
        <div className={s.zap} aria-live="polite">
          <p className={s.zapRotulo}><IconeWhatsApp size={16} />A mensagem que chega para você</p>
          <p className={s.balao}>Oi! Vi seu site e quero {projeto}, {tamanho}. {fase} Podemos conversar?</p>
        </div>
      </div>
    </div>
  </Secao>;
}

/* ---------- como funciona: é sequência, então leva número ---------- */
function TelaPasso({ n }: { n: 1 | 2 | 3 | 4 }) {
  const mini = (f: Foto) => src(f, 800);
  return <div className={s.tela} aria-hidden>
    {n === 1 && <div className={s.telaCampo}><span>@seuescritorio<i className={s.cursor} /></span><b>Enviar</b></div>}
    {n === 2 && <div className={s.telaZap}>
      <p className={s.telaZapTopo}><IconeWhatsApp size={14} />Rafael Razeira</p>
      <div className={s.telaBalao}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mini(PROJETOS[0])} alt="" loading="lazy" decoding="async" />
        <span>Sua amostra está pronta: seunome.arq.br</span>
      </div>
    </div>}
    {n === 3 && <div className={s.telaFotos}>
      {[PROJETOS[1], PROJETOS[3], PROJETOS[4]].map(f => /* eslint-disable-next-line @next/next/no-img-element */ <img key={f.src} src={mini(f)} alt="" loading="lazy" decoding="async" style={{ objectPosition: f.pos }} />)}
      <span>+</span>
    </div>}
    {n === 4 && <div className={s.telaSite}>
      <p className={s.telaBarra}><i /><i /><i /><span>seunome.arq.br</span></p>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mini(PROJETOS[2])} alt="" loading="lazy" decoding="async" style={{ objectPosition: "50% 40%" }} />
        <b>SEU NOME</b>
      </div>
    </div>}
  </div>;
}

function ComoFunciona() {
  return <Secao className={s.secao} id="como-funciona">
    <div className={s.wrap}>
      <Titulo className={s.h2}>Do @ ao site no ar <em>em {ARQUITETO.prazoDias} dias.</em></Titulo>
      {/* cada passo com a tela do que acontece (12/11, o estudo da saaslandingpage.com, a
          Durable). As telas são desenhadas aqui, não capturas: o @ digitado, a amostra
          chegando no WhatsApp, as fotos indo, o site no ar. */}
      <ol className={s.etapas}>
        <li {...E(1)}><TelaPasso n={1} /><span className={s.num}>01</span><p className={s.passoTitulo}>Manda o @ do escritório</p><p>Em até {ARQUITETO.amostraHoras}h você recebe uma amostra com os projetos do seu perfil, sem custo.</p></li>
        <li {...E(2)}><TelaPasso n={2} /><span className={s.num}>02</span><p className={s.passoTitulo}>Gostou? {ENTRADA} para começar</p><p>A outra metade só na entrega, no Pix ou no cartão em até {ARQUITETO.parcelas}x.</p></li>
        <li {...E(3)}><TelaPasso n={3} /><span className={s.num}>03</span><p className={s.passoTitulo}>Você manda fotos e textos</p><p>As fotos em alta de cada projeto e o que quiser contar dele. A organização é minha.</p></li>
        <li {...E(4)}><TelaPasso n={4} /><span className={s.num}>04</span><p className={s.passoTitulo}>No ar em até {ARQUITETO.prazoDias} dias</p><p>Contados de quando o material chega, com até {ARQUITETO.projetos} projetos.</p></li>
      </ol>
    </div>
  </Secao>;
}

/* ---------- o preço ---------- */
function Preco() {
  return <Secao className={s.secao} id="oferta">
    <div className={`${s.wrap} ${s.preco}`}>
      <div>
        <Titulo className={s.h2}>Uma vez só, <em>sem mensalidade.</em></Titulo>
        <p {...E(1, s.lead)}>Um projeto fechado já paga o site.</p>
      </div>
      <div {...E(2, s.precoCartao)}>
        <p className={s.valor}>{TOTAL}</p>
        <p className={s.condicao}>{ENTRADA} no Pix para começar e {SALDO} na entrega, no Pix ou no cartão em até {ARQUITETO.parcelas}x.</p>
        <ul className={s.inclui}>
          <li><Check size={16} />Até {ARQUITETO.projetos} projetos, cada um com a sua página</li>
          <li><Check size={16} />O escritório e o seu jeito de trabalhar</li>
          <li><Check size={16} />Contato com briefing, direto no seu WhatsApp</li>
          <li><Check size={16} />Feito para o celular e para o Google</li>
          <li><Check size={16} />Hospedagem sem mensalidade</li>
        </ul>
        <p className={s.naoInclui}>Não inclui o domínio, que fica registrado no seu nome, nem a fotografia dos projetos.</p>
        <a className={`${s.botao} ${s.rosa}`} href="#contratar" data-cta="oferta_abrir" data-cta-dest="form">{CTA}</a>
      </div>
    </div>
    <Caminhos />
  </Secao>;
}

/* ---------- os caminhos para ter o site (12/11, o estudo: EVpin e Calendly) ----------
   Responde ao "por que 999?" sem dizer o preço de ninguém: preço de outro
   seria número chutado. Só o que cada caminho é. A coluna do estúdio leva o
   fio verde, como o "Com o site" lá em cima. */
const CAMINHOS = ["Só o Instagram", "Montar sozinho num construtor", "Agência", "Com o estúdio"];
const LINHAS: [string, string[]][] = [
  ["Quem monta", ["Ninguém", "Você", "A agência", "Eu, com você aprovando"]],
  ["Cada projeto com página própria", ["Não", "Se você montar", "Sim", "Sim"]],
  ["Contato com a obra descrita", ["Não", "Depende do plano", "Depende", "Sim"]],
  ["Mensalidade", ["Não", "Para usar o seu domínio", "Costuma ter manutenção", "Não"]],
  ["Ver antes de pagar", ["Não se aplica", "Você vê enquanto monta", "Depende", `Sim, a amostra em ${ARQUITETO.amostraHoras}h`]],
];
function Caminhos() {
  return <div {...E(3, `${s.wrap} ${s.caminhos}`)}>
    <p className={s.caminhosTitulo}>Os caminhos para ter o site</p>
    {/* no celular a tabela vira blocos (12/11): rolando para o lado, a coluna do
        estúdio ficava fora da tela. `data-c` leva o nome do caminho para o rótulo */}
    <div className={s.tabelaRolo}>
      <table className={s.tabela}>
        <thead><tr><td />{CAMINHOS.map((c, i) => <th key={c} scope="col" className={i === 3 ? s.colEstudio : ""}>{c}</th>)}</tr></thead>
        <tbody>{LINHAS.map(([rotulo, v]) => <tr key={rotulo}>
          <th scope="row">{rotulo}</th>
          {v.map((x, i) => <td key={i} data-c={CAMINHOS[i]} className={i === 3 ? s.colEstudio : ""}>{x}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

const PERGUNTAS: [string, string][] = [
  ["Preciso ter fotos profissionais?", "Ajuda, mas não é obrigatório: a amostra sai das fotos do seu Instagram. Render também entra."],
  ["Tem mensalidade?", "Não. Você paga o site uma vez."],
  ["E o domínio?", "Fica no seu nome. Enquanto ele não estiver pronto, o site vai ao ar num endereço provisório."],
  ["Consigo pôr projeto novo depois?", "Sim. Você me manda as fotos e a ficha no WhatsApp e eu publico. Os dois primeiros depois da entrega estão inclusos."],
  ["Atende fora de Maringá?", "Sim. Tudo é feito pelo WhatsApp."],
];

function Perguntas() {
  return <Secao className={s.secao} id="perguntas">
    <div className={`${s.wrap} ${s.faq}`}>
      <Titulo className={s.h2}>Dúvidas <em>comuns.</em></Titulo>
      <div {...E(1)}>{PERGUNTAS.map(([q, r]) => <details key={q} className={s.pergunta}><summary>{q}</summary><p>{r}</p></details>)}</div>
    </div>
  </Secao>;
}

function Convite() {
  return <Secao className={`${s.cena} ${s.cenaFim}`}>
    <div className={s.cenaFotos}><Varredura fotos={[PROJETOS[1]]} ativa={0} sizes="100vw" /></div>
        <div className={s.cenaCartao}>
          <Titulo className={s.h2}>Veja o seu <em>antes de decidir.</em></Titulo>
          <p {...E(1, s.lead)}>Manda o @ do escritório. Em até {ARQUITETO.amostraHoras}h eu te mando uma amostra com os seus projetos.</p>
          <a {...E(2, `${s.botao} ${s.rosa}`)} href="#contratar" data-cta="final_abrir" data-cta-dest="form">{CTA}</a>
        </div>
  </Secao>;
}

/* ---------- o formulário ----------
   O mesmo da /loja-online: WhatsApp e @. O id `hero-form` é o que a
   medição reconhece. */
/* `noHero` (12/11, o estudo da saaslandingpage.com, a Durable): o formulário mora
   no cartão de vidro do hero, sem título, um clique a menos. Fora dele, no modal,
   leva o id `contratar`: a medição conhece os dois e separa o hero do resto. */
function FormAmostra({ noHero = false }: { noHero?: boolean }) {
  const ID = noHero ? "hero-form" : "contratar";
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [linkWa, setLinkWa] = useState("");
  const [perfil, setPerfil] = useState<LojaEncontrada | null>(null);
  const [telInvalido, setTelInvalido] = useState(false);
  const [instaDiag, setInstaDiag] = useState<DiagnosticoArroba | "vazio" | null>(null);
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
    /* o @ vazio barrado aqui, como na /loja-online (12/11): o form tem noValidate */
    if (!instagram.trim().replace(/^@+/, "")) { setInstaDiag("vazio"); return; }
    const diag = diagnosticoDoArroba(instagram);
    if (diag) { setInstaDiag(diag); return; }
    setEnviando(true);
    const r = await enviarLeadVitrine({ nome: "", whatsapp, instagram, plano: PAGINA, ctaPosition: noHero ? "hero_form" : "form", lang: "pt", pagina: PAGINA, abertura: ABERTURA });
    setEnviando(false);
    if (r.arrobaInvalido) { setInstaInvalido(instagram); setRecusas(n => n + 1); return; }
    setLinkWa(r.linkWa);
    setPerfil(r.loja);
    if (r.salvo) setEnviado(true);
  }

  if (enviado) return <div id={ID} className={`${s.form} ${s.ok} ${noHero ? s.formHero : ""}`} role="status">
    <p className={s.okLinha}><span className={s.okIcone} aria-hidden><Check /></span>Pedido recebido.</p>
    <p>Em até {ARQUITETO.amostraHoras}h eu te mando no WhatsApp a amostra do site, montada com os seus projetos.</p>
    {perfil && <p className={s.micro}>Encontrei <b>@{perfil.arroba}</b> no Instagram. Se não for o seu escritório, me avisa.</p>}
    {linkWa && <a className={`${s.botao} ${s.whats}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">Me chama no WhatsApp agora</a>}
  </div>;

  const a = instaInvalido.replace(/^@+/, "");
  return <form id={ID} className={`${s.form} ${noHero ? s.formHero : ""}`} onSubmit={enviar} noValidate>
    {!noHero && <><p className={s.formTitulo}>Veja o site do seu escritório antes de pagar</p>
    <p className={s.formSub}>Manda o @ do escritório. Em até {ARQUITETO.amostraHoras}h eu te mando uma amostra com os seus projetos.</p></>}
    <div className={s.campos}>
      <label className={s.campo}>
        <span>Seu WhatsApp</span>
        <input name="whatsapp" type="tel" autoComplete="tel" placeholder="(44) 99999-0000" required maxLength={16} aria-invalid={telInvalido || undefined}
               onInput={e => { e.currentTarget.value = mascararWhatsapp(e.currentTarget.value); if (telInvalido) setTelInvalido(false); }} />
      </label>
      <label className={s.campo}>
        <span>O @ do escritório</span>
        <input name="instagram" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="@seuescritorio" required aria-invalid={!!(instaDiag || instaInvalido) || undefined}
               onInput={() => { if (instaDiag) setInstaDiag(null); if (instaInvalido) setInstaInvalido(""); }} />
      </label>
    </div>
    <CampoIsca />
    {telInvalido && <small className={s.erro} role="alert">Confere o número: é por ele que eu te mando a amostra. Ex.: (44) 99999-0000.</small>}
    {(instaDiag || instaInvalido) && <small className={s.erro} role="alert">
      {instaDiag === "vazio" ? "Falta o @ do escritório no Instagram: os projetos da amostra saem dele."
        : instaDiag === "telefone" ? "Isso é um telefone. Aqui eu preciso do @ do escritório no Instagram, o nome logo abaixo da foto do perfil."
        : instaDiag === "email" ? "Isso é um e-mail. Aqui eu preciso do @ do escritório no Instagram, o nome logo abaixo da foto do perfil."
        : recusas >= 2 ? <>A Meta não reconhece <b>@{a}</b> como conta profissional, e os projetos da amostra saem do perfil. Se preferir, <a href={linkWhatsApp("Oi Rafael! Tentei mandar o @ do meu escritório pela página do site para arquiteto e não deu certo. Pode me ajudar?")} target="_blank" rel="noopener" data-cta="arroba_ajuda" data-cta-dest="whatsapp">me chama no WhatsApp</a>.</>
        : temEspaco(a) ? ESPACO_NO_ARROBA
        : <>Não achei <b>@{a}</b> no Instagram. Confere o @ do escritório: precisa ser a conta profissional, é dela que eu tiro as fotos.</>}
    </small>}
    <button type="submit" className={`${s.botao} ${s.rosa}`} disabled={enviando}>{enviando ? "Enviando..." : CTA}</button>
    <p className={s.micro}>A amostra é por minha conta. Se gostar, o site sai por <b>{TOTAL}</b>, sem mensalidade.</p>
  </form>;
}

function ModalAmostra() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const abrir = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a[href="#contratar"]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      const dlg = ref.current;
      if (!dlg || dlg.open) return;
      dlg.showModal();
      focarSemContar(dlg.querySelector("input"));
    };
    document.addEventListener("click", abrir, true);
    return () => document.removeEventListener("click", abrir, true);
  }, []);
  return <dialog ref={ref} className={s.modal} aria-label="Pedir a amostra do site do seu escritório"
    onClick={e => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
    <button type="button" className={s.modalFechar} aria-label="Fechar" onClick={() => ref.current?.close()}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
    <FormAmostra />
  </dialog>;
}

function Topo() {
  return <header className={s.topo}>
    <a className={s.marca} href="#topo" aria-label="Rafael Razeira Estúdio, voltar ao topo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/marca/rr-monograma.webp" width={55} height={30} alt="" />
    </a>
    <nav className={s.topoNav} aria-label="Seções">
      <a href="#o-que-vem">O site</a>
      <a href="#como-funciona">Como funciona</a>
      <a href="#oferta">Preço</a>
    </nav>
    <a className={s.topoCta} href={linkWhatsApp("Oi Rafael! Vim pela página do site para arquiteto e quero tirar uma dúvida.")} target="_blank" rel="noopener" data-cta="topo_whatsapp" data-cta-dest="whatsapp">Conversar</a>
  </header>;
}

function Rodape() {
  return <footer className={s.rodape}>
    <div className={s.wrap}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/marca/rr-nome.webp" width={150} height={25} alt="Rafael Razeira Estúdio" decoding="async" />
        <p>Sites para escritórios de arquitetura. Maringá, PR.</p>
      </div>
      <div className={s.rodapeLinks}>
        <a href={linkWhatsApp("Oi Rafael! Vim pela página do site para arquiteto.")} target="_blank" rel="noopener" data-cta="rodape_contato" data-cta-dest="whatsapp"><IconeWhatsApp size={16} />{WHATSAPP_EXIBIDO}</a>
        <a href="https://www.instagram.com/rafaelrazeira.estudio/" target="_blank" rel="noopener" data-cta="instagram_rodape" data-cta-dest="instagram"><IconeInstagram id="insta-rodape-arq" size={16} />@rafaelrazeira.estudio</a>
      </div>
    </div>
  </footer>;
}

const Xis = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>;
const Check = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5 10 17.5 19 7" /></svg>;

export function SiteArquiteto() {
  return <div className={s.page}>
    <Analytics />
    <Topo />
    {/* a folha que sobe (12/11, "está com corte muito seco entre as dobras"): cada
        foto fica parada no fundo (sticky) e o branco seguinte sobe por cima dela,
        com os cantos de cima arredondados. O grupo limita até onde a foto fica
        presa; sem ele, a primeira ficaria colada atrás da página inteira. */}
    <main>
      <div className={s.grupo}>
        <Hero />
        <div className={s.folha}><DoisLugares /></div>
      </div>
      <div className={s.grupo}>
        <Frentes />
        <div className={s.folha}>
          <Briefing />
          <ComoFunciona />
          <Preco />
          <Perguntas />
        </div>
      </div>
    </main>
    <div className={s.grupo}>
      <Convite />
      <div className={`${s.folha} ${s.folhaRodape}`}><Rodape /></div>
    </div>
    <ModalAmostra />
  </div>;
}
