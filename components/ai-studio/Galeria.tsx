"use client";

/* ============================================================
   A GALERIA E O VISUALIZADOR

   A grade mostra só a miniatura (768 px, webp): o original, que pode ser
   um PNG 4K, só é carregado quando o visualizador abre, e o download
   sempre entrega o original, por um link assinado na hora.
   ============================================================ */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { adicionarQuadro, definirCapa, excluirImagem, linkDownload, moverImagem } from "@/app/(pt)/crm/acoes-ai-studio";
import { FUNCOES, QUALIDADES, modeloPorId, type Qualidade } from "@/lib/ai-studio/modelos";
import { usd } from "@/lib/ai-studio/precos";
import type { Imagem, ProjetoResumo } from "@/lib/ai-studio/tipos";
import a from "@/app/(pt)/crm/ai-studio.module.css";

const ORIGEM: Record<string, string> = {
  criar: "Criada",
  editar: "Editada",
  variacao: "Variação",
  quadro: "Quadro",
  upload: "Enviada",
};

export function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export async function baixar(id: string): Promise<string | null> {
  const r = await linkDownload(id);
  if (!r.ok) return r.erro;
  window.location.href = r.url;
  return null;
}

export function Galeria({
  imagens,
  projetos,
  filtros = true,
  titulo = "Galeria",
  vazio,
  projetoAtual,
  onUsarReferencia,
}: {
  imagens: Imagem[];
  projetos: ProjetoResumo[];
  filtros?: boolean;
  titulo?: string;
  vazio?: string;
  projetoAtual?: string;
  onUsarReferencia?: (img: Imagem) => void;
}) {
  const [filtro, setFiltro] = useState<"todas" | "recentes">("todas");
  const [projeto, setProjeto] = useState("");
  const [modelo, setModelo] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);

  const visiveis = useMemo(() => {
    const semana = Date.now() - 7 * 86400_000;
    return imagens.filter(
      (i) =>
        (filtro === "todas" || new Date(i.created_at).getTime() >= semana) &&
        (!projeto || (projeto === "-" ? !i.projeto_id : i.projeto_id === projeto)) &&
        (!modelo || (modelo === "upload" ? i.origem === "upload" : i.modelo === modelo)),
    );
  }, [imagens, filtro, projeto, modelo]);
  const modelos = useMemo(() => [...new Set(imagens.map((i) => i.modelo).filter((m): m is string => Boolean(m)))], [imagens]);
  const imagemAberta = aberta ? (imagens.find((i) => i.id === aberta) ?? null) : null;

  return (
    <section>
      <div className={a.galeriaCab}>
        <h2>
          {titulo} <small className={a.nota}>· {visiveis.length}</small>
        </h2>
        {filtros && imagens.length > 0 && (
          <div className={a.filtros}>
            <button type="button" className={`${a.chip} ${filtro === "todas" ? a.chipAtivo : ""}`} onClick={() => setFiltro("todas")}>
              Todas
            </button>
            <button type="button" className={`${a.chip} ${filtro === "recentes" ? a.chipAtivo : ""}`} onClick={() => setFiltro("recentes")}>
              Recentes · 7 dias
            </button>
            <select aria-label="Filtrar por projeto" value={projeto} onChange={(e) => setProjeto(e.target.value)}>
              <option value="">Todos os projetos</option>
              <option value="-">Sem projeto</option>
              {projetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <select aria-label="Filtrar por modelo" value={modelo} onChange={(e) => setModelo(e.target.value)}>
              <option value="">Todos os modelos</option>
              {modelos.map((m) => (
                <option key={m} value={m}>
                  {modeloPorId(m)?.curto ?? m}
                </option>
              ))}
              <option value="upload">Enviadas</option>
            </select>
          </div>
        )}
      </div>

      {visiveis.length ? (
        <div className={a.grade}>
          {visiveis.map((i) => (
            <button key={i.id} type="button" className={a.peca} onClick={() => setAberta(i.id)} style={{ aspectRatio: i.largura && i.altura ? `${i.largura} / ${i.altura}` : undefined }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {i.urlMini && <img src={i.urlMini} alt={i.prompt.slice(0, 120) || "Imagem"} loading="lazy" decoding="async" />}
              <span>
                {ORIGEM[i.origem]} · {modeloPorId(i.modelo ?? "")?.curto ?? "foto"} · {quando(i.created_at)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className={a.vazioGaleria}>
          <b>{imagens.length ? "Nada com esses filtros" : "Nenhuma imagem ainda"}</b>
          {vazio ?? "Toda imagem gerada aparece aqui."}
        </div>
      )}

      {imagemAberta && (
        <Visualizador
          imagem={imagemAberta}
          projetos={projetos}
          projetoAtual={projetoAtual}
          onFechar={() => setAberta(null)}
          onUsarReferencia={onUsarReferencia}
        />
      )}
    </section>
  );
}

export function Visualizador({
  imagem,
  projetos,
  projetoAtual,
  onFechar,
  onUsarReferencia,
}: {
  imagem: Imagem;
  projetos: ProjetoResumo[];
  projetoAtual?: string;
  onFechar: () => void;
  onUsarReferencia?: (img: Imagem) => void;
}) {
  const router = useRouter();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [destino, setDestino] = useState(projetoAtual ?? imagem.projeto_id ?? projetos[0]?.id ?? "");
  const [apagar, setApagar] = useState(false);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onFechar]);

  function agir(fn: () => Promise<{ ok: boolean; erro?: string }>, ok: string, depois?: () => void) {
    setAviso(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setAviso({ ok: false, texto: r.erro ?? "Não deu certo." });
      setAviso({ ok: true, texto: ok });
      router.refresh();
      depois?.();
    });
  }

  const modelo = modeloPorId(imagem.modelo ?? "");
  const projetoNome = projetos.find((p) => p.id === imagem.projeto_id)?.nome;

  return (
    <div className={a.fundo} role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={onFechar}>
      <div className={a.visor} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={a.fecharVisor} onClick={onFechar} aria-label="Fechar">
          ×
        </button>
        <div className={a.visorImg}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {imagem.url && <img src={imagem.url} alt={imagem.prompt.slice(0, 160) || "Imagem"} />}
        </div>
        <div className={`${a.visorInfo} ${pendente ? a.ocupado : ""}`}>
          <div>
            <p className={a.visorRot}>{ORIGEM[imagem.origem]}</p>
            <h2>{modelo?.nome ?? "Foto enviada"}</h2>
          </div>
          {imagem.prompt && <p className={a.promptTexto}>{imagem.prompt}</p>}
          <dl className={a.dados}>
            {imagem.qualidade && (
              <>
                <dt>Qualidade</dt>
                <dd>{QUALIDADES[imagem.qualidade as Qualidade] ?? imagem.qualidade}</dd>
              </>
            )}
            <dt>Resolução</dt>
            <dd>{imagem.largura && imagem.altura ? `${imagem.largura} × ${imagem.altura}` : "sem dado"}</dd>
            {imagem.formato && (
              <>
                <dt>Formato</dt>
                <dd>{imagem.formato.toUpperCase()}</dd>
              </>
            )}
            <dt>Data</dt>
            <dd>{quando(imagem.created_at)}</dd>
            <dt>Projeto</dt>
            <dd>{projetoNome ?? "sem projeto"}</dd>
            {imagem.origem !== "upload" && (
              <>
                <dt>Custo</dt>
                <dd>{usd(imagem.custo_usd === null ? null : Number(imagem.custo_usd), 4)}</dd>
              </>
            )}
            {imagem.referencias?.length > 0 && (
              <>
                <dt>Referências</dt>
                <dd>{imagem.referencias.map((r) => FUNCOES[r.funcao]?.nome ?? r.funcao).join(", ")}</dd>
              </>
            )}
            {imagem.pai_id && (
              <>
                <dt>Versão de</dt>
                <dd>
                  <a href={`/crm/ai-studio/editar?imagem=${imagem.pai_id}`} style={{ textDecoration: "underline" }}>
                    a imagem anterior
                  </a>
                </dd>
              </>
            )}
          </dl>

          <div className={a.visorAcoes}>
            <button type="button" className={`${a.btnClaro} ${a.btnClaroForte}`} onClick={() => baixar(imagem.id).then((e) => e && setAviso({ ok: false, texto: e }))}>
              Baixar
            </button>
            <button type="button" className={a.btnClaro} onClick={() => router.push(`/crm/ai-studio/editar?imagem=${imagem.id}`)}>
              Editar
            </button>
            <button type="button" className={a.btnClaro} onClick={() => router.push(`/crm/ai-studio/imagem?variacao=${imagem.id}`)}>
              Gerar variação
            </button>
            <button
              type="button"
              className={a.btnClaro}
              onClick={() => {
                if (onUsarReferencia) {
                  onUsarReferencia(imagem);
                  onFechar();
                } else router.push(`/crm/ai-studio/imagem?ref=${imagem.id}`);
              }}
            >
              Usar como referência
            </button>
          </div>

          {projetos.length > 0 ? (
            <div>
              <p className={a.visorRot}>Projeto</p>
              <div className={a.visorLinha}>
                <select aria-label="Projeto" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className={a.visorAcoes} style={{ marginTop: 6 }}>
                <button type="button" className={a.btnClaro} disabled={!destino || destino === imagem.projeto_id} onClick={() => agir(() => moverImagem(imagem.id, destino), "Movida para o projeto.")}>
                  Adicionar ao projeto
                </button>
                <button type="button" className={a.btnClaro} disabled={!destino} onClick={() => agir(() => adicionarQuadro(destino, { imagemId: imagem.id }), "Entrou no fim da sequência.")}>
                  Adicionar à sequência
                </button>
                {imagem.projeto_id && (
                  <button type="button" className={a.btnClaro} onClick={() => agir(() => definirCapa(imagem.projeto_id as string, imagem.id), "Agora é a capa do projeto.")}>
                    Usar como capa
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className={a.aviso}>Crie um projeto na aba Projetos para organizar e montar sequências.</p>
          )}

          <div className={a.visorAcoes}>
            {apagar ? (
              <>
                <button type="button" className={a.btnClaro} style={{ borderColor: "var(--rosa-live)", color: "var(--rosa-live)" }} onClick={() => agir(() => excluirImagem(imagem.id), "Excluída.", onFechar)}>
                  Excluir mesmo
                </button>
                <button type="button" className={a.btnClaro} onClick={() => setApagar(false)}>
                  Manter
                </button>
              </>
            ) : (
              <button type="button" className={a.btnClaro} onClick={() => setApagar(true)}>
                Excluir
              </button>
            )}
          </div>
          {apagar && <p className={a.aviso}>O arquivo sai do armazenamento; o custo continua no consumo do mês.</p>}
          {aviso && <p className={`${a.aviso} ${aviso.ok ? a.avisoOk : a.avisoErro}`}>{aviso.texto}</p>}
        </div>
      </div>
    </div>
  );
}
