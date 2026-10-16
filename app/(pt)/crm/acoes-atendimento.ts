"use server";

import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import type { HistoricoAtendimento } from "@/lib/crm/atendimento";

export async function lerHistoricoAtendimento(leadId: string): Promise<
  { ok: true; interacoes: HistoricoAtendimento[] } | { ok: false; erro: string }
> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre novamente." };
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(leadId))
    return { ok: false, erro: "Contato inválido." };
  try {
    const banco = await clienteServidor();
    const { data: lead, error: erroLead } = await banco.from("crm_leads").select("id").eq("id", leadId).eq("owner_id", usuario.id).maybeSingle();
    if (erroLead || !lead) return { ok: false, erro: "Não foi possível acessar este contato." };
    const { data, error } = await banco.from("crm_interacoes").select("id, canal, direcao, resumo, created_at").eq("lead_id", leadId).eq("owner_id", usuario.id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(12).returns<HistoricoAtendimento[]>();
    if (error) return { ok: false, erro: "Não foi possível carregar o histórico. Tente novamente." };
    return { ok: true, interacoes: data ?? [] };
  } catch {
    return { ok: false, erro: "Não foi possível carregar o histórico. Tente novamente." };
  }
}
