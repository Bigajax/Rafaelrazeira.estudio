"use client";

/* ============================================================
   01 · CRIAR — controles à esquerda, palco à direita, galeria embaixo

   O palco desenha a moldura na proporção escolhida antes de gerar, para o
   Rafael ver o formato da peça antes de pagar por ela. Durante a geração
   a moldura respira e o relógio conta o tempo real; no erro, o prompt e
   os parâmetros ficam onde estavam, e "Tentar de novo" reenvia o mesmo
   pedido com uma chave nova.
   ============================================================ */
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { moverImagem } from "@/app/(pt)/crm/acoes-ai-studio";
import { IMAGEM_PADRAO, PROMPT_MAX, QUALIDADES, ajustarImagem, modeloPorId } from "@/lib/ai-studio/modelos";
import { usd } from "@/lib/ai-studio/precos";
import type { Contexto, Imagem } from "@/lib/ai-studio/tipos";
import { Parametros, Referencias, refsParaEnvio, refsSubindo, type RefLocal } from "./Controles";
import { Galeria, baixar } from "./Galeria";
import { Decorrido, useGerar, type EstadoGeracao } from "./useGerar";
import s from "@/app/(pt)/crm/crm.module.css";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export function Criar({
  ctx,
  recentes,
  inicial,
}: {
  ctx: Contexto;
  recentes: Imagem[];
  inicial: { referencia: Imagem | null; variacao: Imagem | null; projeto: string | null };
}) {
  const router = useRouter();
  const v = inicial.variacao;
  const [params, setParams] = useState<Parametros>(() =>
    ajustarImagem({
      ...IMAGEM_PADRAO,
      ...(v?.modelo && modeloPorId(v.modelo) ? { modelo: v.modelo } : {}),
      ...(v?.qualidade ? { qualidade: v.qualidade as Parametros["qualidade"] } : {}),
      ...(v?.fundo ? { fundo: v.fundo as Parametros["fundo"] } : {}),
    }),
  );
  const [prompt, setPrompt] = useState(v?.prompt ?? "");
  const [refs, setRefs] = useState<RefLocal[]>(() => (inicial.referencia ? [refDeImagem(inicial.referencia)] : []));
  const [projetoId, setProjetoId] = useState(inicial.projeto ?? v?.projeto_id ?? "");
  const [variacaoDe, setVariacaoDe] = useState<Imagem | null>(v);
  const [atual, setAtual] = useState<Imagem | null>(null);
  const [sessao, setSessao] = useState<Imagem[]>([]);
  const [faltou, setFaltou] = useState<string | null>(null);
  const palco = useRef<HTMLDivElement>(null);

  const aoConcluir = useCallback((img: Imagem) => {
    setAtual(img);
    setSessao((x) => [img, ...x]);
    setVariacaoDe(null);
  }, []);
  const { estado, gerar, cancelar, limparErro, confirmacao, gerando } = useGerar({
    confirmarAntes: ctx.config.confirmar_antes,
    aoConcluir,
  });

  const bloqueio = ctx.semTabela
    ? "Rode o supabase/ai-studio.sql antes."
    : !ctx.temChave
      ? "Falta a chave do OpenRouter."
      : refsSubindo(refs)
        ? "Esperando as referências subirem."
        : null;

  function enviar() {
    setFaltou(null);
    if (!variacaoDe && !prompt.trim()) {
      setFaltou("Descreva a imagem antes de gerar.");
      return;
    }
    if (window.matchMedia("(max-width: 860px)").matches) palco.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    gerar({
      origem: variacaoDe ? "variacao" : "criar",
      prompt,
      ...params,
      referencias: refsParaEnvio(refs),
      base_id: variacaoDe?.id ?? null,
      projeto_id: projetoId || null,
    });
  }

  const maxRefs = (modeloPorId(params.modelo)?.maxRefs ?? 16) - (variacaoDe ? 1 : 0);

  return (
    <>
      {confirmacao}
      <div className={a.mesa}>
        <div className={a.controles}>
          <Parametros valor={params} onChange={setParams} />

          {ctx.projetos.length > 0 && (
            <div className={a.secao}>
              <label className={a.rot} htmlFor="ai-projeto">
                Projeto
              </label>
              <select id="ai-projeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)}>
                <option value="">Sem projeto</option>
                {ctx.projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Referencias uid={ctx.uid} refs={refs} onChange={setRefs} max={maxRefs} />

          <div className={`${a.secao} ${a.prompt}`}>
            <label className={a.rot} htmlFor="ai-prompt">
              Prompt
            </label>
            {variacaoDe && (
              <div className={a.origemChip}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {variacaoDe.urlMini && <img src={variacaoDe.urlMini} alt="" />}
                <span>Variação desta imagem</span>
                <button type="button" className={s.btnMini} onClick={() => setVariacaoDe(null)}>
                  Tirar
                </button>
              </div>
            )}
            <textarea
              id="ai-prompt"
              value={prompt}
              maxLength={PROMPT_MAX}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={variacaoDe ? "Opcional: o que muda nesta variação..." : "Descreva a imagem que você deseja criar..."}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !gerando && !bloqueio) enviar();
              }}
            />
            <span className={a.contador}>
              {prompt.length.toLocaleString("pt-BR")} / {PROMPT_MAX.toLocaleString("pt-BR")}
            </span>
          </div>

          <div className={a.gerar}>
            <button type="button" className={s.btnAcao} onClick={enviar} disabled={gerando || Boolean(bloqueio)}>
              {gerando ? "Criando…" : variacaoDe ? "✦ Gerar variação" : "✦ Gerar imagem"}
            </button>
            {(bloqueio || faltou) && <span className={a.notaAlerta}>{faltou ?? bloqueio}</span>}
            <span className={a.estimativa}>Imagem cobra por token: o custo real, devolvido pelo OpenRouter, aparece depois de gerar.</span>
          </div>
        </div>

        <div ref={palco}>
          <Palco
            estado={estado}
            atual={atual}
            proporcao={params.proporcao}
            sessao={sessao}
            projetos={ctx.projetos}
            onCancelar={cancelar}
            onTentar={(corpo) => gerar(corpo)}
            onFecharErro={limparErro}
            onEscolher={setAtual}
            onVariacao={(img) =>
              gerar({ origem: "variacao", prompt: "", ...params, base_id: img.id, projeto_id: img.projeto_id ?? (projetoId || null) })
            }
            onEditar={(img) => router.push(`/crm/ai-studio/editar?imagem=${img.id}`)}
          />
        </div>
      </div>

      <Galeria
        imagens={recentes}
        projetos={ctx.projetos}
        titulo="Galeria recente"
        onUsarReferencia={(img) => setRefs((x) => (x.length < maxRefs ? [...x, refDeImagem(img)] : x))}
      />
    </>
  );
}

