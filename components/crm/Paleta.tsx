"use client";

/* ============================================================
   A PALETA DE COMANDOS (24/11/2026)
   Ctrl+K (ou Cmd+K) em qualquer tela do painel: uma caixa no meio da tela
   para ir a uma seção pelo nome ou achar um contato por nome, loja ou @.
   Pedido do Rafael ao perguntar o que deixaria o painel "mais tecnológico":
   com ~700 contatos, chegar numa ficha era abrir o Hoje e rolar.

   - É um <dialog> nativo: Esc fecha, o foco fica preso e o leitor de tela o
     anuncia, sem biblioteca.
   - As seções filtram na hora, no navegador. Os contatos vêm do servidor
     (buscarContatos), com 160ms de espera depois da última tecla e descarte
     da resposta que chegar fora de ordem.
   - As setas andam pela lista, Enter abre. O item marcado é sempre visível.
   - Não rouba o Ctrl+K de quem está com outro modal aberto.
   ============================================================ */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { buscarContatos } from "@/app/(pt)/crm/acoes-atendimento";
import { NOME_ESTAGIO, type Estagio } from "@/lib/crm/tipos";
import { IconePainel, type IconePainelNome } from "./IconePainel";
import s from "@/app/(pt)/crm/crm.module.css";

export type RotaDaPaleta = { href: string; rotulo: string; nota: string; icone: IconePainelNome };
type Contato = { id: string; nome: string; empresa: string | null; estagio: string };
type Item = { tipo: "rota" | "contato"; chave: string; href: string; titulo: string; nota: string; icone: IconePainelNome };

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function Paleta({ rotas }: { rotas: RotaDaPaleta[] }) {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const [termo, setTermo] = useState("");
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [marcado, setMarcado] = useState(0);

  /* o atalho, na janela inteira; o botão do menu chama pelo evento */
  useEffect(() => {
    const abrir = () => {
      const d = dialogo.current;
      if (!d || d.open) return;
      setTermo("");
      setContatos([]);
      setMarcado(0);
      d.showModal();
      campo.current?.focus();
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
        const outro = document.querySelector("dialog[open]");
        if (outro && outro !== dialogo.current) return;
        e.preventDefault();
        if (dialogo.current?.open) dialogo.current.close();
        else abrir();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    window.addEventListener("crm:paleta", abrir);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("crm:paleta", abrir);
    };
  }, []);

  /* os contatos, com espera e descarte da resposta atrasada */
  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) {
      setContatos([]);
      setBuscando(false);
      return;
    }
    let vale = true;
    setBuscando(true);
    const espera = setTimeout(() => {
      buscarContatos(t)
        .then((r) => { if (vale) setContatos(r); })
        .catch(() => { if (vale) setContatos([]); })
        .finally(() => { if (vale) setBuscando(false); });
    }, 160);
    return () => { vale = false; clearTimeout(espera); };
  }, [termo]);

  const itens: Item[] = useMemo(() => {
    const t = semAcento(termo.trim());
    const dasRotas: Item[] = rotas
      .filter((r) => !t || semAcento(`${r.rotulo} ${r.nota}`).includes(t))
      .map((r) => ({ tipo: "rota", chave: r.href, href: r.href, titulo: r.rotulo, nota: r.nota, icone: r.icone }));
    const dosContatos: Item[] = contatos.map((c) => ({
      tipo: "contato",
      chave: c.id,
      href: `/crm/lead/${c.id}`,
      titulo: c.nome,
      nota: [c.empresa && c.empresa !== c.nome ? c.empresa : null, NOME_ESTAGIO[c.estagio as Estagio] ?? c.estagio].filter(Boolean).join(", "),
      icone: "clientes",
    }));
    /* com termo, os contatos sobem: quem digita um nome quer a pessoa */
    return t ? [...dosContatos, ...dasRotas] : dasRotas;
  }, [termo, contatos, rotas]);

  useEffect(() => { setMarcado(0); }, [termo, contatos.length]);
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [marcado]);

  const ir = (item: Item | undefined) => {
    if (!item) return;
    dialogo.current?.close();
    router.push(item.href);
  };
  const aoTeclarNoCampo = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((i) => (itens.length ? (i + 1) % itens.length : 0)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((i) => (itens.length ? (i - 1 + itens.length) % itens.length : 0)); }
    else if (e.key === "Enter") { e.preventDefault(); ir(itens[marcado]); }
  };

  const primeiroContato = itens.findIndex((i) => i.tipo === "contato");
  const primeiraRota = itens.findIndex((i) => i.tipo === "rota");

  return (
    <dialog
      ref={dialogo}
      className={s.paleta}
      aria-label="Ir para uma seção ou um contato"
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
    >
      <div className={s.paletaCampo}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <input
          ref={campo}
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={aoTeclarNoCampo}
          placeholder="Uma seção, uma loja ou um @"
          aria-label="Buscar seção ou contato"
          role="combobox"
          aria-expanded="true"
          aria-controls="paleta-lista"
          aria-activedescendant={itens[marcado] ? `paleta-${itens[marcado].chave}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd>Esc</kbd>
      </div>
      <div ref={lista} id="paleta-lista" role="listbox" className={s.paletaLista}>
        {itens.map((item, i) => (
          <div key={`${item.tipo}-${item.chave}`}>
            {i === primeiroContato && <p className={s.paletaGrupo}>Contatos</p>}
            {i === primeiraRota && <p className={s.paletaGrupo}>Seções</p>}
            <button
              type="button"
              id={`paleta-${item.chave}`}
              role="option"
              aria-selected={i === marcado}
              className={s.paletaItem}
              onMouseMove={() => setMarcado(i)}
              onClick={() => ir(item)}
              tabIndex={-1}
            >
              <IconePainel nome={item.icone} />
              <span>
                <b>{item.titulo}</b>
                {item.nota ? <small>{item.nota}</small> : null}
              </span>
              {i === marcado ? <kbd>Enter</kbd> : null}
            </button>
          </div>
        ))}
        {!itens.length && (
          <p className={s.paletaVazio}>
            {buscando ? "Procurando…" : `Nada com "${termo.trim()}". Tente o nome da loja ou o @.`}
          </p>
        )}
      </div>
      <p className={s.paletaPe}>
        <span><kbd>↑</kbd><kbd>↓</kbd> andar</span>
        <span><kbd>Enter</kbd> abrir</span>
        <span>{buscando ? "procurando contatos…" : "duas letras já acham contatos"}</span>
      </p>
    </dialog>
  );
}
