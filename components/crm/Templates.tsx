"use client";

/* ============================================================
   TEMPLATES

   O que esta tela é: o lugar de escrever e corrigir as mensagens. O lugar
   de USAR está no modal do WhatsApp, na fila do dia e na ficha do lead.
   Separar as duas coisas é o que permite escrever com calma um texto que
   vai ser disparado às pressas.

   ---------- as quatro variáveis, e o colchete ----------
   {nome}, {empresa}, {nicho} e {cidade}. Quando o lead não tem o dado, o
   texto sai com o colchete visível ("a [empresa] de vocês") em vez de sair
   com um buraco. Essa escolha é do render (lib/crm/regras.ts) e ela é
   deliberada: um colchete no meio da frase é impossível de não ver na
   prévia, e um espaço vazio é impossível de ver.
   ============================================================ */

import { useState, useTransition } from "react";
import { apagarTemplate, salvarTemplate } from "@/app/crm/acoes";
import { renderTemplate } from "@/lib/crm/regras";
import {
  CATEGORIAS_TEMPLATE,
  NOME_CATEGORIA,
  type CategoriaTemplate,
  type Template,
} from "@/lib/crm/tipos";
import s from "@/app/crm/crm.module.css";

/* Um lead de mentira para a prévia. Os valores são reais o bastante para o
   texto ler como texto: "Oi, {nome}" com um nome de exemplo mostra o ritmo
   da frase, e é o ritmo que decide se uma abertura fria funciona. */
const EXEMPLO = {
  nome: "Marina Alves",
  empresa: "Joalheria Alves",
  nicho: "joalheria",
  cidade: "Maringá",
};

const VARIAVEIS = ["{nome}", "{empresa}", "{nicho}", "{cidade}"];

export function Templates({ templates }: { templates: Template[] }) {
  const [editando, setEditando] = useState<Template | "novo" | null>(null);

  return (
    <div className={s.wrap}>
      <div className={s.tituloLinha}>
        <h1>
          Templates<i className={s.ponto}>.</i>
        </h1>
        <button type="button" className={s.btn} onClick={() => setEditando("novo")}>
          Escrever template
        </button>
      </div>

      <p className={s.subtitulo}>
        As mensagens que você dispara todo dia. Use {VARIAVEIS.join(", ")} para o CRM preencher com
        os dados do lead na hora de mandar.
      </p>

      {templates.length === 0 ? (
        <div className={s.vazio}>
          <b>Nenhum template ainda.</b>
          <p>
            Comece pela abertura fria: é a mensagem que você mais repete e a que mais vale a pena
            afinar.
          </p>
          <button type="button" className={s.btn} onClick={() => setEditando("novo")}>
            Escrever o primeiro
          </button>
        </div>
      ) : (
        <div className={s.templates}>
          {templates.map((t) => (
            <Cartao key={t.id} template={t} aoEditar={() => setEditando(t)} />
          ))}
        </div>
      )}

      {editando ? (
        <ModalTemplate
          template={editando === "novo" ? null : editando}
          proximaOrdem={templates.length + 1}
          aoFechar={() => setEditando(null)}
        />
      ) : null}
    </div>
  );
}

function Cartao({ template, aoEditar }: { template: Template; aoEditar: () => void }) {
  const [confirmando, setConfirmando] = useState(false);
  const [apagando, comecar] = useTransition();

  const usadas = VARIAVEIS.filter((v) => template.conteudo.includes(v));

  return (
    <article className={s.template}>
      <header className={s.templateCab}>
        <h2>{template.titulo}</h2>
        {template.categoria ? (
          <span className={s.categoria}>{NOME_CATEGORIA[template.categoria]}</span>
        ) : null}
      </header>

      {/* O texto mostrado é o RENDERIZADO com o lead de exemplo, e não o
          texto cru com as chaves. Escrever a mensagem é escrever a frase
          que a pessoa vai ler, e ler "{nome}" no meio dela atrapalha a
          única coisa que importa aqui, que é o tom. */}
      <p className={s.templateTexto}>{renderTemplate(template.conteudo, EXEMPLO)}</p>

      {usadas.length ? (
        <div className={s.variaveis}>
          {usadas.map((v) => (
            <code key={v}>{v}</code>
          ))}
        </div>
      ) : null}

      <div className={s.templatePe}>
        <button type="button" className={s.btnMini} onClick={aoEditar}>
          Editar
        </button>

        {/* Apagar em dois toques, e o segundo diz o que vai acontecer. Um
            "Apagar" de um clique só numa grade de cartões é o botão que se
            aperta sem querer com o polegar. */}
        {confirmando ? (
          <>
            <button
              type="button"
              className={s.btnMini}
              disabled={apagando}
              onClick={() => comecar(() => void apagarTemplate(template.id))}
            >
              {apagando ? "Apagando…" : "Apagar mesmo"}
            </button>
            <button type="button" className={s.btnMini} onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <button type="button" className={s.btnMini} onClick={() => setConfirmando(true)}>
            Apagar
          </button>
        )}
      </div>
    </article>
  );
}

function ModalTemplate({
  template,
  proximaOrdem,
  aoFechar,
}: {
  template: Template | null;
  proximaOrdem: number;
  aoFechar: () => void;
}) {
  const [titulo, setTitulo] = useState(template?.titulo ?? "");
  const [categoria, setCategoria] = useState<CategoriaTemplate | "">(template?.categoria ?? "");
  const [conteudo, setConteudo] = useState(template?.conteudo ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    comecar(async () => {
      const r = await salvarTemplate(template?.id ?? null, {
        titulo,
        categoria: categoria || null,
        conteudo,
        ordem: template?.ordem ?? proximaOrdem,
      });
      if (r.ok) aoFechar();
      else setErro("erro" in r ? r.erro : "Não foi possível salvar.");
    });
  };

  /* Inserir a variável no fim do texto, e não na posição do cursor. A
     versão com cursor exige uma referência ao textarea e um cálculo de
     seleção que quebra assim que alguém desfaz uma edição; o fim do texto
     acerta o caso comum (escrever de cima para baixo) sem nada disso. */
  const inserir = (v: string) => setConteudo((atual) => `${atual}${atual.endsWith(" ") ? "" : " "}${v}`);

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="tpl-titulo">
        <p className={s.modalRot}>{template ? "Editar" : "Novo"}</p>
        <h2 id="tpl-titulo">{template ? template.titulo : "Escrever template"}</h2>

        <form onSubmit={enviar}>
          <label className={s.campo}>
            <span className={s.campoRot}>Título</span>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Primeira abordagem"
              required
              autoFocus
            />
          </label>

          <label className={s.campo}>
            <span className={s.campoRot}>Categoria</span>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaTemplate)}>
              <option value="">Sem categoria</option>
              {CATEGORIAS_TEMPLATE.map((c) => (
                <option key={c} value={c}>
                  {NOME_CATEGORIA[c]}
                </option>
              ))}
            </select>
          </label>

          <label className={s.campo}>
            <span className={s.campoRot}>Mensagem</span>
            <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} required rows={7} />
          </label>

          <div className={s.variaveis}>
            {VARIAVEIS.map((v) => (
              <button key={v} type="button" className={s.btnMini} onClick={() => inserir(v)}>
                {v}
              </button>
            ))}
          </div>

          {conteudo.trim() ? (
            <>
              <p className={`${s.campoRot} ${s.rotuloPrevia}`}>Como fica</p>
              <p className={s.previa}>{renderTemplate(conteudo, EXEMPLO)}</p>
            </>
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
              {salvando ? "Salvando…" : "Salvar template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
