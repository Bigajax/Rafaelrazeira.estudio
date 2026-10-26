import EvolutionEmblem from './EvolutionEmblem';

export function XPBar({value, receiving=false, animate=true}) {
  return <div className={`xp-track signature-track ${receiving?'receiving':''} ${animate?'':'instant'}`} role="progressbar" aria-label={`Nível ${value.level}: progresso para o próximo nível`} aria-valuemin={0} aria-valuemax={value.needed} aria-valuenow={value.within} aria-valuetext={`${value.within} de ${value.needed} XP`}>
    <span className="xp-fill" style={{transform:`scaleX(${value.fraction})`}}/>
    <span className="xp-cursor" style={{transform:`translateX(${value.fraction*100}%)`}}/>
  </div>;
}

export default function XPProgress({value, receiving=false, compact=false, phase='complete'}) {
  return <div className={`xp-progress ${compact?'compact-progress':''}`} data-phase={phase}>
    {compact&&<EvolutionEmblem level={value.level} compact/>}
    <div className="progress-copy">
      <div><strong key={value.level} className="level-label">Nível {String(value.level).padStart(2,'0')}</strong><span>{value.within} / {value.needed} XP</span></div>
      <XPBar value={value} receiving={receiving} animate={phase!=='level_up'}/>
      <small>{value.remaining===0?'Um novo nível começa aqui.':`Faltam ${value.remaining} XP para o nível ${value.level+1}.`}</small>
    </div>
  </div>;
}
