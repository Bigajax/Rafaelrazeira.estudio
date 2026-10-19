"use client";

/* As fichas do check-in: cada parte da vitrine sobe as suas fotos.
   O arquivo vai do celular direto para o Storage, por URL assinada que a
   /api/checkin entrega uma por foto; três por vez, para não engasgar o 4G.
   Quando a leva toda termina, a rota avisa o celular do Rafael. */

import { useRef, useState } from "react";
import { CORES, type CampoCheckin, type CategoriaCheckin } from "@/lib/checkin";
import type { FotoEnviada } from "@/lib/checkin-servidor";
import s from "./checkin.module.css";

type Item = {
  chave: string;
  caminho?: string;
  url: string;
  nota: string;
  notaSalva: string;
  campos: Record<string, string>;
  camposSalvos: Record<string, string>;
  estado: "fila" | "subindo" | "pronta" | "erro";
  progresso: number;
  arquivo?: File;
  apagando?: boolean;
  notaFalhou?: boolean;
  /* fechada, a peça vira uma linha (foto, nome, preço) e a lista não cresce
     a cada foto; abre de novo no Editar (19/10) */
  aberta: boolean;
};

const AO_MESMO_TEMPO = 3;
const TIPOS = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/* o preço sempre em reais com centavos: "189" vira "189,00", "1.299,9" vira
   "1.299,90", "189.90" vira "189,90". O que não for número fica como está */
function formatarPreco(v: string) {
  const t = v.replace(/[^\d.,]/g, "");
  if (!/\d/.test(t)) return v.trim();
  const virgula = t.lastIndexOf(",");
  const ponto = t.lastIndexOf(".");
  let normal: string;
  if (virgula >= 0) normal = t.replace(/\./g, "").replace(",", ".");
  else if (ponto >= 0 && t.length - ponto - 1 !== 3) normal = t;
  else normal = t.replace(/\./g, "");
  const n = Number(normal);
  return Number.isFinite(n)
    ? n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : v;
}

