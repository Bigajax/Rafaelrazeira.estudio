"use client";

/* ============================================================
   As lojas no ar como fotos (07/11/2026, ideia do Rafael, no jeito do
   wolfstudio.cc). Medido lá no mesmo dia: logo depois do hero, UM cartão
   arredondado com um vídeo de fundo do Vimeo em loop (também no celular),
   uma montagem de mockups trocando no mesmo lugar. A troca é do tempo, não
   da rolagem (a primeira versão daqui empilhava as fotos ao rolar, e não
   era isso).

   Aqui a montagem é feita com as próprias fotos, não com vídeo: mais
   nítidas, mais leves, e o link acompanha a loja da vez. Como lá: corte
   seco a cada 0,6s. O movimento de câmera (deslizar e girar para o lado)
   saiu no mesmo dia, pedido do Rafael: "sem essa balançada". Foto parada. A segunda versão
   daqui (3,4s, zoom e mistura) foi recusada: "no wolf está mais rápido e é
   outro tipo de animação". Para quando o cartão sai da tela ou a aba fica
   oculta; com "reduzir movimento" fica a primeira foto, parada.

   As fotos saíram do gerador com a captura real anexada (1440x900@2x,
   tirada em 07/11 com o pixel e a medição das lojas barrados); os prompts
   e as capturas estão em ~/Desktop/mockups-lojas/. O texto das telas foi
   conferido: é o do site.

   Honestidade: são VITRINES do estúdio, com o pedido pelo WhatsApp. Nenhuma
   tem o checkout no ar, e o texto não diz que elas vendem pelo site.
   ============================================================ */

import { useEffect, useRef, useState } from "react";
import { LOJAS_LINKS, LOJAS_NOMES } from "@/components/vitrine/sections";
import f from "./lojas-fotos.module.css";

/* a ordem alterna cenário claro e escuro, para a troca se ver */
/* a M&M saiu em 07/11 (pedido do Rafael) */
const LOJAS = ["iconic", "arena", "japa", "sneakerspot", "fardo", "fulltime"];
/* medido no Wolf em 07/11: 8 capturas em 16,6s, cada uma num projeto diferente;
   cada plano fica pouco mais de um segundo, em corte seco */
const TEMPO = 600; /* 1,25s, depois 0,9s; "mais rápido" duas vezes (Rafael, 07/11) */
const dominio = (k: string) => (LOJAS_LINKS[k] ?? "").replace(/^https?:\/\/(www\.)?/, "");


export function LojasFotos() {
  const palco = useRef<HTMLDivElement>(null);
  const [vez, setVez] = useState(0);
  const [rodando, setRodando] = useState(false);

  /* só roda com o cartão na tela, a aba visível e sem "reduzir movimento" */
  useEffect(() => {
    const el = palco.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let naTela = false;
    const conferir = () => setRodando(naTela && document.visibilityState === "visible");
    const io = new IntersectionObserver(([e]) => { naTela = e.isIntersecting; conferir(); }, { threshold: .25 });
    io.observe(el);
    document.addEventListener("visibilitychange", conferir);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", conferir); };
  }, []);
  useEffect(() => {
    if (!rodando) return;
    const t = setTimeout(() => setVez(v => (v + 1) % LOJAS.length), TEMPO);
    return () => clearTimeout(t);
  }, [rodando, vez]);

  const k = LOJAS[vez];
  return <section className={f.lojas} id="projetos" aria-labelledby="lojas-titulo">
    <div className={f.cabeca}>
      <h2 id="lojas-titulo" className={f.titulo}>Veja o que já está <em>no ar.</em></h2>
      {/* o subtítulo saiu em 08/11 (pedido do Rafael); o link de cada foto segue com o nome e o domínio no aria-label */}
    </div>
    <div className={`${f.moldura} ${rodando ? f.rodando : ""}`} style={{ "--tempo": `${TEMPO}ms` } as React.CSSProperties}>
      <div ref={palco} className={f.palco}>
        <a href={LOJAS_LINKS[k]} target="_blank" rel="noopener" data-cta={`fotos_${k}`} data-cta-dest="loja"
           aria-label={`Abrir o site da ${LOJAS_NOMES[k]} (${dominio(k)})`}>
          {LOJAS.map((l, i) =>
            // eslint-disable-next-line @next/next/no-img-element
            <img key={l} className={i === vez ? f.ativa : undefined} aria-hidden={i !== vez}
                 src={`/assets/lojas-no-ar/${l}-1672.webp`} srcSet={`/assets/lojas-no-ar/${l}-900.webp 900w, /assets/lojas-no-ar/${l}-1672.webp 1672w`}
                 sizes="(max-width: 860px) 100vw, 92vw" width={1672} height={941}
                 alt={i === vez ? `O site da ${LOJAS_NOMES[l]} aberto num aparelho` : ""} loading={i === 0 ? "eager" : "lazy"} decoding="async" />)}
        </a>
      </div>
      {/* a fileira com os nomes das lojas saiu em 07/11 (pedido do Rafael) */}
    </div>
  </section>;
}
