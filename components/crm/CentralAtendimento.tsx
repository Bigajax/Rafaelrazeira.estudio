"use client";

/* ============================================================
   O HOJE: UMA FILA SÓ (10/11/2026)

   Até aqui eram seis abas (Novos, Preciso responder, Retornos, Prospecção,
   Viu o preço, Black), com 273, 5, 298, 351, 97 e 107 nomes. A única que
   era dinheiro, "Preciso responder", tinha o mesmo peso das outras, e o
   cabeçalho, as abas, o contexto, o aviso e os filtros somavam uns 500px
   antes do primeiro contato numa tela de 700.

   Agora a tela é a fila da vez, em quatro grupos na ordem do dinheiro
   (`filaDaVez` em lib/crm/atendimento.ts, onde está o porquê de cada um),
   com o cabeçalho numa linha. O resto do funil fica atrás de "Fora da
   fila" e da busca, que procura em todos. A prospecção saiu daqui por
   decisão do Rafael: ela se trabalha pelo Funil.

   O que nunca fazer: devolver uma aba por critério. Cada aba nova vira uma
   fila que ninguém zera.
   ============================================================ */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirPasso, registrarToque } from "@/app/(pt)/crm/acoes";
import { arquivarParados, desfazerArquivo, lerHistoricoAtendimento, type ComoEstava } from "@/app/(pt)/crm/acoes-atendimento";
import {
  DIAS_PARADO,
  DIAS_PARA_ENCERRAR,
  GRUPOS_DA_FILA,
  MARCAS,
  RESUMO_PRECO_A_MAO,
  RESUMO_QUER_NO_AR,
  RESUMO_RESPONDEU,
  TEMPLATE_BLACK_AMOSTRA,
  TEMPLATE_BLACK_VIU,
  TEMPLATE_QUER_NO_AR,
  TITULO_COBRANCA,
  TITULO_VOLTA_DA_BLACK,
  TITULO_VOLTA_DA_LOJA_ONLINE,
  TITULO_VOLTA_DO_PRECO,
  diasDoPreco,
  filaDaVez,
  marcaDe,
  naBlack,
  novoContato,
  parado,
  precisaResponder,
  tempoDeEspera,
  type GrupoDaFila,
  type HistoricoAtendimento,
} from "@/lib/crm/atendimento";
import type { painelHoje } from "@/lib/crm/dados";
import { arrobaDe, dataCurta, diaEmSP, diasDesde, diasEntre, dinheiro, ehLojaOnline, linkWhatsapp, momentoDoContato, somarDias } from "@/lib/crm/regras";
import { ehAtivo, NOME_CANAL, NOME_ESTAGIO, NOME_ORIGEM, NOME_TIPO, type Direcao, type LeadPainel, type Template } from "@/lib/crm/tipos";
import { ModalNovoLead } from "./ModalNovoLead";
import { ModalMensagem } from "./ModalMensagem";
import { ModalToque } from "./ModalToque";
import c from "./atendimento.module.css";

type Props = { painel: Awaited<ReturnType<typeof painelHoje>>; templates: Template[] };
/* Uma linha da lista. `grupo` nulo é quem veio da busca ou do "Fora da fila". */
type Linha = { lead: LeadPainel; grupo: GrupoDaFila | null; encerrar: boolean };

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
const hora = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? "Horário indisponível"
    : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;
const blackPorMandar = (l: LeadPainel) => naBlack(l) && !l.black_em;

/* O que a linha diz, numa frase: por que esta pessoa está na fila agora. */
function motivoDe({ lead: l, grupo, encerrar }: Linha, hoje: string, agora: number | null): { texto: string; alto: boolean } {
  if (grupo === "responder") {
    if (l.quer_no_ar) return { texto: "Quer colocar no ar", alto: true };
    if (l.cobranca && l.cobranca.quando <= hoje) return { texto: `A receber ${dinheiro(l.cobranca.saldo)}`, alto: true };
    if (precisaResponder(l)) return { texto: agora ? `Escreveu, ${tempoDeEspera(momentoDoContato(l), agora)}` : "Escreveu por último", alto: true };
    return { texto: marcaDe(l)?.nome ?? "Sua vez", alto: true };
  }
  if (grupo === "novos") return { texto: agora ? tempoDeEspera(momentoDoContato(l), agora) : `Desde ${hora(momentoDoContato(l))}`, alto: true };
  if (grupo === "preco") {
    if (blackPorMandar(l)) return { texto: "Mandar a Black", alto: false };
    const d = diasDoPreco(l, hoje);
    if (encerrar) return { texto: `Sem resposta há ${dias(d)}: encerrar`, alto: false };
    return { texto: `${l.black_em ? "Black" : "Preço"} há ${dias(d)}, sem resposta`, alto: false };
  }
  if (grupo === "amostra") {
    if (blackPorMandar(l)) return { texto: "Mandar a Black", alto: false };
    const d = diasDesde(l.ultimo_toque_em ?? l.created_at, hoje);
    return { texto: encerrar ? `Parada há ${dias(d)}: encerrar` : `Amostra há ${dias(d)}, sem reação`, alto: false };
  }
  return { texto: `${NOME_ESTAGIO[l.estagio]} · ${l.proxima_acao_em ? `retorno ${dataCurta(l.proxima_acao_em)}` : "sem retorno marcado"}`, alto: false };
}

