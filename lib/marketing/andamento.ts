/* ============================================================
   O ANDAMENTO DE UMA PEÇA (30/09/2026)

   "Rascunhos dentro do marketing para eu ver o que está sendo produzido e o
   que não está." O calendário mostra QUANDO sai; esta conta mostra O QUE
   FALTA para sair. Função pura: a aba Produção lê, e o worker pode ler
   igual se um dia precisar.

   Cinco passos, na ordem em que uma peça fica pronta: o texto dos slides,
   as imagens, a legenda, a revisão da Vera e a data.
   ============================================================ */
import { papelDe, tipoDe, type Peca } from "./tipos";

export type Passo = { nome: string; feito: boolean; detalhe?: string };

export function andamento(p: Pick<Peca, "slides" | "fundo" | "estilo" | "legenda" | "veredito" | "posta_em" | "cta">) {
  const slides = p.slides ?? [];
  const extras = p.estilo?.extras ?? [];

  /* texto: todo slide com título. Slide vazio sobra do roteiro e sai no PNG
     como uma prancha em branco (o "três fotos" tinha um 6º assim). */
  const vazios = slides.map((s, i) => (s.manchete?.trim() || s.batida?.trim() ? 0 : i + 1)).filter(Boolean);
  const texto: Passo = !slides.length
    ? { nome: "Texto", feito: false, detalhe: "nenhum slide escrito" }
    : vazios.length
      ? { nome: "Texto", feito: false, detalhe: `slide ${vazios.join(", ")} vazio` }
      : { nome: "Texto", feito: true };

  /* imagens: só conta o slide que ESPERA uma. A capa espera o fundo; o slide
     que aponta para uma imagem da série espera o arquivo dela; a prova sem
     molde espera o print. Respiro de cor e "volta à abertura" não esperam. */
  let pedidas = 0;
  let prontas = 0;
  slides.forEach((s, i) => {
    const papel = papelDe(s, tipoDe(s, i, slides.length, Boolean(p.cta?.trim())));
    let tem: boolean | null = null;
    if (i === 0) tem = Boolean(p.fundo);
    else if ((s.imagem ?? 0) > 0) tem = Boolean(extras[(s.imagem ?? 1) - 1]?.caminho);
    else if (papel === "prova" && !s.layout) tem = Boolean(s.img);
    if (tem === null) return;
    pedidas += 1;
    if (tem) prontas += 1;
  });
  const imagens: Passo = {
    nome: "Imagens",
    feito: pedidas > 0 && prontas === pedidas,
    detalhe: pedidas ? `${prontas} de ${pedidas}` : "nenhuma pedida",
  };

  const legenda: Passo = { nome: "Legenda", feito: Boolean(p.legenda?.trim()) };

  const v = p.veredito?.status;
  const revisao: Passo =
    v === "APPROVE"
      ? { nome: "Revisão", feito: true, detalhe: "a Vera aprovou" }
      : v
        ? { nome: "Revisão", feito: false, detalhe: "a Vera pediu ajuste" }
        : { nome: "Revisão", feito: false, detalhe: "sem revisão" };

  const data: Passo = { nome: "Data", feito: Boolean(p.posta_em) };

  const passos = [texto, imagens, legenda, revisao, data];
  return { passos, feitos: passos.filter((x) => x.feito).length, total: passos.length };
}
