"use client";

/* ============================================================
   A CARTA DA VEZ

   Um lead, em tamanho de cartaz, ocupando o corpo da tela. Ela substitui a
   fila de fichas empilhadas, e a troca não é de estilo: é de resposta.

   ---------- por que a lista saiu ----------
   A tela se chama "quem eu falo agora" e respondia com todo mundo de uma
   vez, em linhas de 60px numa coluna de 940px encostada na esquerda de um
   monitor de 1900. Metade da tela era papel vazio, e o desperdício era só o
   sintoma: nove nomes iguais empilhados não dizem por onde começar, eles
   PEDEM que alguém escolha, que é exatamente o trabalho que a ordem de
   prioridade já tinha feito.

   Aqui a ordem decide. Um nome por vez, na ordem que os três grupos sempre
   tiveram (atrasado, hoje, sem passo).

   ---------- ela não tem moldura própria ----------
   Nenhuma borda em volta da carta. Quem dá o chão é a FOLHA (`.vezFolha`,
   ver a nota no CSS): um plano de grafite cheio que sangra de ponta a
   ponta, com o placar do dia como cabeçalho e a banda de urgência na testa.
   Uma segunda moldura aqui dentro seria um cartão dentro de uma folha, e a
   carta voltaria a ser uma lista de um item só.

   ---------- duas colunas, e a da direita é informação ----------
   A primeira versão era só a coluna da esquerda, e sobrava meia tela de
   papel à direita do nome. A resposta não foi esticar o nome: foi pôr ali o
   que se quer saber ANTES de apertar "WhatsApp" e que estava escondido
   dentro da ficha do lead (quantas vezes eu já falei, quando foi a última,
   em que etapa isto está há quanto tempo). Quatro fatos, sempre os mesmos
   quatro, sempre na mesma ordem: uma coluna que muda de altura conforme o
   lead seria um objeto que dança a cada carta.

   ---------- um rosa por carta ----------
   E ele é sempre o que a carta está pedindo: WhatsApp quando há retorno
   marcado (a conversa é o trabalho), "Decidir passo" quando não há (a
   decisão é o trabalho). Nunca os dois. Numa tela com um objeto só, duas
   cores cheias seriam duas primeiras ações, que é o mesmo que nenhuma.
   ============================================================ */

import { useState, useTransition } from "react";
import Link from "next/link";
import { adiar, apagarLead, definirPasso, salvarLead } from "@/app/crm/acoes";
import {
  diasDesde,
  dinheiro,
  linkWhatsapp,
  sinalDaFicha,
  somarDias,
  temperatura,
  urgencia,
} from "@/lib/crm/regras";
import { NOME_ESTAGIO, NOME_TIPO, type LeadPainel } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

type Gaveta = "passo" | "zap" | "apagar" | null;

/* Os três prazos que cobrem quase toda decisão de prospecção, e o campo de
   data ao lado para o resto. "Hoje" é o primeiro de propósito: o passo mais
   comum de um lead recém-anotado é falar com ele agora. */
const PRAZOS = [
  { rotulo: "Hoje", dias: 0 },
  { rotulo: "+3d", dias: 3 },
  { rotulo: "+7d", dias: 7 },
] as const;

/* Os tons do sinal NA VERSÃO QUE VIVE SOBRE TINTA. Os da ficha
   (`.sinalAlerta` e companhia) são calibrados para papel e somem aqui: o
   `--rosa` da casa dá 3,5:1 sobre grafite. É a mesma regra já registrada
   para o trilho e para as placas do quadro. */
const TOM: Record<string, string> = {
  alerta: s.vezSinalAlerta,
  agora: s.vezSinalAgora,
  morno: s.vezSinalMorno,
  quieto: s.vezSinalQuieto,
};

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

