/* ============================================================
   REFERÊNCIAS: o que o time lê de fora antes de criar (01/10/2026)

   A aba Resultados é a referência de dentro (os números do próprio feed);
   esta é a de fora: perfis que fazem bem cada categoria, os formatos que se
   repetem neles e o que evitar. A Paula e o Caetano leem a mesma lista no
   worker. A versão longa da pesquisa, com as fontes, mora no cofre:
   `2 Regras da casa/referencias-instagram.md`.
   ============================================================ */
import type { Metadata } from "next";
import { clienteServidor } from "@/lib/crm/supabase";
import type { Referencia } from "@/lib/marketing/referencias-iniciais";
import { AbasMarketing } from "@/components/marketing/AbasMarketing";
import { BancoReferencias } from "@/components/marketing/BancoReferencias";
import s from "@/app/(pt)/crm/crm.module.css";
import m from "@/app/(pt)/crm/marketing.module.css";

export const metadata: Metadata = { title: "Referências" };

export default async function PaginaReferencias() {
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("mkt_referencias")
    .select("*")
    .order("ativo", { ascending: false })
    .order("criado_em")
    .returns<Referencia[]>();
  const refs = data ?? [];
  const ativas = refs.filter((r) => r.ativo !== false).length;

  return (
    <div className={m.tela}>
      <AbasMarketing ativa="referencias" />
      <header className={m.portaCab}>
        <h1 className={m.resTitulo}>
          Referências<i className={s.ponto}>.</i>
        </h1>
        <p className={m.placar}>
          {error
            ? "O banco ainda não existe."
            : refs.length
              ? `${ativas} ${ativas === 1 ? "referência que o time lê" : "referências que o time lê"} antes de criar. Seguidor não prova que o formato funciona: a prova sai da aba Resultados.`
              : "Nenhuma referência ainda."}
        </p>
      </header>
      <BancoReferencias refs={refs} semTabela={Boolean(error)} />
    </div>
  );
}
