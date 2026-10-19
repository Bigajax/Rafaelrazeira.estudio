/* ============================================================
   OS CASOS (/casos e /casos/<slug>, 19/10/2026)

   O SEO do estúdio não vai por blog genérico ("5 dicas para vender no
   Instagram"): ele vai pelo que só o estúdio tem, que é a loja real
   contada por dentro. Cada caso é uma página que responde a busca de
   quem tem uma loja igual: "site para skate shop em Curitiba".

   O caso pendura no projeto do /portfolio pelo `slug`: nome, endereço e
   capa de notebook vêm de data/portfolio.ts, e a capa do celular de
   public/casos/<slug>-celular.webp (scripts/capturar-casos.mjs).

   ---------- a regra do texto ----------
   Tudo aqui sai da nota da loja no cofre (3 Clientes/), nunca de cabeça.
   - Número só MEDIDO, com a fonte e a data, e só com a loja de acordo.
     Sem número, o campo fica vazio e a seção some da página.
   - Fala da dona ou do dono só a que já está publicada (no site ou no
     perfil dela). Frase dita no WhatsApp ao estúdio não entra sem ela
     autorizar.
   - Nunca: valor pago, telefone, senha, fornecedor, bug interno.
   - Nunca loja que vende réplica: a página existe para ranquear, e o
     nome do estúdio ficaria colado nisso na busca (decidido em 19/10,
     quando a Japa e a Arena saíram da primeira leva por isso).
   - Sem travessão em texto visível.
   ============================================================ */

export type Caso = {
  /* o mesmo slug de data/portfolio.ts */
  slug: string;
  /* o ramo em poucas palavras, como a pessoa buscaria: "Skate shop" */
  nicho: string;
  cidade: string;
  /* <title> e description: são eles que aparecem na busca */
  titulo: string;
  descricao: string;
  /* a linha da faixa do hero, em caixa alta pelo CSS */
  chamada: string;
  /* um parágrafo, a história em três frases */
  resumo: string;
  /* como a loja vendia antes: fato da nota, nunca crítica à loja */
  antes: string[];
  /* o que foi feito, uma decisão por item */
  feito: { titulo: string; texto: string }[];
  /* números medidos; vazio até ter um com fonte e com a loja de acordo */
  numeros: { valor: string; rotulo: string; fonte: string }[];
  /* datas em ISO: a primeira prévia e o dia em que a vitrine foi ao ar */
  previa: string;
  noAr: string;
  /* a última vez que o texto foi conferido contra a nota e o site */
  conferido: string;
};

export const casos: Caso[] = [
  {
    slug: "fulltime",
    nicho: "Skate shop",
    cidade: "Curitiba, PR",
    titulo: "Full Time Skateboards: vitrine digital de skate shop em Curitiba",
    descricao: "Como a Full Time Skateboards, skate shop da Galeria Xaxim em Curitiba, tirou o catálogo do feed e passou a vender pelo próprio site, com pedido no WhatsApp e painel no celular.",
    chamada: "Skate shop em Curitiba",
    resumo: "A Full Time é uma skate shop na Galeria Xaxim, em Curitiba, com roupa, tênis e peça de skate. As peças moravam no feed, o preço era passado no WhatsApp e o domínio da loja abria um site vazio. Hoje o domínio abre a loja inteira, com preço, numeração e o pedido já escrito para o WhatsApp.",
    antes: [
      "As peças existiam só nas postagens do Instagram, e nenhuma tinha preço publicado: quem queria saber, perguntava no WhatsApp.",
      "O domínio fulltimeskateboards.com.br já era da loja, mas abria uma página vazia de sistema, sem produto nenhum.",
    ],
    feito: [
      { titulo: "A loja separada por departamento", texto: "Roupas, Tênis, Skate e Marcas no topo, como numa loja grande. A marca vira filtro: tocar no adesivo da Chaze mostra só a Chaze." },
      { titulo: "Só preto, branco e o cinza da lixa", texto: "A identidade da loja é monocromática, e o site seguiu: nenhuma segunda cor. A personalidade fica na foto, na letra condensada e na moldura do traço duplo da logo FT." },
      { titulo: "Quem atende anda de skate", texto: "Uma faixa apresenta a equipe da loja, e cada um ganhou uma página. É o argumento que nenhum marketplace tem: a pessoa do outro lado do balcão." },
      { titulo: "Aberta agora, no relógio de Curitiba", texto: "O site lê o horário da loja e diz se ela está aberta naquele minuto, com o endereço da Galeria Xaxim e a retirada no balcão." },
      { titulo: "O pedido já sai escrito", texto: "No botão \"Separar pra mim\", o WhatsApp abre com o nome da peça, a marca, a quantidade e o preço. A loja não precisa perguntar qual é o modelo." },
      { titulo: "Tamanho esgotado aparece riscado", texto: "O estoque é por tamanho. O que acabou fica riscado no cartão, e a pessoa não chama a loja para ouvir que não tem." },
      { titulo: "O painel cabe no celular", texto: "Peças, estoque, pedidos, banners, textos e vídeos, tudo pelo telefone. O vídeo é comprimido no próprio aparelho antes de subir: 43,6 MB viraram 4,6 MB em 11 segundos." },
    ],
    numeros: [],
    previa: "2026-09-18",
    noAr: "2026-09-29",
    conferido: "2026-10-19",
  },
];

export const casoPorSlug = (slug: string) => casos.find((c) => c.slug === slug);
