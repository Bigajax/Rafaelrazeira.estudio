"use client";

import Link from "next/link";
import { useState } from "react";
import s from "@/app/servicos/servicos.module.css";

/* Todos os links de WhatsApp saem daqui: um número, uma função. */
const NUMERO = "5544999997219";
const zap = (msg: string) => `https://wa.me/${NUMERO}?text=${encodeURIComponent(msg)}`;

const semMovimento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   PLANTAS — a assinatura da página. Cada serviço é desenhado como
   a planta da estrutura que ele entrega: frames, rotas, módulos e
   fluxos com traço 1.5 e anotações em mono, a linguagem real de
   wireframe do estúdio. stroke = currentColor para a planta poder
   acender em esmeralda quando é a resposta do navegador.
   ============================================================ */
function Planta({ tipo }: { tipo: string }) {
  const T = (p: { x: number; y: number; children: string; end?: boolean }) => (
    <text x={p.x} y={p.y} className={s.plantaTexto} textAnchor={p.end ? "end" : "start"}>{p.children}</text>
  );
  switch (tipo) {
    case "landing": /* uma rota, um fluxo, uma ação */
      return <svg viewBox="0 0 220 150" role="img" aria-label="Planta de uma landing page: uma página única que conduz até um botão de ação">
        <rect x="62" y="6" width="96" height="138" rx="3" />
        <line x1="70" y1="26" x2="126" y2="26" strokeWidth="5" />
        <line x1="70" y1="38" x2="150" y2="38" />
        <line x1="70" y1="46" x2="138" y2="46" />
        <rect x="70" y="58" width="80" height="22" rx="2" strokeDasharray="3 3" />
        <line x1="70" y1="92" x2="150" y2="92" />
        <line x1="70" y1="100" x2="132" y2="100" />
        <rect x="70" y="112" width="80" height="18" rx="2" className={s.plantaCheia} />
        <T x={74} y={124}>AÇÃO</T>
        <line x1="110" y1="130" x2="110" y2="144" markerEnd="url(#seta)" />
      </svg>;
    case "website": /* uma raiz, várias rotas */
      return <svg viewBox="0 0 220 150" role="img" aria-label="Planta de um website: uma página inicial ligada a páginas de serviços, sobre e contato">
        <rect x="76" y="6" width="68" height="44" rx="3" />
        <line x1="84" y1="20" x2="118" y2="20" strokeWidth="4" />
        <line x1="84" y1="30" x2="136" y2="30" />
        <line x1="110" y1="50" x2="110" y2="66" />
        <line x1="30" y1="66" x2="190" y2="66" />
        <line x1="30" y1="66" x2="30" y2="80" />
        <line x1="110" y1="66" x2="110" y2="80" />
        <line x1="190" y1="66" x2="190" y2="80" />
        <rect x="6" y="80" width="48" height="56" rx="3" />
        <rect x="86" y="80" width="48" height="56" rx="3" />
        <rect x="166" y="80" width="48" height="56" rx="3" />
        <T x={12} y={96}>SOBRE</T>
        <T x={92} y={96}>SERVIÇOS</T>
        <T x={172} y={96}>CONTATO</T>
        <line x1="12" y1="106" x2="46" y2="106" /><line x1="12" y1="114" x2="40" y2="114" />
        <line x1="92" y1="106" x2="126" y2="106" /><line x1="92" y1="114" x2="120" y2="114" />
        <line x1="172" y1="106" x2="206" y2="106" /><line x1="172" y1="114" x2="200" y2="114" />
      </svg>;
    case "vitrine": /* catálogo que desagua no WhatsApp */
      return <svg viewBox="0 0 220 150" role="img" aria-label="Planta de uma vitrine digital: catálogo de produtos com pedido enviado pelo WhatsApp">
        <rect x="24" y="6" width="120" height="138" rx="3" />
        <line x1="32" y1="22" x2="80" y2="22" strokeWidth="4" />
        <rect x="32" y="34" width="48" height="40" rx="2" />
        <rect x="88" y="34" width="48" height="40" rx="2" />
        <rect x="32" y="82" width="48" height="40" rx="2" />
        <rect x="88" y="82" width="48" height="40" rx="2" />
        <line x1="32" y1="132" x2="72" y2="132" />
        <line x1="144" y1="78" x2="172" y2="78" markerEnd="url(#seta)" />
        <rect x="174" y="58" width="40" height="30" rx="9" className={s.plantaCheia} />
        <path d="M182 88 l-4 10 12 -6" className={s.plantaCheia} />
        <T x={214} y={104} end>PEDIDO NO WHATS</T>
      </svg>;
    case "ecommerce": /* catálogo + carrinho + pagamento + gestão */
      return <svg viewBox="0 0 220 150" role="img" aria-label="Planta de um e-commerce: catálogo, carrinho, pagamento e painel de pedidos">
        <rect x="6" y="6" width="120" height="102" rx="3" />
        <line x1="14" y1="20" x2="58" y2="20" strokeWidth="4" />
        <rect x="14" y="30" width="30" height="28" rx="2" />
        <rect x="50" y="30" width="30" height="28" rx="2" />
        <rect x="86" y="30" width="30" height="28" rx="2" />
        <rect x="14" y="64" width="30" height="28" rx="2" />
        <rect x="50" y="64" width="30" height="28" rx="2" />
        <rect x="86" y="64" width="30" height="28" rx="2" />
        <line x1="126" y1="40" x2="152" y2="40" markerEnd="url(#seta)" />
        <rect x="154" y="24" width="60" height="32" rx="3" />
        <T x={160} y={38}>CARRINHO</T>
        <line x1="160" y1="46" x2="196" y2="46" />
        <line x1="184" y1="56" x2="184" y2="72" markerEnd="url(#seta)" />
        <rect x="154" y="74" width="60" height="30" rx="3" className={s.plantaCheia} />
        <T x={160} y={92}>PIX · CARTÃO</T>
        <line x1="66" y1="108" x2="66" y2="124" markerEnd="url(#seta)" />
        <rect x="6" y="126" width="208" height="18" rx="3" strokeDasharray="3 3" />
        <T x={12} y={138}>PAINEL: PEDIDOS · ESTOQUE · FRETE</T>
      </svg>;
    case "redesign": /* estrutura confusa vira estrutura clara */
      return <svg viewBox="0 0 220 150" role="img" aria-label="Planta de um redesign: uma estrutura confusa reorganizada em uma estrutura clara">
        <rect x="6" y="16" width="80" height="118" rx="3" strokeDasharray="3 3" />
        <line x1="14" y1="34" x2="66" y2="46" />
        <line x1="14" y1="52" x2="78" y2="40" />
        <line x1="14" y1="70" x2="58" y2="86" />
        <line x1="30" y1="96" x2="78" y2="78" />
        <line x1="14" y1="112" x2="70" y2="118" />
        <line x1="94" y1="75" x2="126" y2="75" markerEnd="url(#seta)" />
        <rect x="134" y="16" width="80" height="118" rx="3" />
        <line x1="142" y1="32" x2="182" y2="32" strokeWidth="4" />
        <line x1="142" y1="48" x2="206" y2="48" />
        <line x1="142" y1="60" x2="198" y2="60" />
        <rect x="142" y="74" width="64" height="24" rx="2" strokeDasharray="3 3" />
        <rect x="142" y="108" width="64" height="16" rx="2" className={s.plantaCheia} />
      </svg>;
    case "painel": /* barra lateral + tabela da operação */
      return <svg viewBox="0 0 220 150" role="img" aria-label="Planta de um painel administrativo: menu lateral e tabela de produtos e pedidos">
        <rect x="6" y="6" width="208" height="138" rx="3" />
        <line x1="60" y1="6" x2="60" y2="144" />
        <line x1="16" y1="24" x2="50" y2="24" strokeWidth="4" />
        <line x1="16" y1="42" x2="46" y2="42" /><line x1="16" y1="54" x2="42" y2="54" /><line x1="16" y1="66" x2="46" y2="66" />
        <T x={70} y={26}>PRODUTOS</T>
        <line x1="70" y1="38" x2="204" y2="38" />
        <line x1="70" y1="56" x2="204" y2="56" />
        <line x1="70" y1="74" x2="204" y2="74" />
        <line x1="70" y1="92" x2="204" y2="92" />
        <rect x="70" y="104" width="56" height="16" rx="2" className={s.plantaCheia} />
        <T x={74} y={115}>+ NOVO</T>
      </svg>;
    case "integracoes": /* o site no centro, sistemas ao redor */
      return <svg viewBox="0 0 220 150" role="img" aria-label="Planta de integrações: o site conectado a WhatsApp, pagamento, estoque e análise">
        <rect x="80" y="55" width="60" height="40" rx="3" className={s.plantaCheia} />
        <T x={90} y={78}>SITE</T>
        <line x1="80" y1="62" x2="40" y2="30" /><rect x="6" y="10" width="60" height="20" rx="3" /><T x={12} y={24}>WHATSAPP</T>
        <line x1="140" y1="62" x2="180" y2="30" /><rect x="156" y="10" width="58" height="20" rx="3" /><T x={162} y={24}>PAGAMENTO</T>
        <line x1="80" y1="88" x2="40" y2="120" /><rect x="6" y="120" width="60" height="20" rx="3" /><T x={12} y={134}>ESTOQUE</T>
        <line x1="140" y1="88" x2="180" y2="120" /><rect x="156" y="120" width="58" height="20" rx="3" /><T x={162} y={134}>ANÁLISE</T>
      </svg>;
    default: /* personalizado: módulos combinados */
      return <svg viewBox="0 0 220 150" role="img" aria-label="Planta de um projeto personalizado: módulos diferentes combinados em uma estrutura própria">
        <rect x="6" y="6" width="100" height="70" rx="3" />
        <rect x="14" y="18" width="38" height="30" rx="2" /><rect x="60" y="18" width="38" height="30" rx="2" />
        <line x1="14" y1="60" x2="80" y2="60" />
        <rect x="122" y="6" width="92" height="34" rx="3" strokeDasharray="3 3" />
        <T x={130} y={26}>PÁGINA DE VENDAS</T>
        <rect x="122" y="52" width="92" height="24" rx="3" className={s.plantaCheia} />
        <T x={130} y={68}>PAINEL</T>
        <line x1="56" y1="76" x2="56" y2="100" markerEnd="url(#seta)" />
        <line x1="168" y1="76" x2="168" y2="100" markerEnd="url(#seta)" />
        <rect x="6" y="102" width="208" height="42" rx="3" />
        <T x={14} y={126}>UMA ESTRUTURA SÓ, DO JEITO DA OPERAÇÃO</T>
      </svg>;
  }
}

