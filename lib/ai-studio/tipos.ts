/* As linhas do supabase/ai-studio.sql, como a tela as recebe. */
import type { Referencia } from "./modelos";

export const BUCKET = "ai-studio";

export type OrigemImagem = "criar" | "editar" | "variacao" | "quadro" | "upload";

export type ImagemLinha = {
  id: string;
  projeto_id: string | null;
  quadro_id: string | null;
  pai_id: string | null;
  raiz_id: string | null;
  origem: OrigemImagem;
  prompt: string;
  prompt_final: string | null;
  preservar: string | null;
  modelo: string | null;
  qualidade: string | null;
  tamanho_pedido: string | null;
  formato: string | null;
  fundo: string | null;
  largura: number | null;
  altura: number | null;
  referencias: Referencia[];
  caminho: string | null;
  miniatura: string | null;
  status: "gerando" | "pronta" | "falhou";
  erro: string | null;
  usage: unknown;
  custo_usd: number | null;
  duracao_ms: number | null;
  apagada_em: string | null;
  created_at: string;
};

/* A imagem com os endereços assinados (1 hora). */
export type Imagem = ImagemLinha & { url: string | null; urlMini: string | null };

export type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  capa_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjetoResumo = Projeto & { capaUrl: string | null; total: number };

export type Quadro = {
  id: string;
  projeto_id: string;
  ordem: number;
  nome: string;
  imagem_id: string | null;
  created_at: string;
};

/* o quadro com a versão atual e as anteriores, como a timeline o mostra */
export type QuadroVista = Quadro & { imagem: Imagem | null; versoes: Imagem[] };

export type Config = { limite_mensal_usd: number | null; confirmar_antes: boolean };

/* uma linha do consumo: imagem ou vídeo */
export type LinhaConsumo = {
  id: string;
  tipo: "imagem" | "video";
  created_at: string;
  modelo: string | null;
  detalhe: string;
  custo_usd: number | null;
};

export type VideoLinha = {
  id: string;
  projeto_id: string | null;
  prompt: string;
  prompt_final: string | null;
  modelo: string;
  resolucao: string | null;
  proporcao: string | null;
  duracao: number | null;
  audio: boolean;
  primeiro_id: string | null;
  ultimo_id: string | null;
  referencias: Referencia[];
  job_id: string | null;
  status: "pendente" | "gerando" | "baixando" | "pronta" | "falhou";
  erro: string | null;
  caminho: string | null;
  bytes: number | null;
  custo_usd: number | null;
  estimativa_usd: number | null;
  concluido_em: string | null;
  apagada_em: string | null;
  created_at: string;
};

/* o vídeo com o endereço assinado (1 hora) e a miniatura do 1º quadro */
export type Video = VideoLinha & { url: string | null; poster: string | null };

export type Consumo = {
  totalMes: number;
  /* gerações prontas do mês que voltaram sem custo */
  semDado: number;
  geracoes: number;
  linhas: LinhaConsumo[];
};

/* O que a página passa para as telas cliente. */
export type Contexto = {
  uid: string;
  temChave: boolean;
  semTabela: boolean;
  config: Config;
  consumo: Consumo;
  projetos: ProjetoResumo[];
};
