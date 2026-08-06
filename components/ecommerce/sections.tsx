"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import s from "@/app/e-commerce/ecommerce.module.css";
import { salvarLead } from "@/components/lead";
import { contextoDaSessao, initTracking, irParaWhatsapp, track, trackContact, trackLead } from "@/components/ecommerce/tracking";

/* Um número, uma função — todos os links de WhatsApp saem daqui. */
const NUMERO = "5544999997219";
const zap = (msg: string) => `https://wa.me/${NUMERO}?text=${encodeURIComponent(msg)}`;

/* ---------- a âncora de investimento voltou (06/08) ----------
   Ela tinha saído em 05/08, para o valor entrar só na conversa. O que a
   campanha mostrou desde então: CTR de 15% a 26%, 30 visitas de anúncio e zero
   contatos. Quem chega de anúncio frio e não faz ideia se o projeto custa mil
   ou trinta mil não pede diagnóstico, fecha a aba. A âncora não substitui o
   diagnóstico, ela dá a ordem de grandeza que decide se vale começar a
   conversa.

   O comentário que ficou aqui em 05/08 pedia uma coisa quando o número
   voltasse: que ele aparecesse nos DOIS lugares, hero e FAQ, para a página não
   se contradizer. É o que esta constante garante. Trocar aqui troca nos dois. */
const VALOR_BASE = "R$3.499";

/* Dispara o funil no mount (Pixel + Mixpanel), respeitando o opt-out. */
export function Analytics() { useEffect(() => { initTracking(); }, []); return null; }

/* ============================================================
   ÂNCORAS INTERNAS — rolagem por JS, sem mexer na URL.

   Isto começou como medição, não como enfeite. Todo CTA desta página aponta
   para #diagnostico, e trocar o hash faz o fbevents.js contar uma navegação
   de SPA e mandar um PageView EXTRA. Medido no build de produção: um a mais
   por sessão, no primeiro clique. Parece pouco até lembrar da campanha de
   agosto, que teve 16 visitas e 12 cliques de CTA: o relatório mostraria 28
   visitas, 75% a mais do que existiu, e a razão clique-para-visita, que é
   como se descobre se o anúncio está mentindo sobre a página, viraria ficção.

   O href continua no HTML de propósito: sem JS o navegador rola do mesmo
   jeito, e o link segue abrível em nova aba pelo teclado. Só o comportamento
   com JS muda, e de quebra a rolagem fica suave, o que numa página onde cinco
   botões saltam para o mesmo formulário ajuda a pessoa a não se perder.
   O `scroll-margin-top` das seções já cuida de não esconder o título atrás
   do cabeçalho fixo.
   ============================================================ */
export function Ancoras() {
  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      /* clique com modificador é intenção de abrir em outra aba: sai do caminho */
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const link = (e.target as HTMLElement)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      const id = link?.getAttribute("href")?.slice(1);
      const alvo = id && document.getElementById(id);
      if (!alvo) return;
      e.preventDefault();
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      alvo.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
    };
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);
  return null;
}

/* ============================================================
   ÍCONES DE ETAPA — o traço mínimo de cada estágio da operação,
   desenhados na mesma gramática das plantas de /servicos.
   ============================================================ */
function IconeEtapa({ tipo }: { tipo: string }) {
  switch (tipo) {
    case "catalogo": return <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
    /* a etapa "produto" existia na lista do trilho sem case aqui, e o segundo
       círculo do hero saía vazio: foto, descrição e o botão de comprar */
    case "produto": return <svg viewBox="0 0 24 24" aria-hidden><rect x="4" y="3" width="16" height="18" rx="1" /><rect x="7" y="6" width="10" height="7" rx="1" /><path d="M7 16h7M7 19h4" /></svg>;
    case "carrinho": return <svg viewBox="0 0 24 24" aria-hidden><path d="M3 4h3l2 12h11" /><path d="M8 16h11l2-9H6" /><circle cx="10" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></svg>;
    case "checkout": return <svg viewBox="0 0 24 24" aria-hidden><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 10h8M8 14h5" /></svg>;
    case "pagamento": return <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="6" width="18" height="12" rx="1" /><path d="M3 10h18" /></svg>;
    case "pedido": return <svg viewBox="0 0 24 24" aria-hidden><path d="M5 4h11l3 3v13H5z" /><path d="M9 12l2 2 4-4" /></svg>;
    case "estoque": return <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8l8-4 8 4-8 4z" /><path d="M4 8v8l8 4 8-4V8" /></svg>;
    case "painel": return <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M9 4v16M3 10h6" /></svg>;
    default: return null;
  }
}

/* Plantas em SVG — o painel administrativo, o hub de integrações e as
   telas do case, no mesmo traço 1.5 + anotações mono do estúdio. */
