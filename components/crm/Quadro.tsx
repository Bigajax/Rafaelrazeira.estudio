"use client";

/* ============================================================
   O KANBAN

   Sete colunas de caminho e três destinos de saída, arrasto entre
   elas e dentro delas, e as regras 1 a 4 barrando a passagem quando falta
   informação.

   ---------- a ordem das operações num arrasto ----------
   1. O card é solto. A tela calcula destino e posição.
   2. A tela pergunta à MESMA função que o servidor vai usar (`oQueFalta`)
      se essa passagem é legal.
   3a. Se falta campo, o card NÃO SE MEXE e o modal abre. Mover o card e
       depois devolvê-lo se a pessoa cancelar seria uma animação mentindo
       duas vezes seguidas.
   3b. Se está tudo certo, o card vai para o lugar novo na hora e a
       gravação acontece atrás. Se a gravação falhar, o estado inteiro
       volta ao que era antes do arrasto e o erro aparece.

   O rollback usa uma cópia do array inteiro, e não um "desfaz este card":
   uma reordenação mexe na posição de um card só, mas uma passagem para
   ganho apaga o próximo passo, zera a data e muda a soma de duas colunas.
   Guardar o antes inteiro é uma linha; reverter campo a campo seria uma
   segunda implementação das regras, pronta para divergir da primeira.
   ============================================================ */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { moverLead } from "@/app/(pt)/crm/acoes";
import {
  exigenciaDeTodas,
  oQueFalta,
  oQuePede,
  ordenarColuna,
  posicaoAoSoltar,
  posicaoEntre,
  procurouOEstudio,
  urgencia,
  type CampoExigido,
  type Passagem,
} from "@/lib/crm/regras";
import {
  ESTAGIOS,
  ESTAGIOS_DO_QUADRO,
  ESTAGIOS_DE_PLACA,
  NOME_ESTAGIO,
  NOME_ORIGEM,
  NOME_TIPO,
  ORIGENS,
  TIPOS_PROJETO,
  type Estagio,
  type LeadPainel,
} from "@/lib/crm/tipos";
import { CardLead, CardVoando } from "./CardLead";
import { ModalContrato } from "./ModalContrato";
import { ModalNovoLead } from "./ModalNovoLead";
import { ModalPassagem } from "./ModalPassagem";
import { PesquisaLote } from "./PesquisaLote";
import p from "./pipeline.module.css";
import { IconePipeline } from "./IconePipeline";
import {
  ETAPAS_VISUAIS,
  noFoco,
  resumoPipeline,
  valorPipeline,
  type FocoPipeline,
} from "@/lib/crm/pipeline";

const idDaColuna = (e: Estagio) => `col:${e}`;

// Esquerda/direita navegam por etapas; cima/baixo mantêm a ordenação do dnd-kit.
const coordenadasDoQuadro: KeyboardCoordinateGetter = (evento, argumentos) => {
  if (evento.code !== "ArrowLeft" && evento.code !== "ArrowRight")
    return sortableKeyboardCoordinates(evento, argumentos);
  evento.preventDefault();
  const { active, over, collisionRect, droppableContainers, droppableRects } =
    argumentos.context;
  if (!active || !collisionRect) return;
  const etapas = [...ESTAGIOS_DO_QUADRO, ...ESTAGIOS_DE_PLACA];
  const atual = (over?.data.current?.estagio ??
    active.data.current?.estagio) as Estagio;
  const indice = etapas.indexOf(atual);
  const destino = etapas[indice + (evento.code === "ArrowRight" ? 1 : -1)];
  if (indice < 0 || !destino) return argumentos.currentCoordinates;
  const candidatos = droppableContainers
    .getEnabled()
    .filter(
      (c) => c.data.current?.estagio === destino && droppableRects.has(c.id),
    );
  const cards = candidatos.filter((c) => !String(c.id).startsWith("col:"));
  const alvo = (cards.length ? cards : candidatos).sort(
    (a, b) =>
      Math.abs(droppableRects.get(a.id)!.top - collisionRect.top) -
      Math.abs(droppableRects.get(b.id)!.top - collisionRect.top),
  )[0];
  const retangulo = alvo && droppableRects.get(alvo.id);
  if (!retangulo) return argumentos.currentCoordinates;
  return {
    x: argumentos.currentCoordinates.x + retangulo.left - collisionRect.left,
    y: argumentos.currentCoordinates.y + retangulo.top - collisionRect.top,
  };
};

