/* ============================================================
   A FORMA — o que o catálogo exige

   Marca diz a cor, conceito diz a voz, e nada dizia a ESTRUTURA. Estes
   campos não são gosto: o catálogo os determina. Sessenta peças com foto
   quadrada e numeração pedem uma página; oito peças de corpo inteiro pedem
   outra, e a diferença não é de estilo, é de o que cabe na tela.

   ---------- inferido não é decidido ----------
   Quase tudo aqui pode ser deduzido do catálogo já lido, e é. Mas dedução e
   decisão não podem ter a mesma cara na tela: por isso cada campo carrega a
   ORIGEM (`inferido` ou `confirmado`), e um campo que ninguém confirmou
   continua parecendo palpite até você tocar nele.

   O que NÃO dá para deduzir do texto (proporção da foto, fundo branco) fica
   sem valor até você mandar ler as fotos. Campo em branco é honesto; campo
   com chute é uma decisão que você não tomou.
   ============================================================ */

import type { Produto } from "./tipos";

export type Faixa = "curto" | "medio" | "longo";
export type Foto = "objeto" | "corpo" | "still" | "misto";
export type Variacao = "numeracao" | "grade" | "cor" | "nenhuma";
export type Preco = "visivel" | "a_partir" | "consulta";
export type Clique = "whatsapp" | "modal" | "pagina";
export type Esgotado = "some" | "cinza" | "avisa";
export type Layout = "feira" | "vitrine" | "prateleira" | "ficha";
export type Origem = "inferido" | "confirmado";

/* ---------- o hero ----------
   O layout resolve o resto da página; o hero resolve a primeira tela, e
   as duas decisões não são a mesma. Um catálogo longo pede grade densa
   embaixo E pode abrir com uma foto só sangrando em cima: quem decide o
   segundo é o tipo de foto, não o volume. */
export type HeroArquetipo = "mosaico" | "letreiro" | "peca_unica" | "grade_entrada";
export type NFotos = 0 | 1 | 3 | 5 | 7;

/* ---------- a FAIXA saiu (27/08) ----------
   Ela era um trilho horizontal de fotos acima da dobra, e trilho acima da
   dobra no celular é carrossel manual: o engajamento cai pela metade já no
   segundo item e quase todo clique fica no primeiro. Ela resolvia o caso
   "catálogo longo com categorias", que a GRADE DE ENTRADA resolve melhor,
   porque quem chega numa loja multimarcas quer ENTRAR em algum lugar, e
   não olhar uma capa.

   Ficha salva com `faixa` não quebra: ela abre na grade. */
export function arquetipoAtual(salvo: string | null | undefined): HeroArquetipo | null {
  if (salvo === "faixa") return "grade_entrada";
  return (salvo as HeroArquetipo) ?? null;
}
export type TextoHero = "bio" | "conceito" | "nome";
export type Dobra = "so_hero" | "com_fileira";

export type Hero = {
  arquetipo: HeroArquetipo | null;
  n_fotos: NFotos | null;
  texto: TextoHero | null;
  dobra: Dobra | null;
  /* NÃO é arquétipo: é um modificador, e vale para os quatro. Loja
     multimarcas desconhecida empresta credibilidade das marcas que vende, e
     essa é quase sempre a única credibilidade que ela tem na primeira
     tela. */
  tira_marcas: boolean | null;
  /* As marcas apuradas do catálogo, para a tela mostrar o que achou. O
     compilado NÃO usa esta lista: ele recalcula na hora de gerar, porque
     uma leitura de catálogo depois desta a deixa velha em silêncio. */
  marcas: string[];
};

export type Forma = {
  volume: number | null;
  faixa: Faixa | null;
  foto: Foto | null;
  variacao: Variacao[];
  preco: Preco | null;
  clique: Clique | null;
  categorias: boolean | null;
  n_categorias: number | null;
  esgotado: Esgotado | null;
  layout: Layout | null;
  hero: Hero | null;
  /* Três chaves não são campos de `Forma`, e elas estão aqui de propósito:
     `hero_fotos` porque o número de fotos é inferido junto com o arquétipo
     do hero mas se decide separado dele, e `destaques` porque a tira de
     peças escolhidas mora no CATÁLOGO e precisa de um lugar para dizer se
     as estrelas são suas ou do botão. Guardar isso num jsonb que já existe
     é mais barato que uma coluna nova para um booleano. */
  origem: Partial<
    Record<keyof Omit<Forma, "origem"> | "hero_fotos" | "destaques", Origem>
  >;
};

