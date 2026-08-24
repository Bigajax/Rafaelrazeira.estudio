"use client";

/* ============================================================
   HOJE — a fila de execução, uma carta por vez

   Esta tela responde uma pergunta só: quem eu falo agora. E ela agora
   responde com UM nome.

   ---------- o que a lista custava ----------
   A versão anterior empilhava os três grupos em fichas de 60px numa coluna
   de 940px encostada na esquerda. Em qualquer monitor acima de 1400 isso
   deixava metade da tela em papel vazio, e o problema não era a largura: a
   pergunta ficava sem resposta. Nove nomes iguais empilhados não dizem por
   onde começar, eles PEDEM que alguém escolha, e escolher era exatamente o
   trabalho que a ordem de prioridade já tinha feito.

   ---------- a ordem (invertida em 24/08) ----------
   A fila é uma só, e a emenda dos três grupos é a ordem de prioridade:

   1. SEM PASSO  o lead novo, que ninguém tocou ainda. Era o último grupo
                 e virou o primeiro a pedido do Rafael: com trezentos nomes
                 do garimpo na fila, abrir o dia pelos atrasados significava
                 nunca chegar em quem ele importou para ligar. Lead novo
                 esfria por hora; atrasado já esperou dias e aguenta mais
                 uma manhã. O grupo continua sendo a rede embaixo do funil:
                 um lead criado direto (ou vindo do site) nunca é movido,
                 então nenhum modal jamais o pegaria.
   2. ATRASADO   quem já esperou. Dívida acumulando, inclusive cobrança de
                 parcela, que viaja no lead: quem precisa dela antes dos
                 novos chega pelo quadro, não por esta fila.
   3. HOJE       quem foi marcado para agora.

   Nada de "próximos dias": a tela perde o sentido no instante em que mostra
   o que não é para hoje.

   ---------- as três faixas ----------
   TOPO ..... a data e a régua do dia. A régua é a assinatura da tela: uma
              marca por lead do dia, as riscadas em tinta cheia, a da vez em
              rosa, as que faltam vazias. É o que sobrou de "Riscados hoje"
              depois que a lista morreu: virou instrumento em vez de pilha,
              e passou a caber numa linha.
   CARTA .... o corpo, e ele cresce para ocupar o que a tela tiver.
   PÉ ....... quem vem depois, e as setas. Três nomes em mono, não uma
              lista: eles existem para dizer que a fila continua, não para
              serem escolhidos.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { diasEntre, dinheiroCurto, JANELA_HORIZONTE, urgencia } from "@/lib/crm/regras";
import { NOME_ESTAGIO, type LeadPainel, type Template } from "@/lib/crm/tipos";
import { CartaDaVez } from "./CartaDaVez";
import { ModalMensagem } from "./ModalMensagem";
import { ModalNovoLead } from "./ModalNovoLead";
import { ModalToque } from "./ModalToque";
import s from "@/app/crm/crm.module.css";

type Dia = { data: string; n: number };

type Painel = {
  hoje: string;
  atrasados: LeadPainel[];
  paraHoje: LeadPainel[];
  semPasso: LeadPainel[];
  riscados: LeadPainel[];
  horizonte: Dia[];
  proximoRetorno: Dia | null;
  toquesSemana: number;
  metaSemana: number;
  pipelineAberto: number;
  ativos: number;
};

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

/* "AAAA-MM-DD" lido ao meio-dia UTC: em qualquer fuso do Brasil isso
   continua sendo o mesmo dia. É o mesmo cuidado que o `somarDias` das
   regras toma, e pela mesma razão. */
const aoMeioDia = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12));
};

/* O pt-BR devolve "ter., 18/08". O ponto da abreviação é sujeira dentro de
   uma linha de mono em caixa alta. */
const dataCurta = (iso: string) => DATA_CURTA.format(aoMeioDia(iso)).replace(".", "");

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

/* A urgência do lead da vez, pintada na banda do topo da folha. É a mesma
   informação que o filete de margem do card do quadro carrega, no mesmo
   vocabulário de cor, na escala desta tela: rosa é atrasado, esmeralda é
   hoje, banda interrompida é sem próximo passo. */
