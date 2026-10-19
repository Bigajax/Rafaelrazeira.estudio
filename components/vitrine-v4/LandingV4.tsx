"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Botao, Icone } from "@/components/vitrine/LandingVitrine";
import { linkWhatsApp } from "@/lib/contato";
import s from "@/components/vitrine/landing.module.css";
import c from "./landing-v4.module.css";
import { mpTrack } from "@/components/vitrine/tracking";

/* A compra direta (19/10/2026): a página cobra só a entrada da tabela e o
   saldo vem na entrega. Tudo o que ela promete do painel foi conferido no
   molde v1.7.0 (16/10); recurso novo só entra aqui depois de estar no molde. */
export type OfertaV4Publica = {
  total: number; entrada: number; saldo: number; parcelasSaldo: number; produtos: number;
  performance: number; diasPerformance: number;
  lojas: { nome: string; tag: string; img: string; url: string; w: number; h: number }[];
  video: { src: string | null; poster: string | null };
};
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Number.isInteger(v) ? 0 : 2 });
const duvida = linkWhatsApp("Oi Rafael! Vi a página da vitrine digital e queria tirar uma dúvida antes de começar.");

function Comecar({ lugar, secundario = false }: { lugar: string; secundario?: boolean }) {
  return <Botao href="#oferta" lugar={lugar} secundario={secundario}>Começar minha vitrine</Botao>;
}

function Barra({ oferta }: { oferta: OfertaV4Publica }) {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    let naOferta = false, noFim = false;
    const atualizar = () => setVisivel(scrollY > innerHeight * .85 && !naOferta && !noFim && !document.querySelector(".ck-overlay"));
    const io = new IntersectionObserver(entries => {
      for (const e of entries) { if (e.target.id === "oferta") naOferta = e.isIntersecting; if (e.target.id === "fim") noFim = e.isIntersecting; }
      atualizar();
    }, { rootMargin: "0px 0px 100px 0px" });
    for (const id of ["oferta", "fim"]) { const alvo = document.getElementById(id); if (alvo) io.observe(alvo); }
    const observer = new MutationObserver(atualizar); observer.observe(document.body, { childList: true });
    addEventListener("scroll", atualizar, { passive: true }); addEventListener("resize", atualizar, { passive: true }); atualizar();
    return () => { io.disconnect(); observer.disconnect(); removeEventListener("scroll", atualizar); removeEventListener("resize", atualizar); };
  }, []);
  return <div className={s.barraCelular} hidden={!visivel}><span><b>{reais(oferta.entrada)}</b><small>para começar · saldo na entrega</small></span><Comecar lugar="sticky_mobile" /></div>;
}

/* A prova do título (19/10): a peça aberta na vitrine da Japa e a mensagem
   que chega pronta no WhatsApp da dona. Captura real; a mensagem é a mesma
   de exemplo do "Como funciona", e a legenda diz isso. Sem o cartão
   "Sua loja. Seu jeito." da Demonstracao (que segue na V3): ele competia
   com o título. */
/* O antes da cena: as perguntas soltas do direct, uma por uma. Ilustração do
   que toda dona ouve (não são mensagens de uma loja). Na abertura elas chegam
   em fila, se apagam e o pedido pronto do WhatsApp entra: um movimento só. */
const DIRECT = ["Valor?", "Tem no 40?", "Manda foto da sola", "Ainda tem?", "Qual o preço?"];

/* O "Como funciona" da V4 (19/10): o mesmo caminho da Japa do ExperienciaLoja
   (que segue na V3), sem as duas caixas e sem o verde: o celular grande no
   papel e os passos em letra de cartaz, o ativo em grafite com a explicação */
const PASSOS = [
  { titulo: "Encontra o que procura.", texto: "A cliente entra na sua vitrine e explora o catálogo. Categorias e busca levam à peça certa.", tela: "listagem" },
  { titulo: "Escolhe com tudo à vista.", texto: "Abre a peça e vê fotos, preço e descrição juntos, antes de chamar a loja.", tela: "peca" },
  { titulo: "Chega com a peça na conversa.", texto: "O botão abre o seu WhatsApp com a mensagem pronta e o link da peça. A cliente envia e você atende.", tela: "conversa" },
] as const;

