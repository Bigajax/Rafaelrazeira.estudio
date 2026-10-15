"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import s from "@/components/sistema/sistema.module.css";
import o from "@/components/financeiro/operacao.module.css";
export function Dialogo({
  titulo,
  ocupado,
  fechar,
  children,
}: {
  titulo: string;
  ocupado?: boolean;
  fechar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      if (anterior?.isConnected) anterior.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={o.dialogo}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        if (!ocupado) fechar();
      }}
    >
      <div className={o.dialogoCabeca}>
        <h2 id={id}>{titulo}</h2>
        <button
          type="button"
          className={s.botao}
          onClick={fechar}
          disabled={ocupado}
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
