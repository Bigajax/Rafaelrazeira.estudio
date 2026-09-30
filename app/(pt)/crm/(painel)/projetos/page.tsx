/* ============================================================
   PROJETOS: o que acontece depois do "fechou"

   O Pipeline termina em `ganho`, e o trabalho não. Esta aba começa onde
   ele acaba: cada cliente fechado numa linha, com a régua das seis etapas
   (fechado, material, cadastro, domínio, ligar, entrega), o que fazer
   agora e o dinheiro que ainda falta entrar.

   A ordem é a de quem precisa de mão: primeiro os em andamento, pela etapa
   mais atrasada; os entregues descem para o fim, apagados. Um projeto
   entregue não some: é o histórico de como cada loja foi ao ar.
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { projetos } from "@/lib/projetos/dados";
import { ETAPAS, etapaAtual, proximoItem, situacaoDasEtapas } from "@/lib/projetos/tipos";
import { dinheiroExato } from "@/lib/crm/financeiro";
import { dataCurta } from "@/lib/crm/regras";
import { Regua } from "@/components/projetos/Regua";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/projetos.module.css";

export const metadata: Metadata = { title: "Projetos" };

export default async function PaginaProjetos() {
  const { projetos: lista, semTabela } = await projetos();

  const linhas = lista
    .map((x) => {
      const situacoes = situacaoDasEtapas(x);
      const atual = etapaAtual(x);
      return { x, situacoes, atual, ordem: atual ? ETAPAS.findIndex((e) => e.id === atual) : 99 };
    })
    .sort((a, b) => a.ordem - b.ordem || (b.x.fechado_em ?? "").localeCompare(a.x.fechado_em ?? ""));

  const andamento = linhas.filter((l) => l.atual).length;

  return (
    <div className={p.tela}>
      <header className={p.cabeca}>
        <h1>
          Projetos<i className={s.ponto}>.</i>
        </h1>
        <p className={p.placar}>
          {lista.length === 0
            ? "Nenhum cliente fechado ainda."
            : `${andamento} em andamento, ${lista.length - andamento} ${lista.length - andamento === 1 ? "entregue" : "entregues"}.`}
        </p>
      </header>

      {semTabela ? (
        <p className={p.aviso}>
          A tabela dos projetos ainda não existe no banco. Rode o <code>supabase/projetos.sql</code> no SQL Editor do
          Supabase: até lá a aba mostra o molde, mas não grava o que você marcar.
        </p>
      ) : null}

      {lista.length === 0 ? (
        <p className={p.vazio}>
          Quando um card do Pipeline for para <b>ganho</b>, ele aparece aqui como projeto.
        </p>
      ) : (
        <ol className={p.lista}>
          {linhas.map(({ x, situacoes, atual }) => {
            const passo = proximoItem(x);
            const nomeEtapa = ETAPAS.find((e) => e.id === atual)?.nome;
            return (
              <li key={x.lead_id} className={`${p.linha} ${atual ? "" : p.linhaEntregue}`}>
                <Link href={`/crm/projetos/${x.lead_id}`} className={p.linhaLink}>
                  <div className={p.linhaNome}>
                    <h2>{x.nome}</h2>
                    <span>
                      {[x.instagram ? `@${x.instagram}` : "", x.fechado_em ? `fechou ${dataCurta(x.fechado_em)}` : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div className={p.linhaRegua}>
                    <Regua situacoes={situacoes} atual={atual} />
                    <span className={p.linhaEtapa}>
                      {atual ? (
                        <>
                          <b>{nomeEtapa}</b>
                          {passo ? `: ${passo}` : ""}
                        </>
                      ) : (
                        <b>Entregue{x.entregue_em ? ` em ${dataCurta(x.entregue_em)}` : ""}</b>
                      )}
                    </span>
                  </div>
                  <div className={p.linhaDinheiro}>
                    {x.caixa.contrato ? (
                      x.caixa.saldo ? (
                        <span className={p.quitado}>{dinheiroExato(x.caixa.total)} quitado</span>
                      ) : (
                        <>
                          <b>{dinheiroExato(x.caixa.total - x.caixa.pago)}</b>
                          <span>
                            {x.caixa.proxima
                              ? `${x.caixa.proxima.rotulo.toLowerCase()}, vence ${dataCurta(x.caixa.proxima.vence_em)}`
                              : "a receber"}
                          </span>
                        </>
                      )
                    ) : (
                      <span className={p.semContrato}>sem contrato no Caixa</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
