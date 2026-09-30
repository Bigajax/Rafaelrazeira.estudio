"use client";

/* ============================================================
   O CALENDÁRIO: o feed antes do feed

   Cada dia mostra a CAPA de verdade da peça, montada pelo mesmo molde que
   vira PNG. O calendário de conteúdo comum é uma grade de rótulos ("Post
   carrossel, terça"); este responde de relance a pergunta que importa para
   quem posta todo dia: como o meu feed vai ficar esta semana?

   Agendar é arrastar a capa da bandeja para o dia. No celular, onde
   arrastar é ruim, toca em "Agendar" na peça e depois no dia.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { agendar, pedir } from "@/app/(pt)/crm/acoes-marketing";
import { CODIGOS, TIPOS, urlFundo, type Peca, type TipoPeca } from "@/lib/marketing/tipos";
import { Miniatura } from "./Miniatura";
import m from "@/app/(pt)/crm/marketing.module.css";
import s from "@/app/(pt)/crm/crm.module.css";

const SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* As semanas que o mês toca, de segunda a domingo. Os dias de fora do mês
   aparecem apagados para a grade não abrir buraco na primeira linha. */
function grade(ano: number, mes: number) {
  const primeiro = new Date(ano, mes - 1, 1);
  const recuo = (primeiro.getDay() + 6) % 7;
  const inicio = new Date(ano, mes - 1, 1 - recuo);
  const ultimo = new Date(ano, mes, 0);
  const dias: { data: string; dia: number; doMes: boolean }[] = [];
  for (let d = new Date(inicio); d <= ultimo || dias.length % 7 !== 0; d.setDate(d.getDate() + 1)) {
    dias.push({ data: iso(d), dia: d.getDate(), doMes: d.getMonth() === mes - 1 });
  }
  return dias;
}

function estadoDe(p: Peca, hoje: string) {
  if (p.status === "postada") return m.estPostada;
  if (p.status === "pronta") return m.estPronta;
  if (p.posta_em && p.posta_em < hoje) return m.estAtrasada;
  return m.estRascunho;
}

