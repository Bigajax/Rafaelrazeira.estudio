"use client";

/* ============================================================
   O PLANO NA TELA

   Quatro andares, na ordem do método:
   1. o PLACAR: a nota do painel no ano, o prêmio e a sequência de RMRs;
      é o que faz o plano virar jogo (a G4 amarra metade do bônus nisso);
   2. o ESTRATÉGICO: missão, visão com ano e projeções por ano;
   3. os PROJETOS: a lista fechada, com prioridade e horizonte, e os "nãos"
      que já se disse, riscados e à vista;
   4. o PAINEL DE METAS do ano, mês a mês, e a RMR do mês.

   Tudo salva ao sair do campo, como o resto do CRM.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
  sequencia,
  situacaoDoDegrau,
  type Ciclo,
  type Degrau,
  type Fonte,
  type Meta,
  type Prioridade,
  type Projeto,
  type Rmr,
  type Valores,
} from "@/lib/plano/tipos";
import { ComoFunciona, ProximoPasso, Subida, type Passo } from "./Subida";
import p from "@/app/(pt)/crm/plano.module.css";

type Props = {
  ano: number;
  ate: number;
  ciclo: Ciclo | null;
  projetos: Projeto[];
  metas: Meta[];
  valores: Valores;
  rmrs: Rmr[];
  recebido: Partial<Record<number, number>>;
  vendido?: Partial<Record<number, number>>;
};

const ORDEM_P: Record<Prioridade, number> = { P1: 0, P2: 1, P3: 2 };
const FAIXA_CLASSE = { bateu: p.fBateu, perto: p.fPerto, atencao: p.fAtencao, fora: p.fFora, sem: p.fSem };

export function Plano({ ano, ate, ciclo, projetos, metas, valores, rmrs, recebido, vendido = {} }: Props) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const [premios, setPremios] = useState(false);

  function rodar(acao: () => Promise<Feito>, depois?: (r: Feito) => void) {
    comecar(async () => {
      const r = await acao();
      if (!r.ok) setAviso(r.erro);
      else setAviso(null);
      depois?.(r);
      router.refresh();
    });
  }

  const ativos = projetos
    .filter((x) => x.status !== "encerrado")
    .sort((a, b) => ORDEM_P[a.prioridade] - ORDEM_P[b.prioridade] || (a.status === "pausado" ? 1 : 0) - (b.status === "pausado" ? 1 : 0) || a.ordem - b.ordem);
  const nao = projetos.filter((x) => x.status === "encerrado");

  const nota = ate ? notaDoPainel(metas, valores, ate) : null;
  const somaPesos = metas.reduce((a, m) => a + m.peso, 0);
  const seq = sequencia(rmrs, ano, ate || 1);
  const batidasNoMes = ate ? metas.filter((m) => faixa(percentual(m, valores[m.id] ?? {}, ate)) === "bateu").length : 0;

  /* o que a página manda fazer agora, na ordem do método */
  const passos: Passo[] = [];
  if (!ciclo?.missao?.trim()) passos.push({ texto: "Escreva a missão do estúdio numa frase.", ancora: "rumo", acao: "Escrever" });
  if (!ativos.length) passos.push({ texto: "Crie o primeiro projeto do ano.", ancora: "projetos", acao: "Criar" });
  if (metas.length && somaPesos !== 100)
    passos.push({ texto: `Os pesos somam ${somaPesos}. Ajuste até dar 100.`, ancora: "metas", acao: "Ajustar" });
  if (ate) {
    for (const m of metas.filter((x) => x.fonte === "manual" && valores[x.id]?.[ate] === undefined).slice(0, 2)) {
      passos.push({ texto: `Lance "${m.titulo}" de ${MESES_LONGOS[ate - 1]}.`, ancora: "rmr", acao: "Lançar" });
    }
    if (metas.length && !rmrs.some((r) => r.mes === `${ano}-${String(ate).padStart(2, "0")}-01`)) {
      passos.push({ texto: `Feche a RMR de ${MESES_LONGOS[ate - 1]} no último dia do mês.`, ancora: "rmr", acao: "Fechar" });
    }
  }

  return (
    <div className={`${p.tela} ${pendente ? p.ocupado : ""}`}>
      <header className={p.cabeca}>
        <div>
          <h1>
            Plano<i className={p.ponto}>.</i>
          </h1>
          <p className={p.voz}>O rumo do estúdio, e quanto falta para chegar.</p>
        </div>
        <nav className={p.anos} aria-label="Trocar de ano">
          <Link href={`/crm/plano?ano=${ano - 1}`}>{ano - 1}</Link>
          <b>{ano}</b>
          <Link href={`/crm/plano?ano=${ano + 1}`}>{ano + 1}</Link>
        </nav>
      </header>

      {aviso ? <p className={p.erro}>{aviso}</p> : null}

      {/* ---------- a subida: o placar que se vê de longe ---------- */}
      <Subida ano={ano} ate={ate} degraus={ciclo?.premios ?? []} recebido={recebido} vendido={vendido}visao={ciclo?.visao ?? null} horizonte={ciclo?.horizonte ?? null} />

      <div className={p.placar} aria-label="Placar do ano">
        <div className={FAIXA_CLASSE[faixa(nota)]}>
          <b className={p.placarNum}>{pct(nota)}</b>
          <span>
            é a nota do painel em {ano}
            {nota === null ? (metas.length ? ", ainda sem número lançado" : ", sem metas ainda") : `: ${FAIXAS[faixa(nota)]}`}
          </span>
        </div>
        <div>
          <b className={p.placarNum}>{seq}</b>
          <span>{seq === 1 ? "mês fechado seguido na RMR" : "meses fechados seguidos na RMR"}</span>
        </div>
        <div>
          <b className={p.placarNum}>
            {batidasNoMes}
            <small> de {metas.length}</small>
          </b>
          <span>metas batidas em {ate ? MESES_LONGOS[ate - 1] : "nenhum mês"}</span>
        </div>
        <button type="button" className={p.mini} onClick={() => setPremios(!premios)} aria-expanded={premios}>
          {premios ? "Fechar os prêmios" : ciclo?.premios?.length ? "Ajustar os prêmios" : "Criar os prêmios"}
        </button>
      </div>
      {premios ? <EditarPremios ano={ano} ciclo={ciclo} rodar={rodar} fechar={() => setPremios(false)} /> : null}

      <div className={p.guia}>
        <ProximoPasso passos={passos.slice(0, 4)} />
        <ComoFunciona />
      </div>

      {/* ---------- 1. o rumo ---------- */}
      <section className={p.andar} id="rumo">
        <h2>
          <i className={p.num}>1</i> O rumo<i className={p.ponto}>.</i>
        </h2>
        <p className={p.voz}>Para onde o estúdio vai daqui a 3 a 5 anos. Quando aparecer uma oportunidade boa, é aqui que se decide se ela entra.</p>
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
                onBlur={(e) => {
                  if (String(ciclo?.horizonte ?? "") !== e.target.value) rodar(() => salvarCiclo(ano, { horizonte: e.target.value || null }));
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
          <i className={p.num}>2</i> Os projetos<i className={p.ponto}>.</i>
        </h2>
        <p className={p.voz}>
          A lista fechada do que leva a sua energia este ano. P1 é onde vai quase tudo; P3 anda devagar de propósito. E o que você decidir
          não fazer vira um &ldquo;não&rdquo; escrito, para não voltar à mesa todo mês.
        </p>
        <ul className={p.projetos}>
          {ativos.map((x) => (
            <CartaoProjeto key={x.id} x={x} metas={metas.filter((m) => m.projeto_id === x.id)} valores={valores} ate={ate} rodar={rodar} />
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
                  <button type="button" className={p.mini} onClick={() => rodar(() => salvarProjeto(x.id, { status: "ativo" }))}>
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
          Cada projeto vira poucos números por mês. O peso diz quanto cada meta conta na nota: somados, os pesos dão 100.{" "}
          <span className={somaPesos === 100 ? p.pesoOk : p.pesoFalta}>
            {somaPesos === 100 ? "Os seus somam 100, certo." : `Os seus somam ${somaPesos}${somaPesos > 100 ? ", passou." : ", falta distribuir."}`}
          </span>
          {metas.length > 7 ? <span className={p.pesoFalta}> São {metas.length} metas: a G4 limita em 5 por pessoa, e você é uma só.</span> : null}
        </p>
        <ul className={p.legenda} aria-label="O que cada cor quer dizer">
          <li className={p.fBateu}>100% ou mais: bateu</li>
          <li className={p.fPerto}>80 a 99%: perto</li>
          <li className={p.fAtencao}>60 a 79%: atenção</li>
          <li className={p.fFora}>abaixo de 60%: fora da linha</li>
        </ul>
        {ativos.length === 0 ? (
          <div className={p.vazio}>Crie um projeto no passo 2 para dar metas a ele.</div>
        ) : (
          <div className={p.painel}>
            <div className={p.painelCab} aria-hidden>
              <span>Meta</span>
              <span>Peso</span>
              {MESES.map((m, i) => (
                <span key={m} className={i + 1 === ate ? p.mesAtual : ""}>
                  {m}
                </span>
              ))}
              <span>No ano</span>
            </div>
            {ativos.map((x) => (
              <div key={x.id} className={p.grupo}>
                <div className={p.grupoCab}>
                  <b>{x.prioridade}</b> {x.nome}
                  {x.status === "pausado" ? <em> (pausado)</em> : null}
                </div>
                {metas
                  .filter((m) => m.projeto_id === x.id)
                  .map((m) => (
                    <LinhaMeta key={m.id} m={m} v={valores[m.id] ?? {}} ate={ate} rodar={rodar} />
                  ))}
                <NovaMeta projetoId={x.id} ano={ano} rodar={rodar} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- 4. a RMR ---------- */}
      {ate ? <RmrDoMes ano={ano} ate={ate} metas={metas} valores={valores} rmrs={rmrs} projetos={projetos} rodar={rodar} /> : null}
    </div>
  );
}

type Rodar = (acao: () => Promise<Feito>, depois?: (r: Feito) => void) => void;

/* ---------- peças ---------- */

function CampoTexto({ rotulo, valor, dica, linhas, salvar }: { rotulo: string; valor: string; dica: string; linhas: number; salvar: (v: string) => void }) {
  return (
    <label className={p.campo}>
      <span className={p.rotulo}>{rotulo}</span>
      <textarea
        rows={linhas}
        defaultValue={valor}
        placeholder={dica}
        onBlur={(e) => {
          if (e.target.value.trim() !== valor.trim()) salvar(e.target.value);
        }}
      />
    </label>
  );
}

/* O editor dos prêmios em degraus: abre pelo placar. A leitura deles é a
   montanha (components/plano/Subida.tsx). */
function EditarPremios({ ano, ciclo, rodar, fechar }: { ano: number; ciclo: Ciclo | null; rodar: Rodar; fechar: () => void }) {
  const salvos = [...(ciclo?.premios ?? [])].sort((a, b) => a.patamar - b.patamar || a.meses - b.meses);
  const [rascunho, setRascunho] = useState<Degrau[]>(salvos.length ? salvos : [{ nome: "", patamar: 0, meses: 1 }]);
  const mudar = (i: number, parte: Partial<Degrau>) => setRascunho(rascunho.map((d, j) => (j === i ? { ...d, ...parte } : d)));
  return (
    <div className={p.editaPremios}>
      <p className={p.voz}>
        Cada prêmio é um acampamento na montanha. Ele destrava quando o Caixa de um mês passa do patamar; se pedir meses seguidos, o
        patamar tem que se repetir.
      </p>
      <div className={p.degrausForm}>
        {rascunho.map((d, i) => (
          <div key={i} className={p.degrauEdita}>
            <input value={d.nome} onChange={(e) => mudar(i, { nome: e.target.value })} placeholder="O prêmio" maxLength={80} aria-label="Prêmio" />
            <label>
              R$ <input type="number" min={1} value={d.patamar || ""} onChange={(e) => mudar(i, { patamar: Number(e.target.value) })} aria-label="Entrou no Caixa no mês" /> no mês
            </label>
            <label>
              por <input type="number" min={1} max={12} value={d.meses} onChange={(e) => mudar(i, { meses: Number(e.target.value) || 1 })} aria-label="Meses seguidos" />
              {d.meses > 1 ? " meses seguidos" : " mês"}
            </label>
            <button type="button" className={p.mini} onClick={() => setRascunho(rascunho.filter((_, j) => j !== i))}>
              Tirar
            </button>
          </div>
        ))}
      </div>
      <div className={p.degrausPe}>
        <button type="button" className={p.mini} onClick={() => setRascunho([...rascunho, { nome: "", patamar: 0, meses: 1 }])}>
          Mais um prêmio
        </button>
        <button type="button" className={p.btn} onClick={() => rodar(() => salvarCiclo(ano, { premios: rascunho }), (r) => r.ok && fechar())}>
          Salvar os prêmios
        </button>
        <button type="button" className={p.mini} onClick={fechar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Projecoes({ ano, ciclo, rodar }: { ano: number; ciclo: Ciclo | null; rodar: Rodar }) {
  const base = ciclo?.projecoes?.length ? ciclo.projecoes : [0, 1, 2].map((k) => ({ ano: ano + k, faturamento: null, caixa: null }));
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
            <th>Caixa que sobra (R$)</th>
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
                    onBlur={(e) => {
                      if (String(l[k] ?? "") === e.target.value) return;
                      salvar(linhas.map((x, j) => (j === i ? { ...x, [k]: num(e.target.value) } : x)));
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {linhas.length < 6 ? (
        <button type="button" className={p.mini} onClick={() => salvar([...linhas, { ano: (linhas.at(-1)?.ano ?? ano) + 1, faturamento: null, caixa: null }])}>
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
        rodar(() => criarProjeto(nome), (r) => r.ok && setNome(""));
      }}
    >
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Novo projeto (ex.: Vitrines para lojas pequenas)" maxLength={80} />
      <button type="submit" className={p.btn}>
        Criar projeto
      </button>
    </form>
  );
}

function CartaoProjeto({ x, metas, valores, ate, rodar }: { x: Projeto; metas: Meta[]; valores: Valores; ate: number; rodar: Rodar }) {
  const [encerrando, setEncerrando] = useState(false);
  const nota = ate ? notaDoPainel(metas, valores, ate) : null;
  return (
    <li className={`${p.projeto} ${p[x.prioridade]} ${x.status === "pausado" ? p.pausado : ""}`}>
      <div className={p.projetoCab}>
        <select
          className={p.prio}
          value={x.prioridade}
          onChange={(e) => rodar(() => salvarProjeto(x.id, { prioridade: e.target.value }))}
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
            if (e.target.value.trim() && e.target.value.trim() !== x.nome) rodar(() => salvarProjeto(x.id, { nome: e.target.value }));
          }}
          aria-label="Nome do projeto"
        />
        <span className={`${p.notaMini} ${FAIXA_CLASSE[faixa(nota)]}`} title="A nota das metas deste projeto no ano">
          {pct(nota)}
        </span>
      </div>
      <textarea
        className={p.porque}
        rows={2}
        defaultValue={x.porque ?? ""}
        placeholder="Por que este projeto existe e o que ele tem a ver com a visão."
        onBlur={(e) => {
          if (e.target.value.trim() !== (x.porque ?? "").trim()) rodar(() => salvarProjeto(x.id, { porque: e.target.value }));
        }}
      />
      <div className={p.projetoPe}>
        <label>
          horizonte{" "}
          <select value={x.horizonte} onChange={(e) => rodar(() => salvarProjeto(x.id, { horizonte: e.target.value }))}>
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
        <button type="button" className={p.mini} onClick={() => rodar(() => salvarProjeto(x.id, { status: x.status === "pausado" ? "ativo" : "pausado" }))}>
          {x.status === "pausado" ? "Retomar" : "Pausar"}
        </button>
        <button type="button" className={p.mini} onClick={() => setEncerrando(!encerrando)}>
          Dizer não
        </button>
      </div>
      {encerrando ? (
        <form
          className={p.linhaForm}
          onSubmit={(e) => {
            e.preventDefault();
            const motivo = String(new FormData(e.currentTarget).get("motivo") ?? "");
            rodar(() => salvarProjeto(x.id, { status: "encerrado", motivo_encerrado: motivo }));
          }}
        >
          <input name="motivo" placeholder="Por que não (fica escrito para não voltar)" maxLength={300} />
          <button type="submit" className={p.btn}>
            Encerrar
          </button>
          {metas.length === 0 ? (
            <button type="button" className={p.mini} onClick={() => rodar(() => apagarProjeto(x.id))}>
              Apagar de vez
            </button>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}

function LinhaMeta({ m, v, ate, rodar }: { m: Meta; v: Partial<Record<number, number>>; ate: number; rodar: Rodar }) {
  const [editando, setEditando] = useState(false);
  const noAno = ate ? percentualNoAno(m, v, ate) : null;
  return (
    <div className={p.meta}>
      <div className={p.metaNome}>
        <button type="button" className={p.metaTitulo} onClick={() => setEditando(!editando)} aria-expanded={editando}>
          {m.titulo}
        </button>
        <span className={p.metaAlvo}>
          {formatar(m.alvo, m.unidade)} {m.periodo === "mes" ? "por mês" : "no ano"}
          {m.fonte !== "manual" ? <i title={FONTES[m.fonte].ajuda}>, medida sozinha</i> : null}
        </span>
      </div>
      <input
        className={p.peso}
        type="number"
        min={0}
        max={100}
        defaultValue={m.peso}
        aria-label="Peso"
        onBlur={(e) => {
          if (Number(e.target.value) !== m.peso) rodar(() => salvarMeta(m.id, { peso: e.target.value }));
        }}
      />
      {MESES.map((nome, i) => {
        const mes = i + 1;
        const pc = mes <= ate ? percentual(m, v, mes) : null;
        const f = mes <= ate ? faixa(pc) : "sem";
        return (
          <span key={nome} className={`${p.celula} ${mes <= ate ? FAIXA_CLASSE[f] : p.futuro}`} title={mes <= ate ? `${MESES_LONGOS[i]}: ${formatar(v[mes], m.unidade)} (${pct(pc)}, ${FAIXAS[f]})` : MESES_LONGOS[i]}>
            {mes <= ate && v[mes] !== undefined ? pct(pc) : ""}
          </span>
        );
      })}
      <b className={`${p.noAno} ${FAIXA_CLASSE[faixa(noAno)]}`}>{pct(noAno)}</b>
      {editando ? <EditarMeta m={m} rodar={rodar} fechar={() => setEditando(false)} /> : null}
    </div>
  );
}

function CamposMeta({ m }: { m?: Meta }) {
  const [fonte, setFonte] = useState<Fonte>(m?.fonte ?? "manual");
  const unidadeFixa = FONTES[fonte].unidade;
  return (
    <>
      <input name="titulo" defaultValue={m?.titulo} placeholder="A meta (ex.: Vitrines entregues)" maxLength={120} required />
      <select name="fonte" value={fonte} onChange={(e) => setFonte(e.target.value as Fonte)} aria-label="Como se mede">
        {(Object.keys(FONTES) as Fonte[]).map((k) => (
          <option key={k} value={k}>
            {FONTES[k].nome}
          </option>
        ))}
      </select>
      <input name="alvo" type="number" min={0} step="any" defaultValue={m?.alvo} placeholder="alvo" required aria-label="Alvo" />
      {unidadeFixa ? (
        <input type="hidden" name="unidade" value={unidadeFixa} />
      ) : (
        <select name="unidade" defaultValue={m?.unidade ?? "un"} aria-label="Unidade">
          <option value="un">un</option>
          <option value="R$">R$</option>
          <option value="%">%</option>
        </select>
      )}
      <select name="periodo" defaultValue={m?.periodo ?? "mes"} aria-label="Período do alvo">
        <option value="mes">por mês</option>
        <option value="ano">no ano</option>
      </select>
      <input name="peso" type="number" min={0} max={100} defaultValue={m?.peso ?? 10} aria-label="Peso" title="peso" />
    </>
  );
}

function lerForm(f: HTMLFormElement) {
  const d = new FormData(f);
  return Object.fromEntries(["titulo", "fonte", "alvo", "unidade", "periodo", "peso"].map((k) => [k, d.get(k)]));
}

function NovaMeta({ projetoId, ano, rodar }: { projetoId: string; ano: number; rodar: Rodar }) {
  const [aberta, setAberta] = useState(false);
  if (!aberta) {
    return (
      <button type="button" className={p.addMeta} onClick={() => setAberta(true)}>
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
        rodar(() => criarMeta(projetoId, ano, lerForm(f)), (r) => r.ok && setAberta(false));
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

function EditarMeta({ m, rodar, fechar }: { m: Meta; rodar: Rodar; fechar: () => void }) {
  return (
    <form
      className={p.formMeta}
      onSubmit={(e) => {
        e.preventDefault();
        const f = e.currentTarget;
        rodar(() => salvarMeta(m.id, lerForm(f)), (r) => r.ok && fechar());
      }}
    >
      <CamposMeta m={m} />
      <button type="submit" className={p.btn}>
        Salvar
      </button>
      <button type="button" className={p.mini} onClick={() => rodar(() => apagarMeta(m.id))}>
        Apagar meta
      </button>
    </form>
  );
}

function RmrDoMes({
  ano,
  ate,
  metas,
  valores,
  rmrs,
  projetos,
  rodar,
}: {
  ano: number;
  ate: number;
  metas: Meta[];
  valores: Valores;
  rmrs: Rmr[];
  projetos: Projeto[];
  rodar: Rodar;
}) {
  const [mes, setMes] = useState(ate);
  const chave = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const feita = rmrs.find((r) => r.mes === chave);
  const nota = notaDoPainel(metas, valores, mes);
  const nomeProjeto = useMemo(() => Object.fromEntries(projetos.map((x) => [x.id, x.nome])), [projetos]);
  const faltam = metas.filter((m) => m.fonte === "manual" && valores[m.id]?.[mes] === undefined).length;
  const doAno = rmrs.filter((r) => r.mes.startsWith(String(ano))).sort((a, b) => b.mes.localeCompare(a.mes));

  return (
    <section className={p.andar} id="rmr">
      <h2>
        <i className={p.num}>4</i> A RMR de {MESES_LONGOS[mes - 1]}
        <i className={p.ponto}>.</i>
      </h2>
      <p className={p.voz}>
        A reunião mensal de resultados, de você com você. As metas automáticas já chegam preenchidas; lance as outras, olhe onde saiu da
        linha e escreva o que causou e o plano para voltar. Mês fechado conta na sequência.{" "}
        <label className={p.trocaMes}>
          ver o mês de{" "}
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {Array.from({ length: ate }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {MESES_LONGOS[n - 1]}
              </option>
            ))}
          </select>
        </label>
      </p>

      {metas.length === 0 ? (
        <div className={p.vazio}>Sem metas no ano ainda: crie no painel acima.</div>
      ) : (
        <ul className={p.rmr}>
          {metas.map((m) => {
            const v = valores[m.id]?.[mes];
            const pc = percentual(m, valores[m.id] ?? {}, mes);
            return (
              <li key={m.id} className={p.rmrLinha}>
                <span className={`${p.bolinha} ${FAIXA_CLASSE[faixa(pc)]}`} aria-hidden />
                <div className={p.rmrMeta}>
                  <b>{m.titulo}</b>
                  <em>{faltaTexto(m, valores[m.id] ?? {}, mes, nomeProjeto[m.projeto_id])}</em>
                </div>
                {m.fonte === "manual" ? (
                  <input
                    key={`${m.id}-${mes}`}
                    className={p.rmrValor}
                    type="number"
                    step="any"
                    defaultValue={v ?? ""}
                    placeholder="número do mês"
                    onBlur={(e) => {
                      const novo = e.target.value === "" ? null : Number(e.target.value);
                      if (novo === (v ?? null)) return;
                      rodar(() => lancar(m.id, chave, novo));
                    }}
                    aria-label={`${m.titulo} em ${MESES_LONGOS[mes - 1]}`}
                  />
                ) : (
                  <span className={p.rmrAuto} title={FONTES[m.fonte].ajuda}>
                    {formatar(v ?? 0, m.unidade)}
                    <i>medido sozinho</i>
                  </span>
                )}
                <b className={`${p.rmrPct} ${FAIXA_CLASSE[faixa(pc)]}`}>{pct(pc)}</b>
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
          rodar(() => fecharRmr(chave, nota, String(d.get("causa") ?? ""), String(d.get("plano") ?? "")));
        }}
      >
        <label className={p.campo}>
          <span className={p.rotulo}>O que causou</span>
          <textarea name="causa" rows={3} defaultValue={feita?.causa ?? ""} placeholder="Onde saiu da linha, e por quê." />
        </label>
        <label className={p.campo}>
          <span className={p.rotulo}>O plano para voltar</span>
          <textarea name="plano" rows={3} defaultValue={feita?.plano ?? ""} placeholder="O que muda no mês que vem." />
        </label>
        <div className={p.fecharPe}>
          <span>
            Nota do painel até {MESES_LONGOS[mes - 1]}: <b>{pct(nota)}</b>
            {faltam ? `, com ${faltam} ${faltam === 1 ? "meta ainda sem número" : "metas ainda sem número"}` : ""}
          </span>
          <button type="submit" className={p.btn}>
            {feita ? "Atualizar a RMR" : `Fechar ${MESES_LONGOS[mes - 1]}`}
          </button>
        </div>
        {feita ? <p className={p.fechada}>Fechada em {new Date(feita.fechada_em).toLocaleDateString("pt-BR")}.</p> : null}
      </form>

      {doAno.length ? (
        <div className={p.historico}>
          <span className={p.rotulo}>As RMRs de {ano}</span>
          <ul>
            {doAno.map((r) => (
              <li key={r.mes}>
                <b>{MESES_LONGOS[Number(r.mes.slice(5, 7)) - 1]}</b>
                <span className={`${p.notaMini} ${FAIXA_CLASSE[faixa(r.nota)]}`}>{pct(r.nota)}</span>
                {r.plano ? <em>{r.plano}</em> : r.causa ? <em>{r.causa}</em> : null}
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
function faltaTexto(m: Meta, v: Partial<Record<number, number>>, mes: number, projeto?: string): string {
  const fmt = (x: number) => formatar(x, m.unidade);
  const onde = projeto ? `${projeto}. ` : "";
  if (m.periodo === "ano") {
    let acum = 0;
    for (let k = 1; k <= mes; k++) acum += v[k] ?? 0;
    const ritmo = (m.alvo * mes) / 12;
    return acum >= ritmo
      ? `${onde}No ritmo: ${fmt(acum)} no ano, e o ritmo pede ${fmt(ritmo)}.`
      : `${onde}Faltam ${fmt(ritmo - acum)} para o ritmo do ano (${fmt(m.alvo)} até dezembro).`;
  }
  const x = v[mes];
  if (x === undefined) return `${onde}Alvo de ${fmt(m.alvo)} no mês. Lance o número.`;
  return x >= m.alvo ? `${onde}Bateu: ${fmt(x)} de ${fmt(m.alvo)}.` : `${onde}Faltam ${fmt(m.alvo - x)} para ${fmt(m.alvo)}.`;
}
