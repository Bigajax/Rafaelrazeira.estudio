"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarCliente } from "@/app/(pt)/crm/acoes-clientes";
import s from "./sistema.module.css";
export function EditarCliente({
  cliente: c,
}: {
  cliente: {
    id: string;
    nome: string;
    whatsapp: string | null;
    email: string | null;
  };
}) {
  const [busy, start] = useTransition(),
    [msg, setMsg] = useState("");
  const router = useRouter();
  return (
    <details className={s.detalhes}>
      <summary>Editar contato do cliente</summary>
      <p>
        Este cadastro central reúne os negócios. A alteração não sobrescreve os
        contatos particulares de cada negócio.
      </p>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          start(async () => {
            const r = await editarCliente(c.id, d);
            setMsg(
              r.ok
                ? "Contato atualizado."
                : (r.erro ?? "Não foi possível atualizar."),
            );
            if (r.ok) router.refresh();
          });
        }}
      >
        <fieldset disabled={busy} className={s.semBorda}>
          <label>
            Nome
            <input required name="nome" maxLength={120} defaultValue={c.nome} />
          </label>
          <label>
            WhatsApp
            <input
              name="whatsapp"
              maxLength={30}
              defaultValue={c.whatsapp ?? ""}
            />
          </label>
          <label>
            E-mail
            <input type="email" name="email" defaultValue={c.email ?? ""} />
          </label>
          <button className={s.botao}>Salvar contato</button>
        </fieldset>
        {msg ? <p role="status">{msg}</p> : null}
      </form>
    </details>
  );
}
