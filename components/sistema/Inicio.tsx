import Link from "next/link";
import { financeiro } from "@/lib/financeiro/dados";
import { caixa } from "@/lib/crm/dados";
import { clienteServidor } from "@/lib/crm/supabase";
import { projetos } from "@/lib/projetos/dados";
import { proximoItem, etapaAtual } from "@/lib/projetos/tipos";
import { hojeSP, somarDias } from "@/lib/crm/regras";
import { dinheiroExato } from "@/lib/crm/financeiro";
import { lerTodos } from "@/lib/sistema/consultas";
import { apurarMes } from "@/lib/sistema/indicadores";
import { percentual, formatar, type Meta } from "@/lib/plano/tipos";
import { leitura } from "@/lib/marketing/resultados";
import type { Peca } from "@/lib/marketing/tipos";
import { Cabecalho, Indicador } from "./Painel";
import s from "./sistema.module.css";

export async function Inicio() {
  const hoje = hojeSP();
  const mes = hoje.slice(0, 7);
  const ano = Number(hoje.slice(0, 4));
  const b = await clienteServidor();
  const [fin, contas, entregas, leads, metas, posts, lojas] = await Promise.all([
    financeiro(ano),
    caixa(ano),
    projetos(),
    lerTodos<{
      id: string;
      nome: string;
      empresa: string | null;
      estagio: string;
      proxima_acao_em: string | null;
      proximo_passo: string | null;
    }>(b, "crm_leads", "id,nome,empresa,estagio,proxima_acao_em,proximo_passo"),
    lerTodos<Meta>(b, "plano_metas"),
    lerTodos<Peca>(b, "mkt_pecas"),
    lerTodos<{ id: string; nome: string; ativa: boolean; para_sempre: boolean; liberado_ate: string | null }>(
      b,
      "perf_lojas",
      "id,nome,ativa,para_sempre,liberado_ate",
    ),
  ]);
  if (fin.semTabela) throw new Error("Não foi possível carregar o resumo financeiro.");
  const r = apurarMes(mes, fin.recebimentos, fin.despesas, fin.devolucoes, fin.vendas);
  const meta = metas
    .filter((m) => m.ano === ano && m.fonte === "recebido")
    .sort((a, b) => a.ordem - b.ordem)[0];
  const valores: Record<number, number> = {};
  for (let n = 1; n <= Number(mes.slice(5)); n++) {
    const a = apurarMes(
      ano + "-" + String(n).padStart(2, "0"),
      fin.recebimentos,
      fin.despesas,
      fin.devolucoes,
    );
    valores[n] = a.bruto - a.devolvido;
  }
  const progresso = meta ? percentual(meta, valores, Number(mes.slice(5))) : null;
  type Acao = {
    chave: string;
    nome: string;
    motivo: string;
    acao: string;
    href: string;
    prioridade: number;
    data: string;
  };
  const fila: Acao[] = [
    ...contas.devendo.map((x) => ({
      chave: "p:" + x.parcela.id,
      nome: x.parcela.lead_nome,
      motivo: "Cobrança · " + dinheiroExato(x.s.saldo) + " · vence " + x.parcela.vence_em,
      acao: "Ver parcela",
      href: "/crm/lead/" + x.parcela.lead_id,
      prioridade: x.parcela.vence_em < hoje ? 0 : 1,
      data: x.parcela.vence_em,
    })),
    ...leads
      .filter(
        (l) =>
          !["ganho", "perdido", "geladeira"].includes(l.estagio) &&
          l.proxima_acao_em &&
          l.proxima_acao_em <= hoje,
      )
      .map((l) => ({
        chave: "l:" + l.id,
        nome: l.empresa || l.nome,
        motivo: "Vendas · " + (l.proximo_passo ?? "Definir próximo passo"),
        acao: "Abrir negócio",
        href: "/crm/lead/" + l.id,
        prioridade: l.proxima_acao_em! < hoje ? 0 : 1,
        data: l.proxima_acao_em!,
      })),
    ...entregas.projetos
      .filter((p) => !p.entregue_em)
      .map((p) => ({
        chave: "e:" + (p.contrato_id ?? p.lead_id),
        nome: p.nome,
        motivo: "Entrega · " + (proximoItem(p) ?? "Conferir entrega"),
        acao: "Abrir entrega",
        href: "/crm/projetos/" + p.lead_id + (p.contrato_id ? "?contrato=" + p.contrato_id : ""),
        prioridade: p.prazo && p.prazo < hoje ? 0 : 2,
        data: p.prazo ?? hoje,
      })),
    ...leitura(
      posts.filter((p) => p.status === "postada"),
      hoje,
    ).faltam.map((p) => ({
      chave: "m:" + p.id,
      nome: p.gancho || "Conteúdo publicado",
      motivo: "Marketing · registrar métricas após 7 dias",
      acao: "Medir post",
      href: "/crm/marketing/" + p.id,
      prioridade: 3,
      data: p.posta_em ?? hoje,
    })),
    ...lojas
      .filter((l) => l.ativa && !l.para_sempre && l.liberado_ate && l.liberado_ate <= somarDias(hoje, 7))
      .map((l) => ({
        chave: "s:" + l.id,
        nome: l.nome,
        motivo: "Performance · acesso até " + l.liberado_ate,
        acao: "Acompanhar",
        href: "/crm/performance/" + l.id,
        prioridade: l.liberado_ate! < hoje ? 1 : 3,
        data: l.liberado_ate!,
      })),
  ].sort(
    (a, b) => a.prioridade - b.prioridade || a.data.localeCompare(b.data) || a.chave.localeCompare(b.chave),
  );
  const estagios = new Map<string, number>();
  for (const p of entregas.projetos.filter((p) => !p.entregue_em)) {
    const etapa = etapaAtual(p) ?? "revisao";
    estagios.set(etapa, (estagios.get(etapa) ?? 0) + 1);
  }
  return (
    <div className={s.tela}>
      <Cabecalho
        titulo="Hoje"
        descricao={
          "Visão do estúdio · " +
          new Date(hoje + "T12:00:00Z").toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            timeZone: "America/Sao_Paulo",
          })
        }
      >
        <Link className={s.botao + " " + s.primario} href="/crm?modo=fila">
          Trabalhar a fila comercial
        </Link>
        <Link className={s.botao} href="/crm/clientes">
          Clientes
        </Link>
      </Cabecalho>
      <div className={s.kpis}>
        <Indicador
          nome="Entradas após devoluções"
          valor={dinheiroExato(r.bruto - r.devolvido)}
          nota="Neste mês · antes das taxas"
          href={"/crm/financeiro?mes=" + mes + "&aba=extrato"}
        />
        <Indicador
          nome="Saldo vencido"
          valor={dinheiroExato(contas.vencidoContratual)}
          nota="Posição de hoje · vencimento do contrato"
          href="/crm/caixa"
        />
        <Indicador
          nome="Entregas pendentes"
          valor={String(entregas.projetos.filter((p) => !p.entregue_em).length)}
          nota="Projetos em andamento"
          href="/crm/projetos"
        />
        <Indicador
          nome="Meta de recebimentos"
          valor={progresso === null ? "Definir meta" : Math.round(progresso * 100) + "%"}
          nota={
            meta
              ? formatar(meta.alvo, "R$") + (meta.periodo === "mes" ? " por mês" : " no ano")
              : "Organize o alvo no Plano"
          }
          href={"/crm/plano?ano=" + ano + "#metas"}
        />
      </div>
      <div className={s.grade}>
        <section className={s.painel}>
          <h2>Próximas ações</h2>
          <p className={s.descricao}>Atrasos primeiro, depois os prazos e as tarefas em andamento.</p>
          {fila.length ? (
            <>
              <ul className={s.fila}>
                {fila.slice(0, 12).map((a) => (
                  <li key={a.chave}>
                    <div>
                      <b>{a.nome}</b>
                      <small>{a.motivo}</small>
                    </div>
                    <Link className={s.botao} href={a.href}>
                      {a.acao}
                    </Link>
                  </li>
                ))}
              </ul>
              {fila.length > 12 ? (
                <p className={s.meta}>{fila.length} ações no total. Continue nas áreas de origem.</p>
              ) : null}
            </>
          ) : (
            <p className={s.vazio}>
              Nenhuma pendência encontrada. A fila comercial continua disponível para iniciar novos contatos.
            </p>
          )}
        </section>
        <div>
          <section className={s.painel}>
            <h2>Atenção aos dados</h2>
            <ul className={s.fila}>
              {r.taxasPendentes ? (
                <li>
                  <div>
                    <b>{r.taxasPendentes} recebimentos sem líquido</b>
                    <small>Confirme as taxas para apurar o saldo operacional.</small>
                  </div>
                  <Link className={s.botao} href={"/crm/financeiro?mes=" + mes + "&aba=extrato"}>
                    Conferir
                  </Link>
                </li>
              ) : null}
              {contas.semDono.length ? (
                <li>
                  <div>
                    <b>{contas.semDono.length} pagamentos sem parcela</b>
                    <small>Vincule ao contrato correspondente.</small>
                  </div>
                  <Link className={s.botao} href="/crm/caixa">
                    Vincular
                  </Link>
                </li>
              ) : null}
              {contas.desencontros.length ? (
                <li>
                  <div>
                    <b>{contas.desencontros.length} contratos sem distribuição completa</b>
                  </div>
                  <Link className={s.botao} href="/crm/caixa">
                    Revisar
                  </Link>
                </li>
              ) : null}
              {!fin.movimentosDisponiveis ? (
                <li>
                  <small>Registro de despesas e devoluções aguardando instalação do módulo.</small>
                </li>
              ) : null}
              {!r.taxasPendentes &&
              !contas.semDono.length &&
              !contas.desencontros.length &&
              fin.movimentosDisponiveis ? (
                <li>
                  <small>Nenhuma inconsistência detectada nestas verificações.</small>
                </li>
              ) : null}
            </ul>
          </section>
          <section className={s.painel}>
            <h2>Entregas por etapa</h2>
            <ul className={s.fila}>
              {[...estagios].map(([etapa, n]) => (
                <li key={etapa}>
                  <span>{etapa}</span>
                  <b>{n}</b>
                </li>
              ))}
            </ul>
            <div className={s.links}>
              <Link href="/crm/projetos">Ver entregas</Link>
              <Link href="/crm/producao">Abrir oficina</Link>
            </div>
          </section>
          <section className={s.painel}>
            <h2>Do resultado à decisão</h2>
            <p className={s.descricao}>
              Revise os números do mês e ajuste as iniciativas do próximo período.
            </p>
            <div className={s.links}>
              <Link href="/crm/metricas">Indicadores comerciais</Link>
              <Link href="/crm/marketing/resultados">Conteúdo</Link>
              <Link href={"/crm/plano?ano=" + ano}>Plano e metas</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
