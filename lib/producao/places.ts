/* ============================================================
   A LOJA FÍSICA, PELO GOOGLE

   O Instagram diz o que a loja vende. O Google diz onde ela fica, a que
   horas abre, e o que os clientes acharam. A segunda metade é a que a
   vitrine não tem como inventar, e é a que mais falta nas páginas que a
   concorrência entrega.

   ---------- por que a NOTA importa mais que o endereço ----------
   Endereço é conveniência. A nota do Google, com o número de avaliações do
   lado, é a única prova social que ninguém consegue fabricar: ela não é um
   depoimento escolhido a dedo nem um selo comprado, é a média pública de
   quem foi lá. Numa vitrine de loja pequena, "4,9 com 180 avaliações" vale
   mais que qualquer manchete.

   ---------- a chave já existe ----------
   `GOOGLE_PLACES_KEY` é a mesma do garimpo do CRM (lib/crm/garimpo.ts), e o
   endpoint é o mesmo `places:searchText` da API nova. O que muda é o
   FieldMask: aqui eu peço horário, mapa e id, que a prospecção não usa.

   ---------- e quando não acha ----------
   Loja que só existe no Instagram (sem ponto físico) não está no Places, e
   isso é NORMAL, não é erro. A colheita segue, o bloco fica vazio, e a
   vitrine simplesmente não ganha a seção "a loja". Por isso tudo aqui
   devolve `null` em vez de lançar.
   ============================================================ */

export type Lugar = {
  place_id: string | null;
  nome: string | null;
  endereco: string | null;
  telefone: string | null;
  /* Uma linha por dia da semana, do jeito que o Google escreve em pt-BR
     ("segunda-feira: 09:00 – 18:00"). Guardo o texto e não uma estrutura de
     horário: o que a vitrine faz com isso é IMPRIMIR, e converter para
     estrutura só para reimprimir é trabalho que introduz erro. */
  horario: string[] | null;
  nota: number | null;
  avaliacoes: number | null;
  maps: string | null;
  site: string | null;
};

const CAMPOS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.businessStatus",
].join(",");

type Cru = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  businessStatus?: string;
};

/* ---------- palavras que não identificam ninguém ----------
   Elas aparecem no nome de metade das lojas de moda do Brasil, e por isso
   não servem para conferir identidade: aceitar um lugar porque ele também
   tem "moda" no nome é aceitar qualquer um. */
const GENERICAS = new Set([
  "moda", "feminina", "feminino", "masculina", "masculino", "loja", "lojas", "store",
  "shop", "boutique", "oficial", "modas", "confeccoes", "confeccao", "outlet", "brecho",
  "calcados", "sapataria", "acessorios", "multimarcas", "vestuario", "fashion", "styles",
  "style", "closet", "atacado", "varejo", "shopping", "center", "comercio", "ltda", "me",
]);

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const distintivos = (nome: string) =>
  semAcento(nome)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !GENERICAS.has(t));

/* ---------- a conferência que faltava, e que custou caro no primeiro teste ----------
   A busca por "KANTON | MODA FEMININA em Santos Dumont" devolveu SANTO
   LOOK, em Maringá, com endereço, telefone e nota. Nada no resultado
   dizia que era outra loja: o Places casou "Santos Dumont" com uma RUA de
   Maringá e entregou o vizinho mais próximo com cara de loja de roupa.

   Um endereço errado numa vitrine não é um campo errado: é mandar o
   cliente do cliente para a porta de outra pessoa. Então o resultado só
   passa se o nome do lugar compartilhar uma palavra DISTINTIVA com o nome
   da marca (ou com o arroba). Na dúvida, devolve null, e você preenche à
   mão sabendo que preencheu. */
function ehAMesmaLoja(nomeDoLugar: string, nomeDaMarca: string, arroba?: string | null): boolean {
  const alvo = semAcento(nomeDoLugar);
  const daMarca = distintivos(nomeDaMarca);

  /* ---------- por que DOIS tokens, e não um ----------
     Com um só, "Xavier's Sports" casou com "Chácara myszak xavier": um
     sobrenome comum é distintivo o bastante para passar no filtro de
     genéricas e fraco demais para identificar uma loja.

     Então a régua é: marca com dois ou mais tokens distintivos precisa
     acertar dois; marca de token único (Sölo Urb, cujo único token com
     quatro letras é "solo") acerta com um. Isso ainda aceita o Google
     chamar a loja de "Xavier's Sports Maringá", que é o caso comum, e
     recusa a chácara do vizinho. */
  const acertos = daMarca.filter((t) => alvo.includes(t)).length;
  if (acertos >= Math.min(2, daMarca.length) && acertos > 0) return true;

  /* O arroba é o identificador mais confiável que existe aqui: ele é único
     no Instagram e costuma ser o nome de fantasia sem espaço ("usekanton"
     contém "kanton"). Comparo sem o "use"/"loja" da frente, que é vício de
     arroba e não parte do nome. */
  if (arroba) {
    const cru = semAcento(arroba).replace(/^(use|loja|lojas|eu|sou|a|o)/, "");
    if (cru.length >= 4 && alvo.replace(/[^a-z0-9]/g, "").includes(cru)) return true;
  }

  return false;
}

