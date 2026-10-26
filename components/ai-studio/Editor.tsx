"use client";

/* ============================================================
   02 · EDITAR — antes à esquerda, depois à direita

   A esquerda é a ENTRADA: a versão que vai para o modelo no próximo
   "Aplicar alteração". A direita é o resultado, ou qualquer versão
   escolhida na tira embaixo para comparar. "Continuar editando" passa a
   versão da direita para a esquerda: a próxima edição parte dela, não do
   zero, e nasce como filha dela no histórico.

   As instruções de preservação vão num bloco PRESERVAR separado no
   prompt (lib/ai-studio/prompt.ts). O modelo costuma respeitar, mas não
   há garantia: o aviso embaixo do botão diz isso.
   ============================================================ */
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { registrarUpload } from "@/app/(pt)/crm/acoes-ai-studio";
import { IMAGEM_PADRAO, PRESERVACOES, PROMPT_MAX, SUGESTOES_EDICAO, ajustarImagem, modeloPorId } from "@/lib/ai-studio/modelos";
import type { Contexto, Imagem } from "@/lib/ai-studio/tipos";
import { problemaDoArquivo, subirEntrada } from "./arquivos";
import { Parametros, Referencias, refsParaEnvio, refsSubindo, type RefLocal } from "./Controles";
import { baixar, quando } from "./Galeria";
import { Decorrido, useGerar } from "./useGerar";
import s from "@/app/(pt)/crm/crm.module.css";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export function Editor({ ctx, base, versoes }: { ctx: Contexto; base: Imagem | null; versoes: Imagem[] }) {
  const router = useRouter();
  const [entrada, setEntrada] = useState<Imagem | null>(base);
  const [resultado, setResultado] = useState<Imagem | null>(() => {
    if (!base) return null;
    const filhas = versoes.filter((v) => v.pai_id === base.id);
    return filhas[filhas.length - 1] ?? null;
  });
  const [lista, setLista] = useState<Imagem[]>(versoes);
  /* edição parte com proporção automática: o modelo mantém a da entrada */
  const [params, setParams] = useState<Parametros>(() =>
    ajustarImagem({
      ...IMAGEM_PADRAO,
      proporcao: "auto",
      ...(base?.modelo && modeloPorId(base.modelo) ? { modelo: base.modelo } : {}),
    }),
  );
  const [instrucao, setInstrucao] = useState("");
  const [preservar, setPreservar] = useState<string[]>([]);
  const [outra, setOutra] = useState("");
  const [refs, setRefs] = useState<RefLocal[]>([]);
  const [subindo, setSubindo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const aoConcluir = useCallback((img: Imagem) => {
    setResultado(img);
    setLista((x) => [...x, img]);
  }, []);
  const { estado, gerar, cancelar, limparErro, confirmacao, gerando } = useGerar({
    confirmarAntes: ctx.config.confirmar_antes,
    aoConcluir,
  });

  async function receberOriginal(arquivos: FileList | null) {
    const f = arquivos?.[0];
    if (!f) return;
    const problema = problemaDoArquivo(f);
    if (problema) return setAviso(problema);
    setAviso(null);
    setSubindo(true);
    try {
      const caminho = await subirEntrada(ctx.uid, f);
      const r = await registrarUpload(caminho, null);
      if (!r.ok) throw new Error(r.erro);
      router.replace(`/crm/ai-studio/editar?imagem=${r.id}`);
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "O upload falhou.");
      setSubindo(false);
    }
  }

  function aplicar() {
    if (!entrada) return;
    if (!instrucao.trim()) return setAviso("Diga o que você deseja modificar.");
    setAviso(null);
    gerar({
      origem: "editar",
      prompt: instrucao,
      preservar: [...preservar, outra].filter((t) => t.trim()),
      ...params,
      referencias: refsParaEnvio(refs),
      base_id: entrada.id,
      projeto_id: entrada.projeto_id,
    });
  }

  function continuar() {
    if (!resultado) return;
    setEntrada(resultado);
    setResultado(null);
    setInstrucao("");
    /* só a URL muda (para recarregar cair na mesma versão): sem navegação,
       a mesa não remonta e o modelo e as referências escolhidos ficam */
    window.history.replaceState(null, "", `/crm/ai-studio/editar?imagem=${resultado.id}`);
  }

  const bloqueio = ctx.semTabela
    ? "Rode o supabase/ai-studio.sql antes."
    : !ctx.temChave
      ? "Falta a chave do OpenRouter."
      : refsSubindo(refs)
        ? "Esperando as referências subirem."
        : null;

  /* sem imagem: a porta de entrada é o upload (ou a galeria) */
  if (!entrada) {
    return (
      <div className={a.mesa}>
        <div className={a.controles}>
          <p className={a.nota}>
            Suba a imagem original, ou abra uma da galeria e toque em <b>Editar</b>. A edição parte dela e guarda cada versão.
          </p>
          <button type="button" className={s.btn} onClick={() => router.push("/crm/ai-studio/projetos")}>
            Escolher na galeria
          </button>
        </div>
        <label
          className={`${a.soltar} ${a.soltarGrande} ${subindo ? a.ocupado : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void receberOriginal(e.dataTransfer.files);
          }}
        >
          <b>{subindo ? "Subindo…" : "+ Imagem original"}</b>
          <span>Arraste ou escolha. PNG, JPEG ou WebP, até 25 MB.</span>
          {aviso && <span className={a.notaAlerta}>{aviso}</span>}
          <input
            type="file"
            accept="image/*"
            className={a.escondido}
            disabled={subindo || ctx.semTabela}
            onChange={(e) => {
              void receberOriginal(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    );
  }

  const direita = estado.fase === "gerando" ? null : resultado;
  const n = (img: Imagem) => lista.findIndex((x) => x.id === img.id) + 1;

  return (
    <>
      {confirmacao}
      <div className={a.mesa}>
        <div className={a.controles}>
          <div className={`${a.secao} ${a.prompt}`}>
            <label className={a.rot} htmlFor="ai-instrucao">
              O que você deseja modificar?
            </label>
            <textarea
              id="ai-instrucao"
              value={instrucao}
              maxLength={PROMPT_MAX}
              onChange={(e) => setInstrucao(e.target.value)}
              placeholder="Ex.: troque o cenário por um estúdio de concreto com luz lateral fria."
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !gerando && !bloqueio) aplicar();
              }}
            />
            <div className={a.chips}>
              {SUGESTOES_EDICAO.map((t) => (
                <button key={t} type="button" className={a.chip} onClick={() => setInstrucao((x) => (x.trim() ? `${x.trim()} ${t}.` : `${t}.`))}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className={a.secao}>
            <span className={a.rot}>Preservar</span>
            <div className={a.chips}>
              {PRESERVACOES.map((t) => {
                const on = preservar.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    className={`${a.chip} ${on ? a.chipAtivo : ""}`}
                    onClick={() => setPreservar((x) => (on ? x.filter((y) => y !== t) : [...x, t]))}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <input type="text" value={outra} onChange={(e) => setOutra(e.target.value)} placeholder="Outra instrução de preservação" maxLength={400} />
          </div>

          <Referencias
            uid={ctx.uid}
            refs={refs}
            onChange={setRefs}
            max={(modeloPorId(params.modelo)?.maxRefs ?? 16) - 1}
            titulo="Referências adicionais"
            texto="Imagens extras que orientam a alteração."
          />

          <Parametros valor={params} onChange={setParams} />

          <div className={a.gerar}>
            <button type="button" className={s.btnAcao} onClick={aplicar} disabled={gerando || Boolean(bloqueio)}>
              {gerando ? "Aplicando…" : "✦ Aplicar alteração"}
            </button>
            {(bloqueio || aviso) && <span className={a.notaAlerta}>{aviso ?? bloqueio}</span>}
            <span className={a.estimativa}>
              O custo real aparece depois de gerar. A preservação não é garantida: confira o resultado antes de usar.
            </span>
          </div>
        </div>

        <div>
          <div className={a.comparar} aria-live="polite">
            <div className={a.lado}>
              <div className={a.ladoRot}>
                <span>
                  Antes · <b>v{n(entrada)}</b>
                </span>
                <span>
                  {entrada.largura}×{entrada.altura}
                </span>
              </div>
              <div className={a.ladoImg}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {entrada.url && <img src={entrada.url} alt="Imagem de entrada" />}
              </div>
            </div>
            <div className={a.lado}>
              <div className={a.ladoRot}>
                <span>Depois{direita ? <> · <b>v{n(direita)}</b></> : null}</span>
                <span>{direita ? `${direita.largura}×${direita.altura}` : ""}</span>
              </div>
              <div className={a.ladoImg}>
                {estado.fase === "gerando" ? (
                  <div className={`${a.moldura} ${a.molduraViva}`} style={{ aspectRatio: `${entrada.largura ?? 1} / ${entrada.altura ?? 1}`, width: "min(100%, 420px)" }}>
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
                ) : direita?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={direita.url} alt="Imagem modificada" />
                ) : (
                  <div className={a.moldura} style={{ aspectRatio: `${entrada.largura ?? 1} / ${entrada.altura ?? 1}`, width: "min(100%, 420px)" }}>
                    <b>O resultado aparece aqui</b>
                  </div>
                )}
              </div>
            </div>
          </div>

          {direita && estado.fase !== "gerando" && (
            <div className={a.linhaBotoes} style={{ marginTop: 10 }}>
              <button type="button" className={s.btnAcao} onClick={continuar}>
                Continuar editando
              </button>
              <button type="button" className={s.btn} onClick={() => baixar(direita.id).then((e) => e && setAviso(e))}>
                Baixar
              </button>
              {direita.prompt && <span className={a.nota}>“{direita.prompt.slice(0, 140)}{direita.prompt.length > 140 ? "…" : ""}”</span>}
            </div>
          )}

          <div className={a.secaoCab}>
            <h2>Versões</h2>
            <span className={a.nota}>Toque numa versão para comparar. A marcada em rosa é a entrada.</span>
          </div>
          <div className={a.versoes}>
            {lista.map((img, i) => (
              <button
                key={img.id}
                type="button"
                className={`${a.versao} ${img.id === direita?.id ? a.versaoAtiva : ""} ${img.id === entrada.id ? a.versaoEntrada : ""}`}
                onClick={() => img.id !== entrada.id && setResultado(img)}
                title={`${img.origem === "upload" ? "Original enviada" : img.prompt.slice(0, 120)} · ${quando(img.created_at)}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img.urlMini && <img src={img.urlMini} alt="" />}
                <span>
                  v{i + 1}
                  {img.id === entrada.id ? " · entrada" : ""}
                </span>
              </button>
            ))}
          </div>
          {entrada.id !== lista[0]?.id && (
            <button type="button" className={s.btnMini} style={{ marginTop: 8 }} onClick={() => { setEntrada(lista[0]); setResultado(null); }}>
              Voltar a editar a partir da v1
            </button>
          )}
        </div>
      </div>
    </>
  );
}
