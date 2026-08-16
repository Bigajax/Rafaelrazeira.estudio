/* ============================================================
   OS CLIENTES DO SUPABASE, E A CHAVE QUE CADA UM USA

   Este arquivo é o oposto do que /api/lead faz, e a diferença é o ponto
   inteiro do CRM.

   /api/lead usa a SERVICE ROLE KEY: ela ignora o RLS, e por isso só pode
   viver no servidor, numa rota que o site inteiro chama sem estar logado.

   O CRM usa a chave ANÔNIMA e a sessão do usuário. A chave anônima sozinha
   não abre nada: com RLS ligado e policy por dono, ela devolve zero linhas
   até que exista um `auth.uid()`. É isso que permite o navegador consultar
   o banco direto, sem uma rota de API para cada tela.

   VARIÁVEIS (Vercel → Settings → Environment Variables, e .env.local para
   rodar em casa):
     NEXT_PUBLIC_SUPABASE_URL       Supabase → Settings → API → Project URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY  a mesma tela → anon / public

   As duas são NEXT_PUBLIC de propósito: elas vão para o navegador e isso é
   seguro por desenho. Quem protege o dado é o RLS, não o segredo da chave.
   ============================================================ */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/* O CRM inteiro depende das duas. Sem elas o `createClient` estoura com uma
   mensagem que não diz o que fazer, então a checagem acontece aqui, uma vez,
   com o nome da variável e o lugar de pegar o valor. */
export const configurado = Boolean(SUPABASE_URL && SUPABASE_ANON);

export function exigirConfig() {
  if (!configurado) {
    throw new Error(
      "CRM sem configuração: falta NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Os dois valores estão em Supabase → Settings → API.",
    );
  }
}

/** Cliente do navegador. Usado pelos componentes que consultam ao vivo. */
export function clienteNavegador() {
  exigirConfig();
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}

/* ============================================================
   Cliente do servidor: componentes de servidor, server actions e o
   middleware, todos lendo a sessão do cookie.

   O `try/catch` em volta do `setAll` não é preguiça. Um componente de
   servidor não pode escrever cookie (a resposta já começou a ser montada), e
   o Next lança quando alguém tenta. Quem PODE renovar o cookie é o
   middleware, que roda antes de tudo e é justamente onde a renovação está
   feita. Então: em server action o `setAll` funciona e a sessão é renovada;
   em componente de servidor ele falha em silêncio e o middleware já cuidou
   disso no mesmo request.
   ============================================================ */
export async function clienteServidor() {
  exigirConfig();
  const jar = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (novos) => {
        try {
          novos.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          /* componente de servidor: ver a nota acima */
        }
      },
    },
  });
}

/** O usuário da sessão, ou null. Usado pelas telas e pelas ações. */
export async function usuarioAtual() {
  const supabase = await clienteServidor();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
