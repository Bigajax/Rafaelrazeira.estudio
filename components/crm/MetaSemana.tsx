"use client";

/* A meta da semana mora aqui, e não numa tela de configuração, porque é
   aqui que ela é julgada: o número só faz sentido ao lado do gráfico que
   diz se ele foi batido. Uma tela de ajustes separada seria um lugar a mais
   para ir e um número a mais para esquecer que existe. */

import { useState, useTransition } from "react";
import { salvarMeta } from "@/app/crm/acoes";
import s from "@/app/crm/crm.module.css";

export function MetaSemana({ valor }: { valor: number }) {
  const [meta, setMeta] = useState(String(valor));
  const [estado, setEstado] = useState<"parado" | "salvo" | "erro">("parado");
  const [salvando, comecar] = useTransition();

  const gravar = () => {
    if (Number(meta) === valor) return;
    comecar(async () => {
      const r = await salvarMeta(Number(meta));
      setEstado(r.ok ? "salvo" : "erro");
      setTimeout(() => setEstado("parado"), 2000);
    });
  };

  return (
    <label className={s.metaCampo}>
      <span className={s.campoRot}>Meta por semana</span>
      <input
        type="number"
        min={1}
        step={5}
        value={meta}
        onChange={(e) => setMeta(e.target.value)}
        onBlur={gravar}
        disabled={salvando}
        aria-label="Toques de saída por semana"
      />
      {estado === "salvo" ? <i className={s.salvo}>salvo</i> : null}
      {estado === "erro" ? <i className={s.erro}>não salvou</i> : null}
    </label>
  );
}
