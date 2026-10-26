"use client";

/* ============================================================
   01 · VÍDEO — o pedido à esquerda, o player no palco, os vídeos embaixo

   O vídeo é assíncrono: "Gerar vídeo" devolve na hora uma linha na fila,
   e a tela pergunta o andamento a cada 10 segundos enquanto houver vídeo
   em curso (a rota consulta o OpenRouter e guarda o MP4 quando fica
   pronto). Fechar a aba não perde nada: ao voltar, a lista retoma a
   consulta dos que estavam em curso.

   As referências entram de dois jeitos, conforme o modelo:
     primeiro e último quadro   todos (o Veo usa só isso)
     referência solta            só onde a ficha do modelo tem (Seedance)
   Um quadro pode vir do computador, da galeria ou da sequência de um
   projeto ("Gerar vídeo até o próximo quadro").
   ============================================================ */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { excluirVideo, linkDownloadVideo, registrarUpload } from "@/app/(pt)/crm/acoes-ai-studio";
import { MODELOS_VIDEO, MOVIMENTOS, PROMPT_MAX, VIDEO_PADRAO, ajustarVideo, modeloVideo } from "@/lib/ai-studio/modelos";
import { estimativaVideo, usd } from "@/lib/ai-studio/precos";
import type { Contexto, Imagem, Video } from "@/lib/ai-studio/tipos";
import { problemaDoArquivo, subirEntrada } from "./arquivos";
import { Referencias, Segmentos, refsParaEnvio, refsSubindo, type RefLocal } from "./Controles";
import { aspecto } from "./Criar";
import { quando } from "./Galeria";
import { Confirmar, Decorrido } from "./useGerar";
import s from "@/app/(pt)/crm/crm.module.css";
import a from "@/app/(pt)/crm/ai-studio.module.css";

type ParamsVideo = { modelo: string; resolucao: string; proporcao: string; duracao: number; audio: boolean };
type QuadroLocal = { id: string; preview: string };

const EM_CURSO = new Set(["pendente", "gerando", "baixando"]);
const ESTADO: Record<Video["status"], string> = {
  pendente: "Na fila",
  gerando: "Gerando",
  baixando: "Guardando o arquivo",
  pronta: "Pronto",
  falhou: "Falhou",
};

