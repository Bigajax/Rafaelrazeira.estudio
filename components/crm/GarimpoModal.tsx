"use client";

/* ============================================================
   O GARIMPO — buscar leads no Google Maps, de dentro do quadro

   Um formulário de três campos ("o que", "onde", "quantos") que chama a
   rota do garimpo e planta os achados na Lista. O filtro "só sem site"
   vem LIGADO e com aviso do porquê: negócio sem site é o prospect da
   vitrine, e é o dado que o Maps sabe de verdade.

   O resultado fica no próprio modal ("12 importados, 3 pulados") em vez
   de fechar sozinho: quem garimpa emenda outra busca em seguida, e
   fechar e reabrir o modal a cada nicho seria atrito puro.
   ============================================================ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import s from "@/app/crm/crm.module.css";

export function GarimpoModal({ aoFechar }: { aoFechar: () => void }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [cidade, setCidade] = useState("Maringá");
  const [max, setMax] = useState(20);
  const [soSemSite, setSoSemSite] = useState(true);
  const [garimpando, setGarimpando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  const garimpar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    setGarimpando(true);
    try {
      const r = await fetch("/api/crm/garimpo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ busca, cidade, max, soSemSite }),
      });
      const corpo = (await r.json().catch(() => null)) as {
        achados?: number;
        importados?: number;
        pulados?: number;
        erro?: string;
      } | null;
      if (!r.ok || corpo?.erro) {
        setErro(corpo?.erro ?? "O garimpo falhou. Tente de novo.");
      } else {
        setResultado(
          `${corpo?.achados ?? 0} ${soSemSite ? "sem site " : ""}no Maps: ${corpo?.importados ?? 0} ${
            corpo?.importados === 1 ? "importado" : "importados"
          } na Lista${corpo?.pulados ? `, ${corpo.pulados} já estavam no CRM` : ""}.`,
        );
        router.refresh();
      }
    } catch {
      setErro("O garimpo não respondeu. Confira a conexão e tente de novo.");
    } finally {
      setGarimpando(false);
    }
  };

  return (
    <div className={s.fundo} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="garimpo-titulo">
        <p className={s.modalRot}>Garimpar do Maps</p>
        <h2 id="garimpo-titulo">Buscar negócios</h2>

        <form onSubmit={garimpar}>
          <label className={s.campo}>
            <span className={s.campoRot}>O que buscar</span>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="lojas de roupas femininas"
              autoFocus
            />
          </label>

          <label className={s.campo}>
            <span className={s.campoRot}>Cidade</span>
            <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </label>

          <label className={s.campo}>
            <span className={s.campoRot}>Quantos, no máximo</span>
            <select value={max} onChange={(e) => setMax(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={40}>40</option>
            </select>
          </label>

          <label className={s.garimpoFiltro}>
            <input
              type="checkbox"
              checked={soSemSite}
              onChange={(e) => setSoSemSite(e.target.checked)}
            />
            <span>
              Só negócios <b>sem site</b>, que é o prospect da vitrine (o Maps sabe quem tem)
            </span>
          </label>

          {erro ? (
            <p role="alert" className={s.erro}>
              {erro}
            </p>
          ) : null}
          {resultado ? (
            <p role="status" className={s.salvo}>
              {resultado}
            </p>
          ) : null}

          <div className={s.modalPe}>
            <button type="button" className={s.btn} onClick={aoFechar}>
              Fechar
            </button>
            <button type="submit" className={s.btnAcao} disabled={garimpando || !busca.trim()}>
              {garimpando ? "Garimpando…" : "Garimpar"}
            </button>
          </div>
        </form>

        <p className={s.nota}>
          Cada achado entra na coluna Lista com cidade, nicho e o celular do Maps quando houver;
          depois é só o botão de pesquisar sem dossiê.
        </p>
      </div>
    </div>
  );
}
