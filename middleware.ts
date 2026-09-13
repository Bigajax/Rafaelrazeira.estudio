/* ============================================================
   O DESPACHANTE: dois trabalhos, dois arquivos

   1. /crm e tudo abaixo: a porta do CRM (lib/middleware/crm.ts), que
      confere a sessão do Supabase antes de qualquer render.
   2. As três URLs pt que têm irmã em inglês (/vitrine-digital,
      /landing-page, /portfolio): o `?lang=` do pill
      (lib/middleware/idioma.ts). Desde 12/09/2026 a URL decide o idioma:
      sem cookie e sem Accept-Language, para o anúncio pt nunca abrir em
      inglês.

   A bifurcação vem antes de qualquer coisa: o cliente do Supabase e a
   consulta de sessão nunca acontecem numa página pública. O import do
   ramo CRM é estático porque o Edge empacota tudo num bundle só de
   qualquer jeito; o que importa é que ele não EXECUTA fora de /crm.

   O matcher lista as URLs uma a uma. /en/*, /api, /_next, assets e o
   resto do site continuam fora, como sempre estiveram.
   ============================================================ */
import type { NextRequest } from "next/server";
import { middlewareCrm } from "@/lib/middleware/crm";
import { middlewareIdioma } from "@/lib/middleware/idioma";

export async function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname;
  if (caminho === "/crm" || caminho.startsWith("/crm/")) return middlewareCrm(request);
  return middlewareIdioma(request);
}

export const config = {
  matcher: ["/crm", "/crm/:path*", "/vitrine-digital", "/landing-page", "/portfolio"],
};
