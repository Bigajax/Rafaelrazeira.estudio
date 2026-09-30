/* ============================================================
   MARKETING: o vocabulário comum da tela e do worker

   Este arquivo não importa nada de servidor nem de navegador, de propósito:
   a aba /crm/marketing, as server actions e o `scripts/marketing-agentes.ts`
   leem a mesma lista de formatos, códigos e moldes. Se o worker e a tela
   discordassem sobre o que é um "slide", a peça sairia do Caetano num
   formato que a mesa não sabe montar.
   ============================================================ */

export type TipoPeca = "carrossel" | "post_feed" | "story" | "criativo_ads";
export type Codigo = "T1" | "T2" | "T3" | "M1" | "M2" | "M3" | "F1" | "F2" | "F3";
export type StatusPeca = "rascunho" | "pronta" | "postada";
export type Agente = "estrategista" | "copywriter" | "diretor-arte" | "revisor";
export type TipoPedido = Agente | "tudo" | "pautas";

export const TIPOS: Record<TipoPeca, { nome: string; w: number; h: number }> = {
  carrossel: { nome: "Carrossel", w: 1080, h: 1350 },
  post_feed: { nome: "Post único", w: 1080, h: 1350 },
  story: { nome: "Story", w: 1080, h: 1920 },
  criativo_ads: { nome: "Anúncio", w: 1080, h: 1350 },
};

/* A tabela mestra do posicionamento (seção 3), resumida no que a tela
   precisa mostrar: o nome do tipo e a camada, que decide o CTA. */
export const CODIGOS: Record<Codigo, { nome: string; camada: "topo" | "meio" | "fundo" }> = {
  T1: { nome: "Antes e depois", camada: "topo" },
  T2: { nome: "Opinião com dado", camada: "topo" },
  T3: { nome: "Fora da tela", camada: "topo" },
  M1: { nome: "O que eu mediria", camada: "meio" },
  M2: { nome: "A régua", camada: "meio" },
  M3: { nome: "Bastidor do número", camada: "meio" },
  F1: { nome: "Framework nomeado", camada: "fundo" },
  F2: { nome: "Entrega com número", camada: "fundo" },
  F3: { nome: "Oferta direta", camada: "fundo" },
};

export const AGENTES: Record<Agente, { nome: string; papel: string; faz: string }> = {
  estrategista: { nome: "Paula", papel: "pauta", faz: "a pauta e quatro ganchos" },
  copywriter: { nome: "Caetano", papel: "copy", faz: "os slides e a legenda" },
  "diretor-arte": { nome: "Dora", papel: "arte", faz: "o prompt do fundo" },
  revisor: { nome: "Vera", papel: "revisão", faz: "o veredito" },
};

export const ORDEM_AGENTES: Agente[] = ["estrategista", "copywriter", "diretor-arte", "revisor"];

/* ============================================================
   OS PILARES: o conteúdo é geração de valor (30/09/2026)

   A primeira versão deixava o time girar em torno de "vitrine e R$ 999".
   O Rafael corrigiu: conteúdo é geração de valor, e a venda é a minoria.
   A regra é 80/20: a cada cinco peças, quatro ensinam, mostram bastidor ou
   opinam, e uma fala da oferta. É o pilar, e não o código T1..F3, que
   decide se a oferta entra no prompt dos agentes.

   O `roteiro` é a sequência com que a peça nasce: cada slide tem um TIPO
   (o que o texto carrega) e um PAPEL DA IMAGEM (o que a imagem faz ali).
   Foi o storyboard de 30/09 ("isso aqui é ouro"): a imagem abre, é
   aproximada, vira prova e volta no fim, e o carrossel ganha fio. O Rafael
   decidiu que cada pilar tem o seu roteiro, e que o retrato dele fecha só
   Bastidor, Opinião e Oferta.
   ============================================================ */
export type Pilar = "tendencia" | "conceito" | "comparacao" | "curadoria" | "bastidor" | "opiniao" | "case" | "oferta";

type Passo = [TipoSlide, PapelImagem];

