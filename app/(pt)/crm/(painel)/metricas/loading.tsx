/* A espera das metricas.

   Um arquivo `loading.tsx` vira o Suspense desta rota: o Next troca a tela
   na hora do clique e mostra isto enquanto o servidor busca. Sem ele, a
   tela ANTIGA fica montada durante a espera e o clique parece não ter
   funcionado. */
import { Carregando } from "@/components/crm/Carregando";

export default function CarregandoRota() {
  return <Carregando palavra="Fazendo as contas" sangra />;
}
