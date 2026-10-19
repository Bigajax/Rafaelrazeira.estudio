import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { casos } from "@/data/casos";
import { projetos } from "@/data/portfolio";
import { Moldura } from "@/components/casos/Moldura";
import s from "@/app/(pt)/portfolio/portfolio.module.css";
import c from "@/app/(pt)/casos/casos.module.css";

/* O índice dos casos. O /portfolio mostra TODAS as vitrines, uma capa
   cada; aqui ficam só as que foram contadas por dentro, e cada linha
   leva a busca que aquele caso responde. */
export const metadata: Metadata = {
  title: { absolute: "Casos: vitrines digitais de lojas reais | Rafael Razeira Estúdio" },
  description: "Lojas reais contadas por dentro: como cada uma vendia antes, o que o estúdio construiu e como a vitrine ficou no ar, com pedido pelo WhatsApp.",
  alternates: { canonical: "/casos" },
};

export default function Page() {
  return <Moldura origem="casos" mensagem="Olá, Rafael! Vi os casos do estúdio e quero uma vitrine digital para a minha loja.">
    <section className={s.hero}>
      <div className={s.wrap}>
        <p className={s.eyebrow}>CASOS DO ESTÚDIO</p>
        <h1>Lojas reais<span className={s.ponto}>.</span>
          <span className={s.faixa}><span className={s.faixaTxt}>Contadas por dentro<span className={s.ponto}>.</span></span></span>
        </h1>
        <p className={s.lead}>Como cada loja vendia antes, o que foi construído e como ficou. Todas estão no ar: dá para abrir e conferir no seu celular.</p>
      </div>
    </section>
    <section className={`${s.section} ${s.dark}`}>
      <ol className={`${s.wrap} ${c.lista}`}>
        {casos.map((caso) => {
          const p = projetos.find((x) => x.slug === caso.slug);
          return <li key={caso.slug}>
            <Link href={`/casos/${caso.slug}`} className={c.linha}>
              <span className={c.linhaTexto}>
                <span className={s.kind}>{caso.nicho.toUpperCase()} · {caso.cidade.toUpperCase()}</span>
                <h2 className={c.listaNome}>{p?.nome ?? caso.slug}</h2>
                <p className={s.ramo}>{caso.resumo}</p>
                <span className={c.ler}>Ler o caso →</span>
              </span>
              {/* a capa do /portfolio, na mesma janela de navegador */}
              <span className={`${s.janela} ${c.linhaCapa}`} aria-hidden>
                <span className={s.barra}><span className={s.dots}><i /><i /><i /></span><span className={s.urlChip}>{p?.url ? new URL(p.url).host : ""}</span></span>
                <span className={`${s.tela} ${c.capaTela}`}><Image src={`/portfolio/${caso.slug}.webp`} fill sizes="(max-width: 900px) 100vw, 50vw" alt="" /></span>
              </span>
            </Link>
          </li>;
        })}
      </ol>
    </section>
  </Moldura>;
}
