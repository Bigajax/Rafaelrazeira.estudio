"use client";

/* ============================================================
   O CHECKLIST DO PROJETO, POR ETAPA

   Marca na hora e grava em seguida (a tela não espera o banco para riscar
   o item). Se a gravação falha, o item volta e a frase do erro aparece:
   um checklist que mostra feito o que não gravou é pior que nenhum.

   Os itens automáticos aparecem na etapa deles, travados e com a etiqueta
   de onde vêm ("pelo Caixa", "pelo projeto"): quem marca dinheiro é o
   recebimento, e quem marca "checklist criado" é o próprio checklist.
   ============================================================ */

import { useState, useTransition } from "react";
import Link from "next/link";
import { salvarChecklist } from "@/app/(pt)/crm/acoes-projetos";
import { ETAPAS, ITENS_AUTO, type Etapa, type ItemAuto, type ItemChecklist } from "@/lib/projetos/tipos";
import p from "@/app/(pt)/crm/projetos.module.css";

export function Checklist({
  leadId,
  inicial,
  auto,
  atual,
}: {
  leadId: string;
  inicial: ItemChecklist[];
  auto: Record<ItemAuto, boolean>;
  atual: Etapa | null;
}) {
  const [itens, setItens] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState<Partial<Record<Etapa, string>>>({});
  const [, iniciar] = useTransition();

  function gravar(proximos: ItemChecklist[], anteriores: ItemChecklist[]) {
    setItens(proximos);
    setErro(null);
    iniciar(async () => {
      const r = await salvarChecklist(leadId, proximos);
      if (!r.ok) {
        setItens(anteriores);
        setErro(r.erro);
      }
    });
  }

  const alternar = (id: string) =>
    gravar(
      itens.map((x) => (x.id === id ? { ...x, feito: !x.feito, feito_em: !x.feito ? new Date().toISOString() : null } : x)),
      itens,
    );

  const tirar = (id: string) => gravar(itens.filter((x) => x.id !== id), itens);

  function acrescentar(etapa: Etapa) {
    const texto = (novo[etapa] || "").trim();
    if (!texto) return;
    const item: ItemChecklist = { id: `extra-${Date.now().toString(36)}`, etapa, texto, feito: false, extra: true };
    /* entra no fim da etapa dele, não no fim da lista */
    const fim = itens.map((x) => x.etapa).lastIndexOf(etapa);
    const proximos = fim < 0 ? [...itens, item] : [...itens.slice(0, fim + 1), item, ...itens.slice(fim + 1)];
    setNovo({ ...novo, [etapa]: "" });
    gravar(proximos, itens);
  }

  return (
    <div className={p.etapas}>
      {erro ? (
        <p className={p.erro} role="alert">
          {erro}
        </p>
      ) : null}
      {ETAPAS.map((e, n) => {
        const doCaixa = ITENS_AUTO.filter((x) => x.etapa === e.id);
        const meus = itens.filter((x) => x.etapa === e.id);
        const feitos = meus.filter((x) => x.feito).length + doCaixa.filter((x) => auto[x.id]).length;
        const total = meus.length + doCaixa.length;
        return (
          <section
            key={e.id}
            className={`${p.etapa} ${total > 0 && feitos === total ? p.etapaPronta : ""} ${e.id === atual ? p.etapaAtual : ""}`}
          >
            <header className={p.etapaCabeca}>
              <span className={p.etapaNum}>{String(n + 1).padStart(2, "0")}</span>
              <h2>{e.nome}</h2>
              <span className={p.etapaConta}>
                {feitos}/{total}
              </span>
            </header>
            <p className={p.etapaNota}>{e.nota}</p>

            <ul className={p.itens}>
              {doCaixa
                .filter((x) => !x.fim)
                .map((x) => (
                  <ItemAutoLinha key={x.id} texto={x.texto} fonte={x.fonte} feito={auto[x.id]} />
                ))}
              {meus.map((x) => (
                <li key={x.id} className={`${p.item} ${x.feito ? p.itemFeito : ""}`}>
                  <label>
                    <input type="checkbox" checked={x.feito} onChange={() => alternar(x.id)} />
                    <span className={p.caixinha} aria-hidden="true" />
                    <span className={p.itemTexto}>{x.texto}</span>
                  </label>
                  {x.extra ? (
                    <button type="button" className={p.tirar} onClick={() => tirar(x.id)} aria-label={`Tirar "${x.texto}"`}>
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
              {doCaixa
                .filter((x) => x.fim)
                .map((x) => (
                  <ItemAutoLinha key={x.id} texto={x.texto} fonte={x.fonte} feito={auto[x.id]} />
                ))}
            </ul>

            <form
              className={p.acrescentar}
              onSubmit={(ev) => {
                ev.preventDefault();
                acrescentar(e.id);
              }}
            >
              <input
                type="text"
                value={novo[e.id] || ""}
                onChange={(ev) => setNovo({ ...novo, [e.id]: ev.target.value })}
                placeholder="+ item só deste projeto"
                aria-label={`Acrescentar item em ${e.nome}`}
              />
            </form>
          </section>
        );
      })}
    </div>
  );
}

function ItemAutoLinha({ texto, fonte, feito }: { texto: string; fonte: "Caixa" | "projeto"; feito: boolean }) {
  return (
    <li className={`${p.item} ${p.itemCaixa} ${feito ? p.itemFeito : ""}`}>
      <span className={p.caixinhaTravada} aria-hidden="true" />
      <span className={p.itemTexto}>
        {texto}
        <span className={p.etiqueta}>pelo {fonte}</span>
      </span>
      {!feito && fonte === "Caixa" ? (
        <Link href="/crm/caixa" className={p.irCaixa}>
          abrir
        </Link>
      ) : null}
    </li>
  );
}
