"use client";

/* ============================================================
   A FICHA DA MARCA — as cores saem das fotos, a decisão é sua

   Esta é a parte da oficina que eu NÃO venderia como automática. Extrair
   cor dominante de um punhado de fotos é aritmética e sai em segundos; o
   que a aritmética não sabe é qual daquelas cores é a marca. Um feed de
   moda devolve muita pele, muito bege de parede e muito jeans, e a cor da
   marca costuma ser a quarta da lista, não a primeira.

   Então a máquina propõe oito amostras e você escolhe. Continua sendo
   trinta segundos contra vinte minutos de conta-gotas.

   ---------- por que no navegador e não no servidor ----------
   Ler pixel exige decodificar JPEG, e o projeto não tem (nem quer) uma
   dependência de imagem no servidor. O `<canvas>` já faz isso de graça em
   toda máquina que abre o painel. O bucket é público justamente para o
   canvas poder ler: imagem sem CORS suja o canvas e `getImageData` passa a
   lançar.
   ============================================================ */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarIdentidade } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import type { Ativo, Identidade, Loja } from "@/lib/producao/tipos";

/* Doze fotos bastam. A cor de uma marca aparece nas primeiras publicações
   ou não aparece; ler oitenta só faz a tela travar meio segundo a mais. */
const FOTOS_LIDAS = 12;
/* O lado do quadrado em que cada foto é redesenhada. 48x48 são 2.304 pixels
   por imagem: o suficiente para a cor dominante e rápido o bastante para
   doze imagens não pesarem. */
const LADO = 48;
/* Quantização em passos de 24: sem ela, duas fotos do mesmo vestido dão
   quatro mil tons de vermelho e nenhum se repete o bastante para vencer. */
const PASSO = 24;
const AMOSTRAS = 8;

/* ---------- as superfícies, e por que todas são CSS ----------
   "Claro ou escuro" resolvia a decisão mais grossa e deixava de fora a que
   dá caráter: a MATÉRIA do fundo. Papel liso, papel com grão e linho são
   três lojas diferentes antes de qualquer foto entrar.

   Nenhuma delas é imagem. Textura de vitrine feita com arquivo custa
   download em 4G, some quando o CDN falha e escala mal na tela grande;
   todas as oito abaixo são gradiente repetido, que pesa zero, nunca
   quebra e cresce sem perder nitidez. O `css` daqui viaja INTEIRO para o
   briefing: o gerador não precisa inventar a receita, ele cola.

   O grão é sempre discreto (opacidade em torno de 3%): textura que se
   percebe olhando é textura que disputa com a foto da peça, e quem manda
   na vitrine é a peça. */
const SUPERFICIES: {
  id: string;
  nome: string;
  nota: string;
  escuro: boolean;
  css: string;
}[] = [
  {
    id: "papel",
    nome: "Papel liso",
    nota: "o padrão da casa",
    escuro: false,
    css: "#FBF9F3",
  },
  {
    id: "papel-grao",
    nome: "Papel com grão",
    nota: "impresso, artesanal",
    escuro: false,
    css:
      "radial-gradient(#00000008 1px, transparent 1px) 0 0 / 3px 3px, #FBF9F3",
  },
  {
    id: "linho",
    nome: "Linho",
    nota: "tecido: alfaiataria, moda feminina",
    escuro: false,
    css:
      "repeating-linear-gradient(90deg, #00000007 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, #00000007 0 1px, transparent 1px 4px), #F5F2EA",
  },
  {
    id: "creme",
    nome: "Creme quente",
    nota: "pele, íntimo, joia",
    escuro: false,
    css: "#F7F1E4",
  },
  {
    id: "concreto",
    nome: "Concreto",
    nota: "streetwear, tênis, urbano",
    escuro: false,
    css:
      "radial-gradient(#00000010 1px, transparent 1px) 0 0 / 4px 4px, #E6E3DC",
  },
  {
    id: "grafite",
    nome: "Grafite liso",
    nota: "a foto vira a luz da tela",
    escuro: true,
    css: "#14181A",
  },
  {
    id: "grafite-grao",
    nome: "Grafite com grão",
    nota: "escuro sem parecer digital",
    escuro: true,
    css:
      "radial-gradient(#ffffff0a 1px, transparent 1px) 0 0 / 3px 3px, #14181A",
  },
  {
    id: "preto",
    nome: "Preto puro",
    nota: "luxo, joia, peça cara",
    escuro: true,
    css: "#050505",
  },
];
const NA_PALETA = 5;

