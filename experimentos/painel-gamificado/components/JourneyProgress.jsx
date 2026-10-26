import {isDecision} from '../domain/recognition.mjs';
import {groupHeadline} from './mission-copy.mjs';
export default function JourneyProgress({group,compact=false}){
  const decision=group.items?.some(isDecision)??false;
  const text=`${group.completed} de ${group.total} ${decision?(group.total===1?'cuidado registrado':'cuidados registrados'):(group.total===1?'melhoria concluída':'melhorias concluídas')}`;
  return <div className={`journey-progress ${compact?'compact':''}`} data-group-progress={group.id}>
    <div><strong>{text}</strong><span>{group.earnedXP?`+${group.earnedXP} XP recebidos`:decision?'XP após registrar cada análise':'XP após salvar cada melhoria'}</span></div>
    <div className="journey-track" role="progressbar" aria-label={`Progresso de ${groupHeadline(group)}`} aria-valuemin={0} aria-valuemax={group.total} aria-valuenow={group.completed} aria-valuetext={text}><span style={{transform:`scaleX(${group.completed/group.total})`}}/></div>
    {!compact&&group.complete&&<p><strong>Grupo finalizado.</strong> {decision?'As análises deste conjunto foram registradas. Isso não confirma um resultado comercial.':'Todas as melhorias deste conjunto ficaram registradas.'} O total vem das recompensas individuais.</p>}
  </div>;
}
