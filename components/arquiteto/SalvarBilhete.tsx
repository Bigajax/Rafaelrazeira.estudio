"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ResultadoBilhete } from "@/lib/sorteio-arquitetos";
import s from "./raspadinha.module.css";

export function SalvarBilhete({ resultado, codigo, previa, utilizado, entregue }: {
  resultado: ResultadoBilhete; codigo?: string; previa: boolean; utilizado?: boolean; entregue?: boolean;
}) {
  const [salvando, setSalvando] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);
  const [compartilhamento, setCompartilhamento] = useState<{ chave: string; imagem: File | null } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [aviso, setAviso] = useState("");
  const ocupado = useRef(false);
  const montado = useRef(true);
  const arquivo = useRef<{ url: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const tempoCopia = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chave = JSON.stringify({ resultado, codigo, previa, utilizado, entregue });
  const nomeArquivo = `${previa ? "previa-sem-validade" : (codigo || "bilhete").replace(/[^a-z0-9-]/gi, "")}-${resultado}.png`;
  const preparandoCompartilhamento = compartilhamento?.chave !== chave;
  const liberar = useCallback(() => {
    if (arquivo.current) { clearTimeout(arquivo.current.timer); URL.revokeObjectURL(arquivo.current.url); arquivo.current = null; }
  }, []);
  useEffect(() => { montado.current = true; return () => {
    montado.current = false; liberar();
    if (tempoCopia.current) clearTimeout(tempoCopia.current);
  }; }, [liberar]);
  useEffect(() => {
    let ativo = true;
    // O arquivo fica pronto antes do toque: share() precisa da ativação do usuário.
    if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
      setCompartilhamento({ chave, imagem: null });
      return;
    }
    async function preparar() {
      try {
        const { imagemBilhete } = await import("@/lib/imagem-bilhete");
        if (!ativo) return;
        const blob = await imagemBilhete({ resultado, codigo, previa, utilizado, entregue });
        if (!ativo) return;
        const imagem = new File([blob], nomeArquivo, { type: "image/png" });
        setCompartilhamento({ chave, imagem: navigator.canShare({ files: [imagem] }) ? imagem : null });
      } catch { if (ativo) setCompartilhamento({ chave, imagem: null }); }
    }
    void preparar();
    return () => { ativo = false; };
  }, [chave, nomeArquivo, resultado, codigo, previa, utilizado, entregue]);
  async function salvar(paraCompartilhar = false) {
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
      link.download = nomeArquivo;
      document.body.append(link); link.click(); link.remove();
      setAviso(paraCompartilhar ? "Este navegador não abre o menu de compartilhamento. A imagem foi gerada para você enviar; confira os downloads." : "Imagem gerada. Confira os downloads do navegador.");
    } catch { if (montado.current) setAviso("Não foi possível salvar. Tente novamente ou tire uma captura do bilhete."); }
    finally { ocupado.current = false; if (montado.current) setSalvando(false); }
  }
  async function compartilhar() {
    if (ocupado.current || preparandoCompartilhamento) return;
    const imagem = compartilhamento?.chave === chave ? compartilhamento.imagem : null;
    if (!imagem) { await salvar(true); return; }
    ocupado.current = true; setCompartilhando(true); setAviso("");
    try {
      // Sem operações assíncronas antes desta chamada: mantém o gesto do toque.
      await navigator.share({ files: [imagem], title: previa ? "Prévia do bilhete — Rafael Razeira Estúdio" : "Meu bilhete — Rafael Razeira Estúdio" });
      if (montado.current) setAviso("Bilhete enviado ao compartilhamento do seu aparelho.");
    } catch (erro) {
      if (montado.current && !(erro instanceof Error && erro.name === "AbortError")) {
        setAviso("Não foi possível abrir o compartilhamento. Use o botão de salvar para guardar a imagem e enviar.");
      }
    } finally { ocupado.current = false; if (montado.current) setCompartilhando(false); }
  }
  async function copiar() {
    if (previa || !codigo || copiando) return;
    if (tempoCopia.current) clearTimeout(tempoCopia.current);
    setCopiado(false); setCopiando(true); setAviso("");
    try {
      await navigator.clipboard.writeText(codigo);
      if (!montado.current) return;
      setCopiado(true); setAviso("Código copiado.");
      tempoCopia.current = setTimeout(() => {
        setCopiado(false); setAviso(atual => atual === "Código copiado." ? "" : atual); tempoCopia.current = null;
      }, 2500);
    }
    catch { if (montado.current) setAviso("Selecione o código acima e copie pelo menu do navegador."); }
    finally { if (montado.current) setCopiando(false); }
  }
  return <div className={s.guardarBilhete} data-guardar-bilhete>
    <div className={s.acoesImagem}>
      <button className={s.salvarBilhete} type="button" onClick={() => salvar()} disabled={salvando || compartilhando}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></svg>
        {salvando ? "Gerando imagem…" : previa ? "Salvar prévia" : resultado === "site" ? "Salvar meu prêmio" : "Salvar meu cupom"}
      </button>
      <button className={s.compartilharBilhete} type="button" onClick={compartilhar} disabled={preparandoCompartilhamento || salvando || compartilhando} aria-busy={preparandoCompartilhamento || compartilhando}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M7 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" /></svg>
        {preparandoCompartilhamento ? "Preparando imagem…" : compartilhando ? "Compartilhando…" : "Compartilhar bilhete"}
      </button>
    </div>
    {!previa && codigo && <div className={s.codigoBilhete}>
      <div className={s.registroNoBilhete}><span>{resultado === "site" ? "Prêmio registrado no seu nome" : "Seu cupom individual"}</span><code>{codigo}</code></div>
      <button className={`${s.copiarCodigo} ${copiado ? s.codigoCopiado : ""}`} type="button" onClick={copiar} disabled={copiando}>
        {!copiado && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>}
        {copiado ? "Código copiado ✓" : copiando ? "Copiando…" : "Copiar código"}
      </button>
    </div>}
    <p className={copiado && aviso === "Código copiado." ? s.somenteLeitura : undefined} role="status" aria-live="polite">{aviso}</p>
  </div>;
}
