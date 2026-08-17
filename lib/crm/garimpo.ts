/* ============================================================
   O GARIMPO — a lista de leads direto do Google Maps

   A fonte certa para negócio local, aprendida do jeito caro: o Vibe
   Prospecting pescava no LinkedIn, onde o cliente do estúdio não mora
   (quem tem página lá ou já tem site, ou já fechou). O Maps é onde o
   comércio de rua vive, e os campos dele decidem sozinhos quem é
   prospect: TEM SITE OU NÃO (dado real, não autodeclarado), nota,
   número de avaliações, telefone.

   A consulta é a Places API (New) da Google, busca por texto ("lojas de
   roupas femininas em Maringá"). O FieldMask pede só os campos usados:
   na Places API o preço é por campo pedido, e pedir tudo custa o triplo
   para jogar fora.

   O filtro "só sem site" é O filtro da vitrine: negócio vivo (aberto,
   com avaliações) e sem presença própria é exatamente quem a prévia de
   R$ 999 atende.
   ============================================================ */

import { projetos } from "@/data/portfolio";

/* Cliente do portfólio aparece "sem site" no Maps, porque o site dele é
   o que o estúdio fez e ninguém linkou lá. Prospectar cliente da casa é
   vexame: aconteceu no primeiro garimpo real (BellaBlack e Filato Bene
   voltaram como leads) e o pente vive aqui desde então. */
const chaoDeNome = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
const NOMES_DA_CASA = new Set(projetos.map((p) => chaoDeNome(p.nome)));
const ehClienteDaCasa = (nome: string) => {
  const chao = chaoDeNome(nome);
  for (const cliente of NOMES_DA_CASA) {
    if (chao.includes(cliente) || cliente.includes(chao)) return true;
  }
  return false;
};

export type Garimpado = {
  nome: string;
  endereco: string | null;
  telefone: string | null;
  /* dígitos com DDD, SÓ quando o número tem cara de celular (11 dígitos
     com o nono dígito): fixo não recebe WhatsApp e não entra no campo */
  whatsapp: string | null;
  site: string | null;
  nota: number | null;
  avaliacoes: number | null;
};

/* Telefone do Maps vem formatado ("(44) 99999-7219"). Celular brasileiro
   é DDD + 9 + oito dígitos; qualquer outra coisa é fixo e vira nota, não
   WhatsApp. */
function celularOuNull(telefone: string | null): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "").replace(/^55/, "");
  return digitos.length === 11 && digitos[2] === "9" ? digitos : null;
}

export async function garimparNegocios(opcoes: {
  busca: string;
  cidade: string;
  /* teto de RESULTADOS DA BUSCA (antes do filtro de site); a API pagina
     de 20 em 20 */
  max?: number;
  soSemSite?: boolean;
}): Promise<Garimpado[]> {
  const chave = process.env.GOOGLE_PLACES_KEY;
  if (!chave) {
    throw new Error(
      "Falta a variável GOOGLE_PLACES_KEY (.env.local em casa, Settings na Vercel). " +
        "A chave sai do console.cloud.google.com em APIs e serviços, Credenciais.",
    );
  }

  const max = Math.min(opcoes.max ?? 40, 60);
  const soSemSite = opcoes.soSemSite ?? true;
  const achados: Garimpado[] = [];
  let pageToken: string | undefined;

  /* A paginação da Places: cada página traz até 20 e um token da
     próxima. O laço para no teto, na última página, ou em três páginas,
     o que vier primeiro. */
  for (let pagina = 0; pagina < 3 && achados.length < max; pagina++) {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": chave,
        "X-Goog-FieldMask":
          "places.displayName,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.formattedAddress,places.businessStatus,nextPageToken",
      },
      body: JSON.stringify({
        textQuery: `${opcoes.busca} em ${opcoes.cidade}`,
        languageCode: "pt-BR",
        regionCode: "BR",
        pageSize: 20,
        ...(pageToken ? { pageToken } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });

    const corpo = (await r.json().catch(() => null)) as {
      places?: {
        displayName?: { text?: string };
        websiteUri?: string;
        nationalPhoneNumber?: string;
        rating?: number;
        userRatingCount?: number;
        formattedAddress?: string;
        businessStatus?: string;
      }[];
      nextPageToken?: string;
      error?: { message?: string };
    } | null;

    if (!r.ok) {
      throw new Error(`O garimpo falhou: ${corpo?.error?.message || `Google respondeu ${r.status}`}`);
    }

    for (const p of corpo?.places ?? []) {
      const nome = p.displayName?.text?.trim();
      if (!nome) continue;
      /* Fechado de vez não é lead; fechado temporariamente até é, mas
         mandar mensagem para loja fechada é começar mal. */
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
      if (soSemSite && p.websiteUri) continue;
      if (ehClienteDaCasa(nome)) continue;

      achados.push({
        nome,
        endereco: p.formattedAddress ?? null,
        telefone: p.nationalPhoneNumber ?? null,
        whatsapp: celularOuNull(p.nationalPhoneNumber ?? null),
        site: p.websiteUri ?? null,
        nota: p.rating ?? null,
        avaliacoes: p.userRatingCount ?? null,
      });
      if (achados.length >= max) break;
    }

    pageToken = corpo?.nextPageToken;
    if (!pageToken) break;
  }

  return achados;
}
