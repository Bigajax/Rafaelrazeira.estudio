import type { Metadata } from "next";
import Image from "next/image";
import { Instrument_Sans, Inter } from "next/font/google";
import { linkWhatsApp } from "@/lib/contato";
import { TURBINAR } from "@/lib/oferta";
import s from "./turbinar.module.css";

const corpo = Inter({ subsets: ["latin"], variable: "--font-corpo" });
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });

/* fora do Google durante o piloto (03/11/2026): a página é para quem já
   tem a vitrine, mandada por link na conversa; o /turbinar também está no
   disallow do app/robots.ts. O título é absoluto porque o modelo do layout
   leva um travessão, que a casa não usa em texto visível. */
export const metadata: Metadata = {
  title: { absolute: "Turbinar: os anúncios da sua vitrine | Rafael Razeira Estúdio" },
  description: "O estúdio roda os anúncios do Instagram e do Facebook da sua loja, todo mês, com as peças da sua vitrine. Você acompanha o número no seu painel.",
  robots: { index: false, follow: false },
};

const reais = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;
const ZAP = linkWhatsApp("Oi Rafael! Quero saber do Turbinar para a minha vitrine.");

/* o que entra todo mês: o trabalho, nunca o resultado prometido */
const MES = [
  { t: "1 ou 2 campanhas no ar", d: "No Instagram e no Facebook, com as peças que você quer vender: a novidade, a oferta, o que está parado." },
  { t: "Os anúncios feitos pelo estúdio", d: "Com as fotos do seu catálogo e o jeito da sua loja. Vários testados de uma vez, e o que não funciona sai." },
  { t: "O público da sua cidade", d: "Quem mora perto e tem o perfil de quem compra na sua loja." },
  { t: "Direto para o seu WhatsApp", d: "O anúncio leva para a peça na vitrine ou para a conversa com você." },
  { t: "Um ajuste toda semana", d: "O anúncio que não traz gente sai; o que traz ganha mais verba." },
  { t: "O resumo do mês", d: "Pelo WhatsApp: quanto foi investido, quantas pessoas chamaram e o plano do mês seguinte." },
];

const PASSOS = [
  { n: "01", t: "Você dá o acesso", d: "Um clique, na sua conta de anúncios da Meta. A conta e o cartão continuam seus, e dá para tirar o acesso quando quiser." },
  { n: "02", t: "O estúdio roda", d: "Monta as campanhas, cria os anúncios e ajusta toda semana. Você não precisa mexer em nada." },
  { n: "03", t: "Você vê o número", d: "No seu painel, na aba Desempenho: as visitas, as peças vistas e os cliques no WhatsApp." },
];

const NAO_ENTRA = [
  "Garantia de venda: o estúdio garante o trabalho e mostra o número.",
  "Fotos novas em estúdio: os anúncios usam as fotos do seu catálogo.",
  "O atendimento das conversas, que continua com a loja.",
  "Anúncios no Google ou no TikTok.",
];

const DUVIDAS = [
  { p: "O dinheiro do anúncio passa pelo estúdio?", r: "Não. A verba sai do seu cartão direto para a Meta, na sua conta de anúncios. O estúdio cobra só a gestão." },
  { p: "Quanto investir em anúncio?", r: `A partir de ${reais(TURBINAR.verbaDia)} por dia, cerca de ${reais(TURBINAR.verbaDia * 30)} por mês. Com menos que isso o anúncio quase não roda e não dá para medir. Para mais resultado, ${reais(TURBINAR.verbaRecomendadaDia)} por dia.` },
  { p: "Por que 3 meses no começo?", r: "As primeiras semanas são de teste: o anúncio aprende quem clica, e o estúdio descobre quais peças e fotos funcionam. Antes disso, o número ainda não diz muita coisa." },
  { p: "E se a Meta reprovar um anúncio?", r: "Acontece, e faz parte. O estúdio ajusta e manda de novo, sem custo a mais." },
  { p: "Preciso ter a vitrine do estúdio?", r: "Sim. É a vitrine que recebe quem clica, e é o painel dela que mostra o número." },
];

