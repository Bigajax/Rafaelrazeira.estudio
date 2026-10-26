import Dialog from './Dialog';
import EvolutionEmblem from './EvolutionEmblem';
import Retrospective from './Retrospective';
export default function MilestoneDialog({achievement,onClose}){
  return <Dialog id="milestone-dialog" className="milestone-dialog" labelId="milestone-title" onClose={onClose}><header><span className="eyebrow">Uma marca do seu caminho</span><button className="icon-button" onClick={onClose} aria-label="Fechar conquista">×</button></header><EvolutionEmblem level={achievement.level}/><h2 id="milestone-title">Olha o quanto sua loja evoluiu.</h2><p>Este foi o caminho até o nível {achievement.level}.<br/>Cada número corresponde a uma melhoria registrada.</p><Retrospective summary={achievement.summary}/><button className="button primary" onClick={onClose}>Continuar evoluindo</button></Dialog>;
}
