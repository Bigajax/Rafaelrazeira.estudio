"use client";

/* ============================================================
   O "quem faz" grande da /loja-online (07/11/2026, pedido do Rafael:
   "quero assim, igual esta parte do wolfstudio.cc, com as animações").
   A ideia emprestada é a mecânica, não o conteúdo: linhas de grade no
   fundo, o retrato grande no centro, o nome gigante POR CIMA andando mais
   devagar que a foto, o sobrenome em cinza entrando de lado, e a frase que
   escurece palavra por palavra enquanto se rola.

   Como anda: ver rolagem.ts (a fração de cada [data-p] na tela, em --p).

   Honesto: o número é o mesmo da página (CENTENA, das vitrines no ar), e
   nada fala de loja vendendo pelo site, porque ainda não há uma.
   ============================================================ */

import { CSSProperties, useEffect, useRef, useState } from "react";
import Image from "next/image";
import q from "./quem-faz.module.css";
import { useRolagem } from "./rolagem";
import { IconeInstagram } from "@/components/vitrine/sections";

const SetaDiagonal = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 18 18 6M9 6h9v9" /></svg>;

/* 07/11, a opção 1 do Rafael entre cinco: a anterior ("Designer de lojas para quem
   vende pelo Instagram...") tinha cinco linhas e soava descrição de perfil. "Vitrines",
   e não "lojas": as que estão no ar não têm o pagamento no site */
/* 07/11, terceira rodada ("não gostei de nada da copy, quero curto falando sobre
   web design"): o título amarra com a assinatura logo abaixo */
const FRASE_A = "Web design de loja,";
const FRASE_B = "assinado por mim.";

export function QuemFazGrande({ insta }: { cta?: string; insta: string }) {
  const ref = useRef<HTMLElement>(null);

  useRolagem(ref);

  const assina = useRef<HTMLDivElement>(null);
  const [escrita, setEscrita] = useState(false);
  useEffect(() => {
    const el = assina.current;
    if (!el || !("IntersectionObserver" in window)) { setEscrita(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setEscrita(true); io.disconnect(); } }, { threshold: .2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* 07/11, segunda rodada ("não gostei disso ainda"): sem caixa alta, cada frase
     na sua linha e a segunda em verde, como os outros títulos da página */
  const a1 = FRASE_A.split(" "), b1 = FRASE_B.split(" ");
  const palavras = [...a1, ...b1];

  return <section ref={ref} className={q.quem} aria-labelledby="quem-frase">
    <div className={q.palco} data-p="passa">
      <div className={q.foto}>
        <Image src="/assets/rafael-quemfaz-pb-2026-11-07.webp" width={640} height={960} sizes="(max-width: 720px) 80vw, 560px"
          alt="Retrato em preto e branco de Rafael Razeira, de óculos escuros e gola alta preta" />
      </div>
      <p className={q.nome} aria-hidden>RAFAEL</p>
      <p className={q.sobrenome} aria-hidden>RAZEIRA</p>
    </div>

    <h2 id="quem-frase" className={q.frase} data-p="entra" style={{ "--n": palavras.length } as CSSProperties}>
      <span className={q.linha}>{a1.map((p, i) => <span key={i} style={{ "--i": i } as CSSProperties}>{p} </span>)}</span>
      <em className={q.linha}>{b1.map((p, i) => <span key={i} style={{ "--i": a1.length + i } as CSSProperties}>{p} </span>)}</em>
    </h2>

    <div className={q.texto}>
      {/* o parágrafo saiu em 07/11 (pedido do Rafael): fica o título, a assinatura e o @ */}
      {/* a assinatura do Rafael (07/11): da foto da assinatura em caneta, limpa no
          gerador de imagem a partir dela e conferida pelo Rafael; o fundo
          transparente saiu daqui. Escreve-se uma vez, da esquerda para a direita
          em 1,4s, quando entra na tela (presa à rolagem, ela ficava pela metade
          se a pessoa parasse de rolar no meio). */}
      <div ref={assina} className={`${q.assinatura} ${escrita ? q.escrita : ""}`}>
        {/* 300px (o dobro do tamanho na tela), sem o otimizador e sem lazy: era a
            imagem de 720px passando pelo /_next/image na hora, e ela demorava a
            aparecer (07/11, "está demorando para abrir") */}
        <Image src="/assets/marca/assinatura-rafael-300.webp" width={300} height={252} unoptimized priority alt="Assinatura de Rafael Razeira" />
      </div>
      <div className={q.acoes}>
        {/* o botão rosa saiu (07/11): o flutuante já aparece logo abaixo, e eram dois
            botões iguais na mesma tela. Fica o @ do Instagram, para quem quer ver mais */}
        <a className={q.heroLink} href={`https://www.instagram.com/${insta.replace(/^@/, "")}/`} target="_blank" rel="noopener" data-cta="instagram_quem" data-cta-dest="instagram">
          <IconeInstagram id="insta-degrade-quem-grande" size={16} />{insta}<SetaDiagonal />
        </a>
      </div>
    </div>
  </section>;
}
