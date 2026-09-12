"use client";

/* ============================================================
   O MATERIAL DO CLIENTE — o que chega pelo WhatsApp e não tem onde morar

   O logo em alta, a foto da fachada, o print da tabela de preços, a foto da
   peça que só existe no story. Tudo isso chega na conversa e, até aqui,
   ficava na conversa: na hora de montar a vitrine você voltava a rolar o
   WhatsApp procurando aquele arquivo.

   ---------- por que entra na mesma tabela dos posts ----------
   `prod_ativos` já é "toda imagem desta loja", já tem a faxina do Storage
   amarrada nela (apagar a loja apaga os arquivos) e já é o que a tela sabe
   listar. Uma tabela nova só para isto seria a mesma coisa com outro nome.
   O que separa é o `tipo`: material entra como MATERIAL e a leitura de
   catálogo pula esses, porque logo não é produto.

   A ordem começa em 1000 para o material nunca disputar as primeiras
   posições com as peças, nem na paleta (que lê as doze primeiras fotos) nem
   no catálogo.
   ============================================================ */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apagarAtivo, subirMaterial } from "@/app/(pt)/crm/acoes-producao";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/producao.module.css";
import type { Ativo } from "@/lib/producao/tipos";

export function Material({
  loja_id,
  materiais,
  urls,
}: {
  loja_id: string;
  materiais: Ativo[];
  urls: Record<string, string>;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [recado, setRecado] = useState("");
  const [subindo, comSubida] = useTransition();

  function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setRecado("");
    comSubida(async () => {
      let subiram = 0;
      for (const arquivo of Array.from(arquivos)) {
        const dados = new FormData();
        dados.set("arquivo", arquivo);
        const r = await subirMaterial(loja_id, dados);
        if (r.ok) subiram++;
        else setRecado(r.erro);
      }
      if (subiram) setRecado(`${subiram} ${subiram === 1 ? "arquivo subiu" : "arquivos subiram"}.`);
      if (entrada.current) entrada.current.value = "";
      router.refresh();
    });
  }

  return (
    <section className={p.bloco}>
      <div className={p.blocoCab}>
        <h2>
          Material<i className={s.ponto}>.</i>
        </h2>
        <span className={p.blocoRot}>do cliente</span>
        <button type="button" className={s.btnMini} disabled={subindo} onClick={() => entrada.current?.click()}>
          {subindo ? "SUBINDO…" : "+ SUBIR ARQUIVO"}
        </button>
      </div>

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => enviar(e.target.files)}
      />

      {!materiais.length ? (
        <div className={p.vazio}>
          <b>Nada guardado ainda</b>
          <p>
            O logo em alta, a foto da fachada, o print da tabela de preços. O que o cliente manda no WhatsApp
            mora aqui, e não some junto com a conversa.
          </p>
        </div>
      ) : (
        <ul className={p.materiais}>
          {materiais.map((m) => (
            <li key={m.id}>
              <a href={urls[m.id]} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[m.id]} alt={m.legenda ?? ""} loading="lazy" />
                {/* O nome do arquivo é o que faz reconhecer o material:
                    numa fita de miniaturas quadradas, "tabela-precos.jpg" e
                    "logo-alta.png" se parecem, e o que separa é a legenda
                    que o próprio upload guardou. */}
                {m.legenda && <span>{m.legenda}</span>}
              </a>
              <button
                type="button"
                className={p.apagarLinha}
                aria-label="Apagar este material"
                onClick={() =>
                  comSubida(async () => {
                    await apagarAtivo(m.id);
                    router.refresh();
                  })
                }
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {recado && <p className={p.aviso}>{recado}</p>}
    </section>
  );
}
