"use client";

/* O botão da oficina que manda a loja para o Marketing como pauta F2.
   Abre a peça nova direto: o próximo gesto é "Produzir tudo". */
import { useState, useTransition } from "react";
import { postDaLoja } from "@/app/(pt)/crm/acoes-marketing";
import s from "@/app/(pt)/crm/crm.module.css";

export function VirarPost({ lojaId }: { lojaId: string }) {
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState("");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
      <button
        type="button"
        className={s.btn}
        disabled={pendente}
        title="Cria uma pauta F2 (Entrega com número) no Marketing, com a foto da peça em destaque como fundo"
        onClick={() =>
          comecar(async () => {
            const r = await postDaLoja(lojaId);
            if (r && !r.ok) setErro(r.erro);
          })
        }
      >
        {pendente ? "Criando a pauta" : "Virar post no Marketing"}
      </button>
      {erro ? <span className={s.erro}>{erro}</span> : null}
    </span>
  );
}
