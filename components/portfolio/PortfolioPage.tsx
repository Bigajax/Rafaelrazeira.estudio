import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { projetos } from "@/data/portfolio";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { SeletorIdioma } from "@/components/idioma/SeletorIdioma";
import { PARES, preencher, type Lang } from "@/lib/idiomas";
import { linkEmail, linkWhatsApp } from "@/lib/contato";
import type { PortfolioMessages } from "@/messages/portfolio.pt";
import s from "@/app/(pt)/portfolio/portfolio.module.css";

/* ============================================================
   O CORPO DO /portfolio, nos dois idiomas

   Em 11/09/2026 o conteúdo de app/(pt)/portfolio/page.tsx veio para cá
   para a rota /en/portfolio renderizar a MESMA página com outro
   dicionário. As duas rotas só declaram metadata e chamam este
   componente. As notas de decisão de cada trecho ficaram onde estavam.
   ============================================================ */

/* As mesmas três vozes da /vitrine-digital, e é essa a razão de estarem
   aqui: o portfólio é a seção "Projetos no ar" daquela página em tamanho
   real, e chegar nele com outro alfabeto quebrava a continuidade justo
   no clique que a vitrine promete ("VER OS N PROJETOS NO PORTFÓLIO", com o
   N contado do mesmo dado desde 28/08, dos dois lados). */
const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

/* A capa pode não existir ainda (projeto novo antes da captura): a checagem
   roda no build, e o card sem arquivo mostra o nome da loja no lugar. */
const temCapa = (slug: string) => existsSync(path.join(process.cwd(), "public", "portfolio", `${slug}.webp`));

/* O placar da faixa, contado do dado e não escrito à mão: quantos dos
   projetos têm endereço público. Todos têm, hoje, e é essa a graça de
   contar em vez de digitar: no dia em que entrar um projeto sem `url`, a
   faixa passa a dizer "10 de 11 no ar" sozinha, que é a verdade. */
const noAr = projetos.filter(p => p.url).length;

