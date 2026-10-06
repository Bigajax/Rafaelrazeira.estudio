import type { Metadata } from "next";
import { Login } from "./Login";
import s from "../crm.module.css";

export const metadata: Metadata = { title: "Entrar" };

/* As quatro frentes do sistema, as mesmas do trilho (components/crm/Trilho.tsx).
   Copiadas e não importadas: o trilho é componente de cliente e leva contagem
   da fila, e esta tela é pública, não pode carregar dado nenhum. Entrou aba
   nova no trilho, entra aqui também.
   Em 01/10/2026 o Rafael pediu personalidade e lembrou que "hoje não é apenas
   CRM": a tela mostra o estúdio inteiro antes de abrir a porta. */
const FRENTES = [
  { nome: "Vender", abas: "Hoje, Funil, Templates" },
  { nome: "Fazer", abas: "Produção, Projetos" },
  { nome: "Dinheiro", abas: "Caixa, Financeiro" },
  { nome: "Crescer", abas: "Marketing, Métricas, Plano" },
];

/* A única rota do /crm que o middleware deixa passar sem sessão. Ela não
   mostra a navegação de propósito: quem está aqui ainda não tem para onde
   ir, e um menu que leva de volta ao login é ruído. As frentes do lado
   esquerdo são texto, não link, pelo mesmo motivo. */
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  const { destino } = await searchParams;
  const seguro = destino?.startsWith("/crm") ? destino : "/crm";

  return (
    <div className={s.login}>
      <section className={s.loginMapa} aria-label="O que tem dentro">
        <p className={s.loginAssina}>
          Rafael Razeira Estúdio<i className={s.ponto}>.</i>
        </p>
        <ul className={s.loginFrentes}>
          {FRENTES.map((f) => (
            <li key={f.nome}>
              <span className={s.loginFrente}>{f.nome}</span>
              <span className={s.loginAbas}>{f.abas}</span>
            </li>
          ))}
        </ul>
      </section>

      <Login destino={seguro} />
    </div>
  );
}
