import type { ReactNode } from "react";
import Link from "next/link";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { linkWhatsApp } from "@/lib/contato";
import s from "@/app/(pt)/portfolio/portfolio.module.css";

/* ============================================================
   A MOLDURA DOS CASOS: cabeçalho, contato, rodapé e barra do celular

   Os casos são o /portfolio contado por dentro, então vestem a MESMA
   roupa dele: as três vozes, os tokens e as classes de
   portfolio.module.css. Não existe CSS de casca novo aqui; o que é só
   dos casos mora em casos.module.css, por cima.

   Só português: a busca que um caso responde ("site para skate shop em
   Curitiba") é brasileira, e uma versão em inglês seria página sem
   leitor. Por isso não há seletor de idioma.
   ============================================================ */
const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const RODAPE = [
  { label: "INÍCIO", href: "/estudio/" },
  { label: "VITRINE DIGITAL", href: "/vitrine-digital/" },
  { label: "PORTFÓLIO", href: "/portfolio" },
  { label: "CASOS", href: "/casos" },
];

export function Moldura({ children, mensagem, origem }: { children: ReactNode; mensagem: string; origem: string }) {
  return <div className={`${s.site} ${display.variable} ${body.variable} ${mono.variable}`} lang="pt-BR">
    <header className={s.header}>
      <Link className={s.brand} href="/estudio/"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></Link>
      <span className={s.headStatus}><i aria-hidden /> RESPOSTA NO MESMO DIA</span>
      <div className={s.headRight}>
        <a className={s.headCta} href="#contato" data-cta={`${origem}_header`} data-cta-dest="contato">QUERO A MINHA ↓</a>
      </div>
    </header>
    <main>
      {children}
      {/* O único lugar que abre conversa, como no /portfolio: depois da prova. */}
      <section className={s.contatoSec} id="contato">
        <div className={s.wrap}>
          <div className={s.contato}>
            <p className={s.eyebrow}>VITRINE DIGITAL · PROJETO COMPLETO</p>
            <h2>A próxima pode<br /><em>ser a sua<span className={s.ponto}>.</span></em></h2>
            <p className={s.lead}>Catálogo montado, pedido no WhatsApp e a loja no ar em 7 dias úteis. Me chama que eu te mostro como fica a sua.</p>
            <a className={`${s.button} ${s.acao}`} href={linkWhatsApp(mensagem)} target="_blank" rel="noopener" data-cta={`${origem}_final`} data-cta-dest="whatsapp">FALAR COMIGO NO WHATSAPP ↗</a>
          </div>
        </div>
      </section>
    </main>
    <footer className={s.footer}>
      <div className={s.brand}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav>{RODAPE.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
    </footer>
    <a className={s.bar} href="#contato" data-cta={`${origem}_bar`} data-cta-dest="contato">
      <span className={s.barCopy}><b>VITRINE DIGITAL</b><span>No ar em 7 dias úteis</span></span>
      <span className={s.barCta}>QUERO A MINHA ↓</span>
    </a>
  </div>;
}