export function PortfolioPage({ lang, t }: { lang: Lang; t: PortfolioMessages }) {
  const ptHref = "/portfolio";
  const enHref = PARES["/portfolio"];

  /* ---------- o inventário, contado do próprio dado ----------
     Uma linha só, em mono, dizendo o que são os projetos: "7× VITRINE DIGITAL ·
     1× E-COMMERCE · ...". A ordem é a de primeira aparição em
     data/portfolio.ts, que é curadoria. O rótulo do tipo vem do
     dicionário; a chave continua sendo o dado. */
  const inventario = projetos.reduce<[Projeto["tipo"], number][]>((acc, p) => {
    const linha = acc.find(([tipo]) => tipo === p.tipo);
    if (linha) linha[1]++; else acc.push([p.tipo, 1]);
    return acc;
  }, []);

  /* ---------- a manchete conta sozinha ----------
     Ela dizia "Nove projetos." escrito à mão; agora lê o número por
     extenso do dicionário, e o contato fala em "a próxima", que não conta
     nada e nunca desatualiza. Projeto novo em data/portfolio.ts não pede
     mais nenhuma edição de texto nesta página. */
  const quantos = t.numeros[projetos.length] ?? String(projetos.length);

  /* O único lugar da página que abre conversa: WhatsApp no pt, e-mail no
     en (não há WhatsApp na versão em inglês desta primeira fase). */
  const contatoHref = lang === "pt"
    ? linkWhatsApp(t.contato.mensagem)
    : linkEmail(t.contato.mensagem);
  const contatoDest = lang === "pt" ? "whatsapp" : "email";

  return <div className={`${s.site} ${display.variable} ${body.variable} ${mono.variable}`} lang={lang === "pt" ? "pt-BR" : "en"}>
    {/* O CTA do topo NÃO abre o WhatsApp, desce para o contato no fim.
        É a mesma correção que a vitrine fez em 13/08: o primeiro botão
        visível abrindo conversa vira porta de saída para quem ainda não
        viu nada, e aqui não há nada para conversar antes das capas. */}
    <header className={s.header}>
      <Link className={s.brand} href={t.header.logoHref}><b>RAFAEL RAZEIRA</b><span>{lang === "pt" ? "ESTÚDIO" : "STUDIO"}</span></Link>
      <span className={s.headStatus}><i aria-hidden /> {t.header.status}</span>
      <div className={s.headRight}>
        <SeletorIdioma atual={lang} ptHref={ptHref} enHref={enHref} />
        <a className={s.headCta} href="#contato" data-cta="portfolio_header" data-cta-dest="contato">{t.header.cta}</a>
      </div>
    </header>
    <main>
      {/* Hero curto de propósito: a prova desta página são as capas, e no
          celular elas precisam começar dentro da primeira tela. */}
      <section className={s.hero}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>{t.hero.eyebrow}</p>
          {/* A segunda linha mora dentro da faixa (ver `.faixa`, no CSS):
              ela sangra até a borda esquerda da tela e leva o placar na
              ponta. */}
          <h1>
            {quantos} {t.hero.projetos}<span className={s.ponto}>.</span>
            <span className={s.faixa}>
              <span className={s.faixaTxt}>{t.hero.faixa}<span className={s.ponto}>.</span></span>
              <span className={s.faixaLive}><i aria-hidden /> {preencher(t.hero.placar, { n: noAr, m: projetos.length })}</span>
            </span>
          </h1>
          <p className={s.lead}>{t.hero.lead}</p>
          <ul className={s.inventario}>
            {inventario.map(([tipo, n]) => <li key={tipo}><b>{n}×</b> {t.tipos[tipo]}</li>)}
          </ul>
        </div>
      </section>
      {/* ---------- a chamada dos clientes ----------
          A tira leva todos os nomes, na ordem do dado. `aria-hidden`
          porque os mesmos nomes estão logo abaixo, em h3, com endereço. */}
      <div className={s.tira} aria-hidden>
        <div className={s.tiraTrack}>
          {[...projetos, ...projetos].map((p, i) => <span key={i}>{p.nome}</span>)}
        </div>
      </div>
      {/* A sala grafite: onde as capas de páginas claras param de disputar
          fundo com o papel da página. */}
      <section className={`${s.section} ${s.dark}`} id="projetos">
        <div className={`${s.wrap} ${s.grade}`}>
          {projetos.map((p, i) => <ProjectCard key={p.slug} projeto={p} lang={lang} t={t} temCapa={temCapa(p.slug)} prioridade={i === 0} />)}
        </div>
      </section>
      {/* O único lugar da página que abre conversa, depois da prova inteira. */}
      <section className={s.contatoSec} id="contato">
        <div className={s.wrap}>
          <div className={s.contato}>
            <p className={s.eyebrow}>{t.contato.eyebrow}</p>
            <h2>{t.contato.titulo1}<br /><em>{t.contato.titulo2}<span className={s.ponto}>.</span></em></h2>
            <p className={s.lead}>{t.contato.lead}</p>
            <a className={`${s.button} ${s.acao}`} href={contatoHref} target={lang === "pt" ? "_blank" : undefined} rel={lang === "pt" ? "noopener" : undefined} data-cta="portfolio_final" data-cta-dest={contatoDest}>{t.contato.cta}</a>
          </div>
        </div>
      </section>
    </main>
    <footer className={s.footer}>
      <div className={s.brand}><b>RAFAEL RAZEIRA</b><span>{lang === "pt" ? "ESTÚDIO" : "STUDIO"}</span></div>
      <nav>{t.footer.links.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}</nav>
      <small>{t.footer.copyright}</small>
    </footer>
    {/* Barra fixa só no celular, e ela também desce para o contato. */}
    <a className={s.bar} href="#contato" data-cta="portfolio_bar" data-cta-dest="contato">
      <span className={s.barCopy}><b>{t.bar.titulo}</b><span>{t.bar.sub}</span></span>
      <span className={s.barCta}>{t.bar.cta}</span>
    </a>
  </div>;
}

type Projeto = (typeof projetos)[number];
