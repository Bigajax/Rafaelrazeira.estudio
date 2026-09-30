"use client";

/* ============================================================
   O POST DE HOJE, NO PAINEL HOJE

   A fila do Hoje responde "com quem eu falo agora". Esta plaquinha
   responde a segunda pergunta do dia, "o que eu posto hoje", sem que seja
   preciso abrir o Marketing para lembrar: a capa real, o código e as duas
   ações que o momento de postar pede (copiar a legenda, marcar postada).

   Ela mora no papel, ao lado do "Anotar lead", e não dentro da folha: a
   folha é da carta da vez. Nenhum rosa aqui: o rosa da margem de cima é
   do "Anotar lead", e a regra da tela é um rosa por faixa.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { marcarStatus } from "@/app/(pt)/crm/acoes-marketing";
import { CODIGOS, legendaFinal, urlFundo, type Peca } from "@/lib/marketing/tipos";
import { Miniatura } from "./Miniatura";
import m from "@/app/(pt)/crm/marketing.module.css";
import s from "@/app/(pt)/crm/crm.module.css";

export function PostDoDia({ posts }: { posts: Peca[] }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState("");
  if (!posts.length) return null;

  async function copiar(p: Peca) {
    try {
      await navigator.clipboard.writeText(legendaFinal(p));
      setAviso("Legenda copiada");
    } catch {
      setAviso("O navegador não deixou copiar");
    }
  }

  return (
    <div className={m.tela} style={{ margin: 0, maxWidth: "none" }}>
      <ul className={m.postHoje} aria-label="Posts de hoje">
        {posts.map((p) => (
          <li key={p.id} className={m.postHojeItem}>
            <Link href={`/crm/marketing/${p.id}`} className={`${m.capinha} ${p.status === "pronta" ? m.estPronta : m.estRascunho}`}>
              <Miniatura peca={p} largura={44} fundo={urlFundo(p.fundo)} />
            </Link>
            <div className={m.postHojeTexto}>
              <span className={m.postHojeRot}>
                Post de hoje{p.codigo ? `, ${p.codigo} ${CODIGOS[p.codigo].nome}` : ""}
                {p.status === "rascunho" ? ", ainda em rascunho" : ""}
              </span>
              <span className={m.postHojeAcoes}>
                <button type="button" className={s.btnMini} onClick={() => copiar(p)}>
                  Copiar legenda
                </button>
                <button
                  type="button"
                  className={s.btnMini}
                  disabled={pendente}
                  onClick={() =>
                    comecar(async () => {
                      const r = await marcarStatus(p.id, "postada");
                      setAviso(r.ok ? "Marcado como postado" : r.erro);
                      router.refresh();
                    })
                  }
                >
                  Postei
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      {aviso ? <span className={s.salvo} aria-live="polite">{aviso}</span> : null}
    </div>
  );
}
