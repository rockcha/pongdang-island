import type {CombatAction,CombatResult,TurnFeedback} from './combat-state'

export function combatPhaseEvents(result:CombatResult,phase:TurnFeedback['phase']){
 const bleed=result.actionState?result.events.findIndex(e=>e.phase!=='reply'&&e.effect==='bleed'&&e.target==='player'&&e.damage!==undefined):-1
 if(phase==='player')return result.events.filter((e,i)=>e.phase!=='reply'&&(bleed<0||i<bleed))
 if(phase==='bleed')return result.events.filter((e,i)=>e.phase!=='reply'&&bleed>=0&&i>=bleed)
 if(phase==='reply')return result.events.filter(e=>e.phase==='reply')
 return result.events
}

/** Present one authoritative result, with complete numbers, at its actual phase. */
export function combatPresentation(result:CombatResult,phase:TurnFeedback['phase'],action:CombatAction['type']='attack'){
 if(phase==='prepare')return {event:undefined,text:action==='attack'?'무기를 고쳐 쥐고, 공격할 틈을 노린다…':action==='magic'?'마력을 모으고 있다…':action==='potion'?'포션의 마개를 열고 있다…':'빠져나갈 틈을 살핀다…'}
 if(phase==='counter'){const event=combatPhaseEvents(result,'player').find(e=>e.kind==='player')??combatPhaseEvents(result,'player').at(-1);return {event,text:event?.text??(action==='flee'?'출구를 향해 달린다…':'')}}
 const events=combatPhaseEvents(result,phase)
 const event=phase==='player'?events.find(e=>e.kind==='player')??events.at(-1):phase==='bleed'?events.find(e=>e.effect==='bleed'&&e.damage!==undefined):events.find(e=>e.kind==='monster'||e.kind==='defense')??events.at(-1)
 return {event,text:event?.text??(action==='flee'?'출구를 향해 달린다…':'')}
}
