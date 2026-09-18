/* ============================================================
   OS TIPOS DA OFICINA

   Espelho de `supabase/producao.sql`. A mesma disciplina do CRM: os
   estados moram num array `as const`, e o TypeScript recusa o build se uma
   tela inventar um status que o banco não aceita.
   ============================================================ */

/* A ordem aqui é a ordem do trabalho, e é dela que a tela tira a régua de
   progresso: nova → colhendo → colhida → catalogo → pronta. `erro` fica
   fora da régua de propósito, porque ele não é uma etapa, é uma parada. */
export const ETAPAS = ["nova", "colhendo", "colhida", "catalogo", "pronta"] as const;
export type Etapa = (typeof ETAPAS)[number];
export type Status = Etapa | "erro";

export const ROTULO_STATUS: Record<Status, string> = {
  nova: "Nova",
  colhendo: "Colhendo",
  colhida: "Colhida",
  catalogo: "Catálogo lido",
  pronta: "Pronta",
  erro: "Falhou",
};

/* O que a tela mostra embaixo do rótulo: o status diz onde a loja está, a
   nota diz o que fazer em seguida. Sem isso, "colhida" e "catálogo lido"
   parecem a mesma coisa para quem abriu a tela depois do almoço. */
export const NOTA_STATUS: Record<Status, string> = {
  nova: "ninguém colheu ainda",
  colhendo: "buscando no Instagram",
  colhida: "imagens no lugar, falta ler o catálogo",
  catalogo: "produtos lidos, falta você conferir",
  pronta: "revisada e pronta para exportar",
  erro: "a última colheita parou no meio",
};

/* ---------- a ficha da marca ----------
   Ela é o único bloco preenchido por você e não pela API, e mora em jsonb
   justamente porque ainda vai mudar de forma. Todo campo é opcional: uma
   loja recém-colhida tem ficha vazia e a tela precisa desenhar isso sem
   quebrar. */
export type Identidade = {
  /* Extraída das próprias fotos no navegador, e depois corrigida à mão. A
     ordem importa: a primeira é a cor que a marca usa mais, não a mais
     bonita. */
  paleta?: string[];
  /* Se a vitrine nasce em papel ou em grafite. É a decisão que muda mais
     coisa no template e a que menos se percebe olhando fotos soltas. */
  fundo?: "claro" | "escuro";
  /* A MATÉRIA do fundo (papel liso, papel com grão, linho, concreto,
     grafite, preto). `fundo` diz se o texto é claro ou escuro; a
     superfície diz do que o fundo é feito, e é ela que dá caráter antes de
     qualquer foto entrar. Guarda o id; o CSS mora no componente e viaja
     para o briefing. */
  superficie?: string;
  tipografia?: string;
  observacoes?: string;
};

export type Loja = {
  id: string;
  owner_id: string;
  lead_id: string | null;
  arroba: string;
  nome: string | null;
  bio: string | null;
  site: string | null;
  seguidores: number | null;
  publicacoes: number | null;
  avatar: string | null;
  identidade: Identidade;
  /* Os dois entram depois da criação: `lugar` na colheita, `condicoes` por
     você. Nulos até lá, e a tela desenha a ausência sem quebrar. */
  lugar: Lugar | null;
  condicoes: Condicoes | null;
  conceito: Conceito | null;
  /* O que o catálogo exige: volume, foto, variação, preço, clique,
     categorias, esgotado e o arquétipo de layout. Ver lib/producao/forma.ts,
     onde mora o tipo inteiro e a inferência. */
  forma: Forma | null;
  /* O texto colhido do link da bio (linktree, site antigo). É a única
     fonte de preço que não depende de perguntar ao cliente. */
  link_bio: string | null;
  /* O endereço da prévia no ar (Vercel), colado à mão na ficha: é o
     {link} dos toques da prévia no CRM. */
  previa_url: string | null;
  status: Status;
  nota: string | null;
  colhido_em: string | null;
  criado_em: string;
};

export type Ativo = {
  id: string;
  loja_id: string;
  media_id: string;
  ordem: number;
  tipo: string | null;
  caminho: string;
  legenda: string | null;
  permalink: string | null;
  publicado_em: string | null;
  curtidas: number | null;
  comentarios: number | null;
};

/* ---------- as quatro perguntas que só o dono da loja responde ----------
   Frete, pagamento, retirada e troca aparecem no TOPO de toda vitrine e
   mudam a decisão de compra. Nenhuma está no Instagram, nenhuma sai de
   API. Ficam guardadas por loja para serem perguntadas uma vez, em vez de
   descobertas no meio da conversa e digitadas direto na página. */
export type Condicoes = {
  frete?: string;
  pagamento?: string;
  retirada?: string;
  troca?: string;
};

import type { Forma } from "./forma";

/* A geração de um prompt, do jeito que a ficha lista: sem o markdown.
   Carregar cinco prompts inteiros para desenhar cinco linhas de data seria
   pagar cinco vezes por uma informação que ninguém pediu; o texto vem
   quando você clica em copiar. */
export type VersaoPrompt = {
  id: string;
  criado_em: string;
  modo: "previa" | "completa" | "ajuste";
};

