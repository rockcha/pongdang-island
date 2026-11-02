import type {PracticeState} from './practice-state'

export type TimedSpellId='solar-brand'|'soul-knot'|'silent-seal'|'lapis-veil'|'sandstone-skin'
export type TimedSpellEffect={id:TimedSpellId;turns:number}
export function hasTimedSpell(state:Pick<PracticeState,'combat'>,id:TimedSpellId){
 return state.combat?.status==='active'&&!!state.combat.spellEffects?.some(effect=>effect.id===id&&effect.turns>0)
}