export const PILARES: Record<Pilar, { nome: string; faz: string; roteiro: Passo[]; esqueleto: TipoSlide[]; valor: boolean }> = (() => {
  const p = (nome: string, faz: string, roteiro: Passo[], valor = true) => ({
    nome,
    faz,
    roteiro,
    esqueleto: roteiro.map(([t]) => t),
    valor,
  });
  return {
    tendencia: p("Tendência", "o que está mudando no varejo e no digital, e o que a loja faz com isso", [
      ["capa", "abertura"], ["texto", "zoom"], ["tela", "prova"], ["texto", "respiro"], ["comparacao", "contraste"], ["fecho", "fecho"],
    ]),
    conceito: p("Conceito explicado", "um conceito de design ou de venda explicado para quem não é designer", [
      ["capa", "abertura"], ["conceito", "respiro"], ["texto", "zoom"], ["comparacao", "contraste"], ["tela", "prova"], ["fecho", "fecho"],
    ]),
    comparacao: p("Ruim × bom", "o mesmo objeto dos dois jeitos: a diferença que faz vender", [
      ["capa", "abertura"], ["comparacao", "contraste"], ["texto", "zoom"], ["comparacao", "contraste"], ["texto", "resposta"], ["fecho", "fecho"],
    ]),
    curadoria: p("Curadoria", "uma lista curta de achados, com o detalhe que faz cada um funcionar", [
      ["capa", "abertura"], ["tela", "prova"], ["tela", "prova"], ["tela", "prova"], ["lista", "respiro"], ["fecho", "fecho"],
    ]),
    bastidor: p("Bastidor", "o processo por dentro: como uma decisão é tomada no estúdio", [
      ["capa", "abertura"], ["texto", "zoom"], ["tela", "prova"], ["numero", "respiro"], ["fecho", "voce"],
    ]),
    opiniao: p("Opinião", "uma tese curta e defensável sobre venda, marca ou internet", [
      ["capa", "abertura"], ["citacao", "respiro"], ["texto", "zoom"], ["texto", "resposta"], ["fecho", "voce"],
    ]),
    case: p("Case", "um projeto real: o antes, a decisão e o que mudou", [
      ["capa", "abertura"], ["tela", "prova"], ["texto", "zoom"], ["numero", "respiro"], ["tela", "prova"], ["fecho", "fecho"],
    ]),
    oferta: p("Oferta", "o que o estúdio vende, para quem, e como pedir", [
      ["capa", "abertura"], ["texto", "zoom"], ["numero", "respiro"], ["tela", "prova"], ["fecho", "voce"],
    ], false),
  };
})();

/* ============================================================
   O PAPEL DA IMAGEM EM CADA SLIDE
   ============================================================ */
export type PapelImagem = "abertura" | "zoom" | "respiro" | "contraste" | "prova" | "resposta" | "fecho" | "voce";

export const PAPEIS: Record<PapelImagem, { nome: string; faz: string }> = {
  abertura: { nome: "Abertura sangrada", faz: "a imagem inteira; o título no respiro que ela deixou" },
  zoom: { nome: "Zoom no detalhe", faz: "a mesma imagem aproximada num detalhe" },
  respiro: { nome: "Respiro de cor", faz: "sem imagem; a cor sai da própria foto e o texto respira" },
  contraste: { nome: "Contraste", faz: "a mesma imagem apagada × viva, ou duas imagens lado a lado" },
  prova: { nome: "Prova", faz: "o print real dentro de um navegador" },
  resposta: { nome: "Imagem própria", faz: "uma geração só deste slide, ao lado do texto (cena nova, mesmo mundo)" },
  fecho: { nome: "Volta à abertura", faz: "a capa volta menor, como foto colada, com a ação" },
  voce: { nome: "Você no fecho", faz: "o seu retrato fecha a história, com a ação" },
};

/* O papel de um slide que não escolheu: o que o tipo dele pede. */
export function papelDe(s: Slide, tipo: TipoSlide): PapelImagem {
  if (s.papel) return s.papel;
  if (tipo === "capa") return "abertura";
  if (tipo === "comparacao") return "contraste";
  if (tipo === "tela") return "prova";
  if (tipo === "fecho") return "fecho";
  return "respiro";
}

