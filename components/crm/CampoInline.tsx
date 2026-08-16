"use client";

/* ============================================================
   EDIÇÃO EM LINHA

   Sem botão de salvar. O campo grava quando perde o foco, e só se o valor
   mudou de verdade.

   ---------- por que não tem "salvar" ----------
   A ficha do lead é preenchida aos pedaços, ao longo de semanas: o nicho
   entra na primeira conversa, a cidade na segunda, o ticket quando a
   proposta nasce. Um formulário com botão único obriga a percorrer catorze
   campos para corrigir um, e é assim que CRM fica desatualizado.

   ---------- o preço disso, e como ele é pago ----------
   Sem botão, não existe o momento em que a pessoa sabe que gravou. Por isso
   todo campo tem um sinal ao lado: "salvo" em verde por dois segundos, ou o
   erro em rosa até ser resolvido. Sem esse sinal, edição em linha é edição
   que não dá para confiar.
   ============================================================ */

import { useEffect, useState, useTransition } from "react";
import { salvarLead, type CampoEditavel } from "@/app/crm/acoes";
import s from "@/app/crm/crm.module.css";

type Props = {
  leadId: string;
  campo: CampoEditavel;
  rotulo: string;
  valor: string | number | null;
  tipo?: "text" | "date" | "number" | "email" | "tel";
  placeholder?: string;
  /* Quando presente, vira <select> em vez de <input>. */
  opcoes?: { valor: string; rotulo: string }[];
  /* Máscara aplicada a cada tecla, como a do WhatsApp. */
  mascara?: (v: string) => string;
};

export function CampoInline({
  leadId,
  campo,
  rotulo,
  valor,
  tipo = "text",
  placeholder,
  opcoes,
  mascara,
}: Props) {
  const inicial = valor == null ? "" : String(valor);
  const [texto, setTexto] = useState(inicial);
  const [estado, setEstado] = useState<"parado" | "salvo" | "erro">("parado");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [, comecar] = useTransition();

  /* O valor do servidor manda quando ele muda por fora (outra aba, uma
     passagem de estágio que preencheu o ticket). O `inicial` na dependência
     evita sobrescrever o que está sendo digitado agora. */
  useEffect(() => setTexto(inicial), [inicial]);

  useEffect(() => {
    if (estado !== "salvo") return;
    const t = setTimeout(() => setEstado("parado"), 2000);
    return () => clearTimeout(t);
  }, [estado]);

  const gravar = () => {
    if (texto === inicial) return;
    setMensagem(null);
    comecar(async () => {
      const r = await salvarLead(leadId, { [campo]: texto });
      if (r.ok) {
        setEstado("salvo");
      } else {
        setEstado("erro");
        setMensagem("erro" in r ? r.erro : "Não foi possível salvar.");
      }
    });
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    /* Enter grava, Escape desfaz. São os dois gestos que todo mundo já
       tenta em edição em linha, e os dois saem do campo: o `blur` é o que
       dispara a gravação, então tê-los aqui é ter um caminho só. */
    if (e.key === "Enter") (e.target as HTMLElement).blur();
    if (e.key === "Escape") {
      setTexto(inicial);
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <label className={s.dado}>
      <span>{rotulo}</span>
      <span className={s.dadoCampo}>
        {opcoes ? (
          <select
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={gravar}
            className={estado === "erro" ? s.campoErro : ""}
          >
            {opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={tipo}
            value={texto}
            placeholder={placeholder}
            onChange={(e) => setTexto(mascara ? mascara(e.target.value) : e.target.value)}
            onBlur={gravar}
            onKeyDown={aoTeclar}
            className={estado === "erro" ? s.campoErro : ""}
          />
        )}

        {estado === "salvo" ? <i className={s.salvo}>salvo</i> : null}
        {estado === "erro" ? (
          <i role="alert" className={s.erro}>
            {mensagem}
          </i>
        ) : null}
      </span>
    </label>
  );
}

/* A versão de texto longo, para notas. Mesmo comportamento, outro corpo. */
export function NotaInline({ leadId, valor }: { leadId: string; valor: string | null }) {
  const inicial = valor ?? "";
  const [texto, setTexto] = useState(inicial);
  const [estado, setEstado] = useState<"parado" | "salvo" | "erro">("parado");
  const [, comecar] = useTransition();

  useEffect(() => setTexto(inicial), [inicial]);
  useEffect(() => {
    if (estado !== "salvo") return;
    const t = setTimeout(() => setEstado("parado"), 2000);
    return () => clearTimeout(t);
  }, [estado]);

  const gravar = () => {
    if (texto === inicial) return;
    comecar(async () => {
      const r = await salvarLead(leadId, { notas: texto });
      setEstado(r.ok ? "salvo" : "erro");
    });
  };

  return (
    <>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={gravar}
        placeholder="O que não cabe em campo: o que a pessoa contou, o que ela já tentou, quem decide."
        aria-label="Notas sobre o lead"
      />
      {estado === "salvo" ? <p className={s.salvo}>salvo</p> : null}
      {estado === "erro" ? (
        <p role="alert" className={s.erro}>
          Não foi possível salvar as notas.
        </p>
      ) : null}
    </>
  );
}