/* O template que o "Mandar mensagem" abre já escolhido. Sem pedido, o modal
   decide pela etapa e pela escada do silêncio. */
function sugestaoDe({ lead: l, grupo, encerrar }: Linha, hoje: string) {
  if (l.quer_no_ar) return { titulo: TEMPLATE_QUER_NO_AR, porque: "Pediu para colocar no ar: responda com o Pix da entrada" };
  if (l.cobranca && l.cobranca.quando <= hoje) return { titulo: TITULO_COBRANCA, porque: `Tem ${dinheiro(l.cobranca.saldo)} em aberto: a cobrança, com o valor já escrito` };
  /* O preço que saiu por fora do CRM não tem toque: a lista da Black traz
     "(já viu o preço)" no passo, conferido no WhatsApp em 03/11. */
  if (blackPorMandar(l))
    return l.preco_em || l.proximo_passo?.includes("já viu o preço")
      ? { titulo: TEMPLATE_BLACK_VIU, porque: "Na lista da Black e já viu o preço: a condição de R$ 799 até 30/11" }
      : { titulo: TEMPLATE_BLACK_AMOSTRA, porque: "Na lista da Black, só com a amostra: o preço pela primeira vez, já com a Black" };
  const marca = marcaDe(l);
  if (marca?.template) return { titulo: marca.template, porque: `${marca.nome}: o resumo pronto pra encaminhar` };
  /* A volta depois do preço (10/11). Quem está em Proposta ou Negociação
     fica com a "Proposta sem resposta", que a etapa já sugere. */
  if (grupo === "preco" && !encerrar && !["proposta", "negociacao"].includes(l.estagio)) {
    const d = dias(diasDoPreco(l, hoje));
    return l.black_em
      ? { titulo: TITULO_VOLTA_DA_BLACK, porque: `Recebeu a Black há ${d} e não respondeu: uma volta só, com a saída aberta` }
      : { titulo: ehLojaOnline(l) ? TITULO_VOLTA_DA_LOJA_ONLINE : TITULO_VOLTA_DO_PRECO, porque: `Viu o preço há ${d} e não respondeu: uma volta só, com a saída aberta` };
  }
  return undefined;
}

