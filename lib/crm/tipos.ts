/* ============================================================
   O VOCABULÁRIO DO CRM

   Tudo que o banco escreve em inglês-de-coluna e a tela precisa ler em
   português vive aqui: os oito estágios, os quatro tipos de projeto, as
   cinco origens, os seis canais, os seis motivos de perda.

   POR QUE NUM ARQUIVO SÓ: são as mesmas listas que aparecem no `check`
   do Postgres, no dropdown do modal, no cabeçalho da coluna do kanban e
   no gráfico de métricas. Espalhadas, elas divergem no dia em que um
   estágio novo entrar, e a divergência aparece como coluna vazia em vez
   de erro. Aqui, o TypeScript recusa o build.
   ============================================================ */

/* A ORDEM DESTE ARRAY É A ORDEM DO QUADRO, e é a única fonte dela: o banco
   guarda o conjunto de valores aceitos, não a sequência. Mudar a ordem aqui
   move a coluna no kanban e a etapa no funil das métricas, sem migração.

   `previa` é a etapa em que o Rafael desenha o site e manda para a pessoa
   ver, sem cobrar. Ela mora entre `conversa` e `proposta` porque é assim
   que ela funciona na prática: mostra, e só então cobra. Antes de existir,
   ela acontecia escondida dentro de `conversa`, e o quadro mostrava com a
   mesma cara um lead que só trocou mensagens e um lead que já viu o próprio
   site desenhado. */
