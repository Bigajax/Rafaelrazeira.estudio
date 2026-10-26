import {descriptionFromFacts} from './context.mjs';
const copy={
  esgotado:{why:'Esta variação está indisponível e há procura registrada no período apresentado. Vale conferir a disponibilidade e escolher como atender quem procura.',unknown:['Visitas não comprovam intenção de compra; não sabemos quantos visitantes encontraram a peça indisponível.','Não temos custo de reposição, margem ou confirmação do fornecedor.'],advice:{manter:'Manter indisponível pode ser uma decisão adequada. Defina como orientar quem procura.',avaliar:'Antes de decidir, confira custo, margem, disponibilidade do fornecedor e interesse recebido. A análise não compra mercadoria.',alternativa:'Confira se outra peça disponível atende ao que a cliente procura. Os itens da mesma categoria não são equivalentes automaticamente.'}},
  buscas:{why:'O termo registrado não encontrou resultados. Pode existir uma diferença entre o nome usado pela cliente e o cadastro, ou a loja pode não trabalhar com esse item.',unknown:['Não sabemos se o visitante procuraria outra peça ou compraria.','Uma busca sem resultado não comprova falta de um produto no mercado.'],advice:{revisar:'Confira nomes e categorias antes de criar novos produtos.',avaliar:'Observe o termo e avalie se faz sentido para a loja.',fora:'Você pode registrar que esse item está fora do catálogo. Não é obrigatório oferecê-lo.'}},
  campanha:{why:'O período rastreado terminou. As contagens permitem registrar uma conclusão e planejar um próximo passo.',unknown:['Cliques no WhatsApp não confirmam mensagem enviada ou venda.','Não temos custo da campanha nem outra campanha comparável para afirmar melhora ou queda.'],advice:{manter:'Registre o que deseja manter, sem chamar os cliques de vendas.',ajustar:'Defina o que mudará na próxima divulgação e acompanhe outra ocorrência rastreada.',observar:'Registre quais informações ainda faltam. Apenas aguardar não cria XP adicional.'}}
};
const guidance={foto:'Escolha uma foto real que mostre a peça inteira. Confira a imagem e salve no formulário.',detalhe:'Adicione uma foto de perto do acabamento que falta. Não é necessário refazer a foto de capa.',descricao:'Informe características que você conhece. A sugestão usa essas informações e deve ser revisada antes de salvar.',material:'Leia a composição na etiqueta e transcreva no campo. Não deduza o tecido pela foto.',contagem:'Conte as unidades da variação e informe como conferiu. Zero é válido.',revisao:'Confira as peças e registre a quantidade encontrada, com o motivo. Uma contagem menor continua sendo válida.'};
export const simulatedProvider={
  name:'simulated',
  async respond({context,intent,question,simulation='normal'}){
    await new Promise(resolve=>setTimeout(resolve,simulation==='slow'?700:60));
    if(simulation==='unavailable')throw Error('SIMULATED_UNAVAILABLE');
    if(simulation==='invalid')return {xp:9999,description:'Tecido premium inventado.'};
    const c=copy[context.type],options=Object.entries(context.choices).map(([id,label])=>({id,label,advice:c.advice[id]}));
    let followup=null;
    if(intent==='question'){
      if(/repor|reposi|custo|margem|fornecedor/i.test(question))followup=context.type==='esgotado'?'Não é obrigatório repor. Faltam custo, margem e disponibilidade do fornecedor para avaliar essa decisão. Registre o que você decidir.':'Não temos custos ou margem neste contexto. A análise usa somente a evidência apresentada.';
      else if(/alternativa|semelhante/i.test(question))followup=context.alternatives.length?'Há outras peças disponíveis na mesma categoria. Confira se atendem ao que a cliente procura; não podemos afirmar equivalência.':'Não há alternativas disponíveis identificadas neste contexto.';
      else if(/clique|venda|resultado|convers/i.test(question))followup='Clique no WhatsApp não confirma conversa ou venda. Não temos evidência suficiente para atribuir um resultado à ação.';
      else if(/medida|tamanho|compos|tecido/i.test(question))followup='Use o tamanho e a composição cadastrados. Medidas adicionais e características ausentes precisam ser conferidas na peça.';
      else followup=guidance[context.type]??'Posso explicar os dados deste cuidado e as opções apresentadas. Nenhuma escolha é executada pelo assistente.';
    }
    return {mode:'simulated',missionId:context.missionId,observed:context.observed,
      why:c?.why??'Uma informação específica ainda precisa ser registrada. Completar esse cuidado ajuda a apresentar ou conferir a peça, sem garantir um resultado comercial.',
      options,execution:guidance[context.type]??({esgotado:'Confira se a reposição faz sentido antes de divulgar esta variação novamente. Você pode manter indisponível ou avaliar uma alternativa.',buscas:'Confira o nome usado na busca e os nomes cadastrados. Registre se vai ajustar o catálogo ou acompanhar o interesse.',campanha:'Confira os cliques desta divulgação e escolha o que manter, ajustar ou observar na próxima campanha.'}[context.type]),
      unknown:c?.unknown??['Não temos confirmação de vendas ou de resultado causado por este cuidado.','Características ausentes precisam ser informadas por quem conhece a peça.'],followup,
      description:intent==='execute'?descriptionFromFacts(context):null};
  }
};
