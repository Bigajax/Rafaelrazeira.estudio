/* ============================================================
   A LEITURA DO FEED (01/10/2026)

   O que deu certo e o que não deu, a partir dos números anotados em cada
   post (ver MEDIDAS em tipos.ts). Funções puras, sem servidor nem
   navegador, de propósito: a aba Resultados e o worker (a Paula lê isto
   antes de propor pautas) fazem a MESMA conta. Se as duas discordassem, a
   tela diria uma coisa e a Paula seguiria outra.

   A régua é o encaminhamento por mil contas alcançadas: o post que só
   apareceu mais não ganha do post que foi mais mandado adiante.
   ============================================================ */
import {
  CATEGORIAS,
  DIAS_PARA_MEDIR,
  DIRECOES,
  PILARES,
  TIPOGRAFIAS,
  TIPOS,
  medida,
  porMil,
  type Peca,
} from "./tipos";

/* Abaixo disso, a média de um grupo é anedota. A tela mostra, mas avisa. */
export const POUCOS = 3;

export type Grupo = { chave: string; nome: string; n: number; enc: number | null; salv: number | null };
export type Eixo = { id: string; nome: string; grupos: Grupo[] };

function media(xs: (number | null)[]) {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function encaminhamento(p: Pick<Peca, "metricas">) {
  return porMil(p.metricas, "encaminhamentos");
}

export function leitura(postadas: Peca[], hoje: string) {
  const medidos = postadas.filter(medida);
  const limite = new Date(`${hoje}T12:00:00`);
  limite.setDate(limite.getDate() - DIAS_PARA_MEDIR);
  const corte = limite.toISOString().slice(0, 10);
  /* postado há 7 dias ou mais, e sem número: é a lista do que anotar */
  const faltam = postadas.filter((p) => !medida(p) && p.posta_em && p.posta_em <= corte);

  const ranking = [...medidos].sort((a, b) => (encaminhamento(b) ?? -1) - (encaminhamento(a) ?? -1));
  const metade = Math.min(3, Math.floor(ranking.length / 2));
  const certos = ranking.slice(0, metade);
  const errados = metade ? ranking.slice(-metade).reverse() : [];

  const eixo = (id: string, nome: string, chave: (p: Peca) => string | null, rotulo: (k: string) => string): Eixo => {
    const mapa = new Map<string, Peca[]>();
    for (const p of medidos) {
      const k = chave(p);
      if (!k) continue;
      mapa.set(k, [...(mapa.get(k) ?? []), p]);
    }
    const grupos = [...mapa.entries()]
      .map(([k, ps]) => ({
        chave: k,
        nome: rotulo(k),
        n: ps.length,
        enc: media(ps.map(encaminhamento)),
        salv: media(ps.map((p) => porMil(p.metricas, "salvamentos"))),
      }))
      .sort((a, b) => (b.enc ?? -1) - (a.enc ?? -1));
    return { id, nome, grupos };
  };

  const eixos: Eixo[] = [
    eixo("categoria", "Categoria", (p) => (p.categoria && p.categoria in CATEGORIAS ? p.categoria : null), (k) => CATEGORIAS[k as keyof typeof CATEGORIAS].nome),
    eixo("pilar", "Pilar", (p) => p.pilar, (k) => PILARES[k as keyof typeof PILARES].nome),
    eixo("formato", "Formato", (p) => p.tipo, (k) => TIPOS[k as keyof typeof TIPOS].nome),
    eixo("direcao", "Direção visual", (p) => p.estilo?.direcao ?? "acido", (k) => DIRECOES[k as keyof typeof DIRECOES]?.nome ?? k),
    eixo("tipografia", "Tipografia", (p) => p.estilo?.tipografia ?? "casa", (k) => TIPOGRAFIAS[k as keyof typeof TIPOGRAFIAS]?.nome ?? k),
  ];

  return { medidos, faltam, ranking, certos, errados, eixos };
}

/* O resumo que vai no prompt da Paula: curto, em frases, só com o que tem
   número. Vazio quando há menos de POUCOS posts medidos: com dois posts, a
   "lição" seria sorte, e a Paula passaria a perseguir a sorte. */
export function resumoParaPaula(postadas: Peca[], hoje: string) {
  const { medidos, certos, errados, eixos } = leitura(postadas, hoje);
  if (medidos.length < POUCOS) return "";
  const num = (x: number | null) => (x == null ? "?" : x.toFixed(1).replace(".", ","));
  const linha = (p: Peca) => {
    const quem = [p.categoria && p.categoria in CATEGORIAS ? CATEGORIAS[p.categoria].nome : null, p.pilar ? PILARES[p.pilar].nome : null]
      .filter(Boolean)
      .join(", ");
    return `- "${p.gancho}" (${quem || "sem categoria"}): ${num(encaminhamento(p))} encaminhamentos por mil alcançados, ${p.metricas?.salvamentos ?? "?"} salvamentos`;
  };
  const partes = [
    `Posts medidos até agora: ${medidos.length}. A régua é o encaminhamento por mil contas alcançadas.`,
    `O que deu certo:\n${certos.map(linha).join("\n")}`,
    `O que não deu:\n${errados.map(linha).join("\n")}`,
  ];
  for (const e of eixos.filter((x) => x.id === "categoria" || x.id === "pilar")) {
    const fortes = e.grupos.filter((g) => g.n >= 2);
    if (fortes.length >= 2) {
      partes.push(`${e.nome}, do melhor para o pior (com 2 ou mais posts): ${fortes.map((g) => `${g.nome} ${num(g.enc)} (${g.n} posts)`).join("; ")}`);
    }
  }
  return partes.join("\n\n");
}
