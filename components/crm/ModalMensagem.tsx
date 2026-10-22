"use client";

/* ============================================================
   MANDAR A MENSAGEM

   Escolher o texto, ajustar se precisar, e sair para a conversa. Uma tela
   só, e ela some depois.

   ---------- o rework de 22/10 ----------
   O modal tinha virado um painel de decisões: troca WhatsApp x Direct no
   topo, um seletor comprido de templates em grupos, cinco avisos diferentes
   e uma fileira "me cobre de novo" antes do botão. O Rafael achou confuso
   na hora de mandar, que é a hora em que não se quer pensar. Agora:

     1. o CANAL não se escolhe: WhatsApp quando há número, direct quando não
        há (ou quando quem abriu pediu o direct, como a carta do Hoje);
     2. os templates são uma LISTA À VISTA, a sugerida no topo com o porquê;
     3. o texto é EDITÁVEL, então colchete e lacuna se trocam aqui mesmo, e
        sobra um aviso só: "tem colchete";
     4. o retorno se marca SOZINHO: +3 dias (o Retorno 1 da escada) quando
        não há data no futuro, e a data que existe fica quando há. A linha
        do pé diz qual, antes do clique.

   ---------- por que o botão de saída é um <a> e não um <button> ----------
   Abrir o WhatsApp precisa ser o efeito DIRETO de um clique. Se a saída
   viesse depois de um `await`, o navegador já teria perdido o vínculo com o
   gesto e o bloqueador de pop-up engoliria a janela em silêncio. Com um
   link de verdade, a navegação é do navegador; o toque é registrado em
   paralelo, no mesmo clique. Se o registro falhar, a conversa acontece do
   mesmo jeito: a mensagem é o que importa, o registro é a contabilidade.

   ---------- as lacunas ----------
   Um template que usa {empresa} num lead sem empresa vira "a [empresa] de
   vocês". Nunca substituir por vazio: "Oi, !" já foi mandado por CRM demais.
   ============================================================ */

import { useEffect, useState } from "react";
import { registrarToque } from "@/app/(pt)/crm/acoes";
import { dadosDaOficina } from "@/app/(pt)/crm/acoes-producao";
import {
  aplicarSaudacao,
  type DadosOficina,
  degrauDoSilencio,
  hojeSP,
  somarDias,
  linkDirectInstagram,
  linkWhatsapp,
  renderTemplate,
  templateDaEtapa,
} from "@/lib/crm/regras";
import {
  CATEGORIAS_TEMPLATE,
  NOME_CANAL,
  NOME_CATEGORIA,
  type Canal,
  type CategoriaTemplate,
  type LeadPainel,
  type Template,
} from "@/lib/crm/tipos";
import s from "@/app/(pt)/crm/crm.module.css";

/* As duas mensagens da pesquisa entram na lista como se fossem templates,
   com estes ids reservados. Elas já vêm escritas para ESTE lead, então não
   passam pelo render de variáveis; só pela saudação, que é do relógio. */
const ID_ABERTURA = "__abertura";
const ID_PESQUISA = "__pesquisa";

/* O retorno de quem não tem data no futuro: o "Retorno 1" da escada. */
const DIAS_DE_RETORNO = 3;

type Item = { id: string; titulo: string };