async function api(corpo: Record<string, unknown>) {
  const r = await fetch("/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
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

export function EnvioDeFotos({ token, categorias, campos, iniciais }: { token: string; categorias: CategoriaCheckin[]; campos?: CampoCheckin[]; iniciais: Record<string, FotoEnviada[]> }) {
  const [itens, setItens] = useState<Record<string, Item[]>>(() =>
    Object.fromEntries(
      categorias.map((k) => [
        k.id,
        (iniciais[k.id] ?? []).map((f) => ({
          chave: f.caminho,
          caminho: f.caminho,
          url: f.url,
          nota: f.nota,
          notaSalva: f.nota,
          campos: f.campos ?? {},
          camposSalvos: f.campos ?? {},
          estado: "pronta" as const,
          progresso: 1,
          aberta: !f.campos?.nome,
        })),
      ]),
    ),
  );

  const mudar = (cat: string, chave: string, m: Partial<Item>) =>
    setItens((t) => ({
      ...t,
      [cat]: t[cat].map((i) => (i.chave === chave ? { ...i, ...m } : i)),
    }));

  async function subirUma(cat: string, item: Item): Promise<boolean> {
    if (!item.arquivo) return false;
    mudar(cat, item.chave, { estado: "subindo", progresso: 0 });
    try {
      const { caminho, url } = await api({
        acao: "subir",
        token,
        categoria: cat,
        tipo: tipoDe(item.arquivo),
      });
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
      campos: {},
      camposSalvos: {},
      estado: "fila",
      progresso: 0,
      aberta: true,
      arquivo: f,
    }));
    setItens((t) => ({ ...t, [cat]: [...t[cat], ...leva] }));
    subirLeva(cat, leva);
  }

  /* a ficha da categoria, se ela tiver a sua; senão a da loja */
  const fichaDe = (cat: string) => categorias.find((k) => k.id === cat)?.campos ?? campos;

  async function guardarNota(cat: string, i: Item) {
    if (!i.caminho) return;
    const ficha = fichaDe(cat);
    const iguais = i.nota.trim() === i.notaSalva.trim() && (ficha ?? []).every((c) => (i.campos[c.chave] ?? "").trim() === (i.camposSalvos[c.chave] ?? "").trim());
    if (iguais) return;
    try {
      await api({
        acao: "nota",
        token,
        caminho: i.caminho,
        nota: i.nota,
        ...(ficha ? { campos: i.campos } : {}),
      });
      mudar(cat, i.chave, {
        notaSalva: i.nota,
        camposSalvos: i.campos,
        notaFalhou: false,
      });
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
    setItens((t) => ({
      ...t,
      [cat]: t[cat].filter((x) => x.chave !== i.chave),
    }));
  }

  return (
    <div className={s.fichas}>
      {categorias.map((k, n) => (
        <Ficha
          key={k.id}
          numero={n + 1}
          categoria={k}
          campos={fichaDe(k.id)}
          itens={itens[k.id]}
          aoEscolher={(l) => escolher(k.id, l)}
          aoEscrever={(i, nota) => mudar(k.id, i.chave, { nota })}
          aoPreencher={(i, chave, valor) => mudar(k.id, i.chave, { campos: { ...i.campos, [chave]: valor } })}
          aoAbrir={(i, aberta) => {
            mudar(k.id, i.chave, { aberta });
            if (!aberta) guardarNota(k.id, i);
          }}
          aoMarcar={(i, chave, valor) => {
            const novo = { ...i, campos: { ...i.campos, [chave]: valor } };
            mudar(k.id, i.chave, { campos: novo.campos });
            guardarNota(k.id, novo);
          }}
          aoSair={(i) => guardarNota(k.id, i)}
          aoTirar={(i) => tirar(k.id, i)}
          aoRepetir={(i) =>
            subirUma(k.id, i).then(
              (ok) =>
                ok &&
                api({
                  acao: "avisar",
                  token,
                  categoria: k.id,
                  quantas: 1,
                }).catch(() => {}),
            )
          }
        />
      ))}
    </div>
  );
}

function Ficha({
  numero,
  categoria,
  campos,
  itens,
  aoEscolher,
  aoEscrever,
  aoPreencher,
  aoMarcar,
  aoAbrir,
  aoSair,
  aoTirar,
  aoRepetir,
}: {
  numero: number;
  categoria: CategoriaCheckin;
  campos?: CampoCheckin[];
  itens: Item[];
  aoEscolher: (l: FileList | null) => void;
  aoEscrever: (i: Item, nota: string) => void;
  aoPreencher: (i: Item, chave: string, valor: string) => void;
  aoMarcar: (i: Item, chave: string, valor: string) => void;
  aoAbrir: (i: Item, aberta: boolean) => void;
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
      {/* com peça na lista, quem chama a galeria é o "+ Adicionar outra peça" embaixo */}
      {!(campos && itens.length > 0) && (
        <button type="button" className={s.botao} onClick={() => entrada.current?.click()}>
          <span aria-hidden="true">↑</span> Escolher fotos
        </button>
      )}

      {itens.length > 0 && (
        <ul className={campos ? `${s.grade} ${s.gradeCampos}` : s.grade}>
          {itens.map((i) =>
            campos && !i.aberta && i.estado === "pronta" ? (
              <li key={i.chave} className={s.pecaFechada}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt="" loading="lazy" />
                <div className={s.pecaFechada__texto}>
                  <b>{i.campos.nome || "Sem nome"}</b>
                  <span>{[i.campos.promocao ? `R$ ${i.campos.promocao} (de R$ ${i.campos.preco || "?"})` : i.campos.preco ? `R$ ${i.campos.preco}` : "Sem preço", i.campos.tamanhos, i.campos.cores].filter(Boolean).join(" · ")}</span>
                </div>
                <button type="button" className={s.editar} onClick={() => aoAbrir(i, true)}>
                  Editar
                </button>
              </li>
            ) : (
              <li key={i.chave} className={campos ? `${s.foto} ${s.fotoCampos}` : s.foto} data-estado={i.estado}>
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
                {campos ? (
                  <>
                    {/* ao lado da foto, o que se escreve; embaixo, o que se toca (19/10) */}
                    <div className={s.fichaDaFoto}>
                      {(() => {
                        const campoDe = (c: CampoCheckin) => (
                          <label key={c.chave} className={`${s.nota} ${c.modo === "decimal" ? s.notaPreco : ""}`}>
                            <span>{c.rotulo}</span>
                            {c.modo === "decimal" && (
                              <b className={s.real} aria-hidden="true">
                                R$
                              </b>
                            )}
                            <input
                              type="text"
                              inputMode={c.modo === "decimal" ? "decimal" : "text"}
                              value={i.campos[c.chave] ?? ""}
                              maxLength={300}
                              placeholder={c.dica ?? ""}
                              disabled={i.estado !== "pronta"}
                              onChange={(e) => aoPreencher(i, c.chave, e.target.value)}
                              onBlur={() => {
                                const v = i.campos[c.chave] ?? "";
                                if (c.modo === "decimal" && v && formatarPreco(v) !== v) aoMarcar(i, c.chave, formatarPreco(v));
                                else aoSair(i);
                              }}
                              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                            />
                          </label>
                        );
                        const texto = campos.filter((c) => !c.opcoes);
                        return (
                          <>
                            {texto.filter((c) => c.modo !== "decimal").map(campoDe)}
                            <div className={s.precos}>{texto.filter((c) => c.modo === "decimal").map(campoDe)}</div>
                          </>
                        );
                      })()}
                    </div>
                    <div className={s.fichaOpcoes}>
                      {campos
                        .filter((c) => c.opcoes)
                        .map((c) => (
                          <Opcoes key={c.chave} campo={c} valor={i.campos[c.chave] ?? ""} desligado={i.estado !== "pronta"} aoMudar={(v) => aoMarcar(i, c.chave, v)} />
                        ))}
                      {i.notaFalhou && <p className={s.aviso}>Não guardou. Toque fora do campo de novo.</p>}
                      <div className={s.pecaAcoes}>
                        {i.estado === "pronta" && (
                          <button type="button" className={s.pronto} onClick={() => aoAbrir(i, false)}>
                            ✓ Pronto, salvar peça
                          </button>
                        )}
                        {(i.estado === "pronta" || i.estado === "erro") && (
                          <button type="button" className={s.tirar} onClick={() => aoTirar(i)}>
                            {i.apagando ? "Tirar mesmo?" : "Tirar esta foto"}
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
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
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}
      {campos && itens.length > 0 && (
        <button type="button" className={s.outraPeca} onClick={() => entrada.current?.click()}>
          + Adicionar outra peça
        </button>
      )}
    </section>
  );
}

/* tamanho e cor: botões de tocar, mais de um vale. O valor é um texto só
   ("P, M, G"); o "+ Outro" abre um campo, e o que ela escrever vira botão
   marcado também. A cor conhecida leva a bolinha */
function Opcoes({ campo, valor, desligado, aoMudar }: { campo: CampoCheckin; valor: string; desligado: boolean; aoMudar: (v: string) => void }) {
  const [outro, setOutro] = useState("");
  const [abrindo, setAbrindo] = useState(false);
  const marcadas = valor
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const todas = [...(campo.opcoes ?? []), ...marcadas.filter((t) => !campo.opcoes?.includes(t))];
  const trocar = (t: string) => aoMudar((marcadas.includes(t) ? marcadas.filter((x) => x !== t) : [...marcadas, t]).join(", "));
  const somar = () => {
    const novas = outro
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !marcadas.includes(t));
    setOutro("");
    setAbrindo(false);
    if (novas.length) aoMudar([...marcadas, ...novas].join(", "));
  };

  return (
    <fieldset className={s.opcoes} disabled={desligado}>
      <legend className={s.opcoes__rotulo}>
        {campo.rotulo}
        {marcadas.length > 0 && <em> · {marcadas.length}</em>}
      </legend>
      <div className={s.opcoes__lista}>
        {todas.map((t) => (
          <button key={t} type="button" className={s.chip} aria-pressed={marcadas.includes(t)} onClick={() => trocar(t)}>
            {CORES[t] && <i className={s.chip__cor} style={{ background: CORES[t] }} aria-hidden="true" />}
            {t}
          </button>
        ))}
        {abrindo ? (
          <input
            type="text"
            className={s.chip__outro}
            value={outro}
            maxLength={60}
            autoFocus
            placeholder="Escreva aqui"
            aria-label={`${campo.rotulo}: outro`}
            onChange={(e) => setOutro(e.target.value)}
            onBlur={somar}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                somar();
              }
            }}
          />
        ) : (
          <button type="button" className={`${s.chip} ${s.chip__mais}`} onClick={() => setAbrindo(true)}>
            + Outro
          </button>
        )}
      </div>
    </fieldset>
  );
}
