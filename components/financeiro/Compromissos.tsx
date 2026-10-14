"use client";
import { useId, useRef, useState, type ReactNode } from "react";
import {
  agendarCompromisso,
  registrarDespesa,
  retificarDespesa,
  type Feito,
} from "@/app/(pt)/crm/acoes-financeiro";
import {
  CATEGORIAS,
  FREQUENCIAS,
  type Custo,
  reais,
} from "@/lib/financeiro/tipos";
import {
  saldoDaOcorrencia,
  type Ocorrencia,
} from "@/lib/financeiro/ocorrencias";
import type { Despesa } from "@/lib/sistema/indicadores";
import s from "@/components/sistema/sistema.module.css";
type Rodar = (acao: () => Promise<Feito>, depois?: (r: Feito) => void) => void;
export function Compromissos({
  custos,
  ocorrencias,
  despesas,
  hoje,
  rodar,
}: {
  custos: Custo[];
  ocorrencias: Ocorrencia[];
  despesas: Despesa[];
  hoje: string;
  rodar: Rodar;
}) {
  const [selecionado, setSelecionado] = useState("");
  return (
    <section className={s.painel}>
      <h2>Agenda de pagamentos</h2>
      <p className={s.descricao}>
        Defina o primeiro vencimento real. Pagamentos parciais reduzem o saldo
        da ocorrência; o equivalente mensal continua separado.
      </p>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget,
            d = new FormData(form);
          rodar(() =>
            agendarCompromisso(
              String(d.get("custo")),
              String(d.get("dia")),
              Number(d.get("quantas")),
            ),
          );
        }}
      >
        <label>
          Compromisso
          <select
            required
            name="custo"
            value={selecionado}
            onChange={(e) => setSelecionado(e.target.value)}
          >
            <option value="">Escolher custo previsto</option>
            {custos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} · {FREQUENCIAS[c.frequencia]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Primeiro vencimento
          <input required type="date" name="dia" />
        </label>
        <label>
          Ocorrências
          <input
            required
            type="number"
            min="1"
            max="24"
            defaultValue="1"
            name="quantas"
          />
        </label>
        <button className={s.botao}>Agendar</button>
      </form>
      <div className={s.rolagem}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th>Vencimento</th>
              <th>Compromisso</th>
              <th className={s.numero}>Saldo original</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {[...ocorrencias]
              .sort((a, b) => a.vence_em.localeCompare(b.vence_em))
              .map((o) => {
                const saldo = saldoDaOcorrencia(o, despesas),
                  c = custos.find((c) => c.id === o.custo_id);
                return (
                  <tr key={o.id}>
                    <td>
                      {o.vence_em}
                      {saldo > 0 && o.vence_em < hoje ? (
                        <small> · Vencido</small>
                      ) : null}
                    </td>
                    <td>{o.descricao}</td>
                    <td className={s.numero}>
                      {o.moeda === "USD"
                        ? "US$ " + saldo.toFixed(2)
                        : reais(saldo, true)}
                    </td>
                    <td>
                      {saldo <= 0 ? (
                        "Pago"
                      ) : (
                        <Janela titulo="Registrar pagamento">
                          <Pagamento
                            o={o}
                            custo={c}
                            saldo={saldo}
                            rodar={rodar}
                          />
                        </Janela>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {!ocorrencias.length ? (
        <p className={s.vazio}>
          Nenhum vencimento agendado. Os custos cadastrados continuam
          disponíveis como estimativa.
        </p>
      ) : null}
    </section>
  );
}
function Pagamento({
  o,
  custo,
  saldo,
  rodar,
}: {
  o: Ocorrencia;
  custo?: Custo;
  saldo: number;
  rodar: Rodar;
}) {
  const [request] = useState(() => crypto.randomUUID());
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  if (salvo) return <p role="status">Pagamento registrado.</p>;
  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget));
        rodar(
          () =>
            registrarDespesa({
              ...d,
              nome: o.descricao,
              categoria: custo?.categoria ?? "outro",
              custo_id: o.custo_id,
              ocorrencia_id: o.id,
              moeda_original: o.moeda,
              request_id: request,
            }),
          (r) => {
            if (r.ok) setSalvo(true);
            else setErro(r.erro);
          },
        );
      }}
    >
      <label>
        Pago em reais
        <input
          required
          type="number"
          step="0.01"
          min="0.01"
          name="valor"
          defaultValue={o.moeda === "BRL" ? saldo : undefined}
        />
      </label>
      {o.moeda === "USD" ? (
        <label>
          Valor original em dólar
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            name="valor_original"
            defaultValue={saldo}
          />
        </label>
      ) : null}
      <label>
        Data do pagamento
        <input required type="date" name="pago_em" />
      </label>
      <button className={s.botao}>Confirmar pagamento</button>
      {erro ? <p role="alert">{erro}</p> : null}
    </form>
  );
}
export function Retificar({
  despesa: d,
  rodar,
}: {
  despesa: Despesa;
  rodar: Rodar;
}) {
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  return (
    <Janela
      titulo="Corrigir despesa"
      rotulo="Corrigir"
      aoAbrir={() => {
        setSalvo(false);
        setErro("");
      }}
    >
      {salvo ? (
        <p role="status">Correção registrada no histórico.</p>
      ) : (
        <form
          className={s.form}
          onSubmit={(e) => {
            e.preventDefault();
            const valores = Object.fromEntries(new FormData(e.currentTarget));
            rodar(
              () =>
                retificarDespesa(
                  d.id,
                  {
                    ...valores,
                    valor_original:
                      d.moeda_original === "BRL"
                        ? valores.valor
                        : valores.valor_original,
                  },
                  String(valores.motivo),
                ),
              (r) => {
                if (r.ok) setSalvo(true);
                else setErro(r.erro);
              },
            );
          }}
        >
          <label>
            Nome
            <input name="nome" required maxLength={120} defaultValue={d.nome} />
          </label>
          <label>
            Valor em reais
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              name="valor"
              defaultValue={d.valor}
            />
          </label>
          <label>
            Data
            <input
              required
              type="date"
              name="pago_em"
              defaultValue={d.pago_em}
            />
          </label>
          <label>
            Categoria
            <select name="categoria" defaultValue={d.categoria}>
              {Object.entries(CATEGORIAS).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          {d.moeda_original === "USD" ? (
            <label>
              Valor original em dólar
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                name="valor_original"
                defaultValue={d.valor_original ?? ""}
              />
            </label>
          ) : null}
          <label>
            Notas
            <input name="notas" maxLength={1000} defaultValue={d.notas ?? ""} />
          </label>
          <label>
            Motivo da correção
            <input required minLength={5} maxLength={1000} name="motivo" />
          </label>
          <button className={s.botao}>Salvar correção com histórico</button>
        </form>
      )}
      {erro ? <p role="alert">{erro}</p> : null}
    </Janela>
  );
}
function Janela({
  titulo,
  rotulo,
  children,
  aoAbrir,
}: {
  titulo: string;
  rotulo?: string;
  children: ReactNode;
  aoAbrir?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  const [aberturas, setAberturas] = useState(0);
  return (
    <>
      <button
        type="button"
        className={s.botao}
        onClick={() => {
          aoAbrir?.();
          setAberturas((n) => n + 1);
          ref.current?.showModal();
        }}
      >
        {rotulo ?? titulo}
      </button>
      <dialog ref={ref} className={s.dialogo} aria-labelledby={id}>
        <div className={s.acoes}>
          <h2 id={id}>{titulo}</h2>
          <button
            type="button"
            className={s.botao}
            onClick={() => ref.current?.close()}
          >
            Fechar
          </button>
        </div>
        <div key={aberturas}>{children}</div>
      </dialog>
    </>
  );
}