export const FORMA_VAZIA: Forma = {
  volume: null,
  faixa: null,
  foto: null,
  variacao: [],
  preco: null,
  clique: null,
  categorias: null,
  n_categorias: null,
  esgotado: null,
  layout: null,
  hero: null,
  origem: {},
};

export const HERO_VAZIO: Hero = {
  arquetipo: null,
  n_fotos: null,
  texto: null,
  dobra: null,
  tira_marcas: null,
  marcas: [],
};

/* ---------- as faixas ----------
   Quinze é o ponto em que filtro e categoria deixam de ajudar e passam a
   ser mobília: abaixo disso a loja inteira cabe numa tela e qualquer
   navegação é um passo a mais para ver o que já estava à vista. Sessenta é
   onde a rolagem simples começa a cansar e a página precisa de trilho ou
   grade densa. */
export function faixaDe(volume: number): Faixa {
  if (volume <= 15) return "curto";
  if (volume <= 60) return "medio";
  return "longo";
}

/* Numeração de calçado ("34 ao 39", "37/38") e grade de roupa ("P/M/G") são
   os dois jeitos que a loja escreve tamanho, e eles pedem componentes
   diferentes: um seletor de números longo e um de três a cinco letras. */
const TEM_NUMERACAO = /\b(3[0-9]|4[0-6])\b\s*(ao|a|\/|-|até)\s*\b(3[0-9]|4[0-6])\b|\b3[4-9]\b|\b4[0-6]\b/i;
const TEM_GRADE = /\b(PP|P|M|G|GG|XG|XGG)\b(\s*[\/,-]\s*(PP|P|M|G|GG|XG|XGG)\b)+/i;

/* ---------- o que o catálogo já responde ----------
   Roda com o que está no banco, sem tocar em imagem: volume, faixa,
   variação, preço e categorias. Devolve só os campos que ele consegue
   afirmar; o resto continua nulo, e nulo aqui quer dizer "ninguém sabe
   ainda", nunca "não tem". */
export function inferirDoCatalogo(produtos: Produto[]): Partial<Forma> {
  if (!produtos.length) return {};

  const volume = produtos.length;
  const faixa = faixaDe(volume);

  const textos = produtos.map((p) => [p.tamanhos, p.nome, p.descricao].filter(Boolean).join(" "));
  const variacao: Variacao[] = [];
  if (textos.some((t) => TEM_NUMERACAO.test(t))) variacao.push("numeracao");
  if (textos.some((t) => TEM_GRADE.test(t))) variacao.push("grade");

  /* Cor só conta como VARIAÇÃO quando a mesma peça aparece em cores
     diferentes: um catálogo onde cada peça tem uma cor própria não varia em
     cor, ele só é colorido. O teste é o nome sem a cor se repetir. */
  const semCor = produtos
    .filter((p) => p.cor)
    .map((p) => normal(p.nome).replace(normal(p.cor as string), "").trim());
  if (semCor.length && new Set(semCor).size < semCor.length) variacao.push("cor");

  if (!variacao.length) variacao.push("nenhuma");

  const comPreco = produtos.filter((p) => p.preco !== null).length;
  const preco: Preco = comPreco === 0 ? "consulta" : comPreco / volume >= 0.5 ? "visivel" : "a_partir";

  const grupos = new Set(produtos.map((p) => p.categoria).filter(Boolean));
  const categorias = grupos.size >= 3;

  return {
    volume,
    faixa,
    variacao,
    preco,
    categorias,
    n_categorias: categorias ? grupos.size : null,
  };
}

const normal = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ---------- o arquétipo ----------
   A regra é de estrutura, não de gosto: quem manda é o VOLUME e depois a
   existência de categoria. Foto de corpo e numeração só entram no desempate
   do catálogo curto, que é onde a página tem espaço para escolher.

   Sai sempre com um valor, e sempre marcado como inferido: o arquétipo é a
   soma de campos que também são palpite, e palpite sobre palpite precisa
   ficar visível. */
