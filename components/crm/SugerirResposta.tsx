"use client";

/* ============================================================
   RESPONDER COM IA — a fase 2 do método, na ficha

   O cliente respondeu. O Rafael cola a resposta aqui, a IA lê o dossiê e
   a linha do tempo, e devolve a próxima mensagem no tom da casa: responde
   ao que a pessoa disse e avança um degrau só do funil. A saída segue o
   canal da CONVERSA (o do último toque de entrada; sem número, o direct),
   e o prompt do motor recebe esse canal para a mensagem não prometer o
   canal errado.

   A sugestão NÃO vai para o banco: ela vale para aquele momento da
   conversa. O que fica registrado é o toque de saída, quando o botão de
   sair for apertado, pela mesma regra do modal de mensagem: o CRM
   avisa antes do efeito colateral, nunca age pelas costas.

   O campo nasce pré-preenchido com o resumo do último toque de entrada,
   quando existe: é o palpite mais provável do que a pessoa disse, e
   colar por cima é mais rápido que começar do zero.
   ============================================================ */

import { useState } from "react";
import { registrarToque } from "@/app/crm/acoes";
import { aplicarSaudacao, linkDirectInstagram, linkWhatsapp } from "@/lib/crm/regras";
import type { Canal, Interacao, LeadPainel } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

export function SugerirResposta({
  lead,
  interacoes,
}: {
  lead: LeadPainel;
  interacoes: Interacao[];
}) {
  const ultimaEntrada = [...interacoes].reverse().find((i) => i.direcao === "entrada");

  const [resposta, setResposta] = useState(ultimaEntrada?.resumo ?? "");
  const [sugestao, setSugestao] = useState<string | null>(null);
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  /* A resposta sai pelo canal da CONVERSA, não pelo canal padrão: o último
     toque de entrada diz por onde o cliente falou, e sem entrada registrada
     o canal que o lead tem decide. Mesma regra do ModalMensagem: sem número,
     a saída é o direct e o toque registra no canal certo, senão o card de
     quem conversa pelo Instagram não anda no trilho. */
  const canalConversa: Canal =
    ultimaEntrada?.canal ??
    (linkWhatsapp(lead.whatsapp) ? "whatsapp" : lead.instagram ? "instagram" : "whatsapp");
  const link =
    sugestao && canalConversa === "whatsapp" ? linkWhatsapp(lead.whatsapp, sugestao) : null;
  const direct = sugestao && !link ? linkDirectInstagram(lead.instagram) : null;

  const sugerir = async () => {
    setErro(null);
    setSugestao(null);
    setPensando(true);
    try {
      const r = await fetch("/api/crm/resposta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, resposta }),
      });
      const corpo = (await r.json().catch(() => null)) as {
        mensagem?: string;
        erro?: string;
      } | null;
      if (!r.ok || !corpo?.mensagem) {
        setErro(corpo?.erro ?? "A sugestão falhou. Tente de novo.");
      } else {
        /* A saudação vem como variável do motor e vira palavra aqui, na
           hora certa: entre sugerir e mandar passam minutos, mas o modelo
           não tem relógio e "boa tarde" às nove da manhã queima a
           conversa na primeira linha. */
        setSugestao(aplicarSaudacao(corpo.mensagem));
      }
    } catch {
      setErro("A sugestão não respondeu. Confira a conexão e tente de novo.");
    } finally {
      setPensando(false);
    }
  };

  const copiar = async () => {
    if (!sugestao) return;
    try {
      await navigator.clipboard.writeText(sugestao);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  };

  /* Mesma coreografia do modal de mensagem: o link já levou a pessoa para
     o WhatsApp, o registro acontece em paralelo no mesmo clique.

     E o registro é DUPLO quando precisa: a resposta colada é a prova de
     que o cliente FALOU, e sem registrá-la o trilho do funil leria a
     saída como "mandou de novo sem resposta" e empurraria o card para
     Follow-up, quando o certo é Conversa. A entrada entra primeiro (é a
     ordem em que a vida aconteceu), pulada quando o texto colado é o
     mesmo do último toque de entrada, que é o caso de quem já registrou
     o "me responderam" pelo botão de toque. */
  const registrar = (canal: Canal) => {
    void (async () => {
      const colada = resposta.trim();
      if (colada && colada !== (ultimaEntrada?.resumo ?? "").trim()) {
        await registrarToque(lead.id, {
          canal,
          direcao: "entrada",
          resumo: colada.slice(0, 500),
        });
      }
      await registrarToque(lead.id, {
        canal,
        direcao: "saida",
        resumo: "Resposta sugerida pela IA",
      });
    })();
  };

  return (
    <section className={s.bloco}>
      <div className={s.blocoCab}>
        <h2>Responder com IA</h2>
      </div>

      <p className={s.blocoNota}>
        Cole o que {lead.nome} respondeu e a IA sugere a próxima mensagem, usando o dossiê e a
        linha do tempo desta ficha.
      </p>

      <label className={s.campo}>
        <span className={s.campoRot}>O que responderam</span>
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={3}
          placeholder="Cola aqui a resposta do cliente"
        />
      </label>

      <button
        type="button"
        className={s.btn}
        onClick={sugerir}
        disabled={pensando || !resposta.trim()}
      >
        {pensando ? "Pensando…" : "Sugerir resposta"}
      </button>

      {pensando ? (
        <span className={s.carregandoRegua} aria-hidden="true">
          <i className={s.carregandoCorre} />
        </span>
      ) : null}

      {erro ? (
        <p role="alert" className={s.erro}>
          {erro}
        </p>
      ) : null}

      {sugestao ? (
        <>
          <p className={s.previa}>{sugestao}</p>
          <div className={s.dossiePe}>
            <button type="button" className={s.btnMini} onClick={copiar}>
              {copiado ? "Copiado" : "Copiar"}
            </button>
            {link ? (
              <a
                className={s.btnMini}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => registrar("whatsapp")}
              >
                Abrir no WhatsApp
              </a>
            ) : null}
            {direct ? (
              /* Mesma mecânica do ModalMensagem: o Instagram não aceita
                 texto na URL, então o clique copia antes de sair, e o <a>
                 mantém a navegação como efeito direto do gesto. */
              <a
                className={s.btnMini}
                href={direct}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  void navigator.clipboard.writeText(sugestao).catch(() => {});
                  registrar("instagram");
                }}
              >
                Copiar e abrir no direct
              </a>
            ) : null}
          </div>
          {link || direct ? (
            <p className={s.nota}>
              {link ? "Abrir no WhatsApp" : "Copiar e abrir no direct"} registra o toque na linha
              do tempo
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
