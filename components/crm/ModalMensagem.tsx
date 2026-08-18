"use client";

/* ============================================================
   MANDAR A MENSAGEM

   Escolher o template, ver o texto com os dados deste lead já dentro, e
   sair para a conversa. Três passos numa tela só, e a tela some depois.
   A saída é o WhatsApp quando há número; sem número, o direct do
   Instagram assume (com o texto copiado no clique, porque o Instagram
   não aceita mensagem pré-escrita na URL).

   ---------- por que o botão do WhatsApp é um <a> e não um <button> ----------
   Abrir o WhatsApp precisa ser o efeito DIRETO de um clique. Se a saída
   acontecesse depois de um `await` (registrar a interação e só então
   `window.open`), o navegador já teria perdido o vínculo com o gesto e o
   bloqueador de pop-up engoliria a janela em silêncio. Com um link de
   verdade, a navegação é do navegador e nada pode barrá-la; a interação é
   registrada em paralelo, no mesmo clique.

   E se o registro falhar, a conversa acontece do mesmo jeito: a mensagem é
   o que importa, o registro é a contabilidade. Nessa ordem.

   ---------- as lacunas ----------
   Um template que usa {empresa} num lead sem empresa vira "a [empresa] de
   vocês". A prévia mostra o colchete, e um aviso diz quais faltam. Nunca
   substituir por vazio: "Oi, !" já foi mandado por CRM demais.
   ============================================================ */

import { useEffect, useState } from "react";
import { registrarToque } from "@/app/crm/acoes";
import { lacunas, linkDirectInstagram, linkWhatsapp, renderTemplate } from "@/lib/crm/regras";
import { NOME_CANAL, NOME_CATEGORIA, type Canal, type LeadPainel, type Template } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

/* A mensagem da pesquisa entra no seletor como se fosse um template, com
   este id reservado. Ela já vem escrita para ESTE lead, então não passa
   pelo render de variáveis nem pela checagem de lacunas. */
const ID_PESQUISA = "__pesquisa";

export function ModalMensagem({
  lead,
  templates,
  aoFechar,
}: {
  lead: LeadPainel;
  templates: Template[];
  aoFechar: () => void;
}) {
  const daPesquisa = lead.dossie?.status === "ok" ? (lead.dossie.mensagem ?? null) : null;

  /* Quando a pesquisa escreveu uma mensagem, ela é a primeira opção E a
     escolhida de partida: é a única do seletor feita sob medida para este
     lead, e o template genérico vira o plano B. */
  const [escolhido, setEscolhido] = useState(daPesquisa ? ID_PESQUISA : (templates[0]?.id ?? ""));
  const [copiado, setCopiado] = useState(false);

  const template = escolhido === ID_PESQUISA ? null : (templates.find((t) => t.id === escolhido) ?? null);
  const texto =
    escolhido === ID_PESQUISA && daPesquisa
      ? daPesquisa
      : template
        ? renderTemplate(template.conteudo, lead)
        : "";
  const faltando = template ? lacunas(template.conteudo, lead) : [];
  const link = linkWhatsapp(lead.whatsapp, texto);

  /* O plano B quando o número não dá link: o direct. Só entra em campo sem
     WhatsApp, porque duas saídas para a mesma mensagem seriam duas
     primeiras ações. Foi o caso real do nove3: sem número, o modal não
     tinha saída nenhuma, a mensagem foi no braço pelo Instagram e o toque
     ficou sem registro, com o card parado na Lista. */
  const linkInsta = !link ? linkDirectInstagram(lead.instagram) : null;

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Sem permissão de área de transferência (acontece em navegador
         embutido): selecionar o texto é a saída manual, e ela funciona
         sempre. */
      setCopiado(false);
    }
  };

  /* Registra e fecha. Não espera a resposta para fechar: o link já levou a
     pessoa para o WhatsApp, e segurar o modal aberto atrás de uma requisição
     que ela não vai ver é atrito puro. */
  const registrar = (canal: Canal) => {
    void registrarToque(lead.id, {
      canal,
      direcao: "saida",
      resumo:
        escolhido === ID_PESQUISA
          ? "Mensagem da pesquisa"
          : (template?.titulo ?? `Mensagem no ${NOME_CANAL[canal]}`),
    });
    aoFechar();
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="msg-titulo">
        <p className={s.modalRot}>Mandar mensagem</p>
        <h2 id="msg-titulo">{lead.nome}</h2>

        {templates.length === 0 && !daPesquisa ? (
          <p>
            Você ainda não tem template nenhum. Crie o primeiro em Templates e ele aparece aqui.
          </p>
        ) : (
          <>
            <label className={s.campo}>
              <span className={s.campoRot}>Template</span>
              <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
                {daPesquisa ? (
                  <option value={ID_PESQUISA}>Mensagem da pesquisa · feita para este lead</option>
                ) : null}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                    {t.categoria ? ` · ${NOME_CATEGORIA[t.categoria]}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <p className={s.previa}>{texto}</p>

            {faltando.length ? (
              <p className={s.erro}>
                Sem {faltando.join(", ")} no cadastro: o texto vai sair com o colchete.
              </p>
            ) : null}
          </>
        )}

        {!link && linkInsta ? (
          <p className={s.nota}>
            Sem WhatsApp no cadastro: a saída deste lead é o direct. O texto vai copiado no clique,
            é só colar na conversa.
          </p>
        ) : null}
        {!link && !linkInsta ? (
          <p className={s.erro}>
            {lead.whatsapp
              ? "O WhatsApp cadastrado não tem número suficiente."
              : "Este lead não tem WhatsApp nem Instagram no cadastro. Preencha um dos dois em Ver todos os dados."}
          </p>
        ) : null}

        <div className={s.modalPe}>
          <button type="button" className={s.btn} onClick={aoFechar}>
            Fechar
          </button>
          <button type="button" className={s.btn} onClick={copiar} disabled={!texto}>
            {copiado ? "Copiado" : "Copiar texto"}
          </button>
          {link ? (
            <a
              className={s.btnAcao}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registrar("whatsapp")}
            >
              Abrir no WhatsApp
            </a>
          ) : null}
          {linkInsta ? (
            /* O texto não cabe na URL (o Instagram não aceita mensagem
               pré-escrita), então o MESMO clique copia antes de sair. E
               continua sendo um <a> pelo mesmo motivo do WhatsApp: a
               navegação precisa ser o efeito direto do gesto, ou o
               bloqueador de pop-up engole a janela. */
            <a
              className={s.btnAcao}
              href={linkInsta}
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

        {/* Dito antes de acontecer, e não depois: o botão faz duas coisas, e
            uma delas grava no histórico. Descobrir isso pela timeline seria
            o CRM agindo pelas costas de quem o usa. */}
        {link || linkInsta ? (
          <p className={s.nota}>
            {link ? "Abrir no WhatsApp" : "Copiar e abrir no direct"} registra o toque na linha do
            tempo
          </p>
        ) : null}
      </div>
    </div>
  );
}
