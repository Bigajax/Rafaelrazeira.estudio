/* ============================================================
   O TIPO DE PROJETO VIAJA COM O CLIQUE

   A folha de orçamento tem três linhas, e cada uma sabe qual projeto ela
   é. Quando a pessoa clica numa delas, o valor vai para o campo escondido
   `tipo_projeto` do briefing, que o js/lib/form.js já lê no envio
   (`opc("tipo_projeto")`) e o trackLead já manda ao Meta como propriedade
   do Lead.

   Por que assim e não com mais um campo no formulário: esta é uma página
   de tráfego pago, e a regra da casa é que cada campo a mais é gente que
   desiste no meio. O dado chega igual, sem custar uma linha a mais para
   quem preenche.

   O campo escondido só existe na versão de um passo (a /landing-page). Na
   /estudio o tipo é uma pergunta de verdade, no passo 2 do briefing, e
   esta função nem encontra a seção para ligar.
   ============================================================ */
export function initPrecos(){
  const form = document.getElementById("briefing-form");
  if (!form) return;

  const campo = form.querySelector('input[type="hidden"][name="tipo_projeto"]');
  if (!campo) return;

  const links = document.querySelectorAll(".pr__item[data-tipo], .pr__etiqueta[data-tipo]");
  links.forEach(link => {
    link.addEventListener("click", () => { campo.value = link.dataset.tipo || ""; });
  });
  /* Com uma etiqueta só (desde 11/09) não existe escolha a registrar: o
     tipo já nasce preenchido, e todo lead da página sai como landing page
     mesmo que a pessoa nunca tenha passado pela seção de preço. */
  if (links.length === 1 && !campo.value) campo.value = links[0].dataset.tipo || "";
}