export function layoutDe(f: Partial<Forma>): Layout {
  const temCategoria = Boolean(f.categorias);
  if (f.faixa === "longo") return temCategoria ? "prateleira" : "feira";
  if (f.faixa === "medio") return temCategoria ? "prateleira" : "feira";
  if (f.foto === "corpo") return "vitrine";
  if ((f.variacao ?? []).includes("numeracao")) return "ficha";
  return "vitrine";
}

export const LAYOUTS: {
  id: Layout;
  nome: string;
  oque: string;
  quando: string;
  /* A descrição estrutural que vai INTEIRA para o prompt: é ela que
     transforma o nome do arquétipo em instrução de construção. */
  estrutura: string;
}[] = [
  {
    id: "feira",
    nome: "Feira",
    oque: "grid denso, card pequeno, filtro fixo no topo",
    quando: "catálogo longo, foto still ou mista",
    estrutura:
      "Grade densa: 2 colunas em 390px, 3 em 768px, 4 acima de 1100px. Card com proporção 1:1, nome em uma linha com reticências, preço logo abaixo. Filtro fixo no topo (categoria e tamanho) que acompanha a rolagem, e busca por nome. Peça esgotada segue a regra escolhida, sem sumir do contador.",
  },
  {
    id: "vitrine",
    nome: "Vitrine",
    oque: "poucas peças, card grande, rolagem longa, sem filtro",
    quando: "catálogo curto, foto de corpo",
    estrutura:
      "Uma coluna em 390px e duas acima de 900px, card grande em 4:5, muito ar entre as peças. Sem filtro e sem busca: com este volume, rolar é mais rápido que filtrar. O nome e o preço ficam abaixo da foto, alinhados à esquerda.",
  },
  {
    id: "prateleira",
    nome: "Prateleira",
    oque: "um trilho horizontal por categoria",
    quando: "catálogo médio ou longo com categorias",
    estrutura:
      "Um trilho horizontal por categoria, com o nome da categoria acima e rolagem lateral por toque. Card 1:1 ou 4:5 conforme a foto, três visíveis por vez em 390px. Sem filtro global: a categoria já é o filtro. A ordem dos trilhos segue a ordem do catálogo.",
  },
  {
    id: "ficha",
    nome: "Ficha",
    oque: "catálogo pequeno com muita informação por peça",
    quando: "variação por numeração, voz técnica",
    estrutura:
      "Lista vertical com uma peça por linha em telas pequenas e duas colunas acima de 900px. Cada peça mostra foto, nome, marca, cor, preço e a grade de tamanhos por extenso, mais tabela de medidas quando houver. Sem filtro; a informação por peça é o que a página vende.",
  },
];

/* ---------- o arquétipo do hero ----------
   A ordem das regras é a regra. Duas linhas carregam o peso:

   FOTO DE OBJETO CAI EM LETREIRO. Produto segurado na mão, com chão de loja
   atrás, funciona num card de 300px e desmonta num hero de 800px sangrando:
   o que era "a peça" vira "o chão". Nesse caso quem abre a página é a
   tipografia, e a foto entra pequena, do lado.

   FOTO MISTA CAI EM LETREIRO PELO MESMO MOTIVO. Sem consistência entre as
   fotos, mosaico vira colcha de retalho, e a primeira tela é o pior lugar
   para descobrir isso.

   A regra do trilho (longo + categorias) só alcança quem ainda não teve as
   fotos lidas: depois da leitura, o tipo de foto sempre responde antes. É
   proposital, e é o que faz o botão LER A FORMA DAS FOTOS valer o clique. */
export function heroDe(f: Partial<Forma>): HeroArquetipo {
  if (f.foto === "objeto") return "letreiro";
  if (f.foto === "misto") return "letreiro";
  /* CATEGORIA MANDA QUANDO EXISTE, e ela subiu na fila por isso: quem chega
     numa loja multimarcas quer entrar em algum lugar. Uma capa bonita atrasa
     essa decisão em uma rolagem inteira. */
  if (f.categorias && (f.faixa === "longo" || f.faixa === "medio")) return "grade_entrada";
  if (f.foto === "corpo") return f.faixa === "curto" ? "peca_unica" : "mosaico";
  if (f.foto === "still") return f.faixa === "curto" ? "peca_unica" : "mosaico";
  return "letreiro";
}