/* ---------- o conceito da marca ----------
   O que a vitrine diz antes de mostrar preço. Metade sai da conversa com
   o cliente (público, promessa, o que evitar) e metade se DEDUZ do que já
   foi colhido: a nota do Google, a cidade da bio, as marcas que
   apareceram nas fotos.

   `autoridade` é a lista de fatos conferíveis que a loja pode reivindicar,
   e é a única coisa que uma loja de bairro tem para oferecer contra um
   e-commerce grande. `evitar` é o campo mais subestimado: o gerador tem
   padrão forte de fábrica, e o que o desvia é a negativa. */
export type Conceito = {
  /* A voz, agora UMA. Ela continua sendo gravada como lista de um item
     porque a ficha antiga guardou assim e porque o compilado já lê daqui:
     trocar o formato obrigaria a uma conversão em três arquivos para não
     ganhar nada. `tom` é a fonte da verdade; `personalidade` é o espelho. */
  personalidade?: string[];
  familia?: "direta" | "proxima" | "contida" | "autoral" | null;
  tom?: string | null;
  /* A palavra do botão. Ela sai do tom escolhido e continua editável: é o
     texto que aparece mais vezes na vitrine inteira, e é o lugar onde a
     dona da loja tem opinião. */
  cta?: string;
  /* Verdadeiro depois que você mexeu na palavra à mão. É o que faz trocar
     de tom PERGUNTAR antes de sobrescrever, em vez de apagar em silêncio. */
  cta_editado?: boolean;
  /* As palavras que não podem aparecer, literalmente. Diferente de
     `evitar`, que é posicionamento e se interpreta: esta lista não se
     interpreta, e é ela que segura o vocabulário de fábrica do gerador. */
  proibidas?: string[];
  autoridade?: string[];
  publico?: string;
  promessa?: string;
  evitar?: string;
};

/* O bloco do Google, com a forma que o Google dá. A vitrine IMPRIME o que
   está aqui, então o horário fica como texto por dia, do jeito que vem:
   converter para estrutura só para reimprimir é trabalho que erra. */
export type Lugar = {
  place_id?: string | null;
  nome?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  horario?: string[] | null;
  nota?: number | null;
  avaliacoes?: number | null;
  maps?: string | null;
  site?: string | null;
};

export type Produto = {
  id: string;
  loja_id: string;
  ativo_id: string | null;
  /* As outras fotos DA MESMA peça (ids de prod_ativos), que o carrossel
     traz e que a vitrine usa na página do produto. Sem isso, cada ângulo
     do mesmo tênis viraria um produto repetido na página. */
  fotos_extras: string[] | null;
  ordem: number;
  nome: string;
  /* As duas saem da FOTO, não da legenda: marca é o logo visível e cor é
     o que se vê. Marca vira a faixa de marcas da vitrine; cor vira filtro. */
  marca: string | null;
  cor: string | null;
  preco: number | null;
  preco_de: number | null;
  tamanhos: string | null;
  categoria: string | null;
  descricao: string | null;
  revisado: boolean;
  /* Estrelada: entra no hero e entra nas doze da prévia. As duas coisas
     de uma vez, porque são a mesma pergunta feita duas vezes: qual foto
     desta loja aguenta ser a primeira que alguém vê. */
  destaque: boolean;
  /* A posição no hero. Nulo é estrelada sem posição, e vai para o fim. */
  ordem_destaque: number | null;
};

/* O produto ainda sem id, do jeito que sai do modelo. `descartar` é o que
   impede a legenda "bom dia, hoje abrimos às 9h" de virar item de catálogo:
   é mais barato deixar o modelo marcar o que não é produto do que você
   apagar quinze linhas depois. */
export type ProdutoLido = {
  media_id: string;
  nome?: string;
  marca?: string | null;
  cor?: string | null;
  /* O media_id da foto que mostra esta MESMA peça, quando esta aqui é
     outro ângulo. É o que junta o carrossel em um produto só. */
  mesma_peca_que?: string | null;
  preco?: number | null;
  preco_de?: number | null;
  tamanhos?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  descartar?: boolean;
};

/* O arroba do jeito que o banco guarda: sem @, sem URL, minúsculo. Vale
   para o que você digita e para o que a API devolve, e é o que faz o índice
   único servir de trava. */
export function normalizarArroba(bruto: string): string {
  return bruto
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?instagram\.com\//, "")
    .replace(/[@\s]/g, "")
    .replace(/\/.*$/, "")
    .replace(/[^a-z0-9._]/g, "");
}

/* Preço em texto para a tabela e para a exportação. Sem `Intl` de moeda: o
   que sai daqui vai para CSV e para SQL, onde "R$ 1.299,90" é um problema e
   1299.90 é um número. A tela formata na hora de mostrar. */
export function precoTexto(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  return v.toFixed(2);
}

/* O contrário: o que você digita ("1.299,90", "R$ 89", "89,90") virando
   número. Devolve null em vez de NaN, porque null é "sem preço" e NaN é uma
   bomba que só estoura três telas depois. */
export function precoNumero(bruto: string): number | null {
  const limpo = bruto.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}