function ComoFuncionaV4() {
  const [etapa, setEtapa] = useState(0);
  function escolher(i: number) { setEtapa(i); mpTrack("DemoVitrine", { loja: "japa", etapa: i + 1 }); }
  function teclado(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let proxima = i;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") proxima = (i + 1) % 3;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") proxima = (i + 2) % 3;
    else if (e.key === "Home") proxima = 0;
    else if (e.key === "End") proxima = 2;
    else return;
    e.preventDefault(); escolher(proxima); document.getElementById(`passo-v4-${proxima}`)?.focus();
  }
  const tela = PASSOS[etapa].tela;
  return <section id="como-funciona" className={`${s.secao} ${c.como}`} aria-labelledby="como-titulo">
    <h2 id="como-titulo">Sua vitrine trabalha.<br />Você atende.</h2>
    <div className={c.comoGrade}>
      <div id="passo-v4-tela" role="tabpanel" aria-labelledby={`passo-v4-${etapa}`} className={c.comoPalco}>
        <div className={`${s.telefone} ${c.comoTelefone}`}>
          {tela === "conversa"
            ? <div className={c.chat}><div className={c.chatTopo}><span>JM</span><b>Japa Modas<small>online</small></b></div><div className={c.chatCorpo}><p className={c.chatBalao}>Oi! Quero este tênis que vi no site:<b>Tênis Nike Journey Run preto e branco</b>Ainda tem disponível?<small>Link da peça na vitrine</small></p></div></div>
            : <Image key={tela} src={`/assets/vitrine/japa-${tela}.webp`} width={780} height={1520} sizes="(max-width: 600px) 240px, 300px" alt={`${PASSOS[etapa].titulo} Captura real da vitrine da Japa Modas`} />}
        </div>
      </div>
      <div className={c.passos} role="tablist" aria-label="Como funciona a vitrine da Japa Modas" aria-orientation="vertical">
        {PASSOS.map((p, i) => <button key={p.tela} id={`passo-v4-${i}`} type="button" role="tab" aria-selected={etapa === i} aria-controls="passo-v4-tela" tabIndex={etapa === i ? 0 : -1} onClick={() => escolher(i)} onKeyDown={e => teclado(e, i)}><span className={c.passoNum}>0{i + 1}</span><span><b>{p.titulo}</b>{etapa === i ? <small>{p.texto}</small> : null}</span></button>)}
        <p className={c.comoNota}>Capturas reais da vitrine da Japa Modas. A mensagem é de exemplo. <a href="https://japamodasurf.com.br" target="_blank" rel="noreferrer" data-cta="case_japa_como" data-cta-dest="site">Visitar a loja</a></p>
      </div>
    </div>
  </section>;
}

/* As respostas: só o que o molde faz (preço em cada peça, filtro por tamanho,
   galeria na página da peça, tamanho riscado quando a dona dá baixa) */
const RESPOSTAS: [string, string][] = [
  ["Valor?", "O preço está em cada peça, no catálogo e na página dela."],
  ["Tem no 40?", "Os tamanhos aparecem antes de chamar, e dá para filtrar o catálogo pela numeração."],
  ["Manda foto da sola", "Todas as fotos da peça ficam juntas na página dela, para ver sem pedir."],
  ["Ainda tem?", "Vendeu, você marca no painel e o tamanho aparece riscado na hora."],
];

function ProvaDoPedido() {
  return <figure className={c.prova}>
    <div className={c.direct} aria-hidden="true"><p>O seu direct hoje</p><ul>{DIRECT.map((t, i) => <li key={t} style={{ "--i": i } as CSSProperties}>{t}</li>)}</ul></div>
    <div className={`${s.telefone} ${c.provaTelefone}`}><Image src="/assets/vitrine/japa-peca.webp" width={780} height={1520} priority sizes="(max-width: 600px) 220px, 250px" alt="Página de um tênis na vitrine da Japa Modas, com fotos, preço e o botão de pedir" /></div>
    <div className={c.mensagem}>
      <div className={c.mensagemTopo}><span className={c.whats}><Icone tipo="whats" /></span><span><b>WhatsApp</b>Nova mensagem</span><span className={c.agora}>agora</span></div>
      <p className={c.balao}>Oi! Quero este tênis que vi no site:<b>Tênis Nike Journey Run preto e branco</b>Ainda tem disponível?<small>Link da peça na vitrine<span className={c.vistos} aria-hidden="true">✓✓</span></small></p>
    </div>
    <figcaption className={c.provaLegenda}><a href="https://japamodasurf.com.br" target="_blank" rel="noreferrer" data-cta="case_japa_hero" data-cta-dest="site">Japa Modas, no ar</a>. Mensagem de exemplo.</figcaption>
  </figure>;
}