/* Onde a imagem 1 deixa espaço livre para o título da abertura. A Dora
   declara isso junto do prompt; o Rafael corrige no editor se a imagem
   saiu diferente. */
export type Respiro = "topo-esquerda" | "topo-direita" | "topo" | "base";

/* ============================================================
   OS MOLDES CADASTRADOS (30/09)

   "Eu preciso de outros moldes, que você cadastre, para eu tentar fazer de
   uma forma que fique bom, sem tanto sobrepor, ou até sobrepondo, só que
   aparecendo o que as letras falam." Cada molde é uma composição fixa de
   imagem e texto, que qualquer slide pode usar; o editor mostra todos numa
   galeria com a imagem e o texto do próprio slide.
   ============================================================ */
export type LayoutId =
  | "texto-cima"
  | "imagem-cima"
  | "img-esquerda"
  | "img-direita"
  | "janela"
  | "moldura"
  | "pe"
  | "topo"
  | "faixa"
  | "circulo"
  | "arco"
  | "polaroid"
  | "selo"
  | "so-texto";

export const LAYOUTS: Record<LayoutId, { nome: string; grupo: "separado" | "sobre" | "detalhe" }> = {
  "texto-cima": { nome: "Texto em cima", grupo: "separado" },
  "imagem-cima": { nome: "Imagem em cima", grupo: "separado" },
  "img-esquerda": { nome: "Imagem à esquerda", grupo: "separado" },
  "img-direita": { nome: "Imagem à direita", grupo: "separado" },
  janela: { nome: "Janela", grupo: "separado" },
  moldura: { nome: "Moldura", grupo: "separado" },
  pe: { nome: "Inteira, texto no pé", grupo: "sobre" },
  topo: { nome: "Inteira, texto no topo", grupo: "sobre" },
  faixa: { nome: "Faixa atravessando", grupo: "sobre" },
  circulo: { nome: "Círculo", grupo: "detalhe" },
  arco: { nome: "Arco com fita", grupo: "detalhe" },
  polaroid: { nome: "Polaroid", grupo: "detalhe" },
  selo: { nome: "Selo no canto", grupo: "detalhe" },
  "so-texto": { nome: "Só texto", grupo: "detalhe" },
};

/* ---------- a leitura do título sobre a imagem ----------
   Imagem de IA nem sempre deixa o espaço que o prompt pediu. O molde não pode
   depender disso: a abertura tem três jeitos de o título ler sobre qualquer
   imagem, e um quarto para quando a imagem deixou o respiro limpo. */
export type Leitura = "veu" | "faixa" | "dividida" | "sombra" | "livre";
/* fora da abertura só valem as proteções que não dependem do layout dela */
export const LEITURAS_GERAIS: Leitura[] = ["sombra", "faixa", "livre"];
export const LEITURAS: Record<Leitura, { nome: string; faz: string }> = {
  veu: { nome: "Véu", faz: "um degradê escuro do lado do título; a imagem fica inteira" },
  faixa: { nome: "Faixa", faz: "o título num bloco de cor chapada por cima da imagem" },
  dividida: { nome: "Dividida", faz: "o título na cor sólida em cima, a imagem embaixo, sem nada por cima" },
  sombra: { nome: "Sombra", faz: "uma sombra suave atrás das letras; segura o texto sobre imagem cheia sem cobrir nada" },
  livre: { nome: "Nenhuma", faz: "o texto direto na imagem, quando ela deixou o espaço limpo" },
};
export const RESPIROS: Record<Respiro, string> = {
  "topo-esquerda": "Em cima, à esquerda",
  "topo-direita": "Em cima, à direita",
  topo: "Em cima",
  base: "Embaixo",
};

/* ============================================================
   O DESIGN SYSTEM DOS POSTS: dois sistemas, e o editor na mão

   CINEMA (a capa, e o que mais o Rafael quiser): o fundo que ele gera no
   ChatGPT sangra a tela sob véu e grão, e o título vem em duas vozes, a
   serifa leve em cima e a Archivo condensada em caixa alta embaixo. É o
   padrão da @vison.studios que ele escolheu em 13/09, com a voz da casa.

   PAPEL (as internas, por padrão): a gramática papel e tinta do site, com
   as mesmas duas vozes, alinhada à margem, para o que precisa ser LIDO:
   conceito, ruim × bom, lista, a tela real num mockup.

   Cada slide tem um TIPO (o que ele carrega) e uma SUPERFÍCIE (cinema ou
   papel), e três ajustes à mão: escala do título, posição e alinhamento.
   ============================================================ */
