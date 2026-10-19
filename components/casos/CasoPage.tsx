import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import type { Caso } from "@/data/casos";
import { casos } from "@/data/casos";
import type { Projeto } from "@/data/portfolio";
import { SITE } from "@/lib/idiomas";
import { Moldura } from "@/components/casos/Moldura";
import s from "@/app/(pt)/portfolio/portfolio.module.css";
import c from "@/app/(pt)/casos/casos.module.css";

/* ============================================================
   UM CASO, POR DENTRO (/casos/<slug>)

   A ordem da página é a ordem da pergunta de quem chega pela busca:
   1. que loja é essa, e é parecida com a minha? (hero e ficha)
   2. como ficou? (as duas telas, notebook e celular, na sala grafite)
   3. como era antes? (o ponto de partida)
   4. o que exatamente foi feito? (as decisões, numeradas)
   5. funcionou? (os números, que só aparecem quando existem)
   Depois, os outros casos e o contato.
   ============================================================ */

const existe = (rel: string) => existsSync(path.join(process.cwd(), "public", rel));

const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

export function CasoPage({ caso, projeto }: { caso: Caso; projeto: Projeto }) {
  const { nome, url, ramo, slug } = projeto;
  const dominio = url ? new URL(url).host.replace(/^www\./, "") : "";
  const capa = `/portfolio/${slug}.webp`;
  const celular = `/casos/${slug}-celular.webp`;
  const outros = casos.filter(o => o.slug !== slug);

  /* Os dados estruturados: um Article sobre a loja, e o caminho
     Início > Casos > loja, que o Google mostra no lugar da URL. */
  const pagina = `${SITE}/casos/${slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: caso.titulo,
      description: caso.descricao,
      datePublished: caso.noAr,
      dateModified: caso.conferido,
      inLanguage: "pt-BR",
      mainEntityOfPage: pagina,
      image: `${SITE}${capa}`,
      author: { "@type": "Organization", name: "Rafael Razeira Estúdio", url: SITE },
      publisher: { "@type": "Organization", name: "Rafael Razeira Estúdio", url: SITE },
      about: { "@type": "Store", name: nome, url, address: { "@type": "PostalAddress", addressLocality: caso.cidade.split(",")[0], addressCountry: "BR" } },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Estúdio", item: `${SITE}/estudio/` },
        { "@type": "ListItem", position: 2, name: "Casos", item: `${SITE}/casos` },
        { "@type": "ListItem", position: 3, name: nome, item: pagina },
      ],
    },
  ];

  return <Moldura origem="caso" mensagem={`Olá, Rafael! Vi o caso da ${nome} no site do estúdio e quero uma vitrine digital para a minha loja.`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

    <section className={s.hero}>
      <div className={s.wrap}>
        <nav className={c.trilha} aria-label="Você está em">
          <Link href="/casos">Casos</Link><span aria-hidden>/</span><span>{nome}</span>
        </nav>
        <p className={s.eyebrow}>CASO · {caso.nicho} · {caso.cidade}</p>
        {/* O nome da loja NÃO vai em caixa alta (mesma regra do card do
            /portfolio: são marcas com grafia própria). A faixa leva a
            busca que esta página responde. */}
        <h1>
          <span className={c.nome}>{nome}</span><span className={s.ponto}>.</span>
          <span className={s.faixa}>
            {/* sem o placar do /portfolio: a chamada já ocupa a linha
                inteira no notebook, e o placar caía para fora da faixa,
                cinza sobre papel. A data mora na ficha logo abaixo. */}
            <span className={s.faixaTxt}>{caso.chamada}<span className={s.ponto}>.</span></span>
          </span>
        </h1>
        <p className={s.lead}>{caso.resumo}</p>

        <dl className={c.ficha}>
          <div><dt>A loja</dt><dd>{ramo}</dd></div>
          <div><dt>Onde</dt><dd>{caso.cidade}</dd></div>
          <div><dt>Primeira prévia</dt><dd>{dataBR(caso.previa)}</dd></div>
          <div><dt>No ar</dt><dd>{dataBR(caso.noAr)}</dd></div>
          {url && <div className={c.largo}><dt>Endereço</dt><dd><a href={url} target="_blank" rel="noopener" data-cta="caso_dominio" data-cta-dest={slug}>{dominio} ↗</a></dd></div>}
        </dl>
      </div>
    </section>

    {/* A sala grafite, como no /portfolio: as capturas são de sites claros
        e sobre papel virariam mancha. O celular vem PRIMEIRO no celular,
        porque é nele que a cliente da loja abre a vitrine. */}
    <section className={`${s.section} ${s.dark}`} aria-label="Como ficou">
      <div className={`${s.wrap} ${c.telas}`}>
        <div className={`${s.janela} ${c.notebook}`}>
          <div className={s.barra}>
            <span className={s.dots} aria-hidden><i /><i /><i /></span>
            <span className={s.urlChip}>{dominio}</span>
            <span className={s.live}><i aria-hidden /> NO AR</span>
          </div>
          <div className={s.tela}>
            {existe(capa) && <Image src={capa} fill priority sizes="(max-width: 900px) 100vw, 66vw" alt={`A vitrine da ${nome} aberta no notebook`} />}
          </div>
        </div>
        {existe(celular) && <div className={c.aparelho}>
          <Image src={celular} width={780} height={1688} sizes="(max-width: 900px) 70vw, 300px" alt={`A vitrine da ${nome} aberta no celular`} />
        </div>}
        {url && <a className={c.abrir} href={url} target="_blank" rel="noopener" data-cta="caso_abrir" data-cta-dest={slug}>Abrir a vitrine da {nome} ↗</a>}
      </div>
    </section>

    <section className={s.section}>
      <div className={`${s.wrap} ${c.bloco}`}>
        <h2>Antes<span className={s.ponto}>.</span></h2>
        <div className={c.texto}>{caso.antes.map((p, i) => <p key={i}>{p}</p>)}</div>
      </div>
    </section>

    <section className={`${s.section} ${c.feitoSec}`}>
      <div className={`${s.wrap} ${c.bloco}`}>
        <h2>O que foi feito<span className={s.ponto}>.</span></h2>
        <ol className={c.feito}>
          {caso.feito.map((f, i) => <li key={f.titulo}>
            <span className={c.num} aria-hidden>{String(i + 1).padStart(2, "0")}</span>
            <h3>{f.titulo}</h3>
            <p>{f.texto}</p>
          </li>)}
        </ol>
      </div>
    </section>

    {caso.numeros.length > 0 && <section className={s.section}>
      <div className={`${s.wrap} ${c.bloco}`}>
        <h2>Os números<span className={s.ponto}>.</span></h2>
        <ul className={c.numeros}>
          {caso.numeros.map(n => <li key={n.rotulo}><b>{n.valor}</b><span>{n.rotulo}</span><small>{n.fonte}</small></li>)}
        </ul>
      </div>
    </section>}

    {outros.length > 0 && <section className={`${s.section} ${c.outrosSec}`}>
      <div className={s.wrap}>
        <p className={s.eyebrow}>OUTROS CASOS</p>
        <ul className={c.outros}>
          {outros.map(o => <li key={o.slug}><Link href={`/casos/${o.slug}`}>{o.titulo} →</Link></li>)}
        </ul>
      </div>
    </section>}

    <p className={c.conferido}>Texto conferido contra a loja no ar em {dataBR(caso.conferido)}. <Link href="/portfolio">Ver todas as vitrines do estúdio →</Link></p>
  </Moldura>;
}
