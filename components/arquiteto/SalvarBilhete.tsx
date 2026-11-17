"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResultadoBilhete } from "@/lib/sorteio-arquitetos";
import s from "./raspadinha.module.css";

export function SalvarBilhete({ resultado, codigo, previa, utilizado, entregue }: {
  resultado: ResultadoBilhete; codigo?: string; previa: boolean; utilizado?: boolean; entregue?: boolean;
}) {
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const ocupado = useRef(false);
  const montado = useRef(true);
  const arquivo = useRef<{ url: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const liberar = useCallback(() => {
    if (arquivo.current) { clearTimeout(arquivo.current.timer); URL.revokeObjectURL(arquivo.current.url); arquivo.current = null; }
  }, []);
  useEffect(() => { montado.current = true; return () => { montado.current = false; liberar(); }; }, [liberar]);
  async function salvar() {
    if (ocupado.current) return;
    ocupado.current = true; setSalvando(true); setAviso("");
    try {
      const { imagemBilhete } = await import("@/lib/imagem-bilhete");
      if (!montado.current) return;
      const imagem = await imagemBilhete({ resultado, codigo, previa, utilizado, entregue });
      if (!montado.current) return;
      liberar();
      const url = URL.createObjectURL(imagem);
      arquivo.current = { url, timer: setTimeout(liberar, 45000) };
      const link = document.createElement("a");
      link.href = url;
      link.download = `${previa ? "previa-sem-validade" : (codigo || "bilhete").replace(/[^a-z0-9-]/gi, "")}-${resultado}.png`;
      document.body.append(link); link.click(); link.remove();
      setAviso("Imagem gerada. Confira os downloads do navegador.");
    } catch { if (montado.current) setAviso("Não foi possível salvar. Tente novamente ou tire uma captura do bilhete."); }
    finally { ocupado.current = false; if (montado.current) setSalvando(false); }
  }
  async function copiar() {
    if (previa || !codigo) return;
    try { await navigator.clipboard.writeText(codigo); setAviso("Código copiado."); }
    catch { setAviso("Selecione o código acima e copie pelo menu do navegador."); }
  }
  return <div className={s.guardarBilhete} data-guardar-bilhete>
    <div>
      <button type="button" onClick={salvar} disabled={salvando}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg>
        {salvando ? "Gerando imagem…" : previa ? "Salvar prévia" : resultado === "site" ? "Salvar meu prêmio" : "Salvar meu cupom"}
      </button>
      {!previa && codigo && <button type="button" onClick={copiar}>Copiar código</button>}
    </div>
    <p role="status" aria-live="polite">{aviso}</p>
  </div>;
}
