"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { atualizarPagamento } from "@/app/(pt)/crm/acoes-conciliacao";
import s from "@/components/sistema/sistema.module.css";
export function AtualizarPagamento({
  payment,
  pendencia,
}: {
  payment: string;
  pendencia?: boolean;
}) {
  const [busy, start] = useTransition(),
    [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        start(async () => {
          const r = await atualizarPagamento(
            payment,
            String(d.get("dia") || "") || undefined,
          );
          setMsg(
            r.ok
              ? "Pagamento conferido e atualizado."
              : (r.erro ?? "Não foi possível atualizar."),
          );
          if (r.ok) router.refresh();
        });
      }}
    >
      {pendencia ? (
        <label>
          Data do chargeback, se comprovada no extrato
          <input name="dia" type="date" disabled={busy} />
        </label>
      ) : null}
      <button disabled={busy} className={s.botao}>
        {busy ? "Conferindo…" : "Atualizar da origem"}
      </button>
      {msg ? <span role="status">{msg}</span> : null}
    </form>
  );
}