/* ---------- os pares de tipografia, escolhidos pelo que COMUNICAM ----------
   Um campo de texto vazio com o placeholder "Archivo + Inter" é a pior
   pergunta possível: ele exige que você já saiba o nome da fonte que a
   marca pede. Quem escolhe tipografia para uma loja não parte do nome,
   parte da cara ("isso aqui é esportivo", "isso aqui é clássico"), e é
   por isso que cada par vem com o que ele diz, e não só como se chama.

   A REGRA DA CASA VIAJA JUNTO: são sempre DUAS famílias, uma para
   manchete e uma para corpo, nunca três (docs/design-estudio.md, seção 3).
   Por isso a lista é de pares, e não de fontes soltas: escolher uma de
   cada vez é como se acumulam quatro numa página.

   O campo continua livre. Isto é atalho para os casos que se repetem, não
   um menu fechado. */
const TIPOGRAFIAS: {
  par: string;
  cara: string;
  display: string;
  corpo: string;
  peso: number;
  grupo: string;
}[] = [
  {
    par: "Archivo + Inter",
    cara: "a da casa: condensada e direta, serve em quase tudo",
    display: "var(--display)",
    corpo: "var(--body)",
    peso: 900,
    grupo: "Condensada e forte",
  },
  {
    par: "Anton + Inter",
    cara: "pesada e gritada: promoção, tênis, streetwear",
    display: "'Anton', Impact, sans-serif",
    corpo: "var(--body)",
    peso: 400,
    grupo: "Condensada e forte",
  },
  {
    par: "Bebas Neue + Inter",
    cara: "alta e estreita: cabe manchete longa sem quebrar",
    display: "'Bebas Neue', Impact, sans-serif",
    corpo: "var(--body)",
    peso: 400,
    grupo: "Condensada e forte",
  },
  {
    par: "Oswald + Inter",
    cara: "condensada com serifa de máquina: oficina, esporte",
    display: "'Oswald', Impact, sans-serif",
    corpo: "var(--body)",
    peso: 600,
    grupo: "Condensada e forte",
  },
  {
    par: "Barlow Condensed + Barlow",
    cara: "condensada leve: catálogo grande, muita linha",
    display: "'Barlow Condensed', system-ui, sans-serif",
    corpo: "'Barlow', system-ui, sans-serif",
    peso: 700,
    grupo: "Condensada e forte",
  },
  {
    par: "Playfair Display + Inter",
    cara: "serifada de moda: feminino clássico, semijoia",
    display: "'Playfair Display', Georgia, serif",
    corpo: "var(--body)",
    peso: 700,
    grupo: "Serifada de moda",
  },
  {
    par: "DM Serif Display + DM Sans",
    cara: "serifada suave: alfaiataria, marca sóbria",
    display: "'DM Serif Display', Georgia, serif",
    corpo: "'DM Sans', system-ui, sans-serif",
    peso: 400,
    grupo: "Serifada de moda",
  },
  {
    par: "Cormorant Garamond + Inter",
    cara: "fina e antiga: joia, perfume, peça cara",
    display: "'Cormorant Garamond', Georgia, serif",
    corpo: "var(--body)",
    peso: 600,
    grupo: "Serifada de moda",
  },
  {
    par: "Libre Baskerville + Inter",
    cara: "editorial: parece revista, não loja",
    display: "'Libre Baskerville', Georgia, serif",
    corpo: "var(--body)",
    peso: 700,
    grupo: "Serifada de moda",
  },
  {
    par: "Space Grotesk + Inter",
    cara: "geométrica com defeito proposital: marca jovem",
    display: "'Space Grotesk', system-ui, sans-serif",
    corpo: "var(--body)",
    peso: 700,
    grupo: "Geométrica e moderna",
  },
  {
    par: "Poppins + Inter",
    cara: "redonda e simpática: fitness, praia, público jovem",
    display: "'Poppins', system-ui, sans-serif",
    corpo: "var(--body)",
    peso: 700,
    grupo: "Geométrica e moderna",
  },
  {
    par: "Outfit + Inter",
    cara: "limpa e neutra: quando a foto é que manda",
    display: "'Outfit', system-ui, sans-serif",
    corpo: "var(--body)",
    peso: 700,
    grupo: "Geométrica e moderna",
  },
  {
    par: "Montserrat + Inter",
    cara: "a mais usada do Brasil: reconhecível, sem risco",
    display: "'Montserrat', system-ui, sans-serif",
    corpo: "var(--body)",
    peso: 800,
    grupo: "Geométrica e moderna",
  },
  {
    par: "Italiana + Inter",
    cara: "alta e fina: só no nome da marca, nunca no corpo",
    display: "'Italiana', Georgia, serif",
    corpo: "var(--body)",
    peso: 400,
    grupo: "Assinatura",
  },
  {
    par: "Syne + Inter",
    cara: "excêntrica e autoral: marca que quer ser lembrada",
    display: "'Syne', system-ui, sans-serif",
    corpo: "var(--body)",
    peso: 800,
    grupo: "Assinatura",
  },
];

