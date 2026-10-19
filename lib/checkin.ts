/* ============================================================
   O CHECK-IN DAS FOTOS (14/10/2026): /checkin/<token>

   O lugar por link onde o dono da loja manda as fotos dele já separadas
   pelas partes da vitrine (premium, pronta entrega, importados...). Nasceu
   na M&M Calçados: as 28 fotos de 24/09 chegaram soltas pelo WhatsApp, sem
   modelo, numeração nem preço, e o catálogo saiu sem nada disso.

   As fotos vão para o bucket PRIVADO `checkin` do Supabase do estúdio, em
   <slug>/<categoria>/<arquivo>. O navegador sobe direto para o Storage por
   URL assinada (o corpo nunca passa pela função da Vercel, que corta em
   4,5 MB), e a nota de cada foto vai ao lado, em <arquivo>.json.

   DESDE 19/10/2026 (Fardo Esportes) a ficha da foto pode ter CAMPOS no
   lugar da nota solta (nome, marca, cores, tamanhos, preço...), e a loja
   pode ter PERGUNTAS (o WhatsApp, o pagamento, a entrega, a troca...),
   respondidas uma vez e guardadas em <slug>/_loja.json. Sem `campos`, a
   ficha segue com a nota única da M&M; sem `perguntas`, o bloco não aparece.

   Loja nova: uma entrada aqui, com token novo
   (node -e "console.log(require('crypto').randomBytes(12).toString('hex'))").
   O token é o que protege a página; o noindex e o robots só tiram o Google.
   Para baixar no PC: npx tsx scripts/baixar-checkin.ts <slug>
   ============================================================ */

/* `campos` na categoria troca a ficha da loja só nela (19/10, Fardo: a
   chuteira pede numeração, a legging P ao GG, a bola o tipo) */
export type CategoriaCheckin = { id: string; nome: string; dica: string; campos?: CampoCheckin[] };
/* um campo da ficha de cada foto; `decimal` abre o teclado de número no celular.
   Com `opcoes`, vira botões de tocar (mais de um vale) e um "outro" escrito;
   o valor continua um texto só, "P, M, G", e o baixar-checkin não muda */
export type CampoCheckin = { chave: string; rotulo: string; dica?: string; modo?: "texto" | "decimal"; opcoes?: string[] };
/* uma pergunta sobre a loja, respondida uma vez só */
export type PerguntaCheckin = { chave: string; rotulo: string; dica?: string };
export type Checkin = {
  slug: string;
  loja: string;
  dono: string;
  categorias: CategoriaCheckin[];
  /* a frase da abertura, na voz do estúdio para o dono; sem ela, a da M&M */
  instrucao?: string;
  /* os passos curtos do topo, no lugar do parágrafo (Fardo, 19/10) */
  passos?: string[];
  campos?: CampoCheckin[];
  perguntas?: PerguntaCheckin[];
};

export const BUCKET_CHECKIN = "checkin";
export const ARQUIVO_LOJA = "_loja.json";

/* a ficha da peça de loja de esporte (Fardo, 19/10): o que o painel da
   vitrine pede no cadastro, enxuto. O nome leva a marca e o tipo ("Chuteira
   society Nike Phantom"), e tamanho e cor são de tocar; o que não estiver
   nos botões, ela escreve no "outro". Vazio fica honesto (sem preço, sem
   tamanho). As grades são as comuns de loja de esporte: a Fardo não publica */
export const CORES: Record<string, string> = {
  Preto: "#141414",
  Branco: "#ffffff",
  Cinza: "#9a9ea1",
  Azul: "#2f6fd6",
  "Azul-marinho": "#1b2a4a",
  Vermelho: "#d22b2b",
  Rosa: "#ef8fb4",
  Lilás: "#b59ad8",
  Verde: "#2e9b5a",
  Amarelo: "#f2c53d",
  Laranja: "#f07f2d",
  Bege: "#d9c6a5",
};
const ROUPA = ["PP", "P", "M", "G", "GG", "XG"];
const INFANTIL = ["2", "4", "6", "8", "10", "12", "14", "16"].map((t) => `Inf. ${t}`);
const numeros = (de: number, ate: number) => Array.from({ length: ate - de + 1 }, (_, i) => String(de + i));

function ficha(exemplo: string, tamanhos?: { rotulo: string; opcoes: string[] }): CampoCheckin[] {
  return [
    { chave: "nome", rotulo: "Nome", dica: exemplo },
    { chave: "preco", rotulo: "Preço", dica: "0,00", modo: "decimal" },
    { chave: "promocao", rotulo: "Promoção", dica: "se tiver", modo: "decimal" },
    ...(tamanhos ? [{ chave: "tamanhos", ...tamanhos }] : []),
    { chave: "cores", rotulo: "Cores", opcoes: Object.keys(CORES) },
  ];
}

