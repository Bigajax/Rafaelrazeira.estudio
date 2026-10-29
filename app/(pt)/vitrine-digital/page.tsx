import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";
import { Analytics, FAQ, Header, Hero, MobileBar } from "@/components/vitrine/sections";
import { Depoimentos, Etapas, FimNovo, LojasNoAr, Placar, Preco, QuemFazCurto, Rodape } from "@/components/vitrine/mobbin";
import { SemAncoraDoAnuncio } from "@/components/vitrine/SemAncoraDoAnuncio";
import { LangProvider } from "@/components/i18n";
import { alternatesPara } from "@/lib/idiomas";
import { pt } from "@/messages/vitrine.pt";
import styles from "./vitrine.module.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body" });
/* a Archivo (88KB) e a JetBrains Mono saíram em 28/10: medido na página,
   a primeira não desenhava nenhuma letra e a mono só cinco rótulos, que
   passaram para a mono do sistema (ver `.semFontesExtras` no CSS) */
/* as manchetes na Instrument Sans desde 28/10, ver `.tipoTitulo` no CSS */
const titulo = Instrument_Sans({ subsets: ["latin"], variable: "--font-titulo" });

/* o título e a descrição moram no dicionário desde 11/09/2026, junto com o
   resto do texto da página; `alternates` aponta a irmã em inglês */
export const metadata: Metadata = {
  title: pt.meta.title,
  description: pt.meta.description,
  alternates: alternatesPara("/vitrine-digital"),
};

/* ---------- esta página não tem tela de carregamento ----------
   E não é esquecimento: o <Loader /> que /estudio, /servicos e /e-commerce
   usam foi retirado daqui de propósito, em 05/08.

   O rito custava caro no lugar errado. Ele cobria a tela até o evento
   `load` (que espera todas as imagens não-lazy e as fontes) e só então
   começava a se desfazer numa grade de quadrados: num Android de 360x780
   são 18 fileiras a 55ms cada, ou seja, mais 1,3s DEPOIS de a espera
   acabar. Piso de ~2s em conexão boa, ~3,5s no 4G. A sessão mediana desta
   landing tem 8,6 segundos e a maioria do tráfego chega de 4G pelo
   navegador interno do Instagram: era perto de 40% da visita gasto olhando
   uma logo, com o argumento já pintado embaixo do overlay.

   Junto saiu o preload de 36KB da logo, que o React emite para toda imagem
   do render inicial e que disputava a frente da fila com a imagem do hero,
   justamente o elemento que precisa chegar primeiro.

   As outras páginas continuam com o loader: lá o visitante já conhece a
   marca ou chegou por vontade própria. Aqui é tráfego pago frio, e ninguém
   clicou no anúncio para ver uma abertura. */
export default function VitrineDigitalPage() {
  /* o provider entrega o dicionário pt aos componentes (useT); a
     /en/vitrine-digital faz o mesmo com o en */
  return <LangProvider lang="pt" messages={pt}><div className={`${styles.site} ${styles.botoesApple} ${styles.tipoTitulo} ${styles.estruturaCentro} ${styles.semFontesExtras} ${titulo.variable} ${body.variable}`}>
    {/* apaga o #hero-form/#contratar que vem do anúncio antes de o navegador pular (ver o componente) */}
    <SemAncoraDoAnuncio />
    <Header />
    <main>
      {/* a ordem de 28/10 (pedido do Rafael, "reestruture"): a ordem das perguntas
          de quem chega frio do anúncio. Existe? (números, lojas, o Luciano logo
          depois da Iconic aparecer na fila) Como funciona? Quem faz? Quanto custa?
          O convite final, e o FAQ por último, para quem procura uma resposta
          pontual; o botão do topo segue à vista durante ele. */}
      <Hero />
      <Placar />
      <LojasNoAr />
      <Depoimentos />
      <Etapas />
      <QuemFazCurto />
      <Preco />
      <FimNovo />
      <FAQ />
    </main>
    <Rodape />
    <MobileBar />
    <Analytics />
  </div></LangProvider>;
}
