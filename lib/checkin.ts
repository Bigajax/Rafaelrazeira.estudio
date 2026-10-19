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

export type CategoriaCheckin = { id: string; nome: string; dica: string };
/* um campo da ficha de cada foto; `decimal` abre o teclado de número no celular */
export type CampoCheckin = { chave: string; rotulo: string; dica?: string; modo?: "texto" | "decimal" };
/* uma pergunta sobre a loja, respondida uma vez só */
export type PerguntaCheckin = { chave: string; rotulo: string; dica?: string };
export type Checkin = {
  slug: string;
  loja: string;
  dono: string;
  categorias: CategoriaCheckin[];
  /* a frase da abertura, na voz do estúdio para o dono; sem ela, a da M&M */
  instrucao?: string;
  campos?: CampoCheckin[];
  perguntas?: PerguntaCheckin[];
};

export const BUCKET_CHECKIN = "checkin";
export const ARQUIVO_LOJA = "_loja.json";

/* os campos da peça de loja de roupa e calçado: o que o painel da vitrine
   pede no cadastro. Só o nome é obrigatório para entrar no site; o resto,
   vazio, fica honesto (sem preço, sem tamanho) */
const CAMPOS_PECA: CampoCheckin[] = [
  { chave: "nome", rotulo: "Nome da peça", dica: "Ex.: Legging Alanis preta e laranja" },
  { chave: "marca", rotulo: "Marca", dica: "Nike, Caju Brasil, CCM..." },
  { chave: "cores", rotulo: "Cores que você tem", dica: "Ex.: preto, rosa e azul" },
  { chave: "tamanhos", rotulo: "Tamanhos ou numerações", dica: "Ex.: P ao GG, ou 38 ao 43" },
  { chave: "preco", rotulo: "Preço (R$)", dica: "Ex.: 189,90", modo: "decimal" },
  { chave: "promocao", rotulo: "Preço promocional, se tiver (R$)", dica: "Deixe vazio se não tem", modo: "decimal" },
  { chave: "obs", rotulo: "Alguma coisa sobre a peça", dica: "Tecido, caimento, para que serve. Opcional" },
];

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
    instrucao:
      "Valeria, cada ficha abaixo é uma parte da vitrine. Toque em Escolher fotos, pegue da galeria e elas sobem sozinhas; se a peça tem mais de uma foto, mande as duas ou três juntas. Depois preencha embaixo de cada foto o nome, a marca, as cores, os tamanhos e o preço: é isso que vai para o site, e o que ficar vazio não aparece. O fundo da foto não importa, eu trato. Nesta entrega entram até 20 peças.",
    campos: CAMPOS_PECA,
    categorias: [
      { id: "fitness", nome: "Fitness feminino", dica: "Caju Brasil, Alto Giro e CCM: top, legging, conjunto, cropped." },
      { id: "chuteiras", nome: "Chuteiras", dica: "Campo, society e futsal, adulto e infantil." },
      { id: "camisas", nome: "Camisas de time", dica: "Grêmio, Inter, Seleção e as outras. Diga a temporada no nome, se souber." },
      { id: "moletons", nome: "Moletons e casacos", dica: "Moletom, jaqueta, fleece, corta-vento." },
      { id: "tenis-e-botas", nome: "Tênis e botas", dica: "Tênis de corrida, de caminhada, bota." },
      { id: "outras", nome: "Outras peças", dica: "Não sabe onde pôr? Manda aqui que eu separo." },
    ],
    perguntas: [
      { chave: "whatsapp", rotulo: "O WhatsApp que recebe os pedidos", dica: "Hoje está o 54 99143-4166. Está certo?" },
      { chave: "pagamento", rotulo: "Formas de pagamento que você aceita", dica: "Pix, cartão (quais bandeiras), e se parcela, em quantas vezes" },
      { chave: "entrega", rotulo: "Entrega e envio", dica: "Só retirada na loja? Entrega em Erechim? Envia para outras cidades, como e em quanto tempo?" },
      { chave: "troca", rotulo: "Troca", dica: "Aceita? Em quantos dias e em que condição?" },
      { chave: "cupom", rotulo: "O desconto do cupom de primeira compra", dica: "Em porcentagem. Ex.: 10%" },
      { chave: "personalizacao", rotulo: "A camisa com o nome nas costas", dica: "Tem custo a mais? Quanto, e em quantos dias fica pronta?" },
      { chave: "horario", rotulo: "O horário da loja", dica: "Hoje está: seg a sex, 8h30 às 12h e 13h30 às 18h30; sábado, 8h30 às 12h. Está certo?" },
      { chave: "contatos", rotulo: "E-mail e Instagram para o rodapé do site", dica: "Se quiser que apareçam" },
      { chave: "previa", rotulo: "Das peças que já estão na prévia, quais ainda existem na loja?", dica: "As camisas e o fitness vieram de posts de 2022 a 2024" },
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

/* só as chaves que a loja declarou entram no JSON da foto e nas respostas */
export function filtrarChaves(permitidas: { chave: string }[], valores: Record<string, string>) {
  const saida: Record<string, string> = {};
  for (const { chave } of permitidas) if (typeof valores[chave] === "string") saida[chave] = valores[chave].trim();
  return saida;
}
