"use client";

/* ============================================================
   A PESQUISA NA FICHA — o dossiê que a IA montou sobre este lead

   Quatro estados, um bloco:

     sem dossiê ..... um botão "Pesquisar com IA" e uma frase dizendo o
                      que ele faz. Nenhuma pesquisa roda sem pedir.
     pesquisando .... a régua da casa correndo. A rota está trabalhando em
                      outro processo, então a ficha se atualiza sozinha a
                      cada poucos segundos até o dossiê chegar.
     ok ............. o dossiê inteiro: resumo, achados, dor, gancho,
                      mensagem pronta e fontes. O gancho leva o filete
                      esmeralda da casa ("o CRM está te sugerindo") e a
                      mensagem aparece também no modal Mandar mensagem.
     erro ........... a frase do que houve e o botão de refazer.

   A pesquisa dispara sozinha quando o lead é criado pelo modal (ver
   ModalNovoLead), então na prática este bloco costuma nascer no estado
   "pesquisando". O botão existe para os leads antigos e para refazer.
   ============================================================ */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarLead } from "@/app/crm/acoes";
import { dinheiro } from "@/lib/crm/regras";
import type { LeadPainel } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

/* O custo vem em dólar do OpenRouter; centavos de dólar com quatro casas
   seriam ruído, duas bastam para acompanhar o gasto. */
const custoCurto = (usd: number) => `US$ ${usd.toFixed(2)}`;

/* Os campos que a pesquisa pode preencher, com o nome que a ficha usa. */
const NOME_CAMPO: Record<string, string> = {
  empresa: "empresa",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "e-mail",
  nicho: "nicho",
  cidade: "cidade",
};

