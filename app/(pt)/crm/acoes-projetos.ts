"use server";

/* ============================================================
   AS AÇÕES DOS PROJETOS

   O mesmo contrato das ações do CRM: { ok: true } ou { ok: false, erro }
   com a frase para a tela.

   Toda escrita é um upsert por (owner_id, lead_id): o projeto nasce na
   primeira coisa marcada, e até lá a aba mostra o molde sem gravar nada.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import { ETAPAS, type ItemChecklist } from "@/lib/projetos/tipos";
import { lerCatalogo } from "@/lib/projetos/catalogo";
import { dataValida } from "@/lib/sistema/calendario";
import {
  chaveDe,
  gravarConfig,
  lerConfig,
  PERGUNTAS_PADRAO,
  type Perguntas,
} from "@/lib/projetos/cofre";

export type Feito = { ok: true } | { ok: false; erro: string };

const SEM_TABELA =
  "A tabela dos projetos ainda não existe: rode o supabase/projetos.sql no SQL Editor.";

function destino(alvo: string) {
  const [leadId, contratoId] = alvo.split(":");
  return { leadId, contratoId };
}

async function gravar(
  alvo: string,
  campos: Record<string, unknown>,
): Promise<Feito> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const supabase = await clienteServidor();
  const { leadId, contratoId } = destino(alvo);
  const { error } = await supabase
    .from(contratoId ? "crm_entregas" : "crm_projetos")
    .upsert(
      {
        owner_id: usuario.id,
        lead_id: leadId,
        ...(contratoId ? { contrato_id: contratoId } : {}),
        ...campos,
      },
      { onConflict: contratoId ? "contrato_id" : "owner_id,lead_id" },
    );
  if (error) {
    if (/crm_projetos|does not exist|schema cache/i.test(error.message))
      return { ok: false, erro: SEM_TABELA };
    return { ok: false, erro: "Não consegui salvar. Tente de novo." };
  }
  revalidatePath("/crm", "layout");
  return { ok: true };
}

const ETAPA_OK = new Set<string>(ETAPAS.map((e) => e.id));

export async function salvarChecklist(
  leadId: string,
  itens: ItemChecklist[],
): Promise<Feito> {
  if (!Array.isArray(itens) || itens.length > 120)
    return { ok: false, erro: "Checklist inválido." };
  const limpos: ItemChecklist[] = [];
  for (const x of itens) {
    const texto = String(x?.texto ?? "")
      .trim()
      .slice(0, 200);
    if (!x?.id || !ETAPA_OK.has(x.etapa) || !texto) continue;
    limpos.push({
      id: String(x.id).slice(0, 60),
      etapa: x.etapa,
      texto,
      feito: !!x.feito,
      feito_em: x.feito ? (x.feito_em ?? new Date().toISOString()) : null,
      ...(x.extra ? { extra: true } : {}),
    });
  }
  return gravar(leadId, { checklist: limpos });
}

const CAMPOS = ["site", "dominio", "repo", "material", "notas"] as const;
type Campo = (typeof CAMPOS)[number];

export async function salvarCampo(
  leadId: string,
  campo: Campo,
  valor: string,
): Promise<Feito> {
  if (!CAMPOS.includes(campo))
    return { ok: false, erro: "Campo desconhecido." };
  let v: string | null =
    String(valor ?? "")
      .trim()
      .slice(0, campo === "notas" ? 4000 : 300) || null;
  if (v && campo === "material") {
    v = v.toLowerCase();
    if (!/^[a-z0-9-]{1,60}$/.test(v))
      return {
        ok: false,
        erro: "A chave do material é só letra minúscula, número e hífen, como fulltime.",
      };
  }
  if (v && (campo === "site" || campo === "dominio") && !/^https?:\/\//.test(v))
    v = `https://${v}`;
  return gravar(leadId, { [campo]: v });
}

/* ============================================================
   CRIAR (OU ATUALIZAR) O CHECKLIST DO CLIENTE

   Lê as peças da vitrine no ar (lib/projetos/catalogo.ts), escreve o
   config.json no cofre e amarra a chave ao projeto. Rodar de novo só
   atualiza as peças e as perguntas: as respostas do cliente ficam, porque
   moram em outro arquivo e as peças são achadas pelo mesmo id (o slug).

   Devolve o link que vai para o cliente e quantas peças entraram.
   ============================================================ */
export type Criado =
  | { ok: true; link: string; pecas: number; chave: string }
  | { ok: false; erro: string };

