"use client";
/* ============================================================
   O SELETOR DE IDIOMA: PT | EN

   Um pill com dois links, a bandeira e a sigla de cada um. A sigla é
   obrigatória: bandeira sozinha confunde (inglês não é "dos EUA") e leitor
   de tela não lê emoji de bandeira. E a bandeira NÃO é emoji: o Chrome no
   Windows não tem o glifo e mostra "BR"/"US" em letras regionais, que
   dobraria a sigla. São dois SVGs de 14x10, simplificados, no mesmo peso
   de tinta da página.

   É link, não botão: a URL irmã existe e é ela que o Google indexa, e
   leva a query junto, para os utm atravessarem a troca. Desde 12/09/2026
   o clique NÃO grava cookie: a URL decide o idioma (ver
   lib/middleware/idioma.ts), e o cookie `lang=en` de uma visita antiga
   era o que prendia o anúncio pt na página em inglês. O clique apaga o
   cookie que sobrou de antes, para ninguém ficar preso.
   Sem dropdown para dois idiomas: seria dois toques para uma ação de um.

   Grafite, nunca rosa: rosa é a ação da página, e trocar idioma não é.
   ============================================================ */
import { useEffect, useState } from "react";
import { COOKIE_LANG, type Lang } from "@/lib/idiomas";
import s from "./SeletorIdioma.module.css";

const ROTULO: Record<Lang, { sigla: string; nome: string; lang: string }> = {
  pt: { sigla: "PT", nome: "Português", lang: "pt-BR" },
  en: { sigla: "EN", nome: "English", lang: "en" },
};

function Bandeira({ lang }: { lang: Lang }) {
  if (lang === "pt") {
    return <svg viewBox="0 0 14 10" width="14" height="10" aria-hidden focusable="false">
      <rect width="14" height="10" fill="#0C9159" />
      <path d="M7 1.4 12.4 5 7 8.6 1.6 5Z" fill="#F2D24B" />
      <circle cx="7" cy="5" r="1.9" fill="#1B3F8B" />
    </svg>;
  }
  return <svg viewBox="0 0 14 10" width="14" height="10" aria-hidden focusable="false">
    <rect width="14" height="10" fill="#F2EFE6" />
    <path d="M0 1h14M0 3h14M0 5h14M0 7h14M0 9h14" stroke="#C8102E" strokeWidth="1" />
    <rect width="6" height="5" fill="#1B3F8B" />
  </svg>;
}

export function SeletorIdioma({ atual, ptHref, enHref, className }: { atual: Lang; ptHref: string; enHref: string; className?: string }) {
  /* A query só existe no cliente; no servidor o link sai limpo e é
     completado no mount. Sem isto, o HTML pré-renderizado teria um href
     diferente do hidratado. */
  const [busca, setBusca] = useState("");
  useEffect(() => { setBusca(window.location.search); }, []);

  const escolher = () => {
    document.cookie = `${COOKIE_LANG}=; Max-Age=0; Path=/; SameSite=Lax`;
  };

  const item = (lang: Lang, href: string) => {
    const r = ROTULO[lang];
    const ativo = lang === atual;
    return <a
      href={`${href}${busca}`}
      hrefLang={r.lang}
      lang={r.lang}
      aria-label={r.nome}
      aria-current={ativo ? "page" : undefined}
      className={ativo ? `${s.item} ${s.ativo}` : s.item}
      onClick={escolher}
      data-cta="idioma"
      data-cta-dest={lang}
    ><Bandeira lang={lang} />{r.sigla}</a>;
  };

  return <nav className={className ? `${s.pill} ${className}` : s.pill} aria-label="Idioma / Language">
    {item("pt", ptHref)}
    {item("en", enHref)}
  </nav>;
}
