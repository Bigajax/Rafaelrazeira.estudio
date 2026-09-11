/* ============================================================
   NEGOCIAÇÃO DE IDIOMA (só nas URLs pt que têm irmã em inglês)

   Ordem das regras, e qualquer "não" deixa a requisição passar:
   1. ?lang=pt|en na query: grava o cookie e redireciona para a URL limpa
      (a irmã /en quando for en), preservando os utm. Serve para o pill
      funcionar sem JavaScript e para um anúncio forçar idioma.
   2. Cookie presente: respeita e sai. Quem escolheu nunca é redirecionado.
   3. Robô (Meta, Google, Bing, WhatsApp...): sai. Sem isto o Googlebot
      (Accept-Language en) veria a página pt sumir num redirect, e a Meta
      reprovaria o anúncio pt por apontar para uma URL que redireciona.
   4. Accept-Language ausente ou com qualquer pt*: sai. O celular
      brasileiro sempre manda pt-BR, então o tráfego das campanhas pt
      nunca entra aqui e a query (utm) nem é tocada.
   5. Senão: 302 para a irmã /en, com a query inteira, gravando o cookie
      en (é o "primeiro acesso" do pedido). Sempre 302, nunca 301/308: um
      redirect permanente ficaria cacheado e ignoraria o cookie depois.
   ============================================================ */
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_LANG, COOKIE_LANG_MAX_AGE, PARES, type Lang } from "@/lib/idiomas";

const ROBO = /facebookexternalhit|Facebot|meta-externalagent|Googlebot|AdsBot|Google-InspectionTool|bingbot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Applebot|Chrome-Lighthouse|vercel-screenshot/i;

function comCookie(resposta: NextResponse, lang: Lang): NextResponse {
  resposta.cookies.set(COOKIE_LANG, lang, { maxAge: COOKIE_LANG_MAX_AGE, path: "/", sameSite: "lax" });
  return resposta;
}

function temPortugues(aceita: string | null): boolean {
  if (!aceita) return true; // sem cabeçalho não dá para saber: fica no pt
  return aceita.split(",").some((item) => item.trim().toLowerCase().startsWith("pt"));
}

export function middlewareIdioma(request: NextRequest): NextResponse {
  const url = request.nextUrl;
  const irmaEn = PARES[url.pathname];
  if (!irmaEn) return NextResponse.next();

  // 1. escolha explícita na query
  const pedido = url.searchParams.get("lang");
  if (pedido === "pt" || pedido === "en") {
    const destino = url.clone();
    destino.searchParams.delete("lang");
    if (pedido === "en") destino.pathname = irmaEn;
    return comCookie(NextResponse.redirect(destino, 302), pedido);
  }

  // 2. já escolheu antes
  const cookie = request.cookies.get(COOKIE_LANG)?.value;
  if (cookie === "pt") return NextResponse.next();
  if (cookie === "en") {
    const destino = url.clone();
    destino.pathname = irmaEn;
    return NextResponse.redirect(destino, 302);
  }

  // 3. robôs leem o que a URL diz
  if (ROBO.test(request.headers.get("user-agent") || "")) return NextResponse.next();

  // 4. quem fala português fica
  if (temPortugues(request.headers.get("accept-language"))) return NextResponse.next();

  // 5. primeiro acesso de quem não fala português
  const destino = url.clone();
  destino.pathname = irmaEn;
  return comCookie(NextResponse.redirect(destino, 302), "en");
}