export function Calendario({
  ano,
  mes,
  hoje,
  noMes,
  semData,
}: {
  ano: number;
  mes: number;
  hoje: string;
  noMes: Peca[];
  semData: Peca[];
}) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [pegando, setPegando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [n, setN] = useState(5);
  const [tipoPautas, setTipoPautas] = useState<"" | TipoPeca>("");

  const porDia = new Map<string, Peca[]>();
  for (const p of noMes) {
    if (!p.posta_em) continue;
    porDia.set(p.posta_em, [...(porDia.get(p.posta_em) ?? []), p]);
  }

  function mover(id: string, data: string | null) {
    setPegando(null);
    setAlvo(null);
    comecar(async () => {
      const r = await agendar(id, data);
      if (!r.ok) setErro(r.erro);
      router.refresh();
    });
  }

  /* O + do dia abre o Criar com a data: a peça nasce pelo pilar, não
     como um carrossel vazio. */
  function novaNoDia(data: string) {
    router.push(`/crm/marketing/criar?data=${data}`);
  }

  function pedirPautas() {
    comecar(async () => {
      const r = await pedir(null, "pautas", { n, tipo: tipoPautas || null });
      if (!r.ok) setErro(r.erro);
      router.refresh();
    });
  }

  const arrastavel = (p: Peca) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", p.id);
      e.dataTransfer.effectAllowed = "move";
    },
  });

  const soltavel = (data: string | null, chave: string) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setAlvo(chave);
    },
    onDragLeave: () => setAlvo((a) => (a === chave ? null : a)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (id) mover(id, data);
    },
  });

  const dias = grade(ano, mes);

  return (
    <div className={`${m.calendario} ${pendente ? m.ocupado : ""}`}>
      <div className={m.grade} role="grid" aria-label="Peças por dia">
        {SEMANA.map((d) => (
          <div key={d} className={m.semanaNome} role="columnheader">
            {d}
          </div>
        ))}
        {dias.map(({ data, dia, doMes }) => {
          const pecas = porDia.get(data) ?? [];
          const chave = `d${data}`;
          return (
            <div
              key={data}
              role="gridcell"
              className={[
                m.dia,
                doMes ? "" : m.diaFora,
                data === hoje ? m.diaHoje : "",
                data < hoje ? m.diaPassado : "",
                alvo === chave ? m.diaAlvo : "",
                pecas.length ? "" : m.diaVazio,
                pegando ? m.diaEscolhendo : "",
              ].join(" ")}
              {...soltavel(data, chave)}
              onClick={pegando ? () => mover(pegando, data) : undefined}
            >
              <div className={m.diaCab}>
                <b>{dia}</b>
                <span className={m.diaSemana}>{SEMANA[(new Date(`${data}T12:00`).getDay() + 6) % 7]}</span>
                {!pegando && doMes ? (
                  <button
                    type="button"
                    className={m.diaMais}
                    onClick={(e) => {
                      e.stopPropagation();
                      novaNoDia(data);
                    }}
                    aria-label={`Nova peça no dia ${dia}`}
                    title="Nova peça neste dia"
                  >
                    +
                  </button>
                ) : null}
              </div>
              <div className={m.diaPecas}>
                {pecas.map((p) => (
                  <Link
                    key={p.id}
                    href={`/crm/marketing/${p.id}`}
                    className={`${m.capinha} ${estadoDe(p, hoje)}`}
                    title={p.gancho || p.briefing}
                    {...arrastavel(p)}
                    onClick={(e) => pegando && e.preventDefault()}
                  >
                    <Miniatura peca={p} largura={pecas.length > 1 ? 58 : 86} fundo={urlFundo(p.fundo)} />
                    {p.codigo ? <i className={m.capinhaCod}>{p.codigo}</i> : null}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <aside className={`${m.bandeja} ${alvo === "bandeja" ? m.bandejaAlvo : ""}`} {...soltavel(null, "bandeja")}>
        <h2>
          <span>
            Sem data<i className={s.ponto}>.</i>
          </span>
          <span className={m.cont}>{semData.length}</span>
        </h2>
        <p className={m.bandejaNota}>Arraste a capa para um dia. Solte aqui para tirar do calendário.</p>

        <div className={m.pautas}>
          <label className={m.pautasLinha}>
            <span>Pedir</span>
            <select value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Quantas pautas">
              {[3, 5, 7, 10].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <span>pautas de</span>
            <select value={tipoPautas} onChange={(e) => setTipoPautas(e.target.value as TipoPeca | "")} aria-label="Formato">
              <option value="">qualquer formato</option>
              {(["carrossel", "post_feed", "story"] as TipoPeca[]).map((t) => (
                <option key={t} value={t}>
                  {TIPOS[t].nome.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={s.btn} onClick={pedirPautas} disabled={pendente}>
            Pedir à Paula
          </button>
        </div>

        {erro ? <p className={s.erro}>{erro}</p> : null}

        {semData.length === 0 ? (
          <div className={m.bandejaVazia}>
            <b>Nada esperando data.</b>
            <p>Peça pautas à Paula, ou toque no + de um dia para começar uma peça ali.</p>
          </div>
        ) : (
          <ul className={m.bandejaLista}>
            {semData.map((p) => (
              <li key={p.id} className={pegando === p.id ? m.pegando : ""}>
                <Link href={`/crm/marketing/${p.id}`} className={`${m.capinha} ${estadoDe(p, hoje)}`} {...arrastavel(p)}>
                  <Miniatura peca={p} largura={72} fundo={urlFundo(p.fundo)} />
                </Link>
                <div className={m.bandejaTexto}>
                  <span className={m.bandejaCod}>
                    {p.codigo ? <b>{p.codigo}</b> : null} {p.codigo ? CODIGOS[p.codigo].nome : TIPOS[p.tipo].nome}
                  </span>
                  <Link href={`/crm/marketing/${p.id}`} className={m.bandejaGancho}>
                    {p.gancho || p.briefing || "Peça sem briefing"}
                  </Link>
                  <button
                    type="button"
                    className={s.btnMini}
                    onClick={() => setPegando(pegando === p.id ? null : p.id)}
                    aria-pressed={pegando === p.id}
                  >
                    {pegando === p.id ? "Toque num dia" : "Agendar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
