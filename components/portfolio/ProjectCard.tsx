import Image from "next/image";
import type { Projeto } from "@/data/portfolio";
import s from "@/app/portfolio/portfolio.module.css";

/* Card de projeto: a moldura de navegador da seção de projetos da landing,
   com o domínio real no chip e o selo NO AR. Projeto sem endereço público
   sai sem botão e com selo neutro; capa ausente vira o nome da loja sobre a
   moldura escura, e a grade nunca quebra. */
export function ProjectCard({ projeto, temCapa, prioridade = false }: { projeto: Projeto; temCapa: boolean; prioridade?: boolean }) {
  const { nome, slug, tipo, url } = projeto;
  const dominio = url ? new URL(url).host : "";

  const capa = temCapa
    ? <Image
        src={`/portfolio/${slug}.webp`} fill
        sizes="(max-width: 700px) 100vw, (max-width: 1080px) 50vw, 33vw"
        priority={prioridade}
        alt={`Primeira dobra do site da ${nome}`}
      />
    : <span className={s.placeholder}><b>{nome}</b><small>{tipo.toUpperCase()}</small></span>;

  return <article className={s.card}>
    <div className={s.screen}>
      <div className={s.browserBar}>
        <span className={s.dots} aria-hidden><i /><i /><i /></span>
        <span className={s.urlChip}>{dominio || "entregue ao cliente"}</span>
        {url ? <span className={s.live}>● NO AR</span> : <span className={s.done}>ENTREGUE</span>}
      </div>
      {url
        ? <a className={s.cover} href={url} target="_blank" rel="noopener" aria-label={`Abrir o site da ${nome} em nova aba`}>{capa}</a>
        : <div className={s.cover}>{capa}</div>}
    </div>
    <div className={s.cardMeta}>
      <span className={s.tag}>{tipo.toUpperCase()}</span>
    </div>
    <h3>{nome}</h3>
    {url
      ? <a className={s.button} href={url} target="_blank" rel="noopener" data-cta="portfolio_projeto" data-cta-dest={slug}>VER PROJETO ↗</a>
      : <p className={s.micro}>Projeto entregue. O site ainda não tem endereço público.</p>}
  </article>;
}
