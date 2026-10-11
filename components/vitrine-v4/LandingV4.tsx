"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Botao, Icone, Painel, recursos } from "@/components/vitrine/LandingVitrine";
import { Selo } from "@/components/performance/Selo";
import { linkWhatsApp } from "@/lib/contato";
import s from "@/components/vitrine/landing.module.css";
import c from "./landing-v4.module.css";
import { Demonstracao, ComoFunciona } from "@/components/vitrine/ExperienciaLoja";

export type OfertaV4Publica = {
  pix: number; cartao: number; parcelas: number; produtos: number;
  performance: number; pagamento: number; ecommerce: number; ecommerceMensal: number;
  lojas: { nome: string; tag: string; img: string; url: string; w: number; h: number }[];
  video: { src: string | null; poster: string | null };
};
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Number.isInteger(v) ? 0 : 2 });
const VAGAS_POR_SEMANA = 10;
const duvida = linkWhatsApp("Oi Rafael! Vi a oferta da vitrine digital de compra direta e queria tirar uma dúvida antes de contratar.");

function Escolher({ lugar, secundario = false }: { lugar: string; secundario?: boolean }) {
  return <Botao href="#oferta" lugar={lugar} secundario={secundario}>Quero minha vitrine</Botao>;
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
  return <div className={s.barraCelular} hidden={!visivel}><span><b>{reais(oferta.pix)}</b><small>no Pix · sem mensalidade</small></span><Escolher lugar="sticky_mobile" /></div>;
}

