"use client";

/* ============================================================
   REGISTRAR TOQUE (regra 6)

   O formulário mais usado da ferramenta, e por isso o mais curto: direção,
   canal, uma linha de resumo. Nada mais.

   ---------- a direção vem primeiro, e é um par de botões ----------
   Não é um <select> por dois motivos. Primeiro: é a informação que muda o
   significado de tudo o que vem depois ("eu falei" e "me responderam" são
   dois fatos diferentes, e um deles zera a regra dos 2 retornos). Segundo:
   dois botões grandes são um toque no celular, contra três num select.

   ---------- e "me responderam" abre uma segunda pergunta ----------
   Ela entrou em 20/08 e é a correção de um erro que custava leads todo dia.
   "Me responderam" era um balde só para dois fatos opostos: "me conta mais"
   e "não me chama mais". O trilho lia os dois igual e promovia os dois para
   Conversa, então quem tinha acabado de dizer não voltava na fila do dia
   seguinte com o passo "Responder a conversa". O CRM mandava insistir com
   quem já tinha recusado, que é a coisa mais cara que uma ferramenta de
   prospecção pode fazer.

   Três teores, três destinos, e o destino aparece ESCRITO embaixo dos
   botões antes de qualquer clique: um registro que move o lead de etapa sem
   avisar é a forma mais rápida de alguém parar de confiar no registro.

   ---------- a última pergunta muda com o teor ----------
   Cada ramo pede exatamente mais uma coisa, e nunca duas telas:
     quer saber mais .. o próximo passo (a regra 6 de sempre)
     não é a hora ..... quando eu volto a chamar
     é não ............ o motivo, que é o que a placa de perdido exige
   ============================================================ */

import { useEffect, useState, useTransition } from "react";
import { registrarToque } from "@/app/crm/acoes";
import { destinoDoToque, hojeSP, linkWhatsapp, PADRAO_DO_DESTINO, somarDias } from "@/lib/crm/regras";
import {
  CANAIS,
  EFEITO_RESPOSTA,
  MOTIVOS_PERDA,
  NOME_CANAL,
  NOME_ESTAGIO,
  NOME_MOTIVO,
  NOME_RESPOSTA,
  RESPOSTAS,
  type Canal,
  type Direcao,
  type LeadPainel,
  type MotivoPerda,
  type Resposta,
} from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

/* Os prazos que cobrem quase todo "me chama mais pra frente". O padrão da
   geladeira (60 dias) vive em PADRAO_DO_DESTINO, junto com o do servidor:
   dois números iguais escritos em dois arquivos divergem no primeiro dia em
   que alguém mudar um só. */
const PRAZOS_GELADEIRA = [30, 60, 90] as const;

