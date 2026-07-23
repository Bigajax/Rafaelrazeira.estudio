"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import s from "@/app/e-commerce/ecommerce.module.css";
import { initTracking, track, trackLead } from "@/components/ecommerce/tracking";

/* Um número, uma função — todos os links de WhatsApp saem daqui. */
const NUMERO = "5544999997219";
const zap = (msg: string) => `https://wa.me/${NUMERO}?text=${encodeURIComponent(msg)}`;

/* Dispara o funil no mount (Pixel + Mixpanel), respeitando o opt-out. */
export function Analytics() { useEffect(() => { initTracking(); }, []); return null; }

/* ============================================================
   ÍCONES DE ETAPA — o traço mínimo de cada estágio da operação,
   desenhados na mesma gramática das plantas de /servicos.
   ============================================================ */
function IconeEtapa({ tipo }: { tipo: string }) {
  switch (tipo) {
    case "catalogo": return <svg viewBox="0 0 24 24" aria-hidden><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>;
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
  const T = (p: { x: number; y: number; children: string; end?: boolean }) => (
    <text x={p.x} y={p.y} className={s.plantaTexto} textAnchor={p.end ? "end" : "start"}>{p.children}</text>
  );
  switch (tipo) {
    case "hub": /* o e-commerce no centro, sistemas ao redor */
      return <svg viewBox="0 0 260 200" role="img" aria-label="Diagrama de integrações: o e-commerce ao centro conectado a pagamento, estoque, ERP, frete, transportadora, WhatsApp, análise e emissão fiscal">
        <rect x="96" y="82" width="68" height="36" rx="3" className={s.plantaCheia} />
        <T x={110} y={104}>E-COMMERCE</T>
        <line x1="96" y1="90" x2="44" y2="34" markerEnd="url(#setaE)" /><rect x="6" y="18" width="60" height="20" rx="3" /><T x={12} y={32}>PAGAMENTO</T>
        <line x1="130" y1="82" x2="130" y2="38" markerEnd="url(#setaE)" /><rect x="100" y="16" width="60" height="20" rx="3" /><T x={107} y={30}>ESTOQUE</T>
        <line x1="164" y1="90" x2="216" y2="34" markerEnd="url(#setaE)" /><rect x="194" y="18" width="60" height="20" rx="3" /><T x={214} y={32}>ERP</T>
        <line x1="90" y1="100" x2="42" y2="100" markerEnd="url(#setaE)" /><rect x="6" y="90" width="34" height="20" rx="3" /><T x={11} y={104}>FRETE</T>
        <line x1="170" y1="100" x2="218" y2="100" markerEnd="url(#setaE)" /><rect x="220" y="90" width="36" height="20" rx="3" /><T x={225} y={104}>PIXEL</T>
        <line x1="96" y1="110" x2="44" y2="166" markerEnd="url(#setaE)" /><rect x="6" y="162" width="62" height="20" rx="3" /><T x={12} y={176}>WHATSAPP</T>
        <line x1="130" y1="118" x2="130" y2="162" markerEnd="url(#setaE)" /><rect x="100" y="164" width="60" height="20" rx="3" /><T x={107} y={178}>ANÁLISE</T>
        <line x1="164" y1="110" x2="216" y2="166" markerEnd="url(#setaE)" /><rect x="194" y="162" width="60" height="20" rx="3" /><T x={200} y={176}>NF-E</T>
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

const PlantaDefs = () => (
  <svg width="0" height="0" aria-hidden>
    <defs>
      <marker id="setaE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L8 4 L0 8" fill="none" stroke="context-stroke" strokeWidth="1.5" />
      </marker>
    </defs>
  </svg>
);

/* ============================================================ HEADER */
export function Cabecalho() {
  const [aberto, setAberto] = useState(false);
  return <header className={s.topo}>
    <Link className={s.marca} href="/estudio/"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></Link>
    <button className={s.menu} onClick={() => setAberto(!aberto)} aria-expanded={aberto}>{aberto ? "FECHAR" : "MENU"}</button>
    <nav className={aberto ? s.navAberta : ""} onClick={() => setAberto(false)}>
      <a href="#o-ecommerce">O E-COMMERCE</a>
      <a href="#incluso">O QUE ESTÁ INCLUSO</a>
      <a href="#processo">COMO FUNCIONA</a>
      <a href="#integracoes">INTEGRAÇÕES</a>
      <a href="#faq">DÚVIDAS</a>
      <a className={s.navCta} href="#diagnostico" onClick={() => track("ecommerce_hero_cta", { origem: "header" })}>SOLICITAR DIAGNÓSTICO ↗</a>
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
export function Hero() {
  return <section className={s.hero} id="o-ecommerce">
    <PlantaDefs />
    <div className={s.heroGrade}>
      <div>
        <p className={s.olho}>E-COMMERCE SOB MEDIDA · DESIGN · OPERAÇÃO · CONVERSÃO</p>
        <h1>SUA LOJA NÃO PRECISA APENAS ESTAR ONLINE. PRECISA ESTAR <em>PRONTA PARA VENDER.</em></h1>
        <p className={s.apoio}>E-commerces desenvolvidos para apresentar seus produtos, facilitar a compra e organizar a operação: do primeiro acesso ao pagamento e à gestão dos pedidos.</p>
        <div className={s.acoes}>
          <a className={`${s.botao} ${s.cheio}`} href="#diagnostico" onClick={() => track("ecommerce_hero_cta", { origem: "hero" })}>QUERO PLANEJAR MEU E-COMMERCE ↗</a>
          <a className={s.discreto} href="#incluso" onClick={() => track("ecommerce_secondary_cta", { origem: "hero" })}>VER O QUE ESTÁ INCLUSO ↓</a>
        </div>
        <p className={s.heroMicro}>Projeto definido conforme produtos, operação, integrações e nível de complexidade. Primeira direção visual apresentada em até 7 dias úteis.</p>
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

/* ============================================================ PROBLEMA */
const paraCompra = ["Navegação clara", "Pesquisa e filtros", "Página de produto completa", "Variações de tamanho e cor", "Carrinho simples", "Checkout objetivo", "Pagamento confiável", "Acompanhamento do pedido", "Experiência responsiva"];
const paraVende = ["Cadastro de produtos", "Controle de estoque", "Acompanhamento de pedidos", "Alteração de preços", "Criação de categorias", "Gerenciamento de banners", "Cupons", "Clientes", "Relatórios", "Integrações"];
export function Problema() {
  return <section className={s.secao}>
    <div className={s.molde}>
      <p className={s.olho}>NÃO É APENAS SOBRE COLOCAR PRODUTOS EM UMA PÁGINA</p>
      <h2>UM E-COMMERCE PRECISA VENDER PARA O CLIENTE E FUNCIONAR PARA QUEM <em>ADMINISTRA.</em></h2>
      <p className={s.apoio}>Por trás de cada compra existe uma operação. Produtos precisam estar organizados, o estoque precisa ser confiável, o pagamento deve funcionar, o pedido precisa chegar corretamente e o responsável pela loja precisa administrar tudo sem depender de alterações no código.</p>
      <div className={s.duasColunas}>
        <div className={s.coluna}>
          <span className={s.rotulo}>PARA QUEM COMPRA</span>
          <h3>A experiência da loja</h3>
          <ul className={s.listaCol}>{paraCompra.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div className={`${s.coluna} ${s.colunaVende}`}>
          <span className={s.rotulo}>PARA QUEM VENDE</span>
          <h3>A operação por trás</h3>
          <ul className={s.listaCol}>{paraVende.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
    </div>
  </section>;
}

/* ============================================================ JORNADA */
const jornada = [
  ["Descoberta", "O visitante encontra a loja por anúncios, redes sociais, busca ou indicação."],
  ["Navegação", "Categorias, filtros e pesquisa ajudam a localizar os produtos."],
  ["Decisão", "A página do produto apresenta imagens, preço, variações, disponibilidade e prazo."],
  ["Carrinho", "O cliente revisa produtos, quantidades, descontos e estimativa de entrega."],
  ["Checkout", "Dados, endereço, frete e pagamento sem etapas desnecessárias."],
  ["Pedido", "A compra é registrada, o estoque é atualizado e o painel acompanha o processo."],
];
export function Jornada() {
  return <section className={s.secao}>
    <div className={s.molde}>
      <p className={s.olho}>DA DESCOBERTA AO PEDIDO APROVADO</p>
      <h2>CADA ETAPA DA COMPRA PRECISA CONDUZIR PARA A <em>PRÓXIMA.</em></h2>
      <ol className={s.jornada}>
        {jornada.map((j, i) => <li className={s.jornadaItem} key={j[0]}>
          <span className={s.jornadaNum}>{String(i + 1).padStart(2, "0")}</span>
          <h3>{j[0]}</h3>
          <p>{j[1]}</p>
        </li>)}
      </ol>
    </div>
  </section>;
}

/* ============================================================ INCLUSO */
const grupos = [
  ["01", "Experiência da loja", ["Página inicial", "Categorias", "Pesquisa", "Filtros", "Página de produto", "Produtos relacionados", "Variações de tamanho, cor ou modelo", "Carrinho", "Área do cliente", "Acompanhamento de pedidos", "Versão mobile"]],
  ["02", "Comercial", ["Preços", "Preços promocionais", "Cupons", "Kits", "Descontos", "Condições comerciais", "Pronta entrega", "Encomendas", "Produtos esgotados", "Destaques e lançamentos"]],
  ["03", "Pagamento e entrega", ["Pix", "Cartão", "Gateway de pagamento", "Cálculo de frete", "Retirada", "Entrega local", "Regras de frete grátis", "Status do pedido", "Comunicação transacional"]],
  ["04", "Administração", ["Painel administrativo", "Cadastro e edição de produtos", "Imagens", "Categorias", "Variações", "Estoque", "Pedidos", "Clientes", "Cupons", "Banners", "Usuários e permissões"]],
  ["05", "Estrutura", ["Domínio", "Hospedagem", "Banco de dados", "Segurança", "Responsividade", "SEO técnico básico", "Analytics", "Eventos de conversão", "Publicação", "Treinamento de uso"]],
];
export function Incluso() {
  return <section className={s.secao} id="incluso">
    <div className={s.molde}>
      <p className={s.olho}>ESTRUTURA COMPLETA</p>
      <h2>TUDO O QUE A LOJA PRECISA PARA <em>OPERAR ONLINE.</em></h2>
      <div className={s.grupos}>
        {grupos.map((g) => <div className={s.grupo} key={g[0] as string}>
          <div className={s.grupoTopo}><b>{g[0]}</b><h3>{g[1]}</h3></div>
          <ul className={s.grupoLista}>{(g[2] as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
        </div>)}
        <div className={s.grupo}>
          <p className={s.obs}>As funcionalidades finais são definidas de acordo com a operação de cada negócio. Integrações dependem da disponibilidade técnica e da API dos sistemas utilizados.</p>
        </div>
      </div>
    </div>
  </section>;
}

/* ============================================================ PAINEL (escura) */
export function Painel() {
  return <section className={`${s.secao} ${s.escura}`} id="painel">
    <div className={s.molde}>
      <p className={s.olho}>A LOJA POR TRÁS DA LOJA</p>
      <h2>VOCÊ NÃO DEVE DEPENDER DE UM DESENVOLVEDOR PARA <em>ALTERAR UM PREÇO.</em></h2>
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
          <div className={s.painelEstados}>
            <span className={`${s.chip} ${s.chipPago}`}>PAGO</span>
            <span className={`${s.chip} ${s.chipSep}`}>EM SEPARAÇÃO</span>
            <span className={`${s.chip} ${s.chipEnviado}`}>ENVIADO</span>
            <span className={`${s.chip} ${s.chipCancel}`}>CANCELADO</span>
            <span className={`${s.chip} ${s.chipBaixo}`}>ESTOQUE BAIXO</span>
          </div>
          <div className={s.acoes}>
            <a className={`${s.botao} ${s.contorno} ${s.discreto}`} style={{ borderColor: "#fff", color: "#fff" }} href="#diagnostico" onClick={() => track("ecommerce_secondary_cta", { origem: "painel" })}>ENTENDER O PAINEL ADMINISTRATIVO ↗</a>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ============================================================ INTEGRAÇÕES */
export function Integracoes() {
  return <section className={s.secao} id="integracoes">
    <div className={s.molde}>
      <p className={s.olho}>SUA OPERAÇÃO NÃO COMEÇA E TERMINA NO SITE</p>
      <h2>O E-COMMERCE PODE CONVERSAR COM AS <em>FERRAMENTAS DO NEGÓCIO.</em></h2>
      <div className={s.hubGrade}>
        <div className={`${s.caixaBranca} ${s.plantaCaixa}`}><Planta tipo="hub" /></div>
        <div className={s.hubTexto}>
          <p className={s.apoio} style={{ marginTop: 0 }}>As integrações reduzem trabalho manual, evitam informações duplicadas e conectam a loja à operação existente: pagamento, estoque, ERP, frete, transportadoras, WhatsApp, analytics, Meta Pixel, e-mail e emissão fiscal.</p>
          <p className={s.obs}>A viabilidade de cada integração é analisada individualmente. Alguns sistemas não disponibilizam API ou documentação suficiente.</p>
          <div className={s.acoes}>
            <a className={`${s.botao} ${s.contorno}`} href="#diagnostico" onClick={() => track("ecommerce_secondary_cta", { origem: "integracoes" })}>AVALIAR MINHAS INTEGRAÇÕES ↗</a>
          </div>
        </div>
      </div>
    </div>
  </section>;
}

/* ============================================================ VITRINE OU E-COMMERCE */
export function VitrineOuEcommerce() {
  return <section className={s.secao}>
    <div className={s.molde}>
      <p className={s.olho}>QUAL ESTRUTURA O SEU NEGÓCIO PRECISA?</p>
      <h2>NEM TODA LOJA PRECISA COMEÇAR COM UM <em>E-COMMERCE COMPLETO.</em></h2>
      <div className={s.comparaGrade}>
        <div className={s.comparaCard}>
          <h3>Vitrine digital</h3>
          <span className={s.rotulo}>INDICADA QUANDO</span>
          <ul className={s.comparaLista}>
            <li>A empresa quer organizar os produtos</li>
            <li>O atendimento continua pelo WhatsApp</li>
            <li>Não existe checkout</li>
            <li>O volume de pedidos ainda é menor</li>
            <li>A operação é mais simples</li>
          </ul>
          <div className={s.fluxo}><span>PRODUTO</span><i>→</i><span>WHATSAPP</span><i>→</i><span>ATENDIMENTO</span></div>
        </div>
        <div className={`${s.comparaCard} ${s.ecom}`}>
          <h3>E-commerce</h3>
          <span className={s.rotulo}>INDICADO QUANDO</span>
          <ul className={s.comparaLista}>
            <li>O cliente deve comprar sozinho</li>
            <li>Existem vários produtos</li>
            <li>Há necessidade de carrinho</li>
            <li>Pagamentos serão recebidos pela plataforma</li>
            <li>Estoque e pedidos precisam ser administrados</li>
            <li>A empresa deseja escalar a operação</li>
          </ul>
          <div className={`${s.fluxo} ${s.fluxoEcom}`}><span>PRODUTO</span><i>→</i><span>CARRINHO</span><i>→</i><span>CHECKOUT</span><i>→</i><span>PAGAMENTO</span><i>→</i><span>PEDIDO</span></div>
        </div>
      </div>
      <div className={s.acoes}>
        <a className={`${s.botao} ${s.contorno}`} href="#diagnostico">DESCOBRIR QUAL ESTRUTURA PRECISO ↗</a>
        <a className={s.discreto} href="/vitrine-digital">CONHECER A VITRINE DIGITAL ↗</a>
      </div>
    </div>
  </section>;
}

/* ============================================================ DESIGN PARA A MARCA */
const blocosMarca = [
  ["01", "Direção visual", "Interface coerente com a identidade e o posicionamento da marca."],
  ["02", "Hierarquia comercial", "Produtos, categorias, campanhas e argumentos organizados por prioridade."],
  ["03", "Experiência mobile", "A loja é planejada para o dispositivo em que a maior parte dos clientes compra."],
  ["04", "Possibilidade de evolução", "A estrutura permite novos produtos, páginas, campanhas, funcionalidades e integrações."],
];
export function DesignMarca() {
  return <section className={s.secao}>
    <div className={s.molde}>
      <p className={s.olho}>DESIGN ESPECÍFICO PARA A MARCA</p>
      <h2>NÃO É UM TEMA PRONTO COM A SUA <em>LOGO COLOCADA POR CIMA.</em></h2>
      <p className={s.apoio}>A experiência é construída a partir do posicionamento, dos produtos, do público e da operação da marca. A interface deve fazer sentido para aquilo que está sendo vendido, e não apenas seguir o visual de uma plataforma genérica.</p>
      <div className={s.blocos}>
        {blocosMarca.map((b) => <article className={s.bloco} key={b[0]}>
          <span className={s.blocoNum}>{b[0]}</span>
          <h3>{b[1]}</h3>
          <p>{b[2]}</p>
        </article>)}
      </div>
    </div>
  </section>;
}

/* ============================================================ DEMONSTRAÇÃO / CASE */
const telas = [
  { k: "home", nome: "Home", tag: "loja" },
  { k: "categoria", nome: "Categoria", tag: "filtros" },
  { k: "produto", nome: "Produto", tag: "variações" },
  { k: "checkout", nome: "Checkout", tag: "pagamento" },
  { k: "admin", nome: "Painel", tag: "pedidos" },
  { k: "mobile", nome: "Mobile", tag: "responsivo" },
];
export function Demonstracao() {
  return <section className={s.secao} id="case">
    <div className={s.molde}>
      <span className={s.demoTag}>CONCEITO DE E-COMMERCE · PROJETO EM DESENVOLVIMENTO</span>
      <h2>UM E-COMMERCE NÃO É UMA <em>ÚNICA TELA.</em></h2>
      <p className={s.apoio}>Home, categoria, produto, carrinho, checkout, painel administrativo e versão mobile: telas conectadas por trás da mesma operação. As imagens abaixo representam um conceito, não um resultado de cliente entregue.</p>
      <div className={s.telas}>
        {telas.map((t) => <figure className={s.tela} key={t.k}>
          <figcaption className={s.telaTopo}><b>{t.nome}</b><span>{t.tag}</span></figcaption>
          <div className={s.plantaCaixa}><Planta tipo={t.k} /></div>
        </figure>)}
      </div>
      <div className={s.acoes}>
        <a className={`${s.botao} ${s.cheio}`} href="#diagnostico">QUERO UMA ESTRUTURA COMO ESTA ↗</a>
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
  return <section className={s.secao} id="processo">
    <div className={s.molde}>
      <p className={s.olho}>DA OPERAÇÃO À TELA</p>
      <h2>COMO UM E-COMMERCE SAI DA IDEIA E CHEGA AO <em>PRIMEIRO PEDIDO.</em></h2>
      <ol className={s.trilho}>
        {etapas.map((e, i) => <li key={e[0]}>
          <b>{String(i + 1).padStart(2, "0")}</b>
          <div><h3>{e[0]}</h3><p>{e[1]}</p></div>
        </li>)}
      </ol>
      <p className={s.obs}>O prazo é definido após o diagnóstico. A complexidade varia conforme quantidade de produtos, integrações, regras comerciais e operação.</p>
    </div>
  </section>;
}

/* ============================================================ POR QUE O ESTÚDIO (escura) */
const porques = [
  ["Estratégia antes da interface", "A estrutura é definida antes dos detalhes visuais."],
  ["Design sob medida", "A loja não nasce de um tema genérico aplicado a qualquer negócio."],
  ["Visão de negócio", "O projeto considera venda, operação, atendimento e administração."],
  ["Contato direto", "O cliente acompanha as decisões sem atravessar várias camadas de atendimento."],
  ["Evolução planejada", "A estrutura pode ser preparada para novas páginas, produtos e integrações."],
  ["Poucos projetos por vez", "Um número reduzido de projetos simultâneos para manter o nível de cada entrega."],
];
export function PorQue() {
  return <section className={`${s.secao} ${s.escura}`}>
    <div className={s.molde}>
      <p className={s.olho}>POR QUE O RAFAEL RAZEIRA ESTÚDIO</p>
      <h2>UMA LOJA É UMA OPERAÇÃO. E MERECE SER TRATADA <em>COMO UMA.</em></h2>
      <div className={s.porGrade}>
        {porques.map((p) => <article key={p[0]}><h3>{p[0]}</h3><p>{p[1]}</p></article>)}
      </div>
    </div>
  </section>;
}

/* ============================================================ FAQ */
const faq: [string, string][] = [
  ["Quanto custa desenvolver um e-commerce?", "O investimento depende da quantidade de páginas, produtos, regras comerciais, painel administrativo e integrações. Após o diagnóstico, você recebe um escopo com valor e prazo definidos."],
  ["Qual é o prazo de desenvolvimento?", "O prazo é definido após o diagnóstico e varia conforme a quantidade de produtos, integrações e a complexidade da operação. A primeira direção visual pode ser apresentada em até 7 dias úteis."],
  ["O projeto funciona no celular?", "Sim. Cada seção é planejada e revisada para computadores, tablets e celulares, com atenção especial à experiência mobile, onde a maior parte das compras acontece."],
  ["Eu consigo cadastrar os produtos sozinho?", "Quando o projeto inclui painel administrativo, você cadastra e edita produtos, preços, imagens, categorias e disponibilidade sem alterar o código da loja."],
  ["O painel administrativo está incluído?", "Depende do escopo. Quando a operação exige administração própria, o painel é desenvolvido de acordo com o que o negócio precisa controlar."],
  ["Quem cadastra os produtos iniciais?", "A carga inicial pode ser feita pelo estúdio ou pela equipe da loja, e é definida no escopo. O painel permite que você siga cadastrando depois."],
  ["Posso integrar com o meu sistema de estoque?", "A integração depende do sistema utilizado, da existência de API e da documentação disponibilizada pelo fornecedor. A viabilidade é analisada antes de entrar no escopo."],
  ["É possível integrar com um ERP?", "É possível quando o ERP oferece API e documentação adequadas. Nem todo sistema disponibiliza integração automática, então cada caso é avaliado individualmente."],
  ["Quais meios de pagamento podem ser utilizados?", "Pix, cartão e gateways de pagamento, conforme a operação. Os meios disponíveis são definidos junto com o gateway escolhido."],
  ["Como funciona o cálculo de frete?", "O frete pode ser calculado por regras próprias, integração com transportadoras, retirada, entrega local e regras de frete grátis, conforme a operação da loja."],
  ["Preciso ter todas as fotos e textos prontos?", "Não necessariamente. Durante o diagnóstico, o material existente é analisado e são identificados os conteúdos que precisam ser produzidos, organizados ou adaptados."],
  ["Domínio e hospedagem estão incluídos?", "A configuração pode fazer parte da entrega. Caso a empresa ainda não tenha domínio ou hospedagem, ela é orientada sobre o registro e a contratação."],
  ["Existe mensalidade?", "Serviços de terceiros como hospedagem, domínio e gateway podem ter custos recorrentes próprios. Manutenção e evolução são definidas separadamente, conforme a necessidade."],
  ["Como funciona a manutenção?", "Suporte, manutenção, atualizações e novas funcionalidades são combinados conforme a necessidade do projeto, fora do escopo inicial de desenvolvimento."],
  ["O e-commerce é seguro?", "O projeto utiliza boas práticas de desenvolvimento e serviços especializados de pagamento. Os dados sensíveis do cartão não devem ser armazenados diretamente pela loja."],
  ["Posso emitir nota fiscal?", "A emissão fiscal é possível por integração com sistemas especializados, quando eles oferecem API e documentação. A viabilidade é avaliada caso a caso."],
  ["A loja poderá receber novas funcionalidades depois?", "Sim. A estrutura é pensada para evoluir, permitindo novas páginas, produtos, campanhas, funcionalidades e integrações ao longo do tempo."],
];
export function Duvidas() {
  return <section className={s.secao} id="faq">
    <div className={s.molde}>
      <p className={s.olho}>DÚVIDAS FREQUENTES</p>
      <h2>ANTES DE COMEÇAR.</h2>
      <div className={s.sanfona}>
        {faq.map((f) => <details key={f[0]} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && track("ecommerce_faq_open", { pergunta: f[0] })}>
          <summary>{f[0]}</summary>
          <p>{f[1]}</p>
        </details>)}
      </div>
    </div>
  </section>;
}

/* ============================================================ CTA FINAL + FORMULÁRIO + RODAPÉ */
const passo1 = [
  { id: "nome", rot: "Nome", tipo: "text", ph: "Seu nome" },
  { id: "whatsapp", rot: "WhatsApp", tipo: "tel", ph: "(00) 00000-0000" },
  { id: "canal", rot: "Instagram ou site", tipo: "text", ph: "@sualoja ou sualoja.com.br" },
  { id: "empresa", rot: "Nome da empresa", tipo: "text", ph: "Sua marca" },
];
export function ChamadaFinal() {
  const [etapa, setEtapa] = useState(1);
  const [dados, setDados] = useState<Record<string, string>>({});
  const [ocultarBarra, setOcultarBarra] = useState(false);
  const set = (k: string, v: string) => setDados((d) => ({ ...d, [k]: v }));

  // A barra fixa mobile some quando o formulário de diagnóstico entra na tela,
  // para nunca cobrir os campos e o botão de envio.
  useEffect(() => {
    const alvo = document.getElementById("diagnostico");
    if (!alvo) return;
    const aoRolar = () => {
      const r = alvo.getBoundingClientRect();
      // à vista = o topo do form já subiu à metade inferior e ele ainda não saiu por cima
      setOcultarBarra(r.top < window.innerHeight * 0.8 && r.bottom > 0);
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => { window.removeEventListener("scroll", aoRolar); window.removeEventListener("resize", aoRolar); };
  }, []);

  function avancar() {
    setEtapa(2);
    track("ecommerce_form_step_complete", { etapa: 1 });
  }
  function enviar(e: React.FormEvent) {
    e.preventDefault();
    trackLead(dados.whatsapp);
    const linha = (r: string, v?: string) => `${r}: ${v?.trim() ? v.trim() : "não informado"}`;
    const msg = [
      "Olá, Rafael! Preenchi o diagnóstico para desenvolvimento de um e-commerce.",
      "",
      linha("Empresa", dados.empresa),
      linha("Segmento", dados.vende),
      linha("Quantidade aproximada de produtos", dados.produtos),
      linha("Site atual", dados.site),
      linha("Sistema de estoque ou ERP", dados.erp),
      linha("Área de entrega", dados.entrega),
      linha("Precisa de pagamento online", dados.pagamento),
      linha("Precisa de painel administrativo", dados.painel),
      linha("Principal necessidade", dados.necessidade),
      linha("Faixa de investimento", dados.investimento),
      linha("Prazo desejado", dados.prazo),
      "",
      "Gostaria de entender qual estrutura seria mais adequada para a operação.",
    ].join("\n");
    track("ecommerce_whatsapp_click", { origem: "form" });
    window.open(zap(msg), "_blank", "noopener");
  }

  return <>
    <section className={`${s.secao} ${s.escura} ${s.final}`} id="diagnostico">
      <p className={s.agenda}>AGENDA PARA NOVOS PROJETOS</p>
      <h2>SEU E-COMMERCE COMEÇA ANTES DA <em>PRIMEIRA TELA.</em></h2>
      <p className={s.apoioEscuro}>Conte sobre sua loja, seus produtos e como sua operação funciona hoje. A partir disso, será possível definir a estrutura, o investimento e o caminho adequado para colocar o projeto no ar.</p>

      <form className={s.form} onSubmit={enviar}>
        <div className={s.formPassos}>
          <div className={`${s.formPasso} ${etapa === 1 ? s.formPassoAtivo : ""}`}><b>1</b> CONTATO</div>
          <div className={`${s.formPasso} ${etapa === 2 ? s.formPassoAtivo : ""}`}><b>2</b> OPERAÇÃO</div>
        </div>

        {etapa === 1 ? <div className={s.formCorpo}>
          <div className={s.dupla}>
            {passo1.map((c) => <label className={s.campo} key={c.id}>
              <span>{c.rot}</span>
              <input type={c.tipo} placeholder={c.ph} value={dados[c.id] || ""} onChange={(ev) => set(c.id, ev.target.value)} required={c.id === "nome" || c.id === "whatsapp"} />
            </label>)}
          </div>
          <div className={s.formNav}>
            <span />
            <button type="button" className={`${s.botao} ${s.cheio}`} onClick={avancar}>CONTINUAR PARA A OPERAÇÃO ↓</button>
          </div>
        </div> : <div className={s.formCorpo}>
          <div className={s.dupla}>
            <label className={s.campo}><span>O que a empresa vende</span><input type="text" placeholder="Segmento e produtos" value={dados.vende || ""} onChange={(e) => set("vende", e.target.value)} /></label>
            <label className={s.campo}><span>Quantidade aproximada de produtos</span>
              <select value={dados.produtos || ""} onChange={(e) => set("produtos", e.target.value)}>
                <option value="">Selecione</option><option>Até 20</option><option>20 a 100</option><option>100 a 500</option><option>Mais de 500</option>
              </select>
            </label>
            <label className={s.campo}><span>Já possui site ou loja virtual?</span>
              <select value={dados.site || ""} onChange={(e) => set("site", e.target.value)}>
                <option value="">Selecione</option><option>Não tenho</option><option>Tenho site institucional</option><option>Tenho loja virtual</option>
              </select>
            </label>
            <label className={s.campo}><span>Usa sistema de estoque ou ERP?</span><input type="text" placeholder="Qual sistema, se houver" value={dados.erp || ""} onChange={(e) => set("erp", e.target.value)} /></label>
            <label className={s.campo}><span>Vende para todo o Brasil ou regional?</span>
              <select value={dados.entrega || ""} onChange={(e) => set("entrega", e.target.value)}>
                <option value="">Selecione</option><option>Todo o Brasil</option><option>Regional</option><option>Entrega local</option>
              </select>
            </label>
            <label className={s.campo}><span>Precisa de pagamento online?</span>
              <select value={dados.pagamento || ""} onChange={(e) => set("pagamento", e.target.value)}>
                <option value="">Selecione</option><option>Sim</option><option>Não</option><option>Ainda avaliando</option>
              </select>
            </label>
            <label className={s.campo}><span>Precisa de painel administrativo?</span>
              <select value={dados.painel || ""} onChange={(e) => set("painel", e.target.value)}>
                <option value="">Selecione</option><option>Sim</option><option>Não</option><option>Ainda avaliando</option>
              </select>
            </label>
            <label className={s.campo}><span>Faixa de investimento</span><input type="text" placeholder="Sua faixa de investimento" value={dados.investimento || ""} onChange={(e) => set("investimento", e.target.value)} /></label>
          </div>
          <label className={s.campo}><span>Principal dificuldade atual</span><textarea placeholder="O que mais atrapalha sua operação hoje" value={dados.necessidade || ""} onChange={(e) => set("necessidade", e.target.value)} /></label>
          <label className={s.campo}><span>Prazo desejado</span><input type="text" placeholder="Quando pretende colocar no ar" value={dados.prazo || ""} onChange={(e) => set("prazo", e.target.value)} /></label>
          <div className={s.formNav}>
            <button type="button" className={`${s.botao} ${s.contorno}`} style={{ borderColor: "#fff", color: "#fff" }} onClick={() => setEtapa(1)}>← VOLTAR</button>
            <button type="submit" className={`${s.botao} ${s.cheio}`}>SOLICITAR DIAGNÓSTICO DO E-COMMERCE ↗</button>
          </div>
        </div>}
        <p className={s.rodapeForm}>Ao enviar, o diagnóstico abre no WhatsApp já organizado. Nenhuma informação é publicada.</p>
      </form>
      <small className={s.micro}>A conversa inicial serve para entender a operação antes da definição do escopo e do investimento.</small>
    </section>

    <a className={`${s.barraFixa} ${ocultarBarra ? s.barraOculta : ""}`} href="#diagnostico" onClick={() => track("ecommerce_secondary_cta", { origem: "barra-fixa" })}>
      <small>DESENVOLVIMENTO DE E-COMMERCE<i>DIAGNÓSTICO SOB MEDIDA</i></small>
      <span>SOLICITAR ↗</span>
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