export const ESTAGIOS = [
  "lista",
  "contatado",
  "follow_up",
  "conversa",
  "previa",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const;
export type Estagio = (typeof ESTAGIOS)[number];

/* Os dois destinos. Eles saíram da fileira do kanban e viraram uma placa de
   resultado no fim do quadro: não são etapas do caminho, são as duas saídas
   dele, e como colunas recolhidas viravam duas lombadas verticais ilegíveis
   ocupando a mesma largura de uma etapa viva. */
export const ESTAGIOS_FECHADOS = ["ganho", "perdido"] as const;
/* O que o quadro desenha como coluna. */
export const ESTAGIOS_DO_QUADRO = ESTAGIOS.filter(
  (e) => e !== "ganho" && e !== "perdido",
) as readonly Estagio[];

/* Os seis em que o negócio ainda está de pé. Ganho e perdido são as duas
   saídas, e é essa separação que decide quem aparece no painel Hoje, quem
   entra na soma do pipeline aberto e quem precisa de próximo passo. */
export const ESTAGIOS_ATIVOS = ESTAGIOS.filter(
  (e) => e !== "ganho" && e !== "perdido",
) as readonly Estagio[];

export const ehAtivo = (e: Estagio) => e !== "ganho" && e !== "perdido";

export const NOME_ESTAGIO: Record<Estagio, string> = {
  lista: "Lista",
  contatado: "Contatado",
  follow_up: "Follow-up",
  conversa: "Conversa",
  previa: "Prévia",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

/* A legenda de cada coluna, em duas ou três palavras. Ela vive no cabeçalho
   do quadro e existe por uma razão prática: "Lista" e "Prévia" são nomes
   internos, e um quadro de nove etapas precisa dizer o que cada uma quer
   dizer sem que ninguém tenha que lembrar. */
export const NOTA_ESTAGIO: Record<Estagio, string> = {
  lista: "achei, ainda não falei",
  contatado: "mandei a primeira",
  follow_up: "insistindo",
  conversa: "respondeu, está falando",
  previa: "desenhei e mandei ver",
  proposta: "preço na mesa",
  negociacao: "ajustando para fechar",
  ganho: "fechou",
  perdido: "não vai",
};

export const TIPOS_PROJETO = ["vitrine", "ecommerce", "landing", "site"] as const;
export type TipoProjeto = (typeof TIPOS_PROJETO)[number];

export const NOME_TIPO: Record<TipoProjeto, string> = {
  vitrine: "Vitrine digital",
  ecommerce: "E-commerce",
  landing: "Landing page",
  site: "Site institucional",
};

/* A etiqueta do card não cabe "Site institucional" ao lado do ticket, e o
   card é onde esse dado é lido cem vezes por dia. Forma curta para lá,
   forma inteira para o formulário e o filtro. */
export const SIGLA_TIPO: Record<TipoProjeto, string> = {
  vitrine: "VITRINE",
  ecommerce: "E-COMM",
  landing: "LANDING",
  site: "SITE",
};

export const ORIGENS = ["prospeccao", "indicacao", "trafego_pago", "inbound", "evento"] as const;
export type Origem = (typeof ORIGENS)[number];

export const NOME_ORIGEM: Record<Origem, string> = {
  prospeccao: "Prospecção",
  indicacao: "Indicação",
  trafego_pago: "Tráfego pago",
  inbound: "Formulário do site",
  evento: "Evento",
};

export const CANAIS = ["whatsapp", "instagram", "ligacao", "email", "reuniao", "proposta"] as const;
export type Canal = (typeof CANAIS)[number];

export const NOME_CANAL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  ligacao: "Ligação",
  email: "E-mail",
  reuniao: "Reunião",
  proposta: "Proposta",
};

export type Direcao = "saida" | "entrada";

export const NOME_DIRECAO: Record<Direcao, string> = {
  saida: "Eu falei",
  entrada: "Responderam",
};

export const MOTIVOS_PERDA = [
  "preco",
  "sem_resposta",
  "timing",
  "fechou_com_outro",
  "fora_do_perfil",
  "desistiu",
] as const;
export type MotivoPerda = (typeof MOTIVOS_PERDA)[number];

export const NOME_MOTIVO: Record<MotivoPerda, string> = {
  preco: "Preço",
  sem_resposta: "Sumiu, sem resposta",
  timing: "Não é a hora",
  fechou_com_outro: "Fechou com outro",
  fora_do_perfil: "Fora do perfil",
  desistiu: "Desistiu do projeto",
};

export const CATEGORIAS_TEMPLATE = [
  "abertura_fria",
  "abertura_morna",
  /* O segundo toque, que só existe depois de uma resposta: é onde a
     apresentação, a prévia e o link do exemplo cabem sem queimar a
     conversa. Ele é uma categoria própria e não um follow-up porque
     follow-up é insistir sem resposta, e este é o contrário disso. */
  "segundo_toque",
  /* A ESCADA DO SILÊNCIO mora em `follow_up`, e a ORDEM dos templates
     dentro dela é a escada: o primeiro retorno é o primeiro template de
     follow-up, o segundo é o segundo. Não são duas categorias porque os
     dois têm a mesma natureza (voltar em quem não respondeu); o que muda
     é o trabalho de cada um. Ver `degrauDoSilencio` em regras.ts. */
  "follow_up",
  /* Encerrar é uma DECISÃO, não mais um retorno, e por isso tem categoria
     própria: separada, ela aparece na tela como a alternativa a insistir
     de novo, que é exatamente a escolha que existe ali. */
  "encerramento",
  "indicacao",
  "objecao",
  /* A prévia é a etapa que separa este estúdio dos outros (desenha e manda
     ver antes de cobrar), e até 19/08 era a única do funil sem texto
     nenhum: a hora mais importante do processo era improvisada toda vez. */
  "previa",
  "proposta",
  "reativacao",
] as const;
export type CategoriaTemplate = (typeof CATEGORIAS_TEMPLATE)[number];

export const NOME_CATEGORIA: Record<CategoriaTemplate, string> = {
  abertura_fria: "Abertura fria",
  abertura_morna: "Abertura morna",
  segundo_toque: "Segundo toque",
  follow_up: "Retorno sem resposta",
  encerramento: "Encerramento",
  indicacao: "Indicação",
  objecao: "Objeção",
  previa: "Prévia",
  proposta: "Proposta",
  reativacao: "Reativação",
};

/* ============================================================
   O DOSSIÊ — o que a pesquisa com IA escreve na coluna `dossie`

   Um documento, não uma tabela: a rota /api/crm/pesquisa manda a IA
   pesquisar o negócio na web e grava aqui o que achou. `status` existe
   porque a pesquisa demora um ou dois minutos e a ficha precisa saber se
   está esperando, se deu certo ou se falhou; `pesquisando` sem resultado
   novo é o estado que o botão "Refazer" resolve.
   ============================================================ */

export type Dossie = {
  status: "pesquisando" | "ok" | "erro";
  /* só quando status = "erro": a frase para mostrar na ficha */
  erro?: string;
  gerado_em?: string;
  /* o que o negócio é, em duas ou três frases */
  resumo?: string;
  /* os achados sobre a presença digital, um por linha: tem site? o link
     da bio leva aonde? as avaliações aparecem em algum lugar? */
  presenca?: string[];
  /* a dor provável, na lente do que o estúdio vende */
  dor?: string;
  /* o gancho concreto para abrir conversa */
  gancho?: string;
  /* O PRIMEIRO TOQUE: duas linhas, uma pergunta, sem oferta e sem link.
     É a mensagem que cabe inteira na notificação do WhatsApp, e é ali,
     na notificação, que a pessoa decide se abre. Tudo que denuncia venda
     antes de ela abrir (a apresentação, o cartão de preview do link, as
     cinco frases perfeitas) mora na `mensagem`, não aqui. */
  abertura?: string;
  /* O SEGUNDO TOQUE, para depois que a pessoa responder: aí sim a
     apresentação, a prévia sem compromisso e o link do exemplo. Depois de
     uma resposta, texto comprido lê como cuidado; antes dela, lê como
     mala direta. Dossiês gerados antes de 19/08/2026 só têm este campo. */
  mensagem?: string;
  ticket_sugerido?: number | null;
  fontes?: { titulo: string; url: string }[];
  /* o que esta pesquisa custou no OpenRouter, em dólares; o painel de uso
     deles fica a um clique de distância, mas o custo por lead pertence ao
     lead */
  custo_usd?: number;
  /* o que a pesquisa CONFIRMOU sobre o negócio, para preencher a ficha.
     A rota aplica isso só nos campos vazios do lead, nunca por cima do
     que o Rafael digitou; `cadastro_aplicado` registra quais entraram. */
  cadastro?: {
    empresa?: string | null;
    instagram?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    nicho?: string | null;
    cidade?: string | null;
  };
  cadastro_aplicado?: string[];
  /* o projeto do portfólio que a IA escolheu como prova social para ESTE
     público; sempre validado contra data/portfolio.ts na volta */
  exemplo?: { nome: string; url: string };
  /* a qualificação do lead na lente do que o estúdio vende:
       quente ... sem site ou presença própria: o prospect ideal
       morno .... tem presença, mas com furo real e citável
       frio ..... já bem servido (loja própria completa): não perder tempo
     Lead frio vem SEM mensagem de propósito: pitch forçado para quem não
     tem a dor queima a credibilidade da prospecção inteira. */
  veredito?: "quente" | "morno" | "frio";
  veredito_motivo?: string;
};

/* ============================================================
   AS LINHAS DO BANCO
   ============================================================ */

export type Lead = {
  id: string;
  owner_id: string;
  nome: string;
  empresa: string | null;
  instagram: string | null;
  whatsapp: string | null;
  email: string | null;
  nicho: string | null;
  cidade: string | null;
  tipo_projeto: TipoProjeto | null;
  ticket_estimado: number | null;
  origem: Origem;
  indicado_por: string | null;
  estagio: Estagio;
  posicao: number;
  proximo_passo: string | null;
  proxima_acao_em: string | null;
  ultimo_toque_em: string | null;
  entrou_no_estagio_em: string;
  motivo_perda: MotivoPerda | null;
  valor_fechado: number | null;
  fechado_em: string | null;
  notas: string | null;
  dossie: Dossie | null;
  created_at: string;
  updated_at: string;
};

/* O que a view `crm_leads_painel` acrescenta: os três números que só a
   tabela de interações sabe. `saidas_seguidas` é o coração da regra dos 2
   retornos (quantas vezes eu falei desde a última vez que responderam). */
export type LeadPainel = Lead & {
  toques: number;
  toques_entrada: number;
  saidas_seguidas: number;
};

export type Interacao = {
  id: string;
  lead_id: string;
  canal: Canal;
  direcao: Direcao;
  resumo: string | null;
  created_at: string;
};

export type Template = {
  id: string;
  titulo: string;
  canal: string;
  categoria: CategoriaTemplate | null;
  conteudo: string;
  ordem: number;
};

export type Meta = { id: string; toques_semana: number };
