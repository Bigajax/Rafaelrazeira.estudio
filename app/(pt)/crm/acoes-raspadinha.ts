"use server";

import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/crm/supabase";
import { CAMPANHA_RASPADINHA, RASPADINHA } from "@/lib/raspadinha";
import { bancoRaspadinha, novoSegredo } from "@/lib/raspadinha-servidor";

async function dono() {
  const usuario = await usuarioAtual();
  if (!usuario || !process.env.CRM_OWNER_ID || usuario.id !== process.env.CRM_OWNER_ID)
    throw new Error("Entre com a conta do dono do estúdio.");
  return usuario.id;
}

export async function criarRaspadinha(): Promise<{ erro?: string }> {
  try {
    const owner_id = await dono();
    const { error } = await bancoRaspadinha().from("arquiteto_cupom_evento").insert({
      campanha: CAMPANHA_RASPADINHA, owner_id, token: novoSegredo(),
      codigo: `ARQ-${novoSegredo().slice(0, 12).toUpperCase()}`,
      original_centavos: RASPADINHA.originalCentavos, final_centavos: RASPADINHA.finalCentavos,
    });
    // Duplo clique / duas abas preservam o primeiro link, graças à PK da campanha.
    if (error && error.code !== "23505") return { erro: "Não consegui criar. Confira se supabase/raspadinha-arquitetos.sql foi aplicado." };
    revalidatePath("/crm/raspadinha");
    return {};
  } catch { return { erro: "Não consegui criar o prêmio. Confira a sessão e a configuração do servidor." }; }
}

export async function utilizarRaspadinha(): Promise<{ erro?: string }> {
  try {
    const owner = await dono();
    const { error } = await bancoRaspadinha().from("arquiteto_cupom_evento")
      .update({ utilizado_em: new Date().toISOString() }).eq("campanha", CAMPANHA_RASPADINHA)
      .eq("owner_id", owner).not("resgatado_em", "is", null).is("utilizado_em", null);
    if (error) return { erro: "Não consegui marcar o uso. Tente novamente." };
    revalidatePath("/crm/raspadinha");
    return {};
  } catch { return { erro: "Sua sessão expirou ou o banco está indisponível." }; }
}
