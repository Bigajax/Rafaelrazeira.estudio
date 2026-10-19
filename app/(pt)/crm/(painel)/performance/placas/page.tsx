import type { Metadata } from "next";
import Link from "next/link";
import { clienteServidor } from "@/lib/crm/supabase";
import { tabelaAusente } from "@/lib/sistema/consultas";
import { moldePlacas } from "@/lib/performance/molde-placas";
import { EditorPlacas } from "@/components/performance/EditorPlacas";
import s from "@/app/(pt)/crm/crm.module.css";
import p from "@/components/performance/placas.module.css";

export const metadata: Metadata = { title: "Placas · Performance" };
type Loja = { id: string; nome: string; slug: string };

export default async function PaginaPlacas({ searchParams }: {
  searchParams: Promise<{ loja?: string | string[] }>;
}) {
  const consulta = await searchParams;
  const lojaId = typeof consulta.loja === "string" ? consulta.loja : "";
  const banco = await clienteServidor();
  const { data, error } = await banco.from("perf_lojas").select("id,nome,slug").order("nome").returns<Loja[]>();
  if (error && !tabelaAusente(error)) throw new Error("Não foi possível carregar as lojas para a placa. Tente novamente.");
  const lojas = data ?? [];
  const selecionada = lojas.find(loja => loja.id === lojaId);
  const html = await moldePlacas(selecionada?.nome);

  return (
    <div className={p.tela}>
      <header className={p.cabecalho}>
        <div>
          <p className={p.caminho}><Link href="/crm/performance">Performance</Link> › Placas</p>
          <h1>Placas de conquista<i className={s.ponto}>.</i></h1>
          <p className={p.descricao}>Escolha a loja, confira o marco alcançado e prepare a placa com a seta original do Performance.</p>
        </div>
        {selecionada ? <Link className={s.btnMini} href={`/crm/performance/${selecionada.id}`}>Relatórios da loja</Link> : null}
      </header>

      <form action="/crm/performance/placas" className={p.loja}>
        <label htmlFor="loja-placa">Loja do Performance
          <select id="loja-placa" name="loja" defaultValue={selecionada?.id ?? ""}>
            <option value="">Molde livre — preencher manualmente</option>
            {lojas.map(loja => <option key={loja.id} value={loja.id}>{loja.nome} · {loja.slug}</option>)}
          </select>
        </label>
        <button className={s.btnAcao} type="submit">Carregar loja</button>
      </form>
      <p className={p.nota}>
        {lojaId && !selecionada ? "Essa loja não está disponível. Selecione outra ou use o molde livre. " : ""}
        {tabelaAusente(error) ? "As lojas do Performance ainda não estão configuradas. Você pode usar o molde livre. " : ""}
        O nome vem do cadastro. O marco e o valor são conferidos por você; gerar a arte não registra uma conquista no painel. Salve o molde editável para guardar os dados preenchidos.
      </p>
      <div className={p.quadro}><EditorPlacas key={selecionada?.id ?? "livre"} html={html} /></div>
    </div>
  );
}