export default function PaginaTurbinar() {
  return (
    <div className={`${s.pagina} ${corpo.variable} ${titulo.variable}`}>
      <header className={s.topo}>
        <a href="/estudio" className={s.marca} aria-label="Rafael Razeira Estúdio">
          <Image src="/assets/marca/rr-monograma.webp" width={44} height={24} alt="" priority />
          <Image src="/assets/marca/rr-nome.webp" width={132} height={22} alt="" className={s.marcaNome} priority />
        </a>
        <a href={ZAP} className={`${s.botao} ${s.botaoPreto} ${s.botaoTopo}`} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp">
          <span>
            <span className={s.soLargo}>Falar no </span>WhatsApp
          </span>
        </a>
      </header>

      <main>
        <section className={s.hero}>
          <div className={s.heroTexto}>
            <p className={s.selo}>
              <span className={s.ponto} aria-hidden="true" /> Para quem já tem a vitrine do estúdio
            </p>
            <h1 className={s.h1}>
              Sua vitrine pronta. Agora, <em>gente chegando.</em>
            </h1>
            <p className={s.lede}>
              O estúdio roda os anúncios do Instagram e do Facebook da sua loja, todo mês, com as peças da sua vitrine. Você não mexe em nada e acompanha o número no seu painel.
            </p>
            <div className={s.acoes}>
              <a href={ZAP} className={`${s.botao} ${s.botaoRosa}`} target="_blank" rel="noreferrer">
                Quero turbinar a minha vitrine
              </a>
              <a href="#como-funciona" className={`${s.botao} ${s.botaoBranco}`}>
                Ver como funciona
              </a>
            </div>
          </div>

          {/* a prova: a vitrine de verdade no celular, e o caminho de quem clica */}
          <figure className={s.prova} aria-label="O anúncio leva para a vitrine, e a vitrine para o WhatsApp">
            <div className={s.fone}>
              <img src="/assets/fones/iconic.webp" width={780} height={1688} alt="A vitrine da Iconic Sneakers no celular" />
            </div>
            <span className={`${s.etiqueta} ${s.etiquetaUm}`}>
              <b>1</b> O anúncio no Instagram
            </span>
            <span className={`${s.etiqueta} ${s.etiquetaDois}`}>
              <b>2</b> A peça na sua vitrine
            </span>
            <span className={`${s.etiqueta} ${s.etiquetaTres}`}>
              <b>3</b> A conversa no seu WhatsApp
            </span>
          </figure>
        </section>

        <section className={s.secao} aria-labelledby="titulo-mes">
          <h2 id="titulo-mes" className={s.h2}>
            O que entra <em>todo mês.</em>
          </h2>
          <ul className={s.lista}>
            {MES.map((m) => (
              <li key={m.t} className={s.item}>
                <svg viewBox="0 0 20 20" aria-hidden="true" className={s.visto}>
                  <path d="M5 10.5l3.2 3.2L15 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className={s.itemTitulo}>{m.t}</p>
                  <p className={s.itemTexto}>{m.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className={s.secao} aria-labelledby="titulo-como">
          <h2 id="titulo-como" className={s.h2}>
            Como <em>funciona.</em>
          </h2>
          <ol className={s.passos}>
            {PASSOS.map((p) => (
              <li key={p.n} className={s.passo}>
                <span className={s.passoNum}>{p.n}</span>
                <p className={s.passoTitulo}>{p.t}</p>
                <p className={s.passoTexto}>{p.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={s.secao} aria-labelledby="titulo-preco">
          <h2 id="titulo-preco" className={s.h2}>
            O <em>investimento.</em>
          </h2>
          <div className={s.preco}>
            <div className={s.precoCartao}>
              <p className={s.precoRotulo}>A gestão do estúdio</p>
              <p className={s.precoValor}>
                {reais(TURBINAR.gestao)}
                <span>por mês</span>
              </p>
              <p className={s.precoNota}>
                Nas 2 primeiras lojas, {reais(TURBINAR.piloto)} por mês nos {TURBINAR.mesesPiloto} primeiros meses.
              </p>
            </div>
            <div className={s.precoCartao}>
              <p className={s.precoRotulo}>A verba do anúncio</p>
              <p className={s.precoValor}>
                {reais(TURBINAR.verbaDia)}
                <span>por dia, no mínimo</span>
              </p>
              <p className={s.precoNota}>Paga direto à Meta, no seu cartão. O dinheiro do anúncio nunca passa pelo estúdio.</p>
            </div>
          </div>
          <p className={s.prazo}>
            <b>Prazo:</b> {TURBINAR.prazoMeses} meses no começo, o tempo de o anúncio aprender e dar para medir. Depois, mês a mês.
          </p>
        </section>

        <section className={s.secao} aria-labelledby="titulo-nao">
          <h2 id="titulo-nao" className={s.h2}>
            O que <em>não entra.</em>
          </h2>
          <ul className={s.naoEntra}>
            {NAO_ENTRA.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>

        <section className={s.secao} aria-labelledby="titulo-duvidas">
          <h2 id="titulo-duvidas" className={s.h2}>
            Dúvidas <em>comuns.</em>
          </h2>
          <div className={s.duvidas}>
            {DUVIDAS.map((d) => (
              <details key={d.p} className={s.duvida}>
                <summary>{d.p}</summary>
                <p>{d.r}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={s.fim}>
          <h2 className={s.h2}>
            Vamos levar gente <em>para a sua vitrine?</em>
          </h2>
          <p className={s.lede}>Chama no WhatsApp. O estúdio olha a sua loja e diz por onde começar.</p>
          <a href={ZAP} className={`${s.botao} ${s.botaoRosa}`} target="_blank" rel="noreferrer">
            Quero turbinar a minha vitrine
          </a>
        </section>
      </main>

      <footer className={s.rodape}>
        <Image src="/assets/marca/rr-monograma.webp" width={44} height={24} alt="" />
        <span>Rafael Razeira Estúdio</span>
      </footer>
    </div>
  );
}