/* Os grupos não são categoria de catálogo de fonte: são o que a marca
   PRECISA. Quem escolhe tipografia para uma loja começa decidindo o peso
   da voz (grito, sussurro, elegância), e só depois olha o desenho da
   letra. Quinze cartões soltos numa fita viram parede; em quatro grupos,
   a decisão fica em duas etapas curtas. */
const GRUPOS = ["Condensada e forte", "Serifada de moda", "Geométrica e moderna", "Assinatura"];

/* ---------- as fontes de verdade, e por que só aqui ----------
   Ler "Bebas Neue" numa lista não é escolher tipografia: escolher é VER a
   palavra desenhada. Por isso cada cartão mostra o nome da própria loja na
   fonte do par.

   As cinco famílias externas entram por uma folha do Google carregada sob
   demanda, quando a ficha abre, e não pelo `next/font` do projeto: o
   next/font empacota a fonte no bundle de TODA a aplicação, e cinco
   famílias que só existem nesta escolha não podem pesar na vitrine do
   cliente nem no resto do CRM. Aqui elas são custo de quem abriu a ficha,
   e mais nada.

   Archivo e Inter não estão na lista: elas já vêm com o projeto. */
const FOLHA_GOOGLE =
  "https://fonts.googleapis.com/css2" +
  "?family=Anton" +
  "&family=Barlow:wght@400" +
  "&family=Barlow+Condensed:wght@700" +
  "&family=Bebas+Neue" +
  "&family=Cormorant+Garamond:wght@600" +
  "&family=DM+Sans:wght@400" +
  "&family=DM+Serif+Display" +
  "&family=Italiana" +
  "&family=Libre+Baskerville:wght@700" +
  "&family=Montserrat:wght@800" +
  "&family=Oswald:wght@600" +
  "&family=Outfit:wght@700" +
  "&family=Playfair+Display:wght@700" +
  "&family=Poppins:wght@700" +
  "&family=Space+Grotesk:wght@700" +
  "&family=Syne:wght@800" +
  "&display=swap";