export async function criarChecklistCliente(
  alvo: string,
  site: string,
  perguntas: Partial<Perguntas>,
): Promise<Criado> {
  const { leadId, contratoId } = destino(alvo);
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const supabase = await clienteServidor();

  let siteLimpo = String(site || "").trim();
  if (siteLimpo && !/^https?:\/\//.test(siteLimpo))
    siteLimpo = `https://${siteLimpo}`;
  try {
    new URL(siteLimpo);
  } catch {
    return {
      ok: false,
      erro: "Escreva o endereço da vitrine no ar, como https://loja.vercel.app.",
    };
  }

  if (contratoId) {
    const { data: c, error: e } = await supabase
      .from("crm_contratos")
      .select("id")
      .eq("id", contratoId)
      .eq("lead_id", leadId)
      .eq("tipo", "projeto")
      .maybeSingle();
    if (e || !c)
      return { ok: false, erro: "Contrato da entrega não encontrado." };
  }
  const [{ data: lead }, { data: projeto }] = await Promise.all([
    supabase
      .from("crm_leads")
      .select("id, empresa, nome, instagram")
      .eq("id", leadId)
      .maybeSingle(),
    supabase
      .from(contratoId ? "crm_entregas" : "crm_projetos")
      .select("material")
      .eq(contratoId ? "contrato_id" : "lead_id", contratoId ?? leadId)
      .eq("lead_id", leadId)
      .maybeSingle(),
  ]);
  if (!lead) return { ok: false, erro: "Não achei este cliente." };
  const nome = lead.empresa || lead.nome || lead.instagram || "Sua loja";

  /* a chave que ele já tem continua; nova só se ainda não houver, e sem
     tomar a de outra loja */
  let chave =
    projeto?.material ||
    (contratoId
      ? chaveDe(nome).slice(0, 48) + "-" + contratoId.slice(0, 8)
      : chaveDe(nome));
  if (!projeto?.material) {
    for (let n = 2; ; n++) {
      const existente = await lerConfig(chave);
      if (!existente || existente.lead_id === leadId) break;
      chave = `${chaveDe(nome)}-${n}`;
    }
  }

  /* chave com respostas mas sem config.json é checklist feito à mão (a
     Full Time, 30/09): as peças lá têm outro id, e escrever por cima
     misturaria as respostas dele com as peças novas */
  const anterior = await lerConfig(chave);
  if (projeto?.material && !anterior) {
    return {
      ok: false,
      erro: `O checklist de "${chave}" foi feito à mão, antes do gerador. Ele continua valendo como está.`,
    };
  }

  let catalogo;
  try {
    catalogo = await lerCatalogo(siteLimpo);
  } catch {
    return {
      ok: false,
      erro: "Não consegui abrir a vitrine. Confira o endereço.",
    };
  }

  const ok = await gravarConfig({
    versao: 1,
    chave,
    lead_id: leadId,
    nome,
    site: siteLimpo,
    criado_em: anterior?.criado_em ?? new Date().toISOString(),
    perguntas: { ...PERGUNTAS_PADRAO, ...perguntas },
    categorias: catalogo.categorias,
    pecas: catalogo.pecas,
  });
  if (!ok)
    return { ok: false, erro: "Não consegui gravar o checklist no cofre." };

  const r = await gravar(alvo, { material: chave, site: siteLimpo });
  if (!r.ok) return r;
  return {
    ok: true,
    link: `https://rafaelrazeira.com.br/checklist/${chave}`,
    pecas: catalogo.pecas.length,
    chave,
  };
}

export async function marcarEntregue(
  leadId: string,
  entregue: boolean,
): Promise<Feito> {
  const hoje = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
  return gravar(leadId, { entregue_em: entregue ? hoje : null });
}
export async function salvarOperacao(
  alvo: string,
  campos: Record<string, unknown>,
): Promise<Feito> {
  const { contratoId } = destino(alvo);
  if (!contratoId)
    return {
      ok: false,
      erro: "Vincule esta entrega a um contrato antes de definir a operação.",
    };
  if (campos.prazo && !dataValida(campos.prazo))
    return { ok: false, erro: "Prazo inválido." };
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    [campos.prod_loja_id, campos.perf_loja_id].some(
      (v) => v && !uuid.test(String(v)),
    )
  )
    return { ok: false, erro: "Loja inválida." };
  return gravar(alvo, {
    prazo: campos.prazo || null,
    bloqueio:
      String(campos.bloqueio ?? "")
        .trim()
        .slice(0, 500) || null,
    proxima_acao:
      String(campos.proxima_acao ?? "")
        .trim()
        .slice(0, 500) || null,
    prod_loja_id: campos.prod_loja_id || null,
    perf_loja_id: campos.perf_loja_id || null,
  });
}
