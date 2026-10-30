import type {PracticeState} from './practice-state'

export const sandScorpion={name:'모래 전갈',maxHp:48,attack:8,gold:120} as const
export const combatMagic={ember:'불꽃 피해 20',tide:'이번 반격 피해 8 감소',light:'내 체력 18 회복',sand:'피해 12 · 이번 반격 봉쇄'} as const
export type CombatAction={type:'attack'}|{type:'flee'}|{type:'magic';id:string}
export type CombatEvent={kind:'player'|'monster'|'defense'|'reward'|'system';text:string;damage?:number;critical?:boolean;healing?:number;gold?:number;effect?:'evade'|'block'|'stun'}
export type CombatResult={state:PracticeState;playerState:PracticeState;lines:string[];events:CombatEvent[]}
export type TurnFeedback={id:number;phase:'player'|'reply';events:CombatEvent[];action:CombatAction['type']}
export function escapeChance(state:PracticeState){
 const weapon=state.weapons.find(item=>item.id===state.weaponId),armor=state.armor.find(item=>item.id===state.armorId)
 return Math.max(0,Math.min(100,35+(weapon?.escapeBonus??0)+(armor?.escapeBonus??0)+state.escapeBoost))
}
export function startScorpionCombat(state:PracticeState):PracticeState{
 if(state.hp<=0||state.combat?.status==='active')return state
 return {...state,combat:{enemyHp:sandScorpion.maxHp,turn:0,status:'active'}}
}
export function resolveCombatTurn(state:PracticeState,action:CombatAction,random=Math.random):CombatResult{
 const unchanged={state,playerState:state,lines:[],events:[]}
 if(!state.combat||state.combat.status!=='active'||state.hp<=0)return unchanged
 const weapon=state.weapons.find(item=>item.id===state.weaponId),armor=state.armor.find(item=>item.id===state.armorId)
 let next={...state,combat:{...state.combat,turn:state.combat.turn+1}},guard=0,stunned=false
 const lines:string[]=[]
 const events:CombatEvent[]=[]
 const record=(event:CombatEvent)=>{events.push(event);lines.push(event.text)}
 if(action.type==='flee'){
  const chance=escapeChance(state);next.escapeBoost=0
  if(random()*100<chance){const playerState={...next,combat:{...next.combat}};next.combat.status='escaped';record({kind:'system',text:`도망 성공! (${chance}%) 보상 없이 아래층으로 향합니다.`});return {state:next,playerState,lines,events}}
  record({kind:'system',text:`도망 실패! (${chance}%) 모래 전갈이 뒤쫓아옵니다.`})
 }else if(action.type==='attack'){
  const critical=random()*100<(weapon?.critical??0),damage=Math.max(1,weapon?.attack??1)*(critical?2:1)
  next.combat.enemyHp=Math.max(0,next.combat.enemyHp-damage)
  record({kind:'player',damage,critical,text:`${critical?'치명타! ':''}${weapon?.name??'공격'}으로 ${damage} 피해를 입혔습니다.`})
 }else{
  const spell=state.spells.find(spell=>spell.id===action.id)
  if(!spell||!state.equippedSpells.includes(action.id)||state.mp<spell.mana||!(action.id in combatMagic))return unchanged
  next.mp-=spell.mana
  if(action.id==='ember')next.combat.enemyHp=Math.max(0,next.combat.enemyHp-20)
  if(action.id==='tide')guard=8
  if(action.id==='light')next.hp=Math.min(100,next.hp+18)
  if(action.id==='sand'){next.combat.enemyHp=Math.max(0,next.combat.enemyHp-12);stunned=true}
  record({kind:'player',damage:action.id==='ember'?20:action.id==='sand'?12:undefined,healing:action.id==='light'?Math.min(18,100-state.hp):undefined,text:`${spell.name} 시전! ${combatMagic[action.id as keyof typeof combatMagic]} · 마나 ${spell.mana} 소모.`})
 }
 const playerState={...next,combat:{...next.combat}}
 if(next.combat.enemyHp===0){next.combat.status='won';next.gold+=sandScorpion.gold;record({kind:'reward',gold:sandScorpion.gold,text:`모래 전갈을 처치했습니다! 탐험 골드 +${sandScorpion.gold}.`});return {state:next,playerState,lines,events}}
 if(stunned)record({kind:'defense',effect:'stun',text:'모래가 시야를 가려 전갈이 반격하지 못했습니다.'})
 else if(random()*100<(armor?.evasion??0))record({kind:'defense',effect:'evade',text:'모래 전갈의 공격을 회피했습니다!'})
 else{
  const damage=Math.max(0,sandScorpion.attack-(armor?.reduction??0)-guard)
  next.hp=Math.max(0,next.hp-damage);record({kind:damage>0?'monster':'defense',effect:damage===0?'block':undefined,damage,text:`반격! ${damage} 피해를 받았습니다.`})
  if(next.hp===0){next.combat.status='lost';record({kind:'system',text:'체력이 모두 소진되었습니다. 연습 탐험을 다시 시작할 수 있어요.'})}
 }
 return {state:next,playerState,lines,events}
}