export type TipoSlide = "capa" | "texto" | "conceito" | "comparacao" | "lista" | "citacao" | "tela" | "numero" | "fecho";
export type Superficie = "cinema" | "papel";
export type Posicao = "topo" | "centro" | "base";
export type Alinhar = "esquerda" | "centro";

export const TIPOS_SLIDE: Record<TipoSlide, { nome: string; ajuda: string }> = {
  capa: { nome: "Capa", ajuda: "título nas duas vozes e uma linha de apoio" },
  texto: { nome: "Texto", ajuda: "uma ideia: título e um parágrafo curto" },
  conceito: { nome: "Conceito", ajuda: "o termo, e a definição em três linhas" },
  comparacao: { nome: "Ruim × bom", ajuda: "o mesmo objeto dos dois jeitos, com imagem ou texto" },
  lista: { nome: "Lista", ajuda: "três a seis itens, em ordem" },
  citacao: { nome: "Tese", ajuda: "uma frase grande, entre aspas" },
  tela: { nome: "Tela real", ajuda: "o print de uma página num navegador" },
  numero: { nome: "Número", ajuda: "um número real, grande, com o filete verde" },
  fecho: { nome: "Fecho", ajuda: "o que fazer agora: salvar, comentar ou pedir" },
};

export type Slide = {
  tipo?: TipoSlide;
  /* O índice da cor na paleta da direção. Vazio = a ordem do slide. */
  cor?: number;
  /* A cor do título e a do destaque, escolhidas à mão (hex). Vazio = a
     automática, que sai da cor do slide (30/09: "o texto não troca a cor"). */
  corTexto?: string;
  corAcento?: string;
  /* Legado da v2 (cinema/papel). Lido, nunca mais escrito. */
  superficie?: Superficie;
  /* Voz 1, a serifa leve ("Páginas que"). */
  manchete: string;
  /* Voz 2, a Archivo condensada em caixa alta ("PARECEM CARAS"). */
  batida?: string;
  apoio?: string;
  numero?: string;
  /* A etiqueta em mono acima do título: o termo do conceito, a fonte da
     tese, o "passo 2" do bastidor. */
  rotulo?: string;
  /* A palavra que ganha a cor da família (e o itálico, na serifa). */
  destaque?: string;
  itens?: string[];
  /* Ruim × bom: o texto de cada lado, e a imagem de cada lado (caminho no
     bucket). `img` também é o print do slide "tela". */
  ruim?: string;
  bom?: string;
  img?: string;
  img2?: string;
  escala?: number;
  posicao?: Posicao;
  alinhar?: Alinhar;
  /* O papel da imagem neste slide, qual imagem da série (0 = a primeira)
     e o foco do zoom: x e y em % do quadro, z = quanto aproxima (1 a 4). */
  papel?: PapelImagem;
  imagem?: number;
  /* Como o título da abertura lê sobre a imagem (30/09: a capa do Dots veio
     cheia do topo à base e o título sumiu). */
  leitura?: Leitura;
  /* O molde escolhido na galeria (30/09). Vazio = o molde padrão do papel. */
  layout?: LayoutId;
  /* O texto solto do molde (30/09: "tenho que ter uma gama maior de poder"):
     posição e largura em % da prancha, e o alinhamento. Vazio = o texto mora
     onde o molde do papel manda. */
  texto?: { x: number; y: number; w: number; alinhar: "esquerda" | "centro" | "direita" };
  foco?: { x: number; y: number; z: number };
  /* Legado da v1 (os seis moldes). Lido, nunca mais escrito. */
  molde?: string;
};

