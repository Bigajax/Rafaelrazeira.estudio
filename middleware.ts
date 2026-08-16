/* ============================================================
   A PORTA DO /crm

   Um arquivo, um trabalho: nenhuma rota abaixo de /crm responde sem sessão.

   POR QUE NO MIDDLEWARE, e não numa checagem dentro de cada página: o
   middleware roda ANTES de qualquer render, então uma tela nova criada
   amanhã já nasce protegida. Proteção espalhada por página é proteção que
   depende de alguém lembrar.

   E POR QUE ELE NÃO É A PROTEÇÃO DE VERDADE: o middleware protege o HTML,
   não o dado. Quem protege o dado é o RLS do Postgres, que devolve zero
   linhas para quem não tem `auth.uid()`. Se este arquivo fosse apagado por
   engano, as telas abririam vazias em vez de vazarem o pipeline. É essa a
   ordem certa das duas travas.
   ============================================================ */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const CHAVE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const LOGIN = "/crm/login";

export async function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname;

  /* Sem as variáveis, o Supabase nem sobe. Deixar passar seria abrir o CRM
     inteiro; mandar para o login seria um laço infinito, porque o login
     também precisa delas. Então a resposta é uma parede honesta. */
  if (!URL_SUPABASE || !CHAVE_ANON) {
    return new NextResponse(
      "CRM sem configuração: falta NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  /* A resposta é montada ANTES da consulta porque o cliente do Supabase
     precisa de um lugar para escrever o cookie renovado durante o
     `getUser()`. Sem isso a sessão expira em uma hora e o Rafael é
     deslogado no meio do dia sem motivo aparente. */
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(URL_SUPABASE, CHAVE_ANON, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (novos) => {
        novos.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        novos.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  /* `getUser()` e não `getSession()`: o segundo lê o cookie e acredita nele,
     o primeiro confere a assinatura com o servidor do Supabase. Num
     middleware que decide quem entra, acreditar no cookie é não ter porta. */
  const { data } = await supabase.auth.getUser();
  const logado = Boolean(data.user);

  const noLogin = caminho === LOGIN || caminho.startsWith(`${LOGIN}/`);

  if (!logado && !noLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = LOGIN;
    destino.search = "";
    /* De onde a pessoa veio, para o login devolver ela ao mesmo lugar em vez
       de despejar todo mundo no painel Hoje. Só o caminho interno viaja: um
       `?destino=https://outrosite` seria um redirecionamento aberto de
       presente para quem quisesse usar o domínio do estúdio como isca. */
    if (caminho !== "/crm") destino.searchParams.set("destino", caminho);
    const r = NextResponse.redirect(destino);
    resposta.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  }

  /* Já logado e batendo no login: vai direto para a fila do dia. */
  if (logado && noLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/crm";
    destino.search = "";
    const r = NextResponse.redirect(destino);
    resposta.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  }

  return resposta;
}

/* Só /crm e o que vem abaixo dele. O resto do site (a vitrine, o portfólio,
   as propostas, as rotas de API) não passa por aqui e não paga o custo da
   consulta de sessão em nenhuma visita. */
export const config = {
  matcher: ["/crm", "/crm/:path*"],
};
