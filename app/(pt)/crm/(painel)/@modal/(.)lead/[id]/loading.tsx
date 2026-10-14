import { Carregando } from "@/components/crm/Carregando";
import s from "@/app/(pt)/crm/crm.module.css";
export default function CarregandoFicha() {
  return (
    <div className={s.fundo}>
      <div className={s.fichaCaixa}>
        <Carregando area="a ficha" formato="ficha" compacto />
      </div>
    </div>
  );
}