/* O tipo que o slide recebe quando ninguém escolheu. */
export function tipoDe(s: Slide, i: number, total: number, temCta: boolean): TipoSlide {
  if (s.tipo) return s.tipo;
  if (s.molde === "capa" || s.molde === "janela" || i === 0) return "capa";
  if (s.numero?.trim() || s.molde === "numero") return "numero";
  if (s.itens?.length) return "lista";
  if (s.ruim || s.bom) return "comparacao";
  if (s.molde === "fecho" || (i === total - 1 && total > 1 && temCta)) return "fecho";
  return "texto";
}

/* ============================================================
   AS DIREÇÕES (v3, 30/09/2026, a que valeu)

   O cinema e o papel da v2 saíram engessados aos olhos do Rafael: "não tem
   nada de disruptivo e com personalidade". Foram montadas três direções em
   PNG com o mesmo conteúdo, e ele escolheu DUAS, para alternar no feed:

     acido     Pôster ácido: cor chapada saturada, a foto recortada em
               círculo, título gigante, selo torto com sombra dura
     colagem   Colagem editorial: cor quente, a foto recortada em arco com
               fita adesiva, serifa grande sobreposta, selo redondo

   DECISÃO DE MARCA: no Instagram, as regras "rosa só na ação" e "verde só
   em filete" do SITE não valem. O feed pediu cor, e cor é o que as duas
   direções têm. O site continua com as dele.

   Cada slide pega uma cor da paleta da direção, na ordem (o carrossel vira
   uma sequência de cores), e pode trocar à mão.
   ============================================================ */
export type Direcao = "acido" | "colagem";
export type Cor = { bg: string; fg: string; acento: string; nome: string };

export const DIRECOES: Record<Direcao, { nome: string; faz: string; paleta: Cor[] }> = {
  acido: {
    nome: "Pôster ácido",
    faz: "cor chapada, foto em círculo, título gigante, selo torto",
    paleta: [
      { nome: "Cobalto", bg: "#1B35FF", fg: "#FFFFFF", acento: "#C8FF2E" },
      { nome: "Ácido", bg: "#C8FF2E", fg: "#111111", acento: "#1B35FF" },
      { nome: "Laranja", bg: "#FF5A1F", fg: "#111111", acento: "#FFFFFF" },
      { nome: "Preto", bg: "#111111", fg: "#FFFFFF", acento: "#C8FF2E" },
      { nome: "Chiclete", bg: "#FF6FD8", fg: "#111111", acento: "#1B35FF" },
      { nome: "Papel", bg: "#F2EFE6", fg: "#111111", acento: "#FF5A1F" },
    ],
  },
  colagem: {
    nome: "Colagem editorial",
    faz: "cor quente, foto em arco com fita, serifa grande, selo redondo",
    paleta: [
      { nome: "Tomate", bg: "#FF3B2F", fg: "#111111", acento: "#FFFFFF" },
      { nome: "Creme", bg: "#F4EDE0", fg: "#111111", acento: "#FF3B2F" },
      { nome: "Girassol", bg: "#FFD23F", fg: "#111111", acento: "#1C3FFF" },
      { nome: "Cobalto", bg: "#1C3FFF", fg: "#FFFFFF", acento: "#FFD23F" },
      { nome: "Folha", bg: "#0E7C4A", fg: "#FFFFFF", acento: "#FFD23F" },
      { nome: "Rosa", bg: "#FFB3C7", fg: "#111111", acento: "#FF3B2F" },
    ],
  },
};

/* ---------- as cores que saem da imagem ----------
   O storyboard de 30/09 mostrou que o carrossel conversa quando as cores
   dele saem da própria foto (o verde, o cobalto e o laranja da mulher no
   pedestal). Quando a peça tem `paleta` (extraída da imagem 1 no
   navegador), ela manda; senão vale a paleta fixa da direção. */
