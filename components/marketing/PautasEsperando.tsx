"use client";

/* As pautas que ainda não têm dia, na aba Criar (01/10). Moravam na
   bandeja ao lado do calendário, que ocupava 300px da grade só para isso.
   Aqui cada uma mostra a capa, o assunto e um campo de data: escolheu o
   dia, ela vai para o calendário. Arrastar para o dia continua possível na
   faixa fina em cima do calendário. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { agendar } from "@/app/(pt)/crm/acoes-marketing";
import { CATEGORIAS, PILARES, TIPOS, urlFundo, type Peca } from "@/lib/marketing/tipos";
import { Miniatura } from "./Miniatura";
import m from "@/app/(pt)/crm/marketing.module.css";
import s from "@/app/(pt)/crm/crm.module.css";

export function PautasEsperando({ pecas }: { pecas: Peca[] }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState("");

  if (!pecas.length) {
    return <p className={m.esperandoVazio}>Nenhuma pauta esperando dia. Peça à Paula ou comece uma embaixo.</p>;
  }

  return (
    <>
      <ul className={`${m.esperando} ${pendente ? m.ocupado : ""}`}>
        {pecas.map((p) => (
          <li key={p.id}>
            <Link href={`/crm/marketing/${p.id}`} className={m.esperandoCapa} aria-label={`Abrir: ${p.gancho || "pauta"}`}>
              <Miniatura peca={p} largura={84} fundo={urlFundo(p.fundo)} />
            </Link>
            <div className={m.esperandoTexto}>
              <span className={m.esperandoTipo}>
                {[p.categoria && p.categoria in CATEGORIAS ? CATEGORIAS[p.categoria].nome : null, p.pilar ? PILARES[p.pilar].nome : null, TIPOS[p.tipo].nome]
                  /* categoria e pilar podem ter o mesmo nome (Tendência) */
                  .filter((x, k, todos) => x && todos.indexOf(x) === k)
                  .join(", ")}
              </span>
              <Link href={`/crm/marketing/${p.id}`} className={m.bandejaGancho}>
                {p.gancho || p.briefing || "Pauta sem briefing"}
              </Link>
              <label className={m.esperandoData}>
                <span>Postar em</span>
                <input
                  type="date"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    comecar(async () => {
                      const r = await agendar(p.id, v);
                      if (!r.ok) setErro(r.erro);
                      router.refresh();
                    });
                  }}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
      {erro ? <p className={s.erro}>{erro}</p> : null}
    </>
  );
}
