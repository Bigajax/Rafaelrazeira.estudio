"use client";

/* ============================================================
   O KANBAN

   Sete colunas de caminho e três placas de saída no fim, arrasto entre
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

import { useEffect, useMemo, useState, useTransition } from "react";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { moverLead } from "@/app/crm/acoes";
import {
  dinheiroCurto,
  exigenciaDeTodas,
  oQueFalta,
  oQuePede,
  ordenarColuna,
  posicaoEntre,
  urgencia,
  type CampoExigido,
  type Passagem,
} from "@/lib/crm/regras";
import {
  ehNoPipeline,
  ESTAGIOS,
  ESTAGIOS_DO_QUADRO,
  ESTAGIOS_DE_PLACA,
  NOME_ESTAGIO,
  NOME_ORIGEM,
  NOME_TIPO,
  NOTA_ESTAGIO,
  ORIGENS,
  TIPOS_PROJETO,
  type Estagio,
  type LeadPainel,
} from "@/lib/crm/tipos";
import { CardLead, CardVoando } from "./CardLead";
import { ModalNovoLead } from "./ModalNovoLead";
import { ModalPassagem } from "./ModalPassagem";
import { PesquisaLote } from "./PesquisaLote";
import s from "@/app/crm/crm.module.css";

const idDaColuna = (e: Estagio) => `col:${e}`;

type Pendente = {
  lead: LeadPainel;
  estagio: Estagio;
  posicao: number;
  falta: CampoExigido[];
};

export function Quadro({
  leads: doServidor,
  nichos,
  hoje,
}: {
  leads: LeadPainel[];
  nichos: string[];
  hoje: string;
}) {
  /* Cópia local, porque o arrasto precisa mexer na tela antes de o servidor
     responder. Ela é substituída toda vez que o servidor manda dado novo
     (o `revalidatePath` de cada ação), e é isso que faz a verdade continuar
     sendo a do banco: o otimismo dura o tempo de uma requisição. */
  const [leads, setLeads] = useState(doServidor);
  useEffect(() => setLeads(doServidor), [doServidor]);

  const [tipo, setTipo] = useState("");
  const [origem, setOrigem] = useState("");
  const [nicho, setNicho] = useState("");
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
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [salvando, comecar] = useTransition();

  /* `distance: 6` é o que permite o card ser ao mesmo tempo arrastável e
     clicável: sem a folga, o clique no nome do lead viraria um arrasto de
     zero pixel e o link nunca abriria. */
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return leads.filter((l) => {
      if (tipo && l.tipo_projeto !== tipo) return false;
      if (origem && l.origem !== origem) return false;
      if (nicho && l.nicho !== nicho) return false;
      if (!termo) return true;
      /* A busca varre o que a pessoa lembra na hora: nome, empresa, perfil,
         nicho e o próprio próximo passo, que costuma ser onde está a frase
         que ficou na cabeça ("mandar o orçamento da joalheria"). */
      return [l.nome, l.empresa, l.instagram, l.nicho, l.cidade, l.proximo_passo]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(termo));
    });
  }, [leads, tipo, origem, nicho, busca]);

  const porColuna = useMemo(() => {
    const mapa = {} as Record<Estagio, LeadPainel[]>;
    for (const e of ESTAGIOS) mapa[e] = [];
    for (const l of filtrados) mapa[l.estagio]?.push(l);
    for (const e of ESTAGIOS) mapa[e] = ordenarColuna(mapa[e]);
    return mapa;
  }, [filtrados]);

  /* ---------- O PLACAR DA FAIXA ----------
     Três números, e cada um responde uma pergunta diferente sobre o mesmo
     quadro: quanto tem de pé, quanto já está com preço na mesa, e quantos
     estão parados esperando uma decisão minha.

     Ele conta o quadro FILTRADO e não o banco inteiro: a faixa descreve o
     que está na tela. Filtrar por "joalheria" e continuar vendo o total da
     casa seria um placar de outra partida. */
  const placar = useMemo(() => {
    let aberto = 0;
    let naMesa = 0;
    let esperando = 0;

    for (const l of filtrados) {
      /* `ehNoPipeline` e não `ehAtivo`: a geladeira é ativa (ela devolve o
         lead na fila do dia) mas não é pipeline aberto. O ticket de quem
         pediu para ser chamado em novembro somado aqui faria a faixa
         prometer um número que ninguém está perseguindo neste ciclo, e o
         "esperando" contaria como decisão pendente um lead cuja decisão
         já foi tomada: esperar. */
      if (!ehNoPipeline(l.estagio)) continue;
      aberto += l.ticket_estimado ?? 0;
      if (l.estagio === "proposta" || l.estagio === "negociacao") naMesa += l.ticket_estimado ?? 0;
      const u = urgencia(l, hoje);
      if (u === "atrasado" || u === "sem_passo") esperando += 1;
    }

    return { aberto, naMesa, esperando };
  }, [filtrados, hoje]);

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
    return oQuePede(oQueFalta(estagio, arrastando).filter((c) => !exigenciaComum.includes(c)));
  };

  const cargaMaxima = useMemo(
    () =>
      Math.max(
        0,
        ...ESTAGIOS_DO_QUADRO.map((e) =>
          porColuna[e].reduce((t, l) => t + (l.ticket_estimado ?? 0), 0),
        ),
      ),
    [porColuna],
  );

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
    const alvo = porColuna[estagio].filter((l) => l.id !== leadId);
    const indice = sobre.startsWith("col:") ? alvo.length : Math.max(0, alvo.findIndex((l) => l.id === sobre));

    const posicao = posicaoEntre(alvo[indice - 1]?.posicao ?? null, alvo[indice]?.posicao ?? null);
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
  function aplicar(lead: LeadPainel, estagio: Estagio, posicao: number, passagem: Passagem = {}) {
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
                estagio !== l.estagio ? new Date().toISOString() : l.entrou_no_estagio_em,
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

    const falta = oQueFalta(estagio, lead);
    if (falta.length) {
      setPendente({ lead, estagio, posicao, falta });
      return;
    }
    aplicar(lead, estagio, posicao);
  }

  const limparFiltros = () => {
    setTipo("");
    setOrigem("");
    setNicho("");
    setBusca("");
  };
  const filtrando = Boolean(tipo || origem || nicho || busca.trim());

  return (
    <div className={s.wrapLargo}>
      <div className={s.tituloLinha}>
        <h1>
          Pipeline<i className={s.ponto}>.</i>
        </h1>
        {/* ---------- por que ESTE botão é rosa ----------
            Regra da casa: o rosa é a cor do que ABRE alguma coisa. Numa
            ferramenta de prospecção, o que abre alguma coisa é anotar um
            lead novo: tudo o mais nesta tela mexe em negócio que já existe.
            É o único botão rosa do CRM inteiro, e ele é o mesmo em todas as
            telas onde aparece. */}
        <button type="button" className={s.btnAcao} onClick={() => setNovo(true)}>
          Anotar lead
        </button>
      </div>

      {/* ============================================================
          A FAIXA DE STATUS

          O pipeline era a única tela do CRM sem ela, e a ausência aparecia:
          a manchete caía direto na linha de busca e o topo não tinha peso
          nenhum. A faixa é o objeto mais pesado da casa (tinta cheia
          sangrando pela margem esquerda até encostar no trilho) e ela existe
          no painel Hoje, no hero do /portfolio e na /vitrine-digital.

          Os três números não repetem os do quadro: as placas dizem quanto
          tem em CADA etapa, a faixa diz o que o quadro inteiro soma. E
          "Esperando você" é o único que não é dinheiro, de propósito: ele é
          a pergunta que faz alguém abrir esta tela.
          ============================================================ */}
      <div className={s.faixa}>
        <span className={s.faixaItem}>
          {/* O ponto que pulsa: a assinatura da casa, no tom claro porque
              aqui ele vive sobre grafite. Ele diz que os três números ao
              lado são os de agora, contados sobre o que está na tela. */}
          <i className={`${s.pontoVivo} ${s.pontoVivoClaro}`} aria-hidden />
          Em aberto
          <b className={s.faixaNum}>{dinheiroCurto(placar.aberto) || "R$ 0"}</b>
        </span>

        <span className={s.faixaItem}>
          Na mesa
          <b className={s.faixaNum}>{dinheiroCurto(placar.naMesa) || "R$ 0"}</b>
        </span>

        <span className={s.faixaItem}>
          Esperando você
          <b className={`${s.faixaNum} ${placar.esperando ? s.faixaAlerta : s.faixaVivo}`}>
            {placar.esperando}
          </b>
        </span>
      </div>

      {/* ============================================================
          A LINHA DE BUSCA

          Ela era uma caixa larga de contorno claro com três caixas iguais
          do lado: a única parte da tela com cara de formulário de sistema,
          bem no meio de uma página que é toda tinta sobre papel.

          Agora ela é uma LINHA ESCRITA. Nesta gramática não se escreve
          dentro de uma caixa, escreve-se sobre um filete: o rótulo vem em
          mono miúda na frente, o texto senta em cima de um traço de tinta,
          e os três filtros são a segunda linha do mesmo impresso.

          O QUE A FORMA PASSOU A DIZER: um filtro em uso fica com o filete
          em tinta cheia e o texto em preto; um filtro em repouso fica com
          o filete claro e o texto cinza. Dá para ver o que está ligado sem
          ler nenhuma palavra, e é o mesmo princípio do filete de margem da
          ficha, aplicado ao controle em vez de ao dado.
          ============================================================ */}
      <div className={s.impresso}>
        <label className={s.buscaLinha}>
          <span className={s.buscaRot}>Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="nome, empresa, nicho ou próximo passo"
          />
        </label>

        <div className={s.filtros}>
          <Filtro rotulo="Tipo" valor={tipo} aoMudar={setTipo} vazio="todos">
            {TIPOS_PROJETO.map((t) => (
              <option key={t} value={t}>
                {NOME_TIPO[t]}
              </option>
            ))}
          </Filtro>

          <Filtro rotulo="Origem" valor={origem} aoMudar={setOrigem} vazio="todas">
            {ORIGENS.map((o) => (
              <option key={o} value={o}>
                {NOME_ORIGEM[o]}
              </option>
            ))}
          </Filtro>

          <Filtro rotulo="Nicho" valor={nicho} aoMudar={setNicho} vazio="todos">
            {nichos.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Filtro>

          {/* ---------- O PLACAR, COM O PONTO PULSANTE ----------
              O ponto verde que pulsa é a assinatura registrada do estúdio:
              ele está no cabeçalho da /vitrine-digital, na faixa do
              /portfolio e no chip "NO AR" de cada card de lá. Trazê-lo para
              cá é o que faz esta linha ser da casa, e ele não é enfeite:
              ele diz que o número ao lado é o de agora, calculado sobre o
              que está na tela.

              Filtrando, o placar vira "3 DE 9" e ganha o botão de limpar.
              Sem ele, "não achei o lead" e "o filtro escondeu o lead" são a
              mesma tela vazia. */}
          <span className={s.placarBusca}>
            <i className={s.pontoVivo} aria-hidden />
            {filtrando ? (
              <>
                <b>{filtrados.length}</b> de {leads.length}
                <button type="button" className={s.recolher} onClick={limparFiltros}>
                  Limpar
                </button>
              </>
            ) : (
              <>
                <b>{leads.length}</b> {leads.length === 1 ? "lead" : "leads"} no quadro
              </>
            )}
          </span>
        </div>
      </div>

      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}

      {/* ---------- seletor de coluna do celular ----------
          As sete etapas do caminho viram sete chips com o contador dentro.
          Ganho, perdido e geladeira ficam de fora: eles não são coluna nem
          aqui nem no computador, são as três placas do fim do quadro, e
          elas continuam visíveis e clicáveis logo abaixo. */}
      <div className={s.chips} role="tablist" aria-label="Etapa do pipeline">
        {ESTAGIOS_DO_QUADRO.map((e) => (
          <button
            key={e}
            type="button"
            role="tab"
            aria-selected={colunaMovel === e}
            className={`${s.chip} ${colunaMovel === e ? s.chipAtivo : ""}`}
            onClick={() => setColunaMovel(e)}
          >
            {NOME_ESTAGIO[e]}
            <small>{porColuna[e].length}</small>
          </button>
        ))}
      </div>

      {/* O `id` fixo não é enfeite: sem ele o dnd-kit numera sozinho os
          `aria-describedby` de cada card, e o contador do servidor não é o
          mesmo do navegador. O resultado era um erro de hidratação em toda
          abertura do pipeline, com o React descartando o HTML do servidor e
          redesenhando o quadro inteiro. Com o id declarado, os dois lados
          geram a mesma sequência. */}
      <DndContext
        id="quadro-crm"
        sensors={sensores}
        collisionDetection={closestCorners}
        onDragStart={(e: DragStartEvent) =>
          setArrastando(leads.find((l) => l.id === e.active.id) ?? null)
        }
        onDragCancel={() => setArrastando(null)}
        onDragEnd={aoSoltar}
      >
        {/* ---------- o quadro ----------
            Sete colunas de caminho, e no fim as três placas de saída. O
            `.quadroCaixa` existe só para segurar o esmaecido da borda
            direita, que é o que diz "tem mais quadro para lá" sem depender
            de a pessoa notar uma barra de rolagem. */}
        {/* ---------- O QUADRO SÓ MOSTRA OS ALVOS COM UM CARD NO AR ----------
            O alvo de soltar da coluna vazia era desenhado o tempo todo, e o
            comentário dele dizia "silencioso quando ninguém está
            arrastando". Ele não era: seis retângulos tracejados de 62px num
            quadro de dois leads são a coisa mais presente da tela, e o que
            eles anunciavam era o próprio vazio, seis vezes.

            A classe entra no quadro inteiro e não em cada coluna porque a
            pergunta é do quadro ("há um card no ar?"), não de cada uma. */}
        <div className={s.quadroCaixa}>
          <div className={`${s.quadro} ${arrastando ? s.quadroEmVoo : ""}`}>
            {ESTAGIOS_DO_QUADRO.map((estagio) => (
              <Coluna
                key={estagio}
                estagio={estagio}
                leads={porColuna[estagio]}
                hoje={hoje}
                cargaMaxima={cargaMaxima}
                assentando={assentando}
                /* ---------- A MESA RESPONDE NA MÃO ----------
                   Com um card no ar, cada coluna escreve na própria placa o
                   que ELA ainda vai exigir DAQUELE lead. É a mesma
                   `oQueFalta` que o soltar consulta e que o servidor
                   confere: a coluna não está adivinhando, está adiantando a
                   resposta que já existia.

                   Sai vazio quando não falta nada ali, e coluna calada
                   continua mostrando a legenda normal. O silêncio é o "pode
                   soltar". */
                pede={pedeNaColuna(estagio)}
                visivelNoCelular={colunaMovel === estagio}
                aoTrocarEstagio={trocarEstagio}
              />
            ))}

            {/* Três placas e não duas desde 20/08: a geladeira entrou ao
                lado das duas saídas porque ela é a mesma natureza de coisa
                (não é etapa do caminho, é o que acontece com quem sai
                dele), com uma diferença que o filete tracejado diz: dela
                se volta, e sozinho, no dia marcado. */}
            <div className={s.placas}>
              {ESTAGIOS_DE_PLACA.map((estagio) => (
                <PlacaDeSaida
                  key={estagio}
                  estagio={estagio}
                  leads={porColuna[estagio]}
                  aberta={saidaAberta === estagio}
                  pede={arrastando ? oQuePede(oQueFalta(estagio, arrastando)) : ""}
                  aoAbrir={() => setSaidaAberta(saidaAberta === estagio ? null : estagio)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* O card em voo leva a exigência que vale em toda parte. É a única
            frase que a mão precisa ver o tempo todo: as colunas dizem o que
            muda de uma para outra, o card diz o que não muda em lugar
            nenhum. "Falta" e não "pede" porque aqui o sujeito é o lead. */}
        <DragOverlay>
          {arrastando ? (
            <CardVoando
              lead={arrastando}
              hoje={hoje}
              falta={oQuePede(exigenciaComum, "Falta")}
            />
          ) : null}
        </DragOverlay>

        {/* A saída aberta se estende EMBAIXO do quadro, em largura inteira, e
            não dentro de uma coluna de 220px. Ganho e perdido não são fila
            de trabalho: são histórico, e histórico se lê em lista larga. */}
        {saidaAberta ? (
          <section className={s.saidaLista} aria-label={NOME_ESTAGIO[saidaAberta]}>
            <h2 className={`${s.rotulo} ${saidaAberta === "ganho" ? s.rotuloHoje : ""}`}>
              {NOME_ESTAGIO[saidaAberta]}
              <span className={s.rotuloCont}>{porColuna[saidaAberta].length}</span>
              <button type="button" className={s.recolher} onClick={() => setSaidaAberta(null)}>
                Fechar
              </button>
            </h2>

            {porColuna[saidaAberta].length === 0 ? (
              <p className={s.blocoNota}>Nada por aqui neste filtro.</p>
            ) : (
              <div className={s.saidaGrade}>
                {/* Também em SortableContext: um card fechado continua
                    arrastável (é assim que um "perdido" volta para a
                    conversa quando a pessoa reaparece), e fora do contexto
                    o dnd-kit não sabe calcular a posição de origem. */}
                <SortableContext
                  items={porColuna[saidaAberta].map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {porColuna[saidaAberta].map((lead) => (
                    <CardLead
                      key={lead.id}
                      lead={lead}
                      hoje={hoje}
                      assentando={assentando === lead.id}
                      aoTrocarEstagio={trocarEstagio}
                    />
                  ))}
                </SortableContext>
              </div>
            )}
          </section>
        ) : null}
      </DndContext>

      {pendente ? (
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
      ) : null}

      {novo ? <ModalNovoLead aoFechar={() => setNovo(false)} /> : null}
    </div>
  );
}

/* ---------- um filtro da linha impressa ----------
   Rótulo em mono na frente, valor escrito sobre um filete. A opção vazia
   não diz "Todo tipo" (que soa como uma escolha entre outras): ela diz
   "todos", em minúscula, porque um campo em repouso é um campo que ainda
   não foi preenchido. */
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
    <label className={`${s.filtro} ${valor ? s.filtroAtivo : ""}`}>
      <span className={s.filtroRot}>{rotulo}</span>
      <select value={valor} onChange={(e) => aoMudar(e.target.value)}>
        <option value="">{vazio}</option>
        {children}
      </select>
    </label>
  );
}

/* ============================================================
   UMA COLUNA

   O cabeçalho é uma PLACA DE TINTA, e essa é a decisão que dá cara ao
   quadro. Antes ele era papel claro com um filete embaixo: correto,
   anônimo, e igual ao cabeçalho de qualquer tabela. Agora as sete placas
   pretas atravessam o topo do quadro como uma régua interrompida, que é o
   mesmo objeto da faixa de status do painel Hoje e do trilho da esquerda.
   A ferramenta inteira passa a ter um vocabulário só: tinta cheia onde o
   sistema fala, papel onde o trabalho acontece.

   Dentro da placa, a hierarquia é a da casa: nome em condensada branca,
   contagem em `--green-live` (o único esmeralda legível sobre grafite), e
   a soma em cinza-claro na mono. A legenda de duas ou três palavras
   embaixo diz o que a etapa é, porque "Lista" e "Prévia" são nomes que só
   significam alguma coisa para quem já usou.
   ============================================================ */
function Coluna({
  estagio,
  leads,
  hoje,
  cargaMaxima,
  assentando,
  pede,
  visivelNoCelular,
  aoTrocarEstagio,
}: {
  estagio: Estagio;
  leads: LeadPainel[];
  hoje: string;
  cargaMaxima: number;
  assentando: string | null;
  pede: string;
  visivelNoCelular: boolean;
  aoTrocarEstagio: (lead: LeadPainel, estagio: Estagio) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: idDaColuna(estagio) });
  const soma = leads.reduce((t, l) => t + (l.ticket_estimado ?? 0), 0);
  const carga = cargaMaxima > 0 ? Math.round((soma / cargaMaxima) * 100) : 0;

  /* ---------- A CONTAGEM É UM SINAL, NÃO SÓ UM NÚMERO ----------
     Ela era sempre esmeralda, dissesse o que dissesse. Agora ela é rosa
     quando aquela coluna tem alguém esperando (retorno vencido ou lead sem
     próximo passo), e esmeralda quando está tudo em dia.

     O efeito é que a fileira de placas pretas do topo vira uma barra de
     status: dá para varrer as sete e saber ONDE está o trabalho sem ler uma
     palavra e sem abrir coluna nenhuma. É o mesmo princípio do filete de
     margem da ficha, um nível acima, e é a única coisa que o rosa faz no
     quadro além do ponto final da manchete. */
  const pedindo = leads.filter((l) => {
    const u = urgencia(l, hoje);
    return u === "atrasado" || u === "sem_passo";
  }).length;

  return (
    <section
      className={s.coluna}
      /* No celular só uma coluna aparece por vez, e quem escolhe é o chip
         lá de cima. A escolha viaja como atributo de dado e o CSS resolve
         o resto: assim o mesmo HTML serve às duas larguras e nada depende
         de medir a tela no JavaScript, que é o que costuma piscar entre o
         primeiro e o segundo quadro. */
      data-visivel={visivelNoCelular ? "sim" : "nao"}
      aria-label={`${NOME_ESTAGIO[estagio]}: ${leads.length} leads`}
    >
      <header className={s.colunaCab}>
        <span className={s.colunaTopo}>
          <h2 className={s.colunaNome}>{NOME_ESTAGIO[estagio]}</h2>
          <span
            className={`${s.colunaCont} ${pedindo ? s.colunaPedindo : ""} ${!leads.length ? s.colunaZero : ""}`}
            title={pedindo ? `${pedindo} esperando você` : undefined}
          >
            {leads.length}
          </span>
          {soma ? <span className={s.colunaSoma}>{dinheiroCurto(soma)}</span> : null}
        </span>
        {/* A legenda dá lugar à exigência enquanto há um card no ar. Não é
            uma linha nova: é a MESMA linha dizendo a coisa que importa
            naquele segundo. Uma segunda linha faria a placa crescer e o
            quadro inteiro empurrar para baixo no instante em que a mão
            levanta, que é o pior momento possível para a tela se mexer. */}
        <span className={`${s.colunaNota} ${pede ? s.colunaPede : ""}`}>
          {pede || NOTA_ESTAGIO[estagio]}
        </span>

        {/* ---------- A RÉGUA DE CARGA ----------
            O filete no pé da placa enche na proporção do dinheiro desta
            etapa contra a etapa mais carregada do quadro. Sozinho ele é um
            detalhe; as sete placas lado a lado desenham o corte do funil em
            cima das colunas que ele descreve, e o mesmo traço atravessa os
            vãos entre elas.

            `aria-hidden` porque ele não acrescenta informação: o valor está
            escrito ao lado, na soma da placa, e o rótulo da coluna já leva a
            contagem. Ele é a forma do que já está dito. */}
        <span className={s.carga} aria-hidden>
          <i
            className={`${s.cargaFill} ${carga === 100 ? s.cargaMaior : ""}`}
            style={{ width: `${carga}%` }}
          />
        </span>
      </header>

      <div ref={setNodeRef} className={`${s.colunaLista} ${isOver ? s.colunaAlvo : ""}`}>
        {/* Só a Lista tem o lote: é onde lead importado aterrissa, e é o
            único lugar onde "pesquisar todo mundo" faz sentido. Nas outras
            colunas a conversa já começou e o dossiê se pede pela ficha. */}
        {estagio === "lista" ? <PesquisaLote leads={leads} /> : null}

        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <CardLead
              key={lead.id}
              lead={lead}
              hoje={hoje}
              assentando={assentando === lead.id}
              aoTrocarEstagio={aoTrocarEstagio}
            />
          ))}
        </SortableContext>

        {/* A coluna vazia não escreve "VAZIA". Cinco caixas cinzas repetindo
            a mesma palavra dominavam a tela de um CRM recém-aberto, e o zero
            já está dito na placa preta logo acima. O que fica é um alvo de
            soltar do tamanho de uma ficha: silencioso quando ninguém está
            arrastando, e acesa quando alguém está. */}
        {!leads.length ? <span className={s.colunaAlvoVazio} aria-hidden /> : null}
      </div>
    </section>
  );
}

