"use client";
/* ============================================================
   O DICIONÁRIO DA PÁGINA, por contexto

   Cada página em dois idiomas tem um par de arquivos em messages/
   (vitrine.pt.tsx e vitrine.en.tsx, por exemplo). A página escolhe um
   dos dois no servidor e entrega ao provider; os componentes leem com
   useT(). Um idioma só viaja no payload de cada página.

   O tipo do dicionário nasce do arquivo pt (`typeof pt`) e o en é
   declarado com ele: chave faltando em inglês é erro de compilação, e o
   build (pelo exit code) é a conferência. Regra dos dicionários: só
   strings, números, arrays e JSX; nenhuma função, para o objeto poder
   atravessar a fronteira servidor -> cliente.
   ============================================================ */
import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "@/lib/idiomas";

interface Valor { lang: Lang; messages: unknown }

const Ctx = createContext<Valor>({ lang: "pt", messages: null });

export function LangProvider({ lang, messages, children }: { lang: Lang; messages: unknown; children: ReactNode }) {
  return <Ctx.Provider value={{ lang, messages }}>{children}</Ctx.Provider>;
}

export function useLang(): Lang {
  return useContext(Ctx).lang;
}

/* O genérico é o tipo do dicionário da página (ex.: VitrineMessages).
   Fora de um provider devolve null, e é melhor quebrar cedo do que
   renderizar em silêncio uma página sem texto. */
export function useT<T>(): T {
  const { messages } = useContext(Ctx);
  if (messages == null) throw new Error("useT fora de um LangProvider");
  return messages as T;
}
