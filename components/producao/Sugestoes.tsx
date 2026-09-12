"use client";

/* ============================================================
   AS ESCOLHAS — marcar em vez de escrever

   Todo campo livre desta ficha existe porque a resposta muda de loja para
   loja. Só que "muda de loja para loja" não quer dizer "é sempre
   diferente": entrega é quase sempre uma combinação de três coisas,
   pagamento de duas, e "o que a marca não é" sai quase sempre da mesma
   lista curta de vícios de e-commerce.

   Escrever tudo à mão, toda vez, é o atrito que faz o campo ficar vazio. E
   campo vazio vira instrução de "não invente" no briefing: a loja perde uma
   informação que ela tinha.

   ---------- múltipla escolha SEM trocar o dado por um array ----------
   O que a página do cliente precisa é de uma FRASE ("Pix, ou cartão em até
   3x"), não de uma lista de códigos. Então o valor continua sendo texto, e
   as opções são derivadas dele: um chip aparece marcado quando a frase o
   contém, clicar marca junta, clicar de novo tira.

   Isso dá o comportamento de múltipla escolha e mantém o campo editável à
   mão, que é o que salva o caso que nenhuma lista previu. Guardar array
   obrigaria a escolher entre as duas coisas.
   ============================================================ */

import s from "@/app/(pt)/crm/producao.module.css";

export function Sugestoes({
  opcoes,
  valor,
  aoEscolher,
}: {
  opcoes: string[];
  valor: string;
  aoEscolher: (novo: string) => void;
}) {
  const atual = valor.trim();
  const marcada = (o: string) => atual.toLowerCase().includes(o.toLowerCase());

  function alternar(opcao: string) {
    if (!marcada(opcao)) {
      aoEscolher(atual ? `${atual}, ${emenda(opcao)}` : opcao);
      return;
    }
    /* Tirar a opção do meio da frase deixa vírgula solta e espaço duplo, e
       uma resposta com ", ," é pior que não ter o botão de desmarcar. A
       limpeza acontece aqui, uma vez, para todos os campos. */
    const limpo = atual
      .replace(new RegExp(`${escapar(opcao)}`, "i"), "")
      .replace(/\s*,\s*,/g, ",")
      .replace(/^\s*,\s*/, "")
      .replace(/\s*,\s*$/, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    aoEscolher(limpo);
  }

  return (
    <div className={s.sugestoes}>
      {opcoes.map((opcao) => (
        <button
          key={opcao}
          type="button"
          className={`${s.sugestao} ${marcada(opcao) ? s.sugestaoMarcada : ""}`}
          aria-pressed={marcada(opcao)}
          /* O rótulo do botão é a própria frase que entra no campo: nada de
             "adicionar" ou "usar isto", que obrigariam a ler duas coisas
             para entender uma. */
          onClick={() => alternar(opcao)}
        >
          {opcao}
        </button>
      ))}
    </div>
  );
}

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Ao emendar, a segunda frase entra em minúscula: "Entrego na cidade, Mando
   pelos Correios" é uma frase que ninguém escreveria. Nome próprio e sigla
   ficam de fora, e por isso a regra confere a palavra antes de mexer nela. */
function emenda(frase: string): string {
  const primeira = frase.split(" ")[0];
  const proprios = ["Pix", "Correios", "WhatsApp", "Instagram", "Sem", "Não", "Sedex"];
  if (proprios.includes(primeira)) return frase;
  return frase[0].toLowerCase() + frase.slice(1);
}
