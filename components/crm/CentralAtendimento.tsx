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
   fila" e da busca, que procura em todos. A prospecção saiu daqui em 10/11
   e voltou em 11/11 como o quinto grupo, "Prospecção do dia": só quem nunca
   ouviu de mim, um segmento por vez (o seletor no alto do grupo) e dez por
   dia. O porquê está em lib/crm/atendimento.ts.

   O que nunca fazer: devolver uma aba por critério. Cada aba nova vira uma
   fila que ninguém zera. Grupo novo só com regra de saída e teto.
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
  PROSPECCAO_POR_DIA,
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
  blackPorMandar,
  novoContato,
  parado,
  precisaResponder,
  tempoDeEspera,
  type GrupoDaFila,
  type HistoricoAtendimento,
  type ItemDaFila,
} from "@/lib/crm/atendimento";
import type { painelHoje } from "@/lib/crm/dados";
import { arrobaDe, dataCurta, destinoDoToque, diaEmSP, diasDesde, diasEntre, dinheiro, ehLojaOnline, linkWhatsapp, momentoDoContato, NOME_CAMPO, somarDias } from "@/lib/crm/regras";
import { ehAtivo, ESTAGIOS_DO_QUADRO, NOME_CANAL, NOME_ESTAGIO, NOME_ORIGEM, NOME_TIPO, type Direcao, type Estagio, type LeadPainel, type Template } from "@/lib/crm/tipos";
import { ModalNovoLead } from "./ModalNovoLead";
import { Composicao, Contagem, Faisca } from "./PlacarVivo";
import { ModalMensagem } from "./ModalMensagem";
import { ModalToque } from "./ModalToque";
import c from "./atendimento.module.css";

type Props = { painel: Awaited<ReturnType<typeof painelHoje>>; templates: Template[] };
/* Uma linha da lista. `grupo` nulo é quem veio da busca ou do "Fora da fila". */
type Linha = { lead: LeadPainel; grupo: GrupoDaFila | null; encerrar: boolean; esfriou?: ItemDaFila["esfriou"] };

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
/* O registro que o formulário do site deixa no card ("Preencheu o formulário
   da /vitrine-digital"). Não é fala de ninguém: é de onde o contato veio, e
   isso o rodapé da ficha já diz. Por isso ele não vira frase do cartão da
   vez, e uma conversa feita só dele não aparece (24/11/2026). */
const soFormulario = (texto?: string | null) => /^\s*preencheu o formul[aá]rio/i.test(texto ?? "");

const hora = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? "Horário indisponível"
    : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const dias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

/* O que a linha diz, numa frase: por que esta pessoa está na fila agora. */
function motivoDe({ lead: l, grupo, encerrar, esfriou }: Linha, hoje: string, agora: number | null): { texto: string; alto: boolean } {
  if (grupo === "responder") {
    if (l.quer_no_ar) return { texto: "Quer colocar no ar", alto: true };
    /* quem esfriou fala baixo (26/11): o vermelho é de quem ainda está quente */
    if (esfriou === "recusou") return { texto: "Disse que não tem interesse", alto: false };
    if (esfriou === "tempo") return { texto: `Esfriou: escreveu há ${dias(diasDesde(momentoDoContato(l), hoje))}`, alto: false };
    if (precisaResponder(l)) return { texto: agora ? `Escreveu, ${tempoDeEspera(momentoDoContato(l), agora)}` : "Escreveu por último", alto: true };
    return { texto: marcaDe(l)?.nome ?? "Sua vez", alto: true };
  }
  if (grupo === "novos") return { texto: agora ? tempoDeEspera(momentoDoContato(l), agora) : `Desde ${hora(momentoDoContato(l))}`, alto: true };
  if (grupo === "black") return { texto: `Black há ${dias(diasDoPreco(l, hoje))}, sem resposta`, alto: false };
  if (grupo === "preco") {
    if (blackPorMandar(l, hoje)) return { texto: "Mandar a Black", alto: false };
    const d = diasDoPreco(l, hoje);
    if (encerrar) return { texto: `Sem resposta há ${dias(d)}: encerrar`, alto: false };
    return { texto: `${l.black_em ? "Black" : "Preço"} há ${dias(d)}, sem resposta`, alto: false };
  }
  if (grupo === "amostra") {
    if (blackPorMandar(l, hoje)) return { texto: "Mandar a Black", alto: false };
    const d = diasDesde(l.ultimo_toque_em ?? l.created_at, hoje);
    return { texto: encerrar ? `Parada há ${dias(d)}: encerrar` : `Amostra há ${dias(d)}, sem reação`, alto: false };
  }
  if (grupo === "prospeccao") return { texto: l.whatsapp ? "Primeiro contato" : "Primeiro contato, pelo Instagram", alto: false };
  /* a cobrança (25/11): o valor e há quanto tempo venceu, em voz baixa */
  if (grupo === "receber" && l.cobranca) {
    const atraso = diasEntre(l.cobranca.vence_em, hoje);
    return { texto: `${dinheiro(l.cobranca.saldo)}, ${atraso > 0 ? `venceu há ${dias(atraso)}` : "vence hoje"}`, alto: false };
  }
  return { texto: `${NOME_ESTAGIO[l.estagio]} · ${l.proxima_acao_em ? `retorno ${dataCurta(l.proxima_acao_em)}` : "sem retorno marcado"}`, alto: false };
}

