import type { Metadata } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Archivo, Inter, Space_Mono } from "next/font/google";
import { projetos } from "@/data/portfolio";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import s from "./portfolio.module.css";

const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

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

export default function PortfolioPage() {
  return <div className={`${s.site} ${display.variable} ${body.variable} ${mono.variable}`}>
    <header className={s.header}>
      <Link className={s.brand} href="/estudio/"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></Link>
      <a className={s.navcta} href={ZAP} target="_blank" rel="noopener" data-cta="portfolio_header" data-cta-dest="whatsapp">FALAR COMIGO ↗</a>
    </header>
    <main>
      <section className={s.intro}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>PORTFÓLIO · 9 PROJETOS ENTREGUES</p>
          <h1>Nove projetos, nove <em>negócios reais.</em></h1>
          <p className={s.lead}>Vitrines, e-commerce e sites feitos neste estúdio. Toque em um projeto para navegar no site ao vivo.</p>
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
    <a className={s.pill} href={ZAP} target="_blank" rel="noopener" data-cta="portfolio_pill" data-cta-dest="whatsapp">QUERO MINHA VITRINE DIGITAL ↗</a>
    <div className={s.bar}>
      <span className={s.barCopy}><b>VITRINE DIGITAL</b><span>Pronta em 7 dias úteis</span></span>
      <a className={s.button} href={ZAP} target="_blank" rel="noopener" data-cta="portfolio_bar" data-cta-dest="whatsapp">QUERO A MINHA ↗</a>
    </div>
  </div>;
}