function Planta({ tipo }: { tipo: string }) {
  const T = (p: { x: number; y: number; children: string; end?: boolean; mid?: boolean }) => (
    <text x={p.x} y={p.y} className={s.plantaTexto} textAnchor={p.end ? "end" : p.mid ? "middle" : "start"}>{p.children}</text>
  );
  switch (tipo) {
    case "hub":
      /* Antes isto era SmartArt: oito retângulos arredondados, setas pretas
         gordas e a caixa do meio preenchida de verde. Saiu tudo. Sobrou o que
         o desenho precisa dizer: oito fios mirando uma palavra. Os fios param
         antes de chegar e a palavra ocupa o vão, então o centro existe sem
         precisar de moldura. Sem caixas, sem setas, sem preenchimento. */
      return <svg viewBox="0 0 380 152" aria-hidden>
        <text x={6} y={84} className={s.plantaFoco}>E-COMMERCE</text>
        <line x1="84" y1="80" x2="360" y2="80" />
        {/* derivações acima e abaixo do mesmo barramento, alternadas para os
            rótulos nunca disputarem espaço: sem diagonal, nada desalinha */}
        <line x1="100" y1="80" x2="100" y2="52" /><T x={100} y={42} mid>PAGAMENTO</T>
        <line x1="170" y1="80" x2="170" y2="52" /><T x={170} y={42} mid>ESTOQUE</T>
        <line x1="240" y1="80" x2="240" y2="52" /><T x={240} y={42} mid>ERP</T>
        <line x1="310" y1="80" x2="310" y2="52" /><T x={310} y={42} mid>NF-E</T>
        <line x1="135" y1="80" x2="135" y2="108" /><T x={135} y={122} mid>FRETE</T>
        <line x1="205" y1="80" x2="205" y2="108" /><T x={205} y={122} mid>WHATSAPP</T>
        <line x1="275" y1="80" x2="275" y2="108" /><T x={275} y={122} mid>ANÁLISE</T>
        <line x1="345" y1="80" x2="345" y2="108" /><T x={345} y={122} mid>PIXEL</T>
      </svg>;
    case "hubMob":
      /* O mesmo barramento em pé. O horizontal precisa de 380 unidades de
         largura e, dentro de um card de ~300px no celular, o mono de 8px
         renderiza a 6,5px: ilegível. Em pé, o viewBox estreita, a escala sobe
         e cada rótulo ganha a própria linha. É a gramática do .trilho, que a
         página já usa no hero e no processo. */
      return <svg viewBox="0 0 210 258" aria-hidden>
        <text x={6} y={14} className={s.plantaFoco}>E-COMMERCE</text>
        <line x1="14" y1="26" x2="14" y2="248" />
        {["PAGAMENTO", "ESTOQUE", "ERP", "FRETE", "WHATSAPP", "ANÁLISE", "NF-E", "PIXEL"].map((nome, i) => {
          const y = 46 + i * 28;
          return <g key={nome}>
            <line x1="14" y1={y} x2="40" y2={y} />
            <T x={48} y={y + 3}>{nome}</T>
          </g>;
        })}
      </svg>;
    case "home": /* vitrine de produtos */
      return <svg viewBox="0 0 160 200" role="img" aria-label="Tela inicial da loja com destaque e grade de produtos">
        <rect x="8" y="8" width="144" height="184" rx="3" />
        <line x1="18" y1="22" x2="60" y2="22" strokeWidth="4" />
        <rect x="18" y="34" width="124" height="40" rx="2" className={s.plantaCheia} />
        <rect x="18" y="84" width="58" height="46" rx="2" /><rect x="84" y="84" width="58" height="46" rx="2" />
        <rect x="18" y="140" width="58" height="46" rx="2" /><rect x="84" y="140" width="58" height="46" rx="2" />
      </svg>;
    case "categoria": /* filtros + grade */
      return <svg viewBox="0 0 160 200" role="img" aria-label="Tela de categoria com filtros e grade">
        <rect x="8" y="8" width="144" height="184" rx="3" />
        <line x1="18" y1="24" x2="70" y2="24" strokeWidth="3" />
        <rect x="18" y="36" width="34" height="150" rx="2" strokeDasharray="3 3" />
        <line x1="24" y1="50" x2="46" y2="50" /><line x1="24" y1="62" x2="46" y2="62" /><line x1="24" y1="74" x2="42" y2="74" />
        <rect x="60" y="36" width="38" height="46" rx="2" /><rect x="106" y="36" width="38" height="46" rx="2" />
        <rect x="60" y="90" width="38" height="46" rx="2" /><rect x="106" y="90" width="38" height="46" rx="2" />
        <rect x="60" y="144" width="38" height="42" rx="2" /><rect x="106" y="144" width="38" height="42" rx="2" />
      </svg>;
    case "produto": /* foto + variações + comprar */
      return <svg viewBox="0 0 160 200" role="img" aria-label="Tela de produto com imagem, preço, variações e botão comprar">
        <rect x="8" y="8" width="144" height="184" rx="3" />
        <rect x="18" y="20" width="124" height="80" rx="2" />
        <line x1="18" y1="112" x2="96" y2="112" strokeWidth="4" />
        <line x1="18" y1="126" x2="70" y2="126" />
        <rect x="18" y="138" width="18" height="18" rx="2" /><rect x="40" y="138" width="18" height="18" rx="2" className={s.plantaCheia} /><rect x="62" y="138" width="18" height="18" rx="2" />
        <rect x="18" y="166" width="124" height="20" rx="2" className={s.plantaCheia} /><T x={54} y={179}>COMPRAR</T>
      </svg>;
    case "checkout": /* dados + frete + pagamento */
      return <svg viewBox="0 0 160 200" role="img" aria-label="Tela de checkout com dados, frete e pagamento">
        <rect x="8" y="8" width="144" height="184" rx="3" />
        <line x1="18" y1="24" x2="64" y2="24" strokeWidth="3" />
        <rect x="18" y="36" width="124" height="18" rx="2" /><rect x="18" y="60" width="124" height="18" rx="2" />
        <rect x="18" y="84" width="60" height="18" rx="2" /><rect x="82" y="84" width="60" height="18" rx="2" />
        <T x={20} y={122}>FRETE · PIX · CARTÃO</T>
        <rect x="18" y="130" width="124" height="16" rx="2" strokeDasharray="3 3" />
        <rect x="18" y="160" width="124" height="24" rx="2" className={s.plantaCheia} /><T x={44} y={176}>PAGAR AGORA</T>
      </svg>;
    case "admin": /* painel resumido */
      return <svg viewBox="0 0 160 200" role="img" aria-label="Painel administrativo com menu, indicadores e lista de pedidos">
        <rect x="8" y="8" width="144" height="184" rx="3" />
        <line x1="44" y1="8" x2="44" y2="192" />
        <line x1="14" y1="24" x2="38" y2="24" strokeWidth="3" /><line x1="14" y1="40" x2="34" y2="40" /><line x1="14" y1="52" x2="36" y2="52" />
        <rect x="52" y="20" width="30" height="26" rx="2" /><rect x="86" y="20" width="30" height="26" rx="2" /><rect x="120" y="20" width="24" height="26" rx="2" className={s.plantaCheia} />
        <line x1="52" y1="62" x2="144" y2="62" /><line x1="52" y1="78" x2="144" y2="78" /><line x1="52" y1="94" x2="144" y2="94" /><line x1="52" y1="110" x2="144" y2="110" />
        <rect x="52" y="122" width="52" height="14" rx="2" className={s.plantaCheia} /><T x={58} y={132}>+ PRODUTO</T>
      </svg>;
    case "mobile": /* a loja no celular */
      return <svg viewBox="0 0 160 200" role="img" aria-label="Versão mobile da loja">
        <rect x="50" y="8" width="60" height="184" rx="8" />
        <line x1="72" y1="18" x2="88" y2="18" />
        <rect x="58" y="30" width="44" height="26" rx="2" className={s.plantaCheia} />
        <rect x="58" y="62" width="20" height="24" rx="2" /><rect x="82" y="62" width="20" height="24" rx="2" />
        <rect x="58" y="92" width="20" height="24" rx="2" /><rect x="82" y="92" width="20" height="24" rx="2" />
        <rect x="58" y="122" width="44" height="16" rx="2" className={s.plantaCheia} />
        <line x1="58" y1="150" x2="102" y2="150" /><line x1="58" y1="162" x2="94" y2="162" />
      </svg>;
    default: return null;
  }
}

/* ============================================================ HEADER */
export function Cabecalho() {
  const [aberto, setAberto] = useState(false);
  return <header className={s.topo}>
    {/* a logo volta ao hero desta página, não para /estudio: quem chega do
        anúncio e toca no topo quer recomeçar a leitura, não trocar de site */}
    <a className={s.marca} href="#o-ecommerce"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></a>
    <button className={s.menu} onClick={() => setAberto(!aberto)} aria-expanded={aberto}>{aberto ? "FECHAR" : "MENU"}</button>
    <nav className={aberto ? s.navAberta : ""} onClick={() => setAberto(false)}>
      <a href="#o-ecommerce">O E-COMMERCE</a>
      <a href="#incluso">O QUE ESTÁ INCLUSO</a>
      {/* "INTEGRAÇÕES" saiu do nav: o id continua no acordeão (é alvo do
          ecommerce_integration_section_view), mas mandar alguém para dentro de
          uma gaveta fechada não é navegação, é beco */}
      <a href="#case">PROJETOS NO AR</a>
      <a href="#processo">COMO FUNCIONA</a>
      <a href="#faq">DÚVIDAS</a>
      {/* sem onClick: o ClickCTA sai do ouvinte delegado em tracking.ts, lendo
          data-cta e data-cta-dest. Um caminho só para os seis CTAs da página */}
      <a className={s.navCta} href="#diagnostico" data-cta="header" data-cta-dest="form">SOLICITAR DIAGNÓSTICO ↗</a>
    </nav>
  </header>;
}

/* ============================================================ HERO */
const etapasHero = [
  { k: "catalogo", nome: "Catálogo", info: "SKU 0384" },
  { k: "produto", nome: "Produto", info: "estoque: 12 un." },
  { k: "carrinho", nome: "Carrinho", info: "2 itens" },
  { k: "checkout", nome: "Checkout", info: "frete calculado" },
  { k: "pagamento", nome: "Pix / cartão", info: "pagamento aprovado" },
  { k: "pedido", nome: "Pedido #1048", info: "registrado" },
  { k: "painel", nome: "Painel", info: "separação" },
];
/* ---------- a manchete mora aqui, e sozinha ----------
   Duas strings e nada mais, porque ela é a peça que troca toda vez que um
   criativo novo ganha: a página precisa continuar a frase do anúncio, senão
   quem clica encontra do outro lado um assunto diferente do que veio buscar.
   Trocar o par abaixo é a mudança inteira, sem procurar JSX.

   Duas e não uma só por causa do verde: a segunda metade entra em <em>, que é
   a gramática de manchete da página (e da vitrine). Uma string única obrigaria
   a manchete a ser toda preta e tiraria do hero o único acento de cor. */