/* Texto claro ou escuro sobre a tinta, pela luminância percebida (a mesma
   fórmula que a leitura de fundo usa nas fotos). Sem isso, uma tinta
   caramelo com texto branco por cima some no cartão de prova, e a decisão
   pareceria pior do que é. */
function sobre(cor: string): string {
  const n = parseInt(cor.replace("#", ""), 16);
  if (Number.isNaN(n)) return "#ffffff";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#14181A" : "#FBF9F3";
}

const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((n) => Math.min(255, n).toString(16).padStart(2, "0")).join("");

async function lerCores(fontes: string[]): Promise<{ amostras: string[]; claro: boolean }> {
  const tela = document.createElement("canvas");
  tela.width = LADO;
  tela.height = LADO;
  const ctx = tela.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { amostras: [], claro: true };

  const contagem = new Map<string, { n: number; r: number; g: number; b: number }>();
  let luz = 0;
  let lidas = 0;

  for (const src of fontes) {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      /* Uma foto que não carrega é uma foto a menos, nunca um erro de tela:
         o Storage às vezes demora e o resto da paleta continua válido. */
      el.onerror = () => resolve(null);
      el.src = src;
    });
    if (!img) continue;

    ctx.clearRect(0, 0, LADO, LADO);
    ctx.drawImage(img, 0, 0, LADO, LADO);
    let dados: Uint8ClampedArray;
    try {
      dados = ctx.getImageData(0, 0, LADO, LADO).data;
    } catch {
      /* Canvas sujo: a imagem veio sem CORS. Acontece se o bucket voltar a
         ser privado, e a mensagem certa é a da tela, não um erro no console. */
      continue;
    }
    lidas++;

    for (let i = 0; i < dados.length; i += 4) {
      const a = dados[i + 3];
      if (a < 200) continue;
      const r = dados[i];
      const g = dados[i + 1];
      const b = dados[i + 2];
      luz += (r * 299 + g * 587 + b * 114) / 1000;

      const chave = `${Math.round(r / PASSO)}-${Math.round(g / PASSO)}-${Math.round(b / PASSO)}`;
      const atual = contagem.get(chave);
      if (atual) {
        atual.n++;
        atual.r += r;
        atual.g += g;
        atual.b += b;
      } else {
        contagem.set(chave, { n: 1, r, g, b });
      }
    }
  }

  if (!lidas) return { amostras: [], claro: true };

  /* ---------- as duas metades da fita ----------
     O primeiro teste real (a Kanton, 57 fotos) devolveu OITO NEUTROS:
     #a9a7a6, #d7d8d6, #c1c1bf e companhia. Não foi defeito de conta, foi a
     conta certa respondendo a pergunta errada. Frequência pura num feed de
     moda mede parede, pele e fundo de estúdio, que é o que ocupa mais
     pixel em qualquer foto de peça.

     Então a fita tem duas metades: quatro DOMINANTES (o que mais aparece,
     que é o clima da marca) e quatro VIVAS (o que tem cor, que é onde a
     marca costuma estar). A viva é escolhida por frequência VEZES
     saturação: sem o peso da frequência, o vencedor seria sempre um pixel
     berrante perdido numa foto só.

     A média do balde, e não o centro dele: o centro devolve a cor do passo
     (sempre múltiplo de 24) e a média devolve a cor que estava lá. */
  const baldes = [...contagem.values()].map((c) => {
    const r = Math.round(c.r / c.n);
    const g = Math.round(c.g / c.n);
    const b = Math.round(c.b / c.n);
    const alto = Math.max(r, g, b);
    const baixo = Math.min(r, g, b);
    /* Saturação do HSV, que é a que responde "isto tem cor?". Preto e
       branco dão zero, e é isso que faz o neutro sair da metade viva. */
    const saturacao = alto === 0 ? 0 : (alto - baixo) / alto;
    return { cor: hex(r, g, b), n: c.n, saturacao };
  });

  const metade = Math.floor(AMOSTRAS / 2);
  const dominantes = [...baldes].sort((a, b) => b.n - a.n).slice(0, metade);
  const vivas = [...baldes]
    /* Abaixo de 18% de saturação é neutro, e neutro já tem a metade de
       cima. Sem esse piso, uma marca inteiramente bege devolveria a mesma
       lista duas vezes. */
    .filter((c) => c.saturacao >= 0.18)
    .sort((a, b) => b.n * b.saturacao - a.n * a.saturacao)
    .slice(0, AMOSTRAS - metade);

  const amostras = [...new Set([...dominantes, ...vivas].map((c) => c.cor))];

  const media = luz / (lidas * LADO * LADO);
  return { amostras, claro: media > 127 };
}

