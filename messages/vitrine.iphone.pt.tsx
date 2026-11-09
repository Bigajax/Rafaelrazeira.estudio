/* ============================================================
   O TEXTO DA /vitrine/iphone que mora em dicionário (09/11/2026)

   A página (components/vitrine-iphone/VitrineIphone.tsx) é a gramática
   da /loja-online, em preto, e o texto das seções está nela. Aqui ficam o
   título, a descrição do Google e as perguntas, e o objeto entra no
   LangProvider por cima do pt da vitrine (os ícones e balões que a página
   reaproveita leem dele).

   As perguntas falam o que o vídeo do lote 17 diz: o cliente não paga no
   site (a venda fecha na conversa), o preço muda pelo celular. A de lacrado
   e seminovo diz só "pode ser uma categoria": conferir no molde se a grade
   mostra "128 GB" sem "Único" antes de prometer mais (5 Armadilhas/unico-no-tenis).
   ============================================================ */
import { pt, type VitrineMessages } from "./vitrine.pt";

export const ptIphone: VitrineMessages = {
  ...pt,
  meta: {
    title: "Vitrine digital para quem vende iPhone",
    description: "Eu monto a amostra da sua vitrine com os seus aparelhos, sem custo. Preço, memória, cor e fotos num link só, e o pedido chega pronto no seu WhatsApp. R$999, sem mensalidade.",
  },
  faq: {
    ...pt.faq,
    duvida: { ...pt.faq.duvida, msg: "Oi Rafael, vendo iPhone e tenho uma dúvida sobre a vitrine." },
    itens: [
      { p: "O cliente paga pelo site?", r: "Não. Ele escolhe o aparelho na vitrine e o pedido chega pronto no seu WhatsApp. O pagamento, o parcelamento e a entrega você combina na conversa, como já faz hoje.", nao: true },
      { p: "Mudou o preço. Como eu troco?", r: "Pelo painel, no celular. Você abre o aparelho, troca o preço e a vitrine já mostra o novo. Não precisa me chamar.", nao: false },
      { p: "Lacrado e seminovo na mesma vitrine?", r: "Sim. Cada um pode ser uma categoria, e cada aparelho tem a sua página com preço, memória, cor e fotos.", nao: false },
      { p: "O que eu preciso mandar?", r: "A logo, as fotos dos aparelhos e a lista deles com preço, memória e cor. O prazo de 7 dias úteis conta a partir do dia em que tudo isso chega.", nao: false },
      /* "Por que R$999 e não R$5 mil?" e "E se eu desistir?", iguais aos da /vitrine-digital */
      pt.faq.itens[3],
      pt.faq.itens[4],
    ],
  },
};
