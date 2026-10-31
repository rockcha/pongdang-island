import {acquiredItemIds,recordAcquired} from './acquisition-history'
import {drawTieredOffers} from './merchant-stock'
import {plannedSpells} from './spell-catalog'
import {practiceSpells,type PracticeState} from './practice-state'
import {combatMagic} from './combat-state'

export type ShamanStock={shopkeeperId?:import('./shopkeepers').ShopkeeperId;floor:number;spellIds:string[]}
export const shamanSpells=[...practiceSpells.map(spell=>({...spell,tier:'starter' as const,available:true,description:combatMagic[spell.id as keyof typeof combatMagic]??spell.description})),...plannedSpells]
// Only selected rooms use this stock; no automatic room appearance roll is added.
export function drawShamanStock(floor:number,random=Math.random):ShamanStock{
 return {floor,spellIds:drawTieredOffers(shamanSpells,floor,random)}
}
export function shamanLearningBlock(state:PracticeState,id:string):string|null{
 if(state.combat?.status==='active')return '전투 중에는 배울 수 없어요.'
 if(state.shamanStock?.floor!==state.market.floor||!state.shamanStock.spellIds.includes(id))return '진열된 마법이 아니에요.'
 const spell=shamanSpells.find(item=>item.id===id)
 if(!spell)return '진열된 마법이 아니에요.'
 if(acquiredItemIds(state).has(id))return '습득 완료'
 if(!spell.available)return '효과 준비 중'
 if(state.gold<(spell.learnPrice??0))return '골드 부족'
 return null
}
export function learnShamanSpell(state:PracticeState,id:string):PracticeState{
 if(shamanLearningBlock(state,id))return state
 const spell=shamanSpells.find(item=>item.id===id)!
 return {...state,acquiredIds:recordAcquired(state,id),gold:state.gold-spell.learnPrice!,spells:[...state.spells,{...spell,message:spell.description}]}
}
