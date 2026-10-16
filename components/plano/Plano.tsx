"use client";

/* ============================================================
   O PLANO NA TELA

   Objetivo em foco e ações reais primeiro. A Montanha distingue conquistas
   confirmadas de progresso provisório. Configurações e revisão mensal
   ficam em seções recolhidas, abertas também pelos atalhos.
   ============================================================ */

import Link from "next/link";
import { ResumoPlano } from "./ResumoPlano";
import { leituraMeta, notaDoMes, type OperacaoPlano } from "@/lib/plano/resumo";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  apagarMeta,
  apagarProjeto,
  criarMeta,
  criarProjeto,
  fecharRmr,
  lancar,
  salvarCiclo,
  salvarMeta,
  salvarProjeto,
  type Feito,
} from "@/app/(pt)/crm/acoes-plano";
import {
  FAIXAS,
  FONTES,
  HORIZONTES,
  MESES,
  MESES_LONGOS,
  PRIORIDADES,
  faixa,
  formatar,
  notaDoPainel,
  pct,
  percentual,
  percentualNoAno,
  type Ciclo,
  type Degrau,
  type Fonte,
  type Meta,
  type Prioridade,
  type Projeto,
  type Rmr,
  type Valores,
} from "@/lib/plano/tipos";
import { Subida } from "./Subida";
import p from "@/app/(pt)/crm/plano.module.css";

type Props = {
  ano: number;
  ate: number;
  hoje: string;
  ateFechado: number;
  operacao: OperacaoPlano | null;
  ciclo: Ciclo | null;
  projetos: Projeto[];
  metas: Meta[];
  valores: Valores;
  rmrs: Rmr[];
  recebido: Partial<Record<number, number>>;
  vendido?: Partial<Record<number, number>>;
  movimentosDisponiveis?: boolean;
};

const ModuloIntegrado = createContext(false);
const ORDEM_P: Record<Prioridade, number> = { P1: 0, P2: 1, P3: 2 };
const FAIXA_CLASSE = {
  bateu: p.fBateu,
  perto: p.fPerto,
  atencao: p.fAtencao,
  fora: p.fFora,
  sem: p.fSem,
};

