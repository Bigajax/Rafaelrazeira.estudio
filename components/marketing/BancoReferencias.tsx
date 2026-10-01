"use client";

/* O banco de referências do feed (01/10/2026): o que o time lê de FORA
   antes de criar. Os formatos e o que evitar vêm primeiro, porque valem
   para todo post; depois os perfis, por categoria. Guardar uma nova é um
   formulário curto; tirar não apaga, só para o time de ler. */
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { arquivarReferencia, carregarReferenciasIniciais, salvarReferencia } from "@/app/(pt)/crm/acoes-marketing";
import { CATEGORIAS, type Categoria } from "@/lib/marketing/tipos";
import type { Referencia } from "@/lib/marketing/referencias-iniciais";
import m from "@/app/(pt)/crm/marketing.module.css";
import s from "@/app/(pt)/crm/crm.module.css";

function Linha({ r, aoTirar }: { r: Referencia; aoTirar: (id: string, ativo: boolean) => void }) {
  return (
    <li className={`${m.refLinha} ${r.ativo === false ? m.refTirada : ""}`}>
      <div className={m.refNome}>
        {r.link ? (
          <a href={r.link} target="_blank" rel="noreferrer">
            {r.nome}
          </a>
        ) : (
          <b>{r.nome}</b>
        )}
        {r.id ? (
          <button type="button" className={m.refTirar} onClick={() => aoTirar(r.id!, r.ativo === false)}>
            {r.ativo === false ? "Voltar a usar" : "Tirar"}
          </button>
        ) : null}
      </div>
      {r.por_que ? <p>{r.por_que}</p> : null}
      <dl>
        {r.copiar ? (
          <div>
            <dt>Copiar</dt>
            <dd>{r.copiar}</dd>
          </div>
        ) : null}
        {r.nao_copiar ? (
          <div>
            <dt>Não copiar</dt>
            <dd>{r.nao_copiar}</dd>
          </div>
        ) : null}
        {r.evidencia ? (
          <div>
            <dt>{r.tipo === "perfil" ? "Evidência" : "Onde aparece"}</dt>
            <dd>{r.evidencia}</dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

export function BancoReferencias({ refs, semTabela }: { refs: Referencia[]; semTabela: boolean }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const form = useRef<HTMLFormElement>(null);

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>, txtOk: string) =>
    comecar(async () => {
      setErro("");
      setOk("");
      const r = await fn();
      if (r.ok) setOk(txtOk);
      else setErro(r.erro ?? "Não deu certo.");
      router.refresh();
    });

  if (semTabela) {
    return <p className={m.esperandoVazio}>Falta a tabela do banco: rode o supabase/marketing-referencias.sql no SQL Editor do Supabase e recarregue.</p>;
  }

  if (!refs.length) {
    return (
      <div className={m.refVazio}>
        <p>O banco está vazio. A pesquisa de 01/10 tem 23 perfis conferidos, 5 formatos e o que evitar.</p>
        <button type="button" className={s.btnAcao} disabled={pendente} onClick={() => rodar(carregarReferenciasIniciais, "Referências carregadas")}>
          {pendente ? "Carregando" : "Trazer as referências da pesquisa"}
        </button>
        {erro ? <p className={s.erro}>{erro}</p> : null}
      </div>
    );
  }

  const tirar = (id: string, voltar: boolean) => rodar(() => arquivarReferencia(id, voltar), voltar ? "Voltou para o time" : "Tirada do que o time lê");
  const gerais = refs.filter((r) => r.tipo !== "perfil");

  return (
    <div className={`${m.refBanco} ${pendente ? m.ocupado : ""}`}>
      {ok ? <p className={s.salvo} aria-live="polite">{ok}</p> : null}
      {erro ? <p className={s.erro}>{erro}</p> : null}

      <section aria-labelledby="ref-formatos">
        <h2 id="ref-formatos">Valem para todo post</h2>
        <ul className={m.refLista}>
          {gerais.map((r) => (
            <Linha key={r.id ?? r.nome} r={r} aoTirar={tirar} />
          ))}
        </ul>
      </section>

      {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => {
        const daqui = refs.filter((r) => r.tipo === "perfil" && r.categoria === c);
        if (!daqui.length) return null;
        return (
          <section key={c} aria-labelledby={`ref-${c}`}>
            <h2 id={`ref-${c}`}>
              {CATEGORIAS[c].nome} <span>{daqui.filter((r) => r.ativo !== false).length}</span>
            </h2>
            <ul className={m.refLista}>
              {daqui.map((r) => (
                <Linha key={r.id ?? r.nome} r={r} aoTirar={tirar} />
              ))}
            </ul>
          </section>
        );
      })}

      <section aria-labelledby="ref-nova" className={m.refNova}>
        <h2 id="ref-nova">Guardar uma referência</h2>
        <p>
          O critério não é "achei bonito": é um post muito acima do normal daquele perfil, ou um formato que se repete em vários perfis
          grandes do mesmo assunto.
        </p>
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            const dados = new FormData(e.currentTarget);
            rodar(async () => {
              const r = await salvarReferencia(dados);
              if (r.ok) form.current?.reset();
              return r;
            }, "Referência guardada");
          }}
        >
          <div className={s.dupla}>
            <label className={s.campo}>
              <span className={s.campoRot}>O que é</span>
              <select name="tipo" defaultValue="perfil">
                <option value="perfil">Um perfil</option>
                <option value="formato">Um formato que se repete</option>
                <option value="evitar">Algo para evitar</option>
              </select>
            </label>
            <label className={s.campo}>
              <span className={s.campoRot}>Categoria</span>
              <select name="categoria" defaultValue="">
                <option value="">Vale para todas</option>
                {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIAS[c].nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={s.dupla}>
            <label className={s.campo}>
              <span className={s.campoRot}>O @ ou o nome</span>
              <input name="nome" placeholder="@perfil, ou o nome do formato" required />
            </label>
            <label className={s.campo}>
              <span className={s.campoRot}>Link (do post, de preferência)</span>
              <input name="link" type="url" placeholder="https://www.instagram.com/p/..." />
            </label>
          </div>
          <label className={s.campo}>
            <span className={s.campoRot}>Por que funciona</span>
            <textarea name="por_que" rows={2} placeholder="O gancho, o formato, a imagem: o que faz a pessoa mandar para alguém." />
          </label>
          <div className={s.dupla}>
            <label className={s.campo}>
              <span className={s.campoRot}>O que copiar</span>
              <textarea name="copiar" rows={2} placeholder="O mecanismo, não o texto." />
            </label>
            <label className={s.campo}>
              <span className={s.campoRot}>O que não copiar</span>
              <textarea name="nao_copiar" rows={2} placeholder="O que não combina com o estúdio." />
            </label>
          </div>
          <button type="submit" className={s.btnAcao} disabled={pendente}>
            {pendente ? "Guardando" : "Guardar"}
          </button>
        </form>
      </section>
    </div>
  );
}
