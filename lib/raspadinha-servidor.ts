import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { CAMPANHA_RASPADINHA, type CupomEvento, type EstadoRaspadinha, tokenValido } from "./raspadinha";

export const novoSegredo = () => randomBytes(32).toString("hex");
export const hashRecibo = (segredo: string) => createHash("sha256").update(segredo).digest("hex");
export const cookieRecibo = (token: string) => `rr-raspadinha-${hashRecibo(token).slice(0, 16)}`;

export function bancoRaspadinha() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave || !process.env.CRM_OWNER_ID) throw new Error("Configuração da raspadinha ausente.");
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(8000) }) },
  });
}

export function consultaCupom() {
  return bancoRaspadinha().from("arquiteto_cupom_evento")
    .select("*").eq("campanha", CAMPANHA_RASPADINHA).eq("owner_id", process.env.CRM_OWNER_ID!);
}

export async function buscarCupom(token: string): Promise<CupomEvento | null> {
  if (!tokenValido(token)) return null;
  const { data, error } = await consultaCupom().eq("token", token).maybeSingle();
  if (error) throw new Error("Não foi possível consultar a raspadinha.");
  return data as CupomEvento | null;
}

/* Só quem tem o recibo deste navegador recebe o código e o próprio nome.
   Conhecer o link após o resgate não dá acesso aos dados do ganhador. */
export function estadoPublico(cupom: CupomEvento, recibo?: string): EstadoRaspadinha {
  if (!cupom.resgatado_em) return { estado: "disponivel" };
  if (!recibo || !tokenValido(recibo) || hashRecibo(recibo) !== cupom.recibo_hash)
    return { estado: "indisponivel" };
  return { estado: cupom.utilizado_em ? "utilizado" : "resgatado", nome: cupom.nome!, codigo: cupom.codigo };
}