type Pendente = {
  lead: LeadPainel;
  estagio: Estagio;
  posicao: number;
  falta: CampoExigido[];
};

export function Quadro({
  leads: doServidor,
  nichos,
  anuncios,
  hoje,
}: {
  leads: LeadPainel[];
  nichos: string[];
  /* Os anúncios que já trouxeram lead, para o filtro (18/09). Vazio
     enquanto a campanha não trouxe ninguém, e aí o filtro nem aparece. */
  anuncios: string[];
  hoje: string;
}) {
  /* Cópia local, porque o arrasto precisa mexer na tela antes de o servidor
     responder. Ela é substituída toda vez que o servidor manda dado novo
     (o `revalidatePath` de cada ação), e é isso que faz a verdade continuar
     sendo a do banco: o otimismo dura o tempo de uma requisição. */
  const [leads, setLeads] = useState(doServidor);
  useEffect(() => setLeads(doServidor), [doServidor]);

  const rolagemRef = useRef<HTMLDivElement>(null);
  const [foco, setFoco] = useState<FocoPipeline>("todos");
  const [tipo, setTipo] = useState("");
  const [origem, setOrigem] = useState("");
  const [nicho, setNicho] = useState("");
  const [anuncio, setAnuncio] = useState("");
  /* O botão de um toque "Anúncio e site" (18/09): o mesmo monte do Hoje,
     aqui como filtro. Liga por cima dos selects, e é o que responde "cadê
     os de anúncio" numa coluna com 300 cards. */
  const [soPediram, setSoPediram] = useState(false);
  const [busca, setBusca] = useState("");

  /* Qual das três placas do fim está aberta embaixo do quadro, se alguma. */
  const [saidaAberta, setSaidaAberta] = useState<Estagio | null>(null);
  const [colunaMovel, setColunaMovel] = useState<Estagio>("lista");
  const [arrastando, setArrastando] = useState<LeadPainel | null>(null);
  /* O id do card que acabou de ser solto, pelo tempo do carimbo. Ele existe
     só para a animação de aterrissagem: sem ele, o card recém-movido nasce
     na coluna nova sem nenhum gesto, e o único jeito de saber que a
     movimentação pegou é reconhecer o nome no lugar novo. */
  const [assentando, setAssentando] = useState<string | null>(null);
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [fechando, setFechando] = useState<LeadPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const quadroRef = useRef<HTMLDivElement>(null);
  const saidaRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const fecharPaineis = (evento: PointerEvent) => {
      for (const detalhe of quadroRef.current?.querySelectorAll<HTMLDetailsElement>(
        "details[data-ferramenta][open]",
      ) ?? [])
        if (!detalhe.contains(evento.target as Node)) detalhe.open = false;
    };
    const escapar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      for (const detalhe of quadroRef.current?.querySelectorAll<HTMLDetailsElement>(
        "details[data-ferramenta][open]",
      ) ?? []) {
        detalhe.open = false;
        if (detalhe.contains(document.activeElement))
          detalhe.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", fecharPaineis);
    document.addEventListener("keydown", escapar);
    return () => {
      document.removeEventListener("pointerdown", fecharPaineis);
      document.removeEventListener("keydown", escapar);
    };
  }, []);
  useEffect(() => {
    if (!saidaAberta) return;
    saidaRef.current?.focus({ preventScroll: true });
    saidaRef.current?.scrollIntoView({ block: "nearest" });
  }, [saidaAberta]);
  function fecharSaida() {
    const anterior = saidaAberta;
    setSaidaAberta(null);
    quadroRef.current
      ?.querySelector<HTMLButtonElement>(`[data-resultado="${anterior}"]`)
      ?.focus({ preventScroll: true });
    quadroRef.current?.scrollIntoView({ block: "start" });
  }
  const [ampliado, setAmpliado] = useState(false);
  useEffect(() => {
    const atualizar = () =>
      setAmpliado(document.fullscreenElement === quadroRef.current);
    document.addEventListener("fullscreenchange", atualizar);
    return () => document.removeEventListener("fullscreenchange", atualizar);
  }, []);
  async function ampliar() {
    try {
      if (document.fullscreenElement === quadroRef.current)
        await document.exitFullscreen();
      else if (quadroRef.current?.requestFullscreen)
        await quadroRef.current.requestFullscreen();
    } catch {
      setErro("Não foi possível ampliar o quadro neste navegador.");
    }
  }
  const [salvando, comecar] = useTransition();

  /* `distance: 6` é o que permite o card ser ao mesmo tempo arrastável e
     clicável: sem a folga, o clique no nome do lead viraria um arrasto de
     zero pixel e o link nunca abriria. */
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: coordenadasDoQuadro,
    }),
  );

  const baseFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return leads.filter((l) => {
      if (tipo && l.tipo_projeto !== tipo) return false;
      if (origem && l.origem !== origem) return false;
      if (nicho && l.nicho !== nicho) return false;
      if (anuncio && l.anuncio !== anuncio) return false;
      if (soPediram && !procurouOEstudio(l)) return false;
      if (!termo) return true;
      /* A busca varre o que a pessoa lembra na hora: nome, empresa, perfil,
         nicho e o próprio próximo passo, que costuma ser onde está a frase
         que ficou na cabeça ("mandar o orçamento da joalheria"). */
      return [
        l.nome,
        l.empresa,
        l.instagram,
        l.nicho,
        l.cidade,
        l.proximo_passo,
      ]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo));
    });
  }, [leads, tipo, origem, nicho, anuncio, soPediram, busca]);

  const filtrados = useMemo(
    () => baseFiltrados.filter((l) => noFoco(l, foco, hoje)),
    [baseFiltrados, foco, hoje],
  );

  const porColuna = useMemo(() => {
    const mapa = {} as Record<Estagio, LeadPainel[]>;
    for (const e of ESTAGIOS) mapa[e] = [];
    for (const l of filtrados) mapa[l.estagio]?.push(l);
    // Prioridade filtra a operação; resultados e pausas continuam consultáveis.
    for (const e of ESTAGIOS_DE_PLACA)
      mapa[e] = baseFiltrados.filter((l) => l.estagio === e);
    for (const e of ESTAGIOS) mapa[e] = ordenarColuna(mapa[e]);
    return mapa;
  }, [filtrados, baseFiltrados]);

  /* ---------- O PLACAR DA FAIXA ----------
     Três números, e cada um responde uma pergunta diferente sobre o mesmo
     quadro: quanto tem de pé, quanto já está com preço na mesa, e quantos
     estão parados esperando uma decisão minha.

     Ele conta o quadro FILTRADO e não o banco inteiro: a faixa descreve o
     que está na tela. Filtrar por "joalheria" e continuar vendo o total da
     casa seria um placar de outra partida. */
  const placar = useMemo(
    () => resumoPipeline(baseFiltrados, hoje),
    [baseFiltrados, hoje],
  );

  /* ---------- A ESCALA DA RÉGUA DE CARGA ----------
     A referência é a etapa MAIS CARREGADA, e não o total do pipeline. Com o
     total, sete etapas dividem 100% e nenhuma passa de um risco de 20%: sete
     réguas quase vazias não desenham forma nenhuma. Contra a maior, o perfil
     aparece, e a leitura que interessa ("onde o dinheiro empoçou") é
     justamente relativa. O valor absoluto continua escrito ao lado, na soma
     da placa. */
  /* ---------- O QUE ESTE CARD LEVA CONSIGO ----------
     A exigência que TODAS as sete colunas fazem do lead no ar. Ela não é
     condição de destino nenhum, é falta do próprio lead, e por isso é o
     card em voo que a carrega. O que sobra para cada coluna dizer é só o
     que é notícia naquela coluna: sem esta subtração, arrastar um lead sem
     próximo passo pintava as sete placas com a mesma frase e a linha rosa
     deixava de servir para escolher coluna. */
  const exigenciaComum = useMemo(
    () => (arrastando ? exigenciaDeTodas(ESTAGIOS_DO_QUADRO, arrastando) : []),
    [arrastando],
  );

  /* O que cada destino ainda cobra depois de tirada a parte que o card já
     leva consigo. As duas saídas ficam de fora da subtração de propósito:
     ganho e perdido não são etapas do caminho, e o que elas pedem (valor,
     data, motivo) nunca é o que as colunas pedem. */
  const pedeNaColuna = (estagio: Estagio) => {
    if (!arrastando) return "";
    return oQuePede(
      oQueFalta(estagio, arrastando).filter((c) => !exigenciaComum.includes(c)),
    );
  };

  /* ---------- onde o card cai, e com que posição ----------
     Devolve o estágio de destino e o número que vai para a coluna
     `posicao`. Separado do resto porque é a única conta do arrasto, e
     conta errada aqui é card que volta para o lugar errado no refresh. */
  function destinoDoArrasto(leadId: string, sobre: string) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return null;

    const estagio: Estagio = sobre.startsWith("col:")
      ? (sobre.slice(4) as Estagio)
      : (leads.find((l) => l.id === sobre)?.estagio ?? lead.estagio);

    /* A coluna SEM o card arrastado: incluí-lo faria a média ser calculada
       contra a própria posição antiga e o card ficaria preso no lugar. */
    const posicao = posicaoAoSoltar(
      porColuna[estagio],
      leadId,
      sobre.startsWith("col:") ? null : sobre,
    );
    return { lead, estagio, posicao };
  }

  /* O carimbo dura o tempo do próprio keyframe e some. `assentando` na
     dependência (e não `[]`) para dois arrastos seguidos do MESMO card
     rearmarem o relógio em vez de o segundo nascer sem gesto. */
  useEffect(() => {
    if (!assentando) return;
    const relogio = setTimeout(() => setAssentando(null), 320);
    return () => clearTimeout(relogio);
  }, [assentando]);

  /* ---------- aplicar: otimismo primeiro, rollback se der errado ---------- */
  function aplicar(
    lead: LeadPainel,
    estagio: Estagio,
    posicao: number,
    passagem: Passagem = {},
  ) {
    const antes = leads;
    setErro(null);
    setAssentando(lead.id);

    setLeads((atual) =>
      atual.map((l) =>
        l.id === lead.id
          ? {
              ...l,
              estagio,
              posicao,
              ...(passagem as Partial<LeadPainel>),
              /* O contador de dias no estágio zera na hora, igual ao que o
                 trigger do banco vai fazer. Sem isto, um card movido
                 continuaria mostrando "frio: 22 dias parado" até o próximo
                 carregamento, bem no momento em que deixou de ser verdade. */
              entrou_no_estagio_em:
                estagio !== l.estagio
                  ? new Date().toISOString()
                  : l.entrou_no_estagio_em,
            }
          : l,
      ),
    );

    comecar(async () => {
      const r = await moverLead(lead.id, estagio, posicao, passagem);
      if (r.ok) {
        setPendente(null);
        return;
      }
      setLeads(antes);
      if ("falta" in r) {
        /* O servidor recusou por campo faltando e a tela achava que estava
           tudo certo. Acontece quando a aba está aberta há muito tempo e o
           lead mudou em outro lugar: em vez de um erro seco, abre o modal
           pedindo o que ele pediu. */
        setPendente({ lead, estagio, posicao, falta: r.falta });
      } else {
        setErro(r.erro);
      }
    });
  }

  function aoSoltar(evento: DragEndEvent) {
    setArrastando(null);
    const { active, over } = evento;
    if (!over) return;

    const destino = destinoDoArrasto(String(active.id), String(over.id));
    if (!destino) return;

    const { lead, estagio, posicao } = destino;
    if (lead.estagio === estagio && lead.posicao === posicao) return;

    /* Ganho passa pelo "Fechou" (06/10): o plano de pagamento nasce junto,
       senão a venda não chega no Caixa. */
    if (estagio === "ganho" && lead.estagio !== "ganho") {
      setFechando(lead);
      return;
    }

    const falta = oQueFalta(estagio, lead);
    if (falta.length) {
      setPendente({ lead, estagio, posicao, falta });
      return;
    }
    aplicar(lead, estagio, posicao);
  }

  /* O caminho do <select> do card: mesmo fluxo, sem arrasto. O card vai
     para o fim da coluna de destino, que é onde ele estaria se tivesse sido
     solto no espaço vazio. */
  function trocarEstagio(lead: LeadPainel, estagio: Estagio) {
    if (estagio === lead.estagio) return;
    const alvo = porColuna[estagio].filter((l) => l.id !== lead.id);
    const posicao = posicaoEntre(alvo[alvo.length - 1]?.posicao ?? null, null);

    if (estagio === "ganho") {
      setFechando(lead);
      return;
    }

    const falta = oQueFalta(estagio, lead);
    if (falta.length) {
      setPendente({ lead, estagio, posicao, falta });
      return;
    }
    aplicar(lead, estagio, posicao);
  }

  const limparFiltros = () => {
    setFoco("todos");
    setTipo("");
    setOrigem("");
    setNicho("");
    setAnuncio("");
    setSoPediram(false);
    setBusca("");
  };
  const filtrando = Boolean(
    foco !== "todos" ||
    tipo ||
    origem ||
    nicho ||
    anuncio ||
    soPediram ||
    busca.trim(),
  );
  const numeroFiltros = [tipo, origem, nicho, anuncio, soPediram].filter(
    Boolean,
  ).length;
  const pediram = useMemo(() => leads.filter(procurouOEstudio).length, [leads]);

  function navegarEtapa(etapa: Estagio) {
    if (saidaAberta) fecharSaida();
    setColunaMovel(etapa);
    const quadro = rolagemRef.current;
    const coluna = quadro?.querySelector<HTMLElement>(
      `[data-coluna="${etapa}"]`,
    );
    if (quadro && coluna)
      quadro.scrollTo({
        left:
          quadro.scrollLeft +
          coluna.getBoundingClientRect().left -
          quadro.getBoundingClientRect().left -
          12,
        behavior: "instant",
      });
  }
  return (
    <div
      ref={quadroRef}
      className={p.painel}
      data-pipeline
      data-saida-aberta={Boolean(saidaAberta)}
    >
      <div className={p.topo}>
        <header className={p.cabecalho}>
          <div>
            <span className={p.sobretitulo}>Estúdio e vendas</span>
            <h1>
              Pipeline de vendas<span>.</span>
            </h1>
            <p>Da primeira conversa ao projeto fechado.</p>
          </div>
          <div className={p.acoesCabecalho}>
            <button
              type="button"
              className={`${p.botao} ${p.botaoSecundario} ${p.expandir}`}
              aria-pressed={ampliado}
              onClick={ampliar}
            >
              <IconePipeline nome="expandir" />
              {ampliado ? "Sair da tela cheia" : "Ampliar"}
            </button>
            <button
              type="button"
              className={`${p.botao} ${p.botaoPrimario}`}
              onClick={() => setNovo(true)}
            >
              <IconePipeline nome="mais" />
              Novo lead
            </button>
          </div>
        </header>

        <div
          className={p.indicadores}
          aria-label="Resumo das oportunidades nesta seleção"
        >
          <div className={p.indicador} data-cor="verde">
            <span className={p.iconeIndicador}>
              <IconePipeline nome="dinheiro" />
            </span>
            <div>
              <span>Em aberto</span>
              <strong>{valorPipeline(placar.aberto)}</strong>
              <small>
                {placar.ativos}{" "}
                {placar.ativos === 1 ? "oportunidade" : "oportunidades"} no funil
              </small>
            </div>
          </div>
          <div className={p.indicador} data-cor="azul">
            <span className={p.iconeIndicador}>
              <IconePipeline nome="proposta" />
            </span>
            <div>
              <span>Proposta e negociação</span>
              <strong>{valorPipeline(placar.naMesa)}</strong>
              <small>
                {placar.propostas}{" "}
                {placar.propostas === 1
                  ? "proposta em andamento"
                  : "propostas em andamento"}
              </small>
            </div>
          </div>
          <div className={p.indicador} data-cor="ambar">
            <span className={p.iconeIndicador}>
              <IconePipeline nome="relogio" />
            </span>
            <div>
              <span>Para fazer hoje</span>
              <strong>
                {placar.hoje}
                <em> {placar.hoje === 1 ? "contato" : "contatos"}</em>
              </strong>
              <small>
                {placar.atrasados}{" "}
                {placar.atrasados === 1 ? "atrasado" : "atrasados"} ·{" "}
                {placar.semPasso} sem data
              </small>
            </div>
          </div>
        </div>
      </div>

      <div className={p.ferramentas}>
        <label className={p.busca}>
          <IconePipeline nome="busca" />
          <span className={p.srOnly}>Buscar no pipeline</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, empresa ou próxima ação"
          />
        </label>
        <label className={p.saltoEtapa}>
          <span className={p.srOnly}>Ir para etapa</span>
          <select
            value=""
            onChange={(e) => navegarEtapa(e.target.value as Estagio)}
          >
            <option value="" disabled>
              Ir para etapa…
            </option>
            {ESTAGIOS_DO_QUADRO.map((e) => (
              <option key={e} value={e}>
                {NOME_ESTAGIO[e]} · {porColuna[e].length}
              </option>
            ))}
          </select>
        </label>
        <details className={p.filtrosAvancados} data-ferramenta>
          <summary>
            <IconePipeline nome="filtros" />
            Filtros{numeroFiltros > 0 && <b>{numeroFiltros}</b>}
          </summary>
          <div className={p.filtros}>
            {pediram > 0 && (
              <button
                type="button"
                className={`${p.botao} ${soPediram ? p.filtroLigado : ""}`}
                aria-pressed={soPediram}
                onClick={() => setSoPediram((v) => !v)}
              >
                Anúncio e site · {pediram}
              </button>
            )}
            <Filtro
              rotulo="Tipo de projeto"
              valor={tipo}
              aoMudar={setTipo}
              vazio="Todos"
            >
              {TIPOS_PROJETO.map((t) => (
                <option key={t} value={t}>
                  {NOME_TIPO[t]}
                </option>
              ))}
            </Filtro>
            <Filtro
              rotulo="Origem"
              valor={origem}
              aoMudar={setOrigem}
              vazio="Todas"
            >
              {ORIGENS.map((o) => (
                <option key={o} value={o}>
                  {NOME_ORIGEM[o]}
                </option>
              ))}
            </Filtro>
            <Filtro
              rotulo="Nicho"
              valor={nicho}
              aoMudar={setNicho}
              vazio="Todos"
            >
              {nichos.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Filtro>
            {anuncios.length > 0 && (
              <Filtro
                rotulo="Anúncio"
                valor={anuncio}
                aoMudar={setAnuncio}
                vazio="Todos"
              >
                {anuncios.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Filtro>
            )}
          </div>
        </details>
        <details className={p.prospeccao} data-ferramenta>
          <summary>
            <IconePipeline nome="pessoas" />
            Prospecção
          </summary>
          <div>
            <PesquisaLote leads={porColuna.lista} />
          </div>
        </details>
      </div>
      {erro && (
        <p role="alert" className={p.erro}>
          {erro}
        </p>
      )}

      <DndContext
        id="quadro-crm"
        sensors={sensores}
        collisionDetection={closestCorners}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Para mover um lead, foque o botão Arrastar e pressione espaço. Use as setas para escolher o destino, espaço para soltar e Escape para cancelar. Você também pode usar Mover para no card.",
          },
        }}
        onDragStart={(e: DragStartEvent) =>
          setArrastando(leads.find((l) => l.id === e.active.id) ?? null)
        }
        onDragCancel={() => setArrastando(null)}
        onDragEnd={aoSoltar}
      >
        <div className={p.operacao}>
          <div className={p.linhaFoco}>
            <div className={p.focos} aria-label="Prioridade dos contatos">
              {(
                [
                  ["todos", "Todos", placar.ativos],
                  ["hoje", "Para hoje", placar.hoje],
                  ["atrasados", "Atrasados", placar.atrasados],
                  ["sem_passo", "Sem próxima data", placar.semPasso],
                ] as [FocoPipeline, string, number][]
              ).map(([valor, rotulo, total]) => (
                <button
                  key={valor}
                  type="button"
                  data-foco={valor}
                  aria-pressed={foco === valor}
                  onClick={() => setFoco(valor)}
                >
                  {rotulo}
                  <span>{total}</span>
                </button>
              ))}
            </div>
            <div className={p.resultadoBusca} aria-live="polite">
              {filtrando
                ? `${filtrados.length} de ${leads.length} leads`
                : `${placar.ativos} oportunidades em aberto`}
              {filtrando && (
                <button type="button" onClick={limparFiltros}>
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
          <div
            className={p.resultados}
            aria-label="Resultados e contatos pausados"
          >
            {ESTAGIOS_DE_PLACA.map((estagio) => (
              <PlacaDeSaida
                key={estagio}
                estagio={estagio}
                leads={porColuna[estagio]}
                aberta={saidaAberta === estagio}
                pede={
                  arrastando ? oQuePede(oQueFalta(estagio, arrastando)) : ""
                }
                aoAbrir={() =>
                  setSaidaAberta(saidaAberta === estagio ? null : estagio)
                }
              />
            ))}
          </div>
        </div>
        <nav className={p.etapas} aria-label="Navegar pelas etapas do funil">
          {ESTAGIOS_DO_QUADRO.map((e, i) => (
            <button
              key={e}
              type="button"
              data-etapa={e}
              data-atual={colunaMovel === e}
              aria-label={`${NOME_ESTAGIO[e]}, ${porColuna[e].length} leads. Mostrar etapa.`}
              onClick={() => navegarEtapa(e)}
            >
              <span className={p.numeroEtapa}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{NOME_ESTAGIO[e]}</span>
              <b>{porColuna[e].length}</b>
            </button>
          ))}
        </nav>
        <div
          ref={rolagemRef}
          className={p.quadro}
          role="region"
          aria-label="Quadro de oportunidades"
          tabIndex={0}
          aria-busy={salvando}
          data-arrastando={Boolean(arrastando)}
        >
          {ESTAGIOS_DO_QUADRO.map((estagio, i) => (
            <Coluna
              key={estagio}
              estagio={estagio}
              indice={i}
              leads={porColuna[estagio]}
              hoje={hoje}
              assentando={assentando}
              pede={pedeNaColuna(estagio)}
              visivelNoCelular={colunaMovel === estagio}
              aoTrocarEstagio={trocarEstagio}
              desabilitado={salvando}
              arrastando={Boolean(arrastando)}
              filtrando={filtrando}
              aoNovo={() => setNovo(true)}
            />
          ))}
        </div>
        <div className={p.notaQuadro}>
          <span>
            <span className={p.notaDesktop}>
              Arraste pelos seis pontos ou use{" "}
            </span>
            <span className={p.notaMobile}>Use </span>“Mover para” no card para
            mudar de etapa.
          </span>
          {salvando ? (
            <span role="status">Salvando mudança…</span>
          ) : (
            <span>Valores estimados, antes do fechamento.</span>
          )}
        </div>
        <DragOverlay>
          {arrastando && (
            <CardVoando
              lead={arrastando}
              hoje={hoje}
              falta={oQuePede(exigenciaComum, "Falta")}
            />
          )}
        </DragOverlay>
        {saidaAberta && (
          <section
            ref={saidaRef}
            tabIndex={-1}
            className={p.saidaLista}
            aria-label={NOME_ESTAGIO[saidaAberta]}
            data-etapa={saidaAberta}
          >
            <div className={p.saidaCabeca}>
              <div>
                <h2>
                  {NOME_ESTAGIO[saidaAberta]}{" "}
                  <span>{porColuna[saidaAberta].length}</span>
                </h2>
                <p>{ETAPAS_VISUAIS[saidaAberta].descricao}</p>
              </div>
              <button type="button" className={p.botao} onClick={fecharSaida}>
                Fechar lista
              </button>
            </div>
            {porColuna[saidaAberta].length === 0 ? (
              <p className={p.nota}>{ETAPAS_VISUAIS[saidaAberta].vazio}</p>
            ) : (
              <SortableContext
                items={porColuna[saidaAberta].map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className={p.saidaGrade}>
                  {porColuna[saidaAberta].map((lead) => (
                    <CardLead
                      key={lead.id}
                      lead={lead}
                      hoje={hoje}
                      assentando={assentando === lead.id}
                      aoTrocarEstagio={trocarEstagio}
                      desabilitado={salvando}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </section>
        )}
      </DndContext>
      {pendente && (
        <ModalPassagem
          nomeLead={pendente.lead.nome}
          estagio={pendente.estagio}
          falta={pendente.falta}
          salvando={salvando}
          aoCancelar={() => setPendente(null)}
          aoConfirmar={(passagem) =>
            aplicar(pendente.lead, pendente.estagio, pendente.posicao, passagem)
          }
        />
      )}
      {fechando && (
        <ModalContrato
          lead={fechando}
          hoje={hoje}
          ganhar
          aoFechar={() => setFechando(null)}
        />
      )}
      {novo && <ModalNovoLead aoFechar={() => setNovo(false)} />}
    </div>
  );
}

function Filtro({
  rotulo,
  valor,
  vazio,
  aoMudar,
  children,
}: {
  rotulo: string;
  valor: string;
  vazio: string;
  aoMudar: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className={p.filtro}>
      <span>{rotulo}</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">{vazio}</option>
        {children}
      </select>
    </label>
  );
}

function Coluna({
  estagio,
  indice,
  leads,
  hoje,
  assentando,
  pede,
  visivelNoCelular,
  aoTrocarEstagio,
  desabilitado,
  arrastando,
  filtrando,
  aoNovo,
}: {
  estagio: Estagio;
  indice: number;
  leads: LeadPainel[];
  hoje: string;
  assentando: string | null;
  pede: string;
  visivelNoCelular: boolean;
  aoTrocarEstagio: (lead: LeadPainel, estagio: Estagio) => void;
  desabilitado: boolean;
  arrastando: boolean;
  filtrando: boolean;
  aoNovo: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: idDaColuna(estagio),
    data: { estagio },
    disabled: desabilitado,
  });
  const soma = leads.reduce((s, l) => s + Number(l.ticket_estimado ?? 0), 0);
  const pedindo = leads.filter((l) =>
    ["atrasado", "sem_passo"].includes(urgencia(l, hoje)),
  ).length;
  return (
    <section
      className={p.coluna}
      data-etapa={estagio}
      data-coluna={estagio}
      data-visivel={visivelNoCelular}
      aria-label={`${NOME_ESTAGIO[estagio]}: ${leads.length} leads`}
    >
      <header className={p.colunaCab}>
        <div className={p.colunaTitulo}>
          <span className={p.pontoEtapa} />
          <h2>{NOME_ESTAGIO[estagio]}</h2>
          <span className={p.contagem}>{leads.length}</span>
        </div>
        <p>{ETAPAS_VISUAIS[estagio].descricao}</p>
        <div className={p.colunaResumo}>
          <b>{valorPipeline(soma)}</b>
          {pedindo > 0 ? (
            <span>
              <i />
              {pedindo} {pedindo === 1 ? "pede" : "pedem"} atenção
            </span>
          ) : (
            <span>{String(indice + 1).padStart(2, "0")} / 07</span>
          )}
        </div>
      </header>
      <div
        ref={setNodeRef}
        className={`${p.colunaLista} ${isOver ? p.alvo : ""}`}
      >
        {pede && <p className={p.exigencia}>{pede}</p>}
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <CardLead
              key={lead.id}
              lead={lead}
              hoje={hoje}
              assentando={assentando === lead.id}
              aoTrocarEstagio={aoTrocarEstagio}
              desabilitado={desabilitado}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className={p.vazio}>
            <span className={p.vazioIcone}>
              <IconePipeline nome={arrastando ? "mais" : "pessoas"} />
            </span>
            <b>
              {arrastando
                ? "Solte o lead aqui"
                : filtrando
                  ? "Nenhum lead neste filtro"
                  : "O próximo passo acontece aqui"}
            </b>
            <p>
              {filtrando
                ? "Ajuste a busca ou os filtros para ver mais contatos."
                : ETAPAS_VISUAIS[estagio].vazio}
            </p>
            {estagio === "lista" && !filtrando && !arrastando && (
              <button type="button" onClick={aoNovo}>
                <IconePipeline nome="mais" />
                Adicionar lead
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
function PlacaDeSaida({
  estagio,
  leads,
  aberta,
  pede,
  aoAbrir,
}: {
  estagio: Estagio;
  leads: LeadPainel[];
  aberta: boolean;
  pede: string;
  aoAbrir: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: idDaColuna(estagio),
    data: { estagio },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      data-etapa={estagio}
      data-resultado={estagio}
      data-alvo={isOver}
      className={p.resultado}
      aria-expanded={aberta}
      onClick={aoAbrir}
      title={pede || ETAPAS_VISUAIS[estagio].descricao}
    >
      <IconePipeline
        nome={
          estagio === "ganho"
            ? "ganho"
            : estagio === "perdido"
              ? "perdido"
              : "geladeira"
        }
      />
      <span>{NOME_ESTAGIO[estagio]}</span>
      <b>{leads.length}</b>
      {pede && <small>{pede}</small>}
    </button>
  );
}