/* Defs compartilhados (ponta de seta) — renderizado uma vez */
const PlantaDefs = () => (
  <svg width="0" height="0" aria-hidden>
    <defs>
      <marker id="seta" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L8 4 L0 8" fill="none" stroke="context-stroke" strokeWidth="1.5" />
      </marker>
    </defs>
  </svg>
);

/* ============================================================ */

export function Cabecalho() {
  const [aberto, setAberto] = useState(false);
  return <header className={s.topo}>
    <Link className={s.marca} href="/estudio/"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></Link>
    <button className={s.menu} onClick={() => setAberto(!aberto)} aria-expanded={aberto}>{aberto ? "FECHAR" : "MENU"}</button>
    <nav className={aberto ? s.navAberta : ""} onClick={() => setAberto(false)}>
      <a href="#encontrar">ENCONTRAR A SOLUÇÃO</a>
      <a href="#servicos">SERVIÇOS</a>
      <a href="#comparar">COMPARAR</a>
      <a href="#processo">PROCESSO</a>
      <a className={s.navCta} href={zap("Olá, Rafael! Conheci seus serviços pelo site e gostaria de conversar sobre um projeto digital para minha empresa.")} target="_blank" rel="noopener">CONVERSAR ↗</a>
    </nav>
  </header>;
}

