/* As portas do Marketing: o calendário (o que já existe e quando sai), a
   produção (o que falta em cada peça, desde 30/09) e o criar (uma peça
   nova). A peça aberta não tem aba: ela é filha das três. */
import Link from "next/link";
import m from "@/app/(pt)/crm/marketing.module.css";

export function AbasMarketing({ ativa }: { ativa: "calendario" | "producao" | "criar" | "resultados" | "referencias" }) {
  return (
    <nav className={m.abasMkt} aria-label="Marketing">
      <Link href="/crm/marketing" className={ativa === "calendario" ? m.abaMktAtiva : ""} aria-current={ativa === "calendario" ? "page" : undefined}>
        Calendário
      </Link>
      <Link href="/crm/marketing/producao" className={ativa === "producao" ? m.abaMktAtiva : ""} aria-current={ativa === "producao" ? "page" : undefined}>
        Produção
      </Link>
      <Link href="/crm/marketing/criar" className={ativa === "criar" ? m.abaMktAtiva : ""} aria-current={ativa === "criar" ? "page" : undefined}>
        Criar
      </Link>
      {/* 01/10: o que deu certo e o que não deu, pelos números de cada post */}
      <Link href="/crm/marketing/resultados" className={ativa === "resultados" ? m.abaMktAtiva : ""} aria-current={ativa === "resultados" ? "page" : undefined}>
        Resultados
      </Link>
      {/* 01/10: o que o time lê de fora antes de criar */}
      <Link href="/crm/marketing/referencias" className={ativa === "referencias" ? m.abaMktAtiva : ""} aria-current={ativa === "referencias" ? "page" : undefined}>
        Referências
      </Link>
    </nav>
  );
}
