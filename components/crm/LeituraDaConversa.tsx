"use client";
/* ============================================================
   LEITURA DA CONVERSA (01/10/2026, etapa 2 do leitor do WhatsApp)

   O botão pede, o leitor no PC lê a conversa inteira pelo claude da
   assinatura, e o resultado aparece aqui: em que pé está, o que a pessoa
   quis dizer, a etapa e o próximo passo sugeridos, e a resposta pronta.

   O bloco busca os próprios dados (acoes-leitor.ts) em vez de vir pela
   ficha: as duas páginas que montam a <Ficha /> não precisam saber dele.
   Enquanto a leitura está na fila ou rodando, ele pergunta de 4 em 4
   segundos; parado, de 20 em 20, para a leitura automática (a que o leitor
   pede quando o lead responde) aparecer sem F5.

   A etapa é só SUGERIDA: o botão Aplicar é que move o card, pelo mesmo
   moverLead do quadro (decisão de 01/10).
   ============================================================ */
import { useCallback, useEffect, useState } from "react";
import { aplicarAnalise, lerAnalise, pedirAnalise } from "@/app/(pt)/crm/acoes-leitor";
import { registrarToque } from "@/app/(pt)/crm/acoes";
import type { Analise } from "@/lib/crm/analise";
import { linkWhatsapp } from "@/lib/crm/regras";
import { NOME_ESTAGIO, type LeadPainel } from "@/lib/crm/tipos";
import s from "@/app/(pt)/crm/crm.module.css";

function haQuanto(iso: string | null): string {
  if (!iso) return "";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export function LeituraDaConversa({ lead }: { lead: LeadPainel }) {
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [leitorVivo, setLeitorVivo] = useState(true);
  const [carregou, setCarregou] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const atualizar = useCallback(async () => {
    try {
      const r = await lerAnalise(lead.id);
      setAnalise(r.analise);
      setLeitorVivo(r.leitorVivo);
    } catch {
      /* Sem a tabela (SQL ainda não rodado) ou sem rede: o bloco fica com
         o botão e mais nada, em vez de quebrar a ficha inteira. */
    } finally {
      setCarregou(true);
    }
  }, [lead.id]);

  const esperando = analise?.status === "na_fila" || analise?.status === "rodando";

  useEffect(() => {
    void atualizar();
    const t = setInterval(() => void atualizar(), esperando ? 4000 : 20_000);
    return () => clearInterval(t);
  }, [atualizar, esperando]);

  const pedir = async () => {
    setErro(null);
    const r = await pedirAnalise(lead.id);
    if (!r.ok) setErro(r.erro ?? "Não consegui pedir a leitura.");
    await atualizar();
  };

  const aplicar = async () => {
    if (!analise) return;
    setAplicando(true);
    setErro(null);
    const r = await aplicarAnalise(analise.id);
    if (!r.ok) setErro(r.erro ?? "Não consegui aplicar.");
    await atualizar();
    setAplicando(false);
  };

  const leitura = analise?.status === "pronta" ? analise.resultado : null;
  const zap = leitura?.resposta ? linkWhatsapp(lead.whatsapp, leitura.resposta) : null;

  const copiar = async () => {
    if (!leitura?.resposta) return;
    try {
      await navigator.clipboard.writeText(leitura.resposta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  const mudaEtapa = leitura?.etapa_sugerida && leitura.etapa_sugerida !== lead.estagio;

  return (
    <section className={s.bloco}>
      <div className={s.blocoCab}>
        <h2>Leitura da conversa</h2>
        {analise?.pronta_em ? (
          <span className={s.blocoNota}>
            {analise.origem === "resposta" ? "lida sozinha quando respondeu, " : ""}
            {haQuanto(analise.pronta_em)}
          </span>
        ) : null}
      </div>

      {!leitura && !esperando ? (
        <p className={s.blocoNota}>
          O leitor do PC lê a conversa inteira com {lead.nome} e diz em que pé ela está, a etapa
          certa do card e a próxima mensagem. Ele também lê sozinho sempre que a pessoa responde.
        </p>
      ) : null}

      {carregou && !leitorVivo ? (
        <p className={s.nota}>
          O leitor do WhatsApp está desligado no PC: a leitura espera até ele ligar.{" "}
          <a href="rr-whatsapp://ligar" className={s.btnMini}>
            Ligar o leitor
          </a>
        </p>
      ) : null}

      <div className={s.dossiePe}>
        <button type="button" className={s.btn} onClick={pedir} disabled={esperando}>
          {esperando ? (analise?.status === "rodando" ? "Lendo a conversa…" : "Na fila…") : leitura ? "Ler de novo" : "Analisar conversa"}
        </button>
      </div>

      {esperando ? (
        <span className={s.carregandoRegua} aria-hidden="true">
          <i className={s.carregandoCorre} />
        </span>
      ) : null}

      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}

      {analise?.status === "erro" ? (
        <p role="alert" className={s.erro}>
          A leitura falhou: {analise.erro}
        </p>
      ) : null}

      {leitura ? (
        <>
          <p>
            <strong>{leitura.situacao}</strong>
          </p>
          <p className={s.blocoNota}>{leitura.leitura}</p>
          {leitura.alerta ? (
            <p className={s.nota}>
              <strong>Atenção:</strong> {leitura.alerta}
            </p>
          ) : null}

          <div className={s.campo}>
            <span className={s.campoRot}>A sugestão</span>
            <p>
              {mudaEtapa ? (
                <>
                  Mover de <strong>{NOME_ESTAGIO[lead.estagio]}</strong> para{" "}
                  <strong>{NOME_ESTAGIO[leitura.etapa_sugerida!]}</strong>: {leitura.porque_etapa}
                  <br />
                </>
              ) : (
                <>
                  Fica em <strong>{NOME_ESTAGIO[lead.estagio]}</strong>.{" "}
                </>
              )}
              Próximo passo: {leitura.proximo_passo}
              {leitura.retorno_em_dias === 0 ? ", hoje" : `, em ${leitura.retorno_em_dias} ${leitura.retorno_em_dias === 1 ? "dia" : "dias"}`}.
            </p>
            {analise?.aplicada_em ? (
              <p className={s.nota}>Aplicado {haQuanto(analise.aplicada_em)}.</p>
            ) : (
              <div className={s.dossiePe}>
                <button type="button" className={s.btnMini} onClick={aplicar} disabled={aplicando}>
                  {aplicando ? "Aplicando…" : mudaEtapa ? "Aplicar: mover e marcar o passo" : "Aplicar: marcar o passo"}
                </button>
              </div>
            )}
          </div>

          {leitura.resposta ? (
            <>
              <span className={s.campoRot}>A resposta</span>
              <p className={s.previa}>{leitura.resposta}</p>
              <div className={s.dossiePe}>
                <button type="button" className={s.btnMini} onClick={copiar}>
                  {copiado ? "Copiado" : "Copiar"}
                </button>
                {zap ? (
                  <a
                    className={s.btnMini}
                    href={zap}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      void registrarToque(lead.id, {
                        canal: "whatsapp",
                        direcao: "saida",
                        resumo: "Resposta da leitura da conversa",
                      })
                    }
                  >
                    Abrir no WhatsApp
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <p className={s.nota}>Sem resposta sugerida: a leitura acha que agora é hora de esperar.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
