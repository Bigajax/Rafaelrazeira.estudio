"use client";

/* As fichas do check-in: cada parte da vitrine sobe as suas fotos.
   O arquivo vai do celular direto para o Storage, por URL assinada que a
   /api/checkin entrega uma por foto; três por vez, para não engasgar o 4G.
   Quando a leva toda termina, a rota avisa o celular do Rafael. */

import { useRef, useState } from "react";
import type { CategoriaCheckin } from "@/lib/checkin";
import type { FotoEnviada } from "@/lib/checkin-servidor";
import s from "./checkin.module.css";

type Item = {
  chave: string;
  caminho?: string;
  url: string;
  nota: string;
  notaSalva: string;
  estado: "fila" | "subindo" | "pronta" | "erro";
  progresso: number;
  arquivo?: File;
  apagando?: boolean;
  notaFalhou?: boolean;
};

const AO_MESMO_TEMPO = 3;
const TIPOS = "image/jpeg,image/png,image/webp,image/heic,image/heif";

async function api(corpo: Record<string, unknown>) {
  const r = await fetch("/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Falhou.");
  return j;
}

/* XHR e não fetch: o fetch não conta o progresso da subida */
function enviar(url: string, arquivo: File, aoAndar: (p: number) => void) {
  return new Promise<void>((ok, falha) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", arquivo.type || "image/jpeg");
    x.upload.onprogress = (e) => e.lengthComputable && aoAndar(e.loaded / e.total);
    x.onload = () => (x.status < 300 ? ok() : falha(new Error(`status ${x.status}`)));
    x.onerror = () => falha(new Error("rede"));
    x.send(arquivo);
  });
}

function tipoDe(f: File) {
  if (f.type) return f.type;
  const n = f.name.toLowerCase();
  return n.endsWith(".heic") ? "image/heic" : n.endsWith(".heif") ? "image/heif" : "";
}

export function EnvioDeFotos({ token, categorias, iniciais }: { token: string; categorias: CategoriaCheckin[]; iniciais: Record<string, FotoEnviada[]> }) {
  const [itens, setItens] = useState<Record<string, Item[]>>(() =>
    Object.fromEntries(
      categorias.map((k) => [
        k.id,
        (iniciais[k.id] ?? []).map((f) => ({ chave: f.caminho, caminho: f.caminho, url: f.url, nota: f.nota, notaSalva: f.nota, estado: "pronta" as const, progresso: 1 })),
      ]),
    ),
  );

  const mudar = (cat: string, chave: string, m: Partial<Item>) =>
    setItens((t) => ({ ...t, [cat]: t[cat].map((i) => (i.chave === chave ? { ...i, ...m } : i)) }));

  async function subirUma(cat: string, item: Item): Promise<boolean> {
    if (!item.arquivo) return false;
    mudar(cat, item.chave, { estado: "subindo", progresso: 0 });
    try {
      const { caminho, url } = await api({ acao: "subir", token, categoria: cat, tipo: tipoDe(item.arquivo) });
      await enviar(url, item.arquivo, (p) => mudar(cat, item.chave, { progresso: p }));
      mudar(cat, item.chave, { estado: "pronta", progresso: 1, caminho });
      return true;
    } catch {
      mudar(cat, item.chave, { estado: "erro" });
      return false;
    }
  }

  async function subirLeva(cat: string, leva: Item[]) {
    let proxima = 0;
    let certas = 0;
    const trabalhador = async () => {
      while (proxima < leva.length) {
        const i = leva[proxima++];
        if (await subirUma(cat, i)) certas++;
      }
    };
    await Promise.all(Array.from({ length: Math.min(AO_MESMO_TEMPO, leva.length) }, trabalhador));
    if (certas) api({ acao: "avisar", token, categoria: cat, quantas: certas }).catch(() => {});
  }

  function escolher(cat: string, lista: FileList | null) {
    if (!lista?.length) return;
    const leva: Item[] = Array.from(lista).map((f) => ({
      chave: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(f),
      nota: "",
      notaSalva: "",
      estado: "fila",
      progresso: 0,
      arquivo: f,
    }));
    setItens((t) => ({ ...t, [cat]: [...t[cat], ...leva] }));
    subirLeva(cat, leva);
  }

  async function guardarNota(cat: string, i: Item) {
    if (!i.caminho || i.nota.trim() === i.notaSalva.trim()) return;
    try {
      await api({ acao: "nota", token, caminho: i.caminho, nota: i.nota });
      mudar(cat, i.chave, { notaSalva: i.nota, notaFalhou: false });
    } catch {
      mudar(cat, i.chave, { notaFalhou: true });
    }
  }

  async function tirar(cat: string, i: Item) {
    if (!i.apagando) return mudar(cat, i.chave, { apagando: true });
    if (i.caminho) {
      try {
        await api({ acao: "apagar", token, caminho: i.caminho });
      } catch {
        return mudar(cat, i.chave, { apagando: false });
      }
    }
    setItens((t) => ({ ...t, [cat]: t[cat].filter((x) => x.chave !== i.chave) }));
  }

  return (
    <div className={s.fichas}>
      {categorias.map((k, n) => (
        <Ficha
          key={k.id}
          numero={n + 1}
          categoria={k}
          itens={itens[k.id]}
          aoEscolher={(l) => escolher(k.id, l)}
          aoEscrever={(i, nota) => mudar(k.id, i.chave, { nota })}
          aoSair={(i) => guardarNota(k.id, i)}
          aoTirar={(i) => tirar(k.id, i)}
          aoRepetir={(i) => subirUma(k.id, i).then((ok) => ok && api({ acao: "avisar", token, categoria: k.id, quantas: 1 }).catch(() => {}))}
        />
      ))}
    </div>
  );
}

