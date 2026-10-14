/* ============================================================
   O CHECK-IN DAS FOTOS (14/10/2026): /checkin/<token>

   O lugar por link onde o dono da loja manda as fotos dele já separadas
   pelas partes da vitrine (premium, pronta entrega, importados...). Nasceu
   na M&M Calçados: as 28 fotos de 24/09 chegaram soltas pelo WhatsApp, sem
   modelo, numeração nem valor, e o catálogo saiu sem nada disso.

   As fotos vão para o bucket PRIVADO `checkin` do Supabase do estúdio, em
   <slug>/<categoria>/<arquivo>. O navegador sobe direto para o Storage por
   URL assinada (o corpo nunca passa pela função da Vercel, que corta em
   4,5 MB), e a nota de cada foto vai ao lado, em <arquivo>.json.

   Loja nova: uma entrada aqui, com token novo
   (node -e "console.log(require('crypto').randomBytes(12).toString('hex'))").
   O token é o que protege a página; o noindex e o robots só tiram o Google.
   Para baixar no PC: npx tsx scripts/baixar-checkin.ts <slug>
   ============================================================ */

export type CategoriaCheckin = { id: string; nome: string; dica: string };
export type Checkin = { slug: string; loja: string; dono: string; categorias: CategoriaCheckin[] };

export const BUCKET_CHECKIN = "checkin";

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
