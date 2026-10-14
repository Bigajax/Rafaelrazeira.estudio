"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarOperacao } from "@/app/(pt)/crm/acoes-projetos";
import type { Projeto } from "@/lib/projetos/tipos";
import s from "@/components/sistema/sistema.module.css";
export function OperacaoEntrega({
  projeto: p,
  previas,
  lojas,
}: {
  projeto: Projeto;
  previas: { id: string; nome: string }[];
  lojas: { id: string; nome: string }[];
}) {
  const [busy, start] = useTransition(),
    [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <section className={s.painel}>
      <h2>Prazo e próxima ação</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          start(async () => {
            const r = await salvarOperacao(p.lead_id + ":" + p.contrato_id, d);
            setMsg(r.ok ? "Operação atualizada." : r.erro);
            if (r.ok) router.refresh();
          });
        }}
      >
        <fieldset
          disabled={busy || p.status_contrato === "cancelado"}
          className={s.form + " " + s.semBorda}
        >
          <label>
            Prazo de entrega
            <input type="date" name="prazo" defaultValue={p.prazo ?? ""} />
          </label>
          <label>
            Próxima ação
            <input
              name="proxima_acao"
              maxLength={500}
              defaultValue={p.proxima_acao ?? ""}
            />
          </label>
          <label>
            Bloqueio atual
            <input
              name="bloqueio"
              maxLength={500}
              placeholder="Sem bloqueio"
              defaultValue={p.bloqueio ?? ""}
            />
          </label>
          <label>
            Prévia deste serviço
            <select name="prod_loja_id" defaultValue={p.prod_loja_id ?? ""}>
              <option value="">Não vinculada</option>
              {previas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Loja deste serviço
            <select name="perf_loja_id" defaultValue={p.perf_loja_id ?? ""}>
              <option value="">Não vinculada</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
          <button className={s.botao}>Salvar operação</button>
        </fieldset>
        {msg ? <p role="status">{msg}</p> : null}
      </form>
    </section>
  );
}
