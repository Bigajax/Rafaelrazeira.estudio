import {progress} from './engine.mjs';

// Presentation derives milestones from confirmed awards; it never grants XP.
export function evolutionEvents(history,journeys=[]) {
  let total = 0;
  const events = [];
  for (const award of history) {
    const before = progress(total);
    total += award.xp;
    const after = progress(total);
    events.push({kind:'improvement', ...award});
    if (after.level > before.level) {
      events.push({kind:'level', id:`level:${award.id}`, at:award.at, level:after.level, total});
    }
    for(const group of journeys.filter(g=>g.complete&&g.finalAwardId===award.id))events.push({kind:'journey',id:`journey:${group.id}`,at:group.completedAt,title:group.title,total:group.total,earnedXP:group.earnedXP,family:group.family});
  }
  return events.reverse();
}

export function rewardFrame(before, after, phase) {
  if (phase === 'idle') return before;
  if (phase === 'xp_received' && after.level > before.level) {
    return {...before, within:before.needed, remaining:0, fraction:1};
  }
  return after;
}