export function Plano({
  ano,
  ate,
  hoje,
  ateFechado,
  operacao,
  ciclo,
  projetos,
  metas,
  valores,
  rmrs,
  recebido,
  vendido = {},
  movimentosDisponiveis = false,
}: Props) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [premios, setPremios] = useState(false);

  function rodar(acao: () => Promise<Feito>, depois?: (r: Feito) => void) {
    setSalvo(false);
    comecar(async () => {
      try {
        const r = await acao();
        if (!r.ok) setAviso(r.erro);
        else { setAviso(null); setSalvo(true); router.refresh(); }
        depois?.(r);
      } catch {
        setAviso("Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.");
      }
    });
  }

  useEffect(() => {
    const abrir = (hash: string) => {
      let id: string;
      try { id = decodeURIComponent(hash.replace(/^#/, "")); } catch { return; }
      const alvo = document.getElementById(id);
      if (!alvo) return;
      for (let pai = alvo.parentElement; pai; pai = pai.parentElement) if (pai instanceof HTMLDetailsElement) pai.open = true;
      requestAnimationFrame(() => alvo.scrollIntoView({ block: "start", behavior: "instant" }));
    };
    const mudar = () => abrir(window.location.hash);
    const clicar = (e: MouseEvent) => { const a = e.target instanceof Element ? e.target.closest("a") : null; if (a?.getAttribute("href")?.startsWith("#")) abrir(a.hash); };
    mudar(); window.addEventListener("hashchange", mudar); document.addEventListener("click", clicar);
    return () => { window.removeEventListener("hashchange", mudar); document.removeEventListener("click", clicar); };
  }, []);

  const ativos = projetos
    .filter((x) => x.status !== "encerrado")
    .sort(
      (a, b) =>
        ORDEM_P[a.prioridade] - ORDEM_P[b.prioridade] ||
        (a.status === "pausado" ? 1 : 0) - (b.status === "pausado" ? 1 : 0) ||
        a.ordem - b.ordem,
    );
  const nao = projetos.filter((x) => x.status === "encerrado");


  return (
    <ModuloIntegrado.Provider value={movimentosDisponiveis}>
      <div className={`${p.tela} ${pendente ? p.ocupado : ""}`}>
        <header className={p.cabeca}>
          <div>
            <h1>
              Plano<i className={p.ponto}>.</i>
            </h1>
            <p className={p.voz}>
              Um objetivo claro, o resultado real e o próximo passo.
            </p>
          </div>
          <nav className={p.anos} aria-label="Trocar de ano">
            {ano > 2020 && <Link href={`/crm/plano?ano=${ano - 1}`}>{ano - 1}</Link>}
            <b>{ano}</b>
            {ano < 2100 && <Link href={`/crm/plano?ano=${ano + 1}`}>{ano + 1}</Link>}
            {ano !== Number(hoje.slice(0, 4)) && <Link href="/crm/plano">Ano atual</Link>}
          </nav>
        </header>

        {aviso ? <p role="alert" className={p.erro}>{aviso}</p> : null}
        <p className={p.salvamento} role="status">{pendente ? "Salvando alterações…" : salvo ? "Alterações salvas." : "Os dados automáticos vêm das áreas de origem."}</p>
        <nav className={p.atalhos} aria-label="Navegar pelo Plano"><a href="#objetivo">Objetivo e ações</a><a href="#montanha">Montanha</a><a href="#metas">Ajustar metas</a><a href="#rmr">Revisão mensal</a></nav>
        <fieldset disabled={pendente} className={p.conteudo}>

        <section id="objetivo"><ResumoPlano ano={ano} ate={ate} metas={metas} projetos={projetos} valores={valores} operacao={operacao} /></section>
        <section className={p.montanhaSecao} id="montanha">
          <div className={p.montanhaCab}><div><h2>A Montanha</h2><p>Marcos de crescimento, acompanhados pelo recebido no Caixa.</p></div><button type="button" className={p.mini} onClick={() => setPremios(!premios)} aria-expanded={premios}>{premios ? "Fechar editor" : "Editar marcos"}</button></div>
          <Subida ano={ano} ate={ate} ateFechado={ateFechado} degraus={ciclo?.premios ?? []} recebido={recebido} vendido={vendido} visao={ciclo?.visao ?? null} horizonte={ciclo?.horizonte ?? null} />
          {premios && <EditarPremios ano={ano} ciclo={ciclo} rodar={rodar} fechar={() => setPremios(false)} />}
        </section>
        <details className={p.configuracao}>
          <summary>Ajustar metas, iniciativas e rumo do estúdio</summary>
          <p className={p.voz}>Defina o que quer alcançar e como medir. As mudanças nos campos de texto são salvas ao sair deles; Escape cancela a edição.</p>
        {/* ---------- 1. o rumo ---------- */}
        <section className={p.andar} id="rumo">
          <h2>
            <i className={p.num}>1</i> O rumo<i className={p.ponto}>.</i>
          </h2>
          <p className={p.voz}>
            Para onde o estúdio vai daqui a 3 a 5 anos. Quando aparecer uma
            oportunidade boa, é aqui que se decide se ela entra.
          </p>
          <div className={p.estrategico}>
            <CampoTexto
              rotulo="A missão"
              valor={ciclo?.missao ?? ""}
              dica="Por que o estúdio existe, numa frase."
              linhas={3}
              salvar={(v) => rodar(() => salvarCiclo(ano, { missao: v }))}
            />
            <div className={p.visao}>
              <CampoTexto
                rotulo="A visão (o cume da montanha)"
                valor={ciclo?.visao ?? ""}
                dica="Como o estúdio está no ano do horizonte: onde, com quem, faturando quanto."
                linhas={3}
                salvar={(v) => rodar(() => salvarCiclo(ano, { visao: v }))}
              />
              <label className={p.horizonte}>
                <span>no ano de</span>
                <input
                  type="number"
                  min={ano}
                  max={ano + 10}
                  defaultValue={ciclo?.horizonte ?? ""}
                  placeholder={String(ano + 3)}
                  onKeyDown={(e) => cancelarEdicao(e, ciclo?.horizonte)}
                  onBlur={(e) => {
                    if (String(ciclo?.horizonte ?? "") !== e.target.value)
                      rodar(() =>
                        salvarCiclo(ano, { horizonte: e.target.value || null }),
                      );
                  }}
                />
              </label>
            </div>
            <Projecoes ano={ano} ciclo={ciclo} rodar={rodar} />
          </div>
        </section>

        {/* ---------- 2. os projetos ---------- */}
        <section className={p.andar} id="projetos">
          <h2>
            <i className={p.num}>2</i> As iniciativas
            <i className={p.ponto}>.</i>
          </h2>
          <p className={p.voz}>
            A lista fechada do que leva a sua energia este ano. P1 é onde vai
            quase tudo; P3 anda devagar de propósito. E o que você decidir não
            fazer vira um &ldquo;não&rdquo; escrito, para não voltar à mesa todo
            mês.
          </p>
          <ul className={p.projetos}>
            {ativos.map((x) => (
              <CartaoProjeto
                key={x.id}
                x={x}
                metas={metas.filter((m) => m.projeto_id === x.id)}
                valores={valores}
                ate={ate}
                rodar={rodar}
              />
            ))}
            <li className={p.novoProjeto}>
              <NovoProjeto rodar={rodar} />
            </li>
          </ul>
          {nao.length ? (
            <div className={p.naos}>
              <p className={p.rotulo}>Os nãos que você já disse</p>
              <ul>
                {nao.map((x) => (
                  <li key={x.id}>
                    <s>{x.nome}</s>
                    {x.motivo_encerrado ? <em>{x.motivo_encerrado}</em> : null}
                    <button
                      type="button"
                      className={p.mini}
                      onClick={() =>
                        rodar(() => salvarProjeto(x.id, { status: "ativo" }))
                      }
                    >
                      Reabrir
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* ---------- 3. as metas ---------- */}
        <section className={p.andar} id="metas">
          <h2>
            <i className={p.num}>3</i> As metas de {ano}
            <i className={p.ponto}>.</i>
          </h2>
          <p className={p.voz}>
            Escolha um resultado, um alvo e a fonte do número. A importância define quanto cada meta conta na nota; os valores são proporcionais e não precisam somar 100. Importância zero deixa a meta só para acompanhamento.
            {metas.length > 7 ? (
              <span className={p.pesoFalta}>
                {" "}
                São {metas.length} metas. Priorize as que realmente mudam o resultado.
              </span>
            ) : null}
          </p>
          <ul className={p.legenda} aria-label="O que cada cor quer dizer">
            <li className={p.fBateu}>100% ou mais: bateu</li>
            <li className={p.fPerto}>80 a 99%: perto</li>
            <li className={p.fAtencao}>60 a 79%: atenção</li>
            <li className={p.fFora}>abaixo de 60%: fora da linha</li>
          </ul>
          {ativos.length === 0 ? (
            <div className={p.vazio}>
              Crie um projeto no passo 2 para dar metas a ele.
            </div>
          ) : (
            <div className={p.painel}>
              <div className={p.painelCab} aria-hidden>
                <span>Meta</span>
                <span>Importância</span>
                {MESES.map((m, i) => (
                  <span key={m} className={i + 1 === ate ? p.mesAtual : ""}>
                    {m}
                  </span>
                ))}
                <span>No ano</span>
              </div>
              {projetos.filter((x) => metas.some((m) => m.projeto_id === x.id) || x.status !== "encerrado").map((x) => (
                <div key={x.id} className={p.grupo}>
                  <div className={p.grupoCab}>
                    <b>{x.prioridade}</b> {x.nome}
                    {x.status === "pausado" ? <em> (pausado)</em> : null}
                    {x.status === "encerrado" ? <em> (iniciativa encerrada)</em> : null}
                  </div>
                  {metas
                    .filter((m) => m.projeto_id === x.id)
                    .map((m) => (
                      <LinhaMeta
                        key={m.id}
                        m={m}
                        v={valores[m.id] ?? {}}
                        ate={ate}
                        rodar={rodar}
                      />
                    ))}
                  <NovaMeta projetoId={x.id} ano={ano} rodar={rodar} />
                </div>
              ))}
            </div>
          )}
        </section>

        </details>
        {/* ---------- 4. a RMR ---------- */}
        {ate ? (
          <details className={p.configuracao}><summary>Revisão mensal: medir, entender e decidir</summary>
          <RmrDoMes
            ano={ano}
            ate={ate}
            ateFechado={ateFechado}
            metas={metas}
            valores={valores}
            rmrs={rmrs}
            projetos={projetos}
            rodar={rodar}
          />
          </details>
        ) : null}
        </fieldset>
      </div>
    </ModuloIntegrado.Provider>
  );
}

type Rodar = (acao: () => Promise<Feito>, depois?: (r: Feito) => void) => void;

function cancelarEdicao(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, valor: string | number | null | undefined) {
  if (e.key !== "Escape") return;
  e.preventDefault();
  e.currentTarget.value = String(valor ?? "");
  e.currentTarget.blur();
}

/* ---------- peças ---------- */

function CampoTexto({
  rotulo,
  valor,
  dica,
  linhas,
  salvar,
}: {
  rotulo: string;
  valor: string;
  dica: string;
  linhas: number;
  salvar: (v: string) => void;
}) {
  return (
    <label className={p.campo}>
      <span className={p.rotulo}>{rotulo}</span>
      <textarea
        rows={linhas}
        defaultValue={valor}
        placeholder={dica}
        onKeyDown={(e) => cancelarEdicao(e, valor)}
        onBlur={(e) => {
          if (e.target.value.trim() !== valor.trim()) salvar(e.target.value);
        }}
      />
    </label>
  );
}

/* O editor dos prêmios em degraus: abre pelo placar. A leitura deles é a
   montanha (components/plano/Subida.tsx). */
function EditarPremios({
  ano,
  ciclo,
  rodar,
  fechar,
}: {
  ano: number;
  ciclo: Ciclo | null;
  rodar: Rodar;
  fechar: () => void;
}) {
  const salvos = [...(ciclo?.premios ?? [])].sort(
    (a, b) => a.patamar - b.patamar || a.meses - b.meses,
  );
  const [rascunho, setRascunho] = useState<Degrau[]>(
    salvos.length ? salvos : [{ nome: "", patamar: 0, meses: 1 }],
  );
  const mudar = (i: number, parte: Partial<Degrau>) =>
    setRascunho(rascunho.map((d, j) => (j === i ? { ...d, ...parte } : d)));
  return (
    <form className={p.editaPremios} onSubmit={(e) => { e.preventDefault(); rodar(() => salvarCiclo(ano, { premios: rascunho }), (r) => r.ok && fechar()); }}>
      <p className={p.voz}>
        Cada marco pede um valor recebido por mês. A confirmação usa somente meses que já terminaram; um mês em andamento aparece como provisório. Para contratar equipe, por exemplo, você pode exigir vários meses seguidos.
      </p>
      <div className={p.degrausForm}>
        {rascunho.map((d, i) => (
          <div key={i} className={p.degrauEdita}>
            <input
              value={d.nome}
              onChange={(e) => mudar(i, { nome: e.target.value })}
              placeholder="O prêmio"
              maxLength={80}
              required
              aria-label="Prêmio"
            />
            <label>
              R${" "}
              <input
                type="number"
                min={0.01}
                step="0.01"
                required
                value={d.patamar || ""}
                onChange={(e) => mudar(i, { patamar: Number(e.target.value) })}
                aria-label="Entrou no Caixa no mês"
              />{" "}
              no mês
            </label>
            <label>
              por{" "}
              <input
                type="number"
                min={1}
                max={12}
                required
                value={d.meses}
                onChange={(e) =>
                  mudar(i, { meses: Number(e.target.value) })
                }
                aria-label="Meses seguidos"
              />
              {d.meses > 1 ? " meses seguidos" : " mês"}
            </label>
            <button
              type="button"
              className={p.mini}
              onClick={() => setRascunho(rascunho.filter((_, j) => j !== i))}
            >
              Tirar
            </button>
          </div>
        ))}
      </div>
      <div className={p.degrausPe}>
        <button
          type="button"
          className={p.mini}
          disabled={rascunho.length >= 12}
          onClick={() =>
            setRascunho([...rascunho, { nome: "", patamar: 0, meses: 1 }])
          }
        >
          Mais um prêmio
        </button>
        <button
          type="submit"
          className={p.btn}
        >
          Salvar os prêmios
        </button>
        <button type="button" className={p.mini} onClick={fechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Projecoes({
  ano,
  ciclo,
  rodar,
}: {
  ano: number;
  ciclo: Ciclo | null;
  rodar: Rodar;
}) {
  const base = ciclo?.projecoes?.length
    ? ciclo.projecoes
    : [0, 1, 2].map((k) => ({ ano: ano + k, faturamento: null, caixa: null }));
  const [linhas, setLinhas] = useState(base);
  const salvar = (novas: typeof linhas) => {
    setLinhas(novas);
    rodar(() => salvarCiclo(ano, { projecoes: novas }));
  };
  const num = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className={p.projecoes}>
      <span className={p.rotulo}>Projeções por ano</span>
      <table>
        <thead>
          <tr>
            <th>Ano</th>
            <th>Faturamento (R$)</th>
            <th>Resultado desejado (R$)</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={`${l.ano}-${i}`}>
              <td>{l.ano}</td>
              {(["faturamento", "caixa"] as const).map((k) => (
                <td key={k}>
                  <input
                    type="number"
                    min={0}
                    defaultValue={l[k] ?? ""}
                    placeholder="·"
                    aria-label={`${k === "faturamento" ? "Faturamento" : "Resultado"} projetado de ${l.ano}`}
                    onKeyDown={(e) => cancelarEdicao(e, l[k])}
                    onBlur={(e) => {
                      if (String(l[k] ?? "") === e.target.value) return;
                      salvar(
                        linhas.map((x, j) =>
                          j === i ? { ...x, [k]: num(e.target.value) } : x,
                        ),
                      );
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {linhas.length < 6 ? (
        <button
          type="button"
          className={p.mini}
          onClick={() =>
            salvar([
              ...linhas,
              {
                ano: (linhas.at(-1)?.ano ?? ano) + 1,
                faturamento: null,
                caixa: null,
              },
            ])
          }
        >
          + um ano
        </button>
      ) : null}
    </div>
  );
}

function NovoProjeto({ rodar }: { rodar: Rodar }) {
  const [nome, setNome] = useState("");
  return (
    <form
      className={p.linhaForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!nome.trim()) return;
        rodar(
          () => criarProjeto(nome),
          (r) => r.ok && setNome(""),
        );
      }}
    >
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nova iniciativa (ex.: Vitrines para lojas pequenas)"
        maxLength={80}
      />
      <button type="submit" className={p.btn}>
        Criar iniciativa
      </button>
    </form>
  );
}

function CartaoProjeto({
  x,
  metas,
  valores,
  ate,
  rodar,
}: {
  x: Projeto;
  metas: Meta[];
  valores: Valores;
  ate: number;
  rodar: Rodar;
}) {
  const [encerrando, setEncerrando] = useState(false);
  const nota = ate ? notaDoPainel(metas, valores, ate) : null;
  return (
    <li
      className={`${p.projeto} ${p[x.prioridade]} ${x.status === "pausado" ? p.pausado : ""}`}
    >
      <div className={p.projetoCab}>
        <select
          className={p.prio}
          value={x.prioridade}
          onChange={(e) =>
            rodar(() => salvarProjeto(x.id, { prioridade: e.target.value }))
          }
          aria-label="Prioridade"
          title={PRIORIDADES[x.prioridade].faz}
        >
          {(Object.keys(PRIORIDADES) as Prioridade[]).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          className={p.projetoNome}
          defaultValue={x.nome}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value.trim() !== x.nome)
              rodar(() => salvarProjeto(x.id, { nome: e.target.value }));
          }}
          aria-label="Nome do projeto"
          onKeyDown={(e) => cancelarEdicao(e, x.nome)}
        />
        <span
          className={`${p.notaMini} ${FAIXA_CLASSE[faixa(nota)]}`}
          title="A nota das metas deste projeto no ano"
        >
          {pct(nota)}
        </span>
      </div>
      <textarea
        className={p.porque}
        rows={2}
        defaultValue={x.porque ?? ""}
        aria-label={`Objetivo da iniciativa ${x.nome}`}
        onKeyDown={(e) => cancelarEdicao(e, x.porque)}
        placeholder="Por que este projeto existe e o que ele tem a ver com a visão."
        onBlur={(e) => {
          if (e.target.value.trim() !== (x.porque ?? "").trim())
            rodar(() => salvarProjeto(x.id, { porque: e.target.value }));
        }}
      />
      <div className={p.projetoPe}>
        <label>
          horizonte{" "}
          <select
            value={x.horizonte}
            onChange={(e) =>
              rodar(() => salvarProjeto(x.id, { horizonte: e.target.value }))
            }
          >
            {Object.entries(HORIZONTES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <span className={p.qtd}>
          {metas.length} {metas.length === 1 ? "meta" : "metas"}
        </span>
        <button
          type="button"
          className={p.mini}
          onClick={() =>
            rodar(() =>
              salvarProjeto(x.id, {
                status: x.status === "pausado" ? "ativo" : "pausado",
              }),
            )
          }
        >
          {x.status === "pausado" ? "Retomar" : "Pausar"}
        </button>
        <button
          type="button"
          className={p.mini}
          onClick={() => setEncerrando(!encerrando)}
        >
          Dizer não
        </button>
      </div>
      {encerrando ? (
        <form
          className={p.linhaForm}
          onSubmit={(e) => {
            e.preventDefault();
            const motivo = String(
              new FormData(e.currentTarget).get("motivo") ?? "",
            );
            rodar(() =>
              salvarProjeto(x.id, {
                status: "encerrado",
                motivo_encerrado: motivo,
              }),
            );
          }}
        >
          <input
            name="motivo"
            placeholder="Por que não (fica escrito para não voltar)"
            maxLength={300}
          />
          <button type="submit" className={p.btn}>
            Encerrar
          </button>
          {metas.length === 0 ? (
            <button
              type="button"
              className={p.mini}
              onClick={() => rodar(() => apagarProjeto(x.id))}
            >
              Apagar de vez
            </button>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}

function LinhaMeta({
  m,
  v,
  ate,
  rodar,
}: {
  m: Meta;
  v: Partial<Record<number, number>>;
  ate: number;
  rodar: Rodar;
}) {
  const [editando, setEditando] = useState(false);
  const noAno = ate ? percentualNoAno(m, v, ate) : null;
  return (
    <div className={p.meta}>
      <div className={p.metaNome}>
        <button
          type="button"
          className={p.metaTitulo}
          onClick={() => setEditando(!editando)}
          aria-expanded={editando}
        >
          {m.titulo}
        </button>
        <span className={p.metaAlvo}>
          {formatar(m.alvo, m.unidade)}{" "}
          {m.periodo === "mes" ? "por mês" : "no ano"}
          {m.fonte !== "manual" ? (
            <i title={FONTES[m.fonte].ajuda}>, medida sozinha</i>
          ) : null}
        </span>
      </div>
      <input
        className={p.peso}
        type="number"
        min={0}
        max={100}
        defaultValue={m.peso}
        aria-label={`Importância de ${m.titulo}`}
        onKeyDown={(e) => cancelarEdicao(e, m.peso)}
        onBlur={(e) => {
          if (Number(e.target.value) !== m.peso)
            rodar(() => salvarMeta(m.id, { peso: e.target.value }));
        }}
      />
      {MESES.map((nome, i) => {
        const mes = i + 1;
        const pc = mes <= ate ? percentual(m, v, mes) : null;
        const f = mes <= ate ? faixa(pc) : "sem";
        return (
          <span
            key={nome}
            className={`${p.celula} ${mes <= ate ? FAIXA_CLASSE[f] : p.futuro}`}
            title={
              mes <= ate
                ? `${MESES_LONGOS[i]}: ${formatar(leituraMeta(m, v, mes).realizado, m.unidade)} ${m.periodo === "ano" ? "acumulados" : "no mês"} (${pct(pc)}, ${FAIXAS[f]})`
                : MESES_LONGOS[i]
            }
          >
            {mes <= ate && v[mes] !== undefined ? pct(pc) : ""}
          </span>
        );
      })}
      <b className={`${p.noAno} ${FAIXA_CLASSE[faixa(noAno)]}`}>{pct(noAno)}</b>
      {editando ? (
        <EditarMeta m={m} rodar={rodar} fechar={() => setEditando(false)} />
      ) : null}
    </div>
  );
}

function CamposMeta({ m }: { m?: Meta }) {
  const integrado = useContext(ModuloIntegrado);
  const [fonte, setFonte] = useState<Fonte>(m?.fonte ?? "manual");
  const unidadeFixa = FONTES[fonte].unidade;
  return (
    <>
      <input
        name="titulo"
        defaultValue={m?.titulo}
        placeholder="A meta (ex.: Vitrines entregues)"
        maxLength={120}
        aria-label="Nome da meta"
        required
      />
      <select
        name="fonte"
        value={fonte}
        onChange={(e) => setFonte(e.target.value as Fonte)}
        aria-label="Como se mede"
      >
        {(Object.keys(FONTES) as Fonte[])
          .filter(
            (k) => integrado || m?.fonte === k || !["despesas", "entregas", "saldo"].includes(k),
          )
          .map((k) => (
            <option key={k} value={k}>
              {FONTES[k].nome}
            </option>
          ))}
      </select>
      <input
        name="alvo"
        type="number"
        min={0.01}
        step="any"
        defaultValue={m?.alvo}
        placeholder="alvo"
        required
        aria-label="Alvo"
      />
      {unidadeFixa ? (
        <input type="hidden" name="unidade" value={unidadeFixa} />
      ) : (
        <select
          name="unidade"
          defaultValue={m?.unidade ?? "un"}
          aria-label="Unidade"
        >
          <option value="un">un</option>
          <option value="R$">R$</option>
          <option value="%">%</option>
        </select>
      )}
      {integrado ? (
        <select
          name="direcao"
          key={fonte}
          defaultValue={
            m?.fonte === fonte ? m.direcao ?? "aumentar" : fonte === "despesas" ? "reduzir" : "aumentar"
          }
          aria-label="Direção da meta"
        >
          <option value="aumentar">Aumentar até o alvo</option>
          <option value="reduzir">Reduzir até o limite</option>
        </select>
      ) : null}
      <select
        name="periodo"
        defaultValue={m?.periodo ?? "mes"}
        aria-label="Período do alvo"
      >
        <option value="mes">por mês</option>
        <option value="ano">no ano</option>
      </select>
      <input
        name="peso"
        type="number"
        min={0}
        max={100}
        defaultValue={m?.peso ?? 10}
        aria-label="Importância na nota"
        title="Importância relativa; zero deixa a meta fora da nota"
      />
    </>
  );
}

function lerForm(f: HTMLFormElement) {
  const d = new FormData(f);
  return Object.fromEntries(
    ["titulo", "fonte", "alvo", "unidade", "periodo", "peso", "direcao"].filter((k) => d.has(k)).map(
      (k) => [k, d.get(k)],
    ),
  );
}

function NovaMeta({
  projetoId,
  ano,
  rodar,
}: {
  projetoId: string;
  ano: number;
  rodar: Rodar;
}) {
  const [aberta, setAberta] = useState(false);
  if (!aberta) {
    return (
      <button
        type="button"
        className={p.addMeta}
        onClick={() => setAberta(true)}
      >
        + meta neste projeto
      </button>
    );
  }
  return (
    <form
      className={p.formMeta}
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        rodar(
          () => criarMeta(projetoId, ano, lerForm(f)),
          (r) => r.ok && setAberta(false),
        );
      }}
    >
      <CamposMeta />
      <button type="submit" className={p.btn}>
        Criar meta
      </button>
      <button type="button" className={p.mini} onClick={() => setAberta(false)}>
        Cancelar
      </button>
    </form>
  );
}

function EditarMeta({
  m,
  rodar,
  fechar,
}: {
  m: Meta;
  rodar: Rodar;
  fechar: () => void;
}) {
  return (
    <form
      className={p.formMeta}
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        rodar(
          () => salvarMeta(m.id, lerForm(f)),
          (r) => r.ok && fechar(),
        );
      }}
    >
      <CamposMeta m={m} />
      <button type="submit" className={p.btn}>
        Salvar
      </button>
      <button type="button" className={p.mini} onClick={fechar}>Cancelar edição</button>
      <button
        type="button"
        className={p.mini}
        onClick={() => { if (window.confirm(`Apagar a meta "${m.titulo}" e todas as suas medições?`)) rodar(() => apagarMeta(m.id)); }}
      >
        Apagar meta
      </button>
    </form>
  );
}

function RmrDoMes({
  ano,
  ate,
  ateFechado,
  metas,
  valores,
  rmrs,
  projetos,
  rodar,
}: {
  ano: number;
  ate: number;
  ateFechado: number;
  metas: Meta[];
  valores: Valores;
  rmrs: Rmr[];
  projetos: Projeto[];
  rodar: Rodar;
}) {
  const [mes, setMes] = useState(Math.max(1, ateFechado));
  const chave = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const feita = rmrs.find((r) => r.mes === chave);
  const revisaveis = metas.filter((m) => leituraMeta(m, valores[m.id] ?? {}, mes).vigente);
  const nota = notaDoMes(revisaveis, valores, mes);
  const nomeProjeto = useMemo(
    () => Object.fromEntries(projetos.map((x) => [x.id, x.nome])),
    [projetos],
  );
  const faltam = revisaveis.filter((m) => leituraMeta(m, valores[m.id] ?? {}, mes).realizado === null).length;
  const podeFechar = mes <= ateFechado && revisaveis.length > 0 && faltam === 0 && nota !== null;
  const doAno = rmrs
    .filter((r) => r.mes.startsWith(String(ano)))
    .sort((a, b) => b.mes.localeCompare(a.mes));

  return (
    <section className={p.andar} id="rmr">
      <h2>
        Revisão de {MESES_LONGOS[mes - 1]}
        <i className={p.ponto}>.</i>
      </h2>
      <p className={p.voz}>
        Confira os números, registre o que aprendeu e decida a ação do próximo mês. Meses em andamento podem ser medidos, mas só podem ser concluídos depois de terminar.{" "}
        <label className={p.trocaMes}>
          ver o mês de{" "}
          <select aria-label="Mês da revisão" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {Array.from({ length: ate }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {MESES_LONGOS[n - 1]}{n > ateFechado ? " (em andamento)" : ""}
              </option>
            ))}
          </select>
        </label>
      </p>

      {revisaveis.length === 0 ? (
        <div className={p.vazio}>
          Nenhuma meta vigente neste mês. Defina metas ou escolha outro mês.
        </div>
      ) : (
        <ul className={p.rmr}>
          {revisaveis.map((m) => {
            const v = valores[m.id]?.[mes];
            const pc = percentual(m, valores[m.id] ?? {}, mes);
            return (
              <li key={m.id} className={p.rmrLinha}>
                <span
                  className={`${p.bolinha} ${FAIXA_CLASSE[faixa(pc)]}`}
                  aria-hidden
                />
                <div className={p.rmrMeta}>
                  <b>{m.titulo}</b>
                  <em>
                    {faltaTexto(
                      m,
                      valores[m.id] ?? {},
                      mes,
                      nomeProjeto[m.projeto_id],
                    )}
                  </em>
                </div>
                {m.fonte === "manual" ? (
                  <input
                    key={`${m.id}-${mes}`}
                    className={p.rmrValor}
                    type="number"
                    step="any"
                    defaultValue={v ?? ""}
                    placeholder="número do mês"
                    onKeyDown={(e) => cancelarEdicao(e, v)}
                    onBlur={(e) => {
                      const novo =
                        e.target.value === "" ? null : Number(e.target.value);
                      if (novo === (v ?? null)) return;
                      rodar(() => lancar(m.id, chave, novo));
                    }}
                    aria-label={`${m.titulo} em ${MESES_LONGOS[mes - 1]}`}
                  />
                ) : (
                  <span className={p.rmrAuto} title={FONTES[m.fonte].ajuda}>
                    {formatar(leituraMeta(m, valores[m.id] ?? {}, mes).realizado, m.unidade)}
                    <i>{m.periodo === "ano" ? "acumulado automático" : "automático"}</i>
                  </span>
                )}
                <b className={`${p.rmrPct} ${FAIXA_CLASSE[faixa(pc)]}`}>
                  {pct(pc)}
                </b>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className={p.fechar}
        key={chave}
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          rodar(() =>
            fecharRmr(
              chave,
              nota,
              String(d.get("causa") ?? ""),
              String(d.get("plano") ?? ""),
            ),
          );
        }}
      >
        <label className={p.campo}>
          <span className={p.rotulo}>O que aconteceu e por quê</span>
          <textarea
            name="causa"
            rows={3}
            defaultValue={feita?.causa ?? ""}
            placeholder="Onde saiu da linha, e por quê."
          />
        </label>
        <label className={p.campo}>
          <span className={p.rotulo}>Qual é a próxima ação</span>
          <textarea
            name="plano"
            rows={3}
            defaultValue={feita?.plano ?? ""}
            placeholder="O que muda no mês que vem."
          />
        </label>
        <div className={p.fecharPe}>
          <span>
            Nota desta revisão: <b>{pct(nota)}</b>
            {faltam
              ? `, com ${faltam} ${faltam === 1 ? "meta ainda sem número" : "metas ainda sem número"}`
              : ""}
          </span>
          <button type="submit" className={p.btn} disabled={!podeFechar}>
            {mes > ateFechado ? "Mês em andamento" : feita ? "Atualizar revisão" : `Concluir ${MESES_LONGOS[mes - 1]}`}
          </button>
        </div>
        {feita ? (
          <p className={p.fechada}>
            Concluída em {new Date(feita.fechada_em).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. A nota salva é a do fechamento; alterações nas fontes mudam a leitura atual.
          </p>
        ) : null}
      </form>
      {!podeFechar && <p className={p.voz}>{mes > ateFechado ? "Você pode medir este mês agora. A conclusão fica disponível quando o mês terminar." : faltam ? "Complete as medições pendentes ou confira as fontes automáticas para concluir." : "Defina metas vigentes e a importância de pelo menos uma delas para concluir."}</p>}

      {doAno.length ? (
        <div className={p.historico}>
          <span className={p.rotulo}>Revisões concluídas de {ano}</span>
          <ul>
            {doAno.map((r) => (
              <li key={r.mes}>
                <b>{MESES_LONGOS[Number(r.mes.slice(5, 7)) - 1]}</b>
                <span
                  className={`${p.notaMini} ${FAIXA_CLASSE[faixa(r.nota)]}`}
                >
                  {pct(r.nota)}
                </span>
                {r.plano ? (
                  <em>{r.plano}</em>
                ) : r.causa ? (
                  <em>{r.causa}</em>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* O que falta, em português: a RMR lia "54%" e o Rafael tinha que fazer a
   conta de cabeça. Agora cada meta diz o número que falta no mês (ou para o
   ritmo, nas metas do ano). */
function faltaTexto(
  m: Meta,
  v: Partial<Record<number, number>>,
  mes: number,
  projeto?: string,
): string {
  const r = leituraMeta(m, v, mes);
  const onde = projeto ? projeto + '. ' : '';
  if (r.realizado === null) return onde + 'Medição a apurar. Confira a fonte ou complete os meses pendentes.';
  const fmt = (n: number) => formatar(n, m.unidade);
  if (r.falta === 0) return onde + (m.direcao === 'reduzir' ? 'Dentro do limite: ' : m.periodo === 'ano' ? 'No ritmo: ' : 'Alcançado: ') + fmt(r.realizado) + ' de ' + fmt(r.alvo) + '.';
  return onde + (m.direcao === 'reduzir' ? 'Reduzir ' : 'Faltam ') + fmt(r.falta!) + (m.periodo === 'ano' ? ' para o ritmo do ano.' : ' para o alvo do mês.');
}