/* Hero: a mesma moldura alterna entre as quatro estruturas.
   Com reduced motion, as quatro aparecem lado a lado, estáticas. */
const estados = [
  { need: "Oferta única", nome: "Landing page", tipo: "landing" },
  { need: "Empresa e serviços", nome: "Website", tipo: "website" },
  { need: "Produtos + WhatsApp", nome: "Vitrine digital", tipo: "vitrine" },
  { need: "Compra completa", nome: "E-commerce", tipo: "ecommerce" },
];
export function Hero() {
  return <section className={s.hero}>
    <PlantaDefs />
    <div className={s.heroGrade}>
      <div>
        <p className={s.olho}>DESIGN E DESENVOLVIMENTO DIGITAL</p>
        <h1>CADA NEGÓCIO PRECISA DE UMA <em>ESTRUTURA DIGITAL</em> DIFERENTE.</h1>
        <p className={s.apoio}>Landing pages, websites, vitrines digitais e e-commerces desenvolvidos de acordo com o posicionamento, a operação e o objetivo de cada negócio.</p>
        <div className={s.acoes}>
          <a className={`${s.botao} ${s.cheio}`} href={zap("Olá, Rafael! Conheci seus serviços pelo site e gostaria de conversar sobre um projeto digital para minha empresa.")} target="_blank" rel="noopener">CONVERSAR SOBRE MEU PROJETO ↗</a>
          <a className={s.discreto} href="#encontrar">ENCONTRAR A SOLUÇÃO IDEAL ↓</a>
        </div>
      </div>
      <div className={s.prancheta} role="img" aria-label="Uma mesma marca em quatro estruturas: oferta única vira landing page, empresa vira website, produtos com WhatsApp viram vitrine digital e compra completa vira e-commerce">
        <div className={s.palco}>
          {estados.map((e) => <figure className={s.estado} key={e.tipo}>
            <figcaption><span>{e.need}</span> → <b>{e.nome}</b></figcaption>
            <div className={s.plantaCaixa}><Planta tipo={e.tipo} /></div>
          </figure>)}
        </div>
      </div>
    </div>
  </section>;
}