function Ficha({
  numero,
  categoria,
  itens,
  aoEscolher,
  aoEscrever,
  aoSair,
  aoTirar,
  aoRepetir,
}: {
  numero: number;
  categoria: CategoriaCheckin;
  itens: Item[];
  aoEscolher: (l: FileList | null) => void;
  aoEscrever: (i: Item, nota: string) => void;
  aoSair: (i: Item) => void;
  aoTirar: (i: Item) => void;
  aoRepetir: (i: Item) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const prontas = itens.filter((i) => i.estado === "pronta").length;
  const subindo = itens.filter((i) => i.estado === "fila" || i.estado === "subindo").length;

  return (
    <section className={s.ficha} aria-labelledby={`t-${categoria.id}`}>
      <div className={s.ficha__topo}>
        <p className={s.ficha__num}>{String(numero).padStart(2, "0")}</p>
        <div className={s.ficha__texto}>
          <h2 id={`t-${categoria.id}`} className={s.ficha__nome}>
            {categoria.nome}
          </h2>
          <p className={s.ficha__dica}>{categoria.dica}</p>
        </div>
        <p className={s.contagem} aria-live="polite">
          {subindo ? `subindo ${subindo}` : prontas ? `${prontas} ${prontas > 1 ? "fotos" : "foto"}` : "vazia"}
        </p>
      </div>

      <input
        ref={entrada}
        type="file"
        accept={TIPOS}
        multiple
        hidden
        onChange={(e) => {
          aoEscolher(e.target.files);
          e.target.value = "";
        }}
      />
      <button type="button" className={s.botao} onClick={() => entrada.current?.click()}>
        <span aria-hidden="true">↑</span> Escolher fotos
      </button>

      {itens.length > 0 && (
        <ul className={s.grade}>
          {itens.map((i) => (
            <li key={i.chave} className={s.foto} data-estado={i.estado}>
              <div className={s.foto__quadro}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
                {i.estado !== "pronta" && (
                  <div className={s.foto__estado}>
                    {i.estado === "erro" ? (
                      <button type="button" className={s.repetir} onClick={() => aoRepetir(i)}>
                        Não subiu. Tentar de novo
                      </button>
                    ) : (
                      <span className={s.barra} style={{ ["--p" as string]: i.progresso }} />
                    )}
                  </div>
                )}
                {i.estado === "pronta" && <span className={s.selo}>✓</span>}
              </div>
              <label className={s.nota}>
                <span>Modelo, numeração, valor</span>
                <input
                  type="text"
                  value={i.nota}
                  maxLength={500}
                  placeholder="Se souber"
                  disabled={i.estado !== "pronta"}
                  onChange={(e) => aoEscrever(i, e.target.value)}
                  onBlur={() => aoSair(i)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
              </label>
              {i.notaFalhou && <p className={s.aviso}>Não guardou. Toque fora do campo de novo.</p>}
              {(i.estado === "pronta" || i.estado === "erro") && (
                <button type="button" className={s.tirar} onClick={() => aoTirar(i)}>
                  {i.apagando ? "Tirar mesmo?" : "Tirar"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