export function ModalMensagem({
  lead,
  templates,
  aoFechar,
  saida: saidaPedida,
  sugestao,
}: {
  lead: LeadPainel;
  templates: Template[];
  aoFechar: () => void;
  /* Por onde a mensagem sai. Sem pedido, o WhatsApp quando há número; a
     carta do Hoje pode pedir o direct. */
  saida?: Canal;
  /* Quem abre o modal pode pedir o template da vez pelo começo do título,
     e o pedido passa na frente da etapa e da escada. É o monte "Amostra
     no ar" do Hoje (09/10) pedindo a condição única. */
  sugestao?: { titulo: string; porque: string };
}) {
  const pesquisaOk = lead.dossie?.status === "ok";
  const aAbertura = pesquisaOk ? (lead.dossie?.abertura ?? null) : null;
  const daPesquisa = pesquisaOk ? (lead.dossie?.mensagem ?? null) : null;

  /* A SUGERIDA, na ordem de sempre: o pedido de quem abriu, depois o
     template da etapa (de Prévia em diante), depois o degrau da escada do
     silêncio. As regras moram em regras.ts; o modal só as lê. */
  const degrau = degrauDoSilencio(lead);
  const daEtapa = templateDaEtapa(lead);
  const naCategoria = daEtapa ? templates.filter((t) => t.categoria === daEtapa.categoria) : [];
  const sugeridoEtapa = naCategoria[Math.min(daEtapa?.indice ?? 0, naCategoria.length - 1)] ?? null;
  const naEscada = degrau ? templates.filter((t) => t.categoria === degrau.categoria) : [];
  const sugeridoEscada = degrau
    ? ((degrau.titulo ? naEscada.find((t) => t.titulo.startsWith(degrau.titulo!)) : null) ??
      naEscada[degrau.indice] ??
      null)
    : null;
  const sugeridoPedido = sugestao ? (templates.find((t) => t.titulo.startsWith(sugestao.titulo)) ?? null) : null;

  /* O ponto de partida, do mais específico para o mais genérico. Quem já
     respondeu abre na mensagem 2 da pesquisa; quem nunca foi tocado, na
     abertura sob medida. */
  const partida: { id: string; porque?: string } | null = (() => {
    if (sugeridoPedido) return { id: sugeridoPedido.id, porque: sugestao?.porque };
    if (sugeridoEtapa) return { id: sugeridoEtapa.id, porque: daEtapa?.porque };
    if (lead.toques_entrada > 0 && daPesquisa) return { id: ID_PESQUISA, porque: "Já respondeu: segue a conversa" };
    if (degrau?.categoria === "abertura_fria" && aAbertura) return { id: ID_ABERTURA, porque: "Primeiro toque" };
    if (sugeridoEscada) return { id: sugeridoEscada.id, porque: degrau?.porque };
    if (aAbertura) return { id: ID_ABERTURA, porque: "Primeiro toque" };
    if (daPesquisa) return { id: ID_PESQUISA };
    return templates[0] ? { id: templates[0].id } : null;
  })();

  /* O QUE A OFICINA SABE: link, peças e estreladas da loja vinculada
     ({link}, {pecas}, {destaques}, {topo}). Chega numa chamada só quando o
     modal abre; até lá o texto mostra as lacunas. */
  const [oficina, setOficina] = useState<DadosOficina | null>(null);
  useEffect(() => {
    let vivo = true;
    void dadosDaOficina(lead.id).then((d) => vivo && setOficina(d));
    return () => {
      vivo = false;
    };
  }, [lead.id]);

  const textoDe = (id: string) => {
    if (id === ID_ABERTURA && aAbertura) return aplicarSaudacao(aAbertura);
    if (id === ID_PESQUISA && daPesquisa) return aplicarSaudacao(daPesquisa);
    const t = templates.find((x) => x.id === id);
    return t ? renderTemplate(t.conteudo, { ...lead, oficina }) : "";
  };
  const tituloDe = (id: string) =>
    id === ID_ABERTURA
      ? "Abertura da pesquisa"
      : id === ID_PESQUISA
        ? aAbertura
          ? "Mensagem 2 da pesquisa"
          : "Mensagem da pesquisa"
        : (templates.find((t) => t.id === id)?.titulo ?? "");

  const [escolhido, setEscolhido] = useState(partida?.id ?? "");
  /* O texto é do Rafael depois que ele mexe: trocar de template reescreve,
     e a oficina chegando só reescreve o que ele ainda não tocou. */
  const [editado, setEditado] = useState<string | null>(null);
  const texto = editado ?? textoDe(escolhido);
  const escolher = (id: string) => {
    setEscolhido(id);
    setEditado(null);
  };

  /* A lista à vista: a sugerida sozinha no topo, as da pesquisa, e o resto
     por categoria na ordem do funil. A sugerida não se repete embaixo. */
  const fora = (id: string) => id !== partida?.id;
  const grupos: { rotulo: string; itens: Item[] }[] = [];
  const daLoja = [aAbertura ? ID_ABERTURA : null, daPesquisa ? ID_PESQUISA : null]
    .filter((id): id is string => Boolean(id) && fora(id!))
    .map((id) => ({ id, titulo: tituloDe(id) }));
  if (daLoja.length) grupos.push({ rotulo: "Escritas para esta loja", itens: daLoja });
  for (const c of CATEGORIAS_TEMPLATE) {
    const itens = templates.filter((t) => t.categoria === c && fora(t.id));
    if (itens.length) grupos.push({ rotulo: NOME_CATEGORIA[c as CategoriaTemplate], itens });
  }
  const semCategoria = templates.filter((t) => !t.categoria && fora(t.id));
  if (semCategoria.length) grupos.push({ rotulo: "Outras", itens: semCategoria });

  /* O CANAL, sem pergunta. */
  const zap = linkWhatsapp(lead.whatsapp, texto);
  const direct = linkDirectInstagram(lead.instagram);
  const saida: Canal | null =
    saidaPedida === "instagram" && direct ? "instagram" : zap ? "whatsapp" : direct ? "instagram" : null;

  /* O RETORNO, sem pergunta. */
  const hoje = hojeSP();
  const temFuturo = Boolean(lead.proxima_acao_em && lead.proxima_acao_em > hoje);
  const retorno = temFuturo ? lead.proxima_acao_em! : somarDias(hoje, DIAS_DE_RETORNO);

  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Sem permissão de área de transferência: selecionar o texto à mão
         funciona sempre. */
    }
  };

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  /* Registra e fecha, sem esperar: o link já levou a pessoa para a conversa. */
  const registrar = (canal: Canal) => {
    void registrarToque(lead.id, {
      canal,
      direcao: "saida",
      proxima_acao_em: temFuturo ? undefined : retorno,
      resumo: tituloDe(escolhido) || `Mensagem no ${NOME_CANAL[canal]}`,
    });
    aoFechar();
  };

  const temColchete = /\[[^\]]+\]/.test(texto);
  const semNada = templates.length === 0 && !aAbertura && !daPesquisa;

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={`${s.modal} ${s.msgModal}`} role="dialog" aria-modal="true" aria-labelledby="msg-titulo">
        <p className={s.modalRot}>Mandar mensagem</p>
        <h2 id="msg-titulo">{lead.nome}</h2>
        {saida ? (
          <p className={s.msgCanal}>
            {saida === "whatsapp" ? "Pelo WhatsApp" : "Pelo direct do Instagram: o texto vai copiado, é só colar"}
          </p>
        ) : (
          <p className={s.erro}>
            {lead.whatsapp
              ? "O WhatsApp cadastrado não tem número suficiente."
              : "Sem WhatsApp nem Instagram no cadastro. Preencha um dos dois em Ver todos os dados."}
          </p>
        )}

        {semNada ? (
          <p>Você ainda não tem template nenhum. Crie o primeiro em Templates e ele aparece aqui.</p>
        ) : (
          <>
            <div className={s.msgLista} role="listbox" aria-label="Templates">
              {partida ? (
                <button
                  type="button"
                  role="option"
                  aria-selected={escolhido === partida.id}
                  className={`${s.msgItem} ${escolhido === partida.id ? s.msgItemAtivo : ""}`}
                  onClick={() => escolher(partida.id)}
                >
                  <span className={s.msgSelo}>Sugerida</span>
                  <b>{tituloDe(partida.id)}</b>
                  {partida.porque ? <small>{partida.porque}</small> : null}
                </button>
              ) : null}
              {grupos.map((g) => (
                <div key={g.rotulo} className={s.msgGrupo}>
                  <span className={s.msgGrupoRot}>{g.rotulo}</span>
                  {g.itens.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      aria-selected={escolhido === t.id}
                      className={`${s.msgItem} ${escolhido === t.id ? s.msgItemAtivo : ""}`}
                      onClick={() => escolher(t.id)}
                    >
                      <b>{t.titulo}</b>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <textarea
              className={s.msgTexto}
              value={texto}
              onChange={(e) => setEditado(e.target.value)}
              aria-label="Texto da mensagem"
              rows={7}
            />
            {temColchete ? <p className={s.erro}>Troque o que está entre colchetes antes de enviar.</p> : null}
          </>
        )}

        <div className={s.modalPe}>
          <button type="button" className={s.btn} onClick={aoFechar}>
            Fechar
          </button>
          <button type="button" className={s.btn} onClick={copiar} disabled={!texto}>
            {copiado ? "Copiado" : "Copiar texto"}
          </button>
          {saida === "whatsapp" && zap ? (
            <a
              className={s.btnAcao}
              href={zap}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registrar("whatsapp")}
            >
              Abrir no WhatsApp
            </a>
          ) : null}
          {saida === "instagram" && direct ? (
            /* O Instagram não aceita texto na URL: o MESMO clique copia antes
               de sair, e continua sendo <a> pelo motivo do pop-up. */
            <a
              className={s.btnAcao}
              href={direct}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void navigator.clipboard.writeText(texto).catch(() => {});
                registrar("instagram");
              }}
            >
              Copiar e abrir no direct
            </a>
          ) : null}
        </div>

        {/* Dito antes de acontecer: o botão também grava e marca a data. */}
        {saida ? (
          <p className={s.nota}>
            Ao enviar, fica registrado na linha do tempo e o lead volta para a fila em {retorno.split("-").reverse().slice(0, 2).join("/")}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
