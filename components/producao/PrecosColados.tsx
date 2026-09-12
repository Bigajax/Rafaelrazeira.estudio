"use client";

/* ============================================================
   OS PREÇOS COLADOS DA CONVERSA

   O único dado que nem a foto nem a legenda entregam, e que chega sempre do
   mesmo jeito: uma lista torta que a lojista digita no WhatsApp. Aqui ela é
   colada inteira e cada linha vai procurar a peça dela.

   ---------- a tela mostra os dois lados ----------
   O que casou entra no catálogo; o que não casou volta em texto, na tela,
   linha por linha. Esconder as órfãs seria transformar "sete peças ficaram
   sem preço" numa descoberta para daqui a três dias, quando o cliente
   perguntar por que a bolsa está sem valor.

   A regra de casamento (e por que ela prefere não casar na dúvida) está em
   lib/producao/precos.ts.
   ============================================================ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aplicarPrecos } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";

export function PrecosColados({ loja_id }: { loja_id: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [orfas, setOrfas] = useState<string[]>([]);
  const [recado, setRecado] = useState("");
  const [aplicando, comAplicacao] = useTransition();

  return (
    <details className={p.precos}>
      <summary>Colar a tabela de preços do WhatsApp</summary>

      <p className={p.precosAjuda}>
        Cole a lista do jeito que ela chegou, uma peça por linha. Cada linha procura a peça pelo nome, pela
        marca e pela cor. O que não achar dona volta aqui embaixo para você resolver.
      </p>

      <textarea
        rows={6}
        value={texto}
        placeholder={"Campus creme 899\nSamba preto - R$ 649,90\nbolsa caramelo 189"}
        onChange={(e) => setTexto(e.target.value)}
      />

      <button
        type="button"
        className={s.btn}
        disabled={aplicando || !texto.trim()}
        onClick={() =>
          comAplicacao(async () => {
            const r = await aplicarPrecos(loja_id, texto);
            if (!r.ok) {
              setRecado(r.erro);
              setOrfas([]);
              return;
            }
            setOrfas(r.orfas);
            setRecado(
              `${r.casados} ${r.casados === 1 ? "preço aplicado" : "preços aplicados"}` +
                (r.orfas.length ? `, ${r.orfas.length} sem dona` : "") +
                (r.ignoradas ? `, ${r.ignoradas} ${r.ignoradas === 1 ? "linha ignorada" : "linhas ignoradas"}` : "") +
                ".",
            );
            router.refresh();
          })
        }
      >
        {aplicando ? "CASANDO…" : "APLICAR NO CATÁLOGO"}
      </button>

      {recado && <p className={p.aviso}>{recado}</p>}

      {orfas.length > 0 && (
        <div className={p.orfas}>
          <p className={s.campoRot}>Estas linhas não acharam a peça</p>
          <ul>
            {orfas.map((linha, i) => (
              <li key={`${linha}-${i}`}>{linha}</li>
            ))}
          </ul>
          <p className={p.precosAjuda}>
            Quase sempre é o nome: a peça se chama outra coisa no catálogo, ou existem duas parecidas e eu
            prefiro não adivinhar. Digite o preço direto na tabela.
          </p>
        </div>
      )}
    </details>
  );
}