export function Estudio({
  ctx,
  videos,
  imagens,
  inicial,
}: {
  ctx: Contexto;
  videos: Video[];
  imagens: Imagem[];
  inicial: { primeiro: Imagem | null; ultimo: Imagem | null; projeto: string | null };
}) {
  const router = useRouter();
  const [params, setParams] = useState<ParamsVideo>(VIDEO_PADRAO);
  const [prompt, setPrompt] = useState("");
  const [primeiro, setPrimeiro] = useState<QuadroLocal | null>(
    inicial.primeiro ? { id: inicial.primeiro.id, preview: inicial.primeiro.urlMini ?? "" } : null,
  );
  const [ultimo, setUltimo] = useState<QuadroLocal | null>(
    inicial.ultimo ? { id: inicial.ultimo.id, preview: inicial.ultimo.urlMini ?? "" } : null,
  );
  const [refs, setRefs] = useState<RefLocal[]>([]);
  const [projetoId, setProjetoId] = useState(inicial.projeto ?? "");
  const [lista, setLista] = useState<Video[]>(videos);
  const [selId, setSelId] = useState<string | null>(videos[0]?.id ?? null);
  const [enviando, setEnviando] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [falhaConsulta, setFalhaConsulta] = useState<Record<string, string>>({});

  /* o servidor manda a lista nova a cada refresh; o que está só aqui
     (o vídeo recém-pedido) não pode sumir nesse meio-tempo */
  useEffect(() => {
    setLista((atual) => {
      const doServidor = new Map(videos.map((v) => [v.id, v]));
      const soLocais = atual.filter((v) => !doServidor.has(v.id));
      return [...soLocais, ...videos];
    });
  }, [videos]);

  const modelo = modeloVideo(params.modelo) ?? MODELOS_VIDEO[0];
  const mudar = (p: Partial<ParamsVideo>) => setParams((x) => ajustarVideo({ ...x, ...p }));
  const est = estimativaVideo(modelo.id, params.resolucao, params.duracao, params.audio && modelo.audio);
  const sel = lista.find((v) => v.id === selId) ?? null;

  /* ---------- a consulta do andamento ---------- */
  const consultar = useCallback(
    async (id: string) => {
      const r = await fetch(`/api/ai-studio/video/${id}`, { cache: "no-store" });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; video?: Video };
      if (j.video) setLista((x) => x.map((v) => (v.id === id ? (j.video as Video) : v)));
      if (!j.ok) setFalhaConsulta((f) => ({ ...f, [id]: j.erro ?? "A consulta falhou." }));
      else setFalhaConsulta((f) => {
        const { [id]: _, ...resto } = f;
        return resto;
      });
      if (j.video?.status === "pronta" || j.video?.status === "falhou") router.refresh();
    },
    [router],
  );
  const emCurso = lista.filter((v) => EM_CURSO.has(v.status) && !falhaConsulta[v.id]).map((v) => v.id);
  const chaveCurso = emCurso.join(",");
  useEffect(() => {
    if (!chaveCurso) return;
    const ids = chaveCurso.split(",");
    const t = setInterval(() => ids.forEach((id) => void consultar(id)), 10_000);
    const primeiraVez = setTimeout(() => ids.forEach((id) => void consultar(id)), 1500);
    return () => {
      clearInterval(t);
      clearTimeout(primeiraVez);
    };
  }, [chaveCurso, consultar]);

  /* ---------- o pedido ---------- */
  const bloqueio = ctx.semTabela
    ? "Rode o supabase/ai-studio.sql antes."
    : !ctx.temChave
      ? "Falta a chave do OpenRouter."
      : refsSubindo(refs)
        ? "Esperando as referências subirem."
        : null;

  async function enviar() {
    setEnviando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/ai-studio/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chave: crypto.randomUUID(),
          prompt,
          ...params,
          audio: params.audio && modelo.audio,
          primeiro_id: primeiro?.id ?? null,
          ultimo_id: modelo.quadros.includes("last_frame") ? (ultimo?.id ?? null) : null,
          referencias: modelo.referencias ? refsParaEnvio(refs) : [],
          projeto_id: projetoId || null,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; video?: Video };
      if (!r.ok || !j.ok || !j.video) {
        setAviso(j.erro || `O pedido falhou (${r.status}).`);
        return;
      }
      setLista((x) => [j.video as Video, ...x]);
      setSelId(j.video.id);
    } catch {
      setAviso("A conexão caiu antes da resposta. Confira a lista antes de pedir de novo: o vídeo pode ter entrado na fila.");
    } finally {
      setEnviando(false);
    }
  }

  function pedir() {
    if (!prompt.trim()) return setAviso("Descreva a cena antes de gerar.");
    if (ctx.config.confirmar_antes) setPendente(true);
    else void enviar();
  }

  const ficha: [string, string][] = [
    ["Modelo", modelo.nome],
    ["Vídeo", `${params.resolucao} · ${params.proporcao} · ${params.duracao} s · ${params.audio && modelo.audio ? "com áudio" : "sem áudio"}`],
    ["Quadros", [primeiro ? "primeiro" : null, ultimo && modelo.quadros.includes("last_frame") ? "último" : null].filter(Boolean).join(" e ") || "nenhum"],
    ["Custo", est !== null ? `cerca de ${usd(est, 2)} pela tabela do OpenRouter` : "cobra por token: o valor real aparece quando o vídeo fica pronto"],
  ];

  return (
    <>
      {pendente && (
        <Confirmar
          titulo="Gerar vídeo"
          linhas={ficha}
          onVoltar={() => setPendente(false)}
          onConfirmar={() => {
            setPendente(false);
            void enviar();
          }}
        />
      )}
      <div className={a.mesa}>
        <div className={a.controles}>
          <div className={a.secao}>
            <span className={a.rot}>Modelo de vídeo</span>
            <div className={a.modelos} role="radiogroup" aria-label="Modelo de vídeo">
              {MODELOS_VIDEO.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={m.id === modelo.id}
                  className={`${a.modelo} ${m.id === modelo.id ? a.modeloAtivo : ""}`}
                  onClick={() => mudar({ modelo: m.id })}
                >
                  <b>{m.curto}</b>
                  <span>{m.descricao}</span>
                </button>
              ))}
            </div>
          </div>

          <Segmentos rotulo="Resolução" valores={modelo.resolucoes} valor={params.resolucao} onChange={(resolucao) => mudar({ resolucao })} />
          <Segmentos rotulo="Proporção" valores={modelo.proporcoes} valor={params.proporcao} onChange={(proporcao) => mudar({ proporcao })} />
          <Segmentos
            rotulo="Duração"
            valores={modelo.duracoes.map(String)}
            valor={String(params.duracao)}
            nome={(d) => `${d} s`}
            onChange={(d) => mudar({ duracao: Number(d) })}
          />
          {modelo.audio && (
            <label className={a.toggle}>
              <input type="checkbox" checked={params.audio} onChange={(e) => mudar({ audio: e.target.checked })} />
              Gerar áudio junto (som ambiente, efeitos, fala)
            </label>
          )}

          <div className={a.secao}>
            <span className={a.rot}>
              Quadros de referência
              <small>opcionais</small>
            </span>
            <div className={a.slots}>
              <SlotQuadro titulo="Primeiro quadro" valor={primeiro} onChange={setPrimeiro} ctx={ctx} imagens={imagens} projetoId={projetoId} />
              {modelo.quadros.includes("last_frame") ? (
                <SlotQuadro titulo="Último quadro" valor={ultimo} onChange={setUltimo} ctx={ctx} imagens={imagens} projetoId={projetoId} />
              ) : (
                <span className={a.nota}>O {modelo.curto} não aceita último quadro.</span>
              )}
            </div>
            <span className={a.nota}>
              O vídeo começa (e termina) exatamente nessas imagens. Use a mesma proporção do vídeo. Imagem de produto em 4K:
              gere no Nano Banana Pro, na aba Imagem.
            </span>
          </div>

          {modelo.referencias > 0 ? (
            <Referencias
              uid={ctx.uid}
              refs={refs}
              onChange={setRefs}
              max={modelo.referencias}
              titulo="Referências soltas"
              texto="Produto, personagem ou estilo que o vídeo deve seguir, sem ser quadro."
            />
          ) : (
            <span className={a.nota}>
              O {modelo.curto} não aceita referência solta pelo OpenRouter: as referências dele são o primeiro e o último quadro.
              Para várias referências, use o Seedance 2.0.
            </span>
          )}

          {ctx.projetos.length > 0 && (
            <div className={a.secao}>
              <label className={a.rot} htmlFor="ai-video-projeto">
                Projeto
              </label>
              <select id="ai-video-projeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
                <option value="">Sem projeto</option>
                {ctx.projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={`${a.secao} ${a.prompt}`}>
            <label className={a.rot} htmlFor="ai-video-prompt">
              A cena
            </label>
            <textarea
              id="ai-video-prompt"
              value={prompt}
              maxLength={PROMPT_MAX}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva o vídeo: o que acontece, a câmera, a luz, o clima, o som..."
            />
            <div className={a.chips}>
              {MOVIMENTOS.map((t) => (
                <button key={t} type="button" className={a.chip} onClick={() => setPrompt((x) => (x.trim() ? `${x.trim()} ${t}` : t))}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className={a.gerar}>
            <button type="button" className={s.btnAcao} onClick={pedir} disabled={enviando || Boolean(bloqueio)}>
              {enviando ? "Enviando…" : "✦ Gerar vídeo"}
            </button>
            {(bloqueio || aviso) && <span className={a.notaAlerta}>{aviso ?? bloqueio}</span>}
            <span className={a.estimativa}>
              {est !== null ? (
                <>
                  Estimativa: <b>{usd(est, 2)}</b> ({params.duracao} s × {usd(est / params.duracao, 2)}/s), pela tabela do OpenRouter. O valor
                  final é o que ele devolve.
                </>
              ) : (
                "Este modelo cobra por token: o custo real aparece quando o vídeo fica pronto."
              )}
            </span>
          </div>
        </div>

        <Palco video={sel} falha={sel ? falhaConsulta[sel.id] : undefined} onConsultar={(id) => void consultar(id)} />
      </div>

      <ListaVideos videos={lista} selId={selId} onEscolher={setSelId} />
    </>
  );
}

/* ---------- um lugar de quadro: subir, escolher da galeria, tirar ---------- */
function SlotQuadro({
  titulo,
  valor,
  onChange,
  ctx,
  imagens,
  projetoId,
}: {
  titulo: string;
  valor: QuadroLocal | null;
  onChange: (q: QuadroLocal | null) => void;
  ctx: Contexto;
  imagens: Imagem[];
  projetoId: string;
}) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function subir(f: File | undefined) {
    if (!f) return;
    const problema = problemaDoArquivo(f);
    if (problema) return setErro(problema);
    setErro(null);
    setSubindo(true);
    try {
      const r = await registrarUpload(await subirEntrada(ctx.uid, f), projetoId || null);
      if (!r.ok) throw new Error(r.erro);
      onChange({ id: r.id, preview: URL.createObjectURL(f) });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "O upload falhou.");
    } finally {
      setSubindo(false);
    }
  }

  return (
    <div className={a.slot}>
      <button
        type="button"
        className={`${a.slotImg} ${valor ? a.slotCheio : ""}`}
        style={valor?.preview ? { backgroundImage: `url("${valor.preview}")` } : undefined}
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void subir(e.dataTransfer.files[0]);
        }}
        disabled={subindo || ctx.semTabela}
        aria-label={`${titulo}: subir imagem`}
      >
        {subindo ? "subindo…" : valor ? titulo : `+ ${titulo}`}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className={a.escondido}
        onChange={(e) => {
          void subir(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className={a.slotBotoes}>
        <button type="button" className={s.btnMini} onClick={() => setEscolhendo((x) => !x)} disabled={!imagens.length}>
          Da galeria
        </button>
        {valor && (
          <button type="button" className={s.btnMini} onClick={() => onChange(null)}>
            Tirar
          </button>
        )}
      </div>
      {erro && <span className={a.notaAlerta}>{erro}</span>}
      {escolhendo && (
        <div className={a.seletor}>
          {imagens
            .filter((i) => i.urlMini)
            .map((img) => (
              <button
                key={img.id}
                type="button"
                className={img.id === valor?.id ? a.seletorAtivo : ""}
                onClick={() => {
                  onChange({ id: img.id, preview: img.urlMini as string });
                  setEscolhendo(false);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.urlMini as string} alt="" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ---------- o palco: o player, ou o andamento ---------- */
function Palco({ video, falha, onConsultar }: { video: Video | null; falha?: string; onConsultar: (id: string) => void }) {
  const router = useRouter();
  const [aviso, setAviso] = useState<string | null>(null);
  const [apagar, setApagar] = useState(false);
  const [pendente, iniciar] = useTransition();
  useEffect(() => {
    setApagar(false);
    setAviso(null);
  }, [video?.id]);

  if (!video) {
    return (
      <div className={a.palco}>
        <div className={a.quadroPalco}>
          <div className={a.moldura} style={{ aspectRatio: "16 / 9" }}>
            <b>O vídeo aparece aqui</b>
            <span>de 30 segundos a vários minutos depois do pedido</span>
          </div>
        </div>
      </div>
    );
  }

  const { l, a: alt } = aspecto(video.proporcao ?? "16:9");
  const m = modeloVideo(video.modelo);

  return (
    <div className={a.palco} aria-live="polite">
      <div className={a.quadroPalco}>
        {video.status === "pronta" && video.url ? (
          <video key={video.id} src={video.url} poster={video.poster ?? undefined} controls playsInline loop preload="metadata" />
        ) : video.status === "falhou" ? (
          <div className={a.falha} role="alert">
            <b>Não saiu desta vez</b>
            <p>{video.erro ?? "A geração falhou."}</p>
            <p>O pedido e a cena continuam no painel ao lado: ajuste e gere de novo.</p>
          </div>
        ) : (
          <div className={`${a.moldura} ${falha ? "" : a.molduraViva}`} style={{ aspectRatio: `${l} / ${alt}` }}>
            <b>{falha ? "A consulta falhou" : `${ESTADO[video.status]}…`}</b>
            {!falha && (
              <span className={a.relogio}>
                <i aria-hidden="true" />
                <Decorrido inicio={new Date(video.created_at).getTime()} />
              </span>
            )}
            <span>{falha ?? "Pode fechar a aba: ao voltar, a consulta continua de onde parou."}</span>
            {falha && (
              <button type="button" className={a.btnClaro} onClick={() => onConsultar(video.id)}>
                Consultar de novo
              </button>
            )}
          </div>
        )}
      </div>
      <div className={`${a.palcoPe} ${pendente ? a.ocupado : ""}`}>
        <span className={a.ficha}>
          <b>{m?.curto ?? video.modelo}</b> · {video.resolucao} · {video.proporcao} · {video.duracao} s{video.audio ? " · áudio" : ""} ·{" "}
          {video.custo_usd !== null ? usd(Number(video.custo_usd), 3) : video.estimativa_usd !== null ? `~${usd(Number(video.estimativa_usd), 2)}` : "custo ao terminar"}
        </span>
        <div className={a.acoesPalco}>
          {video.status === "pronta" && (
            <button
              type="button"
              className={`${a.btnClaro} ${a.btnClaroForte}`}
              onClick={() =>
                iniciar(async () => {
                  const r = await linkDownloadVideo(video.id);
                  if (r.ok) window.location.href = r.url;
                  else setAviso(r.erro);
                })
              }
            >
              Baixar MP4
            </button>
          )}
          {!EM_CURSO.has(video.status) &&
            (apagar ? (
              <>
                <button
                  type="button"
                  className={a.btnClaro}
                  style={{ borderColor: "var(--rosa-live)", color: "var(--rosa-live)" }}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await excluirVideo(video.id);
                      if (!r.ok) return setAviso(r.erro);
                      router.refresh();
                    })
                  }
                >
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
            ))}
        </div>
        {aviso && <span className={`${a.aviso} ${a.avisoErro}`}>{aviso}</span>}
      </div>
    </div>
  );
}

export function ListaVideos({
  videos,
  selId,
  onEscolher,
  titulo = "Vídeos",
}: {
  videos: Video[];
  selId?: string | null;
  onEscolher?: (id: string) => void;
  titulo?: string;
}) {
  const router = useRouter();
  const visiveis = useMemo(() => videos.filter((v) => !v.apagada_em), [videos]);
  return (
    <section>
      <div className={a.galeriaCab}>
        <h2>
          {titulo} <small className={a.nota}>· {visiveis.length}</small>
        </h2>
      </div>
      {visiveis.length ? (
        <div className={a.videos}>
          {visiveis.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`${a.cartaoVideo} ${v.id === selId ? a.cartaoAtivo : ""}`}
              onClick={() => (onEscolher ? onEscolher(v.id) : router.push(`/crm/ai-studio?ver=${v.id}`))}
            >
              <div className={a.cartaoMidia} style={v.poster && v.status !== "pronta" ? { backgroundImage: `url("${v.poster}")` } : undefined}>
                {v.status === "pronta" && v.url ? (
                  <video src={`${v.url}#t=0.5`} muted playsInline preload="metadata" poster={v.poster ?? undefined} />
                ) : (
                  <span>{ESTADO[v.status]}</span>
                )}
              </div>
              <div className={a.cartaoTexto}>
                <b>{modeloVideo(v.modelo)?.curto ?? v.modelo}</b>
                <span>
                  {v.resolucao} · {v.duracao} s · {quando(v.created_at)}
                </span>
                <span className={`${a.estado} ${v.status === "falhou" ? a.estadoFalhou : EM_CURSO.has(v.status) ? a.estadoVivo : ""}`}>
                  {ESTADO[v.status]}
                  {v.custo_usd !== null ? ` · ${usd(Number(v.custo_usd), 3)}` : ""}
                </span>
                {v.prompt && <p>{v.prompt}</p>}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className={a.vazioGaleria}>
          <b>Nenhum vídeo ainda</b>
          Descreva a cena, escolha os quadros se quiser, e gere o primeiro.
        </div>
      )}
    </section>
  );
}
