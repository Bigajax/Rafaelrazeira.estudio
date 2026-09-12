/* ============================================================
   A COLHEITA — Business Discovery, agora também pelas FOTOS

   O CRM já usa este endpoint desde 17/08 para bio, site e seguidores (ver
   `perfilOficial` em lib/crm/pesquisa.ts). A descoberta que abriu a oficina
   é que a MESMA chamada, com um campo a mais, devolve os posts com imagem,
   legenda e link. Nada de scraping, nada de conta paralela: é o token
   oficial do app `rafaelrazeira.estudio` fazendo o que ele já fazia.

   O QUE ISSO SIGNIFICA NA PRÁTICA: o material de uma prévia (as fotos das
   peças e os preços que estão nas legendas) sai de uma requisição só, de
   graça, em segundos. Era o pedaço mais caro do dia de trabalho.

   ---------- os três limites que este arquivo respeita ----------
   1. 200 consultas por hora no endpoint. Uma loja colhida gasta UMA
      consulta, por mais posts que ela tenha, porque tudo vem junto.
   2. A `media_url` é assinada e expira em poucos dias. Quem chama precisa
      baixar o arquivo na mesma execução; por isso `baixarImagem` mora aqui
      e não numa tela.
   3. Carrossel é onde mora produto. Um post com cinco peças tratado como
      uma imagem só joga fora quatro, então os filhos entram como ativos
      próprios, com o `media_id` do pai mais um sufixo.
   ============================================================ */

const VERSAO = "v23.0";

/* Tetos de bom senso, não da API. Cinquenta posts cobrem meses de uma loja
   pequena, e oitenta imagens já é mais catálogo do que qualquer prévia
   precisa: o que passa disso vira peso no Storage e tempo de leitura de
   legenda pago ao modelo. */
const TETO_POSTS = 50;
const TETO_IMAGENS = 80;
const TETO_FILHOS = 4;

export type Perfil = {
  arroba: string;
  nome: string | null;
  bio: string | null;
  site: string | null;
  seguidores: number | null;
  publicacoes: number | null;
  avatar: string | null;
};

export type Midia = {
  media_id: string;
  ordem: number;
  tipo: string | null;
  url: string;
  legenda: string | null;
  permalink: string | null;
  publicado_em: string | null;
  /* Curtidas e comentários vinham na mesma resposta desde sempre e eram
     jogados fora. Eles não são vaidade: são a única medida de qual peça o
     público DESTA loja já validou, e é por eles que o catálogo é ordenado.
     Nulo é "não sei" (post antigo às vezes vem sem), nunca zero. */
  curtidas: number | null;
  comentarios: number | null;
};

type MidiaCrua = {
  id?: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  children?: { data?: { id?: string; media_url?: string; media_type?: string }[] };
};

type RespostaCrua = {
  business_discovery?: {
    username?: string;
    name?: string;
    biography?: string;
    website?: string;
    followers_count?: number;
    media_count?: number;
    profile_picture_url?: string;
    media?: { data?: MidiaCrua[] };
  };
  error?: { code?: number; message?: string };
};

/* A Graph API quer as chaves de subcampo escapadas na query string. Escrevo
   os campos legíveis e troco na saída: um campo novo entra sem ninguém
   precisar lembrar de escrever %7B na mão. */
function escapar(campos: string) {
  return campos.replace(/\{/g, "%7B").replace(/\}/g, "%7D");
}

