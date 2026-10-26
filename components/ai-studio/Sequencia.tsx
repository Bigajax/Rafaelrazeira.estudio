"use client";

/* ============================================================
   A SEQUÊNCIA CINEMATOGRÁFICA

   Uma timeline horizontal de quadros e, embaixo, o quadro aberto. A
   continuidade vem de um lugar só: a imagem de referência principal entra
   como IMAGEM 1 do pedido, e o prompt montado (lib/ai-studio/prompt.ts)
   manda manter estilo, paleta, luz, lente e identidade dela, salvo o que a
   instrução mudar. O nome e a descrição do projeto entram como contexto.

   Três pedidos, conforme o quadro aberto:
     Próximo quadro      cria um quadro logo depois e gera a partir do aberto
     Nova versão         edita o quadro aberto; a versão nova vira a atual
     Gerar este quadro   o quadro está vazio: gera, a partir do anterior se
                         houver (dá para desligar)

   Se a geração do "próximo" falhar, o quadro novo fica vazio na timeline,
   à vista, com o "Gerar este quadro" pronto para tentar de novo.
   Reordenar é por setas, nunca só arrastando (a regra da casa).
   Cada quadro com imagem leva ao Vídeo: ele vira o primeiro quadro do
   clipe, e o quadro seguinte, o último.
   ============================================================ */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  adicionarQuadro,
  definirVersao,
  duplicarQuadro,
  excluirQuadro,
  moverQuadro,
  renomearQuadro,
} from "@/app/(pt)/crm/acoes-ai-studio";
import { IMAGEM_PADRAO, PRESERVACOES, PROMPT_MAX, modeloPorId } from "@/lib/ai-studio/modelos";
import type { Contexto, Imagem, QuadroVista } from "@/lib/ai-studio/tipos";
import { Parametros, Referencias, refsParaEnvio, refsSubindo, type RefLocal } from "./Controles";
import { baixar, quando } from "./Galeria";
import { Decorrido, useGerar } from "./useGerar";
import s from "@/app/(pt)/crm/crm.module.css";
import a from "@/app/(pt)/crm/ai-studio.module.css";

type Modo = "proximo" | "versao" | "gerar";