/* O template que o "Mandar mensagem" abre já escolhido. Sem pedido, o modal
   decide pela etapa e pela escada do silêncio. */
function sugestaoDe({ lead: l, grupo, encerrar }: Linha, hoje: string) {
  if (l.quer_no_ar) return { titulo: TEMPLATE_QUER_NO_AR, porque: "Pediu para colocar no ar: responda com o Pix da entrada" };
  if (l.cobranca && l.cobranca.quando <= hoje && grupo !== "responder") return { titulo: TITULO_COBRANCA, porque: `Tem ${dinheiro(l.cobranca.saldo)} em aberto: a cobrança, com o valor já escrito` };
  /* O preço que saiu por fora do CRM não tem toque: a lista da Black traz
     "(já viu o preço)" no passo, conferido no WhatsApp em 03/11. */
  if (blackPorMandar(l, hoje))
    return l.preco_em || l.proximo_passo?.includes("já viu o preço")
      ? { titulo: TEMPLATE_BLACK_VIU, porque: "Na lista da Black e já viu o preço: a condição de R$ 799 até 30/11" }
      : { titulo: TEMPLATE_BLACK_AMOSTRA, porque: "Na lista da Black, só com a amostra: o preço pela primeira vez, já com a Black" };
  const marca = marcaDe(l);
  if (marca?.template) return { titulo: marca.template, porque: `${marca.nome}: o resumo pronto pra encaminhar` };
  /* A última chamada da Black (26/11): vale também para quem está em
     Proposta ou Negociação, porque o que eles receberam foi a Black. */
  if (grupo === "black") return { titulo: TITULO_VOLTA_DA_BLACK, porque: `Recebeu a Black há ${dias(diasDoPreco(l, hoje))} e nunca recebeu o retorno: o único, com a data de 30/11` };
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
  /* A revisão serve duas listas (26/11): os parados de fora da fila e os
     "para encerrar" de um grupo da fila. A lista vai junto, à vista. */
  const [revisando, setRevisando] = useState<{ leads: LeadPainel[]; titulo: string } | null>(null);
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
  /* O segmento da prospecção do dia fica guardado neste navegador: é
     conveniência, não dado. Sem ele, a fila escolhe o padrão. */
  const [nicho, setNicho] = useState<string | null>(null);
  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem("crm_nicho_prospeccao");
      if (guardado !== null) setNicho(guardado);
    } catch {}
  }, []);
  const trocarNicho = (n: string) => {
    setNicho(n);
    setSelecionado(null);
    try {
      window.localStorage.setItem("crm_nicho_prospeccao", n);
    } catch {}
  };
  const fila = useMemo(() => filaDaVez(painel.contatos, hoje, nicho), [painel.contatos, hoje, nicho]);
  const termo = busca.trim();
  /* A busca procura em TODOS, não só na fila: é por ela que se chega em
     quem ficou de fora. */
  const linhas: Linha[] = useMemo(() => {
    if (termo) {
      const alvo = normalizar(termo);
      const numero = termo.replace(/\D/g, "");
      const naFila = new Map([...fila.itens, ...fila.paraEncerrar].map((i) => [i.lead.id, i]));
      return [...new Map(painel.contatos.map((l) => [l.id, l])).values()]
        .filter((l) => {
          const texto = normalizar([l.nome, l.empresa, l.nicho, l.cidade, l.email, l.instagram, l.whatsapp].filter(Boolean).join(" "));
          return texto.includes(alvo) || (numero.length >= 5 && (l.whatsapp ?? "").replace(/\D/g, "").includes(numero));
        })
        /* Quem está na fila leva o grupo dela para a busca (10/11): o Santana,
           que deve parcela, aparecia como "Ganho · sem retorno marcado". */
        .map((l) => ({ lead: l, grupo: naFila.get(l.id)?.grupo ?? null, encerrar: naFila.get(l.id)?.encerrar ?? false, esfriou: naFila.get(l.id)?.esfriou }));
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
        setRevisando(null);
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

  /* ---------- a fila pelo teclado (24/11/2026) ----------
     Seta para baixo e para cima (ou J e K) andam pelos contatos; Enter faz a
     ação da vez, a mesma do botão principal da ficha. O Rafael atravessa a
     fila dezenas de vezes por dia, e cada contato era um clique.
     O que o atalho NÃO faz:
     - não age com o foco num campo, nem com modal aberto (o Enter e as setas
       são do campo e do modal);
     - o Enter só vale com o foco na página ou num contato da fila: num botão
       qualquer, Enter continua sendo o clique daquele botão;
     - não usa Ctrl, Alt nem Cmd: Ctrl+K é da paleta (components/crm/Paleta).
     Os valores vivos passam por um ref para o ouvinte ser instalado uma vez. */
  const teclado = useRef({ linhas, atual, ocupado: false });
  teclado.current = { linhas, atual, ocupado: Boolean(novo || registro || mensagem) };
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector("dialog[open], [role='dialog'], [aria-modal='true']")) return;
      const { linhas: todas, atual: daVez, ocupado } = teclado.current;
      if (ocupado || !todas.length) return;
      const passo = e.key === "ArrowDown" || e.key === "j" ? 1 : e.key === "ArrowUp" || e.key === "k" ? -1 : 0;
      if (passo) {
        e.preventDefault();
        const i = daVez ? todas.findIndex((x) => x.lead.id === daVez.lead.id) : -1;
        const proximo = todas[Math.max(0, Math.min(todas.length - 1, i + passo))];
        if (!proximo) return;
        setSelecionado(proximo.lead.id);
        requestAnimationFrame(() => {
          const botao = filaRef.current?.querySelector<HTMLButtonElement>(`[data-contato="${proximo.lead.id}"]`);
          botao?.scrollIntoView({ block: "nearest" });
          botao?.focus({ preventScroll: true });
        });
        return;
      }
      if (e.key === "Enter" && daVez && (alvo === document.body || alvo?.hasAttribute("data-contato"))) {
        e.preventDefault();
        detalheRef.current?.querySelector<HTMLElement>("[data-acao-da-vez]")?.click();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

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

  const NOME_CURTO: Record<string, string> = { novos: "novos", responder: "a responder", black: "Black", preco: "preço", amostra: "amostra", prospeccao: "prospecção", receber: "a receber" };
  const composicao = GRUPOS_DA_FILA.map((g) => ({ id: g.id, nome: g.nome, curto: NOME_CURTO[g.id] ?? g.nome, n: fila.itens.filter((i) => i.grupo === g.id).length }));

  return (
    <div className={c.central} data-atendimento>
      <header className={c.cabecalho}>
        <div>
          <h1>
            Hoje<span>.</span>
          </h1>
        </div>
        <div className={c.acoes}>
          <label className={c.busca}>
            <span className={c.srOnly}>Buscar em todos os contatos</span>
            <input type="search" placeholder="Buscar contato" value={busca} onChange={(e) => { setBusca(e.target.value); setSelecionado(null); }} />
            {/* a dica do atalho (24/11): abre a paleta, que busca em todas as telas */}
            <button type="button" className={c.teclaBusca} onClick={() => window.dispatchEvent(new Event("crm:paleta"))} aria-label="Abrir a busca do painel inteiro (Ctrl K)" aria-keyshortcuts="Control+K">
              <kbd>Ctrl</kbd><kbd>K</kbd>
            </button>
          </label>
          {/* O "Funil" saiu daqui em 24/11: já é uma rota do menu, a dois dedos. */}
          <Link className={c.botao} href="/crm?modo=visao">Visão do estúdio</Link>
          <button className={`${c.botao} ${c.primario}`} type="button" onClick={() => setNovo(true)}>+ Novo contato</button>
        </div>
      </header>

      {/* O placar em quatro peças (24/11), como os números do painel da
          PublicaLoja. É uma faixa baixa de propósito: em 10/11 o cabeçalho
          foi encolhido porque só cabia um contato antes de rolar. */}
      {/* O placar vivo (24/11, noite): os números contam ao abrir, a fila
          mostra de que grupos ela é feita, e os dois de resultado ganham o
          desenho dos últimos 14 dias (components/crm/PlacarVivo). */}
      <dl className={c.placar}>
        {/* O placar que se explica (25/11): o Rafael, olhando "146 na fila de
            hoje" com uma barra colorida sem legenda: "essa parte está difícil
            de entender". Cada peça agora tem o nome em cima, o número, e uma
            linha dizendo o que ele conta; a barra da fila ganhou a legenda. */}
        <div data-luz>
          <dt>Para atender hoje</dt>
          <dd><Contagem valor={fila.itens.length} /></dd>
          <Composicao partes={composicao} />
          <ul className={c.legenda}>
            {composicao.filter((p) => p.n).map((p) => (
              <li key={p.id} data-grupo={p.id}><b>{p.n}</b> {p.curto}</li>
            ))}
            {/* fora do número grande (26/11): encerrar não é atender */}
            {fila.paraEncerrar.length > 0 && <li data-grupo="encerrar"><b>{fila.paraEncerrar.length}</b> a encerrar</li>}
          </ul>
        </div>
        <div data-luz>
          <dt>Aguardando o contato</dt>
          <dd><Contagem valor={fila.aguardando} /></dd>
          <small>Com preço ou amostra enviados, ainda no prazo.</small>
        </div>
        {painel.resultado && (
          <>
            <div data-luz>
              <dt>Receberam o preço</dt>
              <dd><Contagem valor={painel.resultado.precos} /></dd>
              <small>Nos últimos 30 dias.</small>
              <Faisca serie={painel.resultado.serie.precos} rotulo="Viram o preço" />
            </div>
            <div data-luz>
              <dt>Fechamentos</dt>
              <dd><Contagem valor={painel.resultado.fechados} /></dd>
              <small>Nos últimos 30 dias.</small>
              <Faisca serie={painel.resultado.serie.fechados} rotulo="Fecharam" />
            </div>
          </>
        )}
      </dl>

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
          <button type="button" className={c.botao} onClick={() => setRevisando({ leads: parados, titulo: "parados há mais de 30 dias, de fora da fila" })}>Revisar e arquivar</button>
        </div>
      ) : null}
      {revisando && (
        <div className={c.arquivo} data-revisando>
          <p>
            <b>Encerrar {revisando.leads.length} como perdidos, "sumiu, sem resposta"?</b> São os {revisando.titulo}. Saem do Funil, e o retorno marcado de cada um é apagado. O Desfazer devolve tudo como estava.
          </p>
          <ul>
            {revisando.leads.map((l) => (
              <li key={l.id}>
                {l.nome}
                <span>{NOME_ESTAGIO[l.estagio]} · {l.preco_em ? `${l.black_em ? "Black" : "preço"} em ${dataCurta(diaEmSP(l.preco_em))}, ` : ""}último movimento {dataCurta(diaEmSP(l.ultimo_toque_em ?? l.created_at))}</span>
              </li>
            ))}
          </ul>
          <div className={c.acoes}>
            <button type="button" className={`${c.botao} ${c.primario}`} disabled={arquivando} onClick={() => arquivar(revisando.leads.map((l) => l.id))}>{arquivando ? "Encerrando…" : `Encerrar os ${revisando.leads.length}`}</button>
            <button type="button" className={c.botao} onClick={() => setRevisando(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {erroArquivo && <p role="alert" className={c.erroArquivo}>{erroArquivo}</p>}

      <div className={c.mesa}>
        <section ref={filaRef} className={c.fila} aria-label="A fila de hoje" data-luz>
          {!agrupada && (
            <div className={c.filaCabecalho}>
              <b>{termo ? `${linhas.length} ${linhas.length === 1 ? "encontrado" : "encontrados"}` : `${linhas.length} fora da fila`}</b>
              <button type="button" className={c.linkBotao} onClick={() => { setBusca(""); setVerFora(false); setRevisando(null); setSelecionado(null); }}>← Voltar para a fila</button>
            </div>
          )}
          <div className={c.rolagem}>
            {agrupada ? (
              GRUPOS_DA_FILA.map((g) => {
                const doGrupo = linhas.filter((i) => i.grupo === g.id);
                const p = g.id === "prospeccao" && fila.prospeccao.nichos.length ? fila.prospeccao : null;
                const aEncerrar = fila.paraEncerrar.filter((i) => i.grupo === g.id).map((i) => i.lead);
                return doGrupo.length || p || aEncerrar.length ? (
                  <div key={g.id} className={c.grupo} data-grupo={g.id}>
                    <h2>
                      {g.nome}
                      <b>{doGrupo.length}</b>
                    </h2>
                    {p && (
                      <div className={c.segmento}>
                        <label>
                          <span>Segmento</span>
                          <select value={p.nicho ?? ""} onChange={(e) => trocarNicho(e.target.value)}>
                            {p.nichos.map((n) => (
                              <option key={n.nicho} value={n.nicho}>{n.nicho || "sem segmento"} ({n.quantos})</option>
                            ))}
                          </select>
                        </label>
                        <small>
                          {p.feitosHoje >= PROSPECCAO_POR_DIA
                            ? `Os ${PROSPECCAO_POR_DIA} de hoje já saíram. Amanhã tem mais.`
                            : `${p.feitosHoje} de ${PROSPECCAO_POR_DIA} hoje · ${p.noNicho} neste segmento nunca ouviram de você`}
                        </small>
                      </div>
                    )}
                    {doGrupo.length > 0 && <ul>{doGrupo.map(linha)}</ul>}
                    {/* os "encerrar" numa linha só (26/11): eram 94 itens da
                        fila, um a um, cada um pedindo o mesmo clique */}
                    {aEncerrar.length > 0 && (
                      <button
                        type="button"
                        className={c.paraEncerrar}
                        onClick={() => {
                          setRevisando({ leads: aEncerrar, titulo: g.id === "preco" ? `que receberam o preço há ${DIAS_PARA_ENCERRAR} dias ou mais, sem resposta` : `com a amostra parada há mais de ${DIAS_PARADO} dias` });
                          requestAnimationFrame(() => document.querySelector("[data-revisando]")?.scrollIntoView({ block: "start", behavior: "smooth" }));
                        }}
                      >
                        <span><b>{aEncerrar.length}</b> para encerrar</span>
                        <u>Revisar e encerrar</u>
                      </button>
                    )}
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
          {/* a legenda do teclado (24/11): some no celular, onde não há teclas */}
          <p className={c.atalhos} aria-hidden>
            <span><kbd>↑</kbd><kbd>↓</kbd> andar</span>
            <span><kbd>Enter</kbd> agir</span>
            <span><kbd>Ctrl</kbd><kbd>K</kbd> buscar</span>
          </p>
        </section>

        <section ref={detalheRef} className={c.detalhe} tabIndex={-1} aria-label="Atendimento selecionado" data-luz>
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
  const { lead, grupo, encerrar, esfriou } = item;
  /* quem esfriou em "Responder agora" (26/11): o rosa fica no Responder se
     foi só o tempo; se a pessoa disse que não, o primeiro botão é encerrar */
  const encerrarPrimeiro = encerrar && esfriou !== "tempo";
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
  /* A ETAPA, escolhida junto com a anotação (25/11/2026). O Rafael falou com
     a @wfsstoree por fora, o card já estava em Prévia, e para dizer a etapa
     ele tinha que sair pelo "Mudar etapa ou data junto", um link no fim da
     linha que abre outro formulário. Agora as etapas do caminho ficam à
     vista, com a marcada sendo a etapa para onde o contato JÁ iria sozinho
     (o trilho: lista vira contatado, contatado vira follow-up; o resto
     fica). Só vai para a ação quando ele TOCA numa: sem toque, o trilho
     continua bônus, e uma etapa que a régua recusaria não vira erro. */
  const [etapaEscolhida, setEtapaEscolhida] = useState<Estagio | null>(null);
  const etapaDoTrilho = destinoDoToque("saida", lead.estagio) ?? lead.estagio;
  const etapaMarcada = etapaEscolhida ?? etapaDoTrilho;
  const router = useRouter();
  const canal = lead.whatsapp ? "whatsapp" : "instagram";

  /* O QUE ACONTECEU, num clique. O leitor do WhatsApp está desligado desde
     01/10, então o CRM só sabe o que é marcado aqui.
     "Respondeu" e "Quer colocar no ar" são entradas (a pessoa escreveu): o
     lead sobe para "Responder agora". "Um áudio" e "ver com o sócio" viram
     o próximo passo para hoje. "Já mandei o preço" é a saída que foi por
     fora do CRM (01/11): sem ela o grupo "Preço no ar" não acha ninguém. */
  function toque(direcao: Direcao, resumo: string, depois?: () => void, estagio?: Estagio) {
    setErroMarca(null);
    comecarMarca(async () => {
      const r = await registrarToque(lead.id, { canal, direcao, resumo, ...(estagio ? { estagio } : {}) });
      if (r.ok) {
        depois?.();
        router.refresh();
      }
      /* a etapa escolhida pode pedir um dado que a ficha não tem (a Proposta
         pede o ticket): nada foi gravado, e a frase diz o que falta e onde */
      else if ("falta" in r && r.falta?.length && estagio)
        setErroMarca(`${NOME_ESTAGIO[estagio]} pede ${r.falta.map((campo) => NOME_CAMPO[campo].toLowerCase()).join(" e ")}. Nada foi registrado: complete em "Outra etapa ou data".`);
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
  const d = grupo === "preco" || grupo === "black" ? diasDoPreco(lead, hoje) : diasDesde(lead.ultimo_toque_em ?? lead.created_at, hoje);

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
    ? { titulo: "Pediu para colocar no ar", detalhe: "É o lead mais quente da fila. Responda com o Pix da entrada.", botao: "Enviar o Pix" }
    : cobranca && grupo !== "responder"
      ? { titulo: `A receber ${dinheiro(cobranca.saldo)}`, detalhe: `${cobranca.rotulo} · ${atrasoDaParcela > 0 ? `venceu há ${dias(atrasoDaParcela)}` : "vence hoje"}, em ${dataCurta(cobranca.vence_em)}`, botao: "Cobrar no WhatsApp" }
      : marca
        ? { titulo: marca.nome, detalhe: marca.id === "audio" ? "Grave o áudio explicando como funciona: onde houve áudio, a conversa viveu." : "Mande o resumo pronto pra encaminhar e pergunte quando eles conversam.", botao: marca.id === "audio" ? "Abrir a conversa" : "Enviar o resumo" }
        : respondeu
          ? { titulo: "Aguardando a sua resposta", detalhe: fala ? undefined : "A resposta foi marcada à mão, sem o texto.", botao: "Responder" }
          : encerrar
            ? { titulo: `Sem resposta há ${dias(d)}`, detalhe: `Pela regra da casa, depois de uns ${DIAS_PARA_ENCERRAR} dias não rolou: encerre e tire a amostra do ar.`, botao: "Enviar mensagem" }
            : blackPorMandar(lead, hoje)
              ? { titulo: "Black ainda não enviada", detalhe: "R$ 799 à vista até 30/11.", botao: "Enviar a Black" }
              : grupo === "prospeccao"
                ? { titulo: "Prospecção: primeiro contato", detalhe: "Uma mensagem só. Se o contato responder, sobe para Responder agora; se não, sai da fila.", botao: "Enviar primeira mensagem" }
              : grupo === "novos" || ehNovo
                ? { titulo: "Novo contato: falta a primeira mensagem", detalhe: ultimaEntrada?.resumo ?? undefined, botao: "Enviar primeira mensagem" }
                : grupo === "black"
                  ? { titulo: `Black enviada há ${dias(d)}, sem retorno`, detalhe: "Ainda não recebeu o retorno. A Black vai até 30/11: é a última chamada, uma só. Quem não responder é encerrado em 01/12.", botao: "Enviar a última chamada" }
                : grupo === "preco"
                  ? { titulo: `${lead.black_em ? "Black enviada" : "Preço enviado"} há ${dias(d)}, sem resposta`, detalhe: "Um retorno só, com a saída aberta. Depois dele o contato sai da fila até o décimo dia.", botao: "Enviar retorno" }
                  : grupo === "amostra"
                    ? { titulo: `Amostra enviada há ${dias(d)}, sem resposta`, detalhe: "Retorne com novidade na vitrine, nunca com cobrança.", botao: "Enviar novidade" }
                    : { titulo: NOME_ESTAGIO[lead.estagio], detalhe: lead.proximo_passo ?? "Fora da fila de hoje.", botao: "Enviar mensagem" };
  const dados = [NOME_ORIGEM[lead.origem], `entrou ${hora(lead.created_at)}`, lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : null, lead.ticket_estimado != null ? dinheiro(lead.ticket_estimado) || null : null, lead.preco_em ? `viu o preço em ${dataCurta(diaEmSP(lead.preco_em))}` : null].filter(Boolean).join(" · ");
  /* O código da campanha e do anúncio saiu da linha de cima (24/11): era
     "previa-gratis-2026-08 · l11-01b-repetitivo-redondo-sneakerspot" na cara
     da ficha. Fica guardado dentro do que abre, para quem for procurar. */
  const anuncio = lead.campanha ? [lead.campanha, lead.anuncio].filter(Boolean).join(" · ") : null;

  return (
    <>
      <div className={c.detalheCabecalho}>
        <div className={c.identificacao}>
          <div>
            <h2>{lead.nome}</h2>
            {/* a etapa virou etiqueta com nome (24/11): "Prévia" solto embaixo
                do nome não dizia o que era */}
            <p>
              <span className={c.etapa}>Etapa: {NOME_ESTAGIO[lead.estagio]}</span>
              {[lead.empresa !== lead.nome ? lead.empresa : null, lead.nicho, lead.cidade].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
      </div>

      <section className={c.vez} data-alto={grupo === "responder" || grupo === "novos"}>
        <h3>{vez.titulo}</h3>
        {/* o registro automático do formulário não se repete aqui (24/11): a
            mesma frase aparecia no cartão, na conversa e no rodapé, que já
            diz de onde o contato veio */}
        {fala && respondeu ? <blockquote>{fala}</blockquote> : vez.detalhe && !soFormulario(vez.detalhe) ? <p>{vez.detalhe}</p> : null}
        <div className={c.acoes}>
          {encerrar && ativo && <button type="button" className={`${c.botao} ${encerrarPrimeiro ? c.primario : ""}`} disabled={encerrando} onClick={aoEncerrar}>{encerrando ? "Encerrando…" : "Encerrar contato"}</button>}
          {whatsapp || instagram ? (
            <button type="button" className={`${c.botao} ${encerrarPrimeiro ? "" : c.vende}`} onClick={aoMandar} data-acao-da-vez>{vez.botao}<kbd className={c.teclaNoBotao} aria-hidden>Enter</kbd></button>
          ) : (
            <Link className={`${c.botao} ${c.vende}`} href={`/crm/lead/${lead.id}`}>Completar canal de contato</Link>
          )}
          {cobranca && <Link className={c.botao} href="/crm/caixa">Dar baixa no Caixa</Link>}
          {/* os dois caminhos de apoio em voz baixa (24/11): eram botões do
              mesmo peso do que vende, e o cartão tinha três chamadas iguais */}
          <button type="button" className={c.acaoLeve} aria-expanded={anotando} onClick={() => setAnotando((v) => !v)}>Registrar contato</button>
          {instagram && <a className={c.acaoLeve} href={`https://www.instagram.com/${encodeURIComponent(instagram)}/`} target="_blank" rel="noopener noreferrer">Ver Instagram</a>}
        </div>
        {anotando && (
          <form
            className={c.anotar}
            onSubmit={(e) => {
              e.preventDefault();
              const texto = nota.trim();
              if (texto) toque("saida", texto, () => { setNota(""); setAnotando(false); setEtapaEscolhida(null); }, etapaEscolhida ?? undefined);
            }}
          >
            <label htmlFor="nota-por-fora">O que foi conversado com {lead.nome}?</label>
            <textarea id="nota-por-fora" value={nota} onChange={(e) => setNota(e.target.value)} rows={3} autoFocus required placeholder="Enviei a amostra pelo direct; vai ver à noite" />
            {/* a etapa à vista (25/11): são botões de escolha, um marcado por vez */}
            {ativo && (
              <div className={c.etapas} role="group" aria-label="Etapa no funil">
                <span>Etapa no funil</span>
                <div>
                  {ESTAGIOS_DO_QUADRO.map((e) => (
                    <button key={e} type="button" className={c.pilula} aria-pressed={etapaMarcada === e} disabled={marcando} onClick={() => setEtapaEscolhida(e)}>
                      {NOME_ESTAGIO[e]}
                    </button>
                  ))}
                </div>
                <small>
                  {etapaMarcada === lead.estagio
                    ? `Continua em ${NOME_ESTAGIO[lead.estagio]}.`
                    : `Passa de ${NOME_ESTAGIO[lead.estagio]} para ${NOME_ESTAGIO[etapaMarcada]}${etapaEscolhida ? "" : ", como o funil já faria"}.`}
                </small>
              </div>
            )}
            <div className={c.acoes}>
              <button type="submit" className={`${c.botao} ${c.primario}`} disabled={marcando || !nota.trim()}>{marcando ? "Registrando…" : "Registrar"}</button>
              {!lead.preco_em && ativo && <button type="button" className={c.botao} disabled={marcando} onClick={() => toque("saida", RESUMO_PRECO_A_MAO, () => { setAnotando(false); setEtapaEscolhida(null); }, etapaEscolhida ?? undefined)}>Enviei o preço</button>}
              <button type="button" className={c.linkBotao} onClick={() => aoRegistrar("saida")}>Outra etapa ou data</button>
            </div>
            {erroMarca && <p role="alert" className={c.erroArquivo}>{erroMarca}</p>}
            <small>Fica na conversa como mensagem sua, e o contato sai das pendências.</small>
          </form>
        )}
        {/* quem escreveu e também deve (25/11): a conversa vem primeiro, e a
            parcela fica dita aqui, com o "Dar baixa no Caixa" ao lado */}
        {cobranca && grupo === "responder" && <small>Parcela em aberto: {dinheiro(cobranca.saldo)} ({cobranca.rotulo}), {atrasoDaParcela > 0 ? `vencida há ${dias(atrasoDaParcela)}` : "vence hoje"}.</small>}
        {esfriou && <small>{esfriou === "recusou" ? "A última mensagem do contato foi uma recusa. Encerre, ou responda se ainda houver conversa." : `Escreveu há ${dias(diasDesde(momentoDoContato(lead), hoje))}: a conversa esfriou. Responda se ainda fizer sentido, ou encerre.`}</small>}
        {(grupo === "novos" || grupo === "black" || grupo === "preco" || grupo === "amostra" || grupo === "prospeccao") && !encerrar && <small>Ao enviar, o próximo contato deste grupo abre em seguida.</small>}
        {/* o próximo passo mora DENTRO do cartão desde 24/11: "o que fazer
            agora" é um bloco só. Era uma faixa solta entre as pílulas e a
            conversa, a quarta da ficha. */}
        {ativo && (
          <div className={c.passo}>
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
                  {lead.proximo_passo || "Não definido"}
                  {lead.proxima_acao_em && <em data-atrasado={lead.proxima_acao_em < hoje}>, {lead.proxima_acao_em < hoje ? "atrasado, " : ""}{dataCurta(lead.proxima_acao_em)}</em>}
                </span>
                <button type="button" className={c.linkBotao} onClick={() => { setPasso(lead.proximo_passo ?? ""); setErroPasso(null); setEditando(true); }}>{lead.proximo_passo ? "Editar" : "Definir"}</button>
              </p>
            )}
          </div>
        )}
      </section>

      {ativo && (
        <div className={c.pedidos}>
          <span>O contato:</span>
          <button type="button" className={c.pilula} aria-pressed={respondeu && !lead.quer_no_ar} disabled={marcando || respondeu} onClick={() => toque("entrada", RESUMO_RESPONDEU)}>Respondeu</button>
          <button type="button" className={c.pilula} aria-pressed={Boolean(lead.quer_no_ar)} disabled={marcando || lead.quer_no_ar} onClick={() => toque("entrada", RESUMO_QUER_NO_AR)}>Quer colocar no ar</button>
          {MARCAS.map((m) => (
            <button key={m.id} type="button" className={c.pilula} aria-pressed={marca?.id === m.id} disabled={marcando || marca?.id === m.id} onClick={() => marcar(m.passo)}>{m.id === "audio" ? "Pediu áudio" : "Vai consultar o sócio"}</button>
          ))}
          <button type="button" className={c.pilula} onClick={() => aoRegistrar("entrada")}>Recusou ou adiou</button>
        </div>
      )}
      {erroMarca && !anotando && <p role="alert" className={c.erroArquivo}>{erroMarca}</p>}

      {/* a conversa some quando só existe o registro do formulário (24/11):
          era um balão repetindo o rodapé. Para quem acabou de chegar ("novos")
          nem o esqueleto aparece, porque não há o que carregar para mostrar. */}
      {(historico === null ? grupo !== "novos" || Boolean(falha) : falha || !historico.length || !historico.every((i) => soFormulario(i.resumo))) && (
      <section className={c.historico}>
        <div className={c.tituloSecao}>
          <h3>Conversa</h3>
        </div>
        {falha ? (
          <p role="alert">{falha} <button className={c.linkBotao} type="button" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button></p>
        ) : historico === null ? (
          /* o esqueleto no lugar do "Carregando…" (24/11): três balões com o
             brilho passando, no formato da conversa que vai chegar. O texto
             fica só para o leitor de tela. */
          <div className={c.esqueleto} role="status">
            <span className={c.srOnly}>Carregando a conversa</span>
            <i /><i data-saida /><i />
          </div>
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
      )}

      <footer className={c.cadastro}>
        {/* a ficha completa desceu para cá (25/11): no alto, à direita do
            nome, "Abrir ficha ↗" disputava com a ação da vez. Ela é o
            caminho para editar o cadastro, ver o contrato e a conversa
            inteira: uso de vez em quando, não de todo contato. */}
        <p className={c.cadastroLinha}>
          <span>{dados}</span>
          <Link className={c.link} href={`/crm/lead/${lead.id}`}>Ver ficha completa</Link>
        </p>
        {(lead.notas || anuncio) && (
          <details>
            <summary>{lead.notas ? "Pedido e anotações" : "De qual anúncio veio"}</summary>
            {lead.notas && <p>{lead.notas}</p>}
            {anuncio && <p>Anúncio de origem: {anuncio}</p>}
          </details>
        )}
      </footer>
    </>
  );
}