const MANCHETE = ["O CLIENTE ESCOLHE, PAGA E PRONTO.", "NO MESMO MINUTO."];
const APOIO = "E-commerce completo com carrinho, Pix e cartão: a venda se fecha sozinha, até quando você está atendendo outra pessoa, ou dormindo.";
/* Mensagem do WhatsApp do hero: curta porque abre no teclado de um celular, e
   escrita na voz de quem ainda não decidiu, que é quem chega aqui pelo anúncio.
   Ela não promete diagnóstico nem preço: promete uma pergunta respondida. */
const MSG_HERO = "Oi Rafael! Tenho uma loja e quero entender se um e-commerce completo faz sentido pra mim.";
export function Hero() {
  return <section className={s.hero} id="o-ecommerce">
    <div className={s.heroGrade}>
      <div>
        <p className={s.olho}>E-COMMERCE SOB MEDIDA · DESIGN · OPERAÇÃO · CONVERSÃO</p>
        <h1>{MANCHETE[0]} <em>{MANCHETE[1]}</em></h1>
        <p className={s.apoio}>{APOIO}</p>
        {/* a âncora antes dos botões, não depois: ela é o que decide se a
            pessoa toca em algum, então chegar junto com eles é tarde */}
        <p className={s.ancora}>Projetos a partir de <b>{VALOR_BASE}</b></p>
        {/* ---------- os dois caminhos, na ordem em que convertem ----------
            O WhatsApp na frente e cheio, o formulário atrás e de contorno. Não
            é preferência de layout: no mesmo período esta página levou 30
            visitas de anúncio a zero contatos com o formulário como único
            caminho, enquanto a vitrine, que abre conversa direto, fez 21 leads.
            O formulário fica porque quem prefere escrever a falar existe, e
            porque ele é o que grava o lead no servidor.

            SEM target="_blank" no link do WhatsApp: aba nova é o que quebra no
            navegador interno do Instagram, de onde vem quase todo o tráfego. O
            tracking.ts intercepta o clique, dispara o Lead e navega por
            location.href 300ms depois. */}
        <div className={s.acoes}>
          <a className={`${s.botao} ${s.cheio}`} href={zap(MSG_HERO)} data-cta="hero_whatsapp" data-cta-dest="whatsapp">FALAR COM O RAFAEL NO WHATSAPP ↗</a>
          <a className={`${s.botao} ${s.contorno}`} href="#diagnostico" data-cta="hero" data-cta-dest="form">QUERO PLANEJAR MEU E-COMMERCE ↗</a>
          {/* este ganhou data-cta agora: era o único CTA sem, porque a lista
              antiga do Lead o excluía de propósito (rola para #incluso, é
              navegação). Como ClickCTA ele PRECISA existir, e o `destination`
              é o que separa navegação de intenção na hora de ler */}
          <a className={s.discreto} href="#incluso" data-cta="hero_incluso" data-cta-dest="incluso">VER O QUE ESTÁ INCLUSO ↓</a>
        </div>
        <p className={s.heroMicro}>Você fala direto comigo, sem compromisso.</p>
      </div>

      {/* assinatura: o pedido percorre a operação */}
      <div className={s.prancheta} role="img" aria-label="A operação de uma loja: um pedido percorre catálogo, produto, carrinho, checkout, pagamento, pedido e painel administrativo, com o status avançando de pago para em separação e enviado">
        <div className={s.pedidoTopo}>
          <span>OPERAÇÃO · PEDIDO <b>#1048</b></span>
          <span>SKU <b>0384</b> · ESTOQUE <b>12</b></span>
        </div>
        <ol className={s.trilhoOp}>
          {etapasHero.map((e) => <li className={s.etapaOp} key={e.k}>
            <b><IconeEtapa tipo={e.k} /></b>
            <span>{e.nome}</span>
            <small>{e.info}</small>
          </li>)}
        </ol>
        <div className={s.pedidoStatus}>
          <div className={s.pedidoIndic}><span>PAGAMENTO <b>PIX</b></span><span>ENTREGA <b>BRASIL</b></span></div>
          <div className={s.statusCiclo}>
            <span className={`${s.chip} ${s.chipPago}`}>PAGO</span>
            <span className={`${s.chip} ${s.chipSep}`}>EM SEPARAÇÃO</span>
            <span className={`${s.chip} ${s.chipEnviado}`}>ENVIADO</span>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ============================================================ FAIXA EDITORIAL */
export function Faixa() {
  const termos = ["PRODUTOS", "CARRINHO", "CHECKOUT", "PAGAMENTO", "ESTOQUE", "PEDIDOS", "FRETE", "GESTÃO"];
  const linha = (
    <span aria-hidden>{termos.map((t) => <span key={t}>{t}<i>·</i></span>)}</span>
  );
  return <div className={s.faixa}>
    <div className={s.faixaTrilho}>
      <span>{termos.map((t) => <span key={t}>{t}<i>·</i></span>)}</span>
      {linha}
    </div>
  </div>;
}

/* ============================================================ OPERAÇÃO
   Um bloco no lugar de três que provavam a mesma coisa. "O cliente vê a loja"
   dava a tese, "tudo o que a loja precisa" dava o inventário e "integrações"
   dava o entorno: agora a tese abre o bloco e todo o resto é acordeão fechado,
   então o detalhe fino continua existindo para quem procura, sem custar tela
   para quem está indo à prova.

   As duas colunas "para quem compra / para quem vende" saíram: repetiam os
   cinco grupos item por item ("Cadastro de produtos" e "Controle de estoque"
   já moram em Administração).

   Cada categoria mostra número, título e uma linha de resumo; os 9 a 11 itens
   só aparecem a um toque. O resumo é escrito, não é o primeiro item da lista:
   "Página inicial" sozinho não diz o que a categoria cobre.

   DOIS IDS QUE NÃO PODEM SUMIR: `incluso` é o alvo do CTA secundário do hero e
   do link do header; `integracoes`, no sexto acordeão, é o alvo do
   IntersectionObserver que dispara ecommerce_integration_section_view. */
const grupos: [string, string, string, string[]][] = [
  ["01", "Experiência da loja", "Página inicial, categorias, busca, produto, carrinho e área do cliente.",
    ["Página inicial", "Categorias", "Pesquisa", "Filtros", "Página de produto", "Produtos relacionados", "Variações de tamanho, cor ou modelo", "Carrinho", "Área do cliente", "Acompanhamento de pedidos", "Versão mobile"]],
  ["02", "Comercial", "Preço, promoção, cupom, kit, pronta entrega e encomenda.",
    ["Preços", "Preços promocionais", "Cupons", "Kits", "Descontos", "Condições comerciais", "Pronta entrega", "Encomendas", "Produtos esgotados", "Destaques e lançamentos"]],
  ["03", "Pagamento e entrega", "Pix, cartão, gateway, cálculo de frete, retirada e status do pedido.",
    ["Pix", "Cartão", "Gateway de pagamento", "Cálculo de frete", "Retirada", "Entrega local", "Regras de frete grátis", "Status do pedido", "Comunicação transacional"]],
  ["04", "Administração", "Painel com produtos, estoque, pedidos, clientes, cupons e banners.",
    ["Painel administrativo", "Cadastro e edição de produtos", "Imagens", "Categorias", "Variações", "Estoque", "Pedidos", "Clientes", "Cupons", "Banners", "Usuários e permissões"]],
  ["05", "Estrutura", "Domínio, hospedagem, segurança, SEO técnico, analytics e publicação.",
    ["Domínio", "Hospedagem", "Banco de dados", "Segurança", "Responsividade", "SEO técnico básico", "Analytics", "Eventos de conversão", "Publicação", "Treinamento de uso"]],
];
export function Operacao() {
  return <section className={`${s.secao} ${s.secaoMenor}`} id="incluso">
    <div className={s.molde}>
      <p className={s.olho}>NÃO É APENAS SOBRE COLOCAR PRODUTOS EM UMA PÁGINA</p>
      <h2>O CLIENTE VÊ A LOJA. VOCÊ VIVE A <em>OPERAÇÃO.</em></h2>
      <p className={s.apoio}>Por trás de cada compra existe uma operação: produtos organizados, estoque confiável, pagamento que funciona, pedido que chega certo, e você administrando tudo sem depender de alterações no código.</p>
      <div className={s.grupos}>
        {grupos.map(([n, titulo, resumo, itens]) => <details className={s.grupo} key={n}>
          <summary>
            <span className={s.grupoTopo}><b>{n}</b><h3>{titulo}</h3></span>
            <span className={s.grupoResumo}>{resumo}</span>
          </summary>
          <ul className={s.grupoLista}>{itens.map((x) => <li key={x}>{x}</li>)}</ul>
        </details>)}

        {/* sexto card do mesmo inventário: as integrações fazem parte do que a
            estrutura entrega, então não precisavam de uma seção só delas */}
        <details className={s.grupo} id="integracoes">
          <summary>
            <span className={s.grupoTopo}><b>06</b><h3>Integrações</h3></span>
            <span className={s.grupoResumo}>Pagamento, estoque, ERP, frete, WhatsApp, analytics e emissão fiscal.</span>
          </summary>
          <p className={s.grupoP}>As integrações reduzem trabalho manual, evitam informação duplicada e conectam a loja à operação que já existe.</p>
          <div className={s.hubDesenho} role="img" aria-label="A loja como um barramento: pagamento, estoque, ERP, frete, WhatsApp, análise, emissão fiscal e pixel derivam da mesma estrutura">
            <div className={`${s.hubDesk} ${s.plantaCaixa}`}><Planta tipo="hub" /></div>
            <div className={`${s.hubMob} ${s.plantaCaixa}`}><Planta tipo="hubMob" /></div>
          </div>
          <p className={s.obs}>A viabilidade de cada integração é analisada individualmente. Alguns sistemas não disponibilizam API ou documentação suficiente.</p>
        </details>
      </div>
      <p className={s.obs}>As funcionalidades finais são definidas de acordo com a operação de cada negócio.</p>
    </div>
  </section>;
}

/* ============================================================ PAINEL (escura) */
export function Painel() {
  /* O h2 antigo ("não depender de um desenvolvedor para alterar um preço")
     virou o subtítulo do hero. Aqui o título passa a nomear o que o mock
     realmente mostra: a fila de pedidos e os estados por que ela passa. */
  return <section className={`${s.secao} ${s.escura} ${s.secaoMenor}`} id="painel">
    <div className={s.molde}>
      <p className={s.olho}>A LOJA POR TRÁS DA LOJA</p>
      <h2>TODO PEDIDO VIRA UMA FILA. O PAINEL É ONDE ELA <em>ANDA.</em></h2>
      <div className={s.painelGrade}>
        <div className={s.mockPainel} aria-hidden>
          <div className={s.mockBarra}><i /><i /><i /><span>painel.sualoja.com.br</span></div>
          <div className={s.mockCorpo}>
            <div className={s.mockMenu}><i /><i /><i /><i /><i /></div>
            <div className={s.mockPainelMain}>
              <div className={s.mockKpis}>
                <div className={s.mockKpi}><small>NOVOS PEDIDOS</small><b>07</b></div>
                <div className={s.mockKpi}><small>A ENVIAR</small><b>03</b></div>
                <div className={`${s.mockKpi} ${s.kpiAlerta}`}><small>ESTOQUE BAIXO</small><b>02</b></div>
              </div>
              <div className={s.mockLinhas}>
                <div className={s.mockLinha}><em>PEDIDO <b>#1048</b></em><span className={`${s.chip} ${s.chipPago}`}>PAGO</span></div>
                <div className={s.mockLinha}><em>PEDIDO <b>#1047</b></em><span className={`${s.chip} ${s.chipSep}`}>EM SEPARAÇÃO</span></div>
                <div className={s.mockLinha}><em>PEDIDO <b>#1046</b></em><span className={`${s.chip} ${s.chipEnviado}`}>ENVIADO</span></div>
                <div className={s.mockLinha}><em>TÊNIS RUNNER <b>· 41</b></em><span className={`${s.chip} ${s.chipBaixo}`}>ESTOQUE BAIXO</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className={s.painelTexto}>
          <p className={s.apoioEscuro} style={{ marginTop: 0 }}>Quando o projeto exige administração própria, é desenvolvido um painel para gerenciar as informações essenciais da operação sem alterar o código da loja: visão geral, novos pedidos, faturamento, produtos com estoque baixo, cadastro de produto, alteração de preço, disponibilidade, banners e categorias.</p>
          {/* a régua de estados saiu: os mesmos chips já aparecem na lista de
              pedidos do mock, logo ao lado, e repetir custava quase uma dobra
              de celular. O CTA fica, com o `origem: "painel"` intacto. */}
          <div className={s.acoes}>
            <a className={`${s.botao} ${s.contorno} ${s.contornoClaro}`} href="#diagnostico" data-cta="painel" data-cta-dest="form">ENTENDER O PAINEL ADMINISTRATIVO ↗</a>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ============================================================ PROVA
   Entra no lugar dos seis wireframes de conceito, que provavam apenas que
   alguém sabe desenhar retângulos. Aqui tudo é verificável: dois sites de
   clientes no ar, com a página inteira rolando na tela, e o print da tela
   de produtos do painel da Xavier's, sem um número alterado.

   A seção é dividida em duas metades com os mesmos nomes da promessa do
   hero: O QUE O CLIENTE VÊ (as duas lojas) e O QUE O DONO OPERA (o painel).
   O corte não é enfeite — é o argumento da página desenhado em layout.

   Honestidade obrigatória: nenhum e-commerce completo foi entregue ainda.
   A nota do rodapé diz isso com todas as letras, porque prova que mente
   uma vez não serve mais para nada. Os wireframes continuam existindo,
   fechados no acordeão, que é onde uma explicação de estrutura pertence.

   Fundo claro desde 05/08. Era escuro, mas depois do corte de seções ele
   ficou colado no bloco escuro do painel: dava 3,8 telas seguidas de --night
   no celular, e a prova perdia o contorno de seção. Agora o peso dela vem do
   tamanho e de ser a única seção com fotografia: os dois MacBooks e a moldura
   do painel são objetos escuros sobre creme, e o bloco do painel logo acima
   virou o corte que separa a página em atos.

   O id="case" NÃO muda: é o alvo do IntersectionObserver que dispara
   ecommerce_case_view. Os links das lojas saem sem data-cta e sem track()
   de propósito, para o funil continuar exatamente como estava. */
const lojas = [
  {
    img: "/assets/case-xavier-desk.jpg", w: 1440, h: 8965, dur: "36s",
    url: "https://xavier-s-sports.vercel.app/", dom: "xavier-s-sports.vercel.app",
    nome: "XAVIER'S SPORTS", tag: "CAMISAS ESPORTIVAS", tipo: "VITRINE + PAINEL",
    copy: "Catálogo no ar com controle de pronta entrega. Abra pelo celular e faça o caminho que o seu cliente faria.",
    fatos: ["Catálogo por clubes e seleções", "Página para cada produto", "Estoque por tamanho no painel", "Pedido direto no WhatsApp"],
    cta: "ABRIR A LOJA DA XAVIER'S ↗",
  },
  {
    img: "/assets/case-prgrife-desk.jpg", w: 1440, h: 5559, dur: "22s",
    url: "https://pr-grife.vercel.app/", dom: "pr-grife.vercel.app",
    nome: "PR GRIFE", tag: "MULTIMARCAS DE ALTO PADRÃO", tipo: "VITRINE + PAINEL",
    copy: "Loja com ponto físico em Maringá. O dono publica peça nova e ajusta o estoque sozinho, sem me chamar.",
    fatos: ["Catálogo por marca e categoria", "Página para cada produto", "Painel de estoque para o dono", "Pedido com forma de pagamento escolhida"],
    cta: "ABRIR A LOJA DA PR GRIFE ↗",
  },
];
const telas = [
  { k: "home", nome: "Home", tag: "loja" },
  { k: "categoria", nome: "Categoria", tag: "filtros" },
  { k: "produto", nome: "Produto", tag: "variações" },
  { k: "checkout", nome: "Checkout", tag: "pagamento" },
  { k: "admin", nome: "Painel", tag: "pedidos" },
  { k: "mobile", nome: "Mobile", tag: "responsivo" },
];
export function Prova() {
  return <section className={s.secao} id="case">
    <div className={s.molde}>
      <p className={s.olho}>PROJETOS NO AR</p>
      <h2>A BASE JÁ ESTÁ <em>NO AR.</em></h2>
      <p className={s.apoio}>Duas lojas de clientes, publicadas e navegáveis agora. As duas foram desenhadas, desenvolvidas e entregues por mim, e hoje quem mexe nelas é o dono. Cada estrutura é desenhada do zero para a marca, não um tema pronto com a logo colocada por cima.</p>

      <p className={s.metade}>O QUE O CLIENTE VÊ</p>
      <div className={s.lojas}>
        {lojas.map((x) => <article key={x.nome}>
          <div className={s.laptop}>
            <div className={s.lapTela}>
              <div className={s.barraNav}>
                <span className={s.pontos} aria-hidden><i /><i /><i /></span>
                <span className={s.urlChip}>{x.dom}</span>
                <span className={s.noAr}>● NO AR</span>
              </div>
              <a className={s.capa} href={x.url} target="_blank" rel="noopener" aria-label={`Abrir o site da ${x.nome} em uma nova aba`}>
                {/* img simples: o otimizador do Next não lida bem com capturas
                    de quase 9 mil pixels de altura. Então a otimização é feita
                    fora, por scripts/webp-assets.mjs, e entregue por <picture>.
                    As duas capturas somavam 1,8 MB de JPEG; no celular, que é
                    de onde vem o tráfego, agora somam 361 KB. O JPEG fica como
                    último recurso.

                    As dimensões seguem no <img> e não mudam entre as variantes:
                    a redução de celular é proporcional, então a caixa de
                    proporção continua valendo e o --dur da animação, que é
                    calibrado pela altura EXIBIDA, também.

                    A ordem é obrigatória: o navegador pega a primeira source
                    que casa media e type, então as três do celular precisam vir
                    inteiras antes das de desktop. */}
                <picture>
                  <source media="(max-width: 720px)" type="image/avif" srcSet={x.img.replace(/\.jpg$/, "-720.avif")} />
                  <source media="(max-width: 720px)" type="image/webp" srcSet={x.img.replace(/\.jpg$/, "-720.webp")} />
                  <source type="image/avif" srcSet={x.img.replace(/\.jpg$/, ".avif")} />
                  <source type="image/webp" srcSet={x.img.replace(/\.jpg$/, ".webp")} />
                  {/* ---------- fetchPriority low, e é o que salva o LCP ----------
                      `loading="lazy"` não segura nada aqui: depois que a prova
                      subiu para logo abaixo do hero, estas imagens já nascem
                      dentro da margem de pré-carregamento do navegador. Medido:
                      elas começavam a baixar aos 236ms, no MESMO instante que
                      as fontes, e 361 KB contra 136 KB de fonte num 4G
                      simulado é a fonte perdendo. Como o elemento de LCP desta
                      página é TEXTO, a fonte atrasada é o LCP atrasado.
                      Com prioridade baixa elas continuam carregando cedo, mas
                      cedem a vez: quem rola encontra a prova pronta, e quem só
                      lê o hero não paga por ela. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={s.pageShot} src={x.img} width={x.w} height={x.h} style={{ "--dur": x.dur } as React.CSSProperties} alt={`Página completa da loja da ${x.nome}`} loading="lazy" decoding="async" fetchPriority="low" />
                </picture>
              </a>
            </div>
            <div className={s.deck} aria-hidden />
          </div>
          <div className={s.lojaMeta}><small>{x.tag}</small><span className={s.lojaTipo}>{x.tipo}</span></div>
          <h3>{x.nome}</h3>
          <p>{x.copy}</p>
          <ul className={s.fatos}>{x.fatos.map((f) => <li key={f}>{f}</li>)}</ul>
          <a className={`${s.botao} ${s.cheio}`} href={x.url} target="_blank" rel="noopener">{x.cta}</a>
        </article>)}
      </div>

      <p className={s.metade}>O QUE O DONO OPERA</p>
      <figure className={s.painelReal}>
        <div className={s.painelMoldura}>
          <div className={s.barraNav}>
            <span className={s.pontos} aria-hidden><i /><i /><i /></span>
            <span className={s.urlChip}>xavier-s-sports.vercel.app/admin</span>
            <span className={s.noAr}>● PAINEL DA LOJA</span>
          </div>
          {/* Art direction de verdade: no celular entra um recorte das colunas
              Preço, Estoque por tamanho e Status. Encolher a tela inteira para
              350px deixa a tabela com 4px de texto, ou seja, uma prova que
              ninguém consegue ler. <picture> em vez de next/image porque o
              otimizador não troca recorte por media query, e o navegador baixa
              só o arquivo que corresponde. */}
          <div className={s.painelQuadro}>
            {/* a ordem importa: o navegador pega a PRIMEIRA source que casa
                media e type, então o recorte do celular precisa esgotar os
                três formatos antes de a versão de desktop aparecer na lista */}
            <picture>
              <source media="(max-width: 720px)" type="image/avif" srcSet="/assets/demo/xavier-painel-mob.avif" />
              <source media="(max-width: 720px)" type="image/webp" srcSet="/assets/demo/xavier-painel-mob.webp" />
              <source media="(max-width: 720px)" srcSet="/assets/demo/xavier-painel-mob.jpg" />
              <source type="image/avif" srcSet="/assets/demo/xavier-painel.avif" />
              <source type="image/webp" srcSet="/assets/demo/xavier-painel.webp" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/demo/xavier-painel.jpg" alt="Tela de produtos do painel da Xavier's Sports: cada camisa com preço, estoque por tamanho e status de pronta entrega" loading="lazy" decoding="async" fetchPriority="low" />
            </picture>
          </div>
        </div>
        {/* sem "foto" na lista: o recorte mobile corta a coluna do produto, e
            legenda não pode prometer o que a imagem ao lado não mostra */}
        <figcaption className={s.painelLegenda}>Painel da Xavier&apos;s Sports, operado pelo dono da loja. Preço, estoque por tamanho e disponibilidade mudam por ali, sem tocar em código.</figcaption>
      </figure>

      <p className={s.notaProva}>Estruturas de vitrine e painel desenvolvidas pelo estúdio e operadas pelos próprios donos. O módulo de e-commerce completo estende essa mesma base com carrinho, checkout e pagamento.</p>

      <details className={`${s.dobra} ${s.dobraTelas}`}>
        <summary>Como as telas se conectam</summary>
        <p className={s.dobraNota}>Desenhos de estrutura, não capturas de um cliente entregue: home, categoria, produto, checkout, painel e mobile ligados pela mesma operação.</p>
        <div className={s.telas}>
          {telas.map((t) => <figure className={s.tela} key={t.k}>
            <figcaption className={s.telaTopo}><b>{t.nome}</b><span>{t.tag}</span></figcaption>
            <div className={s.plantaCaixa}><Planta tipo={t.k} /></div>
          </figure>)}
        </div>
      </details>

      <div className={s.acoes}>
        <a className={`${s.botao} ${s.cheio}`} href="#diagnostico" data-cta="prova" data-cta-dest="form">PLANEJAR O MEU E-COMMERCE ↗</a>
      </div>
    </div>
  </section>;
}

/* ============================================================ PROCESSO */
const etapas = [
  ["Diagnóstico", "Entendimento do negócio, produtos, público, operação atual, volume, entregas e objetivos."],
  ["Escopo", "Definição das páginas, recursos, integrações, responsabilidades e etapas do projeto."],
  ["Arquitetura", "Organização das categorias, produtos, jornada, painel, banco de dados e fluxos."],
  ["Direção visual", "Criação da interface com base na identidade e no posicionamento da marca."],
  ["Desenvolvimento", "Implementação da loja, responsividade, administração e integrações previstas."],
  ["Cadastro e configuração", "Configuração dos meios de pagamento, frete, domínio, produtos e informações essenciais."],
  ["Testes", "Validação de navegação, carrinho, checkout, pagamento, estoque, pedidos e dispositivos."],
  ["Publicação", "Entrada no ar, orientação de uso e acompanhamento inicial."],
];
export function Processo() {
  /* Oito passos com descrição custavam uma tela e meia de celular a quem ainda
     não decidiu conversar. Quem quer saber como o projeto anda abre; quem está
     indo para o formulário passa reto. O id fica: é o link COMO FUNCIONA. */
  return <section className={`${s.secao} ${s.secaoMenor}`} id="processo">
    <div className={s.molde}>
      <p className={s.olho}>DA OPERAÇÃO À TELA</p>
      {/* manchete curta porque a seção agora é uma linha só: em 320px a antiga
          ("como um e-commerce sai da ideia e chega ao primeiro pedido") ocupava
          quatro linhas para anunciar um acordeão fechado */}
      <h2>DA IDEIA AO <em>PRIMEIRO PEDIDO.</em></h2>
      <details className={`${s.dobra} ${s.dobraLarga}`}>
        <summary>Como funciona o projeto, do diagnóstico à publicação</summary>
        <ol className={s.trilho}>
          {etapas.map((e, i) => <li key={e[0]}>
            <b>{String(i + 1).padStart(2, "0")}</b>
            <div><h3>{e[0]}</h3><p>{e[1]}</p></div>
          </li>)}
        </ol>
        <p className={s.obs}>O prazo é definido após o diagnóstico. A complexidade varia conforme quantidade de produtos, integrações, regras comerciais e operação.</p>
      </details>
    </div>
  </section>;
}

/* ============================================================ FAQ
   Dezessete perguntas seguidas custavam 1,7 tela de celular a quem já estava
   quase no formulário. As seis que respondem objeção de compra ficam à vista;
   as doze de detalhe técnico esperam atrás de uma gaveta.

   A segunda pergunta é nova e absorve a seção comparativa "nem toda loja
   precisa começar com um e-commerce completo": é a mesma decisão, respondida
   onde a pessoa de fato pergunta. */
type Pergunta = [string, React.ReactNode];
const faqTopo: Pergunta[] = [
  /* Com número desde 06/08, e aberta por padrão (ver `linhaFaq`): esta é a
     pergunta que a pessoa veio fazer, e obrigá-la a tocar para descobrir se
     pode pagar é cobrar um toque justamente de quem ainda não decidiu ficar.
     A resposta continua nomeando os três fatores que mexem no valor: a âncora
     diz por onde começa, o diagnóstico diz onde termina. */
  ["Quanto custa desenvolver um e-commerce?", `Projetos a partir de ${VALOR_BASE}. O valor final sai do diagnóstico, de acordo com a operação da loja: a quantidade de produtos, as integrações com os sistemas que você já usa e as regras comerciais. Eu levanto os três e te mando um escopo fechado, com valor e prazo, antes de qualquer compromisso.`],
  ["Preciso de um e-commerce completo ou de uma vitrine digital?", <>
    Na vitrine, os produtos ficam organizados e o pedido fecha no WhatsApp, sem carrinho nem checkout: serve quando o volume ainda é menor e o atendimento passa por você. O e-commerce serve quando o cliente precisa comprar e pagar sozinho, e quando estoque e pedidos precisam ser administrados. Se for o primeiro caso, <Link className={s.linkTexto} href="/vitrine-digital">conheça a vitrine digital</Link>.
  </>],
  ["Qual é o prazo de desenvolvimento?", "O prazo é definido após o diagnóstico e varia conforme a quantidade de produtos, integrações e a complexidade da operação. A primeira direção visual pode ser apresentada em até 7 dias úteis."],
  ["Eu consigo cadastrar os produtos sozinho?", "Quando o projeto inclui painel administrativo, você cadastra e edita produtos, preços, imagens, categorias e disponibilidade sem alterar o código da loja."],
  ["O painel administrativo está incluído?", "Depende do escopo. Quando a operação exige administração própria, o painel é desenvolvido de acordo com o que o negócio precisa controlar."],
  ["Existe mensalidade?", "Serviços de terceiros como hospedagem, domínio e gateway podem ter custos recorrentes próprios. Manutenção e evolução são definidas separadamente, conforme a necessidade."],
];
const faqResto: Pergunta[] = [
  ["O projeto funciona no celular?", "Sim. Cada seção é planejada e revisada para computadores, tablets e celulares, com atenção especial à experiência mobile, onde a maior parte das compras acontece."],
  ["Quem cadastra os produtos iniciais?", "A carga inicial pode ser feita pelo estúdio ou pela equipe da loja, e é definida no escopo. O painel permite que você siga cadastrando depois."],
  ["Posso integrar com o meu sistema de estoque?", "A integração depende do sistema utilizado, da existência de API e da documentação disponibilizada pelo fornecedor. A viabilidade é analisada antes de entrar no escopo."],
  ["É possível integrar com um ERP?", "É possível quando o ERP oferece API e documentação adequadas. Nem todo sistema disponibiliza integração automática, então cada caso é avaliado individualmente."],
  ["Quais meios de pagamento podem ser utilizados?", "Pix, cartão e gateways de pagamento, conforme a operação. Os meios disponíveis são definidos junto com o gateway escolhido."],
  ["Como funciona o cálculo de frete?", "O frete pode ser calculado por regras próprias, integração com transportadoras, retirada, entrega local e regras de frete grátis, conforme a operação da loja."],
  ["Preciso ter todas as fotos e textos prontos?", "Não necessariamente. Durante o diagnóstico, o material existente é analisado e são identificados os conteúdos que precisam ser produzidos, organizados ou adaptados."],
  ["Domínio e hospedagem estão incluídos?", "A configuração pode fazer parte da entrega. Caso a empresa ainda não tenha domínio ou hospedagem, ela é orientada sobre o registro e a contratação."],
  ["Como funciona a manutenção?", "Suporte, manutenção, atualizações e novas funcionalidades são combinados conforme a necessidade do projeto, fora do escopo inicial de desenvolvimento."],
  ["O e-commerce é seguro?", "O projeto utiliza boas práticas de desenvolvimento e serviços especializados de pagamento. Os dados sensíveis do cartão não devem ser armazenados diretamente pela loja."],
  ["Posso emitir nota fiscal?", "A emissão fiscal é possível por integração com sistemas especializados, quando eles oferecem API e documentação. A viabilidade é avaliada caso a caso."],
  ["A loja poderá receber novas funcionalidades depois?", "Sim. A estrutura é pensada para evoluir, permitindo novas páginas, produtos, campanhas, funcionalidades e integrações ao longo do tempo."],
];
/* Uma pergunta é sempre uma pergunta, esteja à vista ou dentro da gaveta:
   mesmo marcador visual e o mesmo ecommerce_faq_open nas duas. */
/* `aberta` só é usada pela primeira pergunta do topo (a do preço). Ela é
   parâmetro e não índice de propósito: `faqResto.map(linhaFaq)` passaria o
   índice do map e abriria também a primeira da gaveta, que não é a mesma
   decisão.
   AO LER O FUNIL: a pergunta aberta por padrão deixa de aparecer no
   `ecommerce_faq_open`, porque ninguém precisa abrir o que já está aberto. A
   queda a zero nessa linha, a partir de 06/08, é isso e não desinteresse. */
const linhaFaq = (f: Pergunta, aberta = false) => (
  <details key={f[0]} open={aberta} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && track("ecommerce_faq_open", { pergunta: f[0] })}>
    <summary>{f[0]}</summary>
    <p>{f[1]}</p>
  </details>
);
export function Duvidas() {
  return <section className={`${s.secao} ${s.secaoMenor}`} id="faq">
    <div className={s.molde}>
      <p className={s.olho}>DÚVIDAS FREQUENTES</p>
      <h2>ANTES DE COMEÇAR.</h2>
      <div className={s.sanfona}>{faqTopo.map((f, i) => linhaFaq(f, i === 0))}</div>
      {/* a gaveta NÃO dispara ecommerce_faq_open: abrir a gaveta não é tirar
          uma dúvida, e contar as duas coisas juntas estragaria a leitura de
          qual pergunta trava a venda */}
      <details className={`${s.dobra} ${s.dobraLarga}`}>
        <summary>Ver as outras {faqResto.length} dúvidas</summary>
        <div className={s.sanfona}>{faqResto.map((f) => linhaFaq(f))}</div>
      </details>
    </div>
  </section>;
}

/* ============================================================ CTA FINAL + FORMULÁRIO + RODAPÉ */
/* ---------- uma etapa, quatro campos (06/08) ----------
   Eram duas etapas e nove campos, incluindo dois selects, um textarea e uma
   pergunta de faixa de investimento. Aquilo era um diagnóstico, e fazia sentido
   enquanto o formulário precisava carregar a conversa inteira de uma vez: ele
   montava a mensagem do WhatsApp e sumia.

   Depois que o lead passou a ser gravado no servidor e a promessa virou "te
   chamo ainda hoje", o formulário deixou de ser o diagnóstico e virou a porta
   dele. O diagnóstico acontece na conversa, que é onde ele sempre foi melhor.
   Então cada campo aqui precisa se justificar por uma pergunta só: sem ele, eu
   consigo ligar?

   O que sobrou:
   • nome e whatsapp, porque sem os dois não existe lead;
   • instagram ou site, porque a tela de confirmação promete que eu olho a
     operação antes de falar, e sem um endereço eu não olho nada;
   • o que vende, uma linha, que é o que separa "loja de roupa" de "peça
     técnica sob encomenda" antes de eu abrir a boca.

   O que saiu, e por quê: faixa de investimento (a pergunta mais cara de
   responder da página inteira, e a que a conversa resolve em trinta segundos),
   quantidade de produtos e site atual (dois selects que a ligação responde
   sozinha), principal dificuldade (textarea, o pior campo que existe no
   celular) e nome da empresa (o @ do instagram já entrega isso).

   As colunas continuam na tabela `leads`: um lead antigo não perde o que
   respondeu, e a /vitrine-digital pode mandar campos diferentes sem migração. */
const campos = [
  { id: "nome", rot: "Nome", tipo: "text", ph: "Seu nome", req: true },
  { id: "whatsapp", rot: "WhatsApp", tipo: "tel", ph: "(00) 00000-0000", req: true },
  { id: "canal", rot: "Instagram ou site da loja", tipo: "text", ph: "@sualoja ou sualoja.com.br", req: false },
  { id: "vende", rot: "O que você vende", tipo: "text", ph: "Segmento e produtos", req: false },
];
/* Fração da rolagem total a partir da qual a barra fixa aparece. É uma fração
   da PÁGINA, não da tela: numa página longa como esta, 30% é bem mais de uma
   dobra, então a barra chega para quem está lendo de verdade, e não para quem
   ainda está decidindo se fica. */
const INICIO_DA_BARRA = 0.30;
export function ChamadaFinal() {
  const [dados, setDados] = useState<Record<string, string>>({});
  const [ocultarBarra, setOcultarBarra] = useState(false);
  /* guardado no estado para virar o botão de socorro embaixo do formulário */
  const [linkWa, setLinkWa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const set = (k: string, v: string) => setDados((d) => ({ ...d, [k]: v }));

  /* A barra fixa entra depois de 30% da página rolada e some quando o
     formulário aparece, para nunca cobrir os campos e o botão de envio.
     Handler de scroll em vez de IntersectionObserver de propósito: o IO não
     dispara no ambiente CDP usado para testar esta página, e medir o
     getBoundingClientRect é determinístico.

     O gatilho era "passou do hero" e virou distância em 06/08, junto com a
     barra deixar de apontar para o formulário e passar a abrir o WhatsApp. São
     duas perguntas diferentes: "o CTA principal saiu da tela?" pedia o hero,
     "esta pessoa está lendo mesmo?" pede distância. */
  useEffect(() => {
    const form = document.getElementById("diagnostico");
    if (!form) return;
    const aoRolar = () => {
      const f = form.getBoundingClientRect();
      const rolavel = document.documentElement.scrollHeight - window.innerHeight;
      const cedo = rolavel <= 0 || window.scrollY < rolavel * INICIO_DA_BARRA;
      // à vista = o topo do form já subiu à metade inferior e ele ainda não saiu por cima
      const noForm = f.top < window.innerHeight * 0.8 && f.bottom > 0;
      setOcultarBarra(cedo || noForm);
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => { window.removeEventListener("scroll", aoRolar); window.removeEventListener("resize", aoRolar); };
  }, []);

  /* ---------- o envio, invertido em 06/08 ----------
     Antes: dispara os eventos, abre o WhatsApp, torce. Se o handoff falhasse
     (pop-up bloqueado no navegador do Instagram) ou a pessoa desistisse antes
     de tocar em enviar lá, o lead sumia sem deixar nome nem telefone.

     Agora o dado é gravado primeiro, no servidor, e a conversa vira
     consequência: eu chamo, ou ela chama, o que vier primeiro. A tela de
     confirmação é estado do React, sem navegação nenhuma, então ela aparece
     igual no navegador interno do Instagram, que é onde tudo quebrava.

     Se a gravação falhar, o caminho antigo continua valendo inteiro. Perder o
     lead do banco é ruim; deixar a pessoa sem caminho nenhum é pior. */
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;              // toque duplo não grava duas linhas
    setEnviando(true);

    /* Os dois, de propósito, e agora os dois significam lead capturado de
       verdade, não intenção: desde que o Lead saiu dos CTAs de âncora, ele só
       acontece aqui. A campanha otimiza pelo Contact. Disparam ANTES da
       gravação porque não podem depender dela: o Pixel morre com a aba, e
       segurar o evento esperando o banco é como se perdia evento antes. */
    trackLead({ ctaPosition: "form", nome: dados.nome, whatsapp: dados.whatsapp });
    trackContact({ nome: dados.nome, whatsapp: dados.whatsapp });

    /* A mensagem encolheu junto com o formulário. Ela só é usada quando a
       pessoa escolhe falar agora (ou no fallback), e nesse caso a conversa já
       vai acontecer: repetir seis campos ali era encher o teclado dela com o
       que eu já tenho na tabela. */
    const linha = (r: string, v?: string) => (v?.trim() ? `${r}: ${v.trim()}` : "");
    const msg = [
      "Olá, Rafael! Preenchi o formulário no site sobre um e-commerce.",
      "",
      linha("Loja", dados.canal),
      linha("Vendo", dados.vende),
    ].filter(Boolean).join("\n");
    /* guardado antes de qualquer caminho: serve à confirmação e ao fallback */
    const link = zap(msg);
    setLinkWa(link);

    const salvo = await salvarLead({
      pagina: "e-commerce",
      nome: dados.nome || "",
      whatsapp: dados.whatsapp || "",
      canal: dados.canal,
      vende: dados.vende,
      ...contextoDaSessao(),
    });
    setEnviando(false);

    if (salvo) {
      track("ecommerce_lead_salvo");
      setEnviado(true);
      return;
    }

    /* fallback: exatamente o comportamento anterior, WhatsApp na mesma aba
       com os 300ms do Pixel. A tela de confirmação NÃO aparece aqui, porque
       aqui o lead de fato só existe se a conversa acontecer, e prometer
       "recebi seus dados" seria mentira. */
    track("ecommerce_whatsapp_click", { cta_position: "form", origem: "fallback" });
    irParaWhatsapp(link);
  }

  return <>
    <section className={`${s.secao} ${s.escura} ${s.final}`} id="diagnostico">
      <p className={s.agenda}>AGENDA PARA NOVOS PROJETOS</p>
      <h2>SEU E-COMMERCE COMEÇA ANTES DA <em>PRIMEIRA TELA.</em></h2>
      {/* a chamada acompanhou o encolhimento do formulário: prometer "conte
          sobre sua operação" na frente de quatro campos seria pedir de novo o
          esforço que acabou de sair. O trabalho de entender a operação passou
          para a conversa, e é isso que a frase diz agora. */}
      <p className={s.apoioEscuro}>Deixe seu contato e o endereço da sua loja. Eu olho sua operação antes de falar com você, e a conversa já começa com uma direção: estrutura, investimento e caminho para colocar o projeto no ar.</p>
      {/* o que sobrou da seção "uma loja é uma operação": dos seis argumentos
          de lá, só este é um fato verificável e escasso, e escassez pertence
          ao lado do formulário, não a um card no meio da página */}
      <p className={s.agendaLimite}>Agenda limitada: poucos projetos simultâneos para manter o nível de cada entrega.</p>

      {/* ---------- a tela de confirmação ----------
          Ocupa o lugar do formulário quando o lead está gravado. É estado do
          React, sem navegação e sem pop-up, então aparece igual no navegador
          interno do Instagram, que é onde o fluxo antigo quebrava calado.
          A promessa é explícita ("ainda hoje") porque agora dá para cumprir:
          o nome e o WhatsApp estão no banco e o aviso já saiu.
          O botão é opcional de propósito: quem quer agilizar chama, quem não
          quer já entregou o que era preciso e não precisa fazer mais nada. */}
      {enviado ? <div className={s.confirmado} role="status">
        <b>RECEBI SEUS DADOS</b>
        <h3>Te chamo no WhatsApp ainda hoje.</h3>
        <p>Vou olhar sua operação antes de falar com você, para a conversa já começar com uma direção. Se preferir adiantar, é só me chamar.</p>
        {/* sem onClick desde 06/08: o ouvinte delegado do tracking.ts passou a
            tratar `data-cta-dest="whatsapp"`, e ele já emite "Abriu o WhatsApp"
            com cta_position "confirmacao". Manter o onClick daria dois eventos
            para um toque. O `reabrir_whats` está em FORA_DO_LEAD, então o Lead
            NÃO sai daqui: o submit já mandou Lead e Contact segundos antes. */}
        <a className={`${s.botao} ${s.cheio}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">
          QUER AGILIZAR? ME CHAMA AGORA ↗
        </a>
      </div> : <form className={s.form} onSubmit={enviar}>
        {/* Sem cabeçalho de etapas: contar passos só faz sentido quando existe
            mais de um, e o "1 · OPERAÇÃO / 2 · CONTATO" era, ele próprio, o
            aviso de que ainda faltava trabalho depois do que estava na tela.
            Os dois campos que não são obrigatórios dizem isso na etiqueta, o
            que só cabe agora que sobraram quatro. */}
        <div className={s.formCorpo}>
          <div className={s.dupla}>
            {campos.map((c) => <label className={s.campo} key={c.id}>
              <span>{c.rot}{!c.req && <i className={s.opcional}>opcional</i>}</span>
              <input type={c.tipo} name={c.id} placeholder={c.ph} value={dados[c.id] || ""}
                     onChange={(ev) => set(c.id, ev.target.value)} required={c.req}
                     autoComplete={c.id === "nome" ? "name" : c.id === "whatsapp" ? "tel" : "off"} />
            </label>)}
          </div>
          <div className={s.formNav}>
            <span />
            {/* o rótulo muda porque o botão passou a esperar o servidor: sem
                isso, um toque em rede ruim parece um botão que não funciona,
                e a pessoa toca de novo.
                Sem a seta ↗: nesta página ela significa "sai daqui", e o envio
                agora acontece na própria tela. */}
            <button type="submit" className={`${s.botao} ${s.cheio}`} disabled={enviando}>
              {enviando ? "ENVIANDO…" : "QUERO FALAR SOBRE MEU E-COMMERCE"}
            </button>
          </div>
        </div>
        {/* O aviso vira o socorro depois do envio. Antes daqui não saía nada:
            a página abria o WhatsApp e ficava calada, então quem caísse no
            bloqueio de pop-up do navegador do Instagram não tinha o que fazer.
            O `data-cta` existe para dar para medir quantas pessoas precisam
            dele: se este número subir, o handoff está falhando, e não é a
            oferta que está errada.

            A linha de baixo (antes do envio) mudou junto com o fluxo em 06/08:
            enviar não abre mais o WhatsApp, ele registra o diagnóstico e eu
            chamo. Se ela continuasse dizendo "abre no WhatsApp", a tela de
            confirmação chegaria contradizendo o que a pessoa acabou de ler. */}
        {linkWa
          ? <div className={s.pendente} role="status">
              <b>FALTA UM TOQUE</b>
              <p>Abri o WhatsApp com seu diagnóstico já preenchido. Toque em <b>enviar</b> lá para eu receber, senão ele não chega.</p>
              <a className={`${s.botao} ${s.cheio}`} href={linkWa} data-cta="reabrir_whats" data-cta-dest="whatsapp">ABRIR O WHATSAPP ↗</a>
            </div>
          : <p className={s.rodapeForm}>Ao enviar, recebo seu diagnóstico e te chamo no WhatsApp. Nenhuma informação é publicada.</p>}
      </form>}
      <small className={s.micro}>A conversa inicial serve para entender a operação antes da definição do escopo e do investimento.</small>
    </section>

    {/* A barra deixou de rolar para o formulário e passou a abrir a conversa
        (06/08). Ela é a única peça que acompanha a pessoa a página inteira, e
        mandá-la para o mesmo formulário que os outros cinco CTAs já ofereciam
        era gastar essa companhia repetindo o caminho que não converteu.
        `data-cta` NOVO (`barra_fixa_whatsapp`) de propósito: reaproveitar
        `barra_fixa` misturaria, na mesma linha do relatório, os cliques que
        rolavam a página com os que trocam de app. */}
    <a className={`${s.barraFixa} ${ocultarBarra ? s.barraOculta : ""}`} href={zap(MSG_HERO)} data-cta="barra_fixa_whatsapp" data-cta-dest="whatsapp">
      <small>E-COMMERCE SOB MEDIDA<i>Sem compromisso</i></small>
      <span>FALAR NO WHATSAPP ↗</span>
    </a>

    <footer className={s.rodape}>
      <div className={s.marca}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav>
        <Link href="/estudio/">INÍCIO</Link>
        <Link href="/servicos">SERVIÇOS</Link>
        <Link href="/e-commerce">E-COMMERCE</Link>
        <Link href="/vitrine-digital">VITRINE DIGITAL</Link>
        <Link href="/termos">TERMOS</Link>
        <Link href="/privacidade">PRIVACIDADE</Link>
      </nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
    </footer>
  </>;
}
