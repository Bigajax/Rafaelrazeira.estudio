"use client";

/* 03 · PROJETOS: a lista, o projeto aberto (nome, descrição, excluir) e o
   upload de imagens direto para um projeto. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarProjeto, excluirProjeto, registrarUpload, salvarProjeto } from "@/app/(pt)/crm/acoes-ai-studio";
import type { Projeto, ProjetoResumo } from "@/lib/ai-studio/tipos";
import { problemaDoArquivo, subirEntrada } from "./arquivos";
import s from "@/app/(pt)/crm/crm.module.css";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export function ListaProjetos({ projetos, semTabela }: { projetos: ProjetoResumo[]; semTabela: boolean }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function criar(e: React.FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await criarProjeto(nome, descricao);
      if (!r.ok) return setAviso(r.erro);
      router.push(`/crm/ai-studio/projetos/${r.id}`);
    });
  }

  return (
    <section>
      <div className={a.secaoCab}>
        <h2>Projetos</h2>
        <span className={a.nota}>Campanhas, conceitos e sequências: cada projeto guarda as imagens e a timeline dele.</span>
      </div>
      <div className={a.projetos}>
        <form className={`${a.novoProjeto} ${pendente ? a.ocupado : ""}`} onSubmit={criar}>
          <span className={a.rot}>Novo projeto</span>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Monster Energy" maxLength={120} required disabled={semTabela} />
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição (opcional). Na sequência, ela entra no prompt como contexto." disabled={semTabela} />
          <button type="submit" className={s.btn} disabled={semTabela || !nome.trim()}>
            Criar projeto
          </button>
          {aviso && <span className={a.notaAlerta}>{aviso}</span>}
        </form>
        {projetos.map((p) => (
          <Link key={p.id} href={`/crm/ai-studio/projetos/${p.id}`} className={a.projeto}>
            <div className={a.projetoCapa} style={p.capaUrl ? { backgroundImage: `url("${p.capaUrl}")` } : undefined}>
              {p.capaUrl ? null : "sem capa"}
            </div>
            <div className={a.projetoTexto}>
              <b>{p.nome}</b>
              <span>
                {p.total} {p.total === 1 ? "imagem" : "imagens"} · desde {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CabecalhoProjeto({ projeto, uid, total }: { projeto: Projeto; uid: string; total: number }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(projeto.nome);
  const [descricao, setDescricao] = useState(projeto.descricao ?? "");
  const [apagar, setApagar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [subindo, setSubindo] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  async function subir(lista: FileList | null) {
    const arquivos = [...(lista ?? [])];
    if (!arquivos.length) return;
    setAviso(null);
    let feitos = 0;
    for (const f of arquivos) {
      const problema = problemaDoArquivo(f);
      if (problema) {
        setAviso(problema);
        continue;
      }
      setSubindo(`Subindo ${feitos + 1} de ${arquivos.length}…`);
      try {
        const r = await registrarUpload(await subirEntrada(uid, f), projeto.id);
        if (!r.ok) throw new Error(r.erro);
        feitos++;
      } catch (e) {
        setAviso(e instanceof Error ? e.message : "O upload falhou.");
      }
    }
    setSubindo(null);
    router.refresh();
  }

  return (
    <>
      <Link href="/crm/ai-studio/projetos" className={a.voltar}>
        ← Projetos
      </Link>
      {editando ? (
        <form
          className={a.editarProjeto}
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await salvarProjeto(projeto.id, nome, descricao);
              if (!r.ok) return setAviso(r.erro);
              setEditando(false);
              router.refresh();
            });
          }}
        >
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} required aria-label="Nome do projeto" />
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição" aria-label="Descrição" />
          <div className={a.linhaBotoes}>
            <button type="submit" className={s.btn} disabled={pendente}>
              Salvar
            </button>
            <button type="button" className={s.btnMini} onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className={a.projetoCab}>
          <div>
            <h2>
              {projeto.nome}
              <i className={s.ponto}>.</i>
            </h2>
            {projeto.descricao && <p>{projeto.descricao}</p>}
            <p className={a.meta}>
              Criado em {new Date(projeto.created_at).toLocaleDateString("pt-BR")} · {total} {total === 1 ? "imagem" : "imagens"}
            </p>
          </div>
          <div className={`${a.linhaBotoes} ${pendente ? a.ocupado : ""}`}>
            <label className={s.btn} style={{ position: "relative" }}>
              {subindo ?? "Adicionar imagens"}
              <input
                type="file"
                accept="image/*"
                multiple
                className={a.escondido}
                disabled={Boolean(subindo)}
                onChange={(e) => {
                  void subir(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <Link className={s.btn} href={`/crm/ai-studio?projeto=${projeto.id}`}>
              Vídeo neste projeto
            </Link>
            <Link className={s.btn} href={`/crm/ai-studio/imagem?projeto=${projeto.id}`}>
              Imagem neste projeto
            </Link>
            <button type="button" className={s.btnMini} onClick={() => setEditando(true)}>
              Renomear
            </button>
            {apagar ? (
              <>
                <button
                  type="button"
                  className={s.btnMini}
                  style={{ borderColor: "var(--rosa)", color: "var(--rosa-dark)" }}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await excluirProjeto(projeto.id);
                      if (!r.ok) return setAviso(r.erro);
                      router.push("/crm/ai-studio/projetos");
                    })
                  }
                >
                  Excluir mesmo
                </button>
                <button type="button" className={s.btnMini} onClick={() => setApagar(false)}>
                  Manter
                </button>
              </>
            ) : (
              <button type="button" className={s.btnMini} onClick={() => setApagar(true)}>
                Excluir
              </button>
            )}
          </div>
        </div>
      )}
      {apagar && <p className={a.nota}>A sequência some; as imagens voltam para a galeria, sem projeto.</p>}
      {aviso && <p className={a.notaAlerta}>{aviso}</p>}
    </>
  );
}