const FOLHA: Record<string, string> = {
  atrasado: s.folhaAtrasado,
  hoje: s.folhaHoje,
  sem_passo: s.folhaSemPasso,
  agendado: s.folhaAgendado,
};

export function Hoje({ painel, templates }: { painel: Painel; templates: Template[] }) {
  const [mensagem, setMensagem] = useState<LeadPainel | null>(null);
  const [toque, setToque] = useState<LeadPainel | null>(null);
  const [novo, setNovo] = useState(false);
  const [posicao, setPosicao] = useState(0);
  const [segmento, setSegmento] = useState<string | null>(null);

  const { atrasados, paraHoje, semPasso, riscados } = painel;

  /* A emenda dos três grupos, na ordem de prioridade. É a única lista que
     sobrou, e ela não aparece em lugar nenhum da tela: é só a ordem em que
     as cartas saem. */
  const filaDia = useMemo(
    () => [...semPasso, ...atrasados, ...paraHoje],
    [atrasados, paraHoje, semPasso],
  );

  /* ---------- os segmentos ----------
     O garimpo importa por nicho, e trinta cartas embaralhadas de oito
     nichos obrigam a cabeça a trocar de assunto a cada seta. O filtro
     deixa varrer um segmento por sentada: as cinco tatuagens numa voz, as
     decorações na outra. O nicho vem livre do cadastro, então o segmento
     É o texto do campo; quem não tem entra em "sem segmento", porque
     sumir com lead por falta de rótulo seria um buraco na regra da fila. */
  const segmentos = useMemo(() => {
    const conta = new Map<string, number>();
    for (const l of filaDia) {
      const chave = l.nicho?.trim() || "";
      conta.set(chave, (conta.get(chave) ?? 0) + 1);
    }
    return [...conta.entries()]
      .map(([chave, n]) => ({ chave, n }))
      .sort((a, b) => b.n - a.n || a.chave.localeCompare(b.chave, "pt-BR"));
  }, [filaDia]);

  const fila = useMemo(
    () => (segmento === null ? filaDia : filaDia.filter((l) => (l.nicho?.trim() || "") === segmento)),
    [filaDia, segmento],
  );

  /* Riscou o último do segmento, o baralho volta sozinho para o monte
     inteiro: um filtro apontando para uma fila vazia seria a tela dizendo
     "acabou" com trabalho ainda na mesa. */
  useEffect(() => {
    if (segmento !== null && !filaDia.some((l) => (l.nicho?.trim() || "") === segmento)) {
      setSegmento(null);
    }
  }, [filaDia, segmento]);

  const escolherSegmento = (chave: string | null) => {
    setSegmento(chave);
    setPosicao(0);
  };

  /* ---------- pular direto para um nome ----------
     A régua do dia virou mapa: clicar numa marca pendente traz aquela
     carta para a frente. Se o nome está fora do segmento filtrado, o
     filtro cai primeiro: um clique explícito num nome vale mais que o
     recorte que escondia ele. */
  const irPara = (id: string) => {
    const naFiltrada = fila.findIndex((l) => l.id === id);
    if (naFiltrada >= 0) return setPosicao(naFiltrada);
    const noDia = filaDia.findIndex((l) => l.id === id);
    if (noDia >= 0) {
      setSegmento(null);
      setPosicao(noDia);
    }
  };

  /* A posição é PRESA aqui, e não corrigida por efeito. Quando o lead da vez
     é resolvido, ele sai da fila do servidor e a fila encolhe embaixo do
     índice: a próxima carta assume a mesma posição sozinha, que é o gesto
     de baralho que a tela inteira imita. O `min` só existe para o caso de a
     última ser resolvida, quando não há próxima e o índice tem que recuar. */
  const indice = Math.min(posicao, Math.max(0, fila.length - 1));
  const atual = fila[indice] ?? null;

  const andar = useCallback(
    (passo: number) => setPosicao((p) => Math.min(Math.max(0, p + passo), Math.max(0, fila.length - 1))),
    [fila.length],
  );

  /* ---------- as setas ----------
     A fila se varre com uma mão só. `→` e `←` andam; o `Escape` das gavetas
     é tratado dentro da carta.

     O guarda do campo de texto não é detalhe: sem ele, digitar o próximo
     passo e usar a seta para corrigir uma letra pularia de lead. */
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      const tag = alvo?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || alvo?.isContentEditable) return;

      if (e.key === "ArrowRight") { e.preventDefault(); andar(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); andar(-1); }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [andar]);

  /* A data vem do servidor como "AAAA-MM-DD" e é lida ao meio-dia UTC. */
  const [ano, mes, dia] = painel.hoje.split("-").map(Number);
  const dataPorExtenso = DATA_LONGA.format(new Date(Date.UTC(ano, mes - 1, dia, 12)));

  const anterior = fila[indice - 1] ?? null;
  const proximo = fila[indice + 1] ?? null;

  return (
    <div className={s.wrapVez}>
      {/* ---------- o papel: a pergunta e a única ação que não é de um lead ----------
          "Anotar lead" mora AQUI, e não dentro da faixa, apesar de a faixa
          medir o dia e ele acrescentar ao dia. O motivo é a cor: dentro da
          folha ele disputaria o rosa com o botão da carta, e a regra desta
          tela é um rosa por carta. No papel ele é o único rosa da margem de
          cima, e os dois nunca aparecem na mesma faixa de altura. */}
      <div className={`${s.vezTopo} ${s.tituloLinha}`}>
        <div>
          <p className={s.eyebrow}>{dataPorExtenso}</p>
          {/* O ponto final é rosa em toda manchete do CRM: é a assinatura da
              casa. Aqui a manchete faz a pergunta, e o nome dentro da folha é
              a resposta, no triplo do corpo. */}
          <h2 className={s.vezPergunta}>
            Quem eu falo agora<i className={s.ponto}>.</i>
          </h2>
        </div>

        <button type="button" className={s.btnAcao} onClick={() => setNovo(true)}>
          Anotar lead
        </button>
      </div>

      {/* ---------- os segmentos: um monte por sentada ----------
          A fileira mora no PAPEL, com a pergunta, porque ela decide QUAL
          fila a folha vai mostrar: é controle da tela, não medida do dia
          (a régua lá dentro continua contando o dia inteiro). Ela só
          existe com dois segmentos ou mais: filtro de uma opção é ruído.

          A forma é a da linha impressa da casa: nada de caixinhas, cada
          monte é ESCRITO SOBRE UM FILETE. O escolhido fica com o filete
          em tinta cheia e o texto em preto; os em repouso, filete claro e
          voz cinza. Dá para ver qual está ligado sem ler nada.

          E a conta segue a regra das duas réguas: até nove leads são
          MARCAS CONTÁVEIS (a régua do dia em miniatura, cinco tatuagens
          são cinco decisões), de dez para cima vira número, porque aí é
          volume. O monte some quando zera: é a fileira dizendo "este
          acabou". */}
      {segmentos.length > 1 ? (
        <div className={s.vezSegmentos} role="group" aria-label="Varrer a fila por segmento">
          <button
            type="button"
            className={`${s.vezMonte} ${segmento === null ? s.vezMonteAtivo : ""}`}
            onClick={() => escolherSegmento(null)}
            aria-pressed={segmento === null}
            aria-label={`Todos os segmentos, ${filaDia.length} na fila`}
          >
            Todos<b className={s.vezMonteNum}>{filaDia.length}</b>
          </button>
          {segmentos.map(({ chave, n }) => (
            <button
              key={chave || "__sem"}
              type="button"
              className={`${s.vezMonte} ${segmento === chave ? s.vezMonteAtivo : ""}`}
              onClick={() => escolherSegmento(segmento === chave ? null : chave)}
              aria-pressed={segmento === chave}
              aria-label={`${chave || "sem segmento"}, ${n} na fila`}
            >
              {chave || "sem segmento"}
              {n <= 9 ? (
                <span className={s.vezMonteMarcas} aria-hidden="true">
                  {Array.from({ length: n }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
              ) : (
                <b className={s.vezMonteNum}>{n}</b>
              )}
            </button>
          ))}
        </div>
      ) : null}

      {/* ---------- a folha de tinta: o dia inteiro num objeto só ----------
          O placar e a carta eram duas peças soltas na mesma margem de
          papel, e um arranjo de peças flutuando não é um objeto. Agora eles
          são a mesma folha de grafite, sangrando de ponta a ponta:
          cabeçalho (o placar) e corpo (o lead).

          A urgência mora na banda do topo. É a marca de margem da casa
          deitada: de pé ela media a altura de um card, aqui ela mede a
          janela. */}
      {atual ? (
        <div className={`${s.vezFolha} ${FOLHA[urgencia(atual, painel.hoje)] ?? s.folhaAgendado}`}>
          <ReguaDoDia riscados={riscados} fila={filaDia} atualId={atual.id} painel={painel} aoIrPara={irPara} />

          <div className={s.vezPalco}>
            <CartaDaVez
              key={atual.id}
              lead={atual}
              hoje={painel.hoje}
              aoMandarMensagem={setMensagem}
              aoRegistrarToque={setToque}
            />
          </div>
        </div>
      ) : (
        /* Sem carta não há folha. Uma tarja de tinta com um bloco de papel
           dentro seria um objeto anunciando que não tem conteúdo, e o dia
           limpo é uma conclusão: ele vive na mesa, com a moldura fechada
           que o `.diaLimpo` já tem. O placar continua, sozinho. */
        <>
          <ReguaDoDia riscados={riscados} fila={filaDia} atualId={null} painel={painel} aoIrPara={irPara} />
          <div className={s.vezPalco}>
            <DiaLimpo painel={painel} aoAnotar={() => setNovo(true)} />
          </div>
        </>
      )}

      {/* ---------- faixa 3: as duas teclas do baralho ----------
          Elas eram dois `.btnMini` anônimos ("Anterior", "Pular") com um
          "← →" solto ao lado, e acima deles uma tira "Depois: A · B · C".
          Duas peças fracas dizendo pedaços da mesma coisa.

          Agora são uma peça só: cada tecla CARREGA O NOME de para onde ela
          leva. "Pular" não dizia nada; "→ Studio Ana Paula" diz quem é o
          próximo, e a tira de nomes deixa de ser necessária porque o único
          nome que importa saber antes da hora é o de agora e o do próximo.
          Quanto falta continua dito, no contador do meio.

          E elas viram objeto: papel, filete de tinta e a sombra dura da
          casa, que afunda no clique (o mesmo carimbo do `.btnAcao`). Numa
          tela que se varre com a mão, os dois controles que se aperta o dia
          inteiro precisam parecer teclas. */}
      {atual ? (
        <footer className={s.vezPe}>
          <button
            type="button"
            className={s.vezSeta}
            onClick={() => andar(-1)}
            disabled={!anterior}
            title="Seta para a esquerda"
          >
            <i className={s.vezSetaGlifo} aria-hidden="true">
              ←
            </i>
            <span className={s.vezSetaTexto}>
              <span className={s.vezSetaRot}>Anterior</span>
              <b className={s.vezSetaNome}>{anterior ? anterior.nome : "Começo da fila"}</b>
            </span>
          </button>

          {/* Com um segmento escolhido, o contador diz DE QUAL monte a
              conta é: "2 de 5 em tatuagem" e não um "2 de 5" que parece o
              dia inteiro encolhido. E embaixo dele mora o HISTÓRICO do
              dia: quem já foi riscado, com a etapa para onde foi. É a
              mesma folha da régua, ancorada aqui porque a mão que acabou
              de mandar a mensagem está no pé da tela, não no topo. */}
          <span className={s.vezMeio}>
            <span className={s.vezPosicao}>
              <b>{indice + 1}</b> de {fila.length}{" "}
              {segmento === null ? "na fila" : `em ${segmento || "sem segmento"}`}
            </span>
            {riscados.length ? <RiscadosDoPe riscados={riscados} /> : null}
          </span>

          <button
            type="button"
            className={`${s.vezSeta} ${s.vezSetaProxima}`}
            onClick={() => andar(1)}
            disabled={!proximo}
            title="Seta para a direita"
          >
            <i className={s.vezSetaGlifo} aria-hidden="true">
              →
            </i>
            <span className={s.vezSetaTexto}>
              <span className={s.vezSetaRot}>Próxima</span>
              <b className={s.vezSetaNome}>{proximo ? proximo.nome : "Última do dia"}</b>
            </span>
          </button>
        </footer>
      ) : null}

      {mensagem ? (
        <ModalMensagem lead={mensagem} templates={templates} aoFechar={() => setMensagem(null)} />
      ) : null}
      {toque ? <ModalToque lead={toque} aoFechar={() => setToque(null)} /> : null}
      {novo ? <ModalNovoLead aoFechar={() => setNovo(false)} /> : null}
    </div>
  );
}

/* ============================================================
   OS RISCADOS DO PÉ — o histórico de contato onde a mão está

   O mesmo conteúdo dos ✓ da régua, ancorado embaixo ("coloca o
   histórico riscado em baixo tbm"): quem acabou de apertar WhatsApp está
   com a mão no pé da tela, e subir até a faixa para reencontrar o lead é
   caminho comprido. O puxador diz a conta ("9 riscados hoje") e abre a
   folha PARA CIMA, com cada nome, a etapa para onde o trilho o levou, e
   o clique abrindo a ficha.
   ============================================================ */
function RiscadosDoPe({ riscados }: { riscados: LeadPainel[] }) {
  const [aberta, setAberta] = useState(false);
  const areaRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!aberta) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setAberta(false);
    };
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberta]);

  return (
    <span className={s.reguaArea} ref={areaRef}>
      <button
        type="button"
        className={`${s.reguaRotulo} ${s.riscadosPuxador}`}
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
      >
        {plural(riscados.length, "riscado", "riscados")} hoje
      </button>

      {aberta ? (
        <div className={`${s.diaFolha} ${s.diaFolhaCima}`} role="menu" aria-label="Riscados de hoje">
          {riscados.map((l) => (
            <Link key={l.id} href={`/crm/lead/${l.id}`} className={s.diaLinha} role="menuitem">
              <i className={s.diaVisto}>✓</i>
              <span className={s.diaNome}>{l.nome}</span>
              <span className={s.diaEtapa}>{NOME_ESTAGIO[l.estagio]}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </span>
  );
}

/* ============================================================
   A RÉGUA DO DIA — a assinatura desta tela

   Uma marca por lead do dia, numa linha só: as riscadas em tinta cheia, a
   da vez em rosa, as que faltam vazias. É o mesmo filete que separa as
   seções do site inteiro, agora carregando o dia.

   Ela é o que sobrou do bloco "Riscados hoje" depois que a lista morreu, e
   a troca foi ganho puro. A pilha de nomes riscados provava o trabalho e
   custava um bloco inteiro no pé da tela; a régua prova o mesmo em 200px e
   responde uma coisa que a pilha não respondia: QUANTO FALTA. O nome de
   cada riscado continua ali, no `title` da marca, para quem for procurar.

   ---------- por que a marca e não uma barra que enche ----------
   A régua da meta da semana, ao lado, é uma barra contínua: cinquenta
   toques não são cinquenta objetos, são um volume. O dia é o contrário. São
   nove pessoas, e cada uma é uma decisão que aconteceu ou não. Nove marcas
   contáveis dizem "faltam seis"; uma barra em 33% diz "um terço", que é a
   mesma informação em pior forma para quem vai executar uma a uma.

   Ela some com menos de duas marcas: um dia de um lead só não tem forma
   para mostrar, e uma régua de uma marca é um traço solto.
   ============================================================ */
function ReguaDoDia({
  riscados,
  fila,
  atualId,
  painel,
  aoIrPara,
}: {
  riscados: LeadPainel[];
  /* SEMPRE a fila do dia inteiro, nunca a filtrada por segmento: o filtro
     muda o que a mão varre, não o tamanho do dia. A marca da vez acha o
     lead pelo id, então ela continua acesa no lugar certo do dia mesmo
     quando a carta veio de um monte filtrado. */
  fila: LeadPainel[];
  atualId: string | null;
  painel: Painel;
  aoIrPara: (id: string) => void;
}) {
  const total = riscados.length + fila.length;
  const posicaoNoDia = atualId ? fila.findIndex((l) => l.id === atualId) : -1;

  /* ---------- a folha do dia ----------
     A marca é anônima até o hover, e "como vou saber que cada check é a
     loja que quero" não se responde com tooltip caçado um a um. O rótulo
     "O dia" abre uma GAVETA: a lista nomeada do dia, riscados com o ✓ e
     a etapa para onde foram, pendentes com o traço. É o velho bloco
     "Riscados hoje" reencarnado do jeito certo: em folha solta que só
     existe quando pedida, nunca ocupando a tela em repouso. */
  const [aberta, setAberta] = useState(false);
  const areaRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!aberta) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setAberta(false);
    };
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberta]);
  const bateu = painel.toquesSemana >= painel.metaSemana;
  const proporcao = Math.min(
    100,
    Math.round((painel.toquesSemana / Math.max(1, painel.metaSemana)) * 100),
  );

  return (
    <div className={s.faixa}>
      {total > 1 ? (
        <span className={`${s.faixaItem} ${s.reguaArea}`} ref={areaRef}>
          <button
            type="button"
            className={s.reguaRotulo}
            onClick={() => setAberta((a) => !a)}
            aria-expanded={aberta}
          >
            O dia
          </button>
          <span
            className={s.reguaDia}
            role="group"
            aria-label={`${riscados.length} de ${total} riscados.${posicaoNoDia >= 0 ? ` Você está no ${posicaoNoDia + 1}º da fila do dia.` : ""}`}
          >
            {/* O ✓ esmeralda é o que sobrou do bloco "Riscados hoje", e ele
                é a única coisa daquele bloco que valia a pena manter: a
                mesma marca de margem do /portfólio dizendo "resolvido". Duas
                formas para dois estados é mais honesto do que duas cores da
                mesma forma: o que foi feito é um visto, o que falta é um
                traço.

                E desde 17/08 a régua é MAPA, não só medida: o riscado some
                da fila quando o trabalho é feito ("não sei para onde ele
                vai"), então o ✓ dele vira a porta de volta, abrindo a ficha.
                As marcas pendentes pulam a fila para aquela carta. O nome
                continua no title, agora com um clique atrás dele. */}
            {riscados.map((l) => (
              <Link
                key={l.id}
                href={`/crm/lead/${l.id}`}
                className={`${s.marca} ${s.marcaFeita} ${s.marcaViva}`}
                title={`${l.nome} · abrir a ficha`}
                aria-label={`${l.nome}, riscado: abrir a ficha`}
              >
                ✓
              </Link>
            ))}
            {fila.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`${s.marca} ${s.marcaViva} ${l.id === atualId ? s.marcaAgora : ""}`}
                title={`${l.nome} · trazer para a frente`}
                aria-label={`${l.nome}, na fila: trazer para a frente`}
                onClick={() => aoIrPara(l.id)}
              />
            ))}
          </span>
          <b className={s.faixaNum}>
            {riscados.length}/{total}
          </b>

          {aberta ? (
            <div className={s.diaFolha} role="menu" aria-label="Os nomes do dia">
              {riscados.map((l) => (
                <Link
                  key={l.id}
                  href={`/crm/lead/${l.id}`}
                  className={s.diaLinha}
                  role="menuitem"
                >
                  <i className={s.diaVisto}>✓</i>
                  <span className={s.diaNome}>{l.nome}</span>
                  {/* a resposta literal do "para onde ele vai": a etapa
                      em que o trilho (ou a mão) o deixou */}
                  <span className={s.diaEtapa}>{NOME_ESTAGIO[l.estagio]}</span>
                </Link>
              ))}
              {fila.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`${s.diaLinha} ${l.id === atualId ? s.diaLinhaAgora : ""}`}
                  role="menuitem"
                  onClick={() => {
                    aoIrPara(l.id);
                    setAberta(false);
                  }}
                >
                  <i className={s.diaTraco} aria-hidden="true" />
                  <span className={s.diaNome}>{l.nome}</span>
                  {l.id === atualId ? <span className={s.diaEtapa}>a da vez</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </span>
      ) : null}

      {/* ---------- "TOQUES DA SEMANA" NÃO DIZIA O QUE CONTAVA ----------
          O rótulo era jargão do banco e o número vinha sozinho: "3/50" sem
          régua não é progresso, é uma fração no escuro, e ninguém sabia se
          o 50 era escolha de alguém ou constante do código.

          Agora o rótulo usa as palavras que a própria ferramenta usa no
          botão que alimenta esse número: o modal de toque pergunta "eu
          falei" ou "me responderam", e este contador é o primeiro dos dois.
          A régua volta para dar forma à fração, e o `title` diz de onde o
          número sai e onde a meta se muda, que é a única coisa que nem o
          rótulo nem a régua conseguem dizer sozinhos. */}
      <span
        className={s.faixaItem}
        title="Toques de saída que você registrou desde segunda-feira. A meta se muda em Métricas."
      >
        Falei esta semana
        <span className={s.regua}>
          <i
            className={`${s.reguaFill} ${bateu ? s.reguaCheia : ""}`}
            style={{ width: `${proporcao}%` }}
          />
        </span>
        <b className={`${s.faixaNum} ${bateu ? s.faixaVivo : ""}`}>
          {painel.toquesSemana}/{painel.metaSemana}
        </b>
      </span>

      <span className={s.faixaItem}>
        Pipeline aberto
        <b className={s.faixaNum}>{dinheiroCurto(painel.pipelineAberto) || "R$ 0"}</b>
      </span>
    </div>
  );
}

