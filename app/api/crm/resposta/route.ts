/* ============================================================
   /api/crm/resposta — a próxima mensagem, sugerida pela IA

   POST { lead_id, resposta } com o que o cliente respondeu, e a rota
   devolve { mensagem } pronta para revisar e colar no WhatsApp. Nada é
   gravado: a sugestão vale para aquele momento da conversa, e o que fica
   registrado é o toque de saída quando o Rafael de fato mandar (o botão
   do WhatsApp na ficha cuida disso, como sempre).

   Síncrona de propósito, ao contrário da pesquisa: sem busca na web a
   sugestão sai em segundos, e quem apertou o botão está esperando por
   ela na tela.
   ============================================================ */

import { NextResponse } from "next/server";
import { sugerirResposta } from "@/lib/crm/pesquisa";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import type { Interacao, Lead } from "@/lib/crm/tipos";

export const maxDuration = 120;

export async function POST(pedido: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });

  let lead_id = "";
  let resposta = "";
  try {
    const corpo = (await pedido.json()) as { lead_id?: string; resposta?: string };
    lead_id = String(corpo.lead_id || "");
    resposta = String(corpo.resposta || "").trim();
  } catch {
    /* corpo ausente ou inválido: cai nos 400 abaixo */
  }
  if (!lead_id) return NextResponse.json({ erro: "Faltou o lead_id." }, { status: 400 });
  if (!resposta) {
    return NextResponse.json({ erro: "Cole o que o cliente respondeu." }, { status: 400 });
  }

  const supabase = await clienteServidor();
  const { data: lead } = await supabase.from("crm_leads").select("*").eq("id", lead_id).single<Lead>();
  if (!lead) return NextResponse.json({ erro: "Lead não encontrado." }, { status: 404 });

  const { data: interacoes } = await supabase
    .from("crm_interacoes")
    .select("direcao, canal, resumo, created_at")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: true })
    .limit(20);

  try {
    const sugestao = await sugerirResposta(lead, (interacoes ?? []) as Interacao[], resposta);
    return NextResponse.json({ ok: true, ...sugestao });
  } catch (e) {
    const frase = e instanceof Error ? e.message : "A sugestão falhou.";
    return NextResponse.json({ erro: frase }, { status: 500 });
  }
}
