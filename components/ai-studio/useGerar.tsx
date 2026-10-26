"use client";

/* ============================================================
   O PEDIDO DE GERAÇÃO, do lado do navegador

   Um só caminho para criar, editar, variar e gerar quadro:
   - uma chave nova por clique (o banco recusa a segunda chegada da mesma);
   - um pedido por vez neste hook: enquanto há um em curso, o segundo
     clique não sai (e o botão já está desabilitado);
   - "Cancelar" aborta o fetch, e a rota repassa o aborto ao OpenRouter (imagem cancelada não é cobrada);
   - com "Confirmar antes de gerar" ligado, o pedido para num modal com a
     ficha e a estimativa antes de sair;
   - o relógio é o tempo real decorrido. Nada de porcentagem inventada.
   ============================================================ */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FUNDOS, QUALIDADES, modeloPorId, type Fundo, type Qualidade } from "@/lib/ai-studio/modelos";
import type { Imagem } from "@/lib/ai-studio/tipos";
import s from "@/app/(pt)/crm/crm.module.css";
import a from "@/app/(pt)/crm/ai-studio.module.css";

export type CorpoGeracao = {
  origem: "criar" | "editar" | "variacao" | "quadro";
  prompt: string;
  preservar?: string[];
  modelo: string;
  qualidade: Qualidade;
  proporcao: string;
  resolucao: string;
  fundo: Fundo;
  referencias?: { caminho: string; funcao: string }[];
  base_id?: string | null;
  projeto_id?: string | null;
  quadro_id?: string | null;
};

export type EstadoGeracao =
  | { fase: "ocioso" }
  | { fase: "gerando"; inicio: number }
  | { fase: "erro"; frase: string; corpo: CorpoGeracao };

const NOMES_ORIGEM: Record<CorpoGeracao["origem"], string> = {
  criar: "Criar imagem",
  editar: "Aplicar alteração",
  variacao: "Nova variação",
  quadro: "Gerar quadro",
};

export function useGerar(opcoes: { confirmarAntes: boolean; aoConcluir: (img: Imagem, corpo: CorpoGeracao) => void }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoGeracao>({ fase: "ocioso" });
  const [pendente, setPendente] = useState<CorpoGeracao | null>(null);
  const emCurso = useRef<AbortController | null>(null);
  const concluir = useRef(opcoes.aoConcluir);
  useEffect(() => {
    concluir.current = opcoes.aoConcluir;
  });

  const enviar = useCallback(
    async (corpo: CorpoGeracao) => {
      if (emCurso.current) return;
      const ctrl = new AbortController();
      emCurso.current = ctrl;
      setEstado({ fase: "gerando", inicio: Date.now() });
      try {
        const r = await fetch("/api/ai-studio/gerar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...corpo, chave: crypto.randomUUID() }),
          signal: ctrl.signal,
        });
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; erro?: string; imagem?: Imagem };
        if (!r.ok || !j.ok || !j.imagem) {
          setEstado({ fase: "erro", frase: j.erro || `A geração falhou (${r.status}).`, corpo });
          return;
        }
        setEstado({ fase: "ocioso" });
        concluir.current(j.imagem, corpo);
        router.refresh();
      } catch (e) {
        const cancelado = e instanceof DOMException && e.name === "AbortError";
        setEstado(
          cancelado
            ? { fase: "erro", frase: "Pedido cancelado. Imagem que não chega não é cobrada pelo OpenRouter.", corpo }
            : { fase: "erro", frase: "A conexão caiu antes da resposta. Confira a galeria antes de tentar de novo: a imagem pode ter sido criada.", corpo },
        );
        router.refresh();
      } finally {
        emCurso.current = null;
      }
    },
    [router],
  );

  const gerar = useCallback(
    (corpo: CorpoGeracao) => {
      if (emCurso.current) return;
      if (opcoes.confirmarAntes) setPendente(corpo);
      else void enviar(corpo);
    },
    [enviar, opcoes.confirmarAntes],
  );

  const cancelar = useCallback(() => emCurso.current?.abort(), []);
  const limparErro = useCallback(() => setEstado({ fase: "ocioso" }), []);

  const confirmacao: ReactNode = pendente ? (
    <Confirmar
      titulo={NOMES_ORIGEM[pendente.origem]}
      linhas={fichaImagem(pendente)}
      onVoltar={() => setPendente(null)}
      onConfirmar={() => {
        const c = pendente;
        setPendente(null);
        void enviar(c);
      }}
    />
  ) : null;

  return { estado, gerar, cancelar, limparErro, confirmacao, gerando: estado.fase === "gerando" };
}

/* o relógio real, de segundo em segundo */
export function Decorrido({ inicio }: { inicio: number }) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seg = Math.max(0, Math.floor((agora - inicio) / 1000));
  return <>{seg < 60 ? `${seg} s` : `${Math.floor(seg / 60)} min ${String(seg % 60).padStart(2, "0")} s`}</>;
}

function fichaImagem(corpo: CorpoGeracao): [string, string][] {
  const m = modeloPorId(corpo.modelo);
  const entradas = (corpo.base_id ? 1 : 0) + (corpo.referencias?.length ?? 0);
  return [
    ["Modelo", m?.nome ?? corpo.modelo],
    ...(m?.qualidades ? [["Qualidade", QUALIDADES[corpo.qualidade]] as [string, string]] : []),
    ["Formato", [corpo.proporcao === "auto" ? "proporção automática" : corpo.proporcao, m?.resolucoes ? corpo.resolucao : null].filter(Boolean).join(" · ")],
    ...(m?.fundos ? [["Fundo", FUNDOS[corpo.fundo]] as [string, string]] : []),
    ["Imagens", entradas ? `${entradas} de entrada` : "nenhuma de entrada"],
    ["Custo", "imagem cobra por token: o valor real aparece depois de gerar"],
  ];
}

/* O modal da casa com a ficha do pedido, antes de gastar. Serve à imagem
   e ao vídeo. */
export function Confirmar({
  titulo,
  linhas,
  onVoltar,
  onConfirmar,
}: {
  titulo: string;
  linhas: [string, string][];
  onVoltar: () => void;
  onConfirmar: () => void;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onVoltar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onVoltar]);

  return (
    <div className={s.fundo} role="dialog" aria-modal="true" aria-labelledby="confirmar-titulo" onClick={onVoltar}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <p className={s.modalRot}>Confirmar antes de gerar</p>
        <h2 id="confirmar-titulo">{titulo}</h2>
        <dl className={a.resumo}>
          {linhas.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className={s.modalPe}>
          <button type="button" className={s.btn} onClick={onVoltar}>
            Voltar
          </button>
          <button type="button" className={s.btnAcao} onClick={onConfirmar} autoFocus>
            Gerar
          </button>
        </div>
      </div>
    </div>
  );
}
