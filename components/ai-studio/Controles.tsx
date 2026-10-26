"use client";

/* Os controles que as três áreas dividem: os parâmetros da geração e as
   imagens de referência. Tudo que aparece aqui sai do catálogo em
   lib/ai-studio/modelos.ts: opção que o modelo não tem não é desenhada,
   e cada modelo mostra só os controles que tem no OpenRouter. */
import { useRef, useState } from "react";
import {
  FUNCOES,
  FUNDOS,
  MODELOS,
  QUALIDADES,
  ajustarImagem,
  modeloPorId,
  type FuncaoReferencia,
  type ParamsImagem,
} from "@/lib/ai-studio/modelos";
import { problemaDoArquivo, subirReferencia } from "./arquivos";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export type Parametros = ParamsImagem;

/* Um grupo de botões encostados: qualidade, proporção, resolução, fundo. */
export function Segmentos<T extends string>({
  rotulo,
  valores,
  valor,
  nome,
  onChange,
}: {
  rotulo: string;
  valores: readonly T[];
  valor: T;
  nome?: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <div className={a.secao}>
      <span className={a.rot}>{rotulo}</span>
      <div className={a.segmentos} role="radiogroup" aria-label={rotulo}>
        {valores.map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={v === valor}
            className={`${a.seg} ${v === valor ? a.segAtivo : ""}`}
            onClick={() => onChange(v)}
          >
            {nome ? nome(v) : v}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Os parâmetros da IMAGEM. Cada modelo mostra só os controles que tem no
   OpenRouter: os GPT Image têm qualidade e fundo; o Nano Banana Pro tem
   resolução (até 4K) e nenhum dos dois. */
export function Parametros({ valor, onChange }: { valor: Parametros; onChange: (p: Parametros) => void }) {
  const modelo = modeloPorId(valor.modelo) ?? MODELOS[0];
  const mudar = (parcial: Partial<Parametros>) => onChange(ajustarImagem({ ...valor, ...parcial }));

  return (
    <>
      <div className={a.secao}>
        <span className={a.rot}>Modelo de imagem</span>
        <div className={a.modelos} role="radiogroup" aria-label="Modelo de imagem">
          {MODELOS.map((m) => (
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

      {modelo.qualidades && (
        <Segmentos rotulo="Qualidade" valores={modelo.qualidades} valor={valor.qualidade} nome={(q) => QUALIDADES[q]} onChange={(qualidade) => mudar({ qualidade })} />
      )}
      {modelo.resolucoes && (
        <Segmentos rotulo="Resolução" valores={modelo.resolucoes} valor={valor.resolucao} onChange={(resolucao) => mudar({ resolucao })} />
      )}
      <Segmentos
        rotulo="Proporção"
        valores={modelo.proporcoes}
        valor={valor.proporcao}
        nome={(p) => (p === "auto" ? "Auto" : p)}
        onChange={(proporcao) => mudar({ proporcao })}
      />
      {!modelo.resolucoes && (
        <span className={a.nota}>Os GPT Image escolhem o tamanho em pixels pela proporção. Imagem em 4K: use o Nano Banana Pro.</span>
      )}
      {modelo.fundos && (
        <Segmentos rotulo="Fundo" valores={modelo.fundos} valor={valor.fundo} nome={(f) => FUNDOS[f]} onChange={(fundo) => mudar({ fundo })} />
      )}
    </>
  );
}

/* ============================================================
   AS REFERÊNCIAS
   ============================================================ */
export type RefLocal = {
  chave: string;
  caminho: string | null;
  funcao: FuncaoReferencia;
  preview: string;
  erro?: string;
};

export function Referencias({
  uid,
  refs,
  onChange,
  max,
  titulo = "Referências",
  texto = "Adicione imagens para orientar a criação.",
}: {
  uid: string;
  refs: RefLocal[];
  onChange: (fn: (atual: RefLocal[]) => RefLocal[]) => void;
  max: number;
  titulo?: string;
  texto?: string;
}) {
  const [ativo, setAtivo] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function receber(lista: FileList | null) {
    if (!lista?.length) return;
    setAviso(null);
    const vagas = max - refs.length;
    const arquivos = [...lista];
    if (arquivos.length > vagas) setAviso(`Cabem só mais ${Math.max(0, vagas)} imagens neste pedido (o teto do modelo).`);
    for (const f of arquivos.slice(0, Math.max(0, vagas))) {
      const problema = problemaDoArquivo(f);
      if (problema) {
        setAviso(problema);
        continue;
      }
      const chave = crypto.randomUUID();
      const preview = URL.createObjectURL(f);
      onChange((atual) => [...atual, { chave, caminho: null, funcao: "geral", preview }]);
      subirReferencia(uid, f)
        .then((caminho) => onChange((atual) => atual.map((r) => (r.chave === chave ? { ...r, caminho } : r))))
        .catch((e: Error) => onChange((atual) => atual.map((r) => (r.chave === chave ? { ...r, erro: e.message } : r))));
    }
  }

  return (
    <div className={a.secao}>
      <span className={a.rot}>
        {titulo}
        <small>
          {refs.length}/{max}
        </small>
      </span>
      <label
        className={`${a.soltar} ${ativo ? a.soltarAtivo : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setAtivo(true);
        }}
        onDragLeave={() => setAtivo(false)}
        onDrop={(e) => {
          e.preventDefault();
          setAtivo(false);
          void receber(e.dataTransfer.files);
        }}
      >
        <b>+ Adicionar</b>
        <span>{texto}</span>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className={a.escondido}
          onChange={(e) => {
            void receber(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {aviso && <span className={a.notaAlerta}>{aviso}</span>}
      {refs.length > 0 && (
        <div className={a.refs}>
          {refs.map((r) => (
            <div key={r.chave} className={`${a.ref} ${!r.caminho && !r.erro ? a.refSubindo : ""} ${r.erro ? a.refErro : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.preview} alt="" />
              <select
                aria-label="Função da referência"
                value={r.funcao}
                onChange={(e) => {
                  const funcao = e.target.value as FuncaoReferencia;
                  onChange((atual) => atual.map((x) => (x.chave === r.chave ? { ...x, funcao } : x)));
                }}
              >
                {(Object.keys(FUNCOES) as FuncaoReferencia[]).map((f) => (
                  <option key={f} value={f}>
                    {FUNCOES[f].nome}
                  </option>
                ))}
              </select>
              {r.erro && <span className={a.notaAlerta}>{r.erro}</span>}
              <button
                type="button"
                className={a.refTirar}
                aria-label="Excluir referência"
                onClick={() => onChange((atual) => atual.filter((x) => x.chave !== r.chave))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* As referências prontas para o corpo do pedido (as que já subiram). */
export function refsParaEnvio(refs: RefLocal[]) {
  return refs.filter((r) => r.caminho && !r.erro).map((r) => ({ caminho: r.caminho as string, funcao: r.funcao }));
}

export function refsSubindo(refs: RefLocal[]) {
  return refs.some((r) => !r.caminho && !r.erro);
}
