"use client";

/* Os números do post, no próprio editor (01/10). Aparece quando a peça está
   Postada: os seis números do Insights, anotados 7 dias depois de sair.
   Antes disso ela avisa a data, mas não trava: se o Rafael quiser anotar
   antes, anota. Campo vazio fica vazio (não é zero). */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { salvarMetricas } from "@/app/(pt)/crm/acoes-marketing";
import { DIAS_PARA_MEDIR, MEDIDAS, type Medida, type Peca } from "@/lib/marketing/tipos";
import m from "@/app/(pt)/crm/marketing.module.css";
import s from "@/app/(pt)/crm/crm.module.css";

function diaMais(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d;
}

export function NumerosDoPost({ peca, hoje }: { peca: Pick<Peca, "id" | "posta_em" | "metricas">; hoje: string }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; txt: string } | null>(null);
  const [valores, setValores] = useState<Partial<Record<Medida, string>>>(() =>
    Object.fromEntries((Object.keys(MEDIDAS) as Medida[]).map((k) => [k, peca.metricas?.[k] != null ? String(peca.metricas[k]) : ""])),
  );

  const quando = peca.posta_em ? diaMais(peca.posta_em, DIAS_PARA_MEDIR) : null;
  const cedo = quando ? quando.toISOString().slice(0, 10) > hoje : false;
  const anotado = Boolean(peca.metricas?.medido_em);

  function salvar() {
    comecar(async () => {
      const r = await salvarMetricas(peca.id, valores);
      setAviso(r.ok ? { ok: true, txt: "Números salvos" } : { ok: false, txt: r.erro ?? "Não deu certo." });
      router.refresh();
    });
  }

  return (
    <section className={m.numeros} aria-labelledby="numeros-titulo">
      <div className={m.numerosCab}>
        <h2 id="numeros-titulo">Como o post foi</h2>
        <p>
          {anotado
            ? `Anotado em ${new Date(`${peca.metricas!.medido_em}T12:00:00`).toLocaleDateString("pt-BR")}. Pode corrigir quando quiser.`
            : cedo && quando
              ? `Os números valem a partir de ${quando.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, 7 dias depois de sair. No Instagram: o post, Ver insights.`
              : "No Instagram: abra o post, toque em Ver insights e copie os números aqui. Deixe vazio o que não achar."}
        </p>
      </div>
      <div className={m.numerosCampos}>
        {(Object.keys(MEDIDAS) as Medida[]).map((k) => (
          <label key={k} className={k === "encaminhamentos" ? m.numerosPrincipal : ""}>
            <span>{MEDIDAS[k].nome}</span>
            <input
              inputMode="numeric"
              value={valores[k] ?? ""}
              placeholder="vazio"
              title={MEDIDAS[k].ajuda}
              onChange={(e) => setValores({ ...valores, [k]: e.target.value.replace(/\D/g, "") })}
            />
          </label>
        ))}
        <button type="button" className={s.btnAcao} disabled={pendente} onClick={salvar}>
          {pendente ? "Salvando" : "Salvar os números"}
        </button>
      </div>
      {aviso ? (
        <p className={aviso.ok ? s.salvo : s.erro} aria-live="polite">
          {aviso.txt}
        </p>
      ) : null}
    </section>
  );
}
