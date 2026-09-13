/* ============================================================
   A PÁGINA DO ANÚNCIO ABRE NO TOPO (11 e 12/09/2026)

   O Rafael abriu o próprio anúncio pelo Instagram e a página rolou
   sozinha até o formulário do fim, "travando" no caminho. A primeira
   suspeita foi o #contratar na URL dos anúncios, e não era: a URL dos
   anúncios não tem fragmento (conferido no Gerenciador em 12/09); o
   `#contratar` que aparece na URL dos leads é do clique da própria pessoa
   num botão da página. O que rola a página é o navegador embutido da Meta
   depois da carga, muito provavelmente o preenchimento automático dele,
   que procura o formulário com nome e telefone e leva a tela até ele. Com
   `scroll-behavior: smooth` no <html>, esse salto vira a rolagem animada
   de sete telas que parecia travar.

   ---------- a regra ----------
   Nos primeiros segundos de vida da página, rolagem que não vem do dedo
   não é da pessoa. No celular toda rolagem humana começa com touchstart;
   no desktop, com wheel, teclado ou um clique (pointerdown: o clique no
   CTA do topo nos primeiros segundos rola até o formulário, e é da pessoa). Então: até 3,5s depois do `load`, se
   a página rolar mais de meia tela sem nenhum desses sinais antes, ela
   volta ao topo, com a rolagem suave desligada para a volta ser seca.
   Quem já tocou na tela nunca é puxado de volta.

   As defesas de antes continuam, porque são baratas: fragmento de
   formulário na URL é apagado no parse (Chrome resolve aí) e força o topo
   na carga; `scrollRestoration = "manual"` sempre, para o navegador não
   devolver a página à posição de uma visita anterior. Um link
   compartilhado para #faq ou #projetos continua funcionando: só os
   fragmentos de formulário entram na regra, e com qualquer outro
   fragmento na URL a guarda nem liga: o salto até #faq é o pedido.

   Componente de servidor, sem hook: é um <script> inline no começo do
   corpo, então roda durante o parse, antes de qualquer elemento existir.
   A landing estática faz o mesmo no topo de public/estudio/js/main-lp.js.
   ============================================================ */
const CODIGO = `(function(){var F=/^#(hero-form|contratar|oferta|contato|form)$/,h=location.hash,temHash=F.test(h);if(h&&!temHash)return;
var limpar=function(){if(F.test(location.hash))history.replaceState(null,"",location.pathname+location.search)};if(temHash)limpar();
try{history.scrollRestoration="manual"}catch(e){}
var tocou=false,marcar=function(){tocou=true};addEventListener("touchstart",marcar,{passive:true,once:true});addEventListener("wheel",marcar,{passive:true,once:true});addEventListener("keydown",marcar,{once:true});addEventListener("pointerdown",marcar,{passive:true,once:true,capture:true});
var raiz=document.documentElement,topo=function(){if(tocou)return;limpar();raiz.style.scrollBehavior="auto";scrollTo(0,0);setTimeout(function(){raiz.style.scrollBehavior=""},50)};
var ate=Date.now()+8000;addEventListener("load",function(){ate=Date.now()+3500;if(temHash){topo();setTimeout(topo,250);setTimeout(topo,900)}});
addEventListener("scroll",function(){if(tocou||Date.now()>ate)return;if(scrollY>innerHeight*0.5)topo()},{passive:true});})();`;

export function SemAncoraDoAnuncio() {
  return <script dangerouslySetInnerHTML={{ __html: CODIGO }} />;
}
