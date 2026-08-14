import Image from "next/image";
import type { Projeto } from "@/data/portfolio";
import s from "@/app/portfolio/portfolio.module.css";

/* ---------- o card inteiro é o link ----------
   Ele tinha um botão "Abrir o site ↗" embaixo, e dez botões cheios numa
   página só custavam duas coisas. A primeira é de mira: no celular o alvo
   virava um retângulo de 44px embaixo de uma captura de 200px que não
   fazia nada ao ser tocada, quando a captura é justamente o que a pessoa
   quer abrir. A segunda é de hierarquia: com dez botões de destaque, o
   único botão que a página precisa que seja apertado (o contato, lá no
   fim) era o décimo primeiro igual aos outros.

   Agora o alvo é o card todo e a página gastou o rosa uma vez só. O
   `aria-label` existe porque, sem ele, o nome acessível do link seria a
   emenda de tudo que está dentro.

   ---------- a janela de navegador ----------
   A captura mora dentro da janela clara do sistema, com semáforos, barra
   de endereço e o chip "NO AR" pulsando ao lado do domínio. É o mesmo
   objeto dos cards de prova da /vitrine-digital, e é ele que carrega o
   argumento desta página inteira: o endereço aparece no aparelho que abre
   endereços, e a pessoa pode conferir tocando.

   Projeto sem endereço público mantém a janela, mas com o campo dizendo
   que não há endereço e sem o chip "NO AR": ele não vira link, e a grade
   não quebra. Capa ausente vira o nome da loja sobre papel. */
export function ProjectCard({ projeto, temCapa, prioridade = false }: { projeto: Projeto; temCapa: boolean; prioridade?: boolean }) {
  const { nome, slug, tipo, ramo, destaque, url } = projeto;
  const dominio = url ? new URL(url).host : "";
  const classe = destaque ? `${s.card} ${s.destaque}` : s.card;

  const miolo = <>
    <div className={s.janela}>
      <div className={s.barra}>
        <span className={s.dots} aria-hidden><i /><i /><i /></span>
        <span className={s.urlChip}>{dominio || "sem endereço público"}</span>
        {url && <span className={s.live}><i aria-hidden /> NO AR</span>}
      </div>
      <div className={s.tela}>
        {temCapa
          ? <Image
              src={`/portfolio/${slug}.webp`} fill
              /* o card de destaque ocupa duas colunas, então ele pede o
                 dobro de pixels: sem isto o navegador baixaria a versão
                 de um terço de tela e a captura sairia borrada nele */
              sizes={destaque
                ? "(max-width: 700px) 100vw, (max-width: 1080px) 100vw, 66vw"
                : "(max-width: 700px) 100vw, (max-width: 1080px) 50vw, 33vw"}
              priority={prioridade}
              alt={`Primeira dobra do site da ${nome}`}
            />
          : <span className={s.placeholder}><b>{nome}</b><small>{tipo.toUpperCase()}</small></span>}
      </div>
    </div>
    <span className={s.kind}>{tipo.toUpperCase()}</span>
    <h3>{nome}</h3>
    <p className={s.ramo}>{ramo}</p>
  </>;

  if (!url) return <article className={classe}>{miolo}</article>;

  return <a
    className={classe} href={url} target="_blank" rel="noopener"
    aria-label={`Abrir o site da ${nome} em nova aba`}
    data-cta="portfolio_projeto" data-cta-dest={slug}
  >{miolo}</a>;
}