export function refDeImagem(img: Imagem): RefLocal {
  return { chave: crypto.randomUUID(), caminho: img.caminho, funcao: "geral", preview: img.urlMini ?? img.url ?? "" };
}

export function aspecto(proporcao: string) {
  const m = /^(\d+):(\d+)$/.exec(proporcao);
  return m ? { l: Number(m[1]), a: Number(m[2]) } : { l: 1, a: 1 };
}

function Palco({
  estado,
  atual,
  proporcao,
  sessao,
  projetos,
  onCancelar,
  onTentar,
  onFecharErro,
  onEscolher,
  onVariacao,
  onEditar,
}: {
  estado: EstadoGeracao;
  atual: Imagem | null;
  proporcao: string;
  sessao: Imagem[];
  projetos: Contexto["projetos"];
  onCancelar: () => void;
  onTentar: (corpo: Extract<EstadoGeracao, { fase: "erro" }>["corpo"]) => void;
  onFecharErro: () => void;
  onEscolher: (img: Imagem) => void;
  onVariacao: (img: Imagem) => void;
  onEditar: (img: Imagem) => void;
}) {
  const router = useRouter();
  const { l, a: alt } = aspecto(proporcao);
  const [destino, setDestino] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const moldura = (
    <div className={`${a.moldura} ${estado.fase === "gerando" ? a.molduraViva : ""}`} style={{ aspectRatio: `${l} / ${alt}` }}>
      {estado.fase === "gerando" ? (
        <>
          <b>Criando sua imagem...</b>
          <span className={a.relogio}>
            <i aria-hidden="true" />
            <Decorrido inicio={estado.inicio} />
          </span>
          <span>Pode levar até uns 2 minutos nas qualidades mais altas e em 4K.</span>
          <button type="button" className={a.btnClaro} onClick={onCancelar} style={{ marginTop: 6 }}>
            Cancelar
          </button>
        </>
      ) : (
        <>
          <b>A imagem aparece aqui</b>
          <span>{proporcao === "auto" ? "proporção automática" : `proporção ${proporcao}`}</span>
        </>
      )}
    </div>
  );

  return (
    <div className={a.palco} aria-live="polite">
      <div className={a.quadroPalco}>
        {estado.fase === "erro" ? (
          <div className={a.falha} role="alert">
            <b>Não saiu desta vez</b>
            <p>{estado.frase}</p>
            <div className={a.acoesPalco}>
              <button type="button" className={`${a.btnClaro} ${a.btnClaroForte}`} onClick={() => onTentar(estado.corpo)}>
                Tentar de novo
              </button>
              <button type="button" className={a.btnClaro} onClick={onFecharErro}>
                Fechar
              </button>
            </div>
          </div>
        ) : estado.fase === "gerando" || !atual?.url ? (
          moldura
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={atual.url} alt={atual.prompt.slice(0, 160) || "Imagem gerada"} />
        )}
      </div>

      {atual && estado.fase !== "gerando" && (
        <div className={`${a.palcoPe} ${pendente ? a.ocupado : ""}`}>
          <span className={a.ficha}>
            <b>{modeloPorId(atual.modelo ?? "")?.curto}</b> · {QUALIDADES[atual.qualidade as keyof typeof QUALIDADES] ?? atual.qualidade} ·{" "}
            {atual.largura}×{atual.altura} · {usd(atual.custo_usd === null ? null : Number(atual.custo_usd), 4)}
          </span>
          <div className={a.acoesPalco}>
            <button type="button" className={`${a.btnClaro} ${a.btnClaroForte}`} onClick={() => baixar(atual.id).then((e) => e && setAviso({ ok: false, texto: e }))}>
              Baixar
            </button>
            <button type="button" className={a.btnClaro} onClick={() => onEditar(atual)}>
              Editar
            </button>
            <button type="button" className={a.btnClaro} onClick={() => onVariacao(atual)}>
              Nova variação
            </button>
            {projetos.length > 0 && (
              <>
                <select aria-label="Projeto de destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
                  <option value="">Projeto…</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={a.btnClaro}
                  disabled={!destino}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await moverImagem(atual.id, destino);
                      setAviso(r.ok ? { ok: true, texto: "Adicionada ao projeto." } : { ok: false, texto: r.erro });
                      if (r.ok) router.refresh();
                    })
                  }
                >
                  Adicionar ao projeto
                </button>
              </>
            )}
            {projetos.length === 0 && (
              <button type="button" className={a.btnClaro} onClick={() => router.push("/crm/ai-studio/projetos")}>
                Adicionar ao projeto
              </button>
            )}
          </div>
          {aviso && <span className={`${a.aviso} ${aviso.ok ? a.avisoOk : a.avisoErro}`}>{aviso.texto}</span>}
        </div>
      )}

      {sessao.length > 1 && (
        <div className={a.sessao} aria-label="Nesta sessão">
          {sessao.map((img) => (
            <button key={img.id} type="button" className={img.id === atual?.id ? a.sessaoAtiva : ""} onClick={() => onEscolher(img)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img.urlMini && <img src={img.urlMini} alt="" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
