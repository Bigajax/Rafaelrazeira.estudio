/* ============================================================
   SUPORTE: o que as lojas perguntam (23/10/2026)

   A aba Suporte do painel de cada loja grava aqui: o dono procura a
   resposta na FAQ; não achou, escreve. Esta tela é a fila (quem espera
   primeiro), a conversa, e a leitura do que se repete: os temas, as telas
   que mais geram dúvida e o que se procurou sem achar. A dúvida que se
   repete vira pergunta da FAQ, e a FAQ aparece em todo painel na hora.
   ============================================================ */

import type { Metadata } from "next";
import { lerSuporte, TEMAS_SUGERIDOS } from "@/lib/suporte/dados";
import { CentralSuporte } from "@/components/suporte/CentralSuporte";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/app/(pt)/crm/performance.module.css";

export const metadata: Metadata = { title: "Suporte" };

export default async function PaginaSuporte({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [{ c }, dados] = await Promise.all([searchParams, lerSuporte()]);
  const esperando = dados.chamados.filter((x) => x.estado === "aberto").length;

  return (
    <div className={p.tela}>
      <header className={p.cabeca}>
        <div>
          <h1>
            Suporte<i className={s.ponto}>.</i>
          </h1>
          <p className={p.placar}>
            {dados.chamados.length === 0
              ? "Nenhuma loja escreveu ainda."
              : `${esperando} ${esperando === 1 ? "conversa esperando" : "conversas esperando"} o estúdio, ${dados.faq.filter((f) => f.publicada).length} perguntas na FAQ.`}
          </p>
        </div>
      </header>

      {dados.semTabela ? (
        <p className={p.aviso}>
          As tabelas do Suporte ainda não existem no banco. Rode o <code>supabase/suporte.JA-RODADO.sql</code> no SQL Editor do
          Supabase do estúdio: até lá esta tela não tem o que mostrar.
        </p>
      ) : (
        <CentralSuporte dados={dados} aberto={c ?? null} temas={TEMAS_SUGERIDOS} />
      )}
    </div>
  );
}
