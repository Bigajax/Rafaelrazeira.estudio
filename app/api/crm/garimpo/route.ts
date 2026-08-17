/* ============================================================
   /api/crm/garimpo — busca negócios no Maps e importa na Lista

   POST { busca, cidade, max, soSemSite } e a rota garimpa na Places API
   e planta cada achado como lead na coluna Lista: nome, cidade, nicho
   (a própria busca), celular no WhatsApp quando o Maps o publica, e a
   nota com o endereço nas notas, que a pesquisa de IA usa de contexto.

   A importação é UM A UM de propósito: o banco tem trava de duplicata
   por WhatsApp, e num insert em lote uma colisão derrubaria a leva
   inteira. Um a um, o repetido é pulado e contado, e o resto entra.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { garimparNegocios } from "@/lib/crm/garimpo";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";

export const maxDuration = 60;

export async function POST(pedido: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });

  let busca = "";
  let cidade = "";
  let max = 20;
  let soSemSite = true;
  try {
    const corpo = (await pedido.json()) as {
      busca?: string;
      cidade?: string;
      max?: number;
      soSemSite?: boolean;
    };
    busca = String(corpo.busca || "").trim();
    cidade = String(corpo.cidade || "").trim();
    if (typeof corpo.max === "number") max = corpo.max;
    if (typeof corpo.soSemSite === "boolean") soSemSite = corpo.soSemSite;
  } catch {
    /* corpo inválido: cai no 400 abaixo */
  }
  if (!busca || !cidade) {
    return NextResponse.json({ erro: "Diga o que buscar e em qual cidade." }, { status: 400 });
  }

  let achados;
  try {
    achados = await garimparNegocios({ busca, cidade, max, soSemSite });
  } catch (e) {
    const frase = e instanceof Error ? e.message : "O garimpo falhou.";
    return NextResponse.json({ erro: frase }, { status: 500 });
  }

  const supabase = await clienteServidor();

  /* O pente de duplicata por nome roda antes, numa consulta só. */
  const { data: existentes } = await supabase.from("crm_leads").select("nome");
  const nomes = new Set((existentes ?? []).map((l) => l.nome.trim().toLowerCase()));

  let importados = 0;
  let pulados = 0;

  for (const g of achados) {
    if (nomes.has(g.nome.toLowerCase())) {
      pulados++;
      continue;
    }
    const notas = [
      "Do Google Maps",
      g.nota ? `nota ${g.nota}${g.avaliacoes ? ` (${g.avaliacoes} avaliações)` : ""}` : null,
      g.endereco,
      g.telefone && !g.whatsapp ? `telefone fixo: ${g.telefone}` : null,
      g.site ? `site: ${g.site}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const { error } = await supabase.from("crm_leads").insert({
      owner_id: usuario.id,
      nome: g.nome,
      empresa: g.nome,
      cidade,
      nicho: busca,
      whatsapp: g.whatsapp,
      tipo_projeto: "vitrine",
      origem: "prospeccao",
      notas,
    });

    if (error) {
      /* Quase sempre a trava de duplicata de WhatsApp: o negócio já está
         no CRM com outro nome. Pula e segue. */
      pulados++;
    } else {
      nomes.add(g.nome.toLowerCase());
      importados++;
    }
  }

  revalidatePath("/crm", "layout");
  return NextResponse.json({ ok: true, achados: achados.length, importados, pulados });
}
