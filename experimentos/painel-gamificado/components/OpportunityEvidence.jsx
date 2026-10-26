const date=value=>new Date(value).toLocaleDateString('pt-BR',{timeZone:'UTC',day:'2-digit',month:'short'});
export default function OpportunityEvidence({mission}){
  if(!mission.period)return null;
  return <section className="opportunity-evidence" aria-label="Dados que justificam a oportunidade"><span className="eyebrow">Oportunidade identificada · dados fictícios</span><p>{mission.evidence}</p><small>Período: {date(mission.period.start)} a {date(Date.parse(mission.period.end)-1)} · janela concluída</small><p className="field-help">Clique no WhatsApp indica interesse. Não confirma mensagem enviada ou venda.</p></section>;
}
