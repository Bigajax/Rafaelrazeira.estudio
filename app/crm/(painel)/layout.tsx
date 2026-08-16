import { Trilho } from "@/components/crm/Trilho";
import { contagens } from "@/lib/crm/dados";
import { sair } from "../acoes";
import s from "../crm.module.css";

/* Grupo de rotas `(painel)`: os parênteses somem da URL, então /crm continua
   sendo /crm. Ele existe para que o trilho envolva as cinco telas de
   trabalho e NÃO envolva o login, que mora um nível acima e não deve
   mostrar menu para quem ainda não entrou. */
export default async function LayoutPainel({
  children,
  modal,
}: {
  children: React.ReactNode;
  /* O slot paralelo onde a ficha do lead abre por cima do quadro. Ele fica
     vazio em toda rota que não é uma ficha (ver @modal/default.tsx), e é a
     rota interceptada @modal/(.)lead/[id] que o preenche. */
  modal: React.ReactNode;
}) {
  /* As contagens vivem no layout e não em cada página: o trilho é o mesmo
     objeto nas cinco telas, e buscar os números em cinco lugares seria
     cinco chances de eles discordarem entre si. */
  const numeros = await contagens();

  return (
    <div className={s.mesa}>
      <Trilho sair={sair} contagens={numeros} />
      <main className={s.main}>{children}</main>
      {modal}

      {/* No celular a barra de baixo leva as quatro rotas e não leva "Sair":
          cinco itens espremem os quatro que importam, e sair é a única ação
          da barra que custa uma senha para desfazer. Ele desce para o pé do
          conteúdo, onde ninguém encosta sem querer. No computador ele vive
          no trilho e este bloco não existe. */}
      <form action={sair} className={s.sairNoPe}>
        <button type="submit" className={s.btnMini}>
          Sair do CRM
        </button>
      </form>
    </div>
  );
}
