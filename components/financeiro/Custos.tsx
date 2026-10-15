"use client";
import {useState} from 'react';
import {apagarCusto,criarCusto,salvarCusto,type Feito} from '@/app/(pt)/crm/acoes-financeiro';
import {CATEGORIAS,FREQUENCIAS,porMes,nomeDoMes,reais,type Categoria,type Custo} from '@/lib/financeiro/tipos';
import f from '@/app/(pt)/crm/financeiro.module.css';
type Rodar=(acao:()=>Promise<Feito>,depois?:(r:Feito)=>void)=>void;
const ORDEM:Categoria[]=['trafego','ferramenta','pessoal','imposto','outro'];
export function Custos({
  custos,
  cotacao,
  rodar,
  hoje,
}: {
  custos: Custo[];
  cotacao: number | null;
  rodar: Rodar;
  hoje: string;
}) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const ativos = custos.filter((c) => !c.fim || c.fim.slice(0, 7) >= hoje);
  const parados = custos.filter((c) => c.fim && c.fim.slice(0, 7) < hoje);
  const totalMes = ativos
    .filter((c) => c.frequencia !== "unico")
    .reduce((a, c) => a + (porMes(c, cotacao) ?? 0), 0);

  return (
    <div className={f.custos}>
      <div
        className={f.rolagem}
        role="region"
        aria-label="Custos do estúdio"
        tabIndex={0}
      >
        <table className={f.tabela}>
          <thead>
            <tr>
              <th>O quê</th>
              <th>Tipo</th>
              <th>Quanto</th>
              <th>Por mês</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {ativos.map((c) =>
              editando === c.id ? (
                <tr key={c.id}>
                  <td colSpan={5}>
                    <FormCusto
                      custo={c}
                      hoje={hoje}
                      salvar={(campos) =>
                        rodar(
                          () => salvarCusto(c.id, campos),
                          (r) => r.ok && setEditando(null),
                        )
                      }
                      cancelar={() => setEditando(null)}
                      apagar={() => rodar(() => apagarCusto(c.id))}
                    />
                  </td>
                </tr>
              ) : (
                /* editável direto na linha (30/09: "tem que ser um pouco mais
                 editável"): muda e salva ao sair do campo. "Mais" abre o resto
                 (desde, até, estimativa, nota) e o apagar. */
                <tr key={c.id} className={f.linhaViva}>
                  <td>
                    <input
                      className={f.celNome}
                      defaultValue={c.nome}
                      aria-label="Nome do custo"
                      onBlur={(e) => {
                        if (
                          e.target.value.trim() &&
                          e.target.value.trim() !== c.nome
                        )
                          rodar(() =>
                            salvarCusto(c.id, { nome: e.target.value }),
                          );
                      }}
                    />
                    {c.estimado ? (
                      <em className={f.estimado}>estimativa</em>
                    ) : null}
                    {c.nota ? (
                      <span className={f.notaCusto}>{c.nota}</span>
                    ) : null}
                  </td>
                  <td>
                    <select
                      className={f.celSel}
                      value={c.categoria}
                      aria-label="Tipo do custo"
                      onChange={(e) =>
                        rodar(() =>
                          salvarCusto(c.id, { categoria: e.target.value }),
                        )
                      }
                    >
                      {ORDEM.map((k) => (
                        <option key={k} value={k}>
                          {CATEGORIAS[k].nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={f.celValor}>
                      <select
                        value={c.moeda}
                        aria-label="Moeda"
                        onChange={(e) =>
                          rodar(() =>
                            salvarCusto(c.id, { moeda: e.target.value }),
                          )
                        }
                      >
                        <option value="BRL">R$</option>
                        <option value="USD">US$</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        defaultValue={c.valor}
                        aria-label="Valor"
                        onBlur={(e) => {
                          if (
                            Number(e.target.value) > 0 &&
                            Number(e.target.value) !== c.valor
                          )
                            rodar(() =>
                              salvarCusto(c.id, { valor: e.target.value }),
                            );
                        }}
                      />
                      <select
                        value={c.frequencia}
                        aria-label="Frequência"
                        onChange={(e) =>
                          rodar(() =>
                            salvarCusto(c.id, { frequencia: e.target.value }),
                          )
                        }
                      >
                        {Object.entries(FREQUENCIAS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </span>
                  </td>
                  <td className={f.porMes}>
                    {c.frequencia === "unico"
                      ? "uma vez"
                      : c.moeda === "USD" && !cotacao
                        ? "sem cotação"
                        : reais(porMes(c, cotacao) ?? 0)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={f.mini}
                      onClick={() => setEditando(c.id)}
                    >
                      Mais
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Previsão mensal conhecida, hoje</td>
              <td className={f.porMes}>
                <b>{reais(totalMes)}</b>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {novo ? (
        <FormCusto
          hoje={hoje}
          salvar={(campos) =>
            rodar(
              () => criarCusto(campos),
              (r) => r.ok && setNovo(false),
            )
          }
          cancelar={() => setNovo(false)}
        />
      ) : (
        <button type="button" className={f.btn} onClick={() => setNovo(true)}>
          Cadastrar apenas uma estimativa
        </button>
      )}

      {parados.length ? (
        <p className={f.parados}>
          Custos que já pararam:{" "}
          {parados
            .map((c) => `${c.nome} (até ${nomeDoMes(c.fim!.slice(0, 7))})`)
            .join(", ")}
          .
        </p>
      ) : null}
    </div>
  );
}

function FormCusto({
  custo,
  hoje,
  salvar,
  cancelar,
  apagar,
}: {
  custo?: Custo;
  hoje: string;
  salvar: (campos: Record<string, unknown>) => void;
  cancelar: () => void;
  apagar?: () => void;
}) {
  return (
    <form
      className={f.form}
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        salvar({
          nome: d.get("nome"),
          categoria: d.get("categoria"),
          valor: d.get("valor"),
          moeda: d.get("moeda"),
          frequencia: d.get("frequencia"),
          inicio: d.get("inicio"),
          fim: d.get("fim") ?? "",
          estimado: d.get("estimado") === "on",
          nota: d.get("nota"),
        });
      }}
    >
      <label className={f.largo}>
        O quê
        <input
          name="nome"
          defaultValue={custo?.nome}
          placeholder="Ex.: Claude, Meta Ads, contador"
          maxLength={80}
          required
        />
      </label>
      <label>
        Tipo
        <select
          name="categoria"
          defaultValue={custo?.categoria ?? "ferramenta"}
        >
          {ORDEM.map((k) => (
            <option key={k} value={k}>
              {CATEGORIAS[k].nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Valor
        <input
          name="valor"
          type="number"
          min={0}
          step="any"
          defaultValue={custo?.valor}
          required
        />
      </label>
      <label>
        Moeda
        <select name="moeda" defaultValue={custo?.moeda ?? "BRL"}>
          <option value="BRL">reais</option>
          <option value="USD">dólar</option>
        </select>
      </label>
      <label>
        Frequência
        <select name="frequencia" defaultValue={custo?.frequencia ?? "mensal"}>
          {Object.entries(FREQUENCIAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Desde
        <input
          name="inicio"
          type="month"
          defaultValue={custo?.inicio.slice(0, 7) ?? hoje}
          required
        />
      </label>
      <label>
        Até (se parou)
        <input
          name="fim"
          type="month"
          defaultValue={custo?.fim?.slice(0, 7) ?? ""}
        />
      </label>
      <label className={f.check}>
        <input
          name="estimado"
          type="checkbox"
          defaultChecked={custo?.estimado}
        />{" "}
        é uma estimativa
      </label>
      <label className={f.largo}>
        Nota
        <input
          name="nota"
          defaultValue={custo?.nota ?? ""}
          placeholder="Opcional: de onde veio o número"
          maxLength={200}
        />
      </label>
      <div className={f.formPe}>
        <button type="submit" className={f.btn}>
          {custo ? "Salvar" : "Adicionar"}
        </button>
        <button type="button" className={f.mini} onClick={cancelar}>
          Cancelar
        </button>
        {apagar ? (
          <button type="button" className={f.mini} onClick={apagar}>
            Apagar
          </button>
        ) : null}
      </div>
    </form>
  );
}
