import Link from "next/link";
import { clienteServidor } from "@/lib/crm/supabase";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import { Cabecalho, Aviso } from "@/components/sistema/Painel";
import { dinheiroExato, quitacaoDoContrato } from "@/lib/crm/financeiro";
import { valorRetido } from "@/lib/sistema/indicadores";
import type { Contrato, Parcela, Recebimento } from "@/lib/crm/tipos";
import s from "@/components/sistema/sistema.module.css";
export const metadata = { title: "Clientes" };
export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const filtros = await searchParams;
  const b = await clienteServidor();
  const clientes = await lerTodos<{
    id: string;
    nome: string;
    whatsapp: string | null;
  }>(b, "crm_clientes", "id,nome,whatsapp").catch((e) => {
    if (tabelaAusente(e)) return null;
    throw e;
  });
  const [vinculos, contratos, parcelas, recebimentos, entregas] =
    clientes === null
      ? [[], [], [], [], []]
      : await Promise.all([
          lerTodos<{ id: string; cliente_id: string; lead_id: string }>(
            b,
            "crm_cliente_negocios",
          ),
          lerTodos<Contrato>(b, "crm_contratos"),
          lerTodos<Parcela>(b, "crm_parcelas"),
          lerTodos<Recebimento>(b, "crm_recebimentos"),
          lerTodos<{
            id: string;
            lead_id: string;
            contrato_id: string;
            entregue_em: string | null;
          }>(b, "crm_entregas", "id,lead_id,contrato_id,entregue_em"),
        ]);
  const ativos = contratos.filter((c) => c.status === "ativo");
  const semFicha = [
    ...new Set(
      ativos
        .filter((c) => !vinculos.some((v) => v.lead_id === c.lead_id))
        .map((c) => c.lead_id),
    ),
  ];
  const revisar = await lerTodos<{
    id: string;
    nome: string;
    empresa: string | null;
  }>(b, "crm_leads", "id,nome,empresa", undefined, { id: semFicha });
  const normal = (v: string) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const lista = (clientes ?? [])
    .map((c) => {
      const leads = new Set(
        vinculos.filter((v) => v.cliente_id === c.id).map((v) => v.lead_id),
      );
      const cs = ativos.filter((c) => leads.has(c.lead_id));
      const saldo = cs.reduce(
        (s, c) =>
          s +
          quitacaoDoContrato(
            c,
            parcelas
              .filter((p) => p.contrato_id === c.id)
              .map((p) => ({
                ...p,
                recebido: recebimentos
                  .filter((r) => r.parcela_id === p.id)
                  .reduce((s, r) => s + valorRetido(r), 0),
              })),
          ).saldo,
        0,
      );
      const abertas = entregas.filter(
        (e) =>
          leads.has(e.lead_id) &&
          !e.entregue_em &&
          cs.some((c) => c.id === e.contrato_id),
      ).length;
      return { ...c, saldo, abertas };
    })
    .filter(
      (c) =>
        (!filtros.q ||
          normal(c.nome + " " + (c.whatsapp ?? "")).includes(
            normal(filtros.q),
          )) &&
        (!filtros.estado ||
          (filtros.estado === "saldo"
            ? c.saldo > 0
            : filtros.estado === "entrega"
              ? c.abertas > 0
              : true)),
    );
  return (
    <div className={s.tela}>
      <Cabecalho
        titulo="Clientes"
        descricao="Um cadastro para acompanhar todos os negócios, contratos e entregas."
      >
        <Link href="/crm/pipeline" className={s.botao}>
          Abrir Funil
        </Link>
      </Cabecalho>
      <form className={s.form}>
        <label>
          Buscar cliente
          <input
            type="search"
            name="q"
            placeholder="Nome ou contato"
            defaultValue={filtros.q ?? ""}
          />
        </label>
        <label>
          Situação
          <select name="estado" defaultValue={filtros.estado ?? ""}>
            <option value="">Todos</option>
            <option value="saldo">Com saldo pendente</option>
            <option value="entrega">Com entrega aberta</option>
          </select>
        </label>
        <button className={s.botao}>Buscar</button>
      </form>
      {revisar.length ? (
        <section className={s.painel}>
          <h2>Contratos ativos sem ficha de cliente · {revisar.length}</h2>
          <p className={s.descricao}>
            Abra o negócio e escolha criar uma ficha ou vincular a um cliente
            existente.
          </p>
          <ul className={s.fila}>
            {revisar.map((n) => (
              <li key={n.id}>
                <b>{n.empresa || n.nome}</b>
                <Link className={s.botao} href={"/crm/lead/" + n.id}>
                  Revisar vínculo
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {clientes === null ? (
        <Aviso>
          A ficha integrada aguarda a instalação do módulo. Os cadastros atuais
          continuam no Funil.
        </Aviso>
      ) : (
        <section className={s.painel}>
          <h2>Cadastros do estúdio</h2>
          {lista.length ? (
            <ul className={s.fila}>
              {lista
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((c) => (
                  <li key={c.id}>
                    <div>
                      <b>{c.nome}</b>
                      <small>
                        {c.whatsapp ?? "Contato na ficha do negócio"}
                      </small>
                      <small>
                        {c.abertas} entrega(s) aberta(s) · saldo{" "}
                        {dinheiroExato(c.saldo)}
                      </small>
                    </div>
                    <Link className={s.botao} href={"/crm/clientes/" + c.id}>
                      Abrir cliente
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <p className={s.vazio}>
              Abra um negócio no Funil para criar ou vincular a ficha do
              cliente.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
