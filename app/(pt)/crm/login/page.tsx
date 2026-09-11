import type { Metadata } from "next";
import { Login } from "./Login";
import s from "../crm.module.css";

export const metadata: Metadata = { title: "Entrar" };

/* A única rota do /crm que o middleware deixa passar sem sessão. Ela não
   mostra a navegação de propósito: quem está aqui ainda não tem para onde
   ir, e um menu que leva de volta ao login é ruído. */
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  const { destino } = await searchParams;
  const seguro = destino?.startsWith("/crm") ? destino : "/crm";

  return (
    <div className={s.login}>
      <Login destino={seguro} />
    </div>
  );
}
