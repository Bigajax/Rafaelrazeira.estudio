/* Um slide do post na medida do Instagram. Duas coisas decidem o desenho:

     o PAPEL DA IMAGEM  o que a imagem faz aqui (abrir, aproximar, contrastar,
                        provar, responder, fechar); é ele que monta o slide
     a DIREÇÃO          Pôster ácido (círculo, selo torto, sombra dura) ou
                        Colagem editorial (arco, fita, polaroid, bola)

   O tipo do slide (texto, lista, número...) só decide o texto, e só manda
   no desenho quando o papel é "respiro de cor", que é o slide sem imagem.
   Ver post.module.css e o roteiro de 30/09 em lib/marketing/tipos.ts. */
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import {
  ESTILO_PADRAO,
  corDe,
  papelDe,
  tipoDe,
  urlFundo,
  LAYOUTS,
  type LayoutId,
  type Estilo,
  type Slide,
  type TipoPeca,
  type TipoSlide,
} from "@/lib/marketing/tipos";
import s from "./post.module.css";

export type PropsSlide = {
  slide: Slide;
  i: number;
  total: number;
  tipo: TipoPeca;
  /* A imagem 1 (o fundo). */
  fundo: string | null;
  /* As imagens da série além da primeira, já em URL. */
  extras?: (string | null)[];
  cta: string;
  estilo?: Estilo;
};