/* Quantas fotos cada arquétipo pede quando ninguém disse. Peça única é 1 por
   definição; letreiro abre em 1 porque uma foto pequena ao lado do nome dá
   escala e prova que existe produto; faixa começa em 5 porque menos que isso
   não é trilho. */
/* `null` na grade de entrada não é lacuna: o número de blocos não é escolha
   sua, é quantas categorias o catálogo tem, cortado em seis. */
export const FOTOS_PADRAO: Record<HeroArquetipo, NFotos | null> = {
  mosaico: 5,
  letreiro: 1,
  peca_unica: 1,
  grade_entrada: null,
};

/* A régua de cada arquétipo. Régua vazia quer dizer que a pergunta não
   existe: peça única é uma foto por definição, e na grade de entrada o
   número é o de categorias do catálogo. Letreiro tem uma pergunta de duas
   respostas, que é outra coisa (ter ou não ter foto), não uma quantidade. */
export const FOTOS_POSSIVEIS: Record<HeroArquetipo, NFotos[]> = {
  mosaico: [1, 3, 5, 7],
  letreiro: [0, 1],
  peca_unica: [],
  grade_entrada: [],
};

export const HEROS: {
  id: HeroArquetipo;
  nome: string;
  oque: string;
  quando: string;
  /* A descrição de estrutura que vai INTEIRA para o compilado. Ela nunca
     usa o nome do arquétipo: quem constrói a vitrine não sabe o que é um
     "mosaico", e "faça um mosaico" é a instrução mais vazia possível. */
  estrutura: (n: number) => string;
}[] = [
  {
    id: "mosaico",
    nome: "Mosaico",
    oque: "a foto manda, a marca pequena no topo",
    quando: "foto de corpo ou still, catálogo médio ou longo",
    estrutura: (n) =>
      `A primeira tela é uma grade irregular de ${n} ${n === 1 ? "foto" : "fotos"} ocupando de 85 a 100vh, sem margem lateral. Um bloco alto à esquerda vale por duas alturas; os outros se dividem à direita em blocos menores, todos com object-fit: cover. Vão de 6 a 8px entre eles, nunca mais. O nome da loja entra PEQUENO no topo à esquerda, caixa alta, sobre uma tarja da cor de fundo para não brigar com a foto. Nenhum texto grande sobre as imagens. O texto de posicionamento vem abaixo da grade, em uma ou duas linhas.`,
  },
  {
    id: "letreiro",
    nome: "Letreiro",
    oque: "o nome da loja em tipografia grande sobre a superfície",
    quando: "foto de objeto, ou marca de nome forte",
    estrutura: (n) =>
      `A primeira tela é tipográfica: o nome da loja composto na fonte de display definida acima, ocupando de 70 a 90% da largura, em uma ou duas linhas, sobre a superfície dos tokens. NENHUMA foto de fundo e nenhuma foto sangrando.${
        n ? " Uma foto entra como bloco pequeno ao lado do nome (ou abaixo dele em 390px), no máximo 40% da largura, proporção 4:5, para dar escala e provar que existe produto." : " Sem foto nenhuma nesta tela."
      } O texto de posicionamento fica sob o nome, em corpo, em uma linha.`,
  },
  {
    id: "peca_unica",
    nome: "Peça única",
    oque: "uma foto só, com nome e preço da peça",
    quando: "catálogo curto, curadoria, luxo discreto",
    estrutura: () =>
      "A primeira tela é UMA foto, sangrando de borda a borda, entre 70 e 85vh, com o produto no terço superior do enquadramento. Logo abaixo dela, duas linhas curtas e só: o nome da peça e o preço. O nome da loja fica no topo, pequeno, dentro de uma barra fina ou sobreposto com sombra suave. Mais nada nesta tela.",
  },
  {
    id: "grade_entrada",
    nome: "Grade de entrada",
    oque: "4 a 6 blocos de categoria, cada um com foto do catálogo",
    quando: "catálogo médio ou longo, com categoria",
    estrutura: (n) =>
      `A primeira tela é uma grade de entrada por categoria: ${n} ${n === 1 ? "bloco" : "blocos"} iguais em duas fileiras, três por fileira acima de 700px e dois abaixo disso. Cada bloco é uma CATEGORIA do catálogo, e a foto dele sai de uma peça real dessa categoria: nunca foto de campanha, nunca ícone, nunca ilustração. O nome da categoria vai sobre a foto, em tarja sólida na base do bloco, e não centralizado sobre a imagem inteira. Sem frase publicitária e sem botão dentro do bloco: o bloco inteiro é o link. O nome da loja fica acima da grade, pequeno.`,
  },
];


