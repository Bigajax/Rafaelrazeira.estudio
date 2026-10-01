"use server";
/* ============================================================
   A LEITURA DA CONVERSA, DO LADO DO SITE (01/10/2026)

   O site só escreve o pedido e lê o resultado: quem lê a conversa é o
   leitor do WhatsApp no PC (scripts/whatsapp-analisar.mts), pelo claude da
   assinatura. A fila é crm_analises.

   Aplicar a leitura passa pelo `moverLead`, e não por um update solto: é
   ele quem confere as exigências de cada etapa (proposta pede o ticket,
   perdido pede o motivo). A IA sugere a etapa; quem aperta é o Rafael.
   ============================================================ */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { LEITOR_VIVO_MS, type Analise } from "@/lib/crm/analise";
import { hojeSP, NOME_CAMPO, somarDias } from "@/lib/crm/regras";
import { NOME_ESTAGIO, type Lead } from "@/lib/crm/tipos";
import { moverLead } from "./acoes";

async function exigirSessao() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/crm/login");
  return usuario;
}

export async function lerAnalise(leadId: string): Promise<{ analise: Analise | null; leitorVivo: boolean }> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const [{ data: analise }, { data: sinal }] = await Promise.all([
    supabase
      .from("crm_analises")
      .select("*")
      .eq("lead_id", leadId)
      .order("pedida_em", { ascending: false })
      .limit(1)
      .maybeSingle<Analise>(),
    supabase.from("crm_leitor_sinal").select("visto_em").maybeSingle<{ visto_em: string }>(),
  ]);
  const leitorVivo = sinal ? Date.now() - Date.parse(sinal.visto_em) < LEITOR_VIVO_MS : false;
  return { analise: analise ?? null, leitorVivo };
}

export async function pedirAnalise(leadId: string): Promise<{ ok: boolean; erro?: string }> {
  const usuario = await exigirSessao();
  const supabase = await clienteServidor();
  /* Dois cliques não viram duas leituras: se já tem uma esperando, é ela. */
  const { data: esperando } = await supabase
    .from("crm_analises")
    .select("id")
    .eq("lead_id", leadId)
    .in("status", ["na_fila", "rodando"])
    .limit(1);
  if (esperando?.length) return { ok: true };
  const { error } = await supabase.from("crm_analises").insert({ owner_id: usuario.id, lead_id: leadId, origem: "botao" });
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

export async function aplicarAnalise(analiseId: string): Promise<{ ok: boolean; erro?: string }> {
  await exigirSessao();
  const supabase = await clienteServidor();
  const { data: analise } = await supabase.from("crm_analises").select("*").eq("id", analiseId).single<Analise>();
  const r = analise?.resultado;
  if (!analise || !r) return { ok: false, erro: "A leitura sumiu. Peça outra." };
  const { data: lead } = await supabase.from("crm_leads").select("*").eq("id", analise.lead_id).single<Lead>();
  if (!lead) return { ok: false, erro: "O lead sumiu." };

  const passagem = {
    proximo_passo: r.proximo_passo || lead.proximo_passo,
    proxima_acao_em: somarDias(hojeSP(), r.retorno_em_dias),
  };

  if (r.etapa_sugerida && r.etapa_sugerida !== lead.estagio) {
    const res = await moverLead(lead.id, r.etapa_sugerida, null, passagem);
    if (!res.ok) {
      if ("falta" in res) {
        const falta = res.falta.map((c) => NOME_CAMPO[c].toLowerCase()).join(" e ");
        return { ok: false, erro: `Para ir para ${NOME_ESTAGIO[r.etapa_sugerida]}, falta ${falta}: mova pelo quadro.` };
      }
      return { ok: false, erro: res.erro };
    }
  } else {
    const { error } = await supabase.from("crm_leads").update(passagem).eq("id", lead.id);
    if (error) return { ok: false, erro: error.message };
  }

  await supabase.from("crm_analises").update({ aplicada_em: new Date().toISOString() }).eq("id", analiseId);
  revalidatePath("/crm", "layout");
  return { ok: true };
}
