const decisionTypes=new Set(['esgotado','buscas','campanha']);
export const isDecision=record=>decisionTypes.has(record.type??record.id?.split(':')[1]);
export function recognitionSummary(history){
  const decisions=history.filter(isDecision).length;
  return {records:history.length,decisions,improvements:history.length-decisions};
}
export const decisionFollowup=type=>type==='esgotado'?'Sua decisão ficou registrada. A peça pode continuar indisponível; esta análise não confirma uma reposição.':type==='buscas'?'Sua análise ficou registrada. Precisamos de uma ação ou informação posterior para avaliar esta procura.':'Sua conclusão ficou registrada. Ela não confirma melhora na campanha ou aumento de vendas.';
