/* ============================================================
   A PESQUISA — a IA que estuda o lead antes de você falar com ele

   Recebe um lead recém-anotado (nome, Instagram, cidade, nicho) e devolve
   um DOSSIÊ: o que o negócio é, como está a presença digital dele, a dor
   provável na lente do que o estúdio vende, um gancho concreto e as duas
   mensagens prontas no tom dos templates da casa: a ABERTURA (o primeiro
   toque, duas linhas e uma pergunta, sem oferta e sem link) e a MENSAGEM
   (o segundo toque, com a apresentação, a prévia e o exemplo, para depois
   que a pessoa responder). A separação é a regra: na notificação do
   WhatsApp cabem duas linhas, e é ali que a pessoa decide se abre.

   COMO, em duas frentes:

   1. A chamada vai ao OpenRouter (decisão do Rafael, o crédito dele mora
      lá) com um modelo Claude e o plugin web em `engine: "native"`: isso
      liga a BUSCA NATIVA da Anthropic por dentro do OpenRouter, e o
      modelo pesquisa sozinho, em várias tentativas (Instagram, Maps,
      site), em vez de receber uma rodada única de resultados. Foi
      testado ao vivo: com o engine nativo ele achou o perfil certo do
      Instagram até quando o arroba informado estava errado.

   2. Quando o lead tem o arroba preenchido, o perfil do Instagram é
      colhido DIRETO do endpoint público (bio, link da bio, seguidores,
      legendas recentes) e entra no pedido como fato garantido. A colheita
      é frágil por natureza (o Instagram bloqueia quando quer, e IP de
      datacenter apanha mais); quando falha, a pesquisa segue só com a
      busca, sem drama.

   O MODELO é configurável pela OPENROUTER_MODELO (.env.local) porque o
   catálogo do OpenRouter muda de nome a cada geração. Desde 16/08 a
   variável aponta para o Opus 5: no teste lado a lado com o mesmo lead,
   ele achou mais coisa na mesma pesquisa e escreveu uma mensagem
   visivelmente melhor, e a mensagem é o artefato que decide se o lead
   responde. O padrão de código fica no Sonnet de propósito: é o
   reserva barato se a variável sumir.

   O QUE ESTE ARQUIVO NÃO FAZ: mandar mensagem. A regra da casa é a IA
   preparar e o Rafael apertar enviar; automação de envio em cima do
   WhatsApp pessoal é o caminho clássico de ter o número banido.
   ============================================================ */

import { projetos } from "@/data/portfolio";
import type { Dossie, Interacao, Lead, Template } from "@/lib/crm/tipos";

/* O que a pesquisa devolve: o dossiê sem o envelope de status, que é a
   rota quem escreve (ela sabe se está começando, terminou ou falhou). */
export type ResultadoPesquisa = Omit<Dossie, "status" | "erro" | "gerado_em">;

const MODELO_PADRAO = "anthropic/claude-sonnet-5";

/* ---------- o contexto do estúdio, escrito uma vez ----------
   É o que transforma uma pesquisa genérica de empresa numa pesquisa na
   LENTE do que o Rafael vende. Sem isso o modelo descreve o negócio;
   com isso ele procura exatamente as dores que viram projeto. */
const CONTEXTO_ESTUDIO = `Você é o assistente de prospecção do Rafael Razeira Estúdio, um estúdio solo de Maringá-PR que desenha e desenvolve sites para pequenos negócios brasileiros: vitrine digital (R$ 999, transforma o Instagram numa vitrine organizada com WhatsApp integrado), landing pages, sites institucionais e e-commerce (tickets entre R$ 999 e R$ 5.400). O diferencial do processo é a PRÉVIA: o Rafael desenha o site e manda a pessoa ver antes de cobrar qualquer coisa.

O trabalho dele começa no WhatsApp, num tom direto e pessoal: mensagens curtas, sem formalidade de agência, sem promessa vazia, sempre citando algo CONCRETO que ele viu no negócio da pessoa. Nunca use travessão (o caractere) em texto nenhum: reescreva com dois-pontos ou vírgulas. Não use emojis.`;

/* ---------- o portfólio, como prova social sob medida ----------
   A lista real do /portfolio, direto de data/portfolio.ts: quando um
   projeto entrar ou sair de lá, a pesquisa fica sabendo sozinha. A IA
   escolhe NO MÁXIMO um exemplo cujo público conversa com o lead (loja de
   sneakers vê a Star Point, alfaiataria vê a Filato Bene), e a escolha é
   validada contra esta lista na volta: link de portfólio inventado seria
   o pior tipo de erro numa mensagem de vendas. */
const CATALOGO_PORTFOLIO = projetos
  .filter((p) => p.url)
  .map((p) => `- ${p.nome} (${p.tipo.toLowerCase()}): ${p.ramo} ${p.url}`)
  .join("\n");

const BLOCO_PORTFOLIO = `O PORTFÓLIO DO ESTÚDIO, todos no ar (para escolher UM exemplo, se algum conversar com este negócio):
${CATALOGO_PORTFOLIO}

Regra do exemplo: escolha no máximo UM projeto cujo público ou ramo conversa com o negócio pesquisado (mesmo segmento ou vizinho). Se nenhum conversar de verdade, não escolha nenhum: exemplo forçado é pior que nenhum. Quando escolher, cite o projeto e o ramo na "mensagem" ("fiz a vitrine da Star Point, que vende sneakers aqui de Maringá") e COLE O LINK COMPLETO (https://...) na "mensagem", de preferência numa linha própria no fim. O exemplo e o link vivem SÓ na "mensagem", nunca na "abertura": link no primeiro toque vira cartão de preview na lista de conversas, e o cartão é o que faz a pessoa reconhecer propaganda antes de abrir. no WhatsApp o link em linha própria vira o cartão de prévia, e é o trabalho se mostrando sozinho. "Posso te mandar o link" não vale: exemplo citado sem link é vitrine de porta fechada. Nunca mais de um exemplo por mensagem.`;

/* ---------- a saudação nunca vai escrita, garantido por código ----------
   O prompt pede a variável {saudacao}, mas "Boa tarde" é a coisa mais
   automática que um modelo escreve, e toda mensagem daqui é mandada horas
   ou dias depois de nascer: saudação errada para a hora entrega na
   primeira linha que o texto foi escrito antes, por outra pessoa ou por
   uma máquina, e a conversa morre ali. A maiúscula do modelo é
   preservada, porque ela diz se a saudação abria a frase. */
function semSaudacaoFixa(t: string): string {
  return t.replace(/\b(bom dia|boa tarde|boa noite)\b/gi, (m) =>
    m[0] === m[0].toUpperCase() ? "{Saudacao}" : "{saudacao}",
  );
}

/* ---------- o arroba, limpo ----------
   O campo aceita "@x", "instagram.com/x" e "x"; o endpoint só quer o x. */
function arrobaLimpo(instagram: string | null): string | null {
  if (!instagram) return null;
  const limpo = instagram
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?].*$/, "")
    .trim();
  return limpo || null;
}

