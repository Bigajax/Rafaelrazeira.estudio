/* O cliente do Supabase no navegador, num arquivo só dele: o
   lib/crm/supabase.ts importa `next/headers`, e um componente de cliente
   que o importasse quebraria o build. É por aqui que a mesa sobe o fundo
   direto para o bucket, com a sessão de quem está logado. */
import { createBrowserClient } from "@supabase/ssr";

export function clienteNavegador() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
}
