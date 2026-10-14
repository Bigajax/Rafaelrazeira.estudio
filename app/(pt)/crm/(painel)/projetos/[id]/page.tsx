/* ============================================================
   UM PROJETO ABERTO

   Em cima, quem é e onde a vitrine está, com a régua grande. Embaixo, à
   esquerda, o checklist das seis etapas; à direita, o que o cliente
   mandou pelo checklist dele e os endereços do projeto. No celular a
   coluna da direita desce para depois do checklist.
   ============================================================ */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projeto as lerProjeto } from "@/lib/projetos/dados";
import { etapaAtual, situacaoDasEtapas } from "@/lib/projetos/tipos";
import { dinheiroExato } from "@/lib/crm/financeiro";
import { dataCurta } from "@/lib/crm/regras";
import { Regua } from "@/components/projetos/Regua";
import { Checklist } from "@/components/projetos/Checklist";
import { ChecklistCliente } from "@/components/projetos/ChecklistCliente";
import { BotaoEntregue, Campos } from "@/components/projetos/Campos";
import { BlocoPerformance } from "@/components/performance/BlocoPerformance";
import { OperacaoEntrega } from "@/components/projetos/Operacao";
import { clienteServidor } from "@/lib/crm/supabase";
import { lerTodos } from "@/lib/sistema/consultas";
import { revisaoInstalada } from "@/lib/sistema/modulos";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/projetos.module.css";

export const metadata: Metadata = { title: "Projeto" };

/* "Criar o checklist" lê a vitrine inteira no ar: a Arena, com 473 peças,
   leva uns 30 segundos. */
export const maxDuration = 60;

export default async function PaginaProjeto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ contrato?: string }>;
}) {
  const { id } = await params;
  const { contrato } = await searchParams;
  const {
    projeto: x,
    semTabela,
    projetos: opcoes,
  } = await lerProjeto(id, contrato);
  if (!x && opcoes.length > 1 && !contrato)
    return (
      <div className={p.tela}>
        <h1>Escolha a entrega</h1>
        <p>
          Este cliente tem mais de um contrato. Cada entrega tem seu checklist e
          saldo.
        </p>
        <ul>
          {opcoes.map((o) => (
            <li key={o.contrato_id}>
              <Link href={"/crm/projetos/" + id + "?contrato=" + o.contrato_id}>
                {o.contrato_titulo}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  if (!x) notFound();
  const banco = await clienteServidor();
  const [revisado, previas, lojas] = await Promise.all([
    revisaoInstalada(),
    lerTodos<{ id: string; nome: string }>(
      banco,
      "prod_lojas",
      "id,nome",
      undefined,
      { lead_id: id },
    ),
    lerTodos<{ id: string; nome: string }>(
      banco,
      "perf_lojas",
      "id,nome",
      undefined,
      { lead_id: id },
    ),
  ]);

  const alvo = x.contrato_id ? x.lead_id + ":" + x.contrato_id : x.lead_id;
  const situacoes = situacaoDasEtapas(x);
  const atual = etapaAtual(x);
  const tudoPronto = Object.values(situacoes).every((e) => e.pronta);
  const whats = x.whatsapp
    ? `https://wa.me/${x.whatsapp.startsWith("55") ? x.whatsapp : `55${x.whatsapp}`}`
    : null;

  return (
    <div className={p.tela}>
      <Link href="/crm/projetos" className={p.voltar}>
        ← Projetos
      </Link>

      <header className={p.cabecaProjeto}>
        <div>
          <h1>
            {x.nome}
            <i className={s.ponto}>.</i>
          </h1>
          <p className={p.placar}>
            {x.contrato_titulo ? x.contrato_titulo + " · " : ""}
            {x.fechado_em ? `Fechou em ${dataCurta(x.fechado_em)}` : "Fechado"}
            {x.caixa.contrato
              ? x.caixa.saldo
                ? ` · ${dinheiroExato(x.caixa.total)} quitado`
                : ` · ${dinheiroExato(x.caixa.pago)} de ${dinheiroExato(x.caixa.total)} recebidos`
              : " · sem contrato no Caixa"}
            {x.entregue_em ? ` · entregue em ${dataCurta(x.entregue_em)}` : ""}
          </p>
        </div>
        <nav className={p.atalhos} aria-label="Atalhos do projeto">
          {x.dominio ? (
            <a
              href={x.dominio}
              target="_blank"
              rel="noopener"
              className={s.btnMini}
            >
              Domínio
            </a>
          ) : null}
          {x.site ? (
            <a
              href={x.site}
              target="_blank"
              rel="noopener"
              className={s.btnMini}
            >
              Vitrine
            </a>
          ) : null}
          {x.site || x.dominio ? (
            <a
              href={`${(x.dominio || x.site)!.replace(/\/$/, "")}/painel`}
              target="_blank"
              rel="noopener"
              className={s.btnMini}
            >
              Painel
            </a>
          ) : null}
          {whats ? (
            <a
              href={whats}
              target="_blank"
              rel="noopener"
              className={s.btnMini}
            >
              WhatsApp
            </a>
          ) : null}
          <Link href={`/crm/lead/${x.lead_id}`} className={s.btnMini}>
            Ficha
          </Link>
        </nav>
      </header>

      {semTabela ? (
        <p className={p.aviso}>
          A tabela dos projetos ainda não existe no banco. Rode o{" "}
          <code>supabase/projetos.sql</code> no SQL Editor do Supabase: até lá o
          que você marcar aqui não fica gravado.
        </p>
      ) : null}

      <Regua situacoes={situacoes} atual={atual} grande />
      {x.status_contrato === "cancelado" ? (
        <p className={p.aviso}>
          Contrato cancelado · histórico da entrega preservado.
        </p>
      ) : null}
      {revisado && x.contrato_id ? (
        <OperacaoEntrega projeto={x} previas={previas} lojas={lojas} />
      ) : null}

      <div className={p.corpo}>
        <Checklist
          leadId={alvo}
          inicial={x.checklist}
          auto={x.auto}
          atual={atual}
        />

        <aside className={p.lado}>
          <section className={p.painel}>
            <h2 className={p.painelTitulo}>O checklist do cliente</h2>
            <ChecklistCliente
              leadId={alvo}
              site={x.site}
              material={x.material}
              whatsapp={x.whatsapp}
            />
          </section>

          <section className={p.painel}>
            <h2 className={p.painelTitulo}>O projeto</h2>
            <Campos
              leadId={alvo}
              site={x.site}
              dominio={x.dominio}
              repo={x.repo}
              material={x.material}
              notas={x.notas}
            />
            <BotaoEntregue
              leadId={alvo}
              entregue={!!x.entregue_em}
              tudoPronto={tudoPronto}
            />
          </section>

          {/* A contagem da vitrine (06/10): a loja no Performance, com a
              trava. Nasce e se mexe na aba Performance; aqui só se lê. */}
          <section className={p.painel}>
            <h2 className={p.painelTitulo}>Performance</h2>
            <BlocoPerformance
              leadId={x.lead_id}
              nome={x.nome}
              loja={x.performance}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
