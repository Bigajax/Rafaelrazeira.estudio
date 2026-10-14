import { cache } from "react";
import { clienteServidor } from "@/lib/crm/supabase";
import { tabelaAusente } from "./consultas";
export const revisaoInstalada = cache(async () => {
  const b = await clienteServidor();
  const { error } = await b.from("fin_ocorrencias").select("id").limit(0);
  if (tabelaAusente(error)) return false;
  if (error) throw Error("Não foi possível conferir os recursos do sistema.");
  return true;
});
