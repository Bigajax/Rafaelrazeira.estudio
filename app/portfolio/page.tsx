import type { Metadata } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Baloo_2, Caveat, Space_Mono, Titan_One } from "next/font/google";
import { projetos } from "@/data/portfolio";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import s from "./portfolio.module.css";

const display = Titan_One({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-display" });
const body = Baloo_2({ subsets: ["latin", "latin-ext"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });
const hand = Caveat({ subsets: ["latin", "latin-ext"], weight: "600", variable: "--font-hand" });

export const metadata: Metadata = {
  title: "Portfólio",
  description: "Nove projetos entregues: vitrines digitais, e-commerce e sites para negócios reais. Navegue nos sites no ar e peça o seu pelo WhatsApp.",
};

/* Página do link da bio: quase todo mundo chega do Instagram, pelo celular.
   Nada aqui precisa de JavaScript no cliente: são capas, links e o WhatsApp. */
const ZAP = "https://wa.me/5544999997219?text=" + encodeURIComponent("Olá, Rafael! Vi o portfólio do estúdio e quero uma vitrine digital para o meu negócio.");

/* A capa pode não existir ainda (projeto novo antes da captura): a checagem
   roda no build, e o card sem arquivo mostra o nome da loja no lugar. */
const temCapa = (slug: string) => existsSync(path.join(process.cwd(), "public", "portfolio", `${slug}.webp`));

/* Estrela adesiva com carinha: a única mascote da página, recorte branco de
   adesivo em volta, como os stickers de papelaria. */
const Estrela = () => (
  <svg className={s.estrela} viewBox="0 0 120 116" aria-hidden="true">
    <path d="M60 4l14.5 32.6 35.5 3.8-26.4 24 7.4 34.9L60 81.5 28.9 99.3l7.4-34.9L10 40.4l35.5-3.8z" fill="#fffdf7" stroke="#fffdf7" strokeWidth="14" strokeLinejoin="round" />
    <path d="M60 4l14.5 32.6 35.5 3.8-26.4 24 7.4 34.9L60 81.5 28.9 99.3l7.4-34.9L10 40.4l35.5-3.8z" fill="#ffd64d" stroke="#065f46" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="49" cy="52" r="3.4" fill="#065f46" />
    <circle cx="71" cy="52" r="3.4" fill="#065f46" />
    <path d="M51 63q9 7 18 0" stroke="#065f46" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

export default function PortfolioPage() {
  return <div className={`${s.site} ${display.variable} ${body.variable} ${mono.variable} ${hand.variable}`}>
    <header className={s.header}>
      <Link className={s.brand} href="/estudio/"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></Link>
      <a className={s.navcta} href={ZAP} target="_blank" rel="noopener" data-cta="portfolio_header" data-cta-dest="whatsapp">Falar comigo ↗</a>
    </header>
    <main>
      <section className={s.intro}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>PORTFÓLIO · 9 PROJETOS ENTREGUES</p>
          <h1>Nove sites, nove <em>negócios reais.</em></h1>
          <p className={s.lead}>Vitrines, e-commerce e páginas feitas neste estúdio, do papel ao ar.</p>
          <p className={s.nota}>os sites abrem de verdade: pode tocar!</p>
          <Estrela />
        </div>
      </section>
      <section className={s.gridSec}>
        <div className={`${s.wrap} ${s.grid}`}>
          {projetos.map((p, i) => <ProjectCard key={p.slug} projeto={p} temCapa={temCapa(p.slug)} prioridade={i === 0} />)}
        </div>
      </section>
    </main>
    <footer className={s.footer}>
      <div className={s.brand}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav><Link href="/estudio/">INÍCIO</Link><Link href="/vitrine-digital/">VITRINE DIGITAL</Link><Link href="/servicos">SERVIÇOS</Link><Link href="/e-commerce">E-COMMERCE</Link></nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
    </footer>
    <a className={s.pill} href={ZAP} target="_blank" rel="noopener" data-cta="portfolio_pill" data-cta-dest="whatsapp">Quero minha vitrine digital ↗</a>
    <div className={s.bar}>
      <span className={s.barCopy}><b>VITRINE DIGITAL</b><span>Pronta em 7 dias úteis</span></span>
      <a className={s.button} href={ZAP} target="_blank" rel="noopener" data-cta="portfolio_bar" data-cta-dest="whatsapp">Quero a minha ↗</a>
    </div>
  </div>;
}