export function Paleta({
  loja,
  ativos,
  urls,
}: {
  loja: Loja;
  ativos: Ativo[];
  urls: Record<string, string>;
}) {
  const router = useRouter();
  const [ficha, setFicha] = useState<Identidade>(loja.identidade ?? {});
  const [amostras, setAmostras] = useState<string[]>([]);
  const [lendo, setLendo] = useState(false);
  const [recado, setRecado] = useState("");
  const [salvando, comSalvamento] = useTransition();

  const paleta = ficha.paleta ?? [];
  const superficie = SUPERFICIES.find((x) => x.id === (ficha.superficie ?? "papel")) ?? SUPERFICIES[0];
  const escuro = superficie.escuro;

  /* Uma folha só, injetada na primeira ficha aberta e reaproveitada nas
     outras: o `id` é o que impede seis links iguais no head depois de
     navegar por seis lojas. */
  useEffect(() => {
    const id = "fontes-da-oficina";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = FOLHA_GOOGLE;
    document.head.appendChild(link);
  }, []);

  async function extrair() {
    setLendo(true);
    setRecado("");
    const fontes = ativos.slice(0, FOTOS_LIDAS).map((a) => urls[a.id]).filter(Boolean);
    const { amostras: cores, claro } = await lerCores(fontes);
    setAmostras(cores);
    if (!cores.length) setRecado("Não consegui ler as fotos. Elas já foram colhidas?");
    /* O fundo só é sugerido se você ainda não decidiu: uma releitura das
       cores não pode desfazer a escolha que você já fez. */
    if (cores.length && !ficha.fundo) setFicha((f) => ({ ...f, fundo: claro ? "claro" : "escuro" }));
    setLendo(false);
  }

  const alternar = (cor: string) =>
    setFicha((f) => {
      const atual = f.paleta ?? [];
      if (atual.includes(cor)) return { ...f, paleta: atual.filter((c) => c !== cor) };
      if (atual.length >= NA_PALETA) return f;
      return { ...f, paleta: [...atual, cor] };
    });

  return (
    <section className={p.bloco}>
      <div className={p.blocoCab}>
        <h2>
          Marca<i className={s.ponto}>.</i>
        </h2>
        <span className={p.blocoRot}>das fotos</span>
        <button type="button" className={s.btnMini} onClick={extrair} disabled={lendo || !ativos.length}>
          {lendo ? "LENDO AS FOTOS…" : "LER AS CORES DAS FOTOS"}
        </button>
      </div>

      {recado && <p className={p.aviso}>{recado}</p>}

      {amostras.length > 0 && (
        <>
          {/* ---------- a fita diz de onde cada cor veio ----------
              A leitura devolve duas metades por motivos diferentes: as
              DOMINANTES são o que mais ocupa pixel (o clima da marca, e
              num feed de moda quase sempre parede e pele), e as VIVAS são
              o que tem cor de verdade (onde a marca costuma estar).

              Sem essa separação na tela, oito quadradinhos em fila pedem
              para você escolher "a mais bonita", que é a pergunta errada.
              Com ela, a escolha vira: qual é o clima, e qual é a tinta. */}
          <div className={p.cartela}>
            {[
              { titulo: "O clima", nota: "o que mais aparece nas fotos", cores: amostras.slice(0, 4) },
              { titulo: "A cor", nota: "onde a marca costuma estar", cores: amostras.slice(4) },
            ]
              .filter((g) => g.cores.length)
              .map((g) => (
                <div key={g.titulo}>
                  <p className={p.cartelaRot}>
                    {g.titulo} <em>{g.nota}</em>
                  </p>
                  <div className={p.amostras}>
                    {g.cores.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        className={`${p.amostra} ${paleta.includes(cor) ? p.amostraEscolhida : ""}`}
                        style={{ background: cor }}
                        onClick={() => alternar(cor)}
                        title={`${cor} · clique para levar à paleta`}
                      >
                        <span>{cor}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      <div className={p.fichaMarca}>
        {/* Paleta e fundo dividem a linha; a tipografia desceu para a
            largura inteira porque ela ganhou os seis atalhos embaixo. */}
        <div>
          {/* ---------- a ordem da paleta É informação ----------
              A primeira cor vira a TINTA no tema exportado (os 10% de ação
              da vitrine: botão, preço, destaque) e a segunda vira o apoio.
              Isso estava dito num parêntese no rótulo, que é o lugar onde
              instrução some. Agora a primeira casa é maior e leva o nome,
              e o desenho ensina a regra sem precisar escrevê-la. */}
          <p className={s.campoRot}>Paleta</p>
          <div className={p.paletaEditavel}>
            {Array.from({ length: NA_PALETA }, (_, i) => (
              /* ---------- vazio precisa PARECER vazio ----------
                 `<input type="color">` sem valor mostra branco, e branco é
                 uma cor legítima: não havia diferença nenhuma entre "a
                 tinta desta marca é branca" e "ninguém escolheu ainda". A
                 casa vazia ganha hachura e o rótulo muda para "vazia". */
              <span
                key={i}
                className={`${i === 0 ? p.tinta : p.apoio} ${paleta[i] ? "" : p.casaVazia}`}
              >
                <input
                  type="color"
                  aria-label={i === 0 ? "Cor da tinta da marca" : `Cor de apoio ${i}`}
                  value={paleta[i] ?? "#ffffff"}
                  onChange={(e) => {
                    const nova = [...paleta];
                    nova[i] = e.target.value;
                    setFicha((f) => ({ ...f, paleta: nova.slice(0, NA_PALETA) }));
                  }}
                />
                <em>{paleta[i] ? (i === 0 ? "tinta" : "apoio") : "vazia"}</em>
              </span>
            ))}
            {paleta.length > 0 && (
              <button type="button" className={s.btnMini} onClick={() => setFicha((f) => ({ ...f, paleta: [] }))}>
                LIMPAR
              </button>
            )}
          </div>
        </div>

        <div>
          {/* Fundo é a decisão que mais muda a vitrine e a que menos se
              percebe numa lista suspensa: "claro" e "escuro" em texto são
              duas palavras, e a escolha é sobre uma SUPERFÍCIE. Duas
              amostras do tamanho de um cartão resolvem em um olhar. */}
          <p className={s.campoRot}>Superfície</p>
          <div className={p.superficies}>
            {SUPERFICIES.map((sup) => {
              const escolhida = (ficha.superficie ?? "papel") === sup.id;
              return (
                <button
                  key={sup.id}
                  type="button"
                  className={`${p.superficie} ${escolhida ? p.superficieEscolhida : ""}`}
                  /* A amostra é a textura DE VERDADE, no mesmo CSS que vai
                     para o briefing: escolher fundo lendo "papel com grão"
                     é o mesmo erro de escolher fonte lendo o nome dela. */
                  onClick={() =>
                    setFicha((f) => ({
                      ...f,
                      superficie: sup.id,
                      /* `fundo` continua existindo e continua sendo claro ou
                         escuro: é dele que o tema tira a cor do texto, e a
                         superfície só diz a matéria. */
                      fundo: sup.escuro ? "escuro" : "claro",
                    }))
                  }
                  aria-pressed={escolhida}
                >
                  <i style={{ background: sup.css }} aria-hidden />
                  <b>{sup.nome}</b>
                  <span>{sup.nota}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={s.campoRot}>Tipografia</p>
          <input
            className={p.campoTipo}
            aria-label="Tipografia da vitrine"
            value={ficha.tipografia ?? ""}
            placeholder="o par de fontes, ou escolha um abaixo"
            onChange={(e) => setFicha((f) => ({ ...f, tipografia: e.target.value }))}
          />
          {GRUPOS.map((grupo) => (
            <div key={grupo} className={p.grupoTipo}>
              <p className={p.grupoRot}>{grupo}</p>
              <ul className={p.tipos}>
                {TIPOGRAFIAS.filter((t) => t.grupo === grupo).map(({ par, cara, display, corpo, peso }) => (
                  <li key={par}>
                    <button
                      type="button"
                      className={`${p.tipo} ${ficha.tipografia === par ? p.tipoEscolhido : ""}`}
                      onClick={() => setFicha((f) => ({ ...f, tipografia: par }))}
                      aria-pressed={ficha.tipografia === par}
                    >
                      {/* O nome da LOJA, e não "Aa" ou um pangrama: o que
                          se decide aqui é como esta marca vai parecer, e é
                          a palavra dela que precisa ser vista desenhada. */}
                      <em style={{ fontFamily: display, fontWeight: peso }}>
                        {(loja.nome || loja.arroba).slice(0, 22)}
                      </em>
                      <i style={{ fontFamily: corpo }}>Tênis Adidas Campus creme · R$ 899,90</i>
                      <b>{par}</b>
                      <span>{cara}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <label className={s.campo}>
        <span className={s.campoRot}>O que eu sei desta marca</span>
        <textarea
          rows={2}
          value={ficha.observacoes ?? ""}
          placeholder="O que ela é, o que ela não é, e o que não pode faltar na vitrine. Isto vai inteiro para o briefing."
          onChange={(e) => setFicha((f) => ({ ...f, observacoes: e.target.value }))}
        />
      </label>

      {/* ---------- a prova ----------
          Paleta, fundo e tipografia são três decisões tomadas em três
          controles separados, e nenhuma delas se julga sozinha: o que
          importa é como a tinta se comporta SOBRE o fundo escolhido, no
          tamanho em que ela vai aparecer. Este cartão é a vitrine em
          miniatura: nome da loja, uma peça, o preço na tinta e o botão de
          pedido. É onde uma tinta clara demais sobre papel se denuncia,
          antes de virar página.

          Só aparece quando existe tinta: sem ela não há nada para provar. */}
      {paleta[0] && (
        <div
          className={`${p.prova} ${escuro ? p.provaEscura : ""}`}
          /* A prova roda na superfície escolhida, e não num cinza neutro:
             é sobre ESTE fundo que a tinta precisa se comportar. */
          style={{ background: superficie.css }}
          aria-label="Como a marca fica na vitrine"
        >
          <span className={p.provaRot}>na vitrine</span>
          <b>{loja.nome || `@${loja.arroba}`}</b>
          <span className={p.provaPeca}>Tênis Adidas Campus creme</span>
          <span className={p.provaPreco} style={{ color: paleta[0] }}>
            R$ 899,90
          </span>
          <span className={p.provaBotao} style={{ background: paleta[0], color: sobre(paleta[0]) }}>
            Pedir no WhatsApp
          </span>
        </div>
      )}

      <button
        type="button"
        className={s.btn}
        disabled={salvando}
        onClick={() =>
          comSalvamento(async () => {
            const r = await salvarIdentidade(loja.id, ficha);
            setRecado(r.ok ? "Ficha salva." : r.erro);
            router.refresh();
          })
        }
      >
        {salvando ? "SALVANDO…" : "SALVAR A FICHA"}
      </button>
    </section>
  );
}
