import {useEffect,useRef,useState} from 'react';
import {Icon} from './Icons';
import XPProgress from './XPProgress';
import LevelUpCelebration from './LevelUpCelebration';
import {rewardFrame} from '../domain/presentation.mjs';
import {isDecision} from '../domain/recognition.mjs';
import DecisionStatus from './DecisionStatus';
import JourneyProgress from './JourneyProgress';
import {groupHeadline} from './mission-copy.mjs';

export default function MissionComplete({mission,result,title,onCelebrationChange}) {
  const [reduced,setReduced]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [phase,setPhase]=useState(reduced||!result.award?'complete':'idle');
  const heading=useRef(null),finished=useRef(reduced||!result.award);
  const levelChanged=Boolean(result.award&&result.progress.level>result.previousProgress.level);
  const celebrating=levelChanged&&(phase==='level_up'||phase==='complete');
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(media.matches);
    media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    if(finished.current)return;
    if(reduced||!result.award){finished.current=true;setPhase('complete');return;}
    const complete=()=>{finished.current=true;setPhase('complete');};
    const timers=[setTimeout(()=>setPhase('xp_received'),300),setTimeout(()=>levelChanged?setPhase('level_up'):complete(),levelChanged?1200:900)];
    if(levelChanged)timers.push(setTimeout(complete,1600));
    return()=>timers.forEach(clearTimeout);
  },[reduced,result,levelChanged]);
  useEffect(()=>{onCelebrationChange(celebrating);},[celebrating,onCelebrationChange]);
  useEffect(()=>{if(!celebrating)heading.current?.focus({preventScroll:true});},[]);
  const decision=isDecision(mission);
  const value=rewardFrame(result.previousProgress,result.progress,phase);
  return <div className={`editor-body saved-result mission-complete ${celebrating?'celebration-body':''}`} data-reward-phase={phase}>
    <div className={celebrating?'sr-only':'completed-mission'}>
      <div className="completion-meta"><span className="completion-stamp"><Icon name="check"/>{decision?'Decisão registrada':'Melhoria realizada'}</span><span className="objective-count">1 de 1 objetivo</span></div>
      <h3 id="saved-title" tabIndex={-1} ref={heading}>{title}.</h3>
      <p>{result.award?.evidence??'Esta melhoria já estava registrada.'}</p>
      <div className="mission-receipt"><span className="eyebrow">{mission.category} / {result.award?(decision?'Análise concluída':'Missão concluída'):(decision?'Decisão já registrada':'Melhoria já reconhecida')}</span>{result.award&&<strong>+{result.award.xp}<small>XP</small></strong>}</div>
    </div>
    {celebrating?<LevelUpCelebration result={result}/>:<>
      <div className="reward-result"><span className="eyebrow">Evolução da loja</span><XPProgress value={value} receiving={phase==='xp_received'} phase={phase}/><p>{phase==='complete'?`${value.within} de ${value.needed} XP para o próximo nível.`:'Cada melhoria faz seu progresso avançar.'}</p></div>
      <p className="field-help">{['esgotado','buscas','campanha'].includes(mission.type)?'Sua análise foi registrada. Novos dados precisam vir de outra ocorrência; nenhuma venda ou reposição foi criada.':mission.type==='material'?'Agora precisamos observar os próximos dados. Esta melhoria não comprova aumento de contatos.':['contagem','revisao'].includes(mission.type)?'Sua conferência ficou registrada nesta loja fictícia.':mission.type==='detalhe'?'O acabamento agora aparece na foto de detalhe.':mission.type==='descricao'?'As informações ficaram registradas na apresentação da peça.':'A primeira foto agora faz parte da apresentação da peça.'}</p>
    </>}
    {decision&&<DecisionStatus type={mission.type}/>}
    {result.journey&&!celebrating&&<div className="saved-journey"><span className="eyebrow">{result.journey.family} / progresso do grupo</span><h4>{groupHeadline(result.journey)}</h4><JourneyProgress group={result.journey}/></div>}
    <span className="sr-only" role="status" aria-live="polite">{phase==='complete'&&result.award?`${decision?'Decisão registrada':'Melhoria salva'}. Mais ${result.award.xp} XP. Nível ${result.progress.level}, ${result.progress.within} de ${result.progress.needed} XP.`:''}</span>
  </div>;
}