/* O painel como ele é no molde: peças e estoque por tamanho, pedidos,
   banners e textos, o Status com a logo, a lista de quem pediu aviso e a
   Desempenho. As telas são as mesmas da V3 (dados ilustrativos). */
function PainelV4({ dias }: { dias: number }) {
  const [aba, setAba] = useState("inicio");
  const abas = [{ id: "inicio", titulo: "Início" }, { id: "pecas", titulo: "Peças e estoque" }, { id: "desempenho", titulo: "Desempenho" }];
  const indice = abas.findIndex(a => a.id === aba);
  /* (19/10) a situação da dona e o que ela faz no painel, como nas respostas do direct */
  const situacoes: [string, string][] = [
    ["Chegou peça nova", "Cadastre pelo celular e duplique a peça para outra cor."],
    ["Acabou o M", "Marque a venda e o tamanho aparece riscado na vitrine. A cliente nunca vê a quantidade."],
    ["Fechou um pedido", "Separado, pago, entregue. O pedido da sacola entra no painel pelo código que chega no seu WhatsApp."],
    ["Mudou a campanha", "Troque os banners e os textos. Cada peça vira uma imagem com a sua logo, pronta para o Status."],
    ["Quer saber se vende", "Veja quantos entraram, o que olharam e quantos chamaram. E quem pediu aviso de reposição."],
  ];
  return <section id="painel" className={c.painelV4} aria-labelledby="painel-titulo">
    <div className={c.painelCabeca}><h2 id="painel-titulo">Você mesma atualiza.</h2><p>Pelo celular, e a vitrine muda na hora.</p></div>
    <div className={c.painelGrade}><div>
      <div role="tablist" aria-label="Telas do painel" className={c.painelAbas}>{abas.map(a => <button key={a.id} id={`aba-${a.id}`} type="button" role="tab" aria-selected={aba === a.id} aria-controls="tela-painel" tabIndex={aba === a.id ? 0 : -1} onClick={() => setAba(a.id)} onKeyDown={e => { let next = indice; if (e.key === "ArrowRight") next = (indice + 1) % abas.length; else if (e.key === "ArrowLeft") next = (indice + abas.length - 1) % abas.length; else if (e.key === "Home") next = 0; else if (e.key === "End") next = abas.length - 1; else return; e.preventDefault(); setAba(abas[next].id); document.getElementById(`aba-${abas[next].id}`)?.focus(); }}>{a.titulo}</button>)}</div>
      <div id="tela-painel" role="tabpanel" aria-labelledby={`aba-${aba}`} tabIndex={0} className={c.painelTela}><Image key={aba} src={`/assets/vitrine/painel-${aba}.webp`} width={1440} height={1000} sizes="(max-width: 900px) 100vw, 760px" alt={`Exemplo da tela ${abas[indice].titulo} do painel da loja, com dados ilustrativos`} /></div>
      <p className={c.painelLegenda}>Telas de exemplo, com dados ilustrativos. Nos {dias} primeiros dias o Performance vem liberado: o que repor, qual post trouxe gente e o relatório do mês.</p>
    </div><div>
      <dl className={c.situacoes}>{situacoes.map(([quando, faz]) => <div key={quando}><dt>{quando}</dt><dd>{faz}</dd></div>)}</dl>
      <p className={c.incluso}><Icone tipo="check" /> Painel incluído, sem mensalidade</p>
    </div></div>
  </section>;
}

