/* ============================================================
   /api/crm/pesquisa — dispara a pesquisa com IA de um lead

   POST { lead_id } e a rota faz o ciclo inteiro: marca o dossiê como
   "pesquisando" (é o que a ficha lê para mostrar a régua correndo), chama
   a pesquisa, grava o resultado e revalida as telas.

   POR QUE UMA ROTA E NÃO UMA SERVER ACTION: a pesquisa leva um ou dois
   minutos, e uma action seguraria o `useTransition` de quem disparou por
   esse tempo inteiro. Como rota, o modal de novo lead atira e segue para
   a ficha; a ficha mostra "pesquisando" e se atualiza sozinha quando o
   dossiê chega.

   SEGURANÇA: o mesmo desenho do resto do CRM. O cliente do servidor usa a
   chave anônima com a sessão do cookie, então o RLS só deixa a rota ler e
   escrever leads do dono logado. Sem sessão, 401 antes de qualquer coisa.
   ============================================================ */

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { pesquisarLead } from "@/lib/crm/pesquisa";
import { emailNormal, soDigitos } from "@/lib/crm/regras";
import { clienteServidor, usuarioAtual } from "@/lib/crm/supabase";
import type { Dossie, Lead, Template } from "@/lib/crm/tipos";

/* A busca na web leva de trinta segundos a uns dois minutos. O teto de
   cinco minutos é folga, não expectativa; na Vercel ele exige o runtime de
   funções com fluid compute, que é o padrão dos deploys atuais. */
export const maxDuration = 300;

export async function POST(pedido: Request) {
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });

  let lead_id = "";
  try {
    const corpo = (await pedido.json()) as { lead_id?: string };
    lead_id = String(corpo.lead_id || "");
  } catch {
    /* corpo ausente ou inválido: cai no 400 abaixo */
  }
  if (!lead_id) return NextResponse.json({ erro: "Faltou o lead_id." }, { status: 400 });

  const supabase = await clienteServidor();
  const { data: lead } = await supabase.from("crm_leads").select("*").eq("id", lead_id).single<Lead>();
  if (!lead) return NextResponse.json({ erro: "Lead não encontrado." }, { status: 404 });

  /* Duas pesquisas do mesmo lead ao mesmo tempo seriam dinheiro dobrado
     pelo mesmo dossiê. A trava é o próprio status, com validade: uma
     pesquisa "pesquisando" há mais de cinco minutos é uma pesquisa que
     morreu (deploy no meio, função derrubada), e aí o refazer passa. */
  if (lead.dossie?.status === "pesquisando") {
    const ha = Date.now() - new Date(lead.dossie.gerado_em ?? 0).getTime();
    if (ha < 5 * 60 * 1000) {
      return NextResponse.json({ erro: "Esta pesquisa já está rodando." }, { status: 409 });
    }
  }

  const marcar = async (dossie: Dossie) => {
    await supabase.from("crm_leads").update({ dossie }).eq("id", lead.id);
    revalidatePath("/crm", "layout");
  };

  await marcar({ status: "pesquisando", gerado_em: new Date().toISOString() });

  /* Os templates entram só para dar o tom da mensagem. */
  const { data: templates } = await supabase
    .from("crm_templates")
    .select("id, titulo, canal, categoria, conteudo, ordem")
    .order("ordem")
    .limit(3);

  try {
    const resultado = await pesquisarLead(lead, (templates ?? []) as Template[]);

    /* ---------- o cadastro confirmado preenche a ficha ----------
       Só campo VAZIO recebe: o que o Rafael digitou é palavra final, e a
       pesquisa completa em vez de corrigir. WhatsApp e e-mail passam
       pelas mesmas normalizações do resto do CRM (é o que sustenta a
       trava de duplicata do banco). */
    const c = resultado.cadastro;
    const patch: Record<string, string> = {};
    if (c) {
      if (!lead.empresa && c.empresa) patch.empresa = c.empresa;
      if (!lead.instagram && c.instagram) patch.instagram = c.instagram;
      if (!lead.nicho && c.nicho) patch.nicho = c.nicho;
      if (!lead.cidade && c.cidade) patch.cidade = c.cidade;
      if (!lead.whatsapp && c.whatsapp) {
        const zap = soDigitos(c.whatsapp);
        if (zap && zap.length >= 10) patch.whatsapp = zap;
      }
      if (!lead.email && c.email) {
        const email = emailNormal(c.email);
        if (email) patch.email = email;
      }
    }

    if (Object.keys(patch).length) {
      const { error } = await supabase.from("crm_leads").update(patch).eq("id", lead.id);
      if (error && (patch.whatsapp || patch.email)) {
        /* Índice único: o WhatsApp ou e-mail achado já pertence a outro
           lead. O contato fica de fora e o resto do cadastro entra. */
        delete patch.whatsapp;
        delete patch.email;
        if (Object.keys(patch).length) {
          await supabase.from("crm_leads").update(patch).eq("id", lead.id);
        }
      } else if (error) {
        /* Cadastro que não entra não derruba a pesquisa: o dossiê vale
           sozinho, e os campos continuam editáveis na mão. */
        for (const campo of Object.keys(patch)) delete patch[campo];
      }
    }

    const dossie: Dossie = {
      status: "ok",
      gerado_em: new Date().toISOString(),
      ...resultado,
      cadastro_aplicado: Object.keys(patch),
    };
    await marcar(dossie);
    return NextResponse.json({ ok: true, dossie });
  } catch (e) {
    /* O erro vai para o dossiê, não só para a resposta: quem disparou pelo
       modal de novo lead já navegou embora, e é a ficha que precisa contar
       o que houve e oferecer o refazer. */
    const frase = e instanceof Error ? e.message : "A pesquisa falhou.";
    await marcar({ status: "erro", erro: frase, gerado_em: new Date().toISOString() });
    return NextResponse.json({ erro: frase }, { status: 500 });
  }
}