/* ---------- a colheita OFICIAL: Business Discovery da Meta ----------
   Desde 17/08 o app do Rafael na Meta (rafaelrazeira.estudio) tem as
   permissões da Instagram Graph API, e a conta do estúdio consulta
   qualquer conta profissional pelo arroba: bio, site, seguidores e
   número de posts, oficial, estável, 200 consultas/hora, sem o gato e
   rato do endpoint público. Ela é a PRIMEIRA opção da colheita; o
   endpoint público vira reserva (e continua cobrindo conta pessoal, que
   a Business Discovery não enxerga).

   IG_GRAPH_TOKEN é o token de usuário da Graph API (60 dias; a troca de
   renovação está anotada no .env.local) e IG_GRAPH_ID é o ID da conta
   profissional do estúdio, por onde a consulta é feita. */
async function perfilOficial(arroba: string): Promise<Colheita> {
  const token = process.env.IG_GRAPH_TOKEN;
  const id = process.env.IG_GRAPH_ID;
  if (!token || !id) return { tipo: "falhou" };

  try {
    const campos = "username,name,biography,website,followers_count,media_count";
    const r = await fetch(
      `https://graph.facebook.com/v23.0/${id}?fields=business_discovery.username(${encodeURIComponent(arroba)})%7B${campos}%7D&access_token=${token}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const j = (await r.json()) as {
      business_discovery?: {
        username?: string;
        name?: string;
        biography?: string;
        website?: string;
        followers_count?: number;
        media_count?: number;
      };
      error?: { code?: number; message?: string };
    };

    if (j.error) {
      /* 110 = usuário não existe ou não é conta profissional: dos dois
         jeitos, este arroba não serve para prospecção por aqui; o
         endpoint público (reserva) decide se ele existe como pessoal. */
      if (j.error.code === 110) return { tipo: "nao_existe" };
      return { tipo: "falhou" };
    }

    const d = j.business_discovery;
    if (!d) return { tipo: "falhou" };

    const texto = [
      `Perfil: @${d.username || arroba}${d.name ? ` (${d.name})` : ""}`,
      d.biography ? `Bio: ${d.biography.replace(/\s+/g, " ")}` : "Bio: vazia",
      `Link da bio: ${d.website || "NENHUM"}`,
      typeof d.followers_count === "number" ? `Seguidores: ${d.followers_count}` : null,
      typeof d.media_count === "number" ? `Publicações: ${d.media_count}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const fraco = (d.media_count ?? 0) === 0 || (!d.biography && !d.website);
    return { tipo: "ok", texto, fraco };
  } catch {
    return { tipo: "falhou" };
  }
}

/* ---------- a colheita direta do perfil ----------
   O endpoint público de perfil devolve o que a busca às vezes não acha:
   a bio literal, o link da bio (a informação mais valiosa da prospecção:
   para onde o negócio manda quem chega), seguidores e as legendas
   recentes. Oito segundos de teto, e a falha diz QUAL falha: "nao_existe"
   (404, o arroba está morto e não pode ir para o cadastro) é uma
   informação; "falhou" (bloqueio, limite de consultas, rede) é só
   ausência. A pesquisa não pode morrer por causa do bônus, mas também
   não pode confundir as duas coisas. */
/* "fraco" é o perfil que abre mas está vazio: sem publicações, ou sem bio
   e sem link. Custou uma divergência real: o lead "Manare" abriu o
   @manare (144 seguidores, zero posts, um arroba abandonado) e o motor
   parou de procurar, enquanto o perfil VERDADEIRO era o @manareoficial,
   com 50 mil seguidores e o WhatsApp na bio. Perfil que abre não é
   perfil confirmado; perfil vazio manda a descoberta continuar. */
type Colheita =
  | { tipo: "ok"; texto: string; fraco: boolean }
  | { tipo: "nao_existe" }
  | { tipo: "falhou" };

async function perfilInstagram(instagram: string | null): Promise<Colheita> {
  const arroba = arrobaLimpo(instagram);
  if (!arroba) return { tipo: "falhou" };

  /* A oficial primeiro. Quando ela responde "não existe", ainda vale uma
     passada no endpoint público: conta PESSOAL não aparece na Business
     Discovery mas existe, e prospecção local tem disso. */
  const oficial = await perfilOficial(arroba);
  if (oficial.tipo === "ok") return oficial;

  /* Uma segunda tentativa depois de cinco segundos: o limite de consultas
     do Instagram vem em ondas curtas, e foi uma colheita cortada por ele
     que fez um dossiê afirmar "o Instagram não existe mais" para uma
     loja com 638 posts e o WhatsApp na bio. O 404 não ganha retry: morto
     é morto. */
  const primeira = await tentarPerfil(arroba);
  if (primeira.tipo === "ok") return primeira;
  if (primeira.tipo === "nao_existe") return primeira;
  if (oficial.tipo === "nao_existe") return oficial;
  await new Promise((r) => setTimeout(r, 5000));
  return tentarPerfil(arroba);
}

async function tentarPerfil(arroba: string): Promise<Colheita> {
  try {
    const r = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(arroba)}`,
      {
        headers: {
          "x-ig-app-id": "936619743392459",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
          accept: "*/*",
          referer: `https://www.instagram.com/${arroba}/`,
          origin: "https://www.instagram.com",
          "sec-fetch-site": "same-site",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (r.status === 404) return { tipo: "nao_existe" };
    if (!r.ok) return { tipo: "falhou" };

    const j = (await r.json()) as {
      data?: {
        user?: {
          full_name?: string;
          biography?: string;
          external_url?: string | null;
          bio_links?: { url?: string }[];
          edge_followed_by?: { count?: number };
          edge_owner_to_timeline_media?: {
            count?: number;
            edges?: { node?: { edge_media_to_caption?: { edges?: { node?: { text?: string } }[] } } }[];
          };
        };
      };
    };
    const u = j.data?.user;
    if (!u) return { tipo: "falhou" };

    const links = [u.external_url, ...(u.bio_links ?? []).map((b) => b.url)].filter(Boolean);
    const legendas = (u.edge_owner_to_timeline_media?.edges ?? [])
      .slice(0, 3)
      .map((e) => e.node?.edge_media_to_caption?.edges?.[0]?.node?.text?.replace(/\s+/g, " ").slice(0, 140))
      .filter(Boolean);

    const texto = [
      `Perfil: @${arroba}${u.full_name ? ` (${u.full_name})` : ""}`,
      u.biography ? `Bio: ${u.biography.replace(/\s+/g, " ")}` : "Bio: vazia",
      `Link da bio: ${links.length ? links.join(" , ") : "NENHUM"}`,
      typeof u.edge_followed_by?.count === "number" ? `Seguidores: ${u.edge_followed_by.count}` : null,
      typeof u.edge_owner_to_timeline_media?.count === "number"
        ? `Publicações: ${u.edge_owner_to_timeline_media.count}`
        : null,
      legendas.length ? `Legendas recentes: ${legendas.map((l) => `"${l}"`).join(" ; ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const posts = u.edge_owner_to_timeline_media?.count ?? 0;
    const fraco = posts === 0 || (!u.biography && !links.length);
    return { tipo: "ok", texto, fraco };
  } catch {
    return { tipo: "falhou" };
  }
}

/* ---------- a colheita do link da bio ----------
   "O link da bio é um linktree sem site" virou gancho preferido dos
   dossiês, e ele estava sendo afirmado SEM ABRIR O LINKTREE. O Rafael
   pegou o risco na hora ("vai que neste linktree tenha site"): no dia em
   que houver um site lá dentro, a mensagem nasce errada e queima a
   abordagem. Então quando o link da bio é um agregador conhecido, a
   colheita o abre e lista o que existe lá dentro, como fato conferido: os
   canais (WhatsApp, Maps, redes) de um lado e qualquer possível site
   próprio do outro. Linktree não aberto é linktree DESCONHECIDO, e o
   prompt agora só deixa o gancho citar o que foi conferido. */
const AGREGADOR =
  /(?:linktr\.ee|beacons\.ai|bio\.link|taplink\.cc|lnk\.bio|campsite\.bio|linkin\.bio|abre\.bio|linkme\.bio|allmylinks\.com|solo\.to)\//i;

/* O que dentro de um agregador é CANAL (presença alugada), e não site. */
const CANAL =
  /(?:instagram\.com|facebook\.com|fb\.com|wa\.me|api\.whatsapp\.com|whatsapp\.com|t\.me|tiktok\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|pinterest\.|spotify\.com|kwai|maps\.app\.goo\.gl|goo\.gl|g\.page|google\.[a-z.]+\/(?:maps|search)|maps\.google|ifood\.com|shopee\.com|mercadolivre\.com|americanas\.com|soundcloud\.|bandcamp\.com|music\.apple|deezer\.com)/i;

/* O lixo técnico E COMERCIAL que toda página dessas carrega: análise,
   fonte, CDN, e os anúncios que o próprio linktree enfia entre os botões
   (thanks.is e as redes de afiliado da CJ) — foi um desses que quase
   virou "site próprio" no teste do Studio AZ. */
const RUIDO =
  /(?:linktr\.ee|beacons\.ai|bio\.link|taplink|lnk\.bio|campsite|linkin\.bio|abre\.bio|linkme\.bio|allmylinks|solo\.to|gstatic|googletagmanager|google-analytics|googleapis|doubleclick|facebook\.net|fbcdn|cdninstagram|sentry|cookielaw|onetrust|apple\.com|play\.google|w3\.org|schema\.org|cloudinary|imgix|twimg|jsdelivr|unpkg|vercel\.app\/api|amplitude|hotjar|clarity\.ms|tinybird|cloudfront\.net\/(?:assets|static)|privacy|terms|thanks\.is|kqzyfj\.com|dpbolvw\.net|anrdoezrs\.net|jdoqocy\.com|tkqlhce\.com|linksynergy|shareasale|awin1\.com|\.sjv\.io|\.pxf\.io|\.7eer\.net|\.evyy\.net|\.ojrq\.net)/i;

async function colherLinkDaBio(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok) return `O link da bio (${url}) não abriu agora (HTTP ${r.status}); trate o conteúdo dele como DESCONHECIDO.`;
    /* Os agregadores servem os destinos num JSON embutido, com as barras
       escapadas: desescapar antes do pente de URLs. */
    const html = (await r.text()).replace(/\\\//g, "/").replace(/\\u0026/g, "&");

    /* Os BOTÕES de verdade são pares title/url nesse JSON, e os anúncios
       que o linktree injeta entre eles ("30% off at ARMRA") são objetos
       com campos "vendor" logo ao lado: é esse o discriminador, não uma
       blocklist de marca (descoberto sondando o studio_az, onde cinco
       marcas de suplemento quase viraram "site próprio"). */
    const botoes: { titulo: string; url: string }[] = [];
    for (const m of html.matchAll(/"title":"([^"]{1,80})"[^{}]{0,400}?"url":"(https?:[^"]+)"/g)) {
      const janela = html.slice(m.index, m.index + m[0].length + 420);
      if (/"vendor(?:DisplayName|Icon)?":/.test(janela)) continue;
      if (RUIDO.test(m[2])) continue;
      if (botoes.some((b) => b.url === m[2])) continue;
      botoes.push({ titulo: m[1], url: m[2] });
    }

    const encurtar = (bruta: string) => {
      try {
        const u = new URL(bruta);
        return `${u.hostname}${u.pathname === "/" ? "" : u.pathname}`;
      } catch {
        return bruta.slice(0, 60);
      }
    };

    let canais: string[];
    let sitios: string[];
    if (botoes.length) {
      canais = botoes.filter((b) => CANAL.test(b.url)).map((b) => `"${b.titulo}" -> ${encurtar(b.url)}`);
      sitios = botoes.filter((b) => !CANAL.test(b.url)).map((b) => `"${b.titulo}" -> ${encurtar(b.url)}`);
    } else {
      /* agregador de outro formato: o pente genérico de URLs decide */
      const brutas = [...new Set(html.match(/https?:\/\/[^\s"'<>\\)]+/g) ?? [])].filter(
        (bruta) => !RUIDO.test(bruta) && !/\.(png|jpe?g|webp|svg|gif|ico|css|js|woff2?)(?:$|\?)/i.test(bruta),
      );
      canais = brutas.filter((b) => CANAL.test(b)).map(encurtar);
      sitios = brutas.filter((b) => !CANAL.test(b)).map(encurtar);
    }

    return [
      `O LINK DA BIO FOI ABERTO AGORA E CONFERIDO (${url}). Os botões que existem lá dentro:`,
      `- Canais (rede social, WhatsApp, Maps, busca): ${canais.slice(0, 8).join(" , ") || "nenhum"}`,
      `- Possível site próprio: ${sitios.slice(0, 5).join(" , ") || "NENHUM"}`,
      sitios.length
        ? "Confirme na busca se algum destes é DO NEGÓCIO antes do veredito: se for, o negócio TEM site; se nenhum for, vale o gancho de linktree sem site."
        : "Só canais alugados, nenhum site próprio: isto é fato conferido e PODE ser gancho.",
    ].join("\n");
  } catch {
    return `O link da bio (${url}) não abriu agora; trate o conteúdo dele como DESCONHECIDO, não afirme o que tem ou deixa de ter lá dentro.`;
  }
}

/* ---------- o pedido, por lead ---------- */
function montarPedido(
  lead: Lead,
  templates: Template[],
  doInstagram: string | null,
  doLinkDaBio: string | null,
): string {
  const dados = [
    `Nome do contato: ${lead.nome}`,
    lead.empresa ? `Negócio: ${lead.empresa}` : null,
    lead.instagram ? `Instagram: ${lead.instagram}` : null,
    lead.cidade ? `Cidade: ${lead.cidade}` : null,
    lead.nicho ? `Nicho: ${lead.nicho}` : null,
    lead.tipo_projeto ? `Projeto que o Rafael imagina vender: ${lead.tipo_projeto}` : null,
    lead.notas ? `Notas do Rafael: ${lead.notas}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  /* Dois ou três templates bastam para dar o tom; mandar os sete é gastar
     contexto com repetição. Se o banco estiver vazio, a voz descrita no
     contexto segura sozinha. */
  const vozes = templates
    .slice(0, 3)
    .map((t) => `--- ${t.titulo} ---\n${t.conteudo}`)
    .join("\n\n");

  return `Pesquise este negócio na web e monte o dossiê de prospecção.

${dados}
${doInstagram ? `\nSOBRE O INSTAGRAM DESTE NEGÓCIO (linhas "Perfil/Bio/Link" são colhidas direto do perfil e valem como fato; linhas de "Atenção" e "provável" são o que são):\n${doInstagram}\n` : ""}${doLinkDaBio ? `\n${doLinkDaBio}\n` : ""}
Faça quantas buscas precisar, até seis, nesta ordem de prioridade:
1. O INSTAGRAM primeiro: busque o perfil (por exemplo "site:instagram.com ${lead.instagram || lead.empresa || lead.nome}"). Se o arroba informado não existir, procure o perfil certo pelo nome e cidade. Do perfil interessa: bio, link da bio, frequência de posts.
2. O Google Maps: avaliações, nota, fotos, movimento.
3. Site próprio: existe? O link da bio leva aonde (linktree, WhatsApp, nada)? O cardápio ou catálogo é PDF ou foto solta?

O que concluir:
- A presença digital hoje, achado por achado.
- O VEREDITO, na lente do que o estúdio vende:
    "quente" .. o negócio não tem site nem presença própria decente: é o prospect ideal.
    "morno" ... tem presença, mas com um furo REAL e citável (site velho ou quebrado, linktree sem site próprio, catálogo em PDF ou foto solta). "Linktree sem site próprio" SÓ pode ser afirmado (no veredito, na dor, no gancho e na mensagem) se o bloco "O LINK DA BIO FOI ABERTO" acima disser isso: linktree não conferido é linktree DESCONHECIDO, e um site escondido lá dentro faria a mensagem nascer errada.
    "frio" .... já está bem servido: loja virtual própria completa e funcional, site recente que cumpre o papel. Para frio, "dor", "gancho" e "mensagem" vão como null e "veredito_motivo" explica em uma frase. NÃO invente dor para justificar mensagem: um linktree na bio de quem já tem e-commerce completo não é dor, é detalhe. Veredito honesto vale mais que pitch forçado.
- Se quente ou morno: a dor provável e um gancho CONCRETO, um fato específico que você viu (número de avaliações, link da bio quebrado ou ausente, cardápio em PDF) que o Rafael pode citar na primeira mensagem para mostrar que olhou de verdade.

O que NÃO entra no dossiê:
- O processo da busca. "presenca" lista achados sobre o negócio, nunca o que você tentou e não achou, item por item, nem perfis parecidos que não são o negócio. Se não achou, uma frase no resumo resolve e pronto.
- Registro de empresa. CNPJ, junta comercial e sites de consulta de cadastro não são presença digital: no máximo uma frase no resumo (tipo "empresa registrada em 2025"), e nunca no gancho, nunca na mensagem, nunca nas fontes.

${vozes ? `O tom das mensagens do Rafael, para calibrar a sua:\n\n${vozes}\n` : ""}
${BLOCO_PORTFOLIO}

SÃO DUAS MENSAGENS, E ESSA SEPARAÇÃO É A REGRA MAIS IMPORTANTE DAQUI. Na lista de conversas do WhatsApp a pessoa lê umas duas linhas na notificação e decide ali se abre. Uma mensagem que já se apresenta ("aqui é o Rafael, do estúdio de web design"), já traz link (o cartão de preview é a etiqueta visual de anúncio) e já oferece alguma coisa é reconhecida como propaganda ANTES de ser lida, e nem o melhor texto sobrevive a isso. Então a oferta não vai no primeiro toque: ela vai no segundo, depois que a pessoa responder.

"abertura" é o PRIMEIRO TOQUE. Uma pergunta que só quem olhou aquele negócio saberia fazer, e que a pessoa responde sem esforço. Regras duras:
- No máximo 200 caracteres, no máximo duas frases. Precisa caber inteira na notificação.
- NENHUM link, NENHUMA URL, nem "vercel.app", nem "instagram.com/...". Nenhum.
- Nenhuma apresentação: não diga quem você é, não diga "estúdio", "web design", "site", "vitrine" nem o que você faz. Quem pergunta não se apresenta.
- Nenhuma oferta, nenhuma prévia, nenhum elogio de venda ("que trabalho lindo", "adorei o perfil").
- O assunto é o NEGÓCIO da pessoa, nunca o site dela. Pergunte como cliente que tentou algo e travou, porque geralmente é verdade: o link da bio que abre três destinos, o cardápio que não abre no celular, a dúvida de onde ver a grade ou o preço.
- Escrita como alguém digita no celular: pode começar em minúscula, sem pontuação caprichada, sem ponto final obrigatório. Texto impecável em cinco frases denuncia texto copiado.
- Uma pergunta só, respondível em uma palavra.
- Se a pergunta for sobre algo que você VIU e não tem certeza, pergunte de verdade ("é assim mesmo ou tá quebrado?"). Honestidade aqui é o que faz a mensagem funcionar: é uma dúvida real.

"mensagem" é o SEGUNDO TOQUE, para o Rafael mandar DEPOIS que a pessoa responder. Aqui o comprimento é cuidado, não mala direta. Quatro tempos:
1. O GANCHO: uma frase que prova que você olhou o negócio. Sempre o que você VIU (o perfil, uma peça, as avaliações), nunca o que você fez: "fui procurar e não encontrei" e "vi que existe uma empresa registrada" são proibidos, soam vigilância.
2. A CONSEQUÊNCIA: em uma frase, o cliente que o negócio perde por causa disso, na lente de quem vende.
3. A OFERTA: a prévia sem compromisso, concreta ("monto uma prévia da vitrine de vocês e te mando para ver"); se houver exemplo do portfólio que conversa com o público, é aqui que ele entra.
4. A PERGUNTA: leve, de responder com uma palavra.
A "mensagem" continua a "abertura": ela responde ao que a pessoa acabou de dizer e SÓ AQUI o Rafael se apresenta ("é que eu faço site aqui em Maringá e entrei pra ver..."). Não repita o gancho com as mesmas palavras da abertura.

Regras do tom, nas duas:
- Três a cinco frases na "mensagem", uma ou duas na "abertura", como se digitadas no celular.
- Nunca preço, nunca pressão, sem travessão, sem emoji, sem "Prezado", sem cara de mala direta.
- NUNCA escreva "bom dia", "boa tarde" ou "boa noite" com todas as letras. A mensagem é escrita agora e mandada horas ou dias depois, e saudação errada para a hora entrega na primeira linha que o texto foi escrito antes. Se quiser saudar, escreva a variável {saudacao} (ou {Saudacao} para abrir a frase), que o CRM troca pela hora certa de Maringá no instante do envio.
- NUNCA o verbo "desenhar" com o cliente (aconteceu de verdade: o cliente entendeu "desenho" como rabisco de papel, não como site). Fale "faço sites", "crio sites", "monto uma prévia". "Desenhar" é vocabulário de estúdio, não de loja.

Honestidade acima de tudo: nunca cite no gancho algo que não apareceu nos resultados ou nos dados colhidos. E AUSÊNCIA DE RESULTADO NÃO É PROVA DE AUSÊNCIA: só afirme que o negócio "não tem" Instagram, site ou ficha se isso foi conferido; havendo candidato não conferido ou dúvida, não afirme nada sobre existir ou não.

QUANDO A PESQUISA É INCONCLUSIVA, O DOSSIÊ ENCOLHE. Se você não confirmou NENHUMA presença real do negócio (nenhum perfil ativo conferido, nenhum site, nenhuma ficha no Maps), então: o resumo diz isso em uma ou duas frases, "presenca" leva no máximo dois itens do que dá para afirmar, e "dor", "gancho", "abertura" e "mensagem" vão como null. Uma mensagem de prospecção sem nenhum fato confirmado por trás é pior que nenhuma: o Rafael completa o arroba na ficha e refaz a pesquisa. Não escreva parágrafos de "não foi possível confirmar" repetidos: uma frase basta.

Responda SOMENTE com um JSON neste formato exato, sem texto antes nem depois:
{
  "resumo": "o que o negócio é, em duas ou três frases",
  "presenca": ["um achado por item, frases curtas"],
  "dor": "a dor provável, uma ou duas frases",
  "gancho": "o fato concreto para abrir a conversa",
  "abertura": "o primeiro toque: até 200 caracteres, uma pergunta, sem link e sem oferta",
  "mensagem": "o segundo toque, para depois que a pessoa responder",
  "ticket_sugerido": 999,
  "fontes": [{"titulo": "nome da página", "url": "https://..."}],
  "cadastro": {"empresa": "...", "instagram": "...", "whatsapp": "...", "email": "...", "nicho": "...", "cidade": "..."},
  "exemplo": {"nome": "o projeto do portfólio escolhido", "url": "https://..."},
  "veredito": "quente",
  "veredito_motivo": "uma frase dizendo por que este lead é quente, morno ou frio"
}
"ticket_sugerido" é um número em reais entre 999 e 5400, ou null se não der para estimar.
"fontes" leva no máximo as 3 páginas mais úteis, e só do próprio negócio ou de avaliações (Instagram, site, Maps, iFood). Site de consulta de CNPJ e diretório de cadastro nunca são fonte.
"cadastro" é o que você CONFIRMOU sobre o negócio, para preencher a ficha: o nome real da empresa, o arroba do perfil ATIVO do Instagram (sem @, só o nome do perfil; nunca de conta vazia ou abandonada), o WhatsApp com DDD somente se o próprio negócio o publica (link wa.me na bio, site ou Maps), o e-mail somente se público, o nicho em duas ou três palavras, a cidade. Campo que você não confirmou vai como null; chute aqui vira mensagem para a pessoa errada.
"exemplo" é o projeto do portfólio escolhido pela regra acima, com nome e url EXATAMENTE como estão na lista, ou null se nenhum conversar.`;
}

/* ---------- a extração tolerante ----------
   O modelo é instruído a responder só o JSON, e quase sempre obedece. O
   "quase" é o motivo desta função: cerca de código, uma frase antes, uma
   citação no meio. Pega do primeiro "{" ao último "}" e tenta. */
function extrairJson(texto: string): ResultadoPesquisa {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) throw new Error("A resposta veio sem JSON.");
  const bruto = JSON.parse(texto.slice(inicio, fim + 1)) as Record<string, unknown>;

  const texto_ = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const lista = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && Boolean(x.trim())) : undefined;

  /* A ABERTURA NÃO LEVA LINK, garantido por código. É a regra inteira do
     primeiro toque: na lista de conversas o cartão de preview é a etiqueta
     visual de anúncio, e ele aparece antes de qualquer palavra ser lida.
     O prompt proíbe, mas o mesmo modelo que vivia esquecendo de colar o
     link na mensagem também cola link onde não deve. */
  const semLink = (t: string) =>
    t
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\b[\w-]+\.(vercel\.app|com\.br|com)(\/\S*)?\b/gi, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const aberturaBruta = texto_(bruto.abertura);
  const abertura = aberturaBruta ? semLink(semSaudacaoFixa(aberturaBruta)) : undefined;
  const mensagem = texto_(bruto.mensagem);

  const resultado: ResultadoPesquisa = {
    resumo: texto_(bruto.resumo),
    presenca: lista(bruto.presenca),
    dor: texto_(bruto.dor),
    gancho: texto_(bruto.gancho),
    abertura: abertura || undefined,
    mensagem: mensagem ? semSaudacaoFixa(mensagem) : undefined,
    ticket_sugerido: typeof bruto.ticket_sugerido === "number" ? bruto.ticket_sugerido : null,
    fontes: Array.isArray(bruto.fontes)
      ? bruto.fontes
          .filter(
            (f): f is { titulo: string; url: string } =>
              Boolean(f) && typeof f === "object" && typeof (f as { url?: unknown }).url === "string",
          )
          .map((f) => ({ titulo: String(f.titulo || f.url), url: f.url }))
          .slice(0, 6)
      : undefined,
  };

  /* O exemplo do portfólio volta VALIDADO contra o catálogo real: o que
     entra no dossiê é sempre o nome e a url de data/portfolio.ts, nunca o
     que o modelo escreveu. Link de portfólio inventado numa mensagem de
     vendas seria o pior erro possível desta função. */
  if (bruto.exemplo && typeof bruto.exemplo === "object") {
    const e = bruto.exemplo as { nome?: unknown; url?: unknown };
    const doCatalogo = projetos.find(
      (p) =>
        p.url &&
        (p.url === e.url || p.nome.toLowerCase() === String(e.nome ?? "").trim().toLowerCase()),
    );
    if (doCatalogo?.url) resultado.exemplo = { nome: doCatalogo.nome, url: doCatalogo.url };
  }

  /* O LINK DO EXEMPLO VAI NA MENSAGEM, garantido por código. O prompt
     pede, mas o modelo vivia citando a Lancellotti sem colar o endereço
     ("não está mandando o link da página que fiz"), e cliente não
     procura link sozinho. Se a URL não está na mensagem, ela entra numa
     linha própria no fim: em WhatsApp, link em linha própria vira o
     cartão de preview, que é exatamente a vitrine se mostrando. Se o
     modelo colou uma URL do catálogo diferente da validada, a linha
     também entra, porque a validada é a que vale. */
  if (
    resultado.mensagem &&
    resultado.exemplo &&
    /* o endereço sem protocolo cobre o modelo que cola "x.vercel.app" seco */
    !resultado.mensagem.includes(resultado.exemplo.url.replace(/^https?:\/\//, ""))
  ) {
    resultado.mensagem = `${resultado.mensagem}\n\n${resultado.exemplo.url}`;
  }

  /* O cadastro confirmado, campo a campo e só texto: qualquer outra coisa
     que o modelo mande ali é descartada em silêncio. */
  if (bruto.cadastro && typeof bruto.cadastro === "object") {
    const c = bruto.cadastro as Record<string, unknown>;
    const cadastro = {
      empresa: texto_(c.empresa) ?? null,
      instagram: texto_(c.instagram)?.replace(/^@/, "") ?? null,
      whatsapp: texto_(c.whatsapp) ?? null,
      email: texto_(c.email) ?? null,
      nicho: texto_(c.nicho) ?? null,
      cidade: texto_(c.cidade) ?? null,
    };
    if (Object.values(cadastro).some(Boolean)) resultado.cadastro = cadastro;
  }

  /* O veredito, validado contra os três valores: qualquer outra coisa é
     descartada e o dossiê fica sem veredito, que a ficha trata. */
  if (bruto.veredito === "quente" || bruto.veredito === "morno" || bruto.veredito === "frio") {
    resultado.veredito = bruto.veredito;
    resultado.veredito_motivo = texto_(bruto.veredito_motivo);
  }

  /* Só o resumo é obrigatório: pesquisa inconclusiva vem DE PROPÓSITO sem
     mensagem (a regra do dossiê que encolhe), e lead frio também, e isso
     é resultado válido, não erro. */
  if (!resultado.resumo) {
    throw new Error("A resposta veio sem resumo.");
  }
  return resultado;
}

/* ---------- a resposta do OpenRouter, no que importa ---------- */
type RespostaOpenRouter = {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: { cost?: number };
  error?: { message?: string };
};

/* ---------- a chamada crua, compartilhada pelas duas frentes ----------
   Pesquisar um lead e sugerir uma resposta são o mesmo transporte com
   cargas diferentes: mesmo endpoint, mesma chave, mesmo modelo, mesmo
   tratamento de erro. O que muda é o pedido e se a busca vai junto. */
async function chamarModelo(opcoes: {
  pedido: string;
  comBusca: boolean;
  max_tokens: number;
  /* O esforço de raciocínio é ONDE MORA O CUSTO. Sem ele, o Opus pensa no
     nível máximo por padrão e uma pesquisa saía a US$ 0,73; em "low", a
     mesma pesquisa saiu a US$ 0,16 com a mesma qualidade de dossiê
     (medido em 17/08, mesmo lead, mesma colheita). Coleta e redação curta
     não são raciocínio duro: "low" para pesquisar, "medium" onde a
     nuance da conversa pesa. */
  esforco: "low" | "medium" | "high";
}): Promise<{ texto: string; custo_usd?: number }> {
  const chave = process.env.OPENROUTER_API_KEY;
  if (!chave) {
    throw new Error(
      "Falta a variável OPENROUTER_API_KEY (.env.local em casa, Settings na Vercel). " +
        "A chave sai de openrouter.ai em Keys.",
    );
  }

  const resposta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${chave}`,
      "content-type": "application/json",
      /* Etiqueta do OpenRouter: os dois cabeçalhos identificam o app no
         painel de uso deles. Nada quebra sem eles. */
      "http-referer": "https://rafaelrazeira-estudio.vercel.app",
      "x-title": "CRM Rafael Razeira",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODELO || MODELO_PADRAO,
      max_tokens: opcoes.max_tokens,
      reasoning: { effort: opcoes.esforco },
      /* `usage.include` faz o OpenRouter devolver o custo em dólares da
         própria chamada, que vai gravado no dossiê. */
      usage: { include: true },
      /* engine "native" liga a busca da própria Anthropic por dentro do
         OpenRouter: o modelo pesquisa sozinho, em várias tentativas, em
         vez de receber uma rodada única do Exa. É o que faz a pesquisa
         alcançar o Instagram de verdade. */
      ...(opcoes.comBusca ? { plugins: [{ id: "web", engine: "native" }] } : {}),
      messages: [
        { role: "system", content: CONTEXTO_ESTUDIO },
        { role: "user", content: opcoes.pedido },
      ],
    }),
  });

  const corpo = (await resposta.json().catch(() => null)) as RespostaOpenRouter | null;

  if (!resposta.ok) {
    const frase = corpo?.error?.message || `o OpenRouter respondeu ${resposta.status}`;
    throw new Error(`A chamada falhou: ${frase}`);
  }

  const escolha = corpo?.choices?.[0];
  const texto = escolha?.message?.content;
  if (!texto) throw new Error("A resposta voltou vazia. Tente de novo.");
  if (escolha?.finish_reason === "length") {
    throw new Error("A resposta estourou o tamanho e veio cortada. Tente de novo.");
  }

  return { texto, custo_usd: typeof corpo?.usage?.cost === "number" ? corpo.usage.cost : undefined };
}

/* Um nome sem espaço, só com letras, números, ponto e sublinhado, tem cara
   de arroba. Aconteceu no primeiro uso real: o Rafael anotou "fvkstore1"
   como NOME do lead e deixou o campo do Instagram vazio, e a colheita nem
   rodou. Quando o campo está vazio e o nome parece arroba, o nome vale. */
const pareceArroba = (nome: string) => /^@?[a-z0-9._]{3,30}$/i.test(nome.trim());

/* ---------- a descoberta barata: dork no DuckDuckGo ----------
   A busca do próprio Instagram exige login, mas o Google e companhia
   indexam os perfis, e o DuckDuckGo tem uma versão em HTML puro que
   responde sem chave e sem login. Um "site:instagram.com" com o nome do
   negócio devolve os arrobas candidatos em uma requisição, de graça: é o
   primeiro estágio da descoberta, e o pago só roda se este voltar vazio.
   Foi ele que achou o arroba ATUAL da Noz Basic Store
   (@nozbasicstorehering) depois que a busca do modelo devolveu o antigo
   morto. Os candidatos saem ordenados por parecença com o nome. */
async function buscarArrobasNaWeb(lead: Lead): Promise<string[]> {
  const nome = (lead.empresa || lead.nome).trim();
  if (!nome) return [];
  const consulta = `site:instagram.com "${nome}"${lead.cidade ? ` ${lead.cidade}` : ""}`;

  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(consulta)}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const html = await r.text();

    const brutos = [...html.matchAll(/instagram\.com(?:%2F|\/)([a-zA-Z0-9._]{3,30})/g)].map(
      (m) => m[1].toLowerCase(),
    );
    const lixo = new Set(["p", "reel", "reels", "explore", "stories", "accounts", "tv", "www"]);
    const unicos = [...new Set(brutos)].filter((h) => !lixo.has(h));

    /* Parecença simples e suficiente: quantos pedaços do nome do negócio
       aparecem dentro do arroba. "noz basic store" pontua 3 em
       @nozbasicstorehering e 0 em @lojadamaria. */
    const pedacos = nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((p) => p.length >= 3);
    const nota = (h: string) => pedacos.filter((p) => h.includes(p)).length;

    return unicos.sort((a, b) => nota(b) - nota(a)).slice(0, 4);
  } catch {
    return [];
  }
}

/* ---------- a descoberta do arroba ----------
   Lead importado de lista chega só com nome e cidade, e sem arroba a
   colheita não tem onde bater. A busca do próprio Instagram exige login
   (testado: 401), mas a busca nativa ACHA perfil de Instagram quando a
   pergunta é só essa: uma chamada curta, com um pedido de uma linha,
   devolve o arroba ou null. Com o arroba na mão, a colheita do perfil
   roda como sempre, e é ela que traz a bio, o link e o telefone
   publicado. É a chamada mais barata do motor e só roda quando a
   colheita direta falhou. */
async function descobrirArroba(lead: Lead): Promise<{ arroba: string | null; custo_usd?: number }> {
  const dados = [
    `Negócio: ${lead.empresa || lead.nome}`,
    lead.cidade ? `Cidade: ${lead.cidade}` : null,
    lead.nicho ? `Ramo: ${lead.nicho}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { texto, custo_usd } = await chamarModelo({
      pedido: `Qual é o arroba do Instagram deste negócio brasileiro?

${dados}

Procure na web (por exemplo "site:instagram.com ${lead.empresa || lead.nome}"). Responda SOMENTE com um JSON:
{"instagram": "o_arroba_sem_arroba"} se você tiver confiança razoável de que o perfil é DESTE negócio (nome e cidade ou ramo batendo), ou
{"instagram": null} se não achar ou ficar na dúvida. Chutar arroba de outro negócio é pior que não responder.`,
      comBusca: true,
      max_tokens: 4000,
      esforco: "low",
    });
    const inicio = texto.indexOf("{");
    const fim = texto.lastIndexOf("}");
    if (inicio === -1 || fim <= inicio) return { arroba: null, custo_usd };
    const bruto = JSON.parse(texto.slice(inicio, fim + 1)) as { instagram?: unknown };
    return {
      arroba: typeof bruto.instagram === "string" ? arrobaLimpo(bruto.instagram) : null,
      custo_usd,
    };
  } catch {
    /* Descoberta é bônus: falhou, a pesquisa segue sem arroba. */
    return { arroba: null };
  }
}

/* ---------- a pesquisa ---------- */
export async function pesquisarLead(lead: Lead, templates: Template[]): Promise<ResultadoPesquisa> {
  /* A colheita do Instagram roda antes, e o resultado (ou a falta dele)
     entra no pedido. Sem arroba que funcione, a descoberta tenta achar um
     antes: é o caminho de todo lead importado de lista, que chega só com
     nome e cidade. E cada desfecho vira a frase certa no pedido:

       colheu ......... os dados do perfil, como fato
       não existe ..... o aviso de arroba morto, para NÃO ir ao cadastro
       descoberto ..... a pista "provável, confirme", quando o perfil não
                        abriu por bloqueio mas a busca teve confiança */
  const arrobaConhecido = arrobaLimpo(
    lead.instagram || (pareceArroba(lead.nome) ? lead.nome : null),
  );
  let doInstagram: string | null = null;
  let custoDescoberta = 0;

  const direta = await perfilInstagram(arrobaConhecido);
  if (direta.tipo === "ok" && !direta.fraco) {
    doInstagram = direta.texto;
  } else {
    const avisos: string[] = [];
    if (direta.tipo === "nao_existe" && arrobaConhecido) {
      avisos.push(
        `Atenção: o arroba anotado @${arrobaConhecido} NÃO existe no Instagram; não o use no cadastro nem na mensagem.`,
      );
    }
    /* Perfil que abriu vazio é suspeito, não confirmação: pode ser conta
       abandonada ou de outra pessoa com o mesmo nome. Ele entra como
       aviso e a descoberta CONTINUA procurando o perfil ativo. */
    if (direta.tipo === "ok" && direta.fraco && arrobaConhecido) {
      avisos.push(
        `Atenção: o arroba @${arrobaConhecido} abre um perfil VAZIO (sem publicações, ou sem bio e sem link):\n${direta.texto}\nIsso pode ser conta abandonada ou de outra pessoa com nome parecido. NÃO construa gancho nem mensagem sobre esse perfil vazio, e só o use no cadastro se nenhum perfil ativo do negócio aparecer.`,
      );
    }

    /* Primeiro a descoberta de graça: o dork devolve candidatos e a
       colheita testa os dois mais parecidos. Só se a web não der nada é
       que a descoberta paga (a chamada ao modelo) entra. */
    const candidatos = (await buscarArrobasNaWeb(lead)).filter((c) => c !== arrobaConhecido);

    for (const candidato of candidatos.slice(0, 2)) {
      const tentativa = await perfilInstagram(candidato);
      if (tentativa.tipo === "ok" && !tentativa.fraco) {
        doInstagram = tentativa.texto;
        break;
      }
      if (tentativa.tipo === "ok" && tentativa.fraco) {
        avisos.push(`O arroba @${candidato} abre um perfil vazio; provavelmente não é o do negócio.`);
      }
      if (tentativa.tipo === "nao_existe") {
        avisos.push(`O arroba @${candidato} apareceu na busca mas NÃO existe mais; ignore-o.`);
      }
    }

    if (!doInstagram && candidatos.length) {
      doInstagram = `Arrobas candidatos achados na busca pelo nome, que NÃO deu para conferir agora: ${candidatos.map((c) => `@${c}`).join(", ")}. IMPORTANTE: um destes provavelmente É o perfil do negócio; nunca afirme que o negócio não tem Instagram, e não construa gancho sobre a ausência dele.`;
    }

    if (!doInstagram && !candidatos.length) {
      const descoberta = await descobrirArroba(lead);
      custoDescoberta = descoberta.custo_usd ?? 0;

      if (descoberta.arroba && descoberta.arroba !== arrobaConhecido) {
        const segunda = await perfilInstagram(descoberta.arroba);
        if (segunda.tipo === "ok") {
          /* Aqui um perfil fraco passa mesmo assim, com o texto dizendo
             que está vazio: é o fim da fila e dado com ressalva vale mais
             que dado nenhum. */
          doInstagram = segunda.texto;
        } else if (segunda.tipo === "falhou") {
          doInstagram = `Arroba provável, descoberto na busca (confirme antes de usar): @${descoberta.arroba}`;
        } else {
          avisos.push(
            `O arroba @${descoberta.arroba} apareceu na busca mas o perfil NÃO existe mais; ignore-o.`,
          );
        }
      }
    }

    if (avisos.length) {
      doInstagram = doInstagram ? `${avisos.join("\n")}\n${doInstagram}` : avisos.join("\n");
    }
  }

  /* O link da bio colhido é a porta do gancho favorito ("linktree sem
     site"), então quando ele é um agregador a colheita o ABRE e o que
     existe lá dentro entra no pedido como fato. Sem isso o modelo
     afirmava o conteúdo do linktree sem nunca tê-lo visto. */
  let doLinkDaBio: string | null = null;
  const linkBio = doInstagram?.match(/Link da bio: (https?:\/\/\S+)/i)?.[1];
  if (linkBio && AGREGADOR.test(`${linkBio}/`)) {
    doLinkDaBio = await colherLinkDaBio(linkBio);
  }

  const { texto, custo_usd } = await chamarModelo({
    pedido: montarPedido(lead, templates, doInstagram, doLinkDaBio),
    comBusca: true,
    /* 12000 e não 4000, por um motivo que custou um teste: nos Claude
       atuais o max_tokens é teto de PENSAMENTO + resposta somados, e numa
       pesquisa cheia de resultados o pensamento sozinho passa de 3000
       tokens. Com 4000, a resposta chegava cortada no meio do JSON. */
    max_tokens: 12000,
    esforco: "low",
  });

  const resultado = extrairJson(texto);
  /* O custo do dossiê é o da pesquisa inteira, descoberta incluída. */
  const total = (custo_usd ?? 0) + custoDescoberta;
  return { ...resultado, custo_usd: total || undefined };
}

/* ============================================================
   A RESPOSTA SUGERIDA — a fase 2, no mesmo motor

   O cliente respondeu no WhatsApp; o Rafael cola a resposta e a IA
   sugere a próxima mensagem, com o dossiê e a linha do tempo como
   contexto. Sem busca na web: tudo que importa já está na ficha, e sem
   busca a sugestão sai em segundos em vez de minutos.

   O resultado NÃO é gravado no banco: a sugestão vale para aquele
   momento da conversa, e conversa muda. O que fica registrado é o toque
   de saída, quando o Rafael de fato mandar.
   ============================================================ */
export async function sugerirResposta(
  lead: Lead,
  interacoes: Pick<Interacao, "direcao" | "canal" | "resumo" | "created_at">[],
  respostaDoCliente: string,
): Promise<{ mensagem: string; custo_usd?: number }> {
  const d = lead.dossie?.status === "ok" ? lead.dossie : null;

  /* Onde a conversa está acontecendo: o canal do último toque de entrada
     é a verdade (foi por ali que o cliente falou); sem entrada registrada,
     o canal que o lead TEM decide. Dizer "respondeu no WhatsApp" para uma
     conversa de direct faz a mensagem prometer o canal errado ("te chamo
     no WhatsApp" para quem não tem número). */
  const canalDaConversa =
    [...interacoes].reverse().find((i) => i.direcao === "entrada")?.canal ??
    (lead.whatsapp ? "whatsapp" : lead.instagram ? "instagram" : "whatsapp");
  const ondeConversa = canalDaConversa === "instagram" ? "no direct do Instagram" : "no WhatsApp";

  const dados = [
    `Nome do contato: ${lead.nome}`,
    lead.empresa ? `Negócio: ${lead.empresa}` : null,
    lead.nicho ? `Nicho: ${lead.nicho}` : null,
    `Estágio no funil: ${lead.estagio}`,
    lead.proximo_passo ? `Próximo passo anotado: ${lead.proximo_passo}` : null,
    lead.ticket_estimado ? `Ticket estimado: R$ ${lead.ticket_estimado}` : null,
    lead.notas ? `Notas do Rafael: ${lead.notas}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const dossie = d
    ? [
        d.resumo ? `O que o negócio é: ${d.resumo}` : null,
        d.dor ? `A dor: ${d.dor}` : null,
        d.gancho ? `O gancho usado: ${d.gancho}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  /* Os últimos toques, do mais antigo para o mais novo, como uma conversa
     se lê. O resumo de cada toque é o que o Rafael anotou, não a mensagem
     literal, e o pedido avisa isso. */
  const historico = interacoes
    .slice(-10)
    .map(
      (i) =>
        `${i.created_at.slice(0, 10)} · ${i.direcao === "saida" ? "Rafael" : lead.nome} (${i.canal}): ${i.resumo ?? "sem resumo"}`,
    )
    .join("\n");

  const pedido = `O lead abaixo respondeu ${ondeConversa} e o Rafael precisa da próxima mensagem, para mandar pelo mesmo canal.

${dados}
${dossie ? `\nDo dossiê da pesquisa:\n${dossie}\n` : ""}${historico ? `\nA linha do tempo (resumos anotados pelo Rafael, não as mensagens literais):\n${historico}\n` : ""}
O QUE O CLIENTE ACABOU DE RESPONDER:
"${respostaDoCliente.trim()}"

${BLOCO_PORTFOLIO}

Escreva a próxima mensagem do Rafael. Regras:
- Curta: duas a quatro frases, como se digitada no celular.
- Responde exatamente ao que a pessoa disse antes de avançar qualquer coisa.
- O exemplo do portfólio entra SÓ se a conversa pedir (a pessoa quis ver trabalho, perguntou o que o Rafael faz, ou o degrau natural é mostrar prova). Se a linha do tempo mostra que um exemplo já foi mandado, não repete. Quando entrar, SEMPRE com o link completo (https://...) colado na mensagem, numa linha própria: citar trabalho sem link é vitrine de porta fechada.
- Avança UM degrau só, de acordo com o estágio: quem ainda conversa anda para a prévia sem compromisso; quem já viu prévia anda para a proposta; quem travou no preço ouve o caminho da entrada menor. Nunca pula degrau, nunca pressiona.
- Se a pessoa disse que não quer ou não pode agora, aceita com elegância e deixa a porta aberta, sem insistência.
- Sem travessão, sem emoji, sem formalidade de agência. E NUNCA o verbo "desenhar" (cliente entende rabisco): fale "faço", "crio", "monto".
- NUNCA escreva "bom dia", "boa tarde" ou "boa noite" com todas as letras: a sugestão é escrita agora e mandada depois, e saudação errada para a hora entrega o texto pronto. Se quiser saudar, escreva {saudacao} (ou {Saudacao} para abrir a frase), que o CRM troca pela hora certa de Maringá na hora do envio.

Responda SOMENTE com um JSON neste formato, sem texto antes nem depois:
{"mensagem": "a mensagem pronta para colar na conversa"}`;

  const { texto, custo_usd } = await chamarModelo({
    pedido,
    comBusca: false,
    /* Sem busca o pensamento é curto, mas ele continua dentro do teto:
       6000 dá folga sem abrir espaço para custo besta. */
    max_tokens: 6000,
    /* "medium" e não "low": é a única chamada onde a nuance da conversa
       decide a mensagem, e o contexto dela é pequeno, então o degrau a
       mais custa centavos. */
    esforco: "medium",
  });

  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim <= inicio) throw new Error("A sugestão veio sem JSON.");
  const bruto = JSON.parse(texto.slice(inicio, fim + 1)) as { mensagem?: unknown };
  const cru = typeof bruto.mensagem === "string" ? bruto.mensagem.trim() : "";
  if (!cru) throw new Error("A sugestão veio vazia.");
  /* Mesma garantia do dossiê: a saudação vira variável e o relógio resolve
     na hora de colar, não na hora de sugerir. */
  const mensagem = semSaudacaoFixa(cru);

  return { mensagem, custo_usd };
}