export function CentralAtendimento({ painel, templates }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [verFora, setVerFora] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [registro, setRegistro] = useState<{ lead: LeadPainel; direcao: Direcao } | null>(null);
  /* O "Mandar mensagem" abre aqui mesmo (01/11): o Rafael abria a ficha só
     para chegar nele. Junto vai o próximo da fila, para onde a tela anda
     quando a mensagem sai. */
  const [mensagem, setMensagem] = useState<{ lead: LeadPainel; proximo: string | null; sugestao?: { titulo: string; porque: string } } | null>(null);
  const [agora, setAgora] = useState<number | null>(null);
  /* Arquivar: primeiro a lista à vista, depois o clique, e o Desfazer fica
     na tela com o estado de antes de cada um. */
  const [revisando, setRevisando] = useState(false);
  const [arquivados, setArquivados] = useState<ComoEstava[] | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [arquivando, comecarArquivo] = useTransition();
  /* O LOTE (10/11): em 10/11 havia 95 voltas do preço para mandar, uma por
     uma, e cada envio devolvia à lista. Agora, ao enviar, o modal do
     próximo do MESMO grupo já abre. Fechar sem enviar para o lote. O modal
     chama aoEnviar e logo aoFechar, por isso o próximo espera aqui. */
  const seguinte = useRef<typeof mensagem>(null);
  const detalheRef = useRef<HTMLElement>(null);
  const filaRef = useRef<HTMLElement>(null);

  const hoje = painel.hoje;
  const fila = useMemo(() => filaDaVez(painel.contatos, hoje), [painel.contatos, hoje]);
  const termo = busca.trim();
  /* A busca procura em TODOS, não só na fila: é por ela que se chega em
     quem ficou de fora. */
  const linhas: Linha[] = useMemo(() => {
    if (termo) {
      const alvo = normalizar(termo);
      const numero = termo.replace(/\D/g, "");
      const naFila = new Map(fila.itens.map((i) => [i.lead.id, i]));
      return [...new Map(painel.contatos.map((l) => [l.id, l])).values()]
        .filter((l) => {
          const texto = normalizar([l.nome, l.empresa, l.nicho, l.cidade, l.email, l.instagram, l.whatsapp].filter(Boolean).join(" "));
          return texto.includes(alvo) || (numero.length >= 5 && (l.whatsapp ?? "").replace(/\D/g, "").includes(numero));
        })
        /* Quem está na fila leva o grupo dela para a busca (10/11): o Santana,
           que deve parcela, aparecia como "Ganho · sem retorno marcado". */
        .map((l) => ({ lead: l, grupo: naFila.get(l.id)?.grupo ?? null, encerrar: naFila.get(l.id)?.encerrar ?? false }));
    }
    if (verFora) return fila.fora.map((l) => ({ lead: l, grupo: null, encerrar: false }));
    return fila.itens;
  }, [termo, verFora, fila, painel.contatos]);
  const atual = linhas.find((i) => i.lead.id === selecionado) ?? linhas[0] ?? null;
  const agrupada = !termo && !verFora;

  useEffect(() => {
    const atualizar = () => {
      setAgora(Date.now());
      if (document.visibilityState === "visible") router.refresh();
    };
    setAgora(Date.now());
    const timer = window.setInterval(atualizar, 60000);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [router]);

  /* Os parados de fora da fila. A prospecção não entra: o Rafael decidiu em
     10/11 tirá-la da tela do dia sem arquivar nada. */
  const parados = useMemo(() => (verFora ? fila.fora.filter((l) => l.origem !== "prospeccao" && parado(l, hoje)) : []), [verFora, fila.fora, hoje]);
  function arquivar(ids: string[], proximo: string | null = null) {
    setErroArquivo(null);
    comecarArquivo(async () => {
      const r = await arquivarParados(ids);
      if (r.ok) {
        setArquivados(r.antes);
        setRevisando(false);
        setSelecionado(proximo);
        router.refresh();
      } else setErroArquivo(r.erro);
    });
  }
  function desfazer() {
    if (!arquivados) return;
    setErroArquivo(null);
    comecarArquivo(async () => {
      const r = await desfazerArquivo(arquivados);
      if (r.ok) {
        setArquivados(null);
        router.refresh();
      } else setErroArquivo(r.erro);
    });
  }
  const proximoDe = (id: string) => {
    const i = linhas.findIndex((x) => x.lead.id === id);
    return (linhas[i + 1] ?? linhas[i - 1])?.lead.id ?? null;
  };
  function escolher(id: string) {
    setSelecionado(id);
    if (window.matchMedia("(max-width: 860px)").matches) {
      requestAnimationFrame(() => {
        detalheRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
        detalheRef.current?.focus({ preventScroll: true });
      });
    }
  }

  const linha = (i: Linha) => {
    const l = i.lead;
    const m = motivoDe(i, hoje, agora);
    const contexto = [l.empresa !== l.nome ? l.empresa : null, l.nicho].filter(Boolean).join(" · ") || NOME_ORIGEM[l.origem];
    return (
      <li key={l.id}>
        <button type="button" className={c.contato} data-contato={l.id} aria-pressed={atual?.lead.id === l.id} onClick={() => escolher(l.id)}>
          <b>{l.nome}</b>
          <span className={c.contatoEmpresa}>{contexto}</span>
          <span className={m.alto ? c.espera : c.motivo}>{m.texto}</span>
        </button>
      </li>
    );
  };

  return (
    <div className={c.central} data-atendimento>
      <header className={c.cabecalho}>
        <div>
          <h1>
            Hoje<span>.</span>
          </h1>
          <p>
            <b>{fila.itens.length} na fila</b>
            {fila.aguardando > 0 && ` · ${fila.aguardando} aguardando resposta`}
            {painel.resultado && ` · em 30 dias, ${painel.resultado.precos} ${painel.resultado.precos === 1 ? "viu" : "viram"} o preço e ${painel.resultado.fechados} ${painel.resultado.fechados === 1 ? "fechou" : "fecharam"}`}
          </p>
        </div>
        <div className={c.acoes}>
          <label className={c.busca}>
            <span className={c.srOnly}>Buscar em todos os contatos</span>
            <input type="search" placeholder="Buscar em todos os contatos" value={busca} onChange={(e) => { setBusca(e.target.value); setSelecionado(null); }} />
          </label>
          <Link className={c.botao} href="/crm?modo=visao">Visão do estúdio</Link>
          <Link className={c.botao} href="/crm/pipeline">Funil</Link>
          <button className={c.botao} type="button" onClick={() => setNovo(true)}>+ Novo contato</button>
        </div>
      </header>

      {arquivados ? (
        <div className={c.arquivo} role="status">
          <p>
            {arquivados.length} {arquivados.length === 1 ? "contato encerrado" : "contatos encerrados"} como perdido (sumiu, sem resposta).
          </p>
          <button type="button" className={c.botao} disabled={arquivando} onClick={desfazer}>{arquivando ? "Desfazendo…" : "Desfazer"}</button>
          <button type="button" className={c.linkBotao} onClick={() => setArquivados(null)}>Fechar</button>
        </div>
      ) : parados.length > 0 && !revisando ? (
        <div className={c.arquivo}>
          <p>
            {parados.length} {parados.length === 1 ? "contato de fora da fila está parado" : "contatos de fora da fila estão parados"} há mais de {DIAS_PARADO} dias. A prospecção não entra nesta conta.
          </p>
          <button type="button" className={c.botao} onClick={() => setRevisando(true)}>Revisar e arquivar</button>
        </div>
      ) : null}
      {revisando && (
        <div className={c.arquivo} data-revisando>
          <p>
            <b>Arquivar {parados.length} como perdidos, "sumiu, sem resposta"?</b> Saem do Funil, e o retorno marcado de cada um é apagado. O Desfazer devolve tudo como estava.
          </p>
          <ul>
            {parados.map((l) => (
              <li key={l.id}>
                {l.nome}
                <span>{NOME_ESTAGIO[l.estagio]} · último movimento {dataCurta(diaEmSP(l.ultimo_toque_em ?? l.created_at))}</span>
              </li>
            ))}
          </ul>
          <div className={c.acoes}>
            <button type="button" className={`${c.botao} ${c.primario}`} disabled={arquivando} onClick={() => arquivar(parados.map((l) => l.id))}>{arquivando ? "Arquivando…" : `Arquivar os ${parados.length}`}</button>
            <button type="button" className={c.botao} onClick={() => setRevisando(false)}>Cancelar</button>
          </div>
        </div>
      )}
      {erroArquivo && <p role="alert" className={c.erroArquivo}>{erroArquivo}</p>}

      <div className={c.mesa}>
        <section ref={filaRef} className={c.fila} aria-label="A fila de hoje">
          {!agrupada && (
            <div className={c.filaCabecalho}>
              <b>{termo ? `${linhas.length} ${linhas.length === 1 ? "encontrado" : "encontrados"}` : `${linhas.length} fora da fila`}</b>
              <button type="button" className={c.linkBotao} onClick={() => { setBusca(""); setVerFora(false); setRevisando(false); setSelecionado(null); }}>← Voltar para a fila</button>
            </div>
          )}
          <div className={c.rolagem}>
            {agrupada ? (
              GRUPOS_DA_FILA.map((g) => {
                const doGrupo = linhas.filter((i) => i.grupo === g.id);
                return doGrupo.length ? (
                  <div key={g.id} className={c.grupo} data-grupo={g.id}>
                    <h2>
                      {g.nome}
                      <b>{doGrupo.length}</b>
                    </h2>
                    <ul>{doGrupo.map(linha)}</ul>
                  </div>
                ) : null;
              })
            ) : (
              <ul>{linhas.map(linha)}</ul>
            )}
            {!linhas.length && (
              <div className={c.vazio}>
                <b>{termo ? "Ninguém com esse nome" : agrupada ? "Fila zerada" : "Ninguém fora da fila"}</b>
                <p>{termo ? "A busca olha nome, loja, segmento, @ e telefone." : agrupada ? (fila.aguardando ? `${fila.aguardando} aguardando resposta. Quem escrever ou chegar aparece aqui.` : "Quem escrever ou chegar aparece aqui.") : "Todo o funil está na fila."}</p>
              </div>
            )}
          </div>
          {agrupada && fila.fora.length > 0 && (
            <button type="button" className={c.fora} onClick={() => { setVerFora(true); setSelecionado(null); }}>
              Fora da fila<b>{fila.fora.length}</b>
            </button>
          )}
        </section>

        <section ref={detalheRef} className={c.detalhe} tabIndex={-1} aria-label="Atendimento selecionado">
          <button
            type="button"
            className={`${c.linkBotao} ${c.voltarLista}`}
            onClick={() => {
              filaRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
              filaRef.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')?.focus({ preventScroll: true });
            }}
          >
            ← Voltar para a fila
          </button>
          {atual ? (
            <Atendimento
              key={atual.lead.id}
              item={atual}
              hoje={hoje}
              encerrando={arquivando}
              aoRegistrar={(direcao) => setRegistro({ lead: atual.lead, direcao })}
              aoMandar={() => setMensagem({ lead: atual.lead, proximo: proximoDe(atual.lead.id), sugestao: sugestaoDe(atual, hoje) })}
              aoEncerrar={() => arquivar([atual.lead.id], proximoDe(atual.lead.id))}
            />
          ) : (
            <div className={c.semSelecao}>
              <span aria-hidden="true">✓</span>
              <h3>{termo ? "Nada encontrado" : "Fila zerada"}</h3>
              <p>{termo ? "Confira a grafia, ou busque pelo telefone." : "Ninguém esperando você agora."}</p>
            </div>
          )}
        </section>
      </div>

      {novo && <ModalNovoLead origemInicial="inbound" pesquisarAoCriar={false} aoCriar={(id) => { setBusca(""); setVerFora(false); setSelecionado(id); router.refresh(); }} aoFechar={() => setNovo(false)} />}
      {mensagem && (
        <ModalMensagem
          lead={mensagem.lead}
          templates={templates}
          sugestao={mensagem.sugestao}
          key={mensagem.lead.id}
          aoFechar={() => {
            setMensagem(seguinte.current);
            seguinte.current = null;
          }}
          aoEnviar={(r) => {
            const daVez = linhas.find((x) => x.lead.id === mensagem.lead.id);
            const prox = linhas.find((x) => x.lead.id === mensagem.proximo);
            setSelecionado(mensagem.proximo);
            seguinte.current =
              prox && daVez?.grupo && daVez.grupo !== "responder" && prox.grupo === daVez.grupo && !prox.encerrar
                ? { lead: prox.lead, proximo: proximoDe(prox.lead.id), sugestao: sugestaoDe(prox, hoje) }
                : null;
            void r.finally(() => router.refresh());
          }}
        />
      )}
      {registro && <ModalToque lead={registro.lead} direcaoInicial={registro.direcao} exigirProximoPasso aoFechar={() => { setRegistro(null); router.refresh(); }} />}
    </div>
  );
}

function Atendimento({
  item,
  hoje,
  encerrando,
  aoRegistrar,
  aoMandar,
  aoEncerrar,
}: {
  item: Linha;
  hoje: string;
  encerrando: boolean;
  aoRegistrar: (direcao: Direcao) => void;
  aoMandar: () => void;
  aoEncerrar: () => void;
}) {
  const { lead, grupo, encerrar } = item;
  const [historico, setHistorico] = useState<HistoricoAtendimento[] | null>(null);
  const [falha, setFalha] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [passo, setPasso] = useState(lead.proximo_passo ?? "");
  const [data, setData] = useState(lead.proxima_acao_em && lead.proxima_acao_em >= hoje ? lead.proxima_acao_em : somarDias(hoje, 3));
  const [editando, setEditando] = useState(false);
  const [erroPasso, setErroPasso] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();
  const [marcando, comecarMarca] = useTransition();
  const [erroMarca, setErroMarca] = useState<string | null>(null);
  /* O que foi falado por fora, anotado aqui mesmo (10/11): o Rafael já tinha
     falado com a Isis pelo celular e não achou onde anotar. O caminho era um
     link pequeno em cima da conversa, que abria um modal com etapa e data. */
  const [anotando, setAnotando] = useState(false);
  const [nota, setNota] = useState("");
  const router = useRouter();
  const canal = lead.whatsapp ? "whatsapp" : "instagram";

  /* O QUE ACONTECEU, num clique. O leitor do WhatsApp está desligado desde
     01/10, então o CRM só sabe o que é marcado aqui.
     "Respondeu" e "Quer colocar no ar" são entradas (a pessoa escreveu): o
     lead sobe para "Responder agora". "Um áudio" e "ver com o sócio" viram
     o próximo passo para hoje. "Já mandei o preço" é a saída que foi por
     fora do CRM (01/11): sem ela o grupo "Preço no ar" não acha ninguém. */
  function toque(direcao: Direcao, resumo: string, depois?: () => void) {
    setErroMarca(null);
    comecarMarca(async () => {
      const r = await registrarToque(lead.id, { canal, direcao, resumo });
      if (r.ok) {
        depois?.();
        router.refresh();
      }
      else setErroMarca("erro" in r ? r.erro : "Não foi possível marcar.");
    });
  }
  function marcar(passoDaMarca: string) {
    setErroMarca(null);
    comecarMarca(async () => {
      const r = await definirPasso(lead.id, passoDaMarca, hoje);
      if (r.ok) router.refresh();
      else setErroMarca("erro" in r ? r.erro : "Não foi possível marcar.");
    });
  }
  const marca = marcaDe(lead);
  useEffect(() => {
    let ativo = true;
    setHistorico(null);
    setFalha(null);
    lerHistoricoAtendimento(lead.id)
      .then((r) => {
        if (!ativo) return;
        if (r.ok) setHistorico(r.interacoes);
        else setFalha(r.erro);
      })
      .catch(() => {
        if (ativo) setFalha("Não foi possível carregar o histórico.");
      });
    return () => {
      ativo = false;
    };
  }, [lead.id, lead.toques, tentativa]);
  const whatsapp = linkWhatsapp(lead.whatsapp);
  const instagram = arrobaDe(lead.instagram);
  const ultimaEntrada = historico?.find((i) => i.direcao === "entrada");
  const ehNovo = novoContato(lead);
  /* Quem ainda não recebeu nada meu continua "novo" depois de marcado: o
     histórico é que diz se o clique já foi dado. */
  const respondeu = precisaResponder(lead) || Boolean(historico?.[0]?.direcao === "entrada" && historico[0].resumo?.startsWith(RESUMO_RESPONDEU));
  const ativo = ehAtivo(lead.estagio);
  const d = grupo === "preco" ? diasDoPreco(lead, hoje) : diasDesde(lead.ultimo_toque_em ?? lead.created_at, hoje);

  /* ============================================================
     A VEZ (10/11/2026, segunda rodada)

     O detalhe mostrava tudo no mesmo tom: sete fatos numa linha, o código
     do anúncio, dois quadros azuis iguais ("última mensagem", que era o
     envio do formulário, e a cobrança) e o rosa num "Mandar mensagem"
     genérico. No Santana, o motivo de ele estar na fila (R$ 400 em aberto
     desde 26/09) era o terceiro bloco da tela.

     Agora o primeiro bloco responde uma pergunta só, "por que esta pessoa
     e o que eu faço", com o botão dizendo a ação. O resto desce em voz
     baixa: o que a pessoa disse, o próximo passo numa linha, a conversa e
     os dados do cadastro no pé.
     ============================================================ */
  const fala = ultimaEntrada?.resumo && !/^Preencheu o formulário/i.test(ultimaEntrada.resumo) ? ultimaEntrada.resumo : null;
  const cobranca = lead.cobranca && lead.cobranca.quando <= hoje ? lead.cobranca : null;
  /* vence_em é data pura: diasDesde a leria como meia-noite UTC e contaria um dia a mais. */
  const atrasoDaParcela = cobranca ? diasEntre(cobranca.vence_em, hoje) : 0;
  const vez: { titulo: string; detalhe?: string; botao: string } = lead.quer_no_ar
    ? { titulo: "Pediu para colocar no ar", detalhe: "É o lead mais quente da fila. Responda com o Pix da entrada.", botao: "Mandar o Pix" }
    : cobranca
      ? { titulo: `A receber ${dinheiro(cobranca.saldo)}`, detalhe: `${cobranca.rotulo} · ${atrasoDaParcela > 0 ? `venceu há ${dias(atrasoDaParcela)}` : "vence hoje"}, em ${dataCurta(cobranca.vence_em)}`, botao: "Cobrar no WhatsApp" }
      : marca
        ? { titulo: marca.nome, detalhe: marca.id === "audio" ? "Grave o áudio explicando como funciona: onde houve áudio, a conversa viveu." : "Mande o resumo pronto pra encaminhar e pergunte quando eles conversam.", botao: marca.id === "audio" ? "Abrir a conversa" : "Mandar o resumo" }
        : respondeu
          ? { titulo: "Escreveu por último", detalhe: fala ? undefined : "A resposta foi marcada à mão, sem o texto.", botao: "Responder" }
          : encerrar
            ? { titulo: `Sem resposta há ${dias(d)}`, detalhe: `Pela regra da casa, depois de uns ${DIAS_PARA_ENCERRAR} dias não rolou: encerre e tire a amostra do ar.`, botao: "Mandar mensagem" }
            : blackPorMandar(lead)
              ? { titulo: "Falta mandar a Black", detalhe: "R$ 799 à vista até 30/11.", botao: "Mandar a Black" }
              : grupo === "novos" || ehNovo
                ? { titulo: "Chegou e ainda não ouviu de você", detalhe: ultimaEntrada?.resumo ?? undefined, botao: "Mandar a primeira mensagem" }
                : grupo === "preco"
                  ? { titulo: `Viu ${lead.black_em ? "a Black" : "o preço"} há ${dias(d)}, sem resposta`, detalhe: "Uma volta só, com a saída aberta. Depois dela o contato sai da fila até o décimo dia.", botao: "Mandar a volta" }
                  : grupo === "amostra"
                    ? { titulo: `Amostra há ${dias(d)}, sem reação`, detalhe: "Volte com novidade na vitrine, nunca com cobrança.", botao: "Voltar com novidade" }
                    : { titulo: NOME_ESTAGIO[lead.estagio], detalhe: lead.proximo_passo ?? "Fora da fila de hoje.", botao: "Mandar mensagem" };
  const dados = [NOME_ORIGEM[lead.origem], `entrou ${hora(lead.created_at)}`, lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : null, lead.ticket_estimado != null ? dinheiro(lead.ticket_estimado) || null : null, lead.preco_em ? `viu o preço em ${dataCurta(diaEmSP(lead.preco_em))}` : null, lead.campanha ? [lead.campanha, lead.anuncio].filter(Boolean).join(" · ") : null].filter(Boolean).join(" · ");

  return (
    <>
      <div className={c.detalheCabecalho}>
        <div className={c.identificacao}>
          <div>
            <h2>{lead.nome}</h2>
            <p>{[lead.empresa !== lead.nome ? lead.empresa : null, lead.nicho, lead.cidade].filter(Boolean).join(" · ") || NOME_ESTAGIO[lead.estagio]}</p>
          </div>
        </div>
        <Link className={c.link} href={`/crm/lead/${lead.id}`}>Abrir ficha ↗</Link>
      </div>

      <section className={c.vez} data-alto={grupo === "responder" || grupo === "novos"}>
        <h3>{vez.titulo}</h3>
        {fala && respondeu ? <blockquote>{fala}</blockquote> : vez.detalhe ? <p>{vez.detalhe}</p> : null}
        <div className={c.acoes}>
          {encerrar && ativo && <button type="button" className={`${c.botao} ${c.primario}`} disabled={encerrando} onClick={aoEncerrar}>{encerrando ? "Encerrando…" : "Não rolou"}</button>}
          {whatsapp || instagram ? (
            <button type="button" className={`${c.botao} ${encerrar ? "" : c.vende}`} onClick={aoMandar}>{vez.botao}</button>
          ) : (
            <Link className={`${c.botao} ${c.vende}`} href={`/crm/lead/${lead.id}`}>Completar canal de contato</Link>
          )}
          {cobranca && <Link className={c.botao} href="/crm/caixa">Dar baixa no Caixa</Link>}
          {instagram && <a className={c.botao} href={`https://www.instagram.com/${encodeURIComponent(instagram)}/`} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}
        </div>
        {(grupo === "novos" || grupo === "preco" || grupo === "amostra") && !encerrar && <small>Ao enviar, o próximo deste grupo já abre. Fechar sem enviar para.</small>}
      </section>

      {ativo && (
        <div className={c.pedidos}>
          <span>A pessoa:</span>
          <button type="button" className={c.pilula} aria-pressed={respondeu && !lead.quer_no_ar} disabled={marcando || respondeu} onClick={() => toque("entrada", RESUMO_RESPONDEU)}>Respondeu</button>
          <button type="button" className={c.pilula} aria-pressed={Boolean(lead.quer_no_ar)} disabled={marcando || lead.quer_no_ar} onClick={() => toque("entrada", RESUMO_QUER_NO_AR)}>Quer colocar no ar</button>
          {MARCAS.map((m) => (
            <button key={m.id} type="button" className={c.pilula} aria-pressed={marca?.id === m.id} disabled={marcando || marca?.id === m.id} onClick={() => marcar(m.passo)}>{m.id === "audio" ? "Pediu áudio" : "Vai ver com o sócio"}</button>
          ))}
          <button type="button" className={c.pilula} onClick={() => aoRegistrar("entrada")}>Disse que não, ou depois</button>
        </div>
      )}
      <div className={c.pedidos}>
        <span>Eu:</span>
        <button type="button" className={c.pilula} aria-expanded={anotando} onClick={() => setAnotando((v) => !v)}>Já falei por fora</button>
        {!lead.preco_em && ativo && <button type="button" className={c.pilula} disabled={marcando} onClick={() => toque("saida", RESUMO_PRECO_A_MAO)}>Já mandei o preço</button>}
      </div>
      {anotando && (
        <form
          className={c.anotar}
          onSubmit={(e) => {
            e.preventDefault();
            const texto = nota.trim();
            if (texto) toque("saida", texto, () => { setNota(""); setAnotando(false); });
          }}
        >
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} autoFocus required aria-label={`O que você falou com ${lead.nome}`} placeholder="O que você falou: mandei a amostra pelo direct, ela vai olhar à noite" />
          <div className={c.acoes}>
            <button type="submit" className={`${c.botao} ${c.primario}`} disabled={marcando || !nota.trim()}>{marcando ? "Anotando…" : "Anotar"}</button>
            <button type="button" className={c.linkBotao} onClick={() => aoRegistrar("saida")}>Mudar etapa ou data junto</button>
          </div>
          <small>Entra na conversa como mensagem sua, e o contato sai de quem espera você.</small>
        </form>
      )}
      {erroMarca && <p role="alert" className={c.erroArquivo}>{erroMarca}</p>}

      {ativo && (
        <section className={c.passo}>
          {editando ? (
            <form
              className={c.formPasso}
              onSubmit={(e) => {
                e.preventDefault();
                setErroPasso(null);
                comecar(async () => {
                  const r = await definirPasso(lead.id, passo, data);
                  if (r.ok) {
                    setEditando(false);
                    router.refresh();
                  } else setErroPasso("erro" in r ? r.erro : "Preencha o próximo passo e uma data válida.");
                });
              }}
            >
              <label>O que fazer<input value={passo} onChange={(e) => setPasso(e.target.value)} placeholder="Entender a necessidade e apresentar a solução" required /></label>
              <label>Quando<input type="date" value={data} min={hoje} onChange={(e) => setData(e.target.value)} required /></label>
              {erroPasso && <p role="alert">{erroPasso}</p>}
              <div className={c.acoes}>
                <button type="submit" className={`${c.botao} ${c.primario}`} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
                <button type="button" className={c.botao} onClick={() => setEditando(false)}>Cancelar</button>
              </div>
              <small>Um retorno marcado para depois de hoje tira o contato da fila até a data.</small>
            </form>
          ) : (
            <p>
              <b>Próximo passo</b>
              <span>
                {lead.proximo_passo || "Ainda não combinado"}
                {lead.proxima_acao_em && <em data-atrasado={lead.proxima_acao_em < hoje}> · {lead.proxima_acao_em < hoje ? "atrasado, " : ""}{dataCurta(lead.proxima_acao_em)}</em>}
              </span>
              <button type="button" className={c.linkBotao} onClick={() => { setPasso(lead.proximo_passo ?? ""); setErroPasso(null); setEditando(true); }}>Editar</button>
            </p>
          )}
        </section>
      )}

      <section className={c.historico}>
        <div className={c.tituloSecao}>
          <h3>Conversa</h3>
        </div>
        {falha ? (
          <p role="alert">{falha} <button className={c.linkBotao} type="button" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></p>
        ) : historico === null ? (
          <p role="status">Carregando…</p>
        ) : historico.length ? (
          <ol>
            {historico.map((i) => (
              <li key={i.id} data-direcao={i.direcao}>
                <div>
                  <b>{i.direcao === "entrada" ? lead.nome : "Você"}</b>
                  <span>{NOME_CANAL[i.canal]} · {hora(i.created_at)}</span>
                </div>
                <p>{i.resumo || "Sem resumo."}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p>Nenhuma interação registrada ainda.</p>
        )}
      </section>

      <footer className={c.cadastro}>
        <p>{dados}</p>
        {lead.notas && (
          <details>
            <summary>Pedido e anotações</summary>
            <p>{lead.notas}</p>
          </details>
        )}
      </footer>
    </>
  );
}
