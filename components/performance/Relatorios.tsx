"use client";

/* ============================================================
   OS RELATÓRIOS DE UMA LOJA, NO CRM (06/10/2026)

   Criar o do mês (este mês, ainda parcial, ou o mês passado, fechado),
   escrever a leitura e o que foi feito, abrir e copiar o link. A leitura
   aceita parágrafos (linha em branco entre eles); o "feito" é uma linha
   por item.
   ============================================================ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apagarRelatorio, criarRelatorio, salvarRelatorio } from "@/app/(pt)/crm/acoes-performance";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/performance.module.css";

export type RelatorioLinha = { id: string; mes: string; token: string; leitura: string | null; feito: string | null; updated_at: string };

const MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const SITE = "https://rafaelrazeira.com.br";

function mesDe(deslocamento: number) {
  const agora = new Date();
  const d = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() + deslocamento, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function Relatorios({ lojaId, relatorios }: { lojaId: string; relatorios: RelatorioLinha[] }) {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [ocupado, comecar] = useTransition();
  const opcoes = [
    { mes: mesDe(-1), rotulo: `${MES.format(new Date(mesDe(-1) + "-15"))} (mês fechado)` },
    { mes: mesDe(0), rotulo: `${MES.format(new Date(mesDe(0) + "-15"))} (em andamento)` },
  ];
  const [mes, setMes] = useState(opcoes[0].mes);

  function criar() {
    setErro("");
    comecar(async () => {
      const r = await criarRelatorio(lojaId, mes);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  }

  return (
    <div className={p.lista}>
      <section className={p.nova}>
        <div className={p.novaCampos}>
          <label className={s.campo}>
            <span className={s.campoRot}>Mês do relatório</span>
            <select value={mes} onChange={(e) => setMes(e.target.value)}>
              {opcoes.map((o) => (
                <option key={o.mes} value={o.mes}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className={s.btnAcao} onClick={criar} disabled={ocupado}>
          {ocupado ? "Criando..." : "Criar o relatório"}
        </button>
        {erro ? <p className={p.erro}>{erro}</p> : null}
      </section>

      {relatorios.length ? (
        relatorios.map((r) => <Linha key={r.id} r={r} />)
      ) : (
        <p className={p.vazio}>Nenhum relatório ainda. Crie o do mês acima.</p>
      )}
    </div>
  );
}

function Linha({ r }: { r: RelatorioLinha }) {
  const router = useRouter();
  const [leitura, setLeitura] = useState(r.leitura ?? "");
  const [feito, setFeito] = useState(r.feito ?? "");
  const [msg, setMsg] = useState("");
  const [ocupado, comecar] = useTransition();
  const url = `${SITE}/relatorio/${r.token}`;
  const local = `/relatorio/${r.token}`;
  const mudou = leitura !== (r.leitura ?? "") || feito !== (r.feito ?? "");

  function salvar() {
    setMsg("");
    comecar(async () => {
      const res = await salvarRelatorio(r.id, { leitura, feito });
      setMsg(res.ok ? "Salvo." : res.erro);
      if (res.ok) router.refresh();
    });
  }
  function copiar() {
    navigator.clipboard?.writeText(url).then(
      () => setMsg("Link copiado."),
      () => setMsg("Não deu para copiar: selecione o link e copie."),
    );
  }
  function apagar() {
    if (!confirm(`Apagar o relatório de ${MES.format(new Date(r.mes + "T12:00:00Z"))}? O link para de abrir.`)) return;
    comecar(async () => {
      const res = await apagarRelatorio(r.id);
      if (!res.ok) setMsg(res.erro);
      else router.refresh();
    });
  }

  return (
    <article className={p.linha}>
      <div className={p.linhaTopo}>
        <div className={p.linhaNome}>
          <b style={{ textTransform: "capitalize" }}>{MES.format(new Date(r.mes + "T12:00:00Z"))}</b>
          <span>
            <a href={local} target="_blank" rel="noreferrer">
              {url.replace("https://", "")}
            </a>
          </span>
        </div>
        <div className={p.acoes}>
          <a className={s.btnMini} href={local} target="_blank" rel="noreferrer">
            Abrir
          </a>
          <button type="button" className={s.btnMini} onClick={copiar}>
            Copiar o link
          </button>
          <button type="button" className={s.btnMini} onClick={apagar} disabled={ocupado}>
            Apagar
          </button>
        </div>
      </div>

      <label className={s.campo}>
        <span className={s.campoRot}>A sua leitura do mês (o dono lê isto primeiro)</span>
        <textarea
          rows={5}
          value={leitura}
          onChange={(e) => setLeitura(e.target.value)}
          placeholder="Ex.: Setembro trouxe 30% mais gente, quase toda pelo Instagram. O que mais chama é o Phantom creme e vinho; o 42 do turquesa acabou e 16 pessoas queriam. Este mês: repor o 42 e pôr o Mercurial no banner."
        />
      </label>
      <label className={s.campo}>
        <span className={s.campoRot}>O que foi feito no mês passado (uma linha por item)</span>
        <textarea rows={3} value={feito} onChange={(e) => setFeito(e.target.value)} placeholder={"Trocamos o banner da home\nCadastramos o Nike Shox"} />
      </label>
      <div className={p.acoes}>
        <button type="button" className={s.btnAcao} onClick={salvar} disabled={ocupado || !mudou}>
          {ocupado ? "Salvando..." : "Salvar"}
        </button>
        {msg ? <span className={p.novaNota}>{msg}</span> : null}
      </div>
    </article>
  );
}