export function LandingV4({ oferta }: { oferta: OfertaV4Publica }) {
  const duvidas = [
    ["Como funciona o pagamento?", `Você contrata por aqui: ${reais(oferta.pix)} à vista no Pix ou ${reais(oferta.cartao)} no cartão, em até ${oferta.parcelas}x. Os juros e o valor de cada parcela aparecem no checkout, antes de confirmar. O projeto é pago na contratação; você revisa a primeira versão antes de publicar.`],
    ["Tem mensalidade?", "A vitrine e o painel estão incluídos no pagamento do projeto, sem mensalidade. Um domínio próprio é opcional e tem compra e renovação pagas diretamente no registrador. Performance e e-commerce são serviços opcionais com suas próprias condições."],
    ["Quantos produtos entram?", `Eu cadastro até ${oferta.produtos} produtos iniciais. Você envia nome, preço, tamanhos, categoria e fotos em um formato organizado. Depois, pode adicionar mais peças pelo painel, que não impõe um limite de produtos.`],
    ["Quando a vitrine fica pronta?", "Até 7 dias úteis após receber todo o material da loja. Você recebe a primeira versão e tem uma rodada de ajustes incluída antes da publicação."],
    ["E se eu precisar mudar alguma coisa?", "Depois de publicada, você atualiza produtos, fotos, preços, estoque, banners e textos editáveis pelo painel. Mudanças na estrutura e no design podem ser combinadas com o estúdio."],
    ["Minha cliente paga na vitrine?", "Nesta oferta, ela escolhe a peça e abre seu WhatsApp com a mensagem preenchida. Você combina pagamento e entrega com ela. Pix e cartão na página da peça e e-commerce são outros serviços, que você pode contratar depois."],
    ["O Performance está incluído?", "A análise básica de visitas, peças vistas e cliques no WhatsApp acompanha sua vitrine. Relatórios mensais, análises completas e acompanhamento do estúdio fazem parte do Performance, contratado à parte."],
    ["Por que só 10 vagas por semana?", `Eu mesmo desenho, desenvolvo e publico as vitrines. Por isso, a agenda desta oferta é limitada a ${VAGAS_POR_SEMANA} novos projetos por semana, para cuidar de cada loja de perto.`],
  ];
  return <>
    <a className={s.pular} href="#principal">Pular para o conteúdo</a>
    <header className={s.header}>
      <a href="/estudio" className={s.marca} aria-label="Rafael Razeira Estúdio"><Image src="/assets/favicon.png" width={42} height={42} alt="" /><span>Rafael Razeira<small>Estúdio</small></span></a>
      <nav aria-label="Navegação da vitrine"><a href="#como-funciona">Como funciona</a><a href="#painel">O painel</a><a href="#projetos">Lojas no ar</a><Escolher lugar="header" /></nav>
    </header>
    <main id="principal" tabIndex={-1}>
      <section id="topo" className={s.hero} aria-labelledby="vitrine-titulo">
        <div className={s.heroTexto}>
          <p className={s.rotulo}><span className={s.ponto} /> Vitrine digital para lojas</p>
          <h1 id="vitrine-titulo">Sua cliente chega no WhatsApp<br /><em>com a peça escolhida.</em></h1>
          <p className={s.heroLead}>Uma vitrine profissional, desenhada para sua marca, com fotos, preços e tamanhos à vista. Eu preparo o site e cadastro até {oferta.produtos} produtos. Você cuida do dia a dia pelo painel.</p>
          <div className={s.heroOferta}><b>{reais(oferta.pix)}</b><span>pelo projeto completo no Pix<small>Pagamento único · sem mensalidade</small></span></div>
          <p className={s.heroCondicao}>Ou {reais(oferta.cartao)} no cartão, em até {oferta.parcelas}x.<br />Juros e parcelas calculados no checkout.</p>
          <p className={c.vagasHero}><span aria-hidden="true" /> Apenas {VAGAS_POR_SEMANA} vagas por semana.</p>
          <div className={s.acoes}><Escolher lugar="hero" /><Botao lugar="hero_projetos" href="#projetos" secundario>Ver lojas no ar</Botao></div>
          <p className={s.heroNota}>Você revisa a primeira versão antes de publicar. Uma rodada de ajustes incluída.</p>
          <div className={s.heroQuem}><Image src="/assets/rafael-avatar.webp" width={40} height={40} alt="Rafael Razeira" /><p>Desenhada por mim. Atualizada por você.<small>Você fala com o Rafael da contratação à publicação.</small></p></div>
        </div>
        <Demonstracao loja="japa" />
      </section>
      <div className={s.resumoEntrega}><span><Icone tipo="check" /> Design para sua marca</span><span><Icone tipo="check" /> Até {oferta.produtos} produtos cadastrados</span><span><Icone tipo="check" /> Painel incluído</span><span><Icone tipo="check" /> Até 7 dias úteis após o material</span></div>
      {oferta.video.src ? <section className={s.secao} aria-labelledby="video-titulo"><p className={s.rotulo}>Veja antes de decidir</p><h2 id="video-titulo">Da escolha ao WhatsApp.</h2><video className={c.video} src={oferta.video.src} poster={oferta.video.poster ?? undefined} controls playsInline preload="none" aria-label="Apresentação da vitrine digital" /></section> : null}
      <ComoFunciona loja="japa" />
      <section className={`${s.secao} ${s.recursosSecao}`} aria-label="Recursos da vitrine"><div className={s.recursos}>{recursos.map(([icone,titulo,texto],i) => <article key={titulo}><div className={s.recursoTopo}><span className={s.iconeCaixa}><Icone tipo={icone} /></span><span>0{i+1}</span></div><h3>{titulo}</h3><p>{texto}</p></article>)}</div></section>
      <Painel />
      <section id="projetos" className={s.secao} aria-labelledby="projetos-titulo">
        <div className={s.secaoCabeca}><div><p className={s.rotulo}>03 / Projetos do estúdio</p><h2 id="projetos-titulo">Veja as lojas no ar.</h2></div><p>Cada loja com sua identidade. Abra as vitrines e veja o caminho até o WhatsApp.</p></div>
        <div className={s.projetos}>{oferta.lojas.map(l => <a key={l.url} className={s.projeto} href={l.url} target="_blank" rel="noreferrer" data-cta={`case_${l.nome}`} data-cta-dest="site"><div className={s.projetoImagem}><Image src={l.img} width={l.w} height={l.h} sizes="(max-width: 700px) 90vw, 380px" alt={`Vitrine da ${l.nome}`} /></div><div><span className={s.rotulo}>Vitrine digital</span><h3>{l.nome}<Icone tipo="seta" /></h3><p>{l.tag}</p><span className={s.projetoAbrir}>Abrir a vitrine ↗</span></div></a>)}</div>
        <div className={s.quem}><Image src="/assets/rafael-avatar.webp" width={64} height={64} alt="Rafael Razeira" /><div><h3>Quem desenha e quem responde sou eu.</h3><p>Sou Rafael Razeira, de Maringá. Desenho, desenvolvo e publico sua vitrine. Você conversa direto comigo sobre sua loja.</p></div><a href="/portfolio">Ver o portfólio ↗</a></div>
      </section>
      <section id="oferta" className={`${s.secao} ${s.oferta}`} aria-labelledby="oferta-titulo">
        <div className={s.ofertaTexto}><p className={s.rotulo}>Um projeto completo</p><h2 id="oferta-titulo">Design, catálogo e painel.<br />Sua vitrine completa.</h2><p>Você contrata a vitrine. Eu preparo o projeto, cadastro os produtos e publico depois da sua revisão.</p>
          <ul className={s.listaInclui}>{["Design com a identidade da sua loja","Página inicial, categorias e páginas de produto",`Cadastro de até ${oferta.produtos} produtos com material organizado`,"Fotos, preços, descrições e tamanhos disponíveis","WhatsApp com a peça escolhida na mensagem","Painel para produtos, estoque, banners e textos","Análise básica de visitas e interesse","Publicação, endereço configurado e uma rodada de ajustes"].map(t => <li key={t}><Icone tipo="check" />{t}</li>)}</ul>
          <p className={s.nota}>Até 7 dias úteis após receber todo o material. Domínio próprio opcional, pago diretamente no registrador. <a href="/termos">Escopo e termos</a>.</p>
        </div>
        <div className={`${s.formulario} ${c.checkout}`}>
          <p className={s.rotulo}>Sua próxima vitrine</p><h3>Escolha como começar.</h3>
          <div className={s.preco}><b>{reais(oferta.pix)}</b><span>à vista no Pix · sem mensalidade</span></div>
          <p className={c.revisao}><Icone tipo="check" /> Você revisa antes de publicar.</p>
          <div className={c.vagas}><b>Apenas {VAGAS_POR_SEMANA} vagas por semana.</b><p>Eu cuido pessoalmente do projeto de cada loja.</p></div>
          <button type="button" className={s.botao} data-checkout-item="avista_pix" data-cta="oferta_pix" data-cta-dest="checkout">Contratar no Pix<Icone tipo="seta" /></button>
          <button type="button" className={s.botaoSecundario} data-checkout-item="avista_card" data-cta="oferta_cartao" data-cta-dest="checkout">Contratar no cartão<Icone tipo="seta" /></button>
          <p className={s.nota}>Cartão: {reais(oferta.cartao)} em até {oferta.parcelas}x. Juros e valor das parcelas apresentados no checkout, antes de confirmar.</p>
          <p className={s.nota}>Pagamento pelo Mercado Pago. O valor do projeto é pago na contratação. Depois, combinamos o material pelo WhatsApp.</p>
          <a className={c.duvida} href={duvida} target="_blank" rel="noreferrer" data-cta="oferta_duvida" data-cta-dest="whatsapp">Quero tirar uma dúvida com o Rafael ↗</a>
        </div>
      </section>
      <section id="depois" className={s.secao} aria-labelledby="depois-titulo"><div className={s.secaoCabeca}><div><p className={s.rotulo}>Depois da contratação</p><h2 id="depois-titulo">Você manda o material.<br />Eu cuido da vitrine.</h2></div><p>Um caminho curto, com você acompanhando cada etapa pelo WhatsApp.</p></div><ol className={c.etapas}><li><span>01</span><h3>A gente combina o projeto.</h3><p>Depois do pagamento, conversamos sobre sua loja e organizamos logo, fotos e informações dos produtos.</p></li><li><span>02</span><h3>Eu preparo sua vitrine.</h3><p>Desenho com a identidade da sua marca, cadastro as peças e configuro seu painel.</p></li><li><span>03</span><h3>Você revisa e eu publico.</h3><p>Uma rodada de ajustes incluída. Com sua aprovação, a vitrine vai ao ar e você recebe o acesso ao painel.</p></li></ol></section>
      <section className={`${s.secao} ${s.crescimento}`} aria-labelledby="crescer-titulo"><div className={s.secaoCabeca}><div><p className={s.rotulo}>Quando fizer sentido</p><h2 id="crescer-titulo">Sua loja pode crescer com você.</h2></div><p>Os próximos serviços são opcionais. Você escolhe quando contratar.</p></div><details className={s.servicos}><summary>Conheça os próximos passos<span aria-hidden="true">+</span></summary><div className={s.servicosGrid}><article><h3><Selo tamanho={20} rotulo="" /> Performance</h3><p>Análises completas, relatório mensal e acompanhamento do estúdio.</p><b>{reais(oferta.performance)}<small>/mês · sem fidelidade</small></b></article><article><h3>Vitrine com pagamento</h3><p>Pix e cartão na página da peça. Entrega local ou retirada.</p><b>{reais(oferta.pagamento)}<small>projeto completo · sem mensalidade</small></b></article><article><h3>E-commerce</h3><p>Sacola, frete para o Brasil, estoque automático e pedidos no painel. Performance incluído.</p><b>{reais(oferta.ecommerce)}<small>+ {reais(oferta.ecommerceMensal)}/mês após a entrega</small></b></article></div><p className={s.nota}>Valores dos projetos completos. Se você já tem a vitrine, combinamos a condição de upgrade na proposta.</p></details></section>
      <section id="duvidas" className={`${s.secao} ${s.duvidas}`} aria-labelledby="duvidas-titulo"><div><p className={s.rotulo}>Antes de contratar</p><h2 id="duvidas-titulo">Tudo combinado,<br />desde o primeiro passo.</h2></div><div>{duvidas.map(([p,r]) => <details key={p}><summary>{p}<span aria-hidden="true">+</span></summary><p>{r}</p></details>)}</div></section>
      <section id="fim" className={s.fim}><p className={s.rotulo}>Apenas {VAGAS_POR_SEMANA} vagas por semana</p><h2>Sua loja merece uma vitrine<br />à altura da sua marca.</h2><Escolher lugar="final" /><p>{reais(oferta.pix)} no Pix · até {oferta.produtos} produtos iniciais · painel incluído</p></section>
    </main>
    <footer className={s.footer}><span>Rafael Razeira Estúdio · Maringá, PR</span><div><a href="/portfolio">Portfólio</a><a href="/termos">Termos</a><a href="/privacidade">Privacidade</a></div></footer>
    <Barra oferta={oferta} />
  </>;
}
