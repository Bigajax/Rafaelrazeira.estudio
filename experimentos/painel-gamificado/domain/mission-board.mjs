import {missions,MISSION_TYPES} from './engine.mjs';
import {missionArea} from './journeys.mjs';
const types=new Set(MISSION_TYPES);
export const missionSections=['disponiveis','adiadas','concluidas'];
export function missionBoard(state){
  const deferred=new Set(state.deferred),all=missions(state,{includeDeferred:true,limit:Infinity});
  return {disponiveis:all.filter(m=>!deferred.has(m.id)),adiadas:all.filter(m=>deferred.has(m.id)),concluidas:[...state.history].filter(h=>types.has(h.type??h.id.split(':')[1])).map(h=>({...h,category:missionArea(h)})).reverse()};
}
export function missionCategoryIcon(category){return category==='Estoque'?'box':category==='Conversão'?'growth':'photo';}
export function completedMissionTitle(award){
  const type=award.type??award.id.split(':')[1];
  return {foto:'Foto de capa adicionada',detalhe:'Foto de detalhe adicionada',descricao:'Informações da peça adicionadas',contagem:'Primeira contagem registrada',revisao:'Disponibilidade revisada',material:'Composição informada',esgotado:'Decisão de disponibilidade registrada',buscas:'Busca analisada',campanha:'Conclusão da campanha registrada'}[type]??award.title;
}
