import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { IMERSIVO, OFERTA } from "@/lib/oferta";
import { FormImersivo } from "@/components/imersivo/FormImersivo";
import { VideoProva } from "@/components/imersivo/VideoProva";
import s from "./imersivo.module.css";

/* ============================================================
   /site-imersivo: o site de marca que anda com o scroll (15/10/2026)

   Irmã da /vitrine-digital na identidade (papel e tinta, Archivo
   condensada, JetBrains Mono nas etiquetas, rosa só na ação), mas para
   outro comprador: a marca média que quer parecer grande, não a loja do
   Instagram. Nasceu do estudo da Monster, que é a prova da página.

   A segunda versão (15/10, "mais direto e com personalidade"): a página
   vende um filme, então ela se comporta como um. O hero é cinema de tela
   cheia com o título em letra de bloco, a mesma extrusão do site da
   Monster; os benefícios viraram uma faixa rotativa e um "antes e depois"
   (a grade de sempre contra a cena); o que só explicava saiu. Seis
   verbetes, quatro passos e cinco dúvidas viraram uma faixa, um
   comparativo, três passos e três dúvidas.

   O que esta página NUNCA faz:
   - prometer prazo: o Rafael não fixou um. Sem número, sem frase.
   - usar a logo da Monster como enfeite: a marca só aparece dentro do
     vídeo de portfólio, com uma linha discreta no rodapé (sem vínculo).
   - inventar resultado de cliente: ainda não existe cliente; a prova é o
     estudo, e a página diz isso.
   ============================================================ */

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const R = OFERTA.pt.preco;
const TITULO = "Site imersivo para marcas | Rafael Razeira Estúdio";
const DESCRICAO = `A pessoa entra no site da sua marca e não rola: assiste. O cenário anda com o scroll e o seu produto real está na cena. ${R(IMERSIVO.total)}, metade na entrada.`;

export const metadata: Metadata = {
  title: { absolute: TITULO },
  description: DESCRICAO,
  alternates: { canonical: "/site-imersivo" },
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: "/site-imersivo",
    siteName: "Rafael Razeira Estúdio",
    locale: "pt_BR",
    type: "website",
    /* repetida de propósito: o openGraph do filho substitui o do layout raiz */
    images: [{ url: "/assets/og-rr.png", width: 1200, height: 630, alt: "Monograma RR do Rafael Razeira Estúdio" }],
  },
};

/* A faixa: os benefícios em soco, sem verbete. Vai duas vezes para o loop fechar. */
const FAIXA = ["O visitante para de rolar", "Seu produto de verdade na cena", "Os números da sua marca, na hora certa", "Feito para o celular", "Leve no 4G", "No ar, com link para a bio"];

const PASSOS = [
  { t: "Roteiro", d: "Você me conta o produto. Eu escrevo as cenas e o que cada uma vende." },
  { t: "Imagens-chave", d: "Uma imagem por cena, aprovada por você antes de qualquer vídeo." },
  { t: "No ar", d: "As cenas viram scroll, os textos entram, e o site sai conferido no computador e no celular." },
];

const INCLUSO = [
  "1 página, até 3 cenas emendadas no scroll",
  "Roteiro e imagens-chave aprovados antes do vídeo",
  "Os números do produto em cada cena",
  "Versão para o celular",
  "2 rodadas de ajuste",
  "Créditos de IA das gerações, já no preço",
];
const NAO_INCLUSO = ["Domínio e hospedagem", "Fotos do produto (você envia)", "Loja com carrinho e pagamento"];

const DUVIDAS = [
  {
    q: "O produto é gerado por IA?",
    a: "Não. A IA faz o cenário e o movimento. O produto entra a partir das suas fotos, porque é a única forma de o rótulo sair certo em todas as cenas. No estudo que você viu acima, a lata gerada por IA tombou quatro vezes seguidas antes de essa regra nascer.",
  },
  {
    q: "Serve para vender online?",
    a: "Ele é a vitrine da marca: apresenta, convence e leva para onde você vende. Loja com carrinho e pagamento é outro projeto.",
  },
  {
    q: `Por que ${R(IMERSIVO.total)}?`,
    a: `É o preço dos três primeiros projetos, que viram case do estúdio. ${R(IMERSIVO.entrada)} na entrada, porque os créditos de IA são gastos antes da entrega, e ${R(IMERSIVO.saldo)} quando o site estiver no ar.`,
  },
];

