/* ============================================================
   CONFERIR O @ — a porta da vitrine pergunta à Meta se a loja existe.

   POR QUE EXISTE: na primeira semana da campanha "prévia grátis" (01 a
   07/09/2026) chegaram 14 pessoas, e só DUAS tinham uma conta profissional
   no Instagram. O resto era "Damarco", "go99", "Lojas56", um e-mail digitado
   no campo do @. A oferta promete "manda o @ que eu monto a sua loja", e a
   oficina (lib/producao/instagram.ts) monta a partir das fotos que a
   Business Discovery devolve. Sem conta profissional não há foto, não há
   prévia, e o lead custou o clique inteiro para não existir.

   Pior que o desperdício: cada envio desses disparava Lead e Contact para a
   Meta, e a campanha otimiza por Contact. Uma semana ensinando o algoritmo a
   procurar quem preenche formulário sem ter loja.

   A MESMA CHAMADA da oficina e do CRM (`perfilOficial` em lib/crm/pesquisa.ts),
   com dois campos e sem a reserva pública: a reserva demora até 8s e esta
   função roda dentro da rota do formulário, com a pessoa olhando o botão.

   ---------- os três desfechos ----------
   ok           conta profissional encontrada: o lead vale, segue tudo.
   invalido     formato impossível (e-mail, 40 letras; o espaço só depois
                de tentar as emendas, ver `emendas`) ou a Meta
                respondeu 110: "não existe ou não é conta profissional".
                Dos dois jeitos não há de onde tirar a prévia.
   desconhecido a Meta não respondeu, o token venceu, a variável falta.
                É problema NOSSO, e a pessoa não paga por ele: quem chama
                trata como ok. O motivo vai para o log.

   Um site (`loja.com.br`) não é conferido: o formulário da oferta ainda
   aceita "INSTAGRAM OU SITE", e site não tem Business Discovery. Vai como
   desconhecido, que é a verdade.
   ============================================================ */

const VERSAO = "v23.0";

/* Abaixo do TIMEOUT_MS da rota (6s), com folga para a gravação que vem
   depois. A Business Discovery costuma responder em menos de um segundo. */
const TIMEOUT_MS = 3500;

export type EstadoArroba = "ok" | "invalido" | "desconhecido";

export type Conferencia = {
  estado: EstadoArroba;
  /* o @ limpo, como a Meta o conhece: sem @, sem URL, minúsculo */
  arroba: string;
  seguidores?: number;
  posts?: number;
  motivo?: string;
};

/* O que a pessoa digita vira o que a Meta entende: "@Loja", "instagram.com/loja/",
   "https://www.instagram.com/loja?igsh=..." viram "loja". */
export function limparArroba(bruto: string): string {
  return String(bruto || "")
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/.*$/, "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

/* Parece um site, não um perfil: tem ponto no meio e um TLD no fim, e não
   é instagram.com (esse já virou @ na limpeza). */
function pareceSite(v: string): boolean {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(v) && !/^instagram\.com$/i.test(v);
}

/* A régua do próprio Instagram: até 30 caracteres, letras, números, ponto e
   sublinhado. Um e-mail tem @ no meio e cai aqui. Nenhum dos dois precisa de
   rede para ser recusado. E precisa de pelo menos uma letra ou número
   (04/11/2026): "." passou como @ e virou card com nome e Instagram ".",
   porque a Meta respondeu com erro e o @ entrou como "desconhecido". */
const FORMATO = /^(?=[._]*[a-z0-9])[a-z0-9._]{1,30}$/;

/* O @ escrito como nome (10/11/2026): "@voltz sports" chegou de um anúncio
   pago da /loja-online com WhatsApp e foi recusado pelo espaço; a pessoa não
   tentou de novo. Quem escreve com espaço ou acento quase sempre está
   escrevendo o nome da loja, e o @ de verdade é esse nome emendado. Então,
   antes de recusar, pergunta à Meta pelas emendas possíveis: junto
   ("voltzsports"), com ponto e com sublinhado, sem acento. Só vale a que a
   Meta CONFIRMAR: um chute não confirmado nunca vira o @ da loja. */
function emendas(arroba: string): string[] {
  if (!/\s/.test(arroba) && !/[^\x00-\x7f]/.test(arroba)) return [];
  const sem = arroba.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const partes = sem.split(/\s+/).filter(Boolean);
  const lista = [partes.join(""), partes.join("."), partes.join("_")];
  return [...new Set(lista)].filter((v) => FORMATO.test(v));
}

type Resposta = { estado: EstadoArroba; arroba: string; seguidores?: number; posts?: number; motivo?: string };

async function consultar(arroba: string, token: string, id: string, signal: AbortSignal): Promise<Resposta> {
  try {
    const campos = "username,followers_count,media_count";
    const r = await fetch(
      `https://graph.facebook.com/${VERSAO}/${id}?fields=business_discovery.username(${encodeURIComponent(arroba)})%7B${campos}%7D&access_token=${token}`,
      { signal },
    );
    const j = (await r.json()) as {
      business_discovery?: { username?: string; followers_count?: number; media_count?: number };
      error?: { code?: number; message?: string };
    };
    if (j.error) {
      /* 110 é a única resposta que fala da LOJA e não de nós: "Invalid user
         id" quer dizer que esse @ não existe ou não é conta profissional. */
      if (j.error.code === 110) return { estado: "invalido", arroba, motivo: "110" };
      console.error("[arroba] a Meta recusou:", j.error.code, (j.error.message || "").slice(0, 120));
      return { estado: "desconhecido", arroba, motivo: `meta ${j.error.code}` };
    }
    const d = j.business_discovery;
    if (!d) return { estado: "desconhecido", arroba, motivo: "sem corpo" };
    return { estado: "ok", arroba: d.username || arroba, seguidores: d.followers_count, posts: d.media_count };
  } catch (e) {
    console.error("[arroba] falha ao conferir:", (e as Error)?.message || e);
    return { estado: "desconhecido", arroba, motivo: "exceção" };
  }
}

export async function conferirArroba(bruto: string): Promise<Conferencia> {
  const cru = String(bruto || "").trim();
  if (pareceSite(cru)) return { estado: "desconhecido", arroba: cru, motivo: "site" };

  const arroba = limparArroba(cru);
  const tentativas = FORMATO.test(arroba) ? [arroba] : emendas(arroba);
  if (!arroba || !tentativas.length) return { estado: "invalido", arroba, motivo: "formato" };

  const token = process.env.IG_GRAPH_TOKEN;
  const id = process.env.IG_GRAPH_ID;
  if (!token || !id) {
    console.warn("[arroba] IG_GRAPH_TOKEN ou IG_GRAPH_ID ausente: o @ não foi conferido.");
    /* sem rede não há como confirmar a emenda: o escrito com espaço segue recusado */
    return tentativas[0] === arroba ? { estado: "desconhecido", arroba, motivo: "sem token" } : { estado: "invalido", arroba, motivo: "formato" };
  }

  /* As emendas vão juntas, no mesmo prazo de uma consulta só: a rota tem 6s. */
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const respostas = await Promise.all(tentativas.map((a) => consultar(a, token, id, ctrl.signal)));
    if (tentativas[0] === arroba) return respostas[0];
    const achada = respostas.find((r) => r.estado === "ok");
    if (achada) return { ...achada, motivo: `emenda de "${arroba}"` };
    return { estado: "invalido", arroba, motivo: "formato" };
  } finally {
    clearTimeout(t);
  }
}
