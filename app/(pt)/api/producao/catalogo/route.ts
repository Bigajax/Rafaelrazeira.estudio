/* ============================================================
   /api/producao/catalogo — as legendas colhidas viram produtos

   POST { loja_id }. Roda depois da colheita: lê as legendas dos ativos, faz
   o modelo extrair nome, preço, tamanho e categoria, e grava a tabela de
   produtos. O ciclo mora em lib/producao/oficina.ts, porque a linha de
   comando (scripts/ler-catalogo.ts) roda o mesmo; é lá que está a regra
   de nunca apagar produto revisado.

   Como a pesquisa do CRM, é rota e não action: sessenta legendas levam de
   vinte segundos a um minuto e meio.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { lerCatalogoDaLoja } from "@/lib/producao/oficina";
import type { Loja } from "@/lib/producao/tipos";

export const maxDuration = 300;

export async function POST(pedido: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });

  let loja_id = "";
  try {
    const corpo = (await pedido.json()) as { loja_id?: string };
    loja_id = String(corpo.loja_id || "");
  } catch {
    /* corpo ausente ou inválido: cai no 400 abaixo */
  }
  if (!loja_id) return NextResponse.json({ erro: "Faltou o loja_id." }, { status: 400 });

  const supabase = await clienteServidor();
  const { data: loja } = await supabase.from("prod_lojas").select("*").eq("id", loja_id).single<Loja>();
  if (!loja) return NextResponse.json({ erro: "Loja não encontrada." }, { status: 404 });

  try {
    const { produtos, custo_usd } = await lerCatalogoDaLoja(supabase, loja, usuario.id);
    revalidatePath("/crm/producao", "layout");
    return NextResponse.json({ ok: true, produtos, custo_usd });
  } catch (e) {
    const frase = e instanceof Error ? e.message : "A leitura do catálogo falhou.";
    revalidatePath("/crm/producao", "layout");
    /* "colha antes" é pedido fora de ordem, não falha do servidor */
    const status = frase.startsWith("Colha as imagens") ? 409 : 500;
    return NextResponse.json({ erro: frase }, { status });
  }
}