/* ============================================================
   NAVEGADOR DE NECESSIDADES + SERVIÇOS — compartilham o estado
   de qual planta está acesa.
   ============================================================ */
const necessidades = [
  { t: "Quero divulgar uma oferta específica.", k: "landing" },
  { t: "Quero apresentar melhor minha empresa.", k: "website" },
  { t: "Quero organizar meus produtos.", k: "vitrine" },
  { t: "Quero vender e receber pagamentos online.", k: "ecommerce" },
  { t: "Quero melhorar um site que já existe.", k: "redesign" },
  { t: "Quero administrar produtos e conteúdos.", k: "painel" },
  { t: "Preciso conectar meu site a outros sistemas.", k: "integracoes" },
];

const maiores = [
  {
    k: "landing", titulo: "Landing pages",
    frase: "Uma página focada em uma oferta e construída para conduzir o visitante até uma ação.",
    desc: "Landing pages são indicadas para empresas e profissionais que precisam divulgar um serviço, produto, campanha ou oportunidade específica. A estrutura organiza a mensagem, apresenta os diferenciais, responde às principais dúvidas e conduz o visitante para uma ação clara, como solicitar uma proposta, entrar em contato ou realizar uma compra.",
    para: ["Campanhas de tráfego pago", "Profissionais liberais", "Prestadores de serviços", "Lançamentos", "Captação de contatos", "Validação de ofertas"],
    inclui: ["Planejamento da estrutura", "Organização da comunicação", "Design personalizado", "Desenvolvimento responsivo", "Formulários", "Integração com WhatsApp", "Depoimentos e FAQ", "Eventos e análise", "Domínio e publicação"],
    cta: "CRIAR UMA LANDING PAGE",
    msg: "Olá, Rafael! Tenho interesse no desenvolvimento de uma landing page para o meu negócio.",
  },
  {
    k: "website", titulo: "Websites institucionais",
    frase: "Uma presença digital completa para apresentar a empresa, seus serviços e sua autoridade.",
    desc: "O website institucional é indicado quando o negócio precisa organizar diferentes informações, serviços, públicos ou áreas de atuação. Em vez de concentrar tudo em uma única página, o conteúdo é distribuído em uma arquitetura que facilita a navegação e ajuda cada visitante a encontrar o que procura.",
    para: ["Empresas e escritórios", "Clínicas", "Construtoras e arquitetos", "Estúdios", "Profissionais", "Negócios com vários serviços"],
    inclui: ["Página inicial e sobre", "Páginas de serviços", "Portfólio e projetos", "Equipe e conteúdos", "Formulários e contato", "Localização", "Integração com WhatsApp", "SEO técnico básico", "Versão responsiva e publicação"],
    cta: "CRIAR UM WEBSITE",
    msg: "Olá, Rafael! Gostaria de desenvolver um website institucional para minha empresa.",
  },
  {
    k: "vitrine", titulo: "Vitrines digitais",
    frase: "Uma forma profissional de organizar produtos sem exigir a estrutura completa de um e-commerce.",
    desc: "A vitrine digital substitui catálogos improvisados, sequências de Stories, arquivos em PDF e pastas de imagens. O cliente consegue consultar produtos, categorias, preços, variações e disponibilidade. Quando encontra o que procura, envia o pedido ou inicia o atendimento pelo WhatsApp.",
    para: ["Lojas de roupas e streetwear", "Multimarcas", "Lojas esportivas", "Perfumarias", "Lojas locais", "Quem vende pelo WhatsApp"],
    inclui: ["Catálogo com categorias", "Filtros e pesquisa", "Página de produto", "Tamanhos, cores e preços", "Pronta entrega e encomenda", "Destaques e banners", "Pedido formatado no WhatsApp", "Painel de produtos", "Integração com estoque, quando possível"],
    cta: "ORGANIZAR MEUS PRODUTOS",
    msg: "Olá, Rafael! Tenho interesse em criar uma vitrine digital para organizar e apresentar os produtos da minha loja.",
    contraste: true,
  },
  {
    k: "ecommerce", titulo: "E-commerces",
    frase: "Uma operação completa para apresentar, vender, receber e administrar pedidos online.",
    desc: "O e-commerce é indicado para empresas que desejam automatizar a jornada de compra. O cliente consulta os produtos, seleciona variações, adiciona itens ao carrinho, escolhe a entrega e realiza o pagamento dentro da própria loja. O desenvolvimento considera tanto a experiência de compra quanto a operação de quem administra o negócio.",
    para: ["Marcas que vendem para várias regiões", "Lojas com muitos produtos", "Quem precisa receber online", "Operações com estoque e entregas"],
    inclui: ["Catálogo, busca e filtros", "Página de produto com variações", "Carrinho e checkout", "Pix, cartão e gateway", "Cálculo de frete e cupons", "Estoque e pedidos", "Painel administrativo", "Políticas de troca e devolução", "Eventos de conversão"],
    obs: "As integrações dependem dos sistemas utilizados pela empresa e são avaliadas antes da definição do projeto.",
    cta: "CRIAR UM E-COMMERCE",
    msg: "Olá, Rafael! Gostaria de conversar sobre o desenvolvimento de um e-commerce para minha marca.",
  },
];