function escura(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}
function comAlfa(hex: string, a: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* A voz 2 (condensada, caixa alta) é quem manda na largura. O título
   encolhe para caber, e a palavra mais comprida nunca quebra no meio. */
function escala(v1: string, v2: string, largura = 1) {
  const L = v2.length;
  const maior = Math.max(1, ...v2.split(/\s+/).map((p) => p.length), ...v1.split(/\s+/).map((p) => p.length * 0.5));
  let k = 1;
  if (L > 11 * largura) k = Math.min(k, (21 * largura) / L);
  if (v1.length > 26 * largura) k = Math.min(k, (26 * largura) / v1.length);
  k = Math.min(k, (9.6 * largura) / maior);
  return Math.max(0.3, k);
}

function marcar(texto: string, destaque?: string): ReactNode {
  const d = destaque?.trim();
  if (!d) return texto;
  const i = texto.toLowerCase().indexOf(d.toLowerCase());
  if (i < 0) return texto;
  return (
    <>
      {texto.slice(0, i)}
      <em className={s.destaque}>{texto.slice(i, i + d.length)}</em>
      {texto.slice(i + d.length)}
    </>
  );
}

export function tipoDoSlide(p: PropsSlide): TipoSlide {
  return tipoDe(p.slide, p.i, p.total, Boolean(p.cta.trim()));
}

const BASE_RESPIRO: Record<TipoSlide, number> = {
  capa: 250,
  texto: 170,
  conceito: 250,
  comparacao: 150,
  lista: 150,
  tela: 150,
  numero: 150,
  citacao: 150,
  fecho: 200,
};

/* a sombra que segura o texto sobre imagem cheia: larga e suave, mais uma
   curta e firme; não cobre a imagem como a faixa */
const SOMBRA = "0 2px 4px rgba(0,0,0,.55), 0 6px 28px rgba(0,0,0,.6)";

export const SlidePost = forwardRef<HTMLDivElement, PropsSlide>(function SlidePost(p, ref) {
  const { slide, i, total, tipo: formato, fundo, cta } = p;
  const estilo = { ...ESTILO_PADRAO, ...(p.estilo ?? {}) };
  const direcao = estilo.direcao === "colagem" ? "colagem" : "acido";
  const acido = direcao === "acido";
  const corBase = corDe(direcao, slide, i, estilo);
  /* o título e o destaque podem ter cor própria; sem escolha, vêm da cor do slide */
  const cor = { ...corBase, fg: slide.corTexto ?? corBase.fg, acento: slide.corAcento ?? corBase.acento };
  const tipo = tipoDoSlide(p);
  const papel = papelDe(slide, tipo);
  const story = formato === "story";
  const duo = estilo.foto === "duotone";

  /* A série: a imagem 1 é o fundo (a do slide 1), as outras são as extras.
     CADA SLIDE TEM A SUA (decisão de 30/09: "cada slide tem que ser uma
     imagem, sem pegar referência; temos um molde e aí entram as imagens").
     Slide sem imagem própria NÃO herda a do slide 1: o molde mostra o espaço
     vazio esperando a dele. A única exceção é o papel "volta à abertura",
     que por definição é a capa voltando. */
  const serie = [fundo, ...(p.extras ?? [])];
  const indicePadrao = i === 0 || papel === "fecho" ? 0 : -1;
  const indice = slide.imagem ?? indicePadrao;
  const src = indice >= 0 ? (serie[indice] ?? null) : null;
  const foco = slide.foco ?? { x: 50, y: 35, z: papel === "zoom" ? 2 : 1 };
  const imgFoco = (u: string | null, extra?: CSSProperties) =>
    u ? (
      <img
        src={u}
        alt=""
        crossOrigin="anonymous"
        style={{
          objectPosition: `${foco.x}% ${foco.y}%`,
          transform: foco.z > 1 ? `scale(${foco.z})` : undefined,
          transformOrigin: `${foco.x}% ${foco.y}%`,
          ...extra,
        }}
      />
    ) : null;

  const v1 = slide.manchete || "";
  const v2 = slide.batida || "";
  const estreito = papel === "resposta" || (papel === "abertura" && (estilo.respiro ?? "base").startsWith("topo-"));
  const base =
    papel === "respiro"
      ? BASE_RESPIRO[tipo]
      : papel === "abertura"
        ? 215
        : papel === "zoom"
          ? (acido ? 190 : 165)
          : papel === "prova" || papel === "contraste"
            ? 130
            : papel === "fecho"
              ? 150
              : 160;
  /* na abertura dividida o título mora só na metade de cima: um tom menor */
  const dividida = papel === "abertura" && slide.leitura === "dividida";
  const livre = slide.texto;
  const largura = livre ? Math.max(0.3, livre.w / 86) : estreito ? 0.44 : 1;
  const t = Math.round(base * escala(v1, v2, largura) * (slide.escala ?? 1) * (story ? 1.05 : 1) * (dividida ? 0.86 : 1));

  const bola = cor.bg.toUpperCase() === "#1C3FFF" ? "#FF3B2F" : "#1C3FFF";
  const vars = {
    "--bg": cor.bg,
    "--fg": cor.fg,
    "--ac": cor.acento,
    "--selo": escura(cor.acento) ? "#FFFFFF" : "#111111",
    "--fio": comAlfa(cor.fg, 0.22),
    "--bola": bola,
    "--bolaFg": "#FFFFFF",
    "--t": `${t}px`,
  } as CSSProperties;

  const titulo =
    v1 || v2 ? (
      <h2 className={s.titulo}>
        {v1 ? <span className={s.voz1}>{marcar(v1, slide.destaque)}</span> : null}
        {v2 ? <span className={s.voz2}>{marcar(v2, slide.destaque)}</span> : null}
      </h2>
    ) : null;
  const apoio = slide.apoio ? <p className={s.corpo}>{slide.apoio}</p> : null;
  const rotulo = slide.rotulo ? <span className={s.rotulo}>{slide.rotulo}</span> : null;
  const acao = cta.trim() ? (
    acido ? (
      <div className={`${s.selo} ${s.acao}`}>{cta}</div>
    ) : (
      <div className={`${s.bola} ${s.acao}`}>{cta}</div>
    )
  ) : null;
  const vazio = <div className={s.fotoVazia} style={{ position: "absolute", inset: 0 }} />;

  /* A moldura da foto recortada: círculo no pôster, arco com fita na
     colagem. É o gesto que mais diferencia as duas direções. */
  const recorte = (u: string | null, lugar: CSSProperties) =>
    acido ? (
      <div className={`${s.foto} ${duo ? s.duo : ""}`} style={{ borderRadius: "50%", border: "12px solid var(--ac)", ...lugar }}>
        {u ? imgFoco(u) : vazio}
      </div>
    ) : (
      <>
        <div className={`${s.foto} ${duo ? s.duo : ""}`} style={{ borderRadius: `${Number(lugar.width) / 2}px ${Number(lugar.width) / 2}px 0 0`, ...lugar }}>
          {u ? imgFoco(u) : vazio}
        </div>
        <div className={s.fita} style={{ left: Number(lugar.left ?? 290) - 30, top: Number(lugar.top ?? 150) + 20, transform: "rotate(-24deg)" }} />
        <div className={s.fita} style={{ left: Number(lugar.left ?? 290) + Number(lugar.width) - 200, top: Number(lugar.top ?? 150), transform: "rotate(18deg)" }} />
      </>
    );
  const colada = (u: string | null, lugar: CSSProperties, giro: number) => (
    <div
      className={`${s.foto} ${duo ? s.duo : ""}`}
      style={{
        border: acido ? "6px solid #111" : "16px solid #fff",
        boxShadow: acido ? "16px 16px 0 #111" : "0 30px 50px rgba(0,0,0,.25)",
        transform: `rotate(${giro}deg)`,
        ...lugar,
      }}
    >
      {u ? imgFoco(u) : vazio}
    </div>
  );

  let miolo: ReactNode = null;

  switch (papel) {
    /* ---------- 1. a imagem inteira, o título no respiro ---------- */
    case "abertura": {
      const leitura = slide.leitura ?? "veu";
      const onde = leitura === "dividida" ? "topo" : estilo.respiro ?? "base";
      const lugar: CSSProperties =
        onde === "topo-esquerda"
          ? { left: 72, top: story ? 300 : 170, width: 420 }
          : onde === "topo-direita"
            ? { right: 72, top: story ? 300 : 170, width: 420, textAlign: "right" }
            : onde === "topo"
              ? { left: 72, right: 72, top: story ? 300 : 170, textAlign: "center" }
              : { left: 60, right: 60, bottom: story ? 330 : 140, textAlign: "center" };
      /* dividida: a imagem só na parte de baixo, o título na cor sólida */
      const areaImagem: CSSProperties =
        leitura === "dividida" ? { left: 0, right: 0, bottom: 0, height: story ? "56%" : "50%" } : { inset: 0 };
      const sobreImagem = Boolean(src) && leitura === "veu";
      miolo = (
        <>
          {/* sem imagem ainda, só as listras sobre a cor do slide: a moldura
              pintada de acento engolia o título (prova de 30/09) */}
          {src ? (
            <div className={`${s.foto} ${duo ? s.duo : ""}`} style={areaImagem}>
              {imgFoco(src)}
            </div>
          ) : (
            vazio
          )}
          {sobreImagem ? <div className={onde === "base" ? s.veuBase : s.veuTopo} /> : null}
          <div
            className={`${s.aberturaTitulo} ${leitura === "faixa" && src ? (acido ? s.faixaAcido : s.faixaColagem) : ""}`}
            style={{
              position: "absolute",
              zIndex: 3,
              ...lugar,
              color: sobreImagem || (src && leitura === "sombra") ? (slide.corTexto ?? "#FFFFFF") : undefined,
              textShadow: leitura === "sombra" ? SOMBRA : undefined,
            }}
          >
            {rotulo}
            {titulo}
            {slide.apoio ? (
              <p
                className={`${s.corpo} ${s.subAbertura} ${src && leitura === "livre" ? s.apoioCartao : ""}`}
                style={{
                  ...(src && leitura === "livre" ? { background: cor.fg, color: escura(cor.fg) ? "#FFFFFF" : "#111111" } : {}),
                  marginLeft: lugar.textAlign === "center" || lugar.textAlign === "right" ? "auto" : undefined,
                  marginRight: lugar.textAlign === "center" ? "auto" : undefined,
                }}
              >
                {slide.apoio}
              </p>
            ) : null}
          </div>
        </>
      );
      break;
    }

    /* ---------- 2. a mesma imagem, aproximada num detalhe ---------- */
    case "zoom":
      miolo = acido ? (
        <>
          {recorte(src, { width: 760, height: 760, right: -140, top: story ? 260 : 120 })}
          <div className={s.blocoBase}>
            {rotulo}
            {titulo}
            {apoio}
          </div>
        </>
      ) : (
        <>
          {recorte(src, { width: 460, height: 470, left: 310, top: story ? 300 : 140 })}
          {/* o texto começa ABAIXO do arco e desce: ancorado no pé, ele crescia
              para dentro da foto (slide 2 do Dots, 30/09) */}
          <div className={s.blocoBase} style={{ textAlign: "center", left: 60, right: 60, top: story ? 820 : 650, bottom: "auto" }}>
            {rotulo}
            {titulo}
            {apoio}
          </div>
        </>
      );
      break;

    /* ---------- 4. a mesma imagem apagada × viva (ou duas imagens) ---------- */
    case "contraste": {
      const esq = urlFundo(slide.img ?? null) ?? src;
      const dir = urlFundo(slide.img2 ?? null) ?? src;
      const apagada = { filter: "grayscale(1) brightness(.72) contrast(.85)" };
      miolo = (
        <>
          <div className={s.cabeca}>
            {rotulo}
            {titulo}
          </div>
          <div
            className={s.foto}
            style={{
              left: 72, top: 560, width: 440, height: 560, transform: "rotate(-4deg)",
              border: acido ? "5px solid #111" : "16px solid #fff",
              boxShadow: acido ? "none" : "0 26px 44px rgba(0,0,0,.25)",
              background: "#E9E9E9",
            }}
          >
            {esq ? imgFoco(esq, apagada) : <div className={s.ladoTexto}>{slide.ruim}</div>}
          </div>
          <div
            className={s.foto}
            style={{
              right: 72, top: 600, width: 440, height: 560, transform: "rotate(3deg)",
              border: acido ? "5px solid var(--ac)" : "16px solid #fff",
              boxShadow: acido ? "16px 16px 0 var(--ac)" : "0 26px 44px rgba(0,0,0,.25)",
              background: "#fff",
            }}
          >
            {dir ? imgFoco(dir) : <div className={s.ladoTexto}>{slide.bom}</div>}
          </div>
          {acido ? (
            <>
              <div className={s.selo} style={{ left: 70, top: 1150, fontSize: 26, padding: "12px 20px", transform: "rotate(-4deg)", background: "#fff", color: "#111" }}>
                ✕ {slide.ruim && (esq || dir) ? slide.ruim : "Assim não"}
              </div>
              <div className={s.selo} style={{ right: 70, top: 1180, fontSize: 26, padding: "12px 20px", transform: "rotate(3deg)" }}>
                ✓ {slide.bom && (esq || dir) ? slide.bom : "Assim sim"}
              </div>
            </>
          ) : (
            <>
              <span className={`${s.legenda} ${s.um}`}>{slide.ruim && (esq || dir) ? slide.ruim : "assim não"}</span>
              <span className={`${s.legenda} ${s.dois}`}>{slide.bom && (esq || dir) ? slide.bom : "assim sim"}</span>
            </>
          )}
        </>
      );
      break;
    }

    /* ---------- 5. a prova: o print real num navegador ---------- */
    case "prova": {
      const print = urlFundo(slide.img ?? null);
      miolo = (
        <>
          <div className={s.cabeca}>
            {rotulo}
            {titulo}
          </div>
          <div className={s.janela}>
            <div className={s.barra} aria-hidden>
              <i />
              <i />
              <i />
            </div>
            <div className={s.tela}>
              {print ? <img src={print} alt="" crossOrigin="anonymous" /> : src ? imgFoco(src) : "Suba o print da página"}
            </div>
          </div>
          {slide.apoio ? <p className={`${s.corpo} ${s.telaApoio}`}>{slide.apoio}</p> : null}
        </>
      );
      break;
    }

    /* ---------- 5b. outra imagem da série, que responde à capa ---------- */
    case "resposta":
      miolo = (
        <>
          {colada(src, { left: 60, top: story ? 300 : 170, width: 540, height: 680 }, -4)}
          <div style={{ position: "absolute", left: 640, right: 60, top: story ? 380 : 250 }}>
            {rotulo}
            {titulo}
          </div>
          {slide.apoio ? (
            <p className={s.corpo} style={{ position: "absolute", left: 72, right: 72, bottom: story ? 300 : 150 }}>
              {slide.apoio}
            </p>
          ) : null}
        </>
      );
      break;

    /* ---------- 6. a capa volta menor, como foto colada ---------- */
    case "fecho":
      miolo = (
        <>
          {colada(src, { left: 330, top: story ? 300 : 140, width: 420, height: 500 }, 4)}
          <div style={{ position: "absolute", left: 60, right: 60, bottom: story ? 420 : 250, textAlign: "center" }}>
            {rotulo}
            {titulo}
            {apoio}
          </div>
          {acido && cta.trim() ? <div className={`${s.selo} ${s.acaoCentro}`}>{cta}</div> : null}
          {!acido ? acao : null}
        </>
      );
      break;

    /* ---------- 6b. o seu retrato fecha a história ---------- */
    case "voce":
      miolo = (
        <>
          {recorte(src, acido ? { width: 560, height: 560, left: 260, top: story ? 280 : 140 } : { width: 460, height: 500, left: 310, top: story ? 300 : 150 })}
          <div style={{ position: "absolute", left: 60, right: 60, bottom: story ? 420 : 250, textAlign: "center" }}>
            {rotulo}
            {titulo}
          </div>
          {cta.trim() && cta.length <= 34 ? (
            <div className={`${s.bola}`} style={{ right: 70, top: story ? 620 : 470, width: 220, height: 220, transform: "rotate(12deg)", zIndex: 4 }}>
              {cta}
            </div>
          ) : cta.trim() ? (
            <div className={s.acaoFaixa}>{cta}</div>
          ) : null}
        </>
      );
      break;

    /* ---------- 3. respiro de cor: sem imagem, o tipo manda ---------- */
    default:
      miolo = respiro();
  }

  function respiro(): ReactNode {
    switch (tipo) {
      case "lista":
        return (
          <>
            <div className={s.cabeca}>
              {rotulo}
              {titulo}
            </div>
            <ol className={s.lista}>
              {(slide.itens ?? []).filter(Boolean).slice(0, 6).map((it, k) => (
                <li key={k}>
                  <i>{acido ? String(k + 1).padStart(2, "0") : k + 1}</i>
                  {it}
                </li>
              ))}
            </ol>
          </>
        );
      case "numero":
        return (
          <>
            <div className={s.numeroGrande}>{slide.numero || "00"}</div>
            <div className={s.bloco} style={{ top: 640 }}>
              {titulo}
              {acido ? apoio : null}
            </div>
            {!acido && slide.apoio ? (
              <div className={s.rodape}>
                <p className={s.corpo}>{slide.apoio}</p>
              </div>
            ) : null}
          </>
        );
      case "citacao":
        return acido ? (
          <>
            <div className={s.aspas} aria-hidden>
              “
            </div>
            <div className={s.tese}>{titulo}</div>
            {slide.apoio ? (
              <div className={s.selo} style={{ bottom: 200, right: 80 }}>
                {slide.apoio}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className={s.fita} style={{ left: 425, top: 250, transform: "rotate(-4deg)" }} />
            <div className={s.tese}>
              {titulo}
              {slide.apoio ? <span className={s.rotulo}>{slide.apoio}</span> : null}
            </div>
          </>
        );
      case "fecho":
        return (
          <>
            <div className={s.fecho}>
              {rotulo}
              {titulo}
              {apoio}
            </div>
            {acao}
          </>
        );
      default:
        /* texto, conceito, capa sem imagem */
        return acido ? (
          <>
            {tipo === "texto" ? <div className={s.indice}>{String(i).padStart(2, "0")}</div> : null}
            {tipo !== "texto" && slide.rotulo ? (
              <div className={s.selo} style={{ top: 200, left: 70 }}>
                {slide.rotulo}
              </div>
            ) : null}
            <div className={s.bloco} style={tipo !== "texto" ? { top: 420 } : undefined}>
              {tipo === "texto" ? rotulo : null}
              {titulo}
              {apoio}
            </div>
          </>
        ) : (
          <>
            <div className={s.bloco}>
              {rotulo}
              {titulo}
            </div>
            {slide.apoio ? (
              <div className={s.rodape}>
                <p className={s.corpo}>{slide.apoio}</p>
              </div>
            ) : null}
          </>
        );
    }
  }

  /* ============================================================
     OS MOLDES CADASTRADOS (galeria do editor, 30/09)
     Cada molde decide onde a imagem e o texto moram. Nos que separam os dois
     o texto nunca encosta na imagem; nos que sobrepõem, a leitura é garantida
     pelo véu ou pela faixa.
     ============================================================ */
  function moldeCadastrado(id: LayoutId): ReactNode {
    const topoTexto = story ? 300 : 160;
    const pe = story ? 330 : 130;
    /* o corpo do título acompanha a largura que o molde dá ao texto */
    /* nas colunas estreitas, o teto vem da palavra mais longa contra a largura
       real da coluna: a Archivo condensada gasta ~0,5em por maiúscula */
    const maiorPalavra = Math.max(1, ...v2.split(/\s+/).map((p) => p.length));
    const tam = (base: number, fracao: number, colunaPx?: number) => {
      let t = base * escala(v1, v2, fracao) * (story ? 1.05 : 1);
      if (colunaPx) t = Math.min(t, colunaPx / (maiorPalavra * 0.5));
      return `${Math.round(t * (slide.escala ?? 1))}px`;
    };
    /* texto sobre imagem inteira: letra clara e sombra, sempre */
    const claro = !!src && (id === "pe" || id === "topo");
    const texto = (lugar: CSSProperties, base: number, fracao: number, colunaPx?: number) => (
      <div
        key="t"
        className={`${s.textoMolde} ${claro ? s.textoClaro : ""}`}
        style={{
          position: "absolute",
          zIndex: 4,
          ...lugar,
          ["--t" as string]: tam(base, fracao, colunaPx),
          color: claro ? (slide.corTexto ?? "#FFFFFF") : undefined,
          textShadow: claro || slide.leitura === "sombra" ? SOMBRA : undefined,
        }}
      >
        {rotulo}
        {titulo}
        {slide.apoio ? <p className={s.corpo}>{slide.apoio}</p> : null}
      </div>
    );
    const img = (lugar: CSSProperties, extra: CSSProperties = {}, dentro: ReactNode = null) => (
      <div className={`${s.foto} ${duo ? s.duo : ""}`} style={{ ...lugar, ...extra }}>
        {src ? imgFoco(src) : vazio}
        {dentro}
      </div>
    );
    /* coluna: a imagem é flexível e cede ao texto, que nunca passa do pé */
    const coluna = (estilo: CSSProperties, filhos: ReactNode) => (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", zIndex: 3, ...estilo }}>{filhos}</div>
    );
    const flexivel: CSSProperties = { position: "relative", flex: "1 1 0", minHeight: "32%" };
    const noFluxo: CSSProperties = { position: "relative", flex: "0 0 auto" };
    const borda: CSSProperties = acido
      ? { border: "6px solid #111", boxShadow: "16px 16px 0 #111" }
      : { border: "16px solid #fff", boxShadow: "0 30px 50px rgba(0,0,0,.25)" };

    switch (id) {
      case "texto-cima":
        return coluna({}, [
          texto({ ...noFluxo, padding: `${topoTexto}px 72px 56px` }, 170, 1),
          <div key="i" style={flexivel}>{img({ inset: 0 })}</div>,
        ]);
      case "imagem-cima":
        return coluna({}, [
          <div key="i" style={flexivel}>{img({ inset: 0 })}</div>,
          texto({ ...noFluxo, padding: `56px 72px ${pe}px` }, 160, 1),
        ]);
      case "img-esquerda":
        return (
          <>
            {img({ left: 0, top: 0, bottom: 0, width: "46%" })}
            {texto({ left: "51%", right: 56, top: "50%", transform: "translateY(-50%)" }, 185, 0.8, 465)}
          </>
        );
      case "img-direita":
        return (
          <>
            {img({ right: 0, top: 0, bottom: 0, width: "46%" })}
            {texto({ left: 60, right: "51%", top: "50%", transform: "translateY(-50%)" }, 185, 0.8, 465)}
          </>
        );
      case "janela":
        return coluna({ padding: `${topoTexto - 10}px 72px ${pe}px` }, [
          <div key="i" style={flexivel}>{img({ inset: 0 }, borda)}</div>,
          texto({ ...noFluxo, marginTop: 64 }, 150, 1),
        ]);
      case "moldura":
        return coluna({ padding: `65px 65px ${pe}px` }, [
          <div key="i" style={flexivel}>{img({ inset: 0 })}</div>,
          texto({ ...noFluxo, margin: "56px 7px 0" }, 150, 1),
        ]);
      case "pe":
        return (
          <>
            {img({ inset: 0 })}
            {src ? <div className={s.veuBase} /> : null}
            {texto({ left: 60, right: 60, bottom: pe, textAlign: "center" }, 200, 1)}
          </>
        );
      case "topo":
        return (
          <>
            {img({ inset: 0 })}
            {src ? <div className={s.veuTopo} /> : null}
            {texto({ left: 60, right: 60, top: topoTexto, textAlign: "center" }, 200, 1)}
          </>
        );
      case "faixa":
        return (
          <>
            {img({ inset: 0 })}
            <div className={s.faixaInteira}>{texto({ position: "relative" }, 150, 1)}</div>
          </>
        );
      /* círculo e arco: a forma encolhe (mantendo a proporção) quando o texto pede lugar */
      case "circulo":
        return coluna({ padding: `${topoTexto - 30}px 60px ${pe}px`, alignItems: "center", textAlign: "center" }, [
          <div key="i" style={{ position: "relative", flex: "0 1 640px", minHeight: 260, aspectRatio: "1", maxWidth: "100%" }}>
            {img({ inset: 0 }, { borderRadius: "50%", border: "12px solid var(--ac)" })}
          </div>,
          texto({ ...noFluxo, marginTop: 50, alignSelf: "stretch" }, 150, 1),
        ]);
      case "arco":
        return coluna({ padding: `${topoTexto - 20}px 60px ${pe}px`, alignItems: "center", textAlign: "center" }, [
          <div key="i" style={{ position: "relative", flex: "0 1 560px", minHeight: 280, aspectRatio: "500 / 560" }}>
            {img({ inset: 0 }, { borderRadius: "999px 999px 0 0" })}
            <div className={s.fita} style={{ left: "-8%", top: "4%", transform: "rotate(-24deg)" }} />
            <div className={s.fita} style={{ right: "-8%", top: 0, transform: "rotate(18deg)" }} />
          </div>,
          texto({ ...noFluxo, marginTop: 50, alignSelf: "stretch" }, 150, 1),
        ]);
      case "polaroid":
        return (
          <>
            {img({ left: 64, top: topoTexto, width: 470, height: 600 }, { ...borda, transform: "rotate(-4deg)" })}
            {texto({ left: 590, right: 56, top: topoTexto + 20 }, 180, 0.8, 430)}
          </>
        );
      case "selo":
        return (
          <>
            {texto({ left: 72, right: 72, top: topoTexto }, 200, 1)}
            {img(
              { right: 60, bottom: pe - 10, width: 340, height: 340 },
              { borderRadius: "50%", border: "10px solid var(--ac)", transform: "rotate(6deg)" },
            )}
          </>
        );
      case "so-texto":
      default:
        return texto({ left: 72, right: 72, top: "50%", transform: "translateY(-50%)" }, 190, 1);
    }
  }
  if (slide.layout && slide.layout in LAYOUTS) miolo = moldeCadastrado(slide.layout);

  /* texto livre: o molde fica (imagem, moldura, fita), o texto dele some e
     entra este bloco, onde o Rafael arrastou */
  const protecao = slide.leitura && slide.leitura !== "veu" && slide.leitura !== "dividida" ? slide.leitura : papel === "abertura" ? "sombra" : "livre";
  const blocoLivre = livre ? (
    <div
      className={`${s.textoLivre} ${protecao === "faixa" ? (acido ? s.faixaAcido : s.faixaColagem) : ""}`}
      style={{
        left: `${livre.x}%`,
        top: `${livre.y}%`,
        width: `${livre.w}%`,
        textAlign: livre.alinhar === "direita" ? "right" : livre.alinhar === "centro" ? "center" : "left",
        textShadow: protecao === "sombra" ? SOMBRA : undefined,
        /* sobre imagem, com sombra, o texto nasce branco; a cor escolhida manda */
        color: protecao === "sombra" ? (slide.corTexto ?? "#FFFFFF") : undefined,
      }}
    >
      {rotulo}
      {titulo}
      {slide.apoio ? <p className={s.corpo}>{slide.apoio}</p> : null}
    </div>
  ) : null;

  return (
    <div ref={ref} className={`${s.prancha} ${s[direcao]} ${story ? s.story : ""}`} style={vars}>
      {livre ? <div className={s.semTexto}>{miolo}</div> : miolo}
      {blocoLivre}
      <img className={`${s.rr} ${escura(cor.bg) ? s.rrClaro : s.rrEscuro}`} src="/marketing/rr.png" alt="" />
      {total > 1 ? <span className={s.cont}>{String(i + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</span> : null}
      <span className={`${s.arroba} ${src ? s.arrobaSobre : ""}`}>@rafaelrazeira.estudio</span>
    </div>
  );
});