/* ============================================================
   A TIRA DE MARCAS

   Não é arquétipo: é modificador, e vale para os quatro. A razão é
   comercial e não estética. Quem chega numa vitrine de loja de bairro não
   conhece a loja, mas conhece Nike, Adidas e New Balance, e essa é quase
   sempre a única credibilidade que a primeira tela tem para oferecer.

   Duas peças da mesma marca é o piso: uma peça solta de uma marca famosa
   não é sortimento, é coincidência, e anunciá-la na abertura promete um
   estoque que não existe.
   ============================================================ */
const PECAS_POR_MARCA = 2;
const MARCAS_MINIMO = 3;
export const MARCAS_NA_TIRA = 6;

/* As marcas do catálogo que valem a tira, da maior para a menor. */
export function marcasDo(produtos: Produto[]): string[] {
  const conta = new Map<string, number>();
  for (const p of produtos) {
    const m = (p.marca ?? "").trim();
    if (m) conta.set(m, (conta.get(m) ?? 0) + 1);
  }
  return [...conta.entries()]
    .filter(([, n]) => n >= PECAS_POR_MARCA)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([m]) => m);
}

export const temTiraDeMarcas = (produtos: Produto[]) => marcasDo(produtos).length >= MARCAS_MINIMO;

/* ---------- as categorias, com a peça que abre cada uma ----------
   A grade de entrada precisa de uma foto por bloco, e a foto não pode ser
   qualquer uma: é a estrelada daquela categoria quando existe, porque foi
   ela que você escolheu olhando; senão a primeira da ordem do catálogo,
   que já é o ranking de engajamento quando ele existe. */
export const CATEGORIAS_NA_GRADE = 6;
export const CATEGORIAS_MINIMO = 3;

export function categoriasDo(
  produtos: Produto[],
): { categoria: string; pecas: number; peca: Produto }[] {
  const grupos = new Map<string, Produto[]>();
  for (const p of produtos) {
    const c = (p.categoria ?? "").trim();
    if (!c) continue;
    grupos.set(c, [...(grupos.get(c) ?? []), p]);
  }
  return [...grupos.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, CATEGORIAS_NA_GRADE)
    .map(([categoria, lista]) => ({
      categoria,
      pecas: lista.length,
      peca:
        [...lista].sort(
          (a, b) =>
            Number(b.destaque) - Number(a.destaque) ||
            (a.ordem_destaque ?? 1e9) - (b.ordem_destaque ?? 1e9) ||
            a.ordem - b.ordem,
        )[0],
    }));
}

/* ---------- as respostas de cada campo ----------
   Ficam aqui, e não na tela, porque o compilador precisa das mesmas
   palavras: o que aparece no chip é o que vai para o prompt, sem
   tradução no meio. */
