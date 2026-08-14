import type { Metadata } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { projetos } from "@/data/portfolio";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import s from "./portfolio.module.css";

/* As mesmas três vozes da /vitrine-digital, e é essa a razão de estarem
   aqui: o portfólio é a seção "Projetos no ar" daquela página em tamanho
   real, e chegar nele com outro alfabeto quebrava a continuidade justo
   no clique que a vitrine promete ("VER OS 9 PROJETOS NO PORTFÓLIO"). */
const display = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Portfólio",
  description: "Projetos entregues pelo estúdio: vitrines digitais, e-commerce e sites para negócios reais. Todos no ar, e todos abrem no seu celular.",
};

/* Página do link da bio: quase todo mundo chega do Instagram, pelo celular.
   Nada aqui precisa de JavaScript no cliente: são capas, links e o WhatsApp. */
const ZAP = "https://wa.me/5544999997219?text=" + encodeURIComponent("Olá, Rafael! Vi o portfólio do estúdio e quero uma vitrine digital para o meu negócio.");

/* A capa pode não existir ainda (projeto novo antes da captura): a checagem
   roda no build, e o card sem arquivo mostra o nome da loja no lugar. */
const temCapa = (slug: string) => existsSync(path.join(process.cwd(), "public", "portfolio", `${slug}.webp`));

/* ---------- o inventário, contado do próprio dado ----------
   Uma linha só, em mono, dizendo o que são os projetos: "7× VITRINE DIGITAL ·
   1× E-COMMERCE · ...". Ela existe porque um visitante frio do Instagram
   precisa saber o que o estúdio FAZ antes de olhar capa por capa, e essa
   informação já estava no dado, espalhada nas etiquetas dos cards.

   O "×" evita concordância de plural ("6 vitrines digitais", "1 site de
   evento") e faz a linha ler como lista de embalagem, que é o registro
   certo para um inventário. A ordem é a de primeira aparição em
   data/portfolio.ts, que é curadoria (ver a nota naquele arquivo). */
const inventario = projetos.reduce<[string, number][]>((acc, p) => {
  const linha = acc.find(([tipo]) => tipo === p.tipo);
  if (linha) linha[1]++; else acc.push([p.tipo, 1]);
  return acc;
}, []);

/* O placar da faixa, contado do dado e não escrito à mão: quantos dos
   projetos têm endereço público. Todos têm, hoje, e é essa a graça de
   contar em vez de digitar: no dia em que entrar um projeto sem `url`, a
   faixa passa a dizer "10 de 11 no ar" sozinha, que é a verdade. */
const noAr = projetos.filter(p => p.url).length;

/* ---------- a manchete conta sozinha ----------
   Ela dizia "Nove projetos." escrito à mão, e o contato dizia "A décima
   pode ser a sua.". Duas frases presas ao tamanho da lista: quando a
   vérít.lab entrou, as duas ficaram erradas no mesmo commit, e a segunda
   nem tinha conserto bonito ("a décima primeira pode ser a sua").

   Agora a manchete lê o número por extenso daqui, e o contato fala em
   "a próxima", que não conta nada e nunca desatualiza. Projeto novo em
   data/portfolio.ts não pede mais nenhuma edição de texto nesta página.

   A lista vai até vinte porque um portfólio de link da bio que passar
   disso vira outra coisa, e aí a manchete muda junto. */
const PORTES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove", "vinte"];
const quantos = PORTES[projetos.length] ?? String(projetos.length);

