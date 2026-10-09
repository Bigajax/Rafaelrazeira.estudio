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
import {
  amostraParada,
  arrobaDe,
  contatoQuente,
  diasEntre,
  dinheiroCurto,
  JANELA_HORIZONTE,
  momentoDoContato,
  procurouOEstudio,
  TITULO_AMOSTRA_PRONTA,
  urgencia,
} from "@/lib/crm/regras";
import { NOME_ESTAGIO, type LeadPainel, type Template } from "@/lib/crm/tipos";
import { CartaDaVez } from "./CartaDaVez";
import { ModalMensagem } from "./ModalMensagem";
import { ModalNovoLead } from "./ModalNovoLead";
import { ModalContrato } from "./ModalContrato";
import { ModalToque } from "./ModalToque";
import { PostDoDia } from "@/components/marketing/PostDoDia";
import type { Peca } from "@/lib/marketing/tipos";
import s from "@/app/(pt)/crm/crm.module.css";

type Dia = { data: string; n: number };

type Painel = {
  hoje: string;
  atrasados: LeadPainel[];
  paraHoje: LeadPainel[];
  semPasso: LeadPainel[];
  riscados: LeadPainel[];
  /* toda amostra parada do lote, com ou sem retorno marcado (09/10) */
  amostras: LeadPainel[];
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

/* A chave do monte de quem pediu. Nicho é texto livre do cadastro, então
   a sentinela leva um caractere que nenhum nicho digitado teria. */
const PEDIRAM = "\u0000pediram";

/* A chave do monte da amostra parada (09/10): quem tem vitrine de amostra
   no ar e está em silêncio (`amostraParada`). Corta a fila de lado, como o
   de quem pediu: um lead do anúncio com amostra está nos dois. */
const AMOSTRA = "\u0000amostra";

/* O baralho do dia no sessionStorage, uma chave por lista e por data:
   amanhã é outra fila. Tudo em try/catch porque navegador embutido e
   janela anônima podem negar o storage, e a fila tem que abrir do mesmo
   jeito, só sem memória. */
type ListaGuardada = "puladas" | "frente" | "segmento";
const chaveBaralho = (hoje: string, lista: ListaGuardada) => `crm:hoje:${hoje}:${lista}`;
function lerBaralho(hoje: string, lista: ListaGuardada): string[] {
  try {
    const bruto = window.sessionStorage.getItem(chaveBaralho(hoje, lista));
    const v: unknown = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function guardarBaralho(hoje: string, lista: ListaGuardada, ids: string[]) {
  try {
    window.sessionStorage.setItem(chaveBaralho(hoje, lista), JSON.stringify(ids));
  } catch {
    /* sem storage, sem memória: a fila funciona igual */
  }
}

/* O nome que a tecla mostra: o do card e, quando o card é de gente com a
   loja só no @, a loja junto ("Fernando · @pegabem_calcados_df"), senão
   a fila diz "Carlos" e "Fernando" sem dizer de onde. */
function nomeDaTecla(l: LeadPainel): string {
  const arroba = arrobaDe(l.instagram);
  if (!arroba || l.nome.trim().replace(/^@+/, "").toLocaleLowerCase("pt-BR") === arroba.toLocaleLowerCase("pt-BR")) return l.nome;
  /* Só o primeiro nome junto do @ (09/10): "Amanda da Fonseca Gonçalves ·
     @estilomod" perdia 101px nas reticências da tecla, e o sobrenome não
     ajuda a achar ninguém; o @ é que diz qual loja. */
  return `${l.nome.trim().split(/\s+/)[0]} · @${arroba}`;
}

/* O nicho é texto livre do cadastro, e "Moda Masculina" e "moda masculina"
   viravam dois montes de um lead cada. A chave é em minúscula; a tela põe
   a maiúscula de volta no CSS (::first-letter). */
const chaveDoNicho = (nicho: string | null) => nicho?.trim().toLocaleLowerCase("pt-BR") || "";

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

export function Hoje({ painel, templates, posts = [] }: { painel: Painel; templates: Template[]; posts?: Peca[] }) {
  const [mensagem, setMensagem] = useState<{ lead: LeadPainel; saida?: "whatsapp" | "instagram" } | null>(null);
  const [toque, setToque] = useState<LeadPainel | null>(null);
  const [fechando, setFechando] = useState<LeadPainel | null>(null);
  const [novo, setNovo] = useState(false);
  const [segmento, setSegmento] = useState<string | null>(null);

  /* ---------- O BARALHO (21/09) ----------
     A fila era um ponteiro numérico: "Próxima" andava o índice e o card
     pulado ficava parado no lugar dele. Bastava a fila mudar embaixo (um
     resolvido sai, o servidor reordena um grupo) para o ponteiro cair em
     outro card, e no fim do dia os pulados voltavam de trás para a frente,
     não no fim da fila ("alguns que passo adiante tinha que ir para o
     final da fila"). Agora pular é gesto de baralho: o card vai para o
     FUNDO, na ordem em que foi pulado, e a carta da vez é sempre a de
     cima. As duas listas guardam ids, não posições, então sobrevivem a
     qualquer refresh do servidor: quem saiu da fila some delas sozinho.
       puladas .. o fundo do baralho, na ordem em que foram pulados
       frente ... quem foi trazido para cima na mão (a seta para trás e o
                  clique na régua), o mais recente primeiro
     Elas ficam no sessionStorage do dia: trocar de aba e voltar não
     embaralha o que já foi varrido. */
  const [puladas, setPuladas] = useState<string[]>([]);
  const [frente, setFrente] = useState<string[]>([]);
  /* Lido DEPOIS de montar, e não no estado inicial: o servidor renderiza
     esta tela sem storage, e um primeiro card diferente entre servidor e
     navegador seria erro de hidratação. Enquanto não leu, não grava, senão
     a lista vazia do primeiro render apagaria a memória do dia. */
  const baralhoLido = useRef(false);
  useEffect(() => {
    setPuladas(lerBaralho(painel.hoje, "puladas"));
    setFrente(lerBaralho(painel.hoje, "frente"));
    /* O monte escolhido também: a tela remonta depois de cada registro
       (o refresh do servidor passa pelo carregando) e o filtro voltava
       para "Todos" no meio da varredura ("voltando para todos tbm"). */
    setSegmento(lerBaralho(painel.hoje, "segmento")[0] ?? null);
    baralhoLido.current = true;
  }, [painel.hoje]);
  useEffect(() => {
    if (baralhoLido.current) guardarBaralho(painel.hoje, "segmento", segmento === null ? [] : [segmento]);
  }, [painel.hoje, segmento]);
  useEffect(() => {
    if (baralhoLido.current) guardarBaralho(painel.hoje, "puladas", puladas);
  }, [painel.hoje, puladas]);
  useEffect(() => {
    if (baralhoLido.current) guardarBaralho(painel.hoje, "frente", frente);
  }, [painel.hoje, frente]);

  const { atrasados, paraHoje, semPasso, riscados } = painel;

  /* A emenda dos três grupos, na ordem de prioridade. É a única lista que
     sobrou, e ela não aparece em lugar nenhum da tela: é só a ordem em que
     as cartas saem. */
  /* ---------- QUEM PEDIU VEM ANTES DE TUDO (21/09) ----------
     A emenda de grupos valia para a fila inteira, e o lead do anúncio que
     eu já tinha tocado, com retorno marcado para hoje, ficava na posição
     350: atrás de 290 cards de garimpo sem passo. Quem preencheu o
     formulário está esperando; o garimpo não sabe que existe. Então a
     fila tem duas metades: primeiro todo mundo que procurou o estúdio,
     de qualquer grupo, do cadastro MAIS NOVO para o mais antigo (quem
     preencheu há uma hora ainda está com o telefone na mão); depois o
     garimpo na ordem de sempre dos três grupos. */
  /* ---------- O CONTATO QUENTE ABRE A FILA (06/10) ----------
     Antes de quem pediu, quem está esperando EU falar (`contatoQuente`):
     escreveu por último, ou procurou e nunca recebeu nada meu. Do contato
     MAIS RECENTE para o mais antigo, pela hora do contato e não do
     cadastro: o card de agosto que me escreveu hoje vem antes do
     formulário de ontem. Quem eu já estou cobrando desce para a metade
     de quem pediu ("ele se perde no final da lista ou vai para o meio"). */
  const filaDia = useMemo(() => {
    const todos = [...semPasso, ...atrasados, ...paraHoje];
    const quentes = todos.filter(contatoQuente);
    const resto = todos.filter((l) => !contatoQuente(l));
    return [
      ...quentes.sort(
        (a, b) => momentoDoContato(b).localeCompare(momentoDoContato(a)) || a.id.localeCompare(b.id),
      ),
      ...resto
        .filter(procurouOEstudio)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)),
      ...resto.filter((l) => !procurouOEstudio(l)),
    ];
  }, [atrasados, paraHoje, semPasso]);

  /* ---------- os segmentos ----------
     O garimpo importa por nicho, e trinta cartas embaralhadas de oito
     nichos obrigam a cabeça a trocar de assunto a cada seta. O filtro
     deixa varrer um segmento por sentada: as cinco tatuagens numa voz, as
     decorações na outra. O nicho vem livre do cadastro, então o segmento
     É o texto do campo; quem não tem entra em "sem segmento", porque
     sumir com lead por falta de rótulo seria um buraco na regra da fila. */
  /* ---------- O MONTE DE QUEM PEDIU (18/09) ----------
     Antes dos nichos, um monte só: quem chegou por anúncio ou pelo
     formulário do site. Ele não é um nicho (lead de anúncio quase nunca
     tem nicho, e caía em "sem segmento" junto com o garimpo sem rótulo),
     é a outra metade da fila. Com 366 nomes e 61 de anúncio, era o monte
     que faltava: "cadê os de anúncio" não tinha resposta na tela. A
     chave é um sentinela que nenhum nicho pode ser. */
  const pediram = useMemo(() => filaDia.filter(procurouOEstudio).length, [filaDia]);
  /* O monte da amostra não sai da fila do dia: vem pronto do servidor, com
     quem tem retorno marcado para outro dia também (ver `amostras` em
     painelHoje). */
  const amostras = painel.amostras.length;

  const segmentos = useMemo(() => {
    const conta = new Map<string, number>();
    for (const l of filaDia) {
      if (procurouOEstudio(l)) continue;
      const chave = chaveDoNicho(l.nicho);
      conta.set(chave, (conta.get(chave) ?? 0) + 1);
    }
    return [...conta.entries()]
      .map(([chave, n]) => ({ chave, n }))
      .sort((a, b) => b.n - a.n || a.chave.localeCompare(b.chave, "pt-BR"));
  }, [filaDia]);

  const pertence = useCallback(
    (l: LeadPainel, chave: string | null) =>
      chave === null
        ? true
        : chave === PEDIRAM
          ? procurouOEstudio(l)
          : chave === AMOSTRA
            ? amostraParada(l)
            : !procurouOEstudio(l) && chaveDoNicho(l.nicho) === chave,
    [],
  );

  const fila = useMemo(
    () => (segmento === AMOSTRA ? painel.amostras : filaDia.filter((l) => pertence(l, segmento))),
    [filaDia, segmento, pertence, painel.amostras],
  );

  /* A linha mostra os montes que couberem INTEIROS (o CSS esconde a
     segunda linha), do maior para o menor; o resto mora no índice. O
     monte ligado vem logo depois de "Anúncio e site", senão um filtro
     escolhido pelo índice ficaria escondido. */
  const [indiceAberto, setIndiceAberto] = useState(false);
  const visiveis = useMemo(() => {
    const escolhido = segmentos.find((x) => x.chave === segmento);
    return escolhido ? [escolhido, ...segmentos.filter((x) => x !== escolhido)] : segmentos;
  }, [segmentos, segmento]);

  /* Riscou o último do segmento, o baralho volta sozinho para o monte
     inteiro: um filtro apontando para uma fila vazia seria a tela dizendo
     "acabou" com trabalho ainda na mesa. */
  useEffect(() => {
    if (segmento !== null && !(segmento === AMOSTRA ? painel.amostras.length : filaDia.some((l) => pertence(l, segmento)))) {
      setSegmento(null);
    }
  }, [filaDia, segmento, pertence, painel.amostras]);

  /* Trocar de monte não mexe no baralho: o que foi pulado num segmento
     continua no fundo quando o monte inteiro volta. */
  const escolherSegmento = (chave: string | null) => setSegmento(chave);

  /* A ordem em que as cartas saem: a frente, o miolo na ordem da fila,
     e o fundo. Só ids que ainda estão na fila contam. */
  const baralho = useMemo(() => {
    const naFila = new Map(fila.map((l) => [l.id, l]));
    const deFrente = frente.map((id) => naFila.get(id)).filter((l): l is LeadPainel => Boolean(l));
    const doFundo = puladas.map((id) => naFila.get(id)).filter((l): l is LeadPainel => Boolean(l));
    const fixos = new Set([...frente, ...puladas]);
    return [...deFrente, ...fila.filter((l) => !fixos.has(l.id)), ...doFundo];
  }, [fila, frente, puladas]);

  const trazerParaCima = useCallback((id: string) => {
    setPuladas((ps) => ps.filter((x) => x !== id));
    setFrente((fs) => [id, ...fs.filter((x) => x !== id)]);
  }, []);

  /* ---------- pular direto para um nome ----------
     A régua do dia virou mapa: clicar numa marca pendente traz aquela
     carta para a frente. Se o nome está fora do segmento filtrado, o
     filtro cai primeiro: um clique explícito num nome vale mais que o
     recorte que escondia ele. */
  const irPara = (id: string) => trazerParaCima(id);

  /* A RÉGUA SEGUE O MONTE (21/09). Ela media sempre o dia inteiro, e com
     "Anúncio e site" escolhido o clique numa marca trazia um card de
     garimpo e derrubava o filtro ("quando eu clico no quadrado vai para
     todos"). Agora, com um monte escolhido, a régua mostra só ele: os
     riscados dele, as pendentes dele, e a marca só leva a cards dele. */
  const riscadosDoMonte = useMemo(
    () => riscados.filter((l) => pertence(l, segmento)),
    [riscados, segmento, pertence],
  );

  /* A carta da vez é a de cima. Quando ela é resolvida, sai da fila do
     servidor e a de baixo assume sozinha, que é o gesto de baralho que a
     tela inteira imita. */
  const atual = baralho[0] ?? null;

  /* Para a direita, a carta de cima vai para o fundo (e sai da frente, se
     tinha sido trazida). Com o baralho inteiro já pulado uma vez, o mesmo
     gesto continua rodando: a carta volta para o fim da ordem dos
     pulados. Para a esquerda, a última pulada volta para cima: é o
     desfazer do pulo, e a seta diz o nome dela. */
  const andar = useCallback(
    (passo: number) => {
      if (passo > 0) {
        const id = baralho[0]?.id;
        if (!id || baralho.length < 2) return;
        setFrente((fs) => fs.filter((x) => x !== id));
        setPuladas((ps) => [...ps.filter((x) => x !== id), id]);
      } else {
        const ultima = [...puladas].reverse().find((id) => fila.some((l) => l.id === id));
        if (ultima) trazerParaCima(ultima);
      }
    },
    [baralho, puladas, fila, trazerParaCima],
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

  const anterior = (() => {
    const id = [...puladas].reverse().find((x) => fila.some((l) => l.id === x));
    return id ? (fila.find((l) => l.id === id) ?? null) : null;
  })();
  const proximo = baralho[1] ?? null;
  /* O contador conta a varredura: quantas já foram puladas nesta volta,
     mais a da vez. Quando o baralho inteiro já rodou e a de cima é uma
     pulada, a conta recomeça do lugar dela. */
  const puladasNaFila = puladas.filter((id) => fila.some((l) => l.id === id));
  const indice = atual && puladasNaFila.includes(atual.id) ? puladasNaFila.indexOf(atual.id) : puladasNaFila.length;

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

        {/* O post de hoje (Marketing) mora ao lado do "Anotar lead": são as
            duas coisas do dia que não são a carta da vez. Some quando não
            há post marcado para hoje. */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <PostDoDia posts={posts} />
          {/* O leitor do WhatsApp (01/10): mesmo caminho do "Ligar o time"
              do Marketing. O site não abre programa no PC; o link
              rr-whatsapp:// é que o Windows entrega ao
              scripts/ligar-leitor-whatsapp.cmd (registrado uma vez pelo
              scripts/registrar-botao-leitor.cmd). Ligado em outra janela,
              a nova avisa e fecha. Some no celular, onde não faz nada. */}
          <a
            className={`${s.btn} ${s.soNoPc}`}
            href="rr-whatsapp://ligar"
            title="Abre no PC a janela que lê as conversas com leads. Não envia nada."
          >
            Ligar o leitor do WhatsApp
          </a>
          <button type="button" className={s.btnAcao} onClick={() => setNovo(true)}>
            Anotar lead
          </button>
        </div>
      </div>

      {/* ============================================================
          A LINHA DE CONTROLE (01/10): a busca e os montes juntos

          A busca morava sozinha no canto de cima, acima do "Anotar lead",
          longe da fila que ela procura ("tá muito para cima, teria que
          estar mais junto"). Agora ela abre a linha dos montes: as duas
          coisas respondem "qual carta eu quero ver", então moram juntas,
          em cima da folha.

          E os montes pararam de rolar de lado. Com 26 segmentos, a
          fileira que rolava cortava na borda e o resto sumia sem aviso:
          "loja de iPhone" existia e não dava para ver. Agora a linha
          mostra os cinco maiores e termina no ÍNDICE: um botão que abre
          todos os segmentos em ordem alfabética, com o número na ponta de
          um pontilhado, como o índice remissivo de um livro. Dá para achar
          pelo nome, que é como se procura um segmento.
          ============================================================ */}
      <div className={s.vezControle}>
        <BuscaDaFila
          fila={filaDia}
          riscados={riscados}
          aoEscolher={(l) => {
            if (!pertence(l, segmento)) setSegmento(null);
            trazerParaCima(l.id);
          }}
        />

        {segmentos.length + (pediram ? 1 : 0) + (amostras ? 1 : 0) > 1 ? (
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
            {/* O monte de quem pediu vem primeiro e fala em ROSA: tem gente
                esperando. Os nichos são trabalho que eu escolho; este é
                trabalho que me escolheu. */}
            {pediram ? (
              <button
                type="button"
                className={`${s.vezMonte} ${s.vezMontePediram} ${segmento === PEDIRAM ? s.vezMonteAtivo : ""}`}
                onClick={() => escolherSegmento(segmento === PEDIRAM ? null : PEDIRAM)}
                aria-pressed={segmento === PEDIRAM}
                aria-label={`Anúncio e site, ${pediram} na fila`}
              >
                Anúncio e site<b className={s.vezMonteNum}>{pediram}</b>
              </button>
            ) : null}
            {/* A amostra parada também fala em rosa: é a vitrine pronta na
                Vercel esperando uma resposta, o trabalho mais perto do
                dinheiro que a fila tem. */}
            {amostras ? (
              <button
                type="button"
                className={`${s.vezMonte} ${s.vezMontePediram} ${segmento === AMOSTRA ? s.vezMonteAtivo : ""}`}
                onClick={() => escolherSegmento(segmento === AMOSTRA ? null : AMOSTRA)}
                aria-pressed={segmento === AMOSTRA}
                aria-label={`Amostra no ar, ${amostras} na fila`}
              >
                Amostra no ar<b className={s.vezMonteNum}>{amostras}</b>
              </button>
            ) : null}
            {visiveis.map(({ chave, n }) => (
              <button
                key={chave || "__sem"}
                type="button"
                className={`${s.vezMonte} ${segmento === chave ? s.vezMonteAtivo : ""}`}
                onClick={() => escolherSegmento(segmento === chave ? null : chave)}
                aria-pressed={segmento === chave}
                aria-label={`${chave || "sem segmento"}, ${n} na fila`}
              >
                {chave || "sem segmento"}
                <b className={s.vezMonteNum}>{n}</b>
              </button>
            ))}
          </div>
        ) : null}

        {segmentos.length > 1 ? (
          <button
              type="button"
              className={`${s.vezIndiceBotao} ${indiceAberto ? s.vezIndiceBotaoAberto : ""}`}
              onClick={() => setIndiceAberto((v) => !v)}
              aria-expanded={indiceAberto}
            >
              Todos os segmentos<b>{segmentos.length}</b>
            <i aria-hidden="true">{indiceAberto ? "↑" : "↓"}</i>
          </button>
        ) : null}
      </div>

      {indiceAberto ? (
        <div
          className={s.vezIndice}
          role="dialog"
          aria-label="Todos os segmentos"
          onKeyDown={(e) => e.key === "Escape" && setIndiceAberto(false)}
        >
          <p className={s.vezIndiceTitulo}>
            <b>
              Índice<i className={s.ponto}>.</i>
            </b>
            <span>{segmentos.length} segmentos, de A a Z</span>
          </p>
          <ul className={s.vezIndiceLista}>
            {[...segmentos]
              .sort((a, b) => (a.chave || "~").localeCompare(b.chave || "~", "pt-BR"))
              .map(({ chave, n }) => (
                <li key={chave || "__sem"}>
                  <button
                    type="button"
                    className={`${s.vezIndiceItem} ${segmento === chave ? s.vezIndiceItemAtivo : ""}`}
                    onClick={() => {
                      escolherSegmento(chave);
                      setIndiceAberto(false);
                    }}
                    aria-pressed={segmento === chave}
                  >
                    <span>{chave || "sem segmento"}</span>
                    <i aria-hidden="true" />
                    <b>{n}</b>
                  </button>
                </li>
              ))}
          </ul>
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
          <ReguaDoDia riscados={riscadosDoMonte} fila={fila} atualId={atual.id} painel={painel} aoIrPara={irPara} />

          <div className={s.vezPalco}>
            <CartaDaVez
              key={atual.id}
              lead={atual}
              hoje={painel.hoje}
              aoMandarMensagem={(lead, saida) => setMensagem({ lead, saida })}
              aoRegistrarToque={setToque}
              aoFecharVenda={setFechando}
            />
          </div>
        </div>
      ) : (
        /* Sem carta não há folha. Uma tarja de tinta com um bloco de papel
           dentro seria um objeto anunciando que não tem conteúdo, e o dia
           limpo é uma conclusão: ele vive na mesa, com a moldura fechada
           que o `.diaLimpo` já tem. O placar continua, sozinho. */
        <>
          <ReguaDoDia riscados={riscadosDoMonte} fila={fila} atualId={null} painel={painel} aoIrPara={irPara} />
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
              <b className={s.vezSetaNome}>{anterior ? nomeDaTecla(anterior) : "Início"}</b>
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
              {segmento === null
                ? "na fila"
                : segmento === PEDIRAM
                  ? "de anúncio e site"
                  : segmento === AMOSTRA
                    ? "com amostra no ar"
                    : `em ${segmento || "sem segmento"}`}
            </span>
            {riscados.length ? <RiscadosDoPe riscados={riscados} /> : null}
          </span>

          <button
            type="button"
            className={`${s.vezSeta} ${s.vezSetaProxima}`}
            onClick={() => andar(1)}
            disabled={!proximo}
            title="Seta para a direita: esta carta vai para o fim da fila"
          >
            <i className={s.vezSetaGlifo} aria-hidden="true">
              →
            </i>
            <span className={s.vezSetaTexto}>
              <span className={s.vezSetaRot}>Próxima</span>
              <b className={s.vezSetaNome}>{proximo ? nomeDaTecla(proximo) : "Última do dia"}</b>
            </span>
          </button>
        </footer>
      ) : null}

      {mensagem ? (
        <ModalMensagem
          lead={mensagem.lead}
          saida={mensagem.saida}
          templates={templates}
          aoFechar={() => setMensagem(null)}
          /* Varrendo o monte da amostra, a mensagem da vez é a condição
             única, não o degrau da escada nem o template da etapa. */
          sugestao={
            segmento === AMOSTRA && amostraParada(mensagem.lead)
              ? { titulo: TITULO_AMOSTRA_PRONTA, porque: "Amostra no ar e sem resposta: a condição única, uma vez só" }
              : undefined
          }
        />
      ) : null}
      {toque ? <ModalToque lead={toque} aoFechar={() => setToque(null)} /> : null}
      {fechando ? <ModalContrato lead={fechando} hoje={painel.hoje} ganhar aoFechar={() => setFechando(null)} /> : null}
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
  /* A fila DO MONTE escolhido (desde 21/09; antes era sempre o dia
     inteiro). Sem monte, é o dia. A marca da vez acha o lead pelo id. */
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
        Funil aberto
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
          Nenhum lead ativo no funil. Anote o primeiro nome e ele passa a te cobrar sozinho,
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

/* ============================================================
   A PESQUISA DA FILA (01/10)

   Com 454 nomes no baralho, achar "aquele da Imperium" era apertar a seta
   até ele aparecer. A pesquisa responde pelo que se lembra na hora: nome,
   empresa, @, nicho, cidade, o número do WhatsApp ou a frase do passo.

   Escolher um resultado da fila NÃO abre a ficha: traz a carta para cima,
   que é o gesto da régua, e derruba o monte se ele escondia o nome. Quem
   já foi riscado hoje não tem carta, então o resultado dele leva à ficha.

   Ela procura só no que esta tela carrega (a fila e os riscados do dia).
   Lead com retorno marcado para outro dia não está aqui, e a resposta
   vazia diz isso e aponta o quadro, em vez de fingir que ele não existe.
   ============================================================ */
const semAcento = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");

function casa(l: LeadPainel, termo: string, digitos: string) {
  const campos = [l.nome, l.empresa, l.instagram, l.nicho, l.cidade, l.proximo_passo].filter(Boolean) as string[];
  if (campos.some((c) => semAcento(c).includes(termo))) return true;
  return digitos.length >= 4 && (l.whatsapp ?? "").replace(/\D/g, "").includes(digitos);
}

function BuscaDaFila({
  fila,
  riscados,
  aoEscolher,
}: {
  fila: LeadPainel[];
  riscados: LeadPainel[];
  aoEscolher: (l: LeadPainel) => void;
}) {
  const [termo, setTermo] = useState("");
  const [aberta, setAberta] = useState(false);
  const [foco, setFoco] = useState(0);

  const t = semAcento(termo.trim().replace(/^@+/, ""));
  const digitos = termo.replace(/\D/g, "");
  const resultados = useMemo(() => {
    if (!t) return [];
    const daFila = fila.filter((l) => casa(l, t, digitos)).map((l) => ({ l, riscado: false }));
    const jaFoi = riscados.filter((l) => casa(l, t, digitos)).map((l) => ({ l, riscado: true }));
    return [...daFila, ...jaFoi].slice(0, 8);
  }, [fila, riscados, t, digitos]);

  const limpar = () => {
    setTermo("");
    setAberta(false);
    setFoco(0);
  };
  const escolher = (l: LeadPainel) => {
    aoEscolher(l);
    limpar();
  };

  return (
    <div className={s.vezBusca}>
      <label className={s.buscaLinha}>
        <span className={s.buscaRot}>Buscar</span>
        <input
          type="search"
          value={termo}
          onChange={(e) => {
            setTermo(e.target.value);
            setAberta(true);
            setFoco(0);
          }}
          onFocus={() => setAberta(true)}
          onBlur={() => setTimeout(() => setAberta(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") return limpar();
            if (e.key === "ArrowDown") { e.preventDefault(); setFoco((f) => Math.min(f + 1, resultados.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setFoco((f) => Math.max(f - 1, 0)); }
            if (e.key === "Enter") {
              const r = resultados[foco];
              if (!r) return;
              e.preventDefault();
              if (r.riscado) window.location.href = `/crm/lead/${r.l.id}`;
              else escolher(r.l);
            }
          }}
          placeholder="nome, @ ou nicho"
          aria-label="Buscar um lead na fila de hoje"
        />
      </label>

      {aberta && t ? (
        <ul className={s.vezBuscaLista} role="listbox">
          {resultados.length ? (
            resultados.map(({ l, riscado }, i) => {
              const conteudo = (
                <>
                  <b>{nomeDaTecla(l)}</b>
                  <span>
                    {riscado ? "já falei hoje" : NOME_ESTAGIO[l.estagio]}
                    {l.nicho ? ` · ${l.nicho}` : ""}
                  </span>
                </>
              );
              return (
                <li key={l.id} role="option" aria-selected={i === foco}>
                  {riscado ? (
                    <Link
                      href={`/crm/lead/${l.id}`}
                      className={`${s.vezBuscaItem} ${i === foco ? s.vezBuscaFoco : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={limpar}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`${s.vezBuscaItem} ${i === foco ? s.vezBuscaFoco : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => escolher(l)}
                    >
                      {conteudo}
                    </button>
                  )}
                </li>
              );
            })
          ) : (
            <li className={s.vezBuscaVazio}>
              Ninguém na fila de hoje com isso. Quem tem retorno marcado para outro dia está no{" "}
              <Link href="/crm/pipeline" onMouseDown={(e) => e.preventDefault()}>
                quadro
              </Link>
              .
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