const sistemas = [
  {
    k: "redesign", titulo: "Redesign e evolução de sites",
    frase: "Para negócios que já possuem um site, mas sentem que ele não representa mais o nível da marca.",
    desc: "O redesign não consiste apenas em trocar cores ou modernizar a aparência. O trabalho começa pela identificação dos problemas de clareza, navegação, hierarquia, responsividade e conversão. A partir disso, o site é reorganizado ou reconstruído.",
    lista: ["Diagnóstico do site atual", "Reorganização das informações", "Nova direção visual", "Melhoria da versão mobile", "Revisão de hierarquia e CTAs", "Reconstrução parcial ou completa"],
    cta: "MELHORAR MEU SITE",
    msg: "Olá, Rafael! Já possuo um site e gostaria de avaliar um redesign e melhorias na experiência.",
  },
  {
    k: "painel", titulo: "Painéis administrativos",
    frase: "Autonomia para atualizar produtos, conteúdos, pedidos e informações sem alterar o código.",
    desc: "O painel administrativo é desenvolvido de acordo com o que o responsável pelo negócio realmente precisa controlar. Cada módulo resolve uma tarefa real da operação, nada existe só para o sistema parecer mais completo.",
    lista: ["Cadastro e edição de produtos", "Upload de imagens", "Categorias, preços e banners", "Disponibilidade e pedidos", "Usuários e níveis de acesso", "Indicadores operacionais"],
    cta: "PLANEJAR UM PAINEL",
    msg: "Olá, Rafael! Gostaria de entender como funcionaria um painel administrativo para o meu projeto.",
  },
  {
    k: "integracoes", titulo: "Integrações e automações",
    frase: "Conexões entre o site e as ferramentas que já fazem parte da empresa.",
    desc: "As integrações reduzem tarefas manuais, evitam informações duplicadas e aproximam o site da operação real do negócio.",
    lista: ["WhatsApp e formulários", "Banco de dados", "Gateway de pagamento", "Estoque, ERP e frete", "Meta Pixel e análise", "APIs, notificações e automações"],
    obs: "Cada integração depende da compatibilidade, documentação e disponibilidade técnica do sistema utilizado.",
    cta: "AVALIAR UMA INTEGRAÇÃO",
    msg: "Olá, Rafael! Preciso conectar meu site a outros sistemas e gostaria de avaliar as possibilidades.",
  },
  {
    k: "personalizado", titulo: "Soluções digitais personalizadas",
    frase: "Nem todo projeto se encaixa perfeitamente em uma categoria pronta.",
    desc: "Uma vitrine pode precisar de um painel. Um website pode conter páginas de vendas. Uma landing page pode evoluir para uma aplicação. Um e-commerce pode exigir integrações específicas. Nesses casos, o projeto é planejado de acordo com a necessidade real da operação.",
    lista: [],
    cta: "APRESENTAR MINHA IDEIA",
    msg: "Olá, Rafael! Tenho uma ideia de projeto digital e gostaria de entender como ela pode ser desenvolvida.",
  },
];

