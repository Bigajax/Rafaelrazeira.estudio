"use client";

/* ============================================================
   OS ENDEREÇOS DO PROJETO E O "ENTREGUE"

   Cada campo grava quando perde o foco, e diz "salvo" do lado: o mesmo
   jeito da ficha do lead. Não tem botão de salvar porque um formulário de
   cinco campos com um botão no fim é o formulário que alguém fecha antes
   de apertar.
   ============================================================ */

import { useState, useTransition } from "react";
import { marcarEntregue, salvarCampo } from "@/app/(pt)/crm/acoes-projetos";
import p from "@/app/(pt)/crm/projetos.module.css";

type Campo = "site" | "dominio" | "repo" | "material" | "notas";

const ROTULOS: Record<Campo, { rotulo: string; dica: string }> = {
  site: { rotulo: "Vitrine hoje", dica: "https://loja.vercel.app" },
  dominio: { rotulo: "Domínio dele", dica: "https://loja.com.br" },
  repo: { rotulo: "Repositório", dica: "Bigajax/loja" },
  material: { rotulo: "Chave do checklist", dica: "fulltime" },
  notas: { rotulo: "Notas", dica: "O que só vale para este projeto" },
};

function CampoProjeto({ leadId, campo, inicial }: { leadId: string; campo: Campo; inicial: string | null }) {
  const [valor, setValor] = useState(inicial ?? "");
  const [gravado, setGravado] = useState(inicial ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    if (valor.trim() === gravado.trim()) return;
    iniciar(async () => {
      const r = await salvarCampo(leadId, campo, valor);
      if (r.ok) {
        setGravado(valor);
        setMsg({ ok: true, texto: "salvo" });
      } else setMsg({ ok: false, texto: r.erro });
    });
  }

  const { rotulo, dica } = ROTULOS[campo];
  const props = {
    value: valor,
    placeholder: dica,
    onChange: (e: { target: { value: string } }) => {
      setValor(e.target.value);
      setMsg(null);
    },
    onBlur: salvar,
  };

  return (
    <label className={`${p.campo} ${campo === "notas" ? p.campoLargo : ""}`}>
      <span>
        {rotulo}
        {pendente ? <i className={p.salvando}>salvando</i> : msg ? <i className={msg.ok ? p.salvo : p.naoSalvo}>{msg.texto}</i> : null}
      </span>
      {campo === "notas" ? <textarea rows={4} {...props} /> : <input type="text" {...props} />}
    </label>
  );
}

export function Campos({
  leadId,
  site,
  dominio,
  repo,
  material,
  notas,
}: {
  leadId: string;
  site: string | null;
  dominio: string | null;
  repo: string | null;
  material: string | null;
  notas: string | null;
}) {
  return (
    <div className={p.campos}>
      <CampoProjeto leadId={leadId} campo="site" inicial={site} />
      <CampoProjeto leadId={leadId} campo="dominio" inicial={dominio} />
      <CampoProjeto leadId={leadId} campo="repo" inicial={repo} />
      <CampoProjeto leadId={leadId} campo="material" inicial={material} />
      <CampoProjeto leadId={leadId} campo="notas" inicial={notas} />
    </div>
  );
}

export function BotaoEntregue({ leadId, entregue, tudoPronto }: { leadId: string; entregue: boolean; tudoPronto: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className={p.entregueBloco}>
      <button
        type="button"
        className={entregue ? p.btnSecundario : p.btnEntregue}
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await marcarEntregue(leadId, !entregue);
            setErro(r.ok ? null : r.erro);
          })
        }
      >
        {entregue ? "Reabrir o projeto" : "Marcar como entregue"}
      </button>
      {!entregue && !tudoPronto ? <span className={p.entregueNota}>Ainda tem item em aberto, mas dá para marcar.</span> : null}
      {erro ? <span className={p.naoSalvo}>{erro}</span> : null}
    </div>
  );
}