export function CartaDaVez({
  lead,
  hoje,
  aoMandarMensagem,
  aoRegistrarToque,
}: {
  lead: LeadPainel;
  hoje: string;
  aoMandarMensagem: (lead: LeadPainel) => void;
  aoRegistrarToque: (lead: LeadPainel) => void;
}) {
  const [salvando, comecar] = useTransition();
  const [gaveta, setGaveta] = useState<Gaveta>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [passo, setPasso] = useState(lead.proximo_passo ?? "");
  const [data, setData] = useState(() => somarDias(hoje, 3));
  const [zap, setZap] = useState(lead.whatsapp ?? "");

  const temZap = Boolean(linkWhatsapp(lead.whatsapp));
  const temRetorno = Boolean(lead.proxima_acao_em);
  const sinal = sinalDaFicha(lead, hoje);

  /* A empresa sai do contexto quando ela É o nome. Prospecção de comércio
     local é cheia de lead cujo nome do contato e nome da empresa são a
     mesma coisa ("Padaria do Zé"), e a carta escrevia isso duas vezes: uma
     em 76px e outra em 17px logo abaixo. Comparação frouxa de propósito,
     porque a diferença costuma ser uma caixa ou um espaço. */
  const mesmoNome =
    lead.empresa?.trim().toLocaleLowerCase("pt-BR") === lead.nome.trim().toLocaleLowerCase("pt-BR");
  const contexto = [
    mesmoNome ? null : lead.empresa,
    lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : null,
    lead.cidade,
  ]
    .filter(Boolean)
    .join(" · ");

  const abrir = (qual: Gaveta) => {
    setErro(null);
    setGaveta((atual) => (atual === qual ? null : qual));
  };
  const fechar = () => {
    setErro(null);
    setGaveta(null);
  };

  const empurrar = (dias: number) => comecar(() => void adiar(lead.id, dias));

  const salvarPasso = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await definirPasso(lead.id, passo, data);
      if (r.ok) return fechar();
      setErro("erro" in r ? r.erro : "Escreva o passo e escolha a data.");
    });
  };

  const salvarZap = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await salvarLead(lead.id, { whatsapp: zap });
      if (r.ok) return fechar();
      setErro("erro" in r ? r.erro : "Não foi possível salvar o número.");
    });
  };

  /* Sem `fechar()` no sucesso: a carta inteira é trocada pela próxima na
     revalidação, e mexer no estado de um componente que está saindo da
     árvore é trabalho para ninguém ver. */
  const confirmarApagar = () => {
    setErro(null);
    comecar(async () => {
      const r = await apagarLead(lead.id);
      if (!r.ok) setErro("erro" in r ? r.erro : "Não foi possível apagar.");
    });
  };

  return (
    <article className={s.vezCarta}>
      <div className={s.vezCorpo}>
        <span className={`${s.vezSinal} ${TOM[sinal.tom]}`}>{sinal.texto}</span>

        {/* O nome é o <h1> desta tela. A manchete da página faz a pergunta;
            a resposta não pode chegar em corpo de legenda. Caixa BAIXA, pela
            mesma regra do card do portfólio: são nomes de pessoa e de marca,
            com grafia própria, e caixa alta faria de "Vérit.lab" outra
            palavra. */}
        {/* O ponto final rosa é a assinatura da casa, e ela vale em toda
            manchete. Aqui o nome É a manchete, então ele ganha o ponto: em
            88px de condensada o ponto vira um quadrado do tamanho de uma
            moeda, que é o menor lugar possível para a cor de acento e o mais
            deliberado.

            `--rosa-live` e não `--rosa`: isto vive sobre grafite, onde o
            rosa da casa dá 3,5:1. Mesma regra do trilho e das placas.

            A guarda existe porque prospecção de comércio local está cheia de
            marca com pontuação própria: "Vérit.lab." ou "Ateliê Ana!" com
            mais um ponto colado leem como erro de digitação, não como
            assinatura. */}
        <h1 className={s.vezNome}>
          <Link href={`/crm/lead/${lead.id}`}>{lead.nome}</Link>
          {/[.!?…]$/.test(lead.nome.trim()) ? null : <i className={s.vezPonto}>.</i>}
        </h1>

        {contexto ? <p className={s.vezContexto}>{contexto}</p> : null}

        <p className={`${s.vezPasso} ${lead.proximo_passo ? "" : s.vezSemPasso}`}>
          {lead.proximo_passo ?? "Decida o próximo passo"}
        </p>

        <div className={s.vezAcoes}>
          {temZap ? (
            <button
              type="button"
              className={temRetorno ? s.btnAcao : s.btnEscuro}
              onClick={() => aoMandarMensagem(lead)}
            >
              WhatsApp
            </button>
          ) : (
            <button
              type="button"
              className={s.btnEscuro}
              onClick={() => abrir("zap")}
              aria-expanded={gaveta === "zap"}
            >
              Anotar WhatsApp
            </button>
          )}

          <button type="button" className={s.btnEscuro} onClick={() => aoRegistrarToque(lead)}>
            Registrar toque
          </button>

          {temRetorno ? (
            /* O trio anda junto e encosta: é um controle só, "adiar". */
            <div
              className={s.adiarGrande}
              role="group"
              aria-label={`Adiar o retorno de ${lead.nome}`}
            >
              {[1, 3, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={s.btnEscuro}
                  onClick={() => empurrar(d)}
                  disabled={salvando}
                >
                  +{d}d
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              className={s.btnAcao}
              onClick={() => abrir("passo")}
              aria-expanded={gaveta === "passo"}
            >
              Decidir passo
            </button>
          )}

          {/* Na ponta oposta da fileira: é a única ação da tela sem volta, e
              encostada no "+7d" ela seria um alvo irreversível a seis pixels
              de um alvo que a mão aperta vinte vezes por dia. */}
          <button
            type="button"
            className={`${s.btnMiniEscuro} ${s.acaoIsolada}`}
            onClick={() => abrir("apagar")}
            aria-expanded={gaveta === "apagar"}
          >
            Apagar
          </button>
        </div>

        {/* ---------- as gavetas ----------
            Filete esmeralda na margem: o mesmo objeto do `.blocoPergunta`
            dos modais, que nesta casa quer dizer "o CRM está te
            perguntando". Ela abre na própria carta em vez de escurecer a
            tela, porque a pergunta é curta e a resposta é a mesma oito vezes
            seguidas. */}
        {gaveta === "passo" ? (
          <form
            className={s.gavetaFila}
            onSubmit={salvarPasso}
            onKeyDown={(e) => e.key === "Escape" && fechar()}
          >
            <p className={s.gavetaTitulo}>Qual é o próximo passo?</p>

            <input
              type="text"
              className={s.gavetaCampo}
              value={passo}
              onChange={(e) => setPasso(e.target.value)}
              placeholder="Mandar a primeira mensagem"
              aria-label={`Próximo passo de ${lead.nome}`}
              autoFocus
            />

            <div className={s.gavetaQuando}>
              <span className={s.gavetaRot}>Me cobre em</span>
              {PRAZOS.map((p) => {
                const iso = somarDias(hoje, p.dias);
                return (
                  <button
                    key={p.rotulo}
                    type="button"
                    className={`${s.chip} ${s.chipMini} ${data === iso ? s.chipAtivo : ""}`}
                    onClick={() => setData(iso)}
                    aria-pressed={data === iso}
                  >
                    {p.rotulo}
                  </button>
                );
              })}
              <input
                type="date"
                className={s.gavetaData}
                value={data}
                min={hoje}
                onChange={(e) => setData(e.target.value)}
                aria-label={`Data do próximo passo de ${lead.nome}`}
              />
            </div>

            {erro ? (
              <p role="alert" className={s.erro}>
                {erro}
              </p>
            ) : null}

            <div className={s.gavetaPe}>
              <button type="button" className={s.btnMini} onClick={fechar}>
                Cancelar
              </button>
              <button type="submit" className={`${s.btnMini} ${s.btnMiniForte}`} disabled={salvando}>
                {salvando ? "Salvando…" : "Decidir passo"}
              </button>
            </div>
          </form>
        ) : null}

        {gaveta === "zap" ? (
          <form
            className={s.gavetaFila}
            onSubmit={salvarZap}
            onKeyDown={(e) => e.key === "Escape" && fechar()}
          >
            <p className={s.gavetaTitulo}>Qual é o WhatsApp?</p>

            <input
              type="tel"
              inputMode="tel"
              className={s.gavetaCampo}
              value={zap}
              onChange={(e) => setZap(e.target.value)}
              placeholder="44 99999-7219"
              aria-label={`WhatsApp de ${lead.nome}`}
              autoFocus
            />

            {erro ? (
              <p role="alert" className={s.erro}>
                {erro}
              </p>
            ) : null}

            <div className={s.gavetaPe}>
              <button type="button" className={s.btnMini} onClick={fechar}>
                Cancelar
              </button>
              <button type="submit" className={`${s.btnMini} ${s.btnMiniForte}`} disabled={salvando}>
                {salvando ? "Salvando…" : "Anotar WhatsApp"}
              </button>
            </div>
          </form>
        ) : null}

        {/* Filete rosa e não esmeralda: nesta ferramenta o rosa quer dizer
            "olhe para cá agora", e esta é a única ação sem volta. O texto diz
            o que some E qual é o caminho de quem quis dizer outra coisa. */}
        {gaveta === "apagar" ? (
          <div className={`${s.gavetaFila} ${s.gavetaRisco}`}>
            <p className={s.gavetaTitulo}>Apagar {lead.nome}?</p>
            <p className={s.gavetaTexto}>
              Some do banco com a linha do tempo inteira, e não dá para desfazer. Se a conversa
              aconteceu e não foi para frente, o caminho é marcar como perdido no quadro, que guarda
              o motivo.
            </p>

            {erro ? (
              <p role="alert" className={s.erro}>
                {erro}
              </p>
            ) : null}

            <div className={s.gavetaPe}>
              <button type="button" className={s.btnMini} onClick={fechar}>
                Cancelar
              </button>
              <button
                type="button"
                className={`${s.btnMini} ${s.btnMiniForte}`}
                onClick={confirmarApagar}
                disabled={salvando}
              >
                {salvando ? "Apagando…" : "Apagar mesmo"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Dossie lead={lead} hoje={hoje} />
    </article>
  );
}

/* ============================================================
   O DOSSIÊ — o que se quer saber antes de apertar "WhatsApp"

   Quatro fatos, sempre os quatro, sempre nesta ordem. Eles moravam dentro
   da ficha do lead, a um clique e uma troca de tela de distância, e a
   pergunta que eles respondem é feita no segundo anterior à mensagem:
   quanto vale, em que pé está, quando foi a última vez, e quantas vezes eu
   já falei sem resposta.

   ---------- por que sempre os quatro ----------
   Esconder o que está vazio faria a coluna mudar de altura a cada carta, e
   o olho perderia o lugar de cada fato a cada nome. Quando não há dado, o
   fato diz que não há, o que também é informação: "sem estimativa" num
   lead em proposta é um furo do pipeline, e ele fica visível justamente
   por não ter sumido.

   ---------- por que ele não tem botão ----------
   Nenhum. É a folha de consulta da carta, e o que se faz com ela está do
   outro lado, nos quatro controles. Um "editar" aqui transformaria o
   dossiê numa segunda ficha, e a ficha de verdade está a um clique no nome.
   ============================================================ */
function Dossie({ lead, hoje }: { lead: LeadPainel; hoje: string }) {
  const valor = lead.valor_fechado ?? lead.ticket_estimado;
  const { dias: diasNaEtapa } = temperatura(lead, hoje);
  const desdeOToque = lead.ultimo_toque_em ? diasDesde(lead.ultimo_toque_em, hoje) : null;

  const fatos = [
    {
      rotulo: "Ticket",
      valor: valor ? dinheiro(valor) : "Sem estimativa",
      forte: Boolean(valor),
    },
    {
      rotulo: "Etapa",
      valor: NOME_ESTAGIO[lead.estagio],
      nota: diasNaEtapa === 0 ? "entrou hoje" : `há ${plural(diasNaEtapa, "dia", "dias")}`,
      forte: true,
    },
    {
      rotulo: "Último toque",
      valor:
        desdeOToque === null
          ? "Nunca falei"
          : desdeOToque === 0
            ? "Hoje"
            : `Há ${plural(desdeOToque, "dia", "dias")}`,
      forte: desdeOToque !== null,
    },
    {
      rotulo: "Toques",
      valor: lead.toques ? String(lead.toques) : "Nenhum",
      /* A regra dos 2 retornos aparece aqui como nota e não como alerta: o
         sinal lá em cima já grita quando ela vale, e repetir o grito no
         dossiê seria dizer a mesma coisa duas vezes na mesma carta. */
      nota: lead.saidas_seguidas >= 2 ? `${lead.saidas_seguidas} sem resposta` : undefined,
      forte: lead.toques > 0,
    },
  ];

  return (
    <aside className={s.vezDossie}>
      {fatos.map((f) => (
        <div key={f.rotulo} className={s.vezFato}>
          <span className={s.vezFatoRot}>{f.rotulo}</span>
          <b className={`${s.vezFatoVal} ${f.forte ? "" : s.vezFatoVazio}`}>{f.valor}</b>
          {f.nota ? <span className={s.vezFatoNota}>{f.nota}</span> : null}
        </div>
      ))}
    </aside>
  );
}
