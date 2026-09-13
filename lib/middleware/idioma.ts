/* ============================================================
   IDIOMA: A URL DECIDE (só nas URLs pt que têm irmã em inglês)

   Até 12/09/2026 este middleware negociava o idioma: Accept-Language
   sem pt* mandava para /en no primeiro acesso, e um cookie `lang=en`
   mandava para /en em todos os acessos seguintes, por um ano. O Rafael
   viu o efeito pelo lado errado: os anúncios em português abrindo a
   vitrine e a landing em inglês "às vezes". Duas portas para isso:
   celular brasileiro configurado em inglês (ou o navegador embutido do
   Instagram mandando só en-US), e o cookie `en` gravado numa visita
   anterior (o próprio Rafael testando o pill), que prendia a pessoa no
   inglês em todo clique de anúncio pt dali em diante.

   Numa página de tráfego pago, o idioma é decisão de quem paga o clique:
   o anúncio pt aponta para a URL pt, o anúncio en vai apontar para /en.
   Então a regra virou uma só: A URL DECIDE. Sem cookie, sem
   Accept-Language, sem redirect automático. Quem chegou na URL errada
   troca pelo pill, que é link para a irmã.

   O que sobra aqui é o `?lang=pt|en` na query: o pill funciona sem
   JavaScript e um link pode forçar o idioma. Ele redireciona (302,
   nunca 301/308, que ficaria cacheado) para a URL limpa do idioma
   pedido, preservando os utm, e NÃO grava cookie nenhum.

   Robôs nunca são redirecionados nem por isso: a Meta e o Google leem o
   que a URL diz.
   ============================================================ */
import { NextResponse, type NextRequest } from "next/server";
import { PARES } from "@/lib/idiomas";

const ROBO = /facebookexternalhit|Facebot|meta-externalagent|Googlebot|AdsBot|Google-InspectionTool|bingbot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Applebot|Chrome-Lighthouse|vercel-screenshot/i;

export function middlewareIdioma(request: NextRequest): NextResponse {
  const url = request.nextUrl;
  const irmaEn = PARES[url.pathname];
  if (!irmaEn) return NextResponse.next();
  if (ROBO.test(request.headers.get("user-agent") || "")) return NextResponse.next();

  const pedido = url.searchParams.get("lang");
  if (pedido === "pt" || pedido === "en") {
    const destino = url.clone();
    destino.searchParams.delete("lang");
    if (pedido === "en") destino.pathname = irmaEn;
    return NextResponse.redirect(destino, 302);
  }

  return NextResponse.next();
}
