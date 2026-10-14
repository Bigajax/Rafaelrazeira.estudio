import Link from "next/link";
import { clienteServidor } from "@/lib/crm/supabase";
import { lerTodos, tabelaAusente } from "@/lib/sistema/consultas";
import { avancouLead, ORDEM_COMERCIAL, type EventoEtapa } from "@/lib/sistema/comercial";
import { diaLocal, dataValida } from "@/lib/sistema/calendario";
import { hojeSP, somarDias } from "@/lib/crm/regras";
import { Cabecalho, Aviso } from "@/components/sistema/Painel";
import s from "@/components/sistema/sistema.module.css";
export const metadata = { title: "Negócios do indicador" };
export default async function Negocios({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; etapa?: string }>;
}) {
  const p = await searchParams;
  const de = dataValida(p.de) ? p.de : somarDias(hojeSP(), -29);
  const ate = dataValida(p.ate) ? p.ate : hojeSP();
  const etapa = p.etapa && ORDEM_COMERCIAL.includes(p.etapa) ? p.etapa : "contatado";
  const b = await clienteServidor();
  const [leads, eventos] = await Promise.all([
    lerTodos<{ id: string; nome: string; empresa: string | null; estagio: string; created_at: string }>(
      b,
      "crm_leads",
      "id,nome,empresa,estagio,created_at",
    ),
    lerTodos<EventoEtapa>(b, "crm_eventos_etapa").catch((e) => {
      if (tabelaAusente(e)) return null;
      throw e;
    }),
  ]);
  const lista = leads.filter(
    (l) => diaLocal(l.created_at) >= de && diaLocal(l.created_at) <= ate && avancouLead(l, eventos, etapa),
  );
  return (
    <div className={s.tela}>
      <Cabecalho
        titulo={"Negócios · " + etapa}
        descricao={
          lista.length + " negócios criados entre " + de + " e " + ate + " que avançaram até esta etapa."
        }
      >
        <Link href="/crm/metricas" className={s.botao}>
          ← Indicadores
        </Link>
      </Cabecalho>
      {eventos === null || lista.some((l) => eventos.some((e) => e.lead_id === l.id && e.inicial)) ? (
        <Aviso>A lista inclui estimativas de avanço para a base anterior ao histórico.</Aviso>
      ) : null}
      <section className={s.painel}>
        <ul className={s.fila}>
          {lista.map((l) => (
            <li key={l.id}>
              <div>
                <b>{l.empresa || l.nome}</b>
                <small>
                  Etapa atual: {l.estagio} · criado em {diaLocal(l.created_at)}
                </small>
              </div>
              <Link className={s.botao} href={"/crm/lead/" + l.id}>
                Abrir negócio
              </Link>
            </li>
          ))}
        </ul>
        {!lista.length ? (
          <p className={s.vazio}>Nenhum negócio corresponde ao indicador neste período.</p>
        ) : null}
      </section>
    </div>
  );
}