export function Sequencia({
  projeto,
  quadros,
  imagensProjeto,
  ctx,
}: {
  projeto: { id: string; nome: string };
  quadros: QuadroVista[];
  imagensProjeto: Imagem[];
  ctx: Contexto;
}) {
  const router = useRouter();
  const [selId, setSelId] = useState<string | null>(quadros[0]?.id ?? null);
  const sel = quadros.find((q) => q.id === selId) ?? quadros[0] ?? null;
  const idx = sel ? quadros.indexOf(sel) : -1;
  const anterior = idx > 0 ? quadros[idx - 1] : null;

  const [modo, setModo] = useState<Modo>(sel?.imagem ? "proximo" : "gerar");
  const [instrucao, setInstrucao] = useState("");
  const [nomeProximo, setNomeProximo] = useState("");
  const [refPrincipal, setRefPrincipal] = useState<Imagem | null>(null);
  const [semRef, setSemRef] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const [preservar, setPreservar] = useState<string[]>([]);
  const [refs, setRefs] = useState<RefLocal[]>([]);
  /* quadro de vídeo: 16:9 por padrão, e o Nano Banana Pro dá 4K */
  const [params, setParams] = useState<Parametros>(IMAGEM_PADRAO);
  const [nome, setNome] = useState(sel?.nome ?? "");
  const [apagar, setApagar] = useState(false);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  /* ao abrir outro quadro, o painel volta ao estado natural dele */
  useEffect(() => {
    setNome(sel?.nome ?? "");
    setModo(sel?.imagem ? "proximo" : "gerar");
    setRefPrincipal(null);
    setSemRef(false);
    setEscolhendo(false);
    setApagar(false);
    setAviso(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.id]);

  const aoConcluir = useCallback(() => {
    setInstrucao("");
    setNomeProximo("");
    setAlvo(null);
  }, []);
  const { estado, gerar, cancelar, limparErro, confirmacao, gerando } = useGerar({
    confirmarAntes: ctx.config.confirmar_antes,
    aoConcluir,
  });
  useEffect(() => {
    if (estado.fase === "erro") setAlvo(null);
  }, [estado.fase]);

  /* a referência principal: a escolhida à mão, ou a natural do modo */
  const naturalRef = modo === "gerar" ? (anterior?.imagem ?? null) : (sel?.imagem ?? null);
  const principal = semRef ? null : (refPrincipal ?? naturalRef);

  function agir(fn: () => Promise<{ ok: boolean; erro?: string; id?: string }>, depois?: (id?: string) => void) {
    setAviso(null);
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return setAviso(r.erro ?? "Não deu certo.");
      router.refresh();
      depois?.(r.id);
    });
  }

  async function enviar() {
    if (!sel) return;
    if (!instrucao.trim()) return setAviso(modo === "versao" ? "Diga o que muda nesta versão." : "Descreva a cena.");
    setAviso(null);
    const comum = { ...params, referencias: refsParaEnvio(refs), projeto_id: projeto.id };

    if (modo === "proximo") {
      const r = await adicionarQuadro(projeto.id, { nome: nomeProximo, aposId: sel.id });
      if (!r.ok) return setAviso(r.erro);
      setSelId(r.id);
      setAlvo(r.id);
      router.refresh();
      gerar({ ...comum, origem: "quadro", prompt: instrucao, base_id: principal?.id ?? null, quadro_id: r.id });
    } else if (modo === "versao" && sel.imagem) {
      setAlvo(sel.id);
      gerar({ ...comum, origem: "editar", prompt: instrucao, preservar, base_id: principal?.id ?? sel.imagem.id, quadro_id: sel.id });
    } else {
      setAlvo(sel.id);
      gerar({ ...comum, origem: "quadro", prompt: instrucao, base_id: principal?.id ?? null, quadro_id: sel.id });
    }
  }

  const bloqueio = !ctx.temChave ? "Falta a chave do OpenRouter." : refsSubindo(refs) ? "Esperando as referências subirem." : null;
  const candidatas = imagensProjeto.filter((i) => i.urlMini);

  return (
    <section>
      {confirmacao}
      <div className={a.secaoCab}>
        <h2>Sequência</h2>
        <span className={a.nota}>
          {quadros.length} {quadros.length === 1 ? "quadro" : "quadros"} · cada par de quadros vira um clipe: o primeiro e o último quadro do vídeo
        </span>
      </div>

      <ol className={a.timeline} aria-label="Quadros da sequência" style={{ listStyle: "none", margin: 0 }}>
        {quadros.map((q, i) => (
          <li key={q.id}>
            <button
              type="button"
              className={`${a.quadro} ${q.id === sel?.id ? a.quadroAtivo : ""}`}
              onClick={() => setSelId(q.id)}
              aria-current={q.id === sel?.id ? "true" : undefined}
            >
              <div className={a.quadroImg} style={q.imagem?.urlMini ? { backgroundImage: `url("${q.imagem.urlMini}")` } : undefined}>
                {q.id === alvo && gerando ? "gerando…" : q.imagem ? null : "vazio"}
              </div>
              <div className={a.quadroTexto}>
                <i>{String(i + 1).padStart(2, "0")}</i>
                <b>{q.nome || "Sem nome"}</b>
                <span>
                  {quando(q.imagem?.created_at ?? q.created_at)} · {q.versoes.length} {q.versoes.length === 1 ? "versão" : "versões"}
                </span>
              </div>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={a.quadroNovo}
            style={{ height: "100%", minHeight: 150 }}
            disabled={pendente}
            onClick={() => agir(() => adicionarQuadro(projeto.id), (id) => id && setSelId(id))}
          >
            + Adicionar quadro
          </button>
        </li>
      </ol>

      {!sel ? (
        <div className={a.vazioGaleria}>
          <b>A sequência começa no primeiro quadro</b>
          Toque em “Adicionar quadro” e gere a cena de abertura, ou abra uma imagem da galeria e use “Adicionar à sequência”.
        </div>
      ) : (
        <div className={`${a.aberto} ${pendente ? a.ocupado : ""}`}>
          <div>
            <div className={a.abertoImg}>
              {sel.id === alvo && gerando && estado.fase === "gerando" ? (
                <div className={`${a.moldura} ${a.molduraViva}`}>
                  <b>Criando sua imagem...</b>
                  <span className={a.relogio}>
                    <i aria-hidden="true" />
                    <Decorrido inicio={estado.inicio} />
                  </span>
                  <button type="button" className={a.btnClaro} onClick={cancelar}>
                    Cancelar
                  </button>
                </div>
              ) : estado.fase === "erro" ? (
                <div className={a.falha} role="alert">
                  <b>Não saiu desta vez</b>
                  <p>{estado.frase}</p>
                  <div className={a.acoesPalco}>
                    <button type="button" className={`${a.btnClaro} ${a.btnClaroForte}`} onClick={() => gerar(estado.corpo)}>
                      Tentar de novo
                    </button>
                    <button type="button" className={a.btnClaro} onClick={limparErro}>
                      Fechar
                    </button>
                  </div>
                </div>
              ) : sel.imagem?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sel.imagem.url} alt={sel.nome} />
              ) : (
                <div className={a.moldura}>
                  <b>Quadro vazio</b>
                  <span>Descreva a cena ao lado e gere.</span>
                </div>
              )}
            </div>

            {sel.versoes.length > 1 && (
              <>
                <p className={a.rot} style={{ marginTop: 12 }}>
                  Versões deste quadro <small>toque para usar como atual</small>
                </p>
                <div className={a.versoes}>
                  {sel.versoes.map((v, i) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`${a.versao} ${v.id === sel.imagem_id ? a.versaoAtiva : ""}`}
                      onClick={() => v.id !== sel.imagem_id && agir(() => definirVersao(sel.id, v.id))}
                      title={v.prompt.slice(0, 120)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {v.urlMini && <img src={v.urlMini} alt="" />}
                      <span>
                        v{i + 1}
                        {v.id === sel.imagem_id ? " · atual" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className={a.abertoInfo}>
            <div className={a.secao}>
              <span className={a.rot}>
                Quadro {String(idx + 1).padStart(2, "0")}
                <small>{quando(sel.created_at)}</small>
              </span>
              <form
                className={a.nomeQuadro}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (nome.trim() !== sel.nome) agir(() => renomearQuadro(sel.id, nome));
                }}
              >
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} aria-label="Nome do quadro" />
                <button type="submit" className={s.btnMini} disabled={nome.trim() === sel.nome}>
                  Renomear
                </button>
              </form>
              {sel.imagem?.prompt && <p className={a.promptUsado}>{sel.imagem.prompt}</p>}
            </div>

            <div className={a.linhaBotoes}>
              <button type="button" className={s.btnMini} disabled={idx <= 0} onClick={() => agir(() => moverQuadro(sel.id, -1))} aria-label="Mover para a esquerda">
                ←
              </button>
              <button type="button" className={s.btnMini} disabled={idx >= quadros.length - 1} onClick={() => agir(() => moverQuadro(sel.id, 1))} aria-label="Mover para a direita">
                →
              </button>
              <button type="button" className={s.btnMini} onClick={() => agir(() => duplicarQuadro(sel.id), (id) => id && setSelId(id))}>
                Duplicar
              </button>
              {sel.imagem && (
                <button type="button" className={s.btnMini} onClick={() => baixar(sel.imagem!.id).then((e) => e && setAviso(e))}>
                  Baixar
                </button>
              )}
              {sel.imagem && (
                <button
                  type="button"
                  className={s.btnMini}
                  title="Este quadro é o primeiro quadro do vídeo; o próximo, se tiver imagem, é o último"
                  onClick={() => {
                    const prox = quadros[idx + 1]?.imagem;
                    router.push(`/crm/ai-studio?primeiro=${sel.imagem!.id}${prox ? `&ultimo=${prox.id}` : ""}&projeto=${projeto.id}`);
                  }}
                >
                  {quadros[idx + 1]?.imagem ? "Vídeo até o próximo quadro" : "Vídeo a partir deste quadro"}
                </button>
              )}
              {sel.imagem && (
                <button type="button" className={s.btnMini} onClick={() => router.push(`/crm/ai-studio/editar?imagem=${sel.imagem!.id}`)}>
                  Abrir no editor
                </button>
              )}
              {apagar ? (
                <>
                  <button type="button" className={s.btnMini} style={{ borderColor: "var(--rosa)", color: "var(--rosa-dark)" }} onClick={() => agir(() => excluirQuadro(sel.id), () => setSelId(null))}>
                    Excluir mesmo
                  </button>
                  <button type="button" className={s.btnMini} onClick={() => setApagar(false)}>
                    Manter
                  </button>
                </>
              ) : (
                <button type="button" className={s.btnMini} onClick={() => setApagar(true)}>
                  Excluir quadro
                </button>
              )}
            </div>

            {/* ---------- o pedido ---------- */}
            <div className={a.secao}>
              <div className={a.segmentos} role="radiogroup" aria-label="O que gerar">
                {sel.imagem ? (
                  <>
                    <button type="button" role="radio" aria-checked={modo === "proximo"} className={`${a.seg} ${modo === "proximo" ? a.segAtivo : ""}`} onClick={() => setModo("proximo")}>
                      Gerar próximo quadro
                    </button>
                    <button type="button" role="radio" aria-checked={modo === "versao"} className={`${a.seg} ${modo === "versao" ? a.segAtivo : ""}`} onClick={() => setModo("versao")}>
                      Editar quadro
                    </button>
                  </>
                ) : (
                  <button type="button" role="radio" aria-checked className={`${a.seg} ${a.segAtivo}`}>
                    Gerar este quadro
                  </button>
                )}
              </div>
            </div>

            {modo === "proximo" && (
              <div className={a.secao}>
                <label className={a.rot} htmlFor="ai-nome-proximo">
                  Nome do próximo quadro
                </label>
                <input
                  id="ai-nome-proximo"
                  type="text"
                  value={nomeProximo}
                  onChange={(e) => setNomeProximo(e.target.value)}
                  placeholder={`Cena ${String(quadros.length + 1).padStart(2, "0")}`}
                  maxLength={120}
                />
              </div>
            )}

            <div className={`${a.secao} ${a.prompt}`}>
              <label className={a.rot} htmlFor="ai-cena">
                {modo === "versao" ? "O que muda nesta versão?" : "Como a cena continua?"}
              </label>
              <textarea
                id="ai-cena"
                value={instrucao}
                maxLength={PROMPT_MAX}
                onChange={(e) => setInstrucao(e.target.value)}
                placeholder={
                  modo === "versao"
                    ? "Ex.: mantenha o enquadramento, mas faça o gelo começar a se formar."
                    : principal
                      ? "Ex.: continue a cena com a câmera se aproximando lentamente do animal."
                      : "Descreva a cena de abertura: produto, ambiente, luz, lente."
                }
              />
            </div>

            {modo === "versao" && (
              <div className={a.chips}>
                {PRESERVACOES.map((t) => {
                  const on = preservar.includes(t);
                  return (
                    <button key={t} type="button" aria-pressed={on} className={`${a.chip} ${on ? a.chipAtivo : ""}`} onClick={() => setPreservar((x) => (on ? x.filter((y) => y !== t) : [...x, t]))}>
                      {t}
                    </button>
                  );
                })}
              </div>
            )}

            <div className={a.secao}>
              <span className={a.rot}>Referência principal</span>
              {principal ? (
                <div className={a.refPrincipal}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {principal.urlMini && <img src={principal.urlMini} alt="" />}
                  <div>
                    <b>Imagem 1 do pedido</b>
                    <span>
                      {refPrincipal ? "escolhida à mão" : modo === "gerar" ? "o quadro anterior" : "este quadro"}: estilo, luz e identidade
                      seguem dela
                    </span>
                  </div>
                </div>
              ) : (
                <span className={a.nota}>Nenhuma: o quadro nasce só do texto e das referências abaixo.</span>
              )}
              <div className={a.linhaBotoes}>
                <button type="button" className={s.btnMini} onClick={() => setEscolhendo((x) => !x)} disabled={!candidatas.length}>
                  Definir imagem de referência
                </button>
                {principal && modo !== "versao" && (
                  <button type="button" className={s.btnMini} onClick={() => { setSemRef(true); setRefPrincipal(null); }}>
                    Sem referência
                  </button>
                )}
                {(semRef || refPrincipal) && (
                  <button type="button" className={s.btnMini} onClick={() => { setSemRef(false); setRefPrincipal(null); }}>
                    Voltar ao padrão
                  </button>
                )}
              </div>
              {escolhendo && (
                <div className={a.seletor}>
                  {candidatas.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      className={img.id === principal?.id ? a.seletorAtivo : ""}
                      onClick={() => {
                        setRefPrincipal(img);
                        setSemRef(false);
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

            <Referencias
              uid={ctx.uid}
              refs={refs}
              onChange={setRefs}
              max={(modeloPorId(params.modelo)?.maxRefs ?? 16) - (principal ? 1 : 0)}
              titulo="Referências adicionais"
              texto="Produto, personagem ou estilo que precisam aparecer."
            />

            <Parametros valor={params} onChange={setParams} />

            <div className={a.gerar}>
              <button type="button" className={s.btnAcao} onClick={() => void enviar()} disabled={gerando || pendente || Boolean(bloqueio)}>
                {gerando ? "Criando…" : modo === "proximo" ? "✦ Gerar próximo quadro" : modo === "versao" ? "✦ Gerar nova versão" : "✦ Gerar este quadro"}
              </button>
              {(bloqueio || aviso) && <span className={a.notaAlerta}>{aviso ?? bloqueio}</span>}
              <span className={a.estimativa}>A continuidade não é garantida: confira cada quadro antes de animar.</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