export function Pesquisa({
  lead,
  aoMandarMensagem,
}: {
  lead: LeadPainel;
  /* Abre o mesmo modal do cabeçalho da ficha. O botão repete aqui porque
     quem acabou de LER a mensagem pronta está no meio da página, e mandar
     é o passo seguinte natural: subir a tela para achar o botão é atrito
     entre a decisão e o gesto. */
  aoMandarMensagem?: () => void;
}) {
  const router = useRouter();
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [disparando, setDisparando] = useState(false);
  const [salvandoTicket, comecarTicket] = useTransition();

  const dossie = lead.dossie;
  const pesquisando = disparando || dossie?.status === "pesquisando";

  /* O botão do ticket só existe enquanto há o que aplicar: sugestão sem
     valor não aplica, e valor já aplicado não precisa de botão. */
  const ticketAplicavel = Boolean(
    dossie?.status === "ok" &&
      dossie.ticket_sugerido &&
      dossie.ticket_sugerido !== lead.ticket_estimado,
  );

  const usarTicket = () => {
    if (!dossie?.ticket_sugerido) return;
    comecarTicket(async () => {
      const r = await salvarLead(lead.id, { ticket_estimado: dossie.ticket_sugerido ?? null });
      if (!r.ok) setErroLocal("erro" in r ? r.erro : "Não foi possível salvar o ticket.");
      router.refresh();
    });
  };

  /* Enquanto a rota trabalha, a ficha se refresca a cada 5 segundos: o
     dossiê chega por dados de servidor, e sem isso o Rafael teria que dar
     F5 para ver o resultado. O intervalo morre junto com o estado. */
  useEffect(() => {
    if (dossie?.status !== "pesquisando") return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [dossie?.status, router]);

  const pesquisar = async () => {
    setErroLocal(null);
    setDisparando(true);
    try {
      const r = await fetch("/api/crm/pesquisa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      if (!r.ok) {
        const corpo = (await r.json().catch(() => null)) as { erro?: string } | null;
        setErroLocal(corpo?.erro ?? "A pesquisa falhou.");
      }
    } catch {
      setErroLocal("A pesquisa não respondeu. Confira a conexão e tente de novo.");
    } finally {
      setDisparando(false);
      router.refresh();
    }
  };

  return (
    <section className={s.bloco}>
      <div className={s.blocoCab}>
        <h2>Pesquisa</h2>
        {dossie?.status === "ok" && dossie.gerado_em ? (
          <span className={s.blocoNota}>
            feita em {new Date(dossie.gerado_em).toLocaleDateString("pt-BR")}
            {typeof dossie.custo_usd === "number" ? ` · ${custoCurto(dossie.custo_usd)}` : ""}
          </span>
        ) : null}
      </div>

      {/* ---------- pesquisando ---------- */}
      {pesquisando ? (
        <>
          <span className={s.carregandoRegua} aria-hidden="true">
            <i className={s.carregandoCorre} />
          </span>
          <p className={s.blocoNota} role="status">
            Pesquisando o negócio na web. Leva um ou dois minutos; pode sair da ficha, o resultado
            fica gravado.
          </p>
        </>
      ) : null}

      {/* ---------- sem dossiê ainda ---------- */}
      {!pesquisando && !dossie ? (
        <>
          <p className={s.blocoNota}>
            A IA pesquisa este negócio na web (Google, Maps, Instagram), resume o que achou e deixa
            a primeira mensagem pronta no seu tom.
          </p>
          <button type="button" className={s.btn} onClick={pesquisar}>
            Pesquisar com IA
          </button>
        </>
      ) : null}

      {/* ---------- deu errado ---------- */}
      {!pesquisando && dossie?.status === "erro" ? (
        <>
          <p className={s.erro}>{dossie.erro ?? "A pesquisa falhou."}</p>
          <button type="button" className={s.btn} onClick={pesquisar}>
            Tentar de novo
          </button>
        </>
      ) : null}

      {/* ---------- o dossiê ---------- */}
      {!pesquisando && dossie?.status === "ok" ? (
        <div className={s.dossie}>
          {/* O veredito abre o dossiê: é a primeira decisão que a pesquisa
              entrega ("vale meu tempo?"), então ele fala antes de tudo.
              Quente em verde, frio na voz fraca, morno na voz normal. */}
          {dossie.veredito ? (
            <p
              className={`${s.dossieVeredito} ${
                dossie.veredito === "quente"
                  ? s.dossieQuente
                  : dossie.veredito === "frio"
                    ? s.dossieFrio
                    : ""
              }`}
            >
              <b>
                {dossie.veredito === "quente"
                  ? "Lead quente"
                  : dossie.veredito === "frio"
                    ? "Lead frio"
                    : "Lead morno"}
              </b>
              {dossie.veredito_motivo ? ` ${dossie.veredito_motivo}` : ""}
            </p>
          ) : null}

          {/* Dito na cara, não descoberto na gaveta: a pesquisa mexeu no
              cadastro e a ficha avisa onde. Só campos que estavam VAZIOS
              recebem, então nada do que foi digitado se perde. */}
          {dossie.cadastro_aplicado?.length ? (
            <p className={s.blocoNota}>
              A pesquisa preencheu no cadastro:{" "}
              {dossie.cadastro_aplicado.map((c) => NOME_CAMPO[c] ?? c).join(", ")}
            </p>
          ) : null}

          {dossie.resumo ? <p className={s.dossieResumo}>{dossie.resumo}</p> : null}

          {dossie.presenca?.length ? (
            <ul className={s.dossieLista}>
              {dossie.presenca.map((achado, i) => (
                <li key={i}>{achado}</li>
              ))}
            </ul>
          ) : null}

          {dossie.dor ? (
            <p className={s.dossieResumo}>
              <b className={s.dossieRot}>A dor</b> {dossie.dor}
            </p>
          ) : null}

          {dossie.gancho ? (
            <p className={s.dossieGancho}>
              <b className={s.dossieRot}>O gancho</b> {dossie.gancho}
            </p>
          ) : null}

          {dossie.mensagem ? (
            <>
              <p className={s.previa}>{dossie.mensagem}</p>
              {/* `.btn` de papel, não o `.btnAcao` rosa: o rosa desta ficha
                  já mora no cabeçalho, no mesmo botão, e dois rosas para o
                  mesmo gesto seriam duas primeiras ações. Mandada a
                  mensagem, o lead anda sozinho no quadro (o trilho do
                  registrarToque). */}
              {aoMandarMensagem ? (
                <button type="button" className={s.btn} onClick={aoMandarMensagem}>
                  Mandar mensagem
                </button>
              ) : null}
              <p className={s.blocoNota}>
                {aoMandarMensagem
                  ? "Sai pronta no modal, e o lead anda no quadro quando o toque é registrado"
                  : "Esta mensagem aparece pronta no Mandar mensagem"}
                {dossie.exemplo ? (
                  <>
                    {" · exemplo escolhido: "}
                    <a
                      className={s.dossieExemplo}
                      href={dossie.exemplo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {dossie.exemplo.nome}
                    </a>
                  </>
                ) : null}
              </p>
            </>
          ) : null}

          {/* Dossiê sem mensagem tem dois motivos legítimos, e cada um com
              a sua frase: lead FRIO não recebe pitch de propósito (o
              veredito lá em cima já disse o porquê), e pesquisa
              inconclusiva pede o arroba para refazer. */}
          {!dossie.mensagem && dossie.veredito === "frio" ? (
            <p className={s.blocoNota}>
              Sem mensagem de propósito: este negócio já está bem servido, e pitch forçado queima a
              prospecção. Vale marcar como perdido com motivo "fora do perfil", ou guardar para
              outro serviço no futuro.
            </p>
          ) : null}
          {!dossie.mensagem && dossie.veredito !== "frio" ? (
            <p className={s.blocoNota}>
              A pesquisa não confirmou presença suficiente deste negócio para escrever uma mensagem
              com base. Complete o Instagram no cadastro (Ver todos os dados) e refaça a pesquisa.
            </p>
          ) : null}

          {dossie.ticket_sugerido ? (
            <p className={s.blocoNota}>
              Ticket sugerido pela pesquisa: <b>{dinheiro(dossie.ticket_sugerido)}</b>
              {ticketAplicavel ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className={s.btnMini}
                    onClick={usarTicket}
                    disabled={salvandoTicket}
                  >
                    {salvandoTicket ? "Salvando…" : "Usar como ticket"}
                  </button>
                </>
              ) : (
                " · já é o ticket do lead"
              )}
            </p>
          ) : null}

          {dossie.fontes?.length ? (
            <div className={s.dossieFontes}>
              {dossie.fontes.map((f) => (
                <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer">
                  {f.titulo}
                </a>
              ))}
            </div>
          ) : null}

          <div className={s.dossiePe}>
            <button type="button" className={s.btnMini} onClick={pesquisar}>
              Refazer pesquisa
            </button>
          </div>
        </div>
      ) : null}

      {erroLocal ? (
        <p role="alert" className={s.erro}>
          {erroLocal}
        </p>
      ) : null}
    </section>
  );
}
