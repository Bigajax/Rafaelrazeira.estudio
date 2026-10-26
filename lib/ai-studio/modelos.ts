/* ============================================================
   O CATÁLOGO DO AI STUDIO: vídeo e imagem, pelo OpenRouter

   A ÚNICA fonte. A tela desenha os seletores a partir daqui e as rotas
   validam com as mesmas funções: opção que a tela esconde o servidor
   também recusa.

   Conferido em 13/10/2026 nas listas AO VIVO do OpenRouter, que são a
   fonte que ele mesmo manda seguir:
     GET https://openrouter.ai/api/v1/videos/models
     GET https://openrouter.ai/api/v1/images/models/<id>/endpoints
   e nos guias openrouter.ai/docs/guides/overview/multimodal/
   video-generation e image-generation.

   O que a lista dizia, e este arquivo segue:
   - 4K de VÍDEO só no Veo 3.1, no Veo 3.1 Fast e no Seedance 2.0. O
     OpenRouter não diz se é 4K nativo ou ampliado pelo provedor.
   - Veo: 4, 6 ou 8 s, 16:9 ou 9:16, com áudio, primeiro e último quadro.
     Imagem de referência solta (input_references) não aparece na ficha
     dele: as referências do Veo entram como primeiro/último quadro.
   - Seedance 2.0: 4 a 15 s, sete proporções, referências soltas (o
     limite de quantidade não é documentado; o app trava em 4).
   - IMAGEM: os GPT Image recebem proporção, qualidade e fundo, e NÃO
     recebem tamanho em pixels nem formato de saída por esta via. O 4K de
     imagem só existe no Nano Banana Pro (Gemini 3 Pro Image).
   - O GPT Image 2 não tem fundo transparente pelo OpenRouter.
   ============================================================ */

/* ============================================================
   VÍDEO
   ============================================================ */
export type Quadro = "first_frame" | "last_frame";

export type ModeloVideo = {
  id: string;
  nome: string;
  curto: string;
  descricao: string;
  resolucoes: string[];
  proporcoes: string[];
  duracoes: number[];
  quadros: Quadro[];
  /* quantas imagens de referência soltas; 0 = a ficha não tem */
  referencias: number;
  audio: boolean;
  /* US$ por segundo, quando o preço é por segundo; null = por token */
  porSegundo: ((resolucao: string, audio: boolean) => number) | null;
};

export const MODELOS_VIDEO: ModeloVideo[] = [
  {
    id: "google/veo-3.1",
    nome: "Google Veo 3.1",
    curto: "Veo 3.1",
    descricao: "A maior fidelidade visual, para o corte final. 4K, até 8 s, com áudio sincronizado.",
    resolucoes: ["720p", "1080p", "4K"],
    proporcoes: ["16:9", "9:16"],
    duracoes: [4, 6, 8],
    quadros: ["first_frame", "last_frame"],
    referencias: 0,
    audio: true,
    porSegundo: (r, a) => (r === "4K" ? (a ? 0.6 : 0.4) : a ? 0.4 : 0.2),
  },
  {
    id: "google/veo-3.1-fast",
    nome: "Google Veo 3.1 Fast",
    curto: "Veo 3.1 Fast",
    descricao: "4K pela metade do preço, mais rápido. Um degrau abaixo na fidelidade.",
    resolucoes: ["720p", "1080p", "4K"],
    proporcoes: ["16:9", "9:16"],
    duracoes: [4, 6, 8],
    quadros: ["first_frame", "last_frame"],
    referencias: 0,
    audio: true,
    porSegundo: (r, a) => (r === "4K" ? (a ? 0.3 : 0.25) : r === "720p" ? (a ? 0.1 : 0.08) : a ? 0.12 : 0.1),
  },
  {
    id: "bytedance/seedance-2.0",
    nome: "ByteDance Seedance 2.0",
    curto: "Seedance 2.0",
    descricao: "4K, até 15 s, sete proporções e referências soltas. Forte em manter o personagem. Cobra por token.",
    resolucoes: ["480p", "720p", "1080p", "4K"],
    proporcoes: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21"],
    duracoes: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    quadros: ["first_frame", "last_frame"],
    referencias: 4,
    audio: true,
    porSegundo: null,
  },
  {
    id: "google/veo-3.1-lite",
    nome: "Google Veo 3.1 Lite",
    curto: "Veo 3.1 Lite",
    descricao: "Para testar a ideia barato antes do 4K: até 1080p, centavos por segundo.",
    resolucoes: ["720p", "1080p"],
    proporcoes: ["16:9", "9:16"],
    duracoes: [4, 6, 8],
    quadros: ["first_frame", "last_frame"],
    referencias: 0,
    audio: true,
    porSegundo: (r, a) => (r === "720p" ? (a ? 0.05 : 0.03) : a ? 0.08 : 0.05),
  },
];

