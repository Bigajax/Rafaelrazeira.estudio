"use client";

/* ============================================================
   MANDAR A MENSAGEM

   Escolher o template, ver o texto com os dados deste lead já dentro, e
   sair para o WhatsApp. Três passos numa tela só, e a tela some depois.

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
import { lacunas, linkWhatsapp, renderTemplate } from "@/lib/crm/regras";
import { NOME_CATEGORIA, type LeadPainel, type Template } from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

export function ModalMensagem({
  lead,
  templates,
  aoFechar,
}: {
  lead: LeadPainel;
  templates: Template[];
  aoFechar: () => void;
}) {
  const [escolhido, setEscolhido] = useState(templates[0]?.id ?? "");
  const [copiado, setCopiado] = useState(false);

  const template = templates.find((t) => t.id === escolhido) ?? null;
  const texto = template ? renderTemplate(template.conteudo, lead) : "";
  const faltando = template ? lacunas(template.conteudo, lead) : [];
  const link = linkWhatsapp(lead.whatsapp, texto);

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
  const registrar = () => {
    void registrarToque(lead.id, {
      canal: "whatsapp",
      direcao: "saida",
      resumo: template?.titulo ?? "Mensagem no WhatsApp",
    });
    aoFechar();
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="msg-titulo">
        <p className={s.modalRot}>Mandar mensagem</p>
        <h2 id="msg-titulo">{lead.nome}</h2>

        {templates.length === 0 ? (
          <p>
            Você ainda não tem template nenhum. Crie o primeiro em Templates e ele aparece aqui.
          </p>
        ) : (
          <>
            <label className={s.campo}>
              <span className={s.campoRot}>Template</span>
              <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)}>
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

        {!link ? (
          <p className={s.erro}>
            {lead.whatsapp
              ? "O WhatsApp cadastrado não tem número suficiente."
              : "Este lead não tem WhatsApp cadastrado."}
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
              onClick={registrar}
            >
              Abrir no WhatsApp
            </a>
          ) : null}
        </div>

        {/* Dito antes de acontecer, e não depois: o botão faz duas coisas, e
            uma delas grava no histórico. Descobrir isso pela timeline seria
            o CRM agindo pelas costas de quem o usa. */}
        <p className={s.nota}>Abrir no WhatsApp registra o toque na linha do tempo</p>
      </div>
    </div>
  );
}
