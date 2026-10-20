"use client";

/* ============================================================
   OS FORMULÁRIOS DA FICHA DO CRIATIVO (19/10/2026)

   O custo de produção (reais + o projeto do AI Studio) e as decisões com
   data. O resto da ficha é leitura, desenhado no servidor.
   ============================================================ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { anotarDecisao, salvarProducao } from "@/app/(pt)/crm/acoes-criativos";
import s from "@/app/(pt)/crm/crm.module.css";
import c from "@/app/(pt)/crm/(painel)/performance/criativos/criativos.module.css";

export function FormProducao({
  chave,
  custo,
  projeto,
  projetos,
}: {
  chave: string;
  custo: number | null;
  projeto: string | null;
  projetos: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [ocupado, comecar] = useTransition();

  return (
    <form
      className={c.formFicha}
      action={(form) => {
        setMsg("");
        comecar(async () => {
          const r = await salvarProducao(chave, form);
          setMsg(r.ok ? "Salvo." : r.erro);
          if (r.ok) router.refresh();
        });
      }}
    >
      <label className={s.campo}>
        <span className={s.campoRot}>Custo fora do AI Studio (R$)</span>
        <input name="custo" inputMode="decimal" defaultValue={custo != null ? String(custo).replace(".", ",") : ""} placeholder="ex.: 150 ou 89,90" />
      </label>
      <label className={s.campo}>
        <span className={s.campoRot}>Projeto do AI Studio</span>
        <select name="projeto" defaultValue={projeto ?? ""}>
          <option value="">Nenhum</option>
          {projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className={s.btnAcao} disabled={ocupado}>
        {ocupado ? "Salvando…" : "Salvar o custo"}
      </button>
      {msg ? (
        <p className={c.formMsg} role="status">
          {msg}
        </p>
      ) : null}
    </form>
  );
}

export function FormDecisao({ chave }: { chave: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [texto, setTexto] = useState("");
  const [ocupado, comecar] = useTransition();

  return (
    <form
      className={c.formFicha}
      action={(form) => {
        setMsg("");
        comecar(async () => {
          const r = await anotarDecisao(chave, form);
          if (!r.ok) return setMsg(r.erro);
          setTexto("");
          router.refresh();
        });
      }}
    >
      <label className={s.campo}>
        <span className={s.campoRot}>Nova decisão</span>
        <textarea name="texto" rows={2} maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="ex.: cortado, pior terço do hook; ou: escalar para R$ 60 por dia" />
      </label>
      <button type="submit" className={s.btnAcao} disabled={ocupado || !texto.trim()}>
        {ocupado ? "Anotando…" : "Anotar"}
      </button>
      {msg ? (
        <p className={c.formMsg} role="status">
          {msg}
        </p>
      ) : null}
    </form>
  );
}
