"use client";

/* ============================================================
   A CONTAGEM NA FICHA DO PROJETO

   Três estados: a loja não existe no Performance (um botão a cria com o
   nome e o slug do projeto), existe sem chave (manda gerar na aba), ou
   existe e conta (a situação da trava e o link para a aba). Tudo que
   mexe de verdade mora em /crm/performance; aqui é a porta.
   ============================================================ */

import Link from "next/link";
import { useState, useTransition } from "react";
import { criarLojaPerformance } from "@/app/(pt)/crm/acoes-performance";
import { situacaoDaLoja } from "@/lib/performance/regras";
import type { Projeto } from "@/lib/projetos/tipos";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/projetos.module.css";

const DATA = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" });

function slugar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function BlocoPerformance({ leadId, nome, loja }: { leadId: string; nome: string; loja: Projeto["performance"] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, comecar] = useTransition();

  if (!loja) {
    return (
      <>
        <p className={p.materialVazio}>A vitrine ainda não conta visitas. Crie a loja no Performance e leve a chave para a Vercel dela.</p>
        <button
          type="button"
          className={s.btnMini}
          disabled={ocupado}
          onClick={() => {
            setErro(null);
            comecar(async () => {
              const r = await criarLojaPerformance({ nome, slug: slugar(nome), lead_id: leadId });
              if (!r.ok) setErro(r.erro);
            });
          }}
        >
          {ocupado ? "Criando…" : "Criar a loja no Performance"}
        </button>
        {erro ? (
          <p role="alert" className={p.erro}>
            {erro}
          </p>
        ) : null}
      </>
    );
  }

  const sit = situacaoDaLoja(loja);
  const frase =
    sit === "sem_chave"
      ? "Loja criada, sem chave ainda. Gere a chave na aba Performance e cole na Vercel."
      : sit === "para_sempre"
        ? "Aba Desempenho liberada para sempre."
        : sit === "liberada"
          ? `Aba Desempenho liberada até ${DATA.format(new Date(loja.liberado_ate!))}.`
          : "A vitrine conta, e o dono vê só o básico. O Performance destrava o resto.";

  return (
    <>
      <p className={p.materialVazio}>
        {frase}
        {!loja.ativa ? " A contagem está DESLIGADA." : ""}
      </p>
      <p className={p.materialQuando}>
        {loja.slug}
        {loja.chave_prefixo ? ` · chave ${loja.chave_prefixo}…` : ""}
      </p>
      <Link href="/crm/performance" className={p.materialLink}>
        Abrir o Performance
      </Link>
    </>
  );
}
