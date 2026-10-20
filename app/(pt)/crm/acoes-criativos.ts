"use server";

/* ============================================================
   AS AÇÕES DA FICHA DO CRIATIVO (19/10/2026)

   O que o Rafael anota à mão em cada criativo: quanto custou fazer (em reais,
   e o projeto do AI Studio, cujo custo em dólar soma sozinho) e as decisões
   com data ("cortado: pior terço do hook"). Tudo em ads_criativos, pelo RLS
   (owner_id = auth.uid()). O resto da ficha vem da Meta e do Mixpanel, lido
   pelos scripts; daqui nada escreve neles.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";

type Resultado = { ok: true } | { ok: false; erro: string };

async function exigirSessao() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/crm/login");
  return usuario;
}

function traduzir(erro: { code?: string; message?: string } | null): string {
  if (!erro) return "Não foi possível salvar.";
  if (erro.code === "42P01") return "A tabela da ficha ainda não existe. Rode a parte da fase 3 do supabase/ads-criativos.sql.";
  return erro.message || "Não foi possível salvar.";
}

const caminho = (chave: string) => `/crm/performance/criativos/${encodeURIComponent(chave)}`;

export async function salvarProducao(chave: string, form: FormData): Promise<Resultado> {
  const usuario = await exigirSessao();
  const bruto = String(form.get("custo") ?? "").replace(/\./g, "").replace(",", ".").trim();
  const custo = bruto ? Number(bruto) : null;
  if (custo != null && (!Number.isFinite(custo) || custo < 0 || custo > 1e6)) return { ok: false, erro: "O custo é um valor em reais, como 150 ou 89,90." };
  const projeto = String(form.get("projeto") ?? "").trim() || null;

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("ads_criativos")
    .upsert({ owner_id: usuario.id, chave, custo_producao: custo, ai_projeto_id: projeto, updated_at: new Date().toISOString() }, { onConflict: "owner_id,chave" });
  if (error) return { ok: false, erro: traduzir(error) };
  revalidatePath(caminho(chave));
  return { ok: true };
}

export async function anotarDecisao(chave: string, form: FormData): Promise<Resultado> {
  const usuario = await exigirSessao();
  const texto = String(form.get("texto") ?? "").trim();
  if (!texto) return { ok: false, erro: "Escreva a decisão." };
  if (texto.length > 500) return { ok: false, erro: "Até 500 caracteres." };

  const supabase = await clienteServidor();
  const { data } = await supabase.from("ads_criativos").select("decisoes").eq("chave", chave).maybeSingle();
  const quando = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const decisoes = [...((data?.decisoes as { quando: string; texto: string }[] | undefined) ?? []), { quando, texto }];
  const { error } = await supabase
    .from("ads_criativos")
    .upsert({ owner_id: usuario.id, chave, decisoes, updated_at: new Date().toISOString() }, { onConflict: "owner_id,chave" });
  if (error) return { ok: false, erro: traduzir(error) };
  revalidatePath(caminho(chave));
  return { ok: true };
}
