/* ============================================================
   /api/producao/colher — busca o perfil e as fotos de uma loja

   POST { loja_id } e a rota faz o ciclo inteiro: marca a loja como
   "colhendo" (é o que a tela lê para mostrar a régua correndo), consulta a
   Business Discovery, baixa cada imagem para o Storage e grava os ativos.
   O ciclo em si mora em lib/producao/oficina.ts, porque a linha de comando
   (scripts/colher-loja.ts) roda o mesmo.

   POR QUE UMA ROTA E NÃO UMA SERVER ACTION: baixar sessenta imagens leva de
   trinta segundos a dois minutos, e uma action seguraria o `useTransition`
   de quem clicou por esse tempo inteiro. Como rota, o botão atira e a tela
   se atualiza quando a colheita termina. É o mesmo desenho da pesquisa do
   CRM, pelo mesmo motivo.

   SEGURANÇA: cliente do servidor com a chave anônima e a sessão do cookie,
   então o RLS só deixa a rota ler e escrever loja do dono logado. Sem
   sessão, 401 antes de qualquer coisa.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { colheitaEmCurso, colherLoja } from "@/lib/producao/oficina";
import type { Loja } from "@/lib/producao/tipos";

/* Uma consulta rápida e depois até oitenta downloads sequenciais. O teto de
   cinco minutos é folga, não expectativa. */
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

  if (colheitaEmCurso(loja)) {
    return NextResponse.json({ erro: "Esta colheita já está rodando." }, { status: 409 });
  }

  try {
    /* cada passo revalida a tela: é o que faz a régua aparecer correndo
       enquanto as imagens descem, em vez de só no fim */
    const { novas, falhas } = await colherLoja(supabase, loja, usuario.id, () =>
      revalidatePath("/crm/producao", "layout"),
    );
    revalidatePath("/crm/producao", "layout");
    return NextResponse.json({ ok: true, novas, falhas });
  } catch (e) {
    /* a frase já foi para a coluna `nota` dentro do ciclo; aqui é só
       transporte */
    const frase = e instanceof Error ? e.message : "A colheita falhou.";
    revalidatePath("/crm/producao", "layout");
    return NextResponse.json({ erro: frase }, { status: 500 });
  }
}
