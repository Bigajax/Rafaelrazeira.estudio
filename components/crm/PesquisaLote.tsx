"use client";

/* ============================================================
   A PESQUISA EM LOTE — a coluna Lista inteira de uma vez

   Quem importa uma lista (dez padarias de uma vez) não vai abrir dez
   fichas para apertar dez botões. Este botão mora no topo da coluna
   Lista e dispara a pesquisa de todo lead que ainda não tem dossiê (ou
   cujo dossiê deu erro), com QUATRO SEGUNDOS entre um disparo e outro.
   O intervalo não é pela API do modelo, que aguenta: é pelo Instagram,
   que corta consultas em rajada, e cada pesquisa faz duas ou três
   consultas de perfil nos primeiros segundos. Espaçados, os trinta
   disparos espalham essas consultas por uns dois minutos e muito mais
   colheitas passam.

   Cada disparo é atirar e seguir: a rota trabalha sozinha e cada ficha
   mostra "pesquisando" e se atualiza quando o dossiê chega. O aviso de
   deixar a aba aberta existe porque um disparo interrompido no meio
   (aba fechada antes de a rota receber) simplesmente não acontece, e o
   lead fica para a próxima rodada do botão.
   ============================================================ */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadPainel } from "@/lib/crm/tipos";
import { GarimpoModal } from "./GarimpoModal";
import s from "@/app/crm/crm.module.css";

const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PesquisaLote({ leads }: { leads: LeadPainel[] }) {
  const router = useRouter();
  const [disparadas, setDisparadas] = useState<number | null>(null);
  const [rodando, setRodando] = useState(false);
  const [garimpo, setGarimpo] = useState(false);

  /* Sem dossiê, ou com dossiê que falhou: os dois merecem pesquisa. Quem
     está "pesquisando" ou já tem dossiê pronto fica de fora, e refazer um
     pronto continua sendo decisão da ficha, um por um. */
  const fila = leads.filter((l) => !l.dossie || l.dossie.status === "erro");

  const disparar = async () => {
    setRodando(true);
    let n = 0;
    for (const lead of fila) {
      void fetch("/api/crm/pesquisa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      }).catch(() => {});
      n++;
      setDisparadas(n);
      await pausa(4000);
    }
    setRodando(false);
    router.refresh();
  };

  return (
    <div className={s.lote}>
      {/* O garimpo mora aqui porque é aqui que o fruto dele cai: buscar
          no Maps planta leads nesta coluna, e o botão de pesquisar em
          lote logo abaixo é o passo seguinte natural. */}
      <button type="button" className={s.loteBotao} onClick={() => setGarimpo(true)}>
        Garimpar do Maps
      </button>

      {fila.length > 0 && disparadas === null ? (
        <button type="button" className={s.loteBotao} onClick={disparar} disabled={rodando}>
          Pesquisar {fila.length} sem dossiê
        </button>
      ) : null}
      {disparadas !== null ? (
        <p className={s.loteNota} role="status">
          {rodando
            ? `Disparando… ${disparadas} de ${fila.length}`
            : `${disparadas} ${disparadas === 1 ? "pesquisa disparada" : "pesquisas disparadas"}. Os dossiês chegam nas fichas em alguns minutos.`}
        </p>
      ) : null}

      {garimpo ? <GarimpoModal aoFechar={() => setGarimpo(false)} /> : null}
    </div>
  );
}