function luz(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
function distancia(a: string, b: string) {
  const x = parseInt(a.replace("#", ""), 16);
  const y = parseInt(b.replace("#", ""), 16);
  return Math.abs(((x >> 16) & 255) - ((y >> 16) & 255)) + Math.abs(((x >> 8) & 255) - ((y >> 8) & 255)) + Math.abs((x & 255) - (y & 255));
}
export function paletaDaImagem(cores: string[]): Cor[] {
  return cores.map((bg, k) => {
    const fg = luz(bg) < 0.55 ? "#FFFFFF" : "#111111";
    /* o acento é a outra cor da imagem que mais se afasta do fundo */
    const outras = cores.filter((c) => c !== bg);
    const acento = outras.sort((a, b) => distancia(b, bg) - distancia(a, bg))[0] ?? fg;
    return { nome: `Cor ${k + 1} da imagem`, bg, fg, acento };
  });
}

export function paletaDe(estilo: Estilo): Cor[] {
  if (estilo.usarPaleta !== false && estilo.paleta && estilo.paleta.length >= 2) return paletaDaImagem(estilo.paleta);
  return DIRECOES[estilo.direcao ?? "acido"].paleta;
}

export function corDe(direcao: Direcao, s: Slide, i: number, estilo?: Estilo): Cor {
  const paleta = estilo ? paletaDe({ ...estilo, direcao }) : DIRECOES[direcao].paleta;
  return paleta[(s.cor ?? i) % paleta.length];
}

/* Uma imagem gerada no ChatGPT. `slide` é o slide (1, 2, 3...) para o qual
   ela foi pedida: desde 30/09 cada slide pode ter a sua geração, para o
   carrossel não repetir a mesma imagem ("não pode ficar repetitivo"). */
export type ImagemSerie = { prompt: string; caminho?: string; papel?: string; slide?: number };

export type Estilo = {
  direcao?: Direcao;
  /* A foto do ChatGPT em cor original (o padrão: ela já vem colorida) ou em
     duotone na cor do slide (o efeito pôster). */
  foto?: "cor" | "duotone";
  /* Onde a imagem 1 deixa espaço para o título da abertura. */
  respiro?: Respiro;
  /* As imagens da série além da primeira (a primeira é `fundo` e
     `prompt_capa`). A Dora decide quantas o post pede. */
  extras?: ImagemSerie[];
  /* A bíblia da série: personagens e mundo, repetidos igual em todo prompt,
     para a sequência não trocar de personagem entre um slide e outro. */
  biblia?: string;
  /* As cores extraídas da imagem 1, e se o carrossel usa elas. */
  paleta?: string[];
  usarPaleta?: boolean;
  /* Legado da v2. */
  familia?: string;
  veu?: number;
  grao?: number;
};
export const ESTILO_PADRAO: { direcao: Direcao; foto: "cor" | "duotone" } = { direcao: "acido", foto: "cor" };

export type Peca = {
  id: string;
  tipo: TipoPeca;
  codigo: Codigo | null;
  pilar: Pilar | null;
  estilo: Estilo;
  briefing: string;
  gancho: string;
  corpo: string;
  cta: string;
  hashtags: string;
  legenda: string;
  slides: Slide[];
  prompt_capa: string;
  fundo: string | null;
  notas: Partial<Record<Agente, string>>;
  opcoes_gancho: string[];
  veredito: Veredito | null;
  posta_em: string | null;
  status: StatusPeca;
  criado_em: string;
  atualizado_em: string;
};

export type Veredito = {
  status: "APPROVE" | "CONDITIONAL" | "REJECT";
  media_ponderada?: number;
  bloqueadores?: string[];
  correcoes_prioritarias?: string[];
};

export type Pedido = {
  id: string;
  peca_id: string | null;
  agente: TipoPedido;
  entrada: Record<string, unknown>;
  status: "na_fila" | "rodando" | "feito" | "erro";
  etapa: string | null;
  erro: string | null;
  criado_em: string;
  iniciado_em: string | null;
  terminado_em: string | null;
};

/* O worker bate a cada 10s. Três batidas perdidas = desligado. */
export const WORKER_VIVO_MS = 35_000;

export const BUCKET = "marketing";

export function urlFundo(caminho: string | null) {
  if (!caminho) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/${BUCKET}/${caminho}`;
}

/* A legenda que vai para o Instagram: a salva, se existir; senão a que se
   monta com o que o Caetano escreveu. Story e anúncio não levam hashtag. */
export function legendaFinal(p: Pick<Peca, "legenda" | "gancho" | "cta" | "hashtags" | "tipo">) {
  const comHashtag = p.tipo === "carrossel" || p.tipo === "post_feed";
  const tags = comHashtag ? p.hashtags.trim() : "";
  /* com legenda escrita, as hashtags iam embora: a legenda do Dots (30/09)
     saía sem nenhuma, e a Vera barrou por isso. Elas entram no fim, uma vez. */
  if (p.legenda.trim()) {
    const l = p.legenda.trim();
    const primeira = tags.split(/\s+/)[0];
    return tags && !(primeira && l.includes(primeira)) ? `${l}\n\n${tags}` : l;
  }
  return [p.gancho, p.cta, tags].map((x) => x.trim()).filter(Boolean).join("\n\n");
}

/* ============================================================
   A COMPOSIÇÃO DA IMAGEM, PELO MOLDE (30/09)
   "O prompt tem que ser criado com base no que o slide diz e nas margens:
   se tem escrita no meio, em cima." Cada molde sabe a forma da área da
   imagem e onde o texto cai. Isso entra no fim do prompt de cada slide, em
   inglês como o resto do prompt, e muda na hora quando o molde muda. A cena
   (o que acontece) é da Dora; a composição é do molde.
   ============================================================ */
export type Composicao = { texto: string; formato: string };

const VERTICAL = "vertical 4:5";
const QUADRADO = "square 1:1";
const DEITADA = "horizontal 3:2";
const ALTA = "tall vertical 2:3";

const CENTRO_SEGURO = "Keep every important element well inside the frame: the edges will be cropped.";

const POR_MOLDE: Record<Exclude<LayoutId, "so-texto">, Composicao> = {
  "texto-cima": {
    texto: `The image sits in the lower half of the post, under the text, with no text over it. Wide shot, the subject in the center. ${CENTRO_SEGURO}`,
    formato: DEITADA,
  },
  "imagem-cima": {
    texto: `The image sits in the upper half of the post, above the text, with no text over it. Wide shot, the subject in the center. ${CENTRO_SEGURO}`,
    formato: DEITADA,
  },
  "img-esquerda": {
    texto: "The image is a tall narrow column on the left of the post (about 45% of the width), with the text beside it. Put the subject in the middle vertical third; the left and right sides will be cropped.",
    formato: ALTA,
  },
  "img-direita": {
    texto: "The image is a tall narrow column on the right of the post (about 45% of the width), with the text beside it. Put the subject in the middle vertical third; the left and right sides will be cropped.",
    formato: ALTA,
  },
  janela: {
    texto: `The image sits inside a framed window in the upper part of the post, with the text below it. One clear scene, medium shot. ${CENTRO_SEGURO}`,
    formato: DEITADA,
  },
  moldura: {
    texto: `The image fills a large frame in the upper two thirds of the post, with the text below it. One clear scene, medium shot. ${CENTRO_SEGURO}`,
    formato: QUADRADO,
  },
  pe: {
    texto: "Full-bleed image with the headline over the BOTTOM 40%. Keep that bottom area calm and simple, darker, without faces or important objects, like a floor or a table surface; the subject lives in the upper 60%.",
    formato: VERTICAL,
  },
  topo: {
    texto: "Full-bleed image with the headline over the TOP 40%. Keep that top area calm and simple, like an empty wall or sky, without faces or important objects; the subject lives in the lower 60%.",
    formato: VERTICAL,
  },
  faixa: {
    texto: "Full-bleed image crossed by a solid text band across the MIDDLE (about a third of the height). Put the subject in the top third or the bottom third, never in the middle band.",
    formato: VERTICAL,
  },
  circulo: {
    texto: "The image is cropped into a circle. One subject, centered, filling the middle of the frame; the corners will be cut away.",
    formato: QUADRADO,
  },
  arco: {
    texto: "The image is cropped into a tall arch (rounded top). One subject, centered, with room above the head; the top corners will be cut away.",
    formato: VERTICAL,
  },
  polaroid: {
    texto: `The image is a small tilted photo print, with the text beside it. One subject, centered, simple and readable at small size. ${CENTRO_SEGURO}`,
    formato: VERTICAL,
  },
  selo: {
    texto: "The image is a small circular stamp in the corner of the post. A single object in close-up, centered, bold silhouette, readable at a very small size, plain background.",
    formato: QUADRADO,
  },
};

/* onde o título cai quando a imagem ocupa o slide inteiro */
const LUGAR_DO_TEXTO: Record<Respiro | "meio", string> = {
  "topo-esquerda": "the TOP-LEFT area",
  "topo-direita": "the TOP-RIGHT area",
  topo: "the TOP 40%",
  base: "the BOTTOM 40%",
  meio: "the MIDDLE band",
};

export function composicaoDe(slide: Slide, papel: PapelImagem | null, estilo?: Estilo): Composicao | null {
  if (slide.layout === "so-texto") return null;
  if (slide.layout && slide.layout in POR_MOLDE) return POR_MOLDE[slide.layout as Exclude<LayoutId, "so-texto">];
  /* sem molde escolhido: vale o molde do papel */
  const acido = (estilo?.direcao ?? "acido") === "acido";
  switch (papel) {
    case "abertura": {
      if (slide.leitura === "dividida")
        return { texto: `The image fills the lower half of the post, under a solid color block with the headline. Wide shot. ${CENTRO_SEGURO}`, formato: DEITADA };
      let onde: Respiro | "meio" = estilo?.respiro ?? "base";
      if (slide.texto) onde = slide.texto.y < 35 ? "topo" : slide.texto.y > 55 ? "base" : "meio";
      return {
        texto: `Full-bleed image with the headline over ${LUGAR_DO_TEXTO[onde]}. Keep that area calm and simple, without faces or important objects; the subject lives in the rest of the frame.`,
        formato: VERTICAL,
      };
    }
    case "zoom":
    case "voce":
      return acido ? POR_MOLDE.circulo : POR_MOLDE.arco;
    case "resposta":
      return POR_MOLDE.polaroid;
    case "fecho":
      return { texto: `The image is a photo print pasted in the upper part of the post, with the text below it. One subject, centered. ${CENTRO_SEGURO}`, formato: VERTICAL };
    case "contraste":
      return { texto: `The same image is shown twice, dim and vivid, with short labels. One clear subject, centered, simple background. ${CENTRO_SEGURO}`, formato: VERTICAL };
    default:
      /* respiro de cor e prova (print) não levam imagem gerada */
      return null;
  }
}

/* o prompt que vai para o ChatGPT: a cena + a composição do molde */
export function promptComMolde(cena: string, c: Composicao | null, story = false) {
  /* a régua da imagem abre todo prompt com "Vertical 4:5 (1080x1350) image";
     a proporção que vale é a do molde, no fim, então a da cena sai */
  const base = cena
    .trim()
    .replace(/\b(?:tall\s+)?(?:vertical|horizontal|square)\s+\d+\s*:\s*\d+\s*(?:\(\s*\d+\s*x\s*\d+\s*\)\s*)?image\b/gi, "Image");
  if (!base) return "";
  /* no story, a imagem que ocupa a tela inteira é 9:16 */
  const formato = !c || c.formato === VERTICAL ? (story ? "vertical 9:16" : VERTICAL) : c.formato;
  return c ? `${base}\n\nComposition: ${c.texto}\n\nAspect ratio: ${formato}.` : `${base}\n\nAspect ratio: ${formato}.`;
}

/* ============================================================
   O TÍTULO PROVISÓRIO DE UMA PAUTA (30/09)
   A pauta nasce antes de o Caetano escrever os slides, e o slide 1 mostra o
   gancho no lugar do título. Ele era cortado em 60 caracteres, no meio da
   palavra ("...ensinou a cliente a esperar a pr"), e ficava assim quando só a
   Dora rodava. Agora o gancho inteiro vira as duas vozes, partido entre
   palavras: nenhuma letra some, e o título encolhe para caber.
   ============================================================ */
export function tituloProvisorio(gancho: string): Pick<Slide, "manchete" | "batida"> {
  const palavras = gancho.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (palavras.length <= 3) return { manchete: palavras.join(" ") };
  const corte = Math.max(1, Math.round(palavras.length * 0.4));
  return { manchete: palavras.slice(0, corte).join(" "), batida: palavras.slice(corte).join(" ") };
}
