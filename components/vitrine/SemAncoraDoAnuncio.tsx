/* ============================================================
   O ANÚNCIO CHEGA COM #ÂNCORA, E A PÁGINA ABRE NO TOPO (11/09/2026)

   As URLs dos anúncios da Meta apontam para o formulário (#contratar no
   lote pip-h17u-base, #hero-form nos anteriores): a ideia era pousar a
   pessoa no Contact pelo qual a campanha otimiza. Na prática, no celular,
   o navegador pulava a manchete e a oferta (a promessa inteira da primeira
   dobra) e, com `scroll-behavior: smooth` no <html>, o salto de sete telas
   virava uma rolagem animada que o Rafael viu "travando" no navegador do
   Instagram.

   ---------- duas defesas, porque a primeira não bastou (12/09) ----------
   1. O fragmento é apagado ANTES de o navegador chegar ao elemento: o
      script é inline e está no começo do corpo, então roda durante o
      parse. No Chrome isso resolve sozinho (testado).
   2. O navegador embutido do Instagram (e o WebKit do iPhone) faz o salto
      DEPOIS, na carga, e ignora a troca de URL: os leads de 12/09 às 11:05
      chegaram com o `#contratar` ainda na URL. Por isso, se a página
      nasceu com fragmento de formulário, no evento `load` (e duas vezes
      depois, para o salto tardio) ela volta ao topo, com a rolagem suave
      desligada para não animar a volta. Só se a pessoa ainda não tocou na
      tela: quem já começou a rolar não é puxado de volta.

   Só os fragmentos de formulário. Um link compartilhado para #projetos ou
   #faq continua funcionando: quem manda esse link quer mostrar aquela
   seção, e o anúncio nunca aponta para ela.

   Componente de servidor, sem hook: é um <script> com o texto pronto,
   igual ao JSON-LD. A landing estática faz o mesmo no topo de
   public/estudio/js/main-lp.js.
   ============================================================ */
const CODIGO = `(function(){var F=/^#(hero-form|contratar|oferta|contato|form)$/;if(!F.test(location.hash))return;
var limpar=function(){if(F.test(location.hash))history.replaceState(null,"",location.pathname+location.search)};limpar();
try{history.scrollRestoration="manual"}catch(e){}
var tocou=false,marcar=function(){tocou=true};addEventListener("touchstart",marcar,{passive:true,once:true});addEventListener("wheel",marcar,{passive:true,once:true});
var raiz=document.documentElement,topo=function(){if(tocou)return;limpar();raiz.style.scrollBehavior="auto";scrollTo(0,0);setTimeout(function(){raiz.style.scrollBehavior=""},50)};
addEventListener("load",function(){topo();setTimeout(topo,250);setTimeout(topo,900)});})();`;

export function SemAncoraDoAnuncio() {
  return <script dangerouslySetInnerHTML={{ __html: CODIGO }} />;
}