export default function SiteImersivo() {
  return (
    <div className={`${s.site} ${display.variable} ${body.variable} ${mono.variable}`}>
      <header className={s.topo}>
        <a className={s.marca} href="/estudio">
          RAFAEL RAZEIRA <span>ESTÚDIO</span>
        </a>
        <a className={s.topoCta} href="#orcamento">
          Quero um para a minha marca
        </a>
      </header>

      <main>
        {/* O HERO É O CINEMA: o filme de tela cheia atrás, o título em bloco na frente. */}
        <section className={s.hero}>
          <VideoProva className={s.heroVideo} />
          <div className={s.heroSombra} aria-hidden="true" />
          <div className={s.heroTexto}>
            <p className={s.etiqueta}>Site imersivo para marcas</p>
            <h1 className={s.h1}>
              <span className={s.h1Linha}>A pessoa entra</span>
              <span className={s.h1Linha}>no seu site</span>
              <span className={`${s.h1Linha} ${s.h1Rosa}`}>e não rola.</span>
              <span className={`${s.h1Linha} ${s.h1Rosa}`}>Assiste.</span>
            </h1>
            <p className={s.lead}>
              O cenário anda com o scroll. Cada produto tem a sua cena. E é o seu produto de verdade que está nela.
            </p>
            <div className={s.heroAcao}>
              <a className={s.botao} href="#orcamento">
                Quero um para a minha marca
              </a>
              <p className={s.ancora}>
                <b>{R(IMERSIVO.total)}</b> metade na entrada
              </p>
            </div>
          </div>
          <p className={s.heroNota}>Ao fundo, um estudo de site do estúdio. Conceito não oficial.</p>
        </section>

        {/* A FAIXA: os benefícios em soco, torta, rodando. É o gesto do site da Monster. */}
        <div className={s.faixa} aria-label="O que a sua marca ganha">
          <div className={s.faixaTrilho}>
            {[0, 1].map((v) => (
              <div key={v} className={s.faixaVolta} aria-hidden={v === 1 || undefined}>
                {FAIXA.map((f) => (
                  <span key={f} className={s.faixaItem}>
                    {f}
                    <i className={s.faixaPonto} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ANTES E DEPOIS: o argumento inteiro numa tela. A grade de sempre contra a cena. */}
        <section className={s.versus} aria-labelledby="versus">
          <h2 id="versus" className={s.soLeitor}>O site de sempre e o site filme</h2>
          <div className={`${s.lado} ${s.ladoGrade}`}>
            <p className={s.ladoTitulo}>O site de sempre</p>
            <div className={s.grade} aria-hidden="true">
              {Array.from({ length: 6 }, (_, n) => (
                <div key={n} className={s.gradeCartao}>
                  <i />
                  <b />
                  <u />
                </div>
              ))}
            </div>
            <p className={s.ladoFrase}>Grade, cartão, lista. Em três segundos a pessoa já decidiu que viu isso antes.</p>
          </div>
          <div className={`${s.lado} ${s.ladoCena}`}>
            <p className={s.ladoTitulo}>O site filme</p>
            {/* o mesmo filme do hero, agora nítido e inteiro: é aqui que a pessoa vê o produto */}
            <VideoProva className={s.cenaVideo} />
            <p className={s.ladoFrase}>Uma cena por produto. O número certo na hora certa. A pessoa chega ao fim. Este é um estudo do estúdio, rolando ao vivo.</p>
          </div>
        </section>

        {/* COMO É FEITO: três passos, uma linha. O que importa é "você aprova antes do vídeo". */}
        <section className={`${s.secao} ${s.escura}`} aria-labelledby="como">
          <h2 id="como" className={s.h2}>
            Você aprova antes de <em>qualquer vídeo.</em>
          </h2>
          <ol className={s.passos}>
            {PASSOS.map((p, n) => (
              <li key={p.t} className={s.passo}>
                <span className={s.passoN}>{n + 1}</span>
                <h3 className={s.h3}>{p.t}</h3>
                <p>{p.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* O PREÇO: grande, em bloco, sem rodeio. */}
        <section className={s.secao} aria-labelledby="investimento">
          <div className={s.oferta}>
            <div className={s.ofertaPreco}>
              <p className={s.etiqueta}>Investimento</p>
              <h2 id="investimento" className={s.preco}>{R(IMERSIVO.total)}</h2>
              <p className={s.precoParcelas}>
                {R(IMERSIVO.entrada)} na entrada. {R(IMERSIVO.saldo)} com o site no ar.
              </p>
              <p className={s.precoNota}>Preço dos três primeiros projetos.</p>
              <a className={s.botao} href="#orcamento">
                Quero um para a minha marca
              </a>
            </div>
            <div className={s.ofertaLista}>
              <h3 className={s.h3}>Entra</h3>
              <ul className={s.lista}>
                {INCLUSO.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <h3 className={s.h3}>Não entra</h3>
              <ul className={`${s.lista} ${s.listaFora}`}>
                {NAO_INCLUSO.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={s.secao} aria-labelledby="duvidas">
          <h2 id="duvidas" className={s.h2}>Três perguntas que todo mundo faz</h2>
          <div className={s.duvidas}>
            {DUVIDAS.map((d) => (
              <details key={d.q} className={s.duvida}>
                <summary>{d.q}</summary>
                <p>{d.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="orcamento" className={`${s.secao} ${s.escura} ${s.final}`} aria-labelledby="pedir">
          <h2 id="pedir" className={s.h2}>
            Conta da sua marca. <em>Eu respondo no WhatsApp.</em>
          </h2>
          <FormImersivo />
        </section>
      </main>

      <footer className={s.rodape}>
        <p>
          <a href="/estudio">Rafael Razeira Estúdio</a> · <a href="/vitrine-digital">Vitrine digital para lojas</a>
        </p>
        <p>Vídeo de estudo, sem vínculo com a marca exibida.</p>
      </footer>
    </div>
  );
}