export async function colher(arroba: string): Promise<{ perfil: Perfil; midias: Midia[] }> {
  const token = process.env.IG_GRAPH_TOKEN;
  const id = process.env.IG_GRAPH_ID;
  if (!token || !id) {
    throw new Error(
      "Faltam IG_GRAPH_TOKEN e IG_GRAPH_ID (.env.local em casa, Settings na Vercel). " +
        "O token é o de usuário da Graph API e vence a cada 60 dias.",
    );
  }

  const campos = escapar(
    `business_discovery.username(${encodeURIComponent(arroba)}){` +
      "username,name,biography,website,followers_count,media_count,profile_picture_url," +
      `media.limit(${TETO_POSTS}){` +
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count," +
      "children{id,media_url,media_type}" +
      "}}",
  );

  const r = await fetch(
    `https://graph.facebook.com/${VERSAO}/${id}?fields=${campos}&access_token=${token}`,
    /* Trinta segundos: a resposta traz cinquenta posts com metadados, é
       bem maior que a consulta de bio do CRM, que se contenta com oito. */
    { signal: AbortSignal.timeout(30000) },
  );

  const j = (await r.json()) as RespostaCrua;

  if (j.error) {
    /* 110 é a resposta da Meta tanto para "não existe" quanto para "é conta
       pessoal", e as duas dão no mesmo aqui: sem conta profissional, a
       Business Discovery não enxerga e não existe colheita automática.
       Dizer isso com todas as letras evita meia hora procurando erro de
       digitação num arroba que está certo. */
    if (j.error.code === 110) {
      throw new Error(
        `@${arroba} não respondeu como conta profissional. Ou o arroba está errado, ` +
          "ou o perfil é pessoal: nesse caso a colheita automática não alcança.",
      );
    }
    /* 190 e 102 são token vencido ou sessão inválida. O token da Graph API
       dura 60 dias e a renovação está anotada no .env.local; sem essa
       frase, o erro chega como "OAuthException" e não diz o que fazer. */
    if (j.error.code === 190 || j.error.code === 102) {
      throw new Error("O IG_GRAPH_TOKEN venceu. Renove o token de 60 dias e atualize a variável.");
    }
    throw new Error(j.error.message || "O Instagram recusou a consulta.");
  }

  const d = j.business_discovery;
  if (!d) throw new Error("O Instagram respondeu sem os dados do perfil. Tente de novo.");

  const perfil: Perfil = {
    arroba: d.username || arroba,
    nome: d.name || null,
    bio: d.biography ? d.biography.replace(/\s+/g, " ").trim() : null,
    site: d.website || null,
    seguidores: typeof d.followers_count === "number" ? d.followers_count : null,
    publicacoes: typeof d.media_count === "number" ? d.media_count : null,
    avatar: d.profile_picture_url || null,
  };

  const midias: Midia[] = [];
  let ordem = 0;

  for (const post of d.media?.data ?? []) {
    if (midias.length >= TETO_IMAGENS) break;
    const pai = post.id;
    if (!pai) continue;

    const legenda = post.caption ? post.caption.replace(/\s+/g, " ").trim() : null;
    const comum = {
      legenda,
      permalink: post.permalink || null,
      publicado_em: post.timestamp || null,
      /* O carrossel inteiro herda o engajamento do POST, porque é o post
         que recebe a curtida: não existe curtida por foto. Cinco peças de
         um carrossel campeão sobem juntas, e é isso mesmo que se quer. */
      curtidas: typeof post.like_count === "number" ? post.like_count : null,
      comentarios: typeof post.comments_count === "number" ? post.comments_count : null,
    };

    const filhos = post.children?.data ?? [];
    if (filhos.length) {
      /* O carrossel inteiro herda a MESMA legenda, e é isso que faz a
         leitura de catálogo funcionar nele: o preço costuma estar escrito
         uma vez só, para as cinco peças do post. */
      for (const [i, filho] of filhos.slice(0, TETO_FILHOS).entries()) {
        if (midias.length >= TETO_IMAGENS) break;
        const url = filho.media_type === "VIDEO" ? null : filho.media_url;
        if (!url) continue;
        midias.push({
          media_id: `${pai}_${i + 1}`,
          ordem: ordem++,
          tipo: post.media_type || "CAROUSEL_ALBUM",
          url,
          ...comum,
        });
      }
      continue;
    }

    /* Vídeo e reel entram pela CAPA. A vitrine é catálogo de foto, e a capa
       de um reel de peça costuma ser a própria peça; o mp4 aqui só pesaria
       o Storage sem virar produto nenhum. */
    const url = post.media_type === "VIDEO" ? post.thumbnail_url : post.media_url;
    if (!url) continue;

    midias.push({
      media_id: pai,
      ordem: ordem++,
      tipo: post.media_type || "IMAGE",
      url,
      ...comum,
    });
  }

  return { perfil, midias };
}

/* ---------- o download ----------
   Chamado uma vez por imagem, logo depois da consulta, porque a URL é
   assinada e não sobrevive à semana. Falha de UMA imagem não pode derrubar
   a colheita inteira: quem chama trata `null` como "essa não veio" e segue
   com as outras cinquenta e nove. */
export async function baixarImagem(url: string): Promise<{ bytes: ArrayBuffer; tipo: string } | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) return null;
    const bytes = await r.arrayBuffer();
    /* O CDN da Meta serve jpeg em quase tudo, mas o webp já apareceu em
       post novo. O tipo vai gravado no Storage porque é ele que o
       navegador usa para decidir se desenha ou baixa. */
    const tipo = r.headers.get("content-type") || "image/jpeg";
    if (!tipo.startsWith("image/")) return null;
    return { bytes, tipo };
  } catch {
    return null;
  }
}

/* A extensão sai do content-type e não da URL: a URL assinada da Meta vem
   com querystring de assinatura, e cortar por ponto ali já devolveu
   arquivos chamados "jpg?stp=dst-jpg&se=7". */
export function extensaoDe(tipo: string): string {
  if (tipo.includes("png")) return "png";
  if (tipo.includes("webp")) return "webp";
  return "jpg";
}
