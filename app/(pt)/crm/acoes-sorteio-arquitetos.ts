"use server";

import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/crm/supabase";
import { bancoRaspadinha } from "@/lib/raspadinha-servidor";
import { campanhaSorteio, conferirRegrasCupons } from "@/lib/sorteio-arquitetos-servidor";
import { SORTEIO_ARQUITETOS } from "@/lib/sorteio-arquitetos";

async function dono() {
  const usuario = await usuarioAtual();
  if (!usuario || !process.env.CRM_OWNER_ID || usuario.id !== process.env.CRM_OWNER_ID) throw new Error("Sessão inválida.");
  return usuario.id;
}

export async function abrirSorteioArquitetos(): Promise<{ erro?: string }> {
  try {
    const owner_id = await dono();
    await conferirRegrasCupons();
    const { error } = await bancoRaspadinha().from("arquiteto_sorteios").insert({ campanha: SORTEIO_ARQUITETOS, owner_id });
    if (error && error.code !== "23505") return { erro: "Não consegui abrir. Confira se supabase/sorteio-arquitetos.sql foi aplicado." };
    revalidatePath("/crm/raspadinha"); return {};
  } catch { return { erro: "Confira sua sessão e aplique os SQLs sorteio-arquitetos.sql e sorteio-arquitetos-cupons.sql." }; }
}

export async function sortearSiteArquitetos(): Promise<{ erro?: string }> {
  try {
    const owner = await dono();
    await conferirRegrasCupons();
    const { error } = await bancoRaspadinha().rpc("arquiteto_sortear_site", { p_owner: owner });
    if (error) return { erro: error.message.includes("nenhum_participante") ? "Ainda não há inscritos para sortear." : "Não consegui concluir. Atualize a tela antes de tentar novamente." };
    revalidatePath("/crm/raspadinha"); return {};
  } catch { return { erro: "Não consegui concluir. Confira a sessão e a migração sorteio-arquitetos-cupons.sql." }; }
}

export async function entregarSiteSorteado(): Promise<{ erro?: string }> {
  try {
    await dono();
    const campanha = await campanhaSorteio();
    if (!campanha?.ganhador_id) return { erro: "Realize o sorteio primeiro." };
    const { error } = await bancoRaspadinha().from("arquiteto_participantes")
      .update({ entregue_em: new Date().toISOString() }).eq("campanha", SORTEIO_ARQUITETOS)
      .eq("id", campanha.ganhador_id).is("entregue_em", null);
    if (error) return { erro: "Não consegui registrar a entrega." };
    revalidatePath("/crm/raspadinha"); return {};
  } catch { return { erro: "Confira sua sessão e tente novamente." }; }
}

export async function utilizarCupomSorteado(id: string): Promise<{ erro?: string }> {
  if (typeof id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return { erro: "Cupom inválido." };
  try {
    await dono();
    const { data, error } = await bancoRaspadinha().from("arquiteto_participantes")
      .update({ utilizado_em: new Date().toISOString() }).eq("campanha", SORTEIO_ARQUITETOS)
      .eq("id", id).in("beneficio", ["cupom50", "cupom300"]).is("utilizado_em", null).select("id").maybeSingle();
    if (error) return { erro: "Não consegui registrar o uso do cupom." };
    if (!data) return { erro: "Cupom inexistente ou já utilizado. Atualize para conferir." };
    revalidatePath("/crm/raspadinha"); return {};
  } catch { return { erro: "Confira sua sessão e tente novamente." }; }
}