/* A busca é por texto porque é o único dado que a colheita tem: o nome do
   perfil e, quando dá sorte, a cidade escrita na bio. Uma consulta, e o
   resultado ainda precisa passar pela conferência de identidade acima. */
export async function acharLugar(
  busca: string,
  cidade?: string | null,
  arroba?: string | null,
): Promise<Lugar | null> {
  const chave = process.env.GOOGLE_PLACES_KEY;
  if (!chave || !busca.trim()) return null;

  try {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": chave,
        "X-Goog-FieldMask": CAMPOS,
      },
      body: JSON.stringify({
        textQuery: cidade ? `${busca} em ${cidade}` : busca,
        languageCode: "pt-BR",
        regionCode: "BR",
        /* Cinco, e não um. O primeiro resultado do Places é o mais
           POPULAR para a frase, não o mais parecido com a marca: pedir um
           só é aceitar o vizinho mais movimentado. Com cinco, a
           conferência de identidade tem em quem escolher. */
        pageSize: 5,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const corpo = (await r.json().catch(() => null)) as { places?: Cru[] } | null;
    const candidatos = (corpo?.places ?? []).filter(
      /* Loja fechada permanentemente ainda aparece na busca, e colocá-la na
         vitrine seria mandar cliente para porta trancada. */
      (c) => !c.businessStatus || c.businessStatus === "OPERATIONAL",
    );

    const p = candidatos.find((c) => ehAMesmaLoja(c.displayName?.text ?? "", busca, arroba));
    if (!p) return null;

    return {
      place_id: p.id ?? null,
      nome: p.displayName?.text ?? null,
      endereco: p.formattedAddress ?? null,
      telefone: p.nationalPhoneNumber ?? null,
      horario: p.regularOpeningHours?.weekdayDescriptions ?? null,
      nota: typeof p.rating === "number" ? p.rating : null,
      avaliacoes: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
      maps: p.googleMapsUri ?? null,
      site: p.websiteUri ?? null,
    };
  } catch {
    /* Rede, cota ou chave: nada disso pode derrubar uma colheita que já
       trouxe cinquenta fotos. O bloco fica vazio e a tela mostra isso. */
    return null;
  }
}

/* A cidade quase sempre está na bio, depois de um pino ("📍Santos Dumont |
   MG"), e é ela que separa a loja certa da homônima de outro estado. Sem
   pino, tento o padrão "Cidade - UF" ou "Cidade/UF" em qualquer lugar do
   texto. Devolver null é melhor que devolver errado: a busca sem cidade
   ainda acha lojas de nome distinto. */
export function cidadeDaBio(bio: string | null): string | null {
  if (!bio) return null;

  /* O pino traz "Santos Dumont | MG", e a primeira versão cortava no "|" e
     devolvia só "Santos Dumont". Isso não é detalhe: sem o estado, a busca
     casou com a RUA Santos Dumont, em Maringá, e trouxe uma loja que não
     tem nada a ver. A UF depois do separador entra junto quando existir. */
  const comPino = bio.match(/📍\s*([^\n·•]{3,48})/);
  if (comPino) {
    const bruto = comPino[1].trim().replace(/\s+/g, " ");
    const cidadeUf = bruto.match(/^([^|\/,-]{3,40})\s*[|\/,-]\s*([A-Za-z]{2})\b/);
    if (cidadeUf) return `${cidadeUf[1].trim()} ${cidadeUf[2].toUpperCase()}`;
    return bruto.split(/[|\/]/)[0].trim();
  }

  const comUf = bio.match(/([A-ZÁÂÃÉÊÍÓÔÕÚÇ][\wÀ-ú.' ]{2,30})\s*[-\/|]\s*([A-Z]{2})\b/);
  if (comUf) return `${comUf[1].trim()} ${comUf[2]}`;

  return null;
}
