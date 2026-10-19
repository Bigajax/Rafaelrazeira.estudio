"use client";

/* As perguntas da loja (19/10/2026, Fardo): o que a proposta deixou em
   aberto e a vitrine precisa para não chutar (pagamento, entrega, troca, o
   percentual do cupom). Respondidas uma vez, guardadas em <slug>/_loja.json;
   cada campo salva ao sair dele. */

import { useState } from "react";
import type { PerguntaCheckin } from "@/lib/checkin";
import s from "./checkin.module.css";

async function api(corpo: Record<string, unknown>) {
  const r = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Falhou.");
  return j;
}

export function PerguntasDaLoja({ token, perguntas, iniciais }: { token: string; perguntas: PerguntaCheckin[]; iniciais: Record<string, string> }) {
  const [respostas, setRespostas] = useState<Record<string, string>>(() => Object.fromEntries(perguntas.map((p) => [p.chave, iniciais[p.chave] ?? ""])));
  const [salvas, setSalvas] = useState(respostas);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | "erro">("");

  async function guardar() {
    if (perguntas.every((p) => (respostas[p.chave] ?? "").trim() === (salvas[p.chave] ?? "").trim())) return;
    setEstado("salvando");
    try {
      await api({ acao: "loja", token, respostas });
      setSalvas(respostas);
      setEstado("salvo");
    } catch {
      setEstado("erro");
    }
  }

  const respondidas = perguntas.filter((p) => (salvas[p.chave] ?? "").trim()).length;

  return (
    <section className={s.ficha} aria-labelledby="t-loja">
      <div className={s.ficha__topo}>
        <p className={s.ficha__num}>+</p>
        <div className={s.ficha__texto}>
          <h2 id="t-loja" className={s.ficha__nome}>
            Sobre a loja
          </h2>
          <p className={s.ficha__dica}>Responda o que souber. O que ficar vazio não aparece no site.</p>
        </div>
        <p className={s.contagem} aria-live="polite">
          {estado === "salvando" ? "guardando" : estado === "erro" ? "não guardou" : respondidas ? `${respondidas} de ${perguntas.length}` : "vazia"}
        </p>
      </div>
      <div className={s.perguntas}>
        {perguntas.map((p) => (
          <label key={p.chave} className={`${s.nota} ${s.pergunta}`}>
            {/* a dica fica à vista, não no placeholder: cinza no campo parecia
                resposta já escrita, e sumia ao começar a digitar (19/10) */}
            <span className={s.pergunta__rotulo}>{p.rotulo}</span>
            {p.dica && <span className={s.pergunta__dica}>{p.dica}</span>}
            <textarea
              rows={2}
              value={respostas[p.chave] ?? ""}
              maxLength={600}
              placeholder="Escreva aqui"
              onChange={(e) => setRespostas((r) => ({ ...r, [p.chave]: e.target.value }))}
              onBlur={guardar}
            />
          </label>
        ))}
      </div>
      {estado === "erro" && <p className={s.aviso}>Não guardou. Toque fora do campo de novo.</p>}
    </section>
  );
}
