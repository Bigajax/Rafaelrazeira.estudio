"use client";
import { ClienteConectado } from "@/components/sistema/ClienteConectado";

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

   Agora são três blocos em coluna única, na ordem em que a cabeça
   trabalha:

     1. QUEM É        o cabeçalho: nome, ticket, contexto, "Mandar
                      mensagem" e o link do perfil no Instagram
     2. O QUE FAZER   estágio e próximo passo, lado a lado
     3. O QUE ROLOU   linha do tempo

   Em 22/10 saíram a Pesquisa (dossiê), o "Registrar toque" à mão, o
   "Responder com IA" e a "Leitura da conversa": o Rafael não usava mais
   nenhum, e eles empurravam a linha do tempo para o fim de uma rolagem
   longa. A saída se registra sozinha pelo "Mandar mensagem", e a entrada
   chega pelo leitor do WhatsApp. Os componentes continuam no repositório.

   Os dez campos de cadastro, as notas e as indicações foram para trás de um
   botão só ("Ver todos os dados"). Eles não sumiram: eles pararam de
   competir com a decisão do dia. Nome e telefone se preenchem uma vez e se
   olham raramente; o próximo passo se decide toda semana.
   ============================================================ */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { apagarLead, moverLead } from "@/app/(pt)/crm/acoes";
import { mascararWhatsapp } from "@/components/telefone";
import {
  dataCurta,
  diasDesde,
  dinheiro,
  horaCurta,
  linkInstagram,
  linkWhatsapp,
  oQueFalta,
  temperatura,
  type CampoExigido,
  type Passagem,
} from "@/lib/crm/regras";
import {
  ehAtivo,
  ESTAGIOS,
  NOME_CANAL,
  NOME_ESTAGIO,
  NOME_MOTIVO,
  NOME_ORIGEM,
  NOME_TIPO,
  NOTA_ESTAGIO,
  ORIGENS,
  TIPOS_PROJETO,
  type Estagio,
  type Interacao,
  type Lead,
  type LeadPainel,
  type Template,
} from "@/lib/crm/tipos";
import { CampoInline, NotaInline } from "./CampoInline";
import { ModalContrato } from "./ModalContrato";
import { ModalMensagem } from "./ModalMensagem";
import { ModalPassagem } from "./ModalPassagem";
import { AvisoDoisRetornos } from "./pecas";
import { BlocoContrato } from "./BlocoContrato";
import type { ContratoPainel } from "@/lib/crm/dados";
import s from "@/app/(pt)/crm/crm.module.css";

type Vizinho = Pick<Lead, "id" | "nome" | "empresa" | "estagio">;

export type DadosFicha = {
  lead: LeadPainel;
  interacoes: Interacao[];
  indicados: Vizinho[];
  quemIndicou: Vizinho | null;
  templates: Template[];
  contratos: ContratoPainel[];
  hoje: string;
};

export function Ficha({ lead, interacoes, indicados, quemIndicou, templates, contratos, hoje }: DadosFicha) {
  const [mensagem, setMensagem] = useState(false);
  const [abrirDados, setAbrirDados] = useState(false);
  const [pendente, setPendente] = useState<{ estagio: Estagio; falta: CampoExigido[] } | null>(null);
  const [fechando, setFechando] = useState(false);
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

    /* Ganho passa pelo "Fechou" (06/10): o plano de pagamento nasce junto. */
    if (estagio === "ganho") {
      setFechando(true);
      return;
    }

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
          {/* Basta UM canal para o botão existir: o modal é quem decide a
              saída (WhatsApp com número, direct sem). Antes ele exigia o
              número, e lead só de Instagram ficava sem porta de mensagem. */}
          {zap || insta ? (
            <button type="button" className={s.btnAcao} onClick={() => setMensagem(true)}>
              Mandar mensagem
            </button>
          ) : null}
          {/* O "Instagram" volta a ABRIR O PERFIL (22/10). Desde 01/10 ele
              abria o modal de mensagem saindo pelo direct, e o Rafael clicava
              para ver a loja e caía num seletor de template. Ver o perfil e
              mandar mensagem são dois gestos; o direct continua saindo pelo
              "Mandar mensagem" quando o lead não tem número. */}
          {insta ? (
            <a className={s.btnEscuro} href={insta} target="_blank" rel="noopener noreferrer">
              Instagram ↗
            </a>
          ) : null}
          <span className={s.fichaCabOrigem}>
            {NOME_ORIGEM[lead.origem]}
            {/* Campanha e anúncio inteiros aqui (o card mostra só o
                anúncio): é nesta tela que se confere no Gerenciador de
                onde a pessoa veio, então os dois nomes saem literais. */}
            {lead.campanha ? ` · ${lead.campanha}` : ""}
            {lead.anuncio ? ` · ${lead.anuncio}` : ""}
            {lead.ultimo_toque_em ? ` · último toque há ${diasDesde(lead.ultimo_toque_em, hoje)}d` : ""}
          </span>
        </div>
      </header>

      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}

      <ClienteConectado leadId={lead.id} />
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

        {/* ---------- as duas saídas, com nome ----------
            Elas sempre existiram dentro do seletor de estágio, e foi a
            terceira vez que uma ação decisiva escondida num controle neutro
            não foi encontrada na hora H (Apagar lead e Registrar toque
            vieram antes): a Lígia recusou a prévia e o Rafael não achou
            onde marcar a perda. Encerrar uma conversa é decisão, e decisão
            merece botão com nome, não uma opção no fim de um dropdown.
            Os dois chamam o MESMO fluxo do seletor, então o modal continua
            pedindo o valor do ganho e o motivo da perda. Discretos de
            propósito (btnMini): são as saídas, não a primeira ação. */}
        {ehAtivo(lead.estagio) ? (
          <div className={s.opcoes}>
            <button
              type="button"
              className={s.btnMini}
              onClick={() => trocarEstagio("ganho")}
              disabled={salvando}
            >
              Fechou, ganho
            </button>
            <button
              type="button"
              className={s.btnMini}
              onClick={() => trocarEstagio("perdido")}
              disabled={salvando}
            >
              Não vai rolar, perdido
            </button>
          </div>
        ) : null}

        <AvisoDoisRetornos lead={lead} />
      </section>

      {/* ============ O DINHEIRO ============
          Entre a decisão e a pesquisa: quem abre a ficha para mandar
          mensagem precisa saber que a pessoa deve R$ 499 ANTES de
          escrever, não depois de rolar até a linha do tempo. Some inteiro
          em lead sem contrato que ainda não foi ganho. */}
      <BlocoContrato lead={lead} contratos={contratos} hoje={hoje} />

      {/* ============ 3. O QUE ROLOU ============ */}
      <section className={s.bloco}>
        <div className={s.blocoCab}>
          <h2>Linha do tempo</h2>
          <span className={s.blocoNota}>
            {lead.toques} {lead.toques === 1 ? "toque" : "toques"}
          </span>
        </div>

        {interacoes.length === 0 ? (
          <p className={s.blocoNota}>
            Nenhum toque ainda. O primeiro registro aparece aqui assim que você falar com esta pessoa.
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
                placeholder="(44) 99124-6187"
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

      {fechando ? <ModalContrato lead={lead} hoje={hoje} ganhar aoFechar={() => setFechando(false)} /> : null}
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
        <b>{lead.nome}</b> some do banco com a linha do tempo inteira, e não dá para desfazer. Se a conversa
        aconteceu e não foi para frente, o caminho é mudar o estágio para perdido, que guarda o motivo e
        continua contando nas métricas.
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
