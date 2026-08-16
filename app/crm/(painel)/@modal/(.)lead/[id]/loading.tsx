/* A ESPERA DO MODAL DA FICHA

   Este é o carregando que mais importa da ferramenta, porque é o gesto mais
   repetido: clicar num card do quadro. Sem ele, o clique ficava sem resposta
   até o servidor devolver a ficha inteira, e a tela não dava sinal nenhum de
   ter ouvido. Era o que fazia o card parecer quebrado.

   Ele desenha o CASCO na hora: o fundo escurece, a moldura de papel com a
   sombra dura sobe, e a régua corre dentro dela. O que chega depois é o
   miolo, dentro da mesma caixa que já está na tela, então a ficha não
   "aparece", ela se preenche.

   ---------- por que o casco não tem o botão de fechar ----------
   Ele é um `<button>` que chama `router.back()`, e isso exige o cliente. Um
   X desenhado aqui que não fecha nada seria pior do que não ter X: a espera
   dura o tempo de uma consulta, e o Escape do modal de verdade assume assim
   que ele monta. O que este casco faz é dizer que a caixa está vindo. */
import { Carregando } from "@/components/crm/Carregando";
import s from "@/app/crm/crm.module.css";

export default function CarregandoFicha() {
  return (
    <div className={s.fundo}>
      <div className={s.fichaCaixa}>
        <div className={s.carregandoNaCaixa}>
          <Carregando palavra="Abrindo a ficha" />
        </div>
      </div>
    </div>
  );
}