export function LandingV4({ oferta }: { oferta: OfertaV4Publica }) {
  /* o cabeçalho fixo ganha sombra só depois que a página sai do topo */
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const ver = () => setRolou(scrollY > 8);
    addEventListener("scroll", ver, { passive: true }); ver();
    return () => removeEventListener("scroll", ver);
  }, []);
  const duvidas = [
    ["Tem mensalidade?", `Não. São ${reais(oferta.total)} no total: ${reais(oferta.entrada)} para começar e ${reais(oferta.saldo)} na entrega. A vitrine e o painel são seus, sem mensalidade. Depois dos ${oferta.diasPerformance} dias grátis, o Performance continua só se você quiser: ${reais(oferta.performance)} por mês, sem fidelidade.`],
    ["Quantos produtos entram?", `Eu cadastro até ${oferta.produtos} produtos. Você me manda nome, preço, tamanhos e fotos. Depois, cadastra quantas peças quiser pelo painel: não tem limite.`],
    ["Quando a vitrine fica pronta?", "Até 7 dias úteis depois que eu recebo todo o material da loja. Você vê a primeira versão antes de ela ir ao ar."],
    ["A cliente paga na vitrine?", "Não. Ela escolhe as peças, monta a sacola e o pedido chega no seu WhatsApp com a peça, o tamanho e o link. Pagamento e entrega você combina com ela, como já faz hoje."],
    ["O que não está incluso?", "Domínio próprio (opcional, pago direto no registrador), as fotos das peças, nota fiscal e pagamento online dentro da vitrine."],
    ["E se eu não gostar?", `Você vê a primeira versão antes da publicação e tem uma rodada de ajustes incluída. Os ${reais(oferta.saldo)} só são pagos depois da sua aprovação.`],
  ];
  return <>
    <a className={s.pular} href="#principal">Pular para o conteúdo</a>
    <header className={`${s.header} ${c.cabecalho}`} data-rolou={rolou || undefined}>
      <a href="/estudio" className={s.marca} aria-label="Rafael Razeira Estúdio"><Image className={c.rr} src="/assets/rr-marca.webp" width={373} height={218} alt="" /><span>Rafael Razeira<small>Estúdio</small></span></a>
      <nav aria-label="Navegação da vitrine"><a href="#como-funciona">Como funciona</a><a href="#painel">O painel</a><a href="#projetos">Lojas no ar</a><a href="#oferta">Preço</a><Botao href="#oferta" lugar="header" secundario>Começar por {reais(oferta.entrada)}</Botao></nav>
    </header>
    <main id="principal" className={c.principal} tabIndex={-1}>
      <section id="topo" className={`${s.hero} ${c.heroV4}`} aria-labelledby="vitrine-titulo">
        <div className={s.heroTexto}>
          <p className={c.sobre}>Vitrine digital para lojas que vendem pelo Instagram</p>
          <h1 id="vitrine-titulo" className={c.titulo}><span className={c.linha}>Pare de mandar foto </span><span className={c.linha}>e preço {"um por um"} </span><span className={c.linha}>no direct.</span></h1>
          <p className={s.heroLead}>Sua loja responde sozinha o que todo mundo pergunta: fotos, preços e tamanhos à vista. O pedido chega pronto no seu WhatsApp.</p>
          <div className={s.acoes}><Botao href="#oferta" lugar="hero">Começar por {reais(oferta.entrada)}</Botao><Botao lugar="hero_projetos" href="#projetos" secundario>Ver lojas no ar</Botao></div>
          <p className={c.condicao}>{reais(oferta.saldo)} na entrega, depois que você aprovar. Sem mensalidade.</p>
          <div className={`${s.heroQuem} ${c.semFio}`}><Image src="/assets/rafael-avatar-2026-10-19.webp" width={40} height={40} alt="Rafael Razeira" /><p>Desenhada por mim. Atualizada por você.<small>Você fala comigo do primeiro dia à publicação.</small></p></div>
        </div>
        <ProvaDoPedido />
      </section>
      {/* a faixa dos fatos (19/10): o grafite da régua, o fato em letra de cartaz e uma linha curta */}
      <ul className={c.fatos} aria-label="O que vem na vitrine">
        <li><b>Sua marca</b><span>design feito para a sua loja, não template</span></li>
        <li><b>{oferta.produtos} produtos</b><span>cadastrados por mim, com foto e preço</span></li>
        <li><b>Painel</b><span>no seu celular, incluído e sem mensalidade</span></li>
        <li><b>{oferta.diasPerformance} dias</b><span>de Performance grátis depois de publicar</span></li>
      </ul>
      {oferta.video.src ? <section className={s.secao} aria-labelledby="video-titulo"><p className={s.rotulo}>Veja antes de decidir</p><h2 id="video-titulo">Da escolha ao WhatsApp.</h2><video className={c.video} src={oferta.video.src} poster={oferta.video.poster ?? undefined} controls playsInline preload="none" aria-label="Apresentação da vitrine digital" /></section> : null}
      <ComoFuncionaV4 />
      {/* (19/10) no lugar dos três recursos, que repetiam o "Como funciona": as
          perguntas do direct do hero, cada uma com a resposta que o molde já dá */}
      <section className={`${s.secao} ${c.respostas}`} aria-labelledby="respostas-titulo">
        <h2 id="respostas-titulo">Cada pergunta do direct já tem resposta na vitrine.</h2>
        <dl>{RESPOSTAS.map(([pergunta, resposta]) => <div key={pergunta}><dt><span>{pergunta}</span></dt><dd>{resposta}</dd></div>)}</dl>
      </section>
      <PainelV4 dias={oferta.diasPerformance} />
      <section id="projetos" className={s.secao} aria-labelledby="projetos-titulo">
        <div className={s.secaoCabeca}><div><p className={s.rotulo}>03 / Lojas no ar</p><h2 id="projetos-titulo">Veja as lojas no ar.</h2></div><p>Cada loja com a sua identidade. Abra e faça o caminho até o WhatsApp.</p></div>
        <div className={s.projetos}>{oferta.lojas.map(l => <a key={l.url} className={s.projeto} href={l.url} target="_blank" rel="noreferrer" data-cta={`case_${l.nome}`} data-cta-dest="site"><div className={s.projetoImagem}><Image src={l.img} width={l.w} height={l.h} sizes="(max-width: 700px) 90vw, 380px" alt={`Vitrine da ${l.nome}`} /></div><div><span className={s.rotulo}>Vitrine digital</span><h3>{l.nome}<Icone tipo="seta" /></h3><p>{l.tag}</p><span className={s.projetoAbrir}>Abrir a vitrine ↗</span></div></a>)}</div>
        <div className={s.quem}><Image src="/assets/rafael-avatar-2026-10-19.webp" width={64} height={64} alt="Rafael Razeira" /><div><h3>Quem desenha e quem responde sou eu.</h3><p>Sou Rafael Razeira, de Maringá. Desenho, desenvolvo e publico a sua vitrine. Você conversa direto comigo.</p></div><a href="/portfolio">Ver o portfólio ↗</a></div>
      </section>
      {/* (19/10) a oferta no papel: a lista do que vem à esquerda e, à direita,
          a conta inteira num cupom de caixa (a mono aqui é a letra do cupom) */}
      <section id="oferta" className={`${s.secao} ${c.ofertaV4}`} aria-labelledby="oferta-titulo">
        <div>
          <h2 id="oferta-titulo">Design, catálogo e painel.<br />Sua vitrine completa.</h2>
          <p className={c.ofertaLead}>Você paga a entrada, eu monto a vitrine e você só paga o resto quando aprovar.</p>
          <ul className={c.inclui}>{["Design com a identidade da sua loja", "Página inicial, categorias, busca e a página de cada peça", `Cadastro de até ${oferta.produtos} produtos, feito por mim`, "Pedido no WhatsApp com a peça e o tamanho na mensagem", "Painel no celular: peças, estoque por tamanho, pedidos, banners e textos", "Lista de clientes que pediram aviso de reposição", "Desempenho: visitas, peças vistas e cliques no WhatsApp", `${oferta.diasPerformance} dias do Performance grátis depois da publicação`, "Publicação e uma rodada de ajustes"].map(t => <li key={t}><Icone tipo="check" />{t}</li>)}</ul>
          <p className={c.ofertaNota}>Até 7 dias úteis depois de receber todo o material. Domínio próprio opcional, pago direto no registrador. <a href="/termos">Escopo e termos</a>.</p>
        </div>
        <div className={c.reciboSombra}><div className={c.recibo}>
          <p className={c.reciboTopo}><b>Vitrine digital</b><span>Rafael Razeira Estúdio · Maringá</span></p>
          <dl className={c.reciboLinhas}>
            <div><dt>Hoje, no Pix</dt><dd>{reais(oferta.entrada)}</dd></div>
            <div><dt>Na entrega, depois que você aprovar</dt><dd>{reais(oferta.saldo)}</dd></div>
            <div><dt>Mensalidade</dt><dd>{reais(0)}</dd></div>
            <div className={c.reciboTotal}><dt>Total</dt><dd>{reais(oferta.total)}</dd></div>
          </dl>
          <button type="button" className={c.reciboBotao} data-checkout-item="entrada_pix" data-cta="oferta_entrada_pix" data-cta-dest="checkout">Pagar {reais(oferta.entrada)} no Pix e começar<Icone tipo="seta" /></button>
          <p className={c.reciboNota}>O saldo vem na entrega, no Pix ou no cartão em até {oferta.parcelasSaldo}x, com os juros do cartão calculados no checkout. Pagamento pelo Mercado Pago: assim que ele cai, o WhatsApp abre numa conversa comigo.</p>
          <a className={c.duvida} href={duvida} target="_blank" rel="noreferrer" data-cta="oferta_duvida" data-cta-dest="whatsapp">Quero tirar uma dúvida com o Rafael ↗</a>
        </div></div>
      </section>
      {/* (19/10) a linha do tempo: quando acontece, em letra de cartaz, e quanto se paga em cada passo */}
      <section id="depois" className={`${s.secao} ${c.depois}`} aria-labelledby="depois-titulo">
        <h2 id="depois-titulo">Você manda o material.<br />Eu cuido da vitrine.</h2>
        <ol className={c.trilho}>
          <li><span className={c.quando}>Hoje</span><span className={c.valor}>{reais(oferta.entrada)} de entrada</span><h3>A gente combina.</h3><p>O WhatsApp abre numa conversa comigo. Combinamos a logo, as fotos e a lista das peças.</p></li>
          <li><span className={c.quando}>Em até 7 dias úteis</span><span className={c.valor}>Nada a pagar</span><h3>Eu monto a sua vitrine.</h3><p>Depois que você manda o material: o design, as peças cadastradas e o painel pronto. Você acompanha pelo WhatsApp.</p></li>
          <li><span className={c.quando}>Quando você aprovar</span><span className={c.valor}>{reais(oferta.saldo)}</span><h3>Ela vai ao ar.</h3><p>Uma rodada de ajustes incluída. Com a sua aprovação você paga o saldo, a vitrine é publicada e você recebe o painel.</p></li>
        </ol>
      </section>
      {/* (19/10) as dúvidas em letra de cartaz, o título preso à esquerda no computador */}
      <section id="duvidas" className={`${s.secao} ${c.duvidasV4}`} aria-labelledby="duvidas-titulo"><h2 id="duvidas-titulo">Tudo combinado,<br />desde o primeiro passo.</h2><div>{duvidas.map(([p, r]) => <details key={p}><summary>{p}<span aria-hidden="true" /></summary><p>{r}</p></details>)}</div></section>
      {/* (19/10) o fim fecha a história do hero: a pergunta do direct, agora respondida pela vitrine */}
      <section id="fim" className={c.fimV4} aria-labelledby="fim-titulo">
        <div>
          <h2 id="fim-titulo">O próximo &ldquo;Valor?&rdquo; do seu direct já chega respondido.</h2>
          <Botao href="#oferta" lugar="final">Começar por {reais(oferta.entrada)}</Botao>
          <p>{reais(oferta.saldo)} só na entrega, depois que você aprovar. Sem mensalidade.</p>
        </div>
        <div className={c.fimConversa} aria-hidden="true"><span className={c.fimPergunta}>Valor?</span><span className={c.fimResposta}>Está na vitrine, com o preço em cada peça.<small>Link da peça na vitrine</small></span></div>
      </section>
    </main>
    <footer className={s.footer}><span>Rafael Razeira Estúdio · Maringá, PR</span><div><a href="/portfolio">Portfólio</a><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a></div></footer>
    <Barra oferta={oferta} />
  </>;
}
