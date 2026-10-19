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
export type CategoriaCheckin = {
  id: string;
  nome: string;
  dica: string;
  campos?: CampoCheckin[];
  /* a lista do dono (Fardo, 19/10: a Valeria escreveu à mão "chuteira salão 2,
     campo 2, sete 2"): `grupo` é o título acima, `quantas` o que ela prometeu */
  grupo?: string;
  quantas?: number;
};
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
  /* a Fardo Esportes (19/10/2026): a lista que a Valeria escreveu à mão,
     linha por linha e na ordem dela, com a quantidade de cada uma (51 peças:
     o Rafael abriu a exceção às 20 da proposta). As perguntas da loja são o
     que a proposta deixou em aberto (pagamento, entrega, troca, o cupom).
     As categorias de antes (fitness, chuteiras...) saíram com o bucket vazio */
  eabcc8a507a8b121e529526b: {
    slug: "fardo-esportes",
    loja: "Fardo Esportes",
    dono: "Valeria",
    instrucao: "Montei a lista do jeito que você escreveu. O fundo da foto não importa, eu trato.",
    passos: ["Siga a sua lista, linha por linha", "Mande as fotos da galeria", "Preencha nome, preço, tamanho e cor"],
    campos: ficha("Ex.: Garrafa Nike 500 ml"),
    categorias: [
      ...[
        ["chuteira-salao", "Chuteira de salão", "Ex.: Chuteira futsal Nike Beco"],
        ["chuteira-campo", "Chuteira de campo", "Ex.: Chuteira campo Adidas Predator"],
        ["chuteira-sete", "Chuteira de sete", "Ex.: Chuteira society Nike Phantom"],
      ].map(([id, nome, ex]) => ({ id, nome, dica: "", grupo: "Futebol", quantas: 2, campos: ficha(ex, { rotulo: "Numeração", opcoes: numeros(26, 44) }) })),
      ...[
        ["camisa-gremio", "Grêmio", 1],
        ["camisa-inter", "Inter", 1],
        ["camisa-nacionais", "Times nacionais", 0],
        ["camisa-internacionais", "Times internacionais", 1],
        ["camisa-selecao", "Seleção Brasileira", 1],
      ].map(([id, nome, q]) => ({
        id: id as string,
        nome: nome as string,
        dica: q ? "" : "Se tiver",
        grupo: "Camisas de time",
        quantas: (q as number) || undefined,
        campos: ficha("Ex.: Camisa Grêmio 2025 torcedor", { rotulo: "Tamanhos", opcoes: [...ROUPA, ...INFANTIL] }),
      })),
      { id: "basquete-tenis", nome: "Tênis de basquete", dica: "", grupo: "Basquete", quantas: 1, campos: ficha("Ex.: Tênis Nike Precision", { rotulo: "Numeração", opcoes: numeros(34, 44) }) },
      { id: "basquete-bola", nome: "Bola de basquete", dica: "", grupo: "Basquete", quantas: 1, campos: ficha("Ex.: Bola Spalding NBA") },
      { id: "basquete-regata", nome: "Regata", dica: "", grupo: "Basquete", quantas: 1, campos: ficha("Ex.: Regata Lakers", { rotulo: "Tamanhos", opcoes: ROUPA }) },
      { id: "basquete-calcao", nome: "Calção", dica: "", grupo: "Basquete", quantas: 1, campos: ficha("Ex.: Calção de basquete Nike", { rotulo: "Tamanhos", opcoes: ROUPA }) },
      { id: "tenis-fem", nome: "Tênis feminino", dica: "", grupo: "Tênis", quantas: 3, campos: ficha("Ex.: Tênis Mizuno Wave feminino", { rotulo: "Numeração", opcoes: numeros(33, 40) }) },
      { id: "tenis-masc", nome: "Tênis masculino", dica: "", grupo: "Tênis", quantas: 3, campos: ficha("Ex.: Tênis Olympikus Corre", { rotulo: "Numeração", opcoes: numeros(37, 44) }) },
      { id: "infantil-kits-licenciados", nome: "Kits licenciados", dica: "", grupo: "Infantil", quantas: 2, campos: ficha("Ex.: Kit Grêmio infantil", { rotulo: "Tamanhos", opcoes: INFANTIL }) },
      { id: "infantil-kits-originais", nome: "Kits originais", dica: "", grupo: "Infantil", quantas: 2, campos: ficha("Ex.: Kit Inter infantil oficial", { rotulo: "Tamanhos", opcoes: INFANTIL }) },
      { id: "infantil-tenis", nome: "Tênis infantil", dica: "", grupo: "Infantil", quantas: 2, campos: ficha("Ex.: Tênis infantil Nike", { rotulo: "Numeração", opcoes: numeros(20, 36) }) },
      { id: "infantil-futebol", nome: "Futebol infantil", dica: "", grupo: "Infantil", quantas: 3, campos: ficha("Ex.: Chuteira infantil Penalty", { rotulo: "Tamanho ou numeração", opcoes: [...numeros(20, 36), ...INFANTIL] }) },
      ...["CCM", "Caju", "Nike", "Alto Giro"].map((m) => ({
        id: `fitness-fem-${m.toLowerCase().replace(/\s/g, "-")}`,
        nome: m,
        dica: "",
        grupo: "Fitness feminino",
        quantas: 2,
        campos: ficha(`Ex.: Legging ${m}`, { rotulo: "Tamanhos", opcoes: ROUPA }),
      })),
      /* "Yatch" como ela escreveu: confirmar a marca com ela antes do site */
      ...["Nike", "Puma", "New Balance", "Mizuno", "Penalty", "Fila", "Yatch"].map((m) => ({
        id: `fitness-masc-${m.toLowerCase().replace(/\s/g, "-")}`,
        nome: m,
        dica: "",
        grupo: "Fitness masculino",
        quantas: 2,
        campos: ficha(`Ex.: Camiseta ${m} dry`, { rotulo: "Tamanhos", opcoes: ROUPA }),
      })),
      { id: "outras", nome: "Outras peças", dica: "Não está na lista? Manda aqui", grupo: "Fora da lista" },
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
