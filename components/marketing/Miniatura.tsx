/* A prancha real reduzida. O calendário, o Hoje e o editor mostram o post
   COMO ele vai sair, e não um cartão com o título: é o feed antes do feed. */
import { TIPOS, tituloProvisorio, urlFundo, type Peca } from "@/lib/marketing/tipos";
import { SlidePost } from "./SlidePost";

export function Miniatura({
  peca,
  largura,
  indice = 0,
  fundo,
}: {
  peca: Pick<Peca, "tipo" | "slides" | "cta" | "gancho" | "briefing"> & { estilo?: Peca["estilo"] };
  largura: number;
  indice?: number;
  fundo: string | null;
}) {
  const { w, h } = TIPOS[peca.tipo];
  const k = largura / w;
  /* Peça sem título ainda (só a pauta): a capa mostra o gancho, que é o que
     vai virar título. É um rascunho que já tem cara de post. */
  const slides = peca.slides.length ? peca.slides : [{ manchete: "" }];
  let slide = slides[Math.min(indice, slides.length - 1)];
  if (indice === 0 && !slide.manchete && !slide.batida) {
    slide = { ...slide, ...tituloProvisorio(peca.gancho || peca.briefing.split(/[.!?]/)[0] || "Peça nova") };
  }

  return (
    <div style={{ width: largura, height: Math.round(h * k), overflow: "hidden", flex: "none" }} aria-hidden>
      <div style={{ transform: `scale(${k})`, transformOrigin: "0 0", width: w, height: h }}>
        <SlidePost
          slide={slide}
          i={indice}
          total={slides.length}
          tipo={peca.tipo}
          fundo={fundo}
          cta={peca.cta}
          estilo={peca.estilo}
          extras={(peca.estilo?.extras ?? []).map((x) => urlFundo(x.caminho ?? null))}
        />
      </div>
    </div>
  );
}
