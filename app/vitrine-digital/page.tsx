import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { Analytics, BrandBand, FAQ, FinalCTA, Header, Hero, HowItWorks, Included, MobileBar, Offer, PainSolution, Panel, Process, Projects, QuemFaz } from "@/components/vitrine/sections";
import styles from "./vitrine.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Vitrine Digital para lojas",
  description: "Transforme seu Instagram em uma loja organizada. Catálogo profissional com WhatsApp integrado, projeto completo por R$999.",
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
  return <div className={`${styles.site} ${display.variable} ${body.variable} ${mono.variable}`}>
    <Header />
    <main>
      <Hero />
      <QuemFaz />
      <BrandBand />
      <PainSolution />
      <HowItWorks />
      <Projects />
      <Included />
      {/* ---------- a garantia passou na frente do preço (23/08) ----------
          A ordem era `Included → Panel → Offer → Process`, ou seja, a
          pessoa recebia o preço e o formulário ANTES do motivo pelo qual
          o preço é seguro. A `Process` inteira é essa resposta ("Você vê
          a loja pronta antes de pagar o resto"), e ela chegava tarde
          demais para servir de alguma coisa.

          Quem cedeu o lugar foi a `Panel`, e ela ganha com a troca: a
          manchete dela é "Depois de publicada, a vitrine é sua", que é
          resposta a uma pergunta de DEPOIS do preço ("e aí, fico preso a
          você?"). O painel como item de escopo já está dito antes, na
          lista dos 9 itens da `Included`.

          Por que não foi uma reordenação maior, que é o que a auditoria
          de 23/08 pedia: a página alterna papel e grafite e nunca encosta
          duas seções escuras. `Projects`, `Panel`, `QuemFaz` e `Process`
          são todas escuras, e só sobra uma seção clara no miolo para
          separá-las. Qualquer arranjo mais ambicioso exigiria clarear uma
          seção, e as duas candidatas usam `--green-live`, `--mint` e
          `--line-dark`, que são tokens de grafite: no papel eles violam a
          paleta. Esta troca é a única que põe a garantia antes do preço
          sem tocar em cor nenhuma.

          A `QuemFaz` não se move por um terceiro motivo, além da cor: a
          copy dela diz "a loja que rola no celular AÍ EM CIMA, e as duas
          de clientes LOGO ABAIXO", o que a prende entre o Hero e a
          `Projects`. */}
      <Process />
      <Offer />
      <Panel />
      <FAQ />
      <FinalCTA />
    </main>
    <MobileBar />
    <Analytics />
  </div>;
}