export const VIDEO_PADRAO = { modelo: "google/veo-3.1", resolucao: "4K", proporcao: "16:9", duracao: 8, audio: true };

export function modeloVideo(id: string): ModeloVideo | undefined {
  return MODELOS_VIDEO.find((m) => m.id === id);
}

/* Ao trocar de modelo, o que não existe nele cai para o mais próximo. */
export function ajustarVideo<T extends { modelo: string; resolucao: string; proporcao: string; duracao: number }>(p: T): T {
  const m = modeloVideo(p.modelo) ?? MODELOS_VIDEO[0];
  const resolucao = m.resolucoes.includes(p.resolucao) ? p.resolucao : m.resolucoes[m.resolucoes.length - 1];
  const proporcao = m.proporcoes.includes(p.proporcao) ? p.proporcao : m.proporcoes[0];
  const duracao = m.duracoes.includes(p.duracao)
    ? p.duracao
    : m.duracoes.reduce((a, b) => (Math.abs(b - p.duracao) < Math.abs(a - p.duracao) ? b : a));
  return { ...p, modelo: m.id, resolucao, proporcao, duracao };
}

/* ============================================================
   IMAGEM
   ============================================================ */
export type Qualidade = "auto" | "low" | "medium" | "high" | "xhigh" | "max";
export type Fundo = "auto" | "opaque" | "transparent";

export type ModeloImagem = {
  id: string;
  nome: string;
  curto: string;
  descricao: string;
  /* null = o modelo não tem esse controle */
  qualidades: Qualidade[] | null;
  resolucoes: string[] | null;
  fundos: Fundo[] | null;
  proporcoes: string[];
  maxRefs: number;
};

const PROPORCOES_GPT = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9", "auto"];

export const MODELOS: ModeloImagem[] = [
  {
    id: "openai/gpt-image-2.5-sunburst",
    nome: "GPT Image 2.5 Sunburst",
    curto: "Sunburst",
    descricao: "Maior qualidade visual. O mais preciso em edição e detalhe fino.",
    qualidades: ["auto", "low", "medium", "high", "xhigh", "max"],
    resolucoes: null,
    fundos: ["auto", "opaque", "transparent"],
    proporcoes: PROPORCOES_GPT,
    maxRefs: 16,
  },
  {
    id: "openai/gpt-image-2.5-flare",
    nome: "GPT Image 2.5 Flare",
    curto: "Flare",
    descricao: "Geração mais rápida, para o dia a dia.",
    qualidades: ["auto", "low", "medium", "high", "xhigh", "max"],
    resolucoes: null,
    fundos: ["auto", "opaque", "transparent"],
    proporcoes: PROPORCOES_GPT,
    maxRefs: 16,
  },
  {
    id: "google/gemini-3-pro-image",
    nome: "Nano Banana Pro (Gemini 3 Pro Image)",
    curto: "Nano Banana Pro",
    descricao: "O único com imagem em 4K. Bom para o quadro-chave que vira primeiro quadro do vídeo.",
    qualidades: null,
    resolucoes: ["1K", "2K", "4K"],
    fundos: null,
    proporcoes: ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9"],
    maxRefs: 14,
  },
  {
    id: "openai/gpt-image-2",
    nome: "GPT Image 2",
    curto: "GPT Image 2",
    descricao: "Geração anterior da OpenAI, até High e sem fundo transparente.",
    qualidades: ["auto", "low", "medium", "high"],
    resolucoes: null,
    fundos: ["auto", "opaque"],
    proporcoes: PROPORCOES_GPT,
    maxRefs: 16,
  },
];

export const MODELO_PADRAO = "openai/gpt-image-2.5-sunburst";
export const QUALIDADE_PADRAO: Qualidade = "high";

export const QUALIDADES: Record<Qualidade, string> = {
  auto: "Auto",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh",
  max: "Max",
};
export const FUNDOS: Record<Fundo, string> = { auto: "Automático", opaque: "Opaco", transparent: "Transparente" };

export const PROMPT_MAX = 32000;
export const IMAGENS_MAX = 16;

export function modeloPorId(id: string): ModeloImagem | undefined {
  return MODELOS.find((m) => m.id === id);
}

