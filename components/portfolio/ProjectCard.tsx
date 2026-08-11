import Image from "next/image";
import type { Projeto } from "@/data/portfolio";
import s from "@/app/portfolio/portfolio.module.css";

/* Card de projeto: a capa como foto impressa com borda branca, presa no
   papel por uma fita adesiva, com carimbo NO AR e o domínio real embaixo.
   Projeto sem endereço público sai sem botão e com carimbo ENTREGUE; capa
   ausente vira o nome da loja sobre papel listrado, e a grade nunca quebra. */
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
    <div className={s.print}>
      <span className={s.tape} aria-hidden />
      {url
        ? <a className={s.cover} href={url} target="_blank" rel="noopener" aria-label={`Abrir o site da ${nome} em nova aba`}>{capa}</a>
        : <div className={s.cover}>{capa}</div>}
    </div>
    <div className={s.cardMeta}>
      <span className={s.tag}>{tipo.toUpperCase()}</span>
      {url ? <span className={s.stamp}>NO AR</span> : <span className={s.done}>ENTREGUE</span>}
    </div>
    <h3>{nome}</h3>
    {dominio && <p className={s.dominio}>{dominio}</p>}
    {url
      ? <a className={s.button} href={url} target="_blank" rel="noopener" data-cta="portfolio_projeto" data-cta-dest={slug}>Abrir o site ↗</a>
      : <p className={s.micro}>Projeto entregue. O site ainda não tem endereço público.</p>}
  </article>;
}
