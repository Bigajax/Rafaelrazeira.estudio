import Link from "next/link";
import { clienteServidor } from "@/lib/crm/supabase";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import { Cabecalho, Aviso } from "@/components/sistema/Painel";
import s from "@/components/sistema/sistema.module.css";
export const metadata = { title: "Clientes" };
export default async function Clientes() {
  const b = await clienteServidor();
  const clientes = await lerTodos<{ id: string; nome: string; whatsapp: string | null }>(
    b,
    "crm_clientes",
    "id,nome,whatsapp",
  ).catch((e) => {
    if (tabelaAusente(e)) return null;
    throw e;
  });
  return (
    <div className={s.tela}>
      <Cabecalho
        titulo="Clientes"
        descricao="Um cadastro para acompanhar todos os negócios, contratos e entregas."
      >
        <Link href="/crm/pipeline" className={s.botao}>
          Abrir Funil
        </Link>
      </Cabecalho>
      {clientes === null ? (
        <Aviso>
          A ficha integrada aguarda a instalação do módulo. Os cadastros atuais continuam no Funil.
        </Aviso>
      ) : (
        <section className={s.painel}>
          <h2>Cadastros do estúdio</h2>
          {clientes.length ? (
            <ul className={s.fila}>
              {clientes
                .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
                .map((c) => (
                  <li key={c.id}>
                    <div>
                      <b>{c.nome}</b>
                      <small>{c.whatsapp ?? "Contato na ficha do negócio"}</small>
                    </div>
                    <Link className={s.botao} href={"/crm/clientes/" + c.id}>
                      Abrir cliente
                    </Link>
                  </li>
                ))}
            </ul>
          ) : (
            <p className={s.vazio}>Abra um negócio no Funil para criar ou vincular a ficha do cliente.</p>
          )}
        </section>
      )}
    </div>
  );
}