export const OPCOES = {
  foto: [
    { id: "objeto" as Foto, nome: "Objeto na mão", nota: "produto segurado, fundo do dia a dia" },
    { id: "corpo" as Foto, nome: "Modelo de corpo inteiro", nota: "a peça vestida, cena" },
    { id: "still" as Foto, nome: "Still de fundo branco", nota: "produto recortado, catálogo" },
    { id: "misto" as Foto, nome: "Misto", nota: "sem dominância clara" },
  ],
  variacao: [
    { id: "numeracao" as Variacao, nome: "Numeração", nota: "34 ao 39" },
    { id: "grade" as Variacao, nome: "Grade P/M/G", nota: "roupa" },
    { id: "cor" as Variacao, nome: "Cor", nota: "a mesma peça em cores" },
    { id: "nenhuma" as Variacao, nome: "Não varia", nota: "peça única" },
  ],
  preco: [
    { id: "visivel" as Preco, nome: "Preço na peça", nota: "" },
    { id: "a_partir" as Preco, nome: "A partir de", nota: "" },
    { id: "consulta" as Preco, nome: "Sob consulta", nota: "" },
  ],
  clique: [
    { id: "whatsapp" as Clique, nome: "Vai direto pro WhatsApp", nota: "" },
    { id: "modal" as Clique, nome: "Abre a peça em modal", nota: "" },
    { id: "pagina" as Clique, nome: "Abre página da peça", nota: "" },
  ],
  esgotado: [
    { id: "some" as Esgotado, nome: "Some do catálogo", nota: "" },
    { id: "cinza" as Esgotado, nome: "Fica em cinza", nota: "" },
    { id: "avisa" as Esgotado, nome: 'Vira "avise-me"', nota: "" },
  ],
  hero_texto: [
    { id: "bio" as TextoHero, nome: "Bio do Instagram", nota: "" },
    { id: "conceito" as TextoHero, nome: "Frase do conceito", nota: "" },
    { id: "nome" as TextoHero, nome: "Só o nome da loja", nota: "" },
  ],
  hero_dobra: [
    { id: "so_hero" as Dobra, nome: "Só o hero", nota: "" },
    { id: "com_fileira" as Dobra, nome: "Hero e a primeira fileira do catálogo espiando", nota: "" },
  ],
};

/* As frases que o prompt usa para cada escolha. Imperativas e curtas: o
   compilador não interpreta, ele cola. */
export const EM_PROSA: Record<string, string> = {
  objeto: "As fotos são do produto segurado na mão, com fundo do dia a dia: o card não pode recortar o produto nem forçar fundo branco.",
  corpo: "As fotos são de modelo de corpo inteiro: use card alto (4:5 ou 3:4) e nunca corte a cabeça nem os pés no thumbnail.",
  still: "As fotos são still de fundo branco: card quadrado, o produto respirando dentro dele, sem sombra falsa.",
  misto: "As fotos são de formatos misturados: use um card de proporção fixa com object-fit: cover e centralize, para a grade não ficar irregular.",
  numeracao: "A peça varia por NUMERAÇÃO: mostre a faixa (ex.: 34 ao 39) na peça e leve os tamanhos para a mensagem do WhatsApp.",
  grade: "A peça varia por GRADE P/M/G: mostre as letras disponíveis na peça, em ordem.",
  cor: "A mesma peça aparece em CORES diferentes: agrupe as variações na mesma peça em vez de repeti-la no catálogo.",
  nenhuma: "As peças não têm variação: não crie seletor de tamanho nem de cor.",
  visivel: "O preço aparece na peça, em número, no catálogo e na página.",
  a_partir: 'Parte do catálogo tem preço: mostre o preço onde existir e "consulte" onde não existir. Nunca invente valor.',
  consulta: 'Nenhuma peça tem preço definido: escreva "consulte no WhatsApp" no lugar do preço, em todas. Não invente valor.',
  whatsapp: "O clique na peça vai DIRETO para o WhatsApp com a mensagem pronta. Sem página intermediária.",
  modal: "O clique abre a peça em modal, com as fotos extras e o botão de WhatsApp dentro.",
  pagina: "O clique abre uma página própria da peça, com URL própria.",
  some: "Peça esgotada some do catálogo.",
  bio: "O texto do hero é a BIO do Instagram, palavra por palavra, sem reescrever nem melhorar: ela já foi escrita pela dona da loja.",
  conceito: "O texto do hero é a promessa do conceito, na voz definida acima, em no máximo doze palavras.",
  nome: "O hero não leva frase: só o nome da loja.",
  so_hero: "Acima da dobra fica só o hero. O catálogo começa depois de uma rolagem inteira.",
  com_fileira: "Acima da dobra, além do hero, a PRIMEIRA FILEIRA do catálogo aparece pela metade: é ela que avisa que tem catálogo embaixo. Sem essa fileira, muita gente não rola.",
  cinza: "Peça esgotada fica visível em cinza, sem botão de pedido.",
  avisa: 'Peça esgotada fica visível e o botão vira "me avise quando voltar".',
};
