import {decisionFollowup} from '../domain/recognition.mjs';
export default function DecisionStatus({type}){
  return <div className="decision-followup" data-decision-followup><span className="eyebrow">Resultado em acompanhamento</span><p>{decisionFollowup(type)}</p><small>O XP reconhece a análise registrada. Dados posteriores ainda não confirmam um resultado comercial.</small></div>;
}