export function ModalToque({
  lead,
  direcaoInicial = "saida",
  aoFechar,
}: {
  lead: LeadPainel;
  direcaoInicial?: Direcao;
  aoFechar: () => void;
}) {
  const hoje = hojeSP();
  const [direcao, setDirecao] = useState<Direcao>(direcaoInicial);
  const [resposta, setResposta] = useState<Resposta>("interesse");
  /* O canal de partida é o canal que o lead TEM: sem número, a conversa
     real está acontecendo no direct, e nascer em "WhatsApp" é um erro de
     registro esperando um esquecimento. */
  const [canal, setCanal] = useState<Canal>(
    linkWhatsapp(lead.whatsapp) ? "whatsapp" : lead.instagram ? "instagram" : "whatsapp",
  );
  const [resumo, setResumo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  /* Um retorno marcado para hoje ainda não venceu, então "hoje" conta como
     futuro agendado e a pergunta não aparece. */
  const [passo, setPasso] = useState(lead.proximo_passo ?? "");
  const [data, setData] = useState(somarDias(hoje, 3));

  /* A geladeira tem estado próprio, e não reaproveita `passo`/`data`, por
     uma razão prática: o Rafael pode digitar o próximo passo, mudar de
     ideia sobre o teor e voltar. Reaproveitando os mesmos dois campos, a
     data de reativação chegaria preenchida com "daqui a 3 dias" e o passo
     com o texto do ramo anterior. */
  const [gelo, setGelo] = useState(() => somarDias(hoje, PADRAO_DO_DESTINO.geladeira?.dias ?? 60));
  const [passoGelo, setPassoGelo] = useState(PADRAO_DO_DESTINO.geladeira?.passo ?? "");
  const [motivo, setMotivo] = useState<MotivoPerda>("sem_interesse");

  /* O mesmo cálculo que o servidor vai refazer na gravação. É daqui que sai
     a frase de destino: a tela promete exatamente o que o servidor executa
     porque as duas leem a mesma função. */
  const teor = direcao === "entrada" ? resposta : undefined;
  const destino = destinoDoToque(direcao, lead.estagio, teor);

  const ehGeladeira = direcao === "entrada" && resposta === "depois";
  const ehPerda = direcao === "entrada" && resposta === "nao";
  /* Perdido não tem agenda e a geladeira tem a sua própria, então a
     pergunta da regra 6 só sobra para o caminho vivo. */
  const precisaDePasso =
    !ehGeladeira && !ehPerda && (!lead.proxima_acao_em || lead.proxima_acao_em < hoje);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await registrarToque(lead.id, {
        canal,
        direcao,
        resumo,
        resposta: teor,
        motivo_perda: ehPerda ? motivo : undefined,
        /* A geladeira MANDA a data em vez de deixar o padrão entrar em
           campo vazio: o lead que está na fila do dia já tem uma data
           marcada (é por isso que ele apareceu), e sem mandar a nova ele
           dormiria até hoje de novo. */
        proximo_passo: ehGeladeira ? passoGelo : precisaDePasso ? passo : undefined,
        proxima_acao_em: ehGeladeira ? gelo : precisaDePasso ? data : undefined,
      });
      if (r.ok) aoFechar();
      else if ("erro" in r) setErro(r.erro);
      else setErro("Faltou preencher: preencha e tente de novo.");
    });
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="toque-titulo">
        <p className={s.modalRot}>Registrar toque</p>
        <h2 id="toque-titulo">{lead.nome}</h2>

        <form onSubmit={enviar}>
          <fieldset className={s.grupo}>
            <legend className={s.campoRot}>O que aconteceu</legend>
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

          {/* ---------- o teor, e o que ele faz ----------
              Três botões e não um select, pela mesma regra da direção: é a
              informação que decide o destino do lead, e ela não pode estar
              enrolada dentro de uma caixa fechada. */}
          {direcao === "entrada" ? (
            <fieldset className={s.grupo}>
              <legend className={s.campoRot}>Como foi a resposta</legend>
              <div className={s.opcoes}>
                {RESPOSTAS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`${s.opcao} ${resposta === r ? s.opcaoAtiva : ""} ${
                      r === "nao" && resposta === r ? s.opcaoFim : ""
                    }`}
                    onClick={() => setResposta(r)}
                    aria-pressed={resposta === r}
                  >
                    {NOME_RESPOSTA[r]}
                  </button>
                ))}
              </div>
              <p className={s.efeito}>
                {EFEITO_RESPOSTA[resposta]}
                {destino ? (
                  <>
                    {" "}
                    <b>Vai para {NOME_ESTAGIO[destino]}.</b>
                  </>
                ) : null}
              </p>
            </fieldset>
          ) : null}

          <label className={s.campo}>
            <span className={s.campoRot}>Canal</span>
            <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
              {CANAIS.map((c) => (
                <option key={c} value={c}>
                  {NOME_CANAL[c]}
                </option>
              ))}
            </select>
          </label>

          <label className={s.campo}>
            <span className={s.campoRot}>Resumo</span>
            <input
              type="text"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder={
                ehPerda
                  ? "Disse que não tem interesse em site agora"
                  : ehGeladeira
                    ? "Pediu para chamar depois do fim do ano"
                    : "Pediu para retomar depois do dia 20"
              }
              autoFocus
            />
          </label>

          {/* ---------- o ramo da geladeira ---------- */}
          {ehGeladeira ? (
            <div className={s.blocoPergunta}>
              <p className={s.perguntaTitulo}>Quando eu volto a chamar?</p>
              <div className={s.gavetaQuando}>
                {PRAZOS_GELADEIRA.map((d) => {
                  const iso = somarDias(hoje, d);
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`${s.chip} ${s.chipMini} ${gelo === iso ? s.chipAtivo : ""}`}
                      onClick={() => setGelo(iso)}
                      aria-pressed={gelo === iso}
                    >
                      +{d}d
                    </button>
                  );
                })}
                <input
                  type="date"
                  className={s.gavetaData}
                  value={gelo}
                  min={hoje}
                  onChange={(e) => setGelo(e.target.value)}
                  aria-label={`Data de reativação de ${lead.nome}`}
                />
              </div>
              <label className={s.campo}>
                <span className={s.campoRot}>Com o quê</span>
                <input
                  type="text"
                  value={passoGelo}
                  onChange={(e) => setPassoGelo(e.target.value)}
                  placeholder="Reativar: pediu para chamar mais pra frente"
                />
              </label>
            </div>
          ) : null}

          {/* ---------- o ramo da perda ----------
              O motivo já vem em "não tem interesse", que é a resposta certa
              em nove de cada dez toques deste ramo. Quem estava em proposta
              e ouviu um não por preço troca em um clique, e é por isso que
              a pergunta existe em vez de o CRM decidir sozinho: o gráfico
              de motivos das métricas só vale se ele for verdade. */}
          {ehPerda ? (
            <div className={s.blocoPergunta}>
              <p className={s.perguntaTitulo}>Por quê?</p>
              <label className={s.campo}>
                <span className={s.campoRot}>Motivo da perda</span>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value as MotivoPerda)}
                  required
                >
                  {MOTIVOS_PERDA.map((m) => (
                    <option key={m} value={m}>
                      {NOME_MOTIVO[m]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {precisaDePasso ? (
            <div className={s.blocoPergunta}>
              <p className={s.perguntaTitulo}>E agora, qual é o próximo passo?</p>
              <label className={s.campo}>
                <span className={s.campoRot}>Próximo passo</span>
                <input
                  type="text"
                  value={passo}
                  onChange={(e) => setPasso(e.target.value)}
                  placeholder="Mandar a proposta com os dois prazos"
                />
              </label>
              <label className={s.campo}>
                <span className={s.campoRot}>Me cobre em</span>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </label>
            </div>
          ) : null}

          {erro ? (
            <p role="alert" className={s.erro}>
              {erro}
            </p>
          ) : null}

          <div className={s.modalPe}>
            <button type="button" className={s.btn} onClick={aoFechar}>
              Cancelar
            </button>
            <button type="submit" className={s.btnAcao} disabled={salvando}>
              {salvando ? "Registrando…" : "Registrar toque"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