/* ============================================================
   A PLACA DE SAÍDA — ganho, perdido e geladeira

   Elas eram colunas recolhidas: lombadas verticais de 52px com o nome
   deitado e um zero embaixo. Ocupavam a largura de duas etapas vivas para
   dizer dois números, e ninguém consegue ler texto girado de relance.

   Agora são placas empilhadas num slot só, no fim do quadro, e a forma diz
   o que elas são: não são etapas do caminho, são o que acontece com quem
   sai dele. Continuam sendo alvo de arrasto (é assim que um lead fecha), e
   o clique abre a lista inteira EMBAIXO do quadro, em largura cheia, que é
   como se lê histórico.

   O placar do ganho é o valor FECHADO, não o estimado: depois que o
   negócio aconteceu, a estimativa deixou de ser notícia. Perdido e
   geladeira não têm valor fechado nenhum, então os dois caem na legenda da
   etapa, que é o que se quer saber deles.

   ---------- a terceira, que entrou em 20/08 ----------
   A geladeira é a única daqui de onde o lead volta sozinho: ela é ATIVA, e
   por isso o painel Hoje devolve o lead na data marcada. O que a põe nesta
   fileira em vez de numa oitava coluna é a mesma pergunta que separou
   ganho e perdido das outras: coluna é o que se trabalha todo dia, e a
   geladeira é exatamente o que não se trabalha. O filete tracejado é o que
   diz que esta saída tem volta.
   ============================================================ */
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
  const { setNodeRef, isOver } = useDroppable({ id: idDaColuna(estagio) });
  const soma = leads.reduce((t, l) => t + (l.valor_fechado ?? 0), 0);
  const cor =
    estagio === "ganho" ? s.placaGanho : estagio === "geladeira" ? s.placaGelo : s.placaPerda;

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={aoAbrir}
      aria-expanded={aberta}
      className={`${s.placa} ${cor} ${isOver ? s.placaAlvo : ""} ${aberta ? s.placaAberta : ""}`}
    >
      <span className={s.placaNome}>{NOME_ESTAGIO[estagio]}</span>
      <b className={s.placaNum}>{leads.length}</b>
      {/* Com um card no ar, a linha de baixo troca o placar pela exigência.
          Estas duas são as que mais cobram (ganho quer valor e data,
          perdido quer o motivo), e ficarem caladas enquanto as sete colunas
          avisam leria como "aqui pode soltar". */}
      <span className={`${s.placaSoma} ${pede ? s.placaPede : ""}`}>
        {pede || (soma ? dinheiroCurto(soma) : NOTA_ESTAGIO[estagio])}
      </span>
    </button>
  );
}
