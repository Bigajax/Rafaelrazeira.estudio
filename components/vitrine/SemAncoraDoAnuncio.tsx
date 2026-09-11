/* ============================================================
   O ANÚNCIO CHEGA COM #ÂNCORA, E A PÁGINA ABRE NO TOPO (11/09/2026)

   As URLs dos anúncios da Meta apontavam para o formulário (#hero-form
   na vitrine, #contato na landing): a ideia era pousar a pessoa no
   Contact pelo qual a campanha otimiza. Na prática, no celular, o
   navegador pulava a manchete e a oferta (a promessa inteira da primeira
   dobra) e, com `scroll-behavior: smooth` no <html>, o salto de uma ou
   sete telas virava uma rolagem animada que o Rafael viu "travando" no
   navegador do Instagram.

   O script apaga o fragmento ANTES de o navegador chegar ao elemento:
   ele é inline e está no começo do corpo, então roda durante o parse,
   antes de a etiqueta ou o formulário existirem. Sem fragmento, não há
   para onde pular, e a página abre onde toda página abre.

   Só os fragmentos de formulário são apagados. Um link compartilhado
   para #projetos ou #faq continua funcionando: quem manda esse link quer
   mostrar aquela seção, e o anúncio nunca aponta para ela.

   Componente de servidor, sem hook: é um <script> com o texto pronto,
   igual ao JSON-LD. A landing estática faz o mesmo no topo de
   public/estudio/js/main-lp.js.
   ============================================================ */
const CODIGO = `if(/^#(hero-form|contratar|oferta|contato|form)$/.test(location.hash))history.replaceState(null,"",location.pathname+location.search);`;

export function SemAncoraDoAnuncio() {
  return <script dangerouslySetInnerHTML={{ __html: CODIGO }} />;
}