export const CHECKINS: Record<string, Checkin> = {
  "6cd27f03b380346fb187d7e5": {
    slug: "mm-calcados",
    loja: "M&M Calçados",
    dono: "Marcelo",
    categorias: [
      { id: "premium", nome: "Premium", dica: "Os pares da linha premium." },
      { id: "pronta-entrega", nome: "Pronta entrega", dica: "O que está na loja agora, para sair hoje." },
      { id: "importados", nome: "Modelos importados", dica: "Os modelos que vêm de fora." },
      { id: "outras", nome: "Outras fotos", dica: "Não sabe onde pôr? Manda aqui que eu separo." },
    ],
  },
  /* a Fardo Esportes (19/10/2026): as 20 peças da entrega, com a ficha
     completa em cada foto, e as perguntas da loja que a proposta deixou
     em aberto (pagamento, entrega, troca, o percentual do cupom) */
  eabcc8a507a8b121e529526b: {
    slug: "fardo-esportes",
    loja: "Fardo Esportes",
    dono: "Valeria",
    instrucao: "O fundo da foto não importa, eu trato. Nesta entrega entram até 20 peças.",
    passos: ["Escolha a categoria", "Mande as fotos da galeria", "Preencha nome, preço, tamanho e cor"],
    campos: ficha("Ex.: Garrafa Nike 500 ml"),
    /* os ids antigos ficam (fitness, chuteiras, camisas, moletons,
       tenis-e-botas, outras): são as pastas do storage */
    categorias: [
      { id: "fitness", nome: "Fitness feminino", dica: "Top, legging, conjunto, cropped", campos: ficha("Ex.: Legging Caju Alanis", { rotulo: "Tamanhos", opcoes: ROUPA }) },
      { id: "chuteiras", nome: "Chuteiras", dica: "Campo, society e futsal", campos: ficha("Ex.: Chuteira society Nike Phantom", { rotulo: "Numeração", opcoes: numeros(26, 44) }) },
      { id: "camisas", nome: "Camisas de time", dica: "Grêmio, Inter, Seleção e outras", campos: ficha("Ex.: Camisa Grêmio 2025 torcedor", { rotulo: "Tamanhos", opcoes: [...ROUPA, ...INFANTIL] }) },
      { id: "bolas", nome: "Bolas", dica: "Futsal, campo, society, vôlei", campos: ficha("Ex.: Bola futsal Penalty Max 500") },
      { id: "tenis-e-botas", nome: "Tênis e botas", dica: "Corrida, caminhada, casual", campos: ficha("Ex.: Tênis Mizuno Wave Prophecy", { rotulo: "Numeração", opcoes: numeros(26, 44) }) },
      { id: "moletons", nome: "Moletons e casacos", dica: "Moletom, jaqueta, corta-vento", campos: ficha("Ex.: Moletom Nike Club caramelo", { rotulo: "Tamanhos", opcoes: ROUPA }) },
      { id: "shorts", nome: "Shorts e calças", dica: "Calção, bermuda, calça de treino", campos: ficha("Ex.: Calção Umbro treino", { rotulo: "Tamanhos", opcoes: ROUPA }) },
      { id: "acessorios", nome: "Acessórios", dica: "Meião, caneleira, luva, mochila", campos: ficha("Ex.: Caneleira Adidas", { rotulo: "Tamanhos", opcoes: ["Único", "Infantil", "P", "M", "G"] }) },
      { id: "outras", nome: "Outras peças", dica: "Não sabe onde pôr? Manda aqui" },
    ],
    perguntas: [
      { chave: "whatsapp", rotulo: "WhatsApp dos pedidos", dica: "Hoje está 54 99143-4166. Está certo?" },
      { chave: "pagamento", rotulo: "Formas de pagamento", dica: "Pix, cartão, em quantas vezes" },
      { chave: "entrega", rotulo: "Entrega", dica: "Só retirada? Entrega em Erechim? Envia para outras cidades?" },
      { chave: "troca", rotulo: "Troca", dica: "Aceita? Em quantos dias?" },
      { chave: "cupom", rotulo: "Cupom de primeira compra", dica: "Ex.: 10%. Se não tiver, deixe vazio" },
      { chave: "personalizacao", rotulo: "Nome na camisa", dica: "Quanto custa e em quantos dias fica pronta?" },
      { chave: "horario", rotulo: "Horário", dica: "Hoje está: seg a sex, 8h30 às 12h e 13h30 às 18h30; sáb, 8h30 às 12h. Está certo?" },
      { chave: "contatos", rotulo: "E-mail e Instagram", dica: "Se quiser no rodapé do site" },
      { chave: "previa", rotulo: "Peças da prévia que ainda existem", dica: "As camisas e o fitness são de posts de 2022 a 2024" },
    ],
  },
};

export function lerCheckin(token: string): Checkin | null {
  return Object.prototype.hasOwnProperty.call(CHECKINS, token) ? CHECKINS[token] : null;
}

export const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/* o caminho de uma foto só vale dentro da pasta da loja e de uma categoria dela */
export function caminhoValido(c: Checkin, caminho: string) {
  const partes = caminho.split("/");
  return (
    partes.length === 3 &&
    partes[0] === c.slug &&
    c.categorias.some((k) => k.id === partes[1]) &&
    /^[\w.-]+$/.test(partes[2]) &&
    !partes[2].endsWith(".json")
  );
}

/* a ficha de uma categoria: a dela, se tiver, senão a da loja */
export function camposDa(c: Checkin, categoria: string): CampoCheckin[] | undefined {
  return c.categorias.find((k) => k.id === categoria)?.campos ?? c.campos;
}

/* só as chaves que a loja declarou entram no JSON da foto e nas respostas */
export function filtrarChaves(permitidas: { chave: string }[], valores: Record<string, string>) {
  const saida: Record<string, string> = {};
  for (const { chave } of permitidas) if (typeof valores[chave] === "string") saida[chave] = valores[chave].trim();
  return saida;
}
