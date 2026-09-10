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
   invalido     formato impossível (e-mail, espaço, 40 letras) ou a Meta
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
   sublinhado. Um e-mail tem @ no meio e cai aqui; "Gráfica leão" tem
   espaço e acento e cai aqui. Nenhum dos dois precisa de rede para ser
   recusado. */
const FORMATO = /^[a-z0-9._]{1,30}$/;

export async function conferirArroba(bruto: string): Promise<Conferencia> {
  const cru = String(bruto || "").trim();
  if (pareceSite(cru)) return { estado: "desconhecido", arroba: cru, motivo: "site" };

  const arroba = limparArroba(cru);
  if (!arroba || !FORMATO.test(arroba)) return { estado: "invalido", arroba, motivo: "formato" };

  const token = process.env.IG_GRAPH_TOKEN;
  const id = process.env.IG_GRAPH_ID;
  if (!token || !id) {
    console.warn("[arroba] IG_GRAPH_TOKEN ou IG_GRAPH_ID ausente: o @ não foi conferido.");
    return { estado: "desconhecido", arroba, motivo: "sem token" };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const campos = "username,followers_count,media_count";
    const r = await fetch(
      `https://graph.facebook.com/${VERSAO}/${id}?fields=business_discovery.username(${encodeURIComponent(arroba)})%7B${campos}%7D&access_token=${token}`,
      { signal: ctrl.signal },
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
  } finally {
    clearTimeout(t);
  }
}