/* ============================================================
   O DIA LIMPO

   Dois estados, e eles são coisas diferentes:

     QUADRO VAZIO ... não há lead ativo nenhum. Palavra, e só palavra: uma
                      régua vazia com um rótulo em cima seria um instrumento
                      medindo o nada, e o texto já diz isso melhor.
     FILA LIMPA ..... há leads, e todos estão agendados para depois de hoje.
                      Aqui entra a linha do horizonte, porque é aqui que
                      existe alguma coisa para ela mostrar.
   ============================================================ */
function DiaLimpo({ painel, aoAnotar }: { painel: Painel; aoAnotar: () => void }) {
  const { horizonte, proximoRetorno, ativos, hoje, riscados } = painel;

  if (!ativos) {
    return (
      <div className={s.diaLimpo}>
        <b>Quadro vazio.</b>
        <p>
          Nenhum lead ativo no pipeline. Anote o primeiro nome e ele passa a te cobrar sozinho,
          nesta mesma tela.
        </p>
        <button type="button" className={s.btnAcao} onClick={aoAnotar}>
          Anotar lead
        </button>
      </div>
    );
  }

  return (
    <div className={s.diaLimpo}>
      <b>Fila limpa.</b>
      <p>
        {riscados.length
          ? `Nada vencido e nada marcado para hoje. Você riscou ${plural(riscados.length, "nome", "nomes")}.`
          : "Nenhum retorno vencido e nada marcado para hoje."}
      </p>

      <span className={s.horizonteRot}>O que volta</span>

      {/* A linha é uma imagem com nome: quem usa leitor de tela ouve as
          datas, e não um punhado de elementos sem texto. */}
      <div
        className={s.horizonte}
        role="img"
        aria-label={
          horizonte.length
            ? `Retornos marcados nos próximos ${JANELA_HORIZONTE} dias: ${horizonte
                .map((d) => dataCurta(d.data))
                .join("; ")}.`
            : `Nenhum retorno marcado nos próximos ${JANELA_HORIZONTE} dias.`
        }
      >
        <span className={s.horizonteTrilho} />
        {horizonte.map((d, i) => (
          <i
            key={d.data}
            className={`${s.horizonteDente} ${i === 0 ? s.horizonteProximo : ""}`}
            style={{ left: `${(diasEntre(hoje, d.data) / JANELA_HORIZONTE) * 100}%` }}
          />
        ))}
      </div>

      <span className={s.horizonteEscala}>
        <span>Hoje</span>
        <span>{JANELA_HORIZONTE} dias</span>
      </span>

      <span className={s.horizonteFatos}>
        <span className={s.horizonteFato}>
          Próximo retorno
          <b>
            {proximoRetorno
              ? `${dataCurta(proximoRetorno.data)} · ${plural(proximoRetorno.n, "lead", "leads")}`
              : "sem data"}
          </b>
        </span>
        <span className={s.horizonteFato}>
          No quadro
          <b>{plural(ativos, "ativo", "ativos")}</b>
        </span>
      </span>

      <button type="button" className={s.btn} onClick={aoAnotar}>
        Anotar lead
      </button>
    </div>
  );
}