export default function PortfolioPage() {
  return <div className={`${s.site} ${display.variable} ${body.variable} ${mono.variable}`}>
    {/* O CTA do topo NÃO abre o WhatsApp, desce para o contato no fim.
        É a mesma correção que a vitrine fez em 13/08: o primeiro botão
        visível abrindo conversa vira porta de saída para quem ainda não
        viu nada, e aqui não há nada para conversar antes das capas.
        O WhatsApp abre num lugar só desta página, lá embaixo. */}
    <header className={s.header}>
      <Link className={s.brand} href="/estudio/"><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></Link>
      <span className={s.headStatus}><i aria-hidden /> RESPOSTA NO MESMO DIA</span>
      <a className={s.headCta} href="#contato" data-cta="portfolio_header" data-cta-dest="contato">QUERO A MINHA ↓</a>
    </header>
    <main>
      {/* Hero curto de propósito: a prova desta página são as capas, e no
          celular elas precisam começar dentro da primeira tela. Eyebrow,
          manchete, uma linha de instrução e o inventário, nada mais.
          O número da manchete vem de `quantos`, contado da lista. */}
      <section className={s.hero}>
        <div className={s.wrap}>
          <p className={s.eyebrow}>PORTFÓLIO DO ESTÚDIO</p>
          {/* A segunda linha mora dentro da faixa (ver `.faixa`, no CSS):
              ela sangra até a borda esquerda da tela e leva o placar na
              ponta. A faixa é a mesma tinta da sala lá embaixo, então o
              hero anuncia o bloco em que a página vai entrar. */}
          <h1>
            {quantos} projetos<span className={s.ponto}>.</span>
            <span className={s.faixa}>
              <span className={s.faixaTxt}>Todos abrem agora<span className={s.ponto}>.</span></span>
              <span className={s.faixaLive}><i aria-hidden /> {noAr} de {projetos.length} no ar</span>
            </span>
          </h1>
          <p className={s.lead}>Vitrines, e-commerce e sites feitos neste estúdio. Toque em qualquer capa: o site abre no seu celular, com produto e preço reais.</p>
          <ul className={s.inventario}>
            {inventario.map(([tipo, n]) => <li key={tipo}><b>{n}×</b> {tipo}</li>)}
          </ul>
        </div>
      </section>
      {/* ---------- a chamada dos clientes ----------
          A faixa rotativa da /vitrine-digital repete o handle do estúdio
          seis vezes, porque lá o que precisa fixar é o nome de quem
          assina. Aqui o nome de quem assina já está no cabeçalho, e o que
          esta página tem de próprio são os CLIENTES: a tira leva todos,
          na ordem do dado, e passa a ser a chamada deles em vez de um
          letreiro do estúdio.

          Ela mora na costura entre o papel e o grafite: é o degrau que
          leva do argumento para a prova, e é onde o rosa da casa entra
          nesta página sem disputar com nenhum botão.

          `aria-hidden` porque os mesmos nomes estão logo abaixo, em h3, com
          endereço e link: um leitor de tela ouvindo a lista duas vezes
          seguidas só perde tempo. */}
      <div className={s.tira} aria-hidden>
        <div className={s.tiraTrack}>
          {/* a lista sai DUPLICADA e a animação corre meia pista: é o que
              faz a volta ser contínua, sem o salto de quando o fim da
              fila encontra o começo */}
          {[...projetos, ...projetos].map((p, i) => <span key={i}>{p.nome}</span>)}
        </div>
      </div>
      {/* A sala grafite: é a mesma `.dark` que a vitrine usa toda vez que
          a seção é conferível, e é onde as capas de páginas claras
          param de disputar fundo com o papel da página. Entra sem
          manchete própria: a de cima ainda está valendo, e uma segunda
          aqui só adiaria as capas. */}
      <section className={`${s.section} ${s.dark}`} id="projetos">
        <div className={`${s.wrap} ${s.grade}`}>
          {projetos.map((p, i) => <ProjectCard key={p.slug} projeto={p} temCapa={temCapa(p.slug)} prioridade={i === 0} />)}
        </div>
      </section>
      {/* O único lugar da página que abre conversa, e ele vem depois da
          prova inteira. A manchete usa a contagem que a página acabou de
          estabelecer: os projetos no ar, e a próxima loja. */}
      <section className={s.contatoSec} id="contato">
        {/* o cartão mora DENTRO do wrap, não é o wrap: `.wrap` centraliza
            com `margin: auto`, e as duas classes no mesmo elemento tiravam
            o bloco do eixo esquerdo da página */}
        <div className={s.wrap}>
          <div className={s.contato}>
            <p className={s.eyebrow}>VITRINE DIGITAL · PROJETO COMPLETO</p>
            <h2>A próxima pode<br /><em>ser a sua<span className={s.ponto}>.</span></em></h2>
            <p className={s.lead}>Catálogo montado, WhatsApp integrado e a loja no ar em 7 dias úteis. Me chama que eu te mostro como fica a sua.</p>
            <a className={`${s.button} ${s.acao}`} href={ZAP} target="_blank" rel="noopener" data-cta="portfolio_final" data-cta-dest="whatsapp">FALAR COMIGO NO WHATSAPP ↗</a>
          </div>
        </div>
      </section>
    </main>
    <footer className={s.footer}>
      <div className={s.brand}><b>RAFAEL RAZEIRA</b><span>ESTÚDIO</span></div>
      <nav><Link href="/estudio/">INÍCIO</Link><Link href="/vitrine-digital/">VITRINE DIGITAL</Link><Link href="/servicos">SERVIÇOS</Link><Link href="/e-commerce">E-COMMERCE</Link></nav>
      <small>© 2026 RAFAEL RAZEIRA ESTÚDIO</small>
    </footer>
    {/* Barra fixa só no celular, e ela também desce para o contato em vez
        de abrir o WhatsApp: uma porta de saída só, no fim, depois das
        as capas. É o único rosa cheio da página junto com o botão de lá. */}
    <a className={s.bar} href="#contato" data-cta="portfolio_bar" data-cta-dest="contato">
      <span className={s.barCopy}><b>VITRINE DIGITAL</b><span>No ar em 7 dias úteis</span></span>
      <span className={s.barCta}>QUERO A MINHA ↓</span>
    </a>
  </div>;
}
