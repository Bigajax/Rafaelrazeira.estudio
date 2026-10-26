// Interface copy only. Objective identities, priorities and rewards stay in domain/.
export const groupHeadline=group=>({
  esgotado:'Decida como atender a procura sem estoque.',
  buscas:'Entenda o que não foi encontrado.',
  campanha:'Aprenda com sua última divulgação.',
  fotos:'Complete a apresentação da sua vitrine.',
  apresentacao:'Conte os detalhes que ajudam na escolha.',
  disponibilidade:'Revise a disponibilidade dos seus produtos.',
  oportunidades:'Peças com procura pedem atenção.'
})[group.kind]??group.title;

export function missionHeadline(mission,product){
  if(mission.type==='buscas')return 'O que seus visitantes não encontraram?';
  if(mission.type==='campanha')return 'Sua divulgação já pode ser analisada.';
  if(mission.type==='esgotado')return `${product.name} tem procura, mas está esgotado.`;
  return ({
    foto:`${product.name} precisa de uma foto.`,
    detalhe:`${product.name}: mostre o acabamento.`,
    descricao:`${product.name} precisa de mais informações.`,
    contagem:`${product.name}: confira a disponibilidade.`,
    revisao:`${product.name}: confira a divergência.`,
    material:`${product.name}: informe a composição.`
  })[mission.type]??mission.title;
}
export function missionDescription(mission){
  if(['esgotado','buscas','campanha'].includes(mission.type))return mission.reason;
  return ({
    foto:'A primeira foto ainda não aparece na vitrine. Adicione uma imagem para que seus clientes conheçam a peça antes de chamar a loja.',
    detalhe:'Uma foto de perto ajuda a conhecer o acabamento. Adicione o detalhe que falta na apresentação.',
    descricao:'Informe caimento e acabamento para ajudar na escolha. Use características da própria peça.',
    contagem:'A quantidade ainda não foi conferida. Registre o que você tem para separar com mais segurança.',
    revisao:'Existe uma divergência na disponibilidade. Confira a quantidade e registre como fez a conferência.',
    material:'A composição ainda não aparece na peça. Informe o que consta na etiqueta para ajudar quem está avaliando.'
  })[mission.type]??mission.reason;
}