export type ParamsImagem = {
  modelo: string;
  qualidade: Qualidade;
  proporcao: string;
  resolucao: string;
  fundo: Fundo;
};

export const IMAGEM_PADRAO: ParamsImagem = {
  modelo: MODELO_PADRAO,
  qualidade: QUALIDADE_PADRAO,
  proporcao: "16:9",
  resolucao: "4K",
  fundo: "auto",
};

/* Encaixa os parâmetros no modelo: o que ele não tem cai para um valor
   que ele tem. Usado ao trocar de modelo e na validação do servidor. */
export function ajustarImagem(p: ParamsImagem): ParamsImagem {
  const m = modeloPorId(p.modelo) ?? MODELOS[0];
  return {
    modelo: m.id,
    qualidade: m.qualidades ? (m.qualidades.includes(p.qualidade) ? p.qualidade : "high") : p.qualidade,
    proporcao: m.proporcoes.includes(p.proporcao) ? p.proporcao : m.proporcoes[0],
    resolucao: m.resolucoes ? (m.resolucoes.includes(p.resolucao) ? p.resolucao : m.resolucoes[m.resolucoes.length - 1]) : p.resolucao,
    fundo: m.fundos ? (m.fundos.includes(p.fundo) ? p.fundo : "auto") : "auto",
  };
}

/* null = válido; texto = o motivo */
export function problemaImagem(p: ParamsImagem): string | null {
  const m = modeloPorId(p.modelo);
  if (!m) return "Modelo desconhecido.";
  if (m.qualidades && !m.qualidades.includes(p.qualidade)) return `O ${m.nome} não oferece esta qualidade.`;
  if (!m.proporcoes.includes(p.proporcao)) return `O ${m.nome} não oferece a proporção ${p.proporcao}.`;
  if (m.resolucoes && !m.resolucoes.includes(p.resolucao)) return `O ${m.nome} não oferece a resolução ${p.resolucao}.`;
  if (m.fundos && !m.fundos.includes(p.fundo)) return `O ${m.nome} não oferece este fundo.`;
  return null;
}

/* a descrição curta do que foi pedido, para a ficha e o consumo */
export function rotuloImagem(p: ParamsImagem): string {
  const m = modeloPorId(p.modelo);
  return [p.proporcao === "auto" ? "proporção automática" : p.proporcao, m?.resolucoes ? p.resolucao : null].filter(Boolean).join(" · ");
}

/* ---------- as funções das imagens de referência ----------
   São metadados: viram uma linha no prompt dizendo o que fazer com cada
   imagem (lib/ai-studio/prompt.ts). A API não tem campo para isso. */
export type FuncaoReferencia = "produto" | "estilo" | "composicao" | "personagem" | "cenario" | "geral";

export const FUNCOES: Record<FuncaoReferencia, { nome: string; instrucao: string }> = {
  produto: {
    nome: "Produto",
    instrucao: "produto. Reproduza fielmente forma, embalagem, rótulo, cores e proporções",
  },
  estilo: {
    nome: "Estilo visual",
    instrucao: "estilo visual. Use a paleta, a luz, a textura e o tratamento de imagem, sem copiar o conteúdo",
  },
  composicao: {
    nome: "Composição",
    instrucao: "composição. Siga o enquadramento, o ângulo de câmera e a posição dos elementos",
  },
  personagem: {
    nome: "Personagem",
    instrucao: "personagem. Mantenha a identidade, o rosto, o corpo e o figurino",
  },
  cenario: { nome: "Cenário", instrucao: "cenário. Use este ambiente como locação" },
  geral: { nome: "Referência geral", instrucao: "referência geral de clima e direção de arte" },
};

export type Referencia = { caminho: string; funcao: FuncaoReferencia };

export const PRESERVACOES = [
  "Preservar exatamente a embalagem.",
  "Não modificar o rosto.",
  "Manter a câmera na mesma posição.",
  "Preservar a iluminação.",
  "Alterar apenas o fundo.",
];

export const SUGESTOES_EDICAO = [
  "Trocar o cenário",
  "Alterar a iluminação",
  "Remover objetos",
  "Melhorar a composição",
  "Mudar o enquadramento",
  "Adicionar elementos",
  "Preservar produto e alterar fundo",
];

/* Movimentos de câmera em um toque, para o prompt de vídeo. */
export const MOVIMENTOS = [
  "Câmera se aproxima lentamente (push-in).",
  "Travelling lateral suave.",
  "Órbita de 180° em volta do produto.",
  "Câmera fixa, só o sujeito se move.",
  "Em câmera lenta (slow motion).",
  "Plano aéreo descendo.",
];
