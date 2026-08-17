"use client";

/* ============================================================
   A FICHA DO LEAD

   Uma implementação, dois lugares: ela é o corpo do modal que abre por cima
   do quadro E o corpo da página /crm/lead/[id] quando alguém chega pela URL
   direta ou dá F5. Duas versões do mesmo painel divergiriam na primeira
   correção que alguém fizesse com pressa.

   ------------------------------------------------------------
   O QUE FOI CORTADO, E POR QUÊ

   A versão anterior era um painel de duas colunas com SETE blocos: estágio,
   próximo passo, dados (dez campos), notas, indicações, registrar toque e
   linha do tempo. Tudo aberto ao mesmo tempo. Para um CRM que se abre vinte
   vezes por dia, isso é um formulário de cadastro com um histórico perdido
   no meio.

   Agora são quatro blocos em coluna única, na ordem em que a cabeça
   trabalha:

     1. QUEM É        o cabeçalho grafite: nome, ticket, contexto, e os
                      dois botões que abrem conversa
     2. O QUE FAZER   estágio e próximo passo, lado a lado
     3. O QUE FIZ     registrar toque
     4. O QUE ROLOU   linha do tempo

   Os dez campos de cadastro, as notas e as indicações foram para trás de um
   botão só ("Ver todos os dados"). Eles não sumiram: eles pararam de
   competir com a decisão do dia. Nome e telefone se preenchem uma vez e se
   olham raramente; o próximo passo se decide toda semana.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apagarLead, moverLead, registrarToque } from "@/app/crm/acoes";
import { mascararWhatsapp } from "@/components/telefone";
import {
  dataCurta,
  diasDesde,
  dinheiro,
  horaCurta,
  hojeSP,
  linkInstagram,
  linkWhatsapp,
  oQueFalta,
  somarDias,
  temperatura,
  type CampoExigido,
  type Passagem,
} from "@/lib/crm/regras";
import {
  CANAIS,
  ESTAGIOS,
  NOME_CANAL,
  NOME_ESTAGIO,
  NOME_MOTIVO,
  NOME_ORIGEM,
  NOME_TIPO,
  NOTA_ESTAGIO,
  ORIGENS,
  TIPOS_PROJETO,
  type Canal,
  type Direcao,
  type Estagio,
  type Interacao,
  type Lead,
  type LeadPainel,
  type Template,
} from "@/lib/crm/tipos";
import { CampoInline, NotaInline } from "./CampoInline";
import { ModalMensagem } from "./ModalMensagem";
import { ModalPassagem } from "./ModalPassagem";
import { Pesquisa } from "./Pesquisa";
import { SugerirResposta } from "./SugerirResposta";
import { AvisoDoisRetornos } from "./pecas";
import s from "@/app/crm/crm.module.css";

type Vizinho = Pick<Lead, "id" | "nome" | "empresa" | "estagio">;

export type DadosFicha = {
  lead: LeadPainel;
  interacoes: Interacao[];
  indicados: Vizinho[];
  quemIndicou: Vizinho | null;
  templates: Template[];
  hoje: string;
};

export function Ficha({
  lead,
  interacoes,
  indicados,
  quemIndicou,
  templates,
  hoje,
}: DadosFicha) {
  const [mensagem, setMensagem] = useState(false);
  const [abrirDados, setAbrirDados] = useState(false);
  const [pendente, setPendente] = useState<{ estagio: Estagio; falta: CampoExigido[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const zap = linkWhatsapp(lead.whatsapp);
  const insta = linkInstagram(lead.instagram);
  const { estado, dias } = temperatura(lead, hoje);
  const contexto = [lead.empresa, lead.tipo_projeto ? NOME_TIPO[lead.tipo_projeto] : null, lead.cidade]
    .filter(Boolean)
    .join(" · ");

  function trocarEstagio(estagio: Estagio, passagem: Passagem = {}) {
    if (estagio === lead.estagio && !Object.keys(passagem).length) return;
    setErro(null);

    const falta = oQueFalta(estagio, lead, passagem);
    if (falta.length) {
      setPendente({ estagio, falta });
      return;
    }

    comecar(async () => {
      /* `posicao` vai nula: mudar de estágio pela ficha não diz nada sobre
         onde o card deve ficar na coluna, e inventar uma posição aqui
         embaralharia a ordem arrumada à mão no quadro. */
      const r = await moverLead(lead.id, estagio, null, passagem);
      if (r.ok) setPendente(null);
      else if ("falta" in r) setPendente({ estagio, falta: r.falta });
      else setErro(r.erro);
    });
  }

  return (
    <>
      {/* ============ 1. QUEM É ============
          Cabeçalho em grafite, o mesmo objeto da placa da coluna e da faixa
          de status. Ele é o que dá presença à ficha sem gastar um bloco: o
          nome, o valor e o contexto cabem numa banda só, e o resto do
          painel fica sendo papel do começo ao fim. */}
      <header className={s.fichaCab}>
        <div className={s.fichaCabTopo}>
          <h1 className={s.fichaCabNome}>
            {lead.nome}
            <i className={s.pontoClaro}>.</i>
          </h1>
          {lead.valor_fechado || lead.ticket_estimado ? (
            <b className={s.fichaCabValor}>{dinheiro(lead.valor_fechado ?? lead.ticket_estimado)}</b>
          ) : null}
        </div>

        {contexto ? <p className={s.fichaCabContexto}>{contexto}</p> : null}

        <div className={s.fichaCabAcoes}>
          {zap ? (
            <button type="button" className={s.btnAcao} onClick={() => setMensagem(true)}>
              Mandar mensagem
            </button>
          ) : null}
          {insta ? (
            <a className={s.btnEscuro} href={insta} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          ) : null}
          <span className={s.fichaCabOrigem}>
            {NOME_ORIGEM[lead.origem]}
            {lead.ultimo_toque_em ? ` · último toque há ${diasDesde(lead.ultimo_toque_em, hoje)}d` : ""}
          </span>
        </div>
      </header>

      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}

      {/* ============ 2. O QUE FAZER ============
          Estágio e próximo passo dividem um bloco só, porque são a mesma
          pergunta em dois tempos: em que pé está, e qual é a próxima
          mexida. Separados em dois cartões, eles pareciam dois assuntos. */}
      <section className={`${s.bloco} ${s.blocoPasso}`}>
        <div className={s.decisao}>
          <label className={s.campo}>
            <span className={s.campoRot}>Estágio</span>
            <select
              value={lead.estagio}
              onChange={(e) => trocarEstagio(e.target.value as Estagio)}
              disabled={salvando}
              className={s.estagioSelect}
            >
              {ESTAGIOS.map((e) => (
                <option key={e} value={e}>
                  {NOME_ESTAGIO[e]}
                </option>
              ))}
            </select>
            <small className={s.campoNota}>
              {NOTA_ESTAGIO[lead.estagio]} · {dias === 0 ? "entrou hoje" : `${dias}d aqui`}
              {estado !== "normal" ? `, ${estado === "frio" ? "frio" : "esfriando"}` : ""}
            </small>
          </label>

          <CampoInline
            leadId={lead.id}
            campo="proxima_acao_em"
            rotulo="Me cobre em"
            valor={lead.proxima_acao_em}
            tipo="date"
          />
        </div>

        <CampoInline
          leadId={lead.id}
          campo="proximo_passo"
          rotulo="Próximo passo"
          valor={lead.proximo_passo}
          placeholder="Mandar a proposta com os dois prazos"
        />

        {lead.motivo_perda ? (
          <p className={s.blocoNota}>Perdido por: {NOME_MOTIVO[lead.motivo_perda]}</p>
        ) : null}
        {lead.valor_fechado ? (
          <p className={s.blocoNota}>
            Fechou {dinheiro(lead.valor_fechado)}
            {lead.fechado_em ? ` em ${dataCurta(lead.fechado_em)}` : ""}
          </p>
        ) : null}

        <AvisoDoisRetornos lead={lead} />
      </section>

      {/* ============ A PESQUISA ============
          Entre "o que fazer" e "o que fiz" de propósito: o dossiê é o que
          informa a primeira mexida. Ele dispara sozinho quando o lead nasce
          pelo modal, então aqui ele costuma chegar já rodando. */}
      <Pesquisa lead={lead} aoMandarMensagem={() => setMensagem(true)} />

      {/* ============ 3. O QUE FIZ ============ */}
      <FormToque lead={lead} hoje={hoje} />

      {/* ============ RESPONDER COM IA ============
          Depois do registro do toque de propósito: o fluxo real é
          "responderam, registro a entrada, decido o que dizer". O campo
          nasce com o resumo da última entrada, então registrar antes deixa
          a sugestão meio pronta. */}
      <SugerirResposta lead={lead} interacoes={interacoes} />

      {/* ============ 4. O QUE ROLOU ============ */}
      <section className={s.bloco}>
        <div className={s.blocoCab}>
          <h2>Linha do tempo</h2>
          <span className={s.blocoNota}>
            {lead.toques} {lead.toques === 1 ? "toque" : "toques"}
          </span>
        </div>

        {interacoes.length === 0 ? (
          <p className={s.blocoNota}>
            Nenhum toque ainda. O primeiro registro aparece aqui assim que você falar com esta
            pessoa.
          </p>
        ) : (
          <ul className={s.timeline}>
            {interacoes.map((i) => (
              <li key={i.id} className={`${s.toque} ${i.direcao === "entrada" ? s.toqueEntrada : ""}`}>
                <span className={s.toqueCab}>
                  <b className={s.toqueDir}>{i.direcao === "entrada" ? "Responderam" : "Eu falei"}</b>
                  <span>{NOME_CANAL[i.canal]}</span>
                  <span>{horaCurta(i.created_at)}</span>
                </span>
                {i.resumo ? <span className={s.toqueResumo}>{i.resumo}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============ O CADASTRO, ATRÁS DE UM BOTÃO ============
          Dez campos que se preenchem uma vez e se olham raramente. Eles
          estavam ocupando metade da tela em toda visita para servir a uma
          correção por mês. */}
      <section className={s.bloco}>
        <button
          type="button"
          className={s.gaveta}
          onClick={() => setAbrirDados((a) => !a)}
          aria-expanded={abrirDados}
        >
          <span>{abrirDados ? "Esconder os dados" : "Ver todos os dados"}</span>
          <i className={abrirDados ? s.gavetaAberta : ""} aria-hidden>
            ▾
          </i>
        </button>

        {abrirDados ? (
          <div className={s.gavetaCorpo}>
            <div className={s.dados}>
              <CampoInline leadId={lead.id} campo="nome" rotulo="Nome" valor={lead.nome} />
              <CampoInline leadId={lead.id} campo="empresa" rotulo="Empresa" valor={lead.empresa} />
              <CampoInline
                leadId={lead.id}
                campo="whatsapp"
                rotulo="WhatsApp"
                valor={lead.whatsapp ? mascararWhatsapp(lead.whatsapp) : ""}
                tipo="tel"
                mascara={mascararWhatsapp}
                placeholder="(44) 99999-7219"
              />
              <CampoInline
                leadId={lead.id}
                campo="instagram"
                rotulo="Instagram"
                valor={lead.instagram}
                placeholder="@perfil"
              />
              <CampoInline leadId={lead.id} campo="email" rotulo="E-mail" valor={lead.email} tipo="email" />
              <CampoInline leadId={lead.id} campo="nicho" rotulo="Nicho" valor={lead.nicho} />
              <CampoInline leadId={lead.id} campo="cidade" rotulo="Cidade" valor={lead.cidade} />
              <CampoInline
                leadId={lead.id}
                campo="tipo_projeto"
                rotulo="Projeto"
                valor={lead.tipo_projeto ?? ""}
                opcoes={[
                  { valor: "", rotulo: "Ainda não sei" },
                  ...TIPOS_PROJETO.map((t) => ({ valor: t, rotulo: NOME_TIPO[t] })),
                ]}
              />
              <CampoInline
                leadId={lead.id}
                campo="ticket_estimado"
                rotulo="Ticket"
                valor={lead.ticket_estimado}
                tipo="number"
                placeholder="2500"
              />
              <CampoInline
                leadId={lead.id}
                campo="origem"
                rotulo="Origem"
                valor={lead.origem}
                opcoes={ORIGENS.map((o) => ({ valor: o, rotulo: NOME_ORIGEM[o] }))}
              />
            </div>

            <p className={s.campoRot}>Notas</p>
            <NotaInline leadId={lead.id} valor={lead.notas} />

            {/* Indicações só existem quando existem, dos dois lados: um bloco
                vazio de "não há indicados" em toda ficha seria uma seção
                morta em 90% dos leads. */}
            {quemIndicou || indicados.length ? (
              <>
                <p className={s.campoRot}>Indicações</p>
                {quemIndicou ? (
                  <p className={s.blocoNota}>
                    Veio por{" "}
                    <Link href={`/crm/lead/${quemIndicou.id}`} className={s.linkFicha}>
                      {quemIndicou.nome}
                    </Link>
                  </p>
                ) : null}
                {indicados.length ? (
                  <ul className={s.listaFichas}>
                    {indicados.map((i) => (
                      <li key={i.id}>
                        <Link href={`/crm/lead/${i.id}`} className={s.linkFicha}>
                          {i.nome}
                          {i.empresa ? ` (${i.empresa})` : ""}
                        </Link>
                        <span>{NOME_ESTAGIO[i.estagio]}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ============ A SAÍDA ============
          Ela morava dentro da gaveta "Ver todos os dados", e o Rafael não
          achou: para apagar um lead era preciso abrir a ficha, abrir a
          gaveta e rolar até o fim. Três níveis para uma ação que ele pediu
          três vezes.

          Agora ela é o último bloco da ficha, sempre visível. Continua em
          dois tempos e continua sendo a coisa mais quieta da tela, que é o
          certo para o que não tem volta: o que ela NÃO pode ser é
          impossível de achar. */}
      <ApagarLead lead={lead} />

      {mensagem ? (
        <ModalMensagem lead={lead} templates={templates} aoFechar={() => setMensagem(false)} />
      ) : null}

      {pendente ? (
        <ModalPassagem
          nomeLead={lead.nome}
          estagio={pendente.estagio}
          falta={pendente.falta}
          salvando={salvando}
          aoCancelar={() => setPendente(null)}
          aoConfirmar={(passagem) => trocarEstagio(pendente.estagio, passagem)}
        />
      ) : null}
    </>
  );
}

/* ============================================================
   APAGAR O LEAD

   O `apagarLead` existia no servidor desde o começo e não era chamado de
   nenhuma tela: dava para criar um lead e não dava para desfazer isso em
   lugar nenhum do CRM.

   ---------- ele já esteve enterrado, e isso foi um erro ----------
   A primeira versão o pôs no fim da gaveta "Ver todos os dados", com o
   argumento de que apagar é raro e não deve competir com a decisão do dia.
   O argumento estava certo e a conclusão errada: com a gaveta fechada por
   padrão, apagar virou três níveis de profundidade (abrir a ficha, abrir a
   gaveta, rolar) e o Rafael simplesmente não achou.

   Discreto não é escondido. Agora ele é o último bloco da ficha, sempre
   visível, depois de tudo o que se faz com um lead vivo. Continua em dois
   tempos, continua sem cor e continua sendo a coisa mais quieta da tela.

   Dois tempos, no mesmo padrão da tela de Templates: o botão não apaga,
   ele abre a frase que diz o que some. E a frase aponta a saída certa para
   quem quis dizer outra coisa, porque quase todo lead que incomoda não é
   erro de digitação, é conversa que não foi para frente, e essa vira
   perdido com motivo em vez de virar nada.
   ============================================================ */
function ApagarLead({ lead }: { lead: LeadPainel }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [apagando, comecar] = useTransition();

  const apagar = () => {
    setErro(null);
    comecar(async () => {
      const r = await apagarLead(lead.id);
      /* `replace` e não `push`: o lead não existe mais, e deixar a URL dele
         no histórico é um botão "voltar" que leva a uma tela de erro.
         Funciona nos dois cascos da ficha, porque no modal a mesma
         navegação fecha a camada e devolve a fila. */
      if (r.ok) router.replace("/crm");
      else setErro("erro" in r ? r.erro : "Não foi possível apagar.");
    });
  };

  if (!confirmando) {
    return (
      <div className={s.apagarFicha}>
        <button type="button" className={s.btnMini} onClick={() => setConfirmando(true)}>
          Apagar lead
        </button>
      </div>
    );
  }

  return (
    <div className={`${s.apagarFicha} ${s.apagarAberto}`}>
      <p className={s.gavetaTexto}>
        <b>{lead.nome}</b> some do banco com a linha do tempo inteira, e não dá para desfazer. Se a
        conversa aconteceu e não foi para frente, o caminho é mudar o estágio para perdido, que
        guarda o motivo e continua contando nas métricas.
      </p>

      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}

      <div className={s.gavetaPe}>
        <button type="button" className={s.btnMini} onClick={() => setConfirmando(false)}>
          Cancelar
        </button>
        <button
          type="button"
          className={`${s.btnMini} ${s.btnMiniForte}`}
          onClick={apagar}
          disabled={apagando}
        >
          {apagando ? "Apagando…" : "Apagar mesmo"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   O FORMULÁRIO RÁPIDO DE TOQUE

   Irmão do ModalToque (que serve à fila do dia) e repete a regra 6: se não
   houver retorno agendado no futuro, a pergunta do próximo passo aparece
   aqui mesmo, no mesmo envio. Registrar um toque e marcar o retorno são o
   mesmo pensamento, e separá-los em dois envios é como se perde metade dos
   retornos.
   ============================================================ */
function FormToque({ lead, hoje }: { lead: LeadPainel; hoje: string }) {
  const [direcao, setDirecao] = useState<Direcao>("saida");
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [resumo, setResumo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const precisaDePasso = !lead.proxima_acao_em || lead.proxima_acao_em < hoje;
  const [passo, setPasso] = useState("");
  const [data, setData] = useState(somarDias(hojeSP(), 3));

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await registrarToque(lead.id, {
        canal,
        direcao,
        resumo,
        proximo_passo: precisaDePasso && passo ? passo : undefined,
        proxima_acao_em: precisaDePasso && passo ? data : undefined,
      });
      if (r.ok) {
        setResumo("");
        setPasso("");
      } else {
        setErro("erro" in r ? r.erro : "Não foi possível registrar.");
      }
    });
  };

  return (
    <section className={s.bloco}>
      <form onSubmit={enviar}>
        <fieldset className={s.grupo}>
          <legend className={s.campoRot}>Registrar toque</legend>
          <div className={s.opcoes}>
            <button
              type="button"
              className={`${s.opcao} ${direcao === "saida" ? s.opcaoAtiva : ""}`}
              onClick={() => setDirecao("saida")}
              aria-pressed={direcao === "saida"}
            >
              Eu falei
            </button>
            <button
              type="button"
              className={`${s.opcao} ${direcao === "entrada" ? s.opcaoAtiva : ""}`}
              onClick={() => setDirecao("entrada")}
              aria-pressed={direcao === "entrada"}
            >
              Me responderam
            </button>
          </div>
        </fieldset>

        <div className={s.linhaToque}>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value as Canal)}
            aria-label="Canal do toque"
          >
            {CANAIS.map((c) => (
              <option key={c} value={c}>
                {NOME_CANAL[c]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            placeholder="Pediu para retomar depois do dia 20"
            aria-label="Resumo do toque"
          />
        </div>

        {precisaDePasso ? (
          <div className={s.blocoPergunta}>
            <p className={s.perguntaTitulo}>E agora, qual é o próximo passo?</p>
            <div className={s.linhaToque}>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                aria-label="Data do próximo passo"
              />
              <input
                type="text"
                value={passo}
                onChange={(e) => setPasso(e.target.value)}
                placeholder="Mandar a proposta com os dois prazos"
                aria-label="Próximo passo"
              />
            </div>
          </div>
        ) : null}

        {erro ? (
          <p role="alert" className={s.erro}>
            {erro}
          </p>
        ) : null}

        <button type="submit" className={s.btn} disabled={salvando}>
          {salvando ? "Registrando…" : "Registrar toque"}
        </button>
      </form>
    </section>
  );
}