const comparativo = [
  { nome: "Landing page", objetivo: "Divulgar uma oferta", acao: "Contato, cadastro ou compra específica", nivel: 1 },
  { nome: "Website", objetivo: "Apresentar a empresa e seus serviços", acao: "Conhecer, confiar e entrar em contato", nivel: 2 },
  { nome: "Vitrine digital", objetivo: "Organizar produtos", acao: "Consultar e pedir pelo WhatsApp", nivel: 2 },
  { nome: "E-commerce", objetivo: "Vender online", acao: "Comprar e pagar pela própria plataforma", nivel: 4 },
  { nome: "Redesign", objetivo: "Melhorar uma estrutura existente", acao: "Tornar o site mais claro, atual e eficiente", nivel: 0 },
];

export function Corpo() {
  const [aceso, setAceso] = useState<string | null>(null);
  function escolher(k: string) {
    setAceso(k);
    const alvo = document.getElementById(`svc-${k}`);
    alvo?.scrollIntoView({ behavior: semMovimento() ? "auto" : "smooth", block: "start" });
    alvo?.focus({ preventScroll: true });
  }
  return <>
    {/* -------- navegador de necessidades -------- */}
    <section className={s.secao} id="encontrar">
      <div className={s.molde}>
        <p className={s.olho}>ENCONTRE A SOLUÇÃO</p>
        <h2>O QUE SEU NEGÓCIO PRECISA FAZER AGORA?</h2>
        <p className={s.apoio}>Escolha a frase que mais parece com o seu momento. A estrutura certa acende logo abaixo.</p>
        <div className={s.necessidades}>
          {necessidades.map((n) => <button key={n.k} className={`${s.necessidade} ${aceso === n.k ? s.necessidadeAtiva : ""}`} onClick={() => escolher(n.k)}>
            {n.t}
          </button>)}
        </div>
      </div>
    </section>

    {/* -------- as quatro estruturas -------- */}
    <section className={s.secao} id="servicos" aria-label="Serviços do estúdio">
      <div className={s.molde}>
        {maiores.map((v, i) => <article key={v.k} id={`svc-${v.k}`} tabIndex={-1} className={`${s.svc} ${i % 2 ? s.svcFlip : ""} ${aceso === v.k ? s.aceso : ""}`}>
          <div className={s.svcPlanta}>
            <div className={s.plantaCaixa}><Planta tipo={v.k} /></div>
            {v.contraste && <div className={s.difBox}>
              <div><small>VITRINE DIGITAL</small><p>Consulta e pedido pelo WhatsApp.</p></div>
              <div><small>E-COMMERCE</small><p>Carrinho, pagamento e gestão completa do pedido.</p></div>
            </div>}
          </div>
          <div className={s.svcTexto}>
            <h3>{v.titulo}</h3>
            <p className={s.frase}>{v.frase}</p>
            <p className={s.descricao}>{v.desc}</p>
            <div className={s.listas}>
              <div>
                <small className={s.rotulo}>INDICADA PARA</small>
                <ul>{v.para.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div>
                <small className={s.rotulo}>PODE INCLUIR</small>
                <ul>{v.inclui.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            </div>
            {v.obs && <p className={s.obs}>{v.obs}</p>}
            <a className={`${s.botao} ${s.contorno}`} href={zap(v.msg)} target="_blank" rel="noopener">{v.cta} ↗</a>
          </div>
        </article>)}

        {/* -------- serviços de sistema -------- */}
        <p className={s.olho} style={{ marginTop: "clamp(48px, 6vw, 80px)" }}>QUANDO O PROJETO VAI ALÉM DA PÁGINA</p>
        <div className={s.sistemas}>
          {sistemas.map((v) => <article key={v.k} id={`svc-${v.k}`} tabIndex={-1} className={`${s.sistema} ${aceso === v.k ? s.aceso : ""}`}>
            <div className={s.plantaCaixa}><Planta tipo={v.k} /></div>
            <h3>{v.titulo}</h3>
            <p className={s.frase}>{v.frase}</p>
            <p className={s.descricao}>{v.desc}</p>
            {v.lista.length > 0 && <ul className={s.listaSimples}>{v.lista.map((x) => <li key={x}>{x}</li>)}</ul>}
            {v.obs && <p className={s.obs}>{v.obs}</p>}
            <a className={`${s.botao} ${s.contorno}`} href={zap(v.msg)} target="_blank" rel="noopener">{v.cta} ↗</a>
          </article>)}
        </div>
      </div>
    </section>

    {/* -------- comparativo -------- */}
    <section className={`${s.secao} ${s.escura}`} id="comparar">
      <div className={s.molde}>
        <p className={s.olho}>COMPARATIVO</p>
        <h2>QUAL ESTRUTURA ATENDE MELHOR AO SEU MOMENTO?</h2>
        <div className={s.tabela}>
          {comparativo.map((c) => <article key={c.nome}>
            <h3>{c.nome}</h3>
            <small>PRINCIPAL OBJETIVO</small>
            <p>{c.objetivo}</p>
            <small>AÇÃO ESPERADA</small>
            <p>{c.acao}</p>
            <small>COMPLEXIDADE OPERACIONAL</small>
            {c.nivel > 0
              ? <span className={s.nivel} role="img" aria-label={`Complexidade ${c.nivel} de 4`}>{[1, 2, 3, 4].map((n) => <i key={n} className={n <= c.nivel ? s.nivelCheio : ""} />)}</span>
              : <p className={s.nivelTexto}>Depende da estrutura atual</p>}
          </article>)}
        </div>
        <p className={s.apoioEscuro}>Você não precisa chegar com a solução definida. Primeiro entendemos o negócio, o objetivo e a operação atual. Depois disso, indicamos a estrutura mais adequada.</p>
        <a className={`${s.botao} ${s.cheio}`} href={zap("Olá, Rafael! Conheci seus serviços pelo site e gostaria de conversar sobre um projeto digital para minha empresa.")} target="_blank" rel="noopener">DESCOBRIR A MELHOR ESTRUTURA ↗</a>
      </div>
    </section>
  </>;
}

/* -------- diferenciais -------- */
const diferenciais = [
  ["Design específico para a marca", "A interface é construída com base no posicionamento, no público e no universo visual do negócio."],
  ["Estrutura antes da aparência", "A organização das informações e da jornada é definida antes dos detalhes visuais."],
  ["Experiência responsiva", "Cada seção é planejada para funcionar em diferentes telas, e não apenas reduzida para caber no celular."],
  ["Foco na próxima ação", "O visitante entende o que fazer depois de consumir cada parte importante da página."],
  ["Desenvolvimento sob medida", "A estrutura não fica limitada a um template genérico que obriga negócios diferentes a funcionar da mesma maneira."],
  ["Possibilidade de evolução", "Sempre que faz sentido, o projeto considera futuras páginas, funcionalidades, produtos e integrações."],
  ["Comunicação durante o projeto", "O cliente acompanha as etapas importantes e valida a direção antes da entrega final."],
];
export function Diferenciais() {
  return <section className={s.secao}>
    <div className={s.molde}>
      <p className={s.olho}>COMO O TRABALHO É FEITO</p>
      <h2>O QUE MUDA QUANDO A ESTRUTURA É PENSADA PARA O NEGÓCIO.</h2>
      <div className={s.difGrade}>
        {diferenciais.map((d) => <article key={d[0]}><h3>{d[0]}</h3><p>{d[1]}</p></article>)}
      </div>
    </div>
  </section>;
}

/* -------- processo: a única sequência real da página -------- */
const etapas = [
  ["Diagnóstico", "Entendimento do negócio, do público, do objetivo e do problema que o projeto deve resolver."],
  ["Briefing", "Organização das informações, referências, conteúdos, produtos e materiais necessários."],
  ["Estrutura", "Definição das páginas, seções, hierarquia e caminhos de navegação."],
  ["Direção visual", "Criação do sistema visual de acordo com a identidade e o posicionamento da marca."],
  ["Desenvolvimento", "Transformação da direção aprovada em uma experiência funcional e responsiva."],
  ["Revisão", "Testes, apresentação, validação e realização dos ajustes previstos."],
  ["Publicação", "Configuração do domínio, integrações finais e disponibilização do projeto."],
];
export function Processo() {
  return <section className={s.secao} id="processo">
    <div className={s.molde}>
      <p className={s.olho}>PROCESSO</p>
      <h2>COMO UM PROJETO SAI DA IDEIA E CHEGA À TELA.</h2>
      <ol className={s.trilho}>
        {etapas.map((e, i) => <li key={e[0]}>
          <b>{String(i + 1).padStart(2, "0")}</b>
          <div><h3>{e[0]}</h3><p>{e[1]}</p></div>
        </li>)}
      </ol>
    </div>
  </section>;
}

/* -------- FAQ -------- */
const faq = [
  ["Qual é o prazo de desenvolvimento?", "O prazo depende do tipo de projeto, da quantidade de páginas, das funcionalidades e do envio dos materiais. Projetos mais simples podem ser concluídos rapidamente, enquanto websites, painéis e e-commerces exigem um cronograma maior."],
  ["O projeto funciona no celular?", "Sim. Todas as páginas são planejadas e revisadas para computadores, tablets e celulares, com atenção especial à experiência mobile."],
  ["Preciso ter os textos e as imagens prontos?", "Não necessariamente. Durante o briefing, o material existente é analisado e são identificados os conteúdos que precisam ser produzidos, organizados ou adaptados."],
  ["O domínio está incluído?", "A configuração pode fazer parte da entrega. Caso a empresa ainda não possua um domínio, ela será orientada sobre o registro e a contratação."],
  ["Posso atualizar produtos e informações?", "Depende da estrutura contratada. Projetos com atualizações frequentes podem receber um painel administrativo ou integração com um sistema de gestão."],
  ["É possível integrar com meu estoque?", "É necessário verificar se o sistema utilizado oferece API, documentação ou outro método oficial de integração."],
  ["O projeto utiliza templates?", "Referências podem orientar o trabalho, mas a estrutura e o design são desenvolvidos de acordo com a identidade e os objetivos do negócio."],
  ["A manutenção está incluída?", "Suporte, manutenção, atualizações e novas funcionalidades são definidos separadamente conforme a necessidade do projeto."],
  ["Como o orçamento é definido?", "Após o diagnóstico inicial, é criado um escopo com as entregas, funcionalidades, prazo, investimento e condições de pagamento."],
];
export function Duvidas() {
  return <section className={s.secao} id="faq">
    <div className={s.molde}>
      <p className={s.olho}>DÚVIDAS FREQUENTES</p>
      <h2>ANTES DE COMEÇAR.</h2>
      <div className={s.sanfona}>
        {faq.map((f) => <details key={f[0]}><summary>{f[0]}</summary><p>{f[1]}</p></details>)}
      </div>
    </div>
  </section>;
}

/* -------- CTA final + rodapé -------- */
export function ChamadaFinal() {
  return <>
    <section className={`${s.secao} ${s.escura} ${s.final}`}>
      <p className={s.olho}>PRÓXIMO PASSO</p>
      <h2>SUA EMPRESA NÃO PRECISA DE QUALQUER SITE. PRECISA DA <em>ESTRUTURA CERTA.</em></h2>
      <p className={s.apoioEscuro}>Conte o que sua empresa vende, como atende os clientes hoje e o que deseja melhorar. A partir disso, será possível identificar a solução adequada.</p>
      <div className={s.acoes}>
        <a className={`${s.botao} ${s.cheio}`} href={zap("Olá, Rafael! Vi a página de serviços e gostaria de conversar sobre uma solução para o meu negócio.")} target="_blank" rel="noopener">CONVERSAR SOBRE MEU PROJETO ↗</a>
      </div>
      <small className={s.micro}>A conversa inicial serve para entender o projeto antes da definição do escopo e do investimento.</small>
    </section>
    <footer className={s.rodape}>
      <div className={s.marca}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav>
        <Link href="/estudio/">INÍCIO</Link>
        <Link href="/servicos">SERVIÇOS</Link>
        <Link href="/vitrine-digital">VITRINE DIGITAL</Link>
        <Link href="/termos">TERMOS</Link>
        <Link href="/privacidade">PRIVACIDADE</Link>
      </nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
    </footer>
  </>;
}
