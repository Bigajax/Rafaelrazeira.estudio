/* A espera da bancada. Ver a nota em templates/loading.tsx: sem este
   arquivo, a tela anterior fica montada durante a busca e o clique no
   trilho parece não ter funcionado. */
import { Carregando } from "@/components/crm/Carregando";

export default function CarregandoRota() {
  return <Carregando palavra="Abrindo a bancada" sangra />;
}
