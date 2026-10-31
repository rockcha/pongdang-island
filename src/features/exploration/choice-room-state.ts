import {acquiredItemIds,recordAcquired} from './acquisition-history'
import {canUseTeleport} from './campaign'
import {plannedSpells} from './spell-catalog'
import {playerManaMax,playerMaxHp,type PracticeState} from './practice-state'
export type ChoiceRoomId='soul-lantern'|'deep-well'|'forbidden-trade'|'cursed-gem-eye'|'broken-teleport'
export const forbiddenSpells=(state:PracticeState)=>plannedSpells.filter(spell=>spell.tier==='advanced'&&spell.available&&!acquiredItemIds(state).has(spell.id))
export function choiceRoomBlock(state:PracticeState,id:ChoiceRoomId):string|null{
 if(state.hp<=0||state.combat?.status==='active')return '지금은 거래할 수 없어요.'
 if(id==='soul-lantern')return state.soulLantern==='ready'?'이미 불이 켜져 있어요.':playerManaMax(state)<20?'최대 마나 10을 남겨야 해요.':null
 if(id==='forbidden-trade')return state.hp<=50?'체력 51 이상 필요':!forbiddenSpells(state).length?'받을 중급 마법이 없어요.':null
 if(id==='cursed-gem-eye'&&(state.cursedEyeBattles??0)>0)return '기존 저주가 끝나야 해요.'
 if(id==='broken-teleport')return state.pendingFloorAdvance?'이미 이동을 준비했어요.':!canUseTeleport(state.market.floor)?'고정 방이 있는 구간은 이동할 수 없어요.':state.gold<200?'골드 200 필요':null
 return null
}
export function acceptChoiceRoom(state:PracticeState,id:ChoiceRoomId,random=Math.random):PracticeState{
 if(choiceRoomBlock(state,id))return state
 if(id==='soul-lantern'){
  const next={...state,soulLantern:'ready' as const,maxManaSacrifice:(state.maxManaSacrifice??0)+10}
  return {...next,mp:Math.min(state.mp,playerManaMax(next))}
 }
 if(id==='deep-well')return {...state,hp:playerMaxHp(state),mp:0}
 if(id==='cursed-gem-eye')return {...state,gold:state.gold+500,cursedEyeBattles:2}
 if(id==='broken-teleport')return {...state,gold:state.gold-200,pendingFloorAdvance:3}
 const pool=forbiddenSpells(state),spell=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]
 return {...state,hp:state.hp-50,acquiredIds:recordAcquired(state,spell.id),spells:[...state.spells,{...spell,message:spell.description}]}
}
