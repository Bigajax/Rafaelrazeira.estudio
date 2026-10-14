"use server";
import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { tabelaAusente, lerTodos } from "@/lib/sistema/consultas";

export async function contextoCliente(leadId: string) {
  const b = await clienteServidor();
  const { data: v, error } = await b
    .from("crm_cliente_negocios")
    .select("cliente_id")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) {
    if (tabelaAusente(error))
      return {
        disponivel: false,
        clienteId: null,
        clientes: [],
        conteudos: [],
        origemId: null,
      };
    throw new Error("Não consegui carregar o vínculo do cliente.");
  }
  const [clientes, conteudos, origem] = await Promise.all([
    lerTodos<{ id: string; nome: string }>(b, "crm_clientes", "id,nome"),
    lerTodos<{ id: string; gancho: string; status: string }>(
      b,
      "mkt_pecas",
      "id,gancho,status",
    ),
    b
      .from("crm_origem_conteudo")
      .select("peca_id")
      .eq("lead_id", leadId)
      .maybeSingle(),
  ]);
  if (origem.error)
    throw new Error("Não consegui carregar a origem do conteúdo.");
  return {
    disponivel: true,
    clienteId: (v?.cliente_id ?? null) as string | null,
    clientes: clientes.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    conteudos: conteudos.filter((p) => p.status === "postada"),
    origemId: (origem.data?.peca_id ?? null) as string | null,
  };
}
export async function criarFichaCliente(leadId: string) {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false as const, erro: "Sessão expirada." };
  const b = await clienteServidor();
  const { data, error } = await b.rpc("crm_criar_cliente", { p_lead: leadId });
  if (error)
    return {
      ok: false as const,
      erro: "Não consegui criar a ficha. Tente novamente.",
    };
  revalidatePath("/crm", "layout");
  return { ok: true as const, id: String(data) };
}
export async function vincularFichaCliente(leadId: string, clienteId: string) {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false as const, erro: "Sessão expirada." };
  const b = await clienteServidor();
  const { error } = await b
    .from("crm_cliente_negocios")
    .upsert(
      { owner_id: usuario.id, lead_id: leadId, cliente_id: clienteId },
      { onConflict: "lead_id" },
    );
  if (error)
    return {
      ok: false as const,
      erro: "Não consegui vincular o negócio ao cliente.",
    };
  revalidatePath("/crm", "layout");
  return { ok: true as const, id: clienteId };
}
export async function vincularConteudo(leadId: string, pecaId: string) {
  const u = await usuarioAtual();
  if (!u) return { ok: false as const, erro: "Sessão expirada." };
  const b = await clienteServidor();
  const { error } = await b
    .from("crm_origem_conteudo")
    .upsert(
      { owner_id: u.id, lead_id: leadId, peca_id: pecaId || null },
      { onConflict: "lead_id" },
    );
  if (error)
    return {
      ok: false as const,
      erro: "Não consegui vincular a origem do conteúdo.",
    };
  revalidatePath("/crm", "layout");
  return { ok: true as const };
}
export async function editarCliente(
  id: string,
  campos: Record<string, unknown>,
) {
  const u = await usuarioAtual();
  if (!u) return { ok: false, erro: "Sessão expirada." };
  const nome = String(campos.nome ?? "").trim(),
    whatsapp = String(campos.whatsapp ?? "").trim(),
    email = String(campos.email ?? "").trim();
  if (
    !nome ||
    nome.length > 120 ||
    whatsapp.length > 30 ||
    email.length > 254 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    return { ok: false, erro: "Confira o nome e os dados de contato." };
  const b = await clienteServidor();
  const { data, error } = await b
    .from("crm_clientes")
    .update({ nome, whatsapp: whatsapp || null, email: email || null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length)
    return { ok: false, erro: "Não foi possível atualizar o cliente." };
  revalidatePath("/crm", "layout");
  return { ok: true };
}
