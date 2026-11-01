"use server";

import { revalidatePath } from "next/cache";
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

/* ============================================================
   ARQUIVAR OS PARADOS (01/11/2026)

   Passa a Perdido, "sumiu, sem resposta", quem a tela mostrou como parado
   há mais de 30 dias e o Rafael confirmou vendo a lista. Devolve como cada
   um estava, para o "Desfazer" da mesma tela pôr tudo de volta. Ganho e
   perdido nunca entram, mesmo se o navegador mandar o id.
   ============================================================ */
export type ComoEstava = { id: string; estagio: string; proximo_passo: string | null; proxima_acao_em: string | null };

export async function arquivarParados(ids: string[]): Promise<{ ok: true; antes: ComoEstava[] } | { ok: false; erro: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre novamente." };
  const validos = ids.filter((id) => /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id));
  if (!validos.length) return { ok: true, antes: [] };
  const banco = await clienteServidor();
  const antes: ComoEstava[] = [];
  for (let i = 0; i < validos.length; i += 200) {
    const { data, error } = await banco.from("crm_leads").select("id, estagio, proximo_passo, proxima_acao_em").in("id", validos.slice(i, i + 200)).eq("owner_id", usuario.id).not("estagio", "in", "(ganho,perdido)").returns<ComoEstava[]>();
    if (error) return { ok: false, erro: "Não foi possível ler os contatos. Nada foi arquivado." };
    antes.push(...(data ?? []));
  }
  for (let i = 0; i < antes.length; i += 200) {
    const { error } = await banco.from("crm_leads").update({ estagio: "perdido", motivo_perda: "sem_resposta", proximo_passo: null, proxima_acao_em: null }).in("id", antes.slice(i, i + 200).map((l) => l.id)).eq("owner_id", usuario.id);
    if (error) return { ok: false, erro: `Parou no meio: ${i} de ${antes.length} arquivados. Use Desfazer e tente de novo.` };
  }
  revalidatePath("/crm", "layout");
  return { ok: true, antes };
}

export async function desfazerArquivo(antes: ComoEstava[]): Promise<{ ok: true } | { ok: false; erro: string }> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sua sessão expirou. Entre novamente." };
  const banco = await clienteServidor();
  for (const l of antes) {
    const { error } = await banco.from("crm_leads").update({ estagio: l.estagio, motivo_perda: null, proximo_passo: l.proximo_passo, proxima_acao_em: l.proxima_acao_em }).eq("id", l.id).eq("owner_id", usuario.id).eq("estagio", "perdido");
    if (error) return { ok: false, erro: "Não foi possível desfazer todos. Confira no Funil." };
  }
  revalidatePath("/crm", "layout");
  return { ok: true };
}
