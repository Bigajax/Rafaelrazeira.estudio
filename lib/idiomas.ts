/* ============================================================
   O SITE EM DOIS IDIOMAS (11/09/2026)

   Português mora nas URLs de sempre (são elas que os anúncios apontam);
   inglês mora em /en. Este arquivo é o único mapa das URLs irmãs: o
   middleware, o seletor de idioma, o sitemap e o hreflang leem daqui.
   Entrar uma página nova em inglês é acrescentar UMA linha em PARES.

   Sem lib de i18n de propósito: são três páginas, uma delas estática
   (a /landing-page é HTML em public/), e um mapa de seis URLs não
   justifica uma dependência. Ver o plano em .claude/plans.
   ============================================================ */
export type Lang = "pt" | "en";

export const IDIOMAS: readonly Lang[] = ["pt", "en"] as const;
export const IDIOMA_PADRAO: Lang = "pt";

/* Cookie da escolha. Um ano, lido pelo middleware nas URLs pt e escrito
   pelo seletor (document.cookie) ou pelo middleware (?lang= e redirect). */
export const COOKIE_LANG = "lang";
export const COOKIE_LANG_MAX_AGE = 60 * 60 * 24 * 365;

/* URL pt -> URL en. Só o que tem versão em inglês entra aqui. */
export const PARES: Readonly<Record<string, string>> = {
  "/vitrine-digital": "/en/vitrine-digital",
  "/landing-page": "/en/landing-page",
  "/portfolio": "/en/portfolio",
};

const PARES_INVERSO: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(PARES).map(([pt, en]) => [en, pt]),
);

export const SITE = "https://rafaelrazeira-estudio.vercel.app";

export function ehEn(caminho: string): boolean {
  return caminho === "/en" || caminho.startsWith("/en/");
}

export function idiomaDoCaminho(caminho: string): Lang {
  return ehEn(caminho) ? "en" : "pt";
}

/* A URL irmã no outro idioma, ou null quando a página não tem versão. */
export function irma(caminho: string): string | null {
  return PARES[caminho] ?? PARES_INVERSO[caminho] ?? null;
}

/* O mesmo caminho no idioma pedido (devolve o próprio quando já está nele). */
export function caminhoEm(caminho: string, lang: Lang): string | null {
  if (idiomaDoCaminho(caminho) === lang) return caminho;
  return irma(caminho);
}

/* {n}, {m}, {nome}... nas strings dos dicionários. Vive aqui (e não no
   components/i18n.tsx, que é "use client") para os componentes de servidor
   poderem chamar. */
export function preencher(texto: string, vars: Record<string, string | number>): string {
  return texto.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/* `alternates` do metadata do Next para uma página (pt ou en). O x-default
   é sempre o português: é a versão original e a que o Google deve mostrar
   para quem não bate com nenhum dos dois idiomas. */
export function alternatesPara(caminho: string) {
  const pt = idiomaDoCaminho(caminho) === "pt" ? caminho : irma(caminho);
  const en = idiomaDoCaminho(caminho) === "en" ? caminho : irma(caminho);
  const languages: Record<string, string> = {};
  if (pt) { languages["pt-BR"] = pt; languages["x-default"] = pt; }
  if (en) languages["en"] = en;
  return { canonical: caminho, languages };
}
