import {getFloorMonster,type Monster} from './monster-catalog'
import type {MonsterPatternState,PracticeState} from './practice-state'
import {adjustDeepMonster,deepPatternNotice} from './deep-monster-patterns'

export function getCombatMonster(state:Pick<PracticeState,'combat'|'market'|'mode'>):Monster{
 const monster=getFloorMonster(state.combat?.monsterId,state.market.floor,state.mode==='practice'),pattern=state.combat?.pattern
 if(monster.pattern==='shell')return {...monster,defense:Math.max(0,monster.defense-3*(pattern?.shellHits??0))}
 if(monster.pattern==='mirror')return {...monster,defense:monster.defense+(pattern?.mirrorGuard==='physical'?6:0),magicResistance:monster.magicResistance+(pattern?.mirrorGuard==='magic'?6:0)}
 return adjustDeepMonster(monster,state)
}
export function monsterPatternNotice(state:PracticeState):string|undefined{
 if(state.combat?.status!=='active')return
 const monster=getCombatMonster(state),p=state.combat.pattern
 const deepNotice=deepPatternNotice(state,monster)
 if(deepNotice)return deepNotice
 switch(monster.pattern){
  case 'shell':return `껍질 균열 ${Math.min(2,p?.shellHits??0)}/2 · 기본 공격 적중마다 방어 −3`
  case 'coward':return p?.fleeReady?'도주 준비! 다음 행동 전에 처치하거나 행동을 봉쇄하세요.':'체력 절반 이하에서 도주 준비 · 달아나면 보상 없음'
  case 'hourglass':return
  case 'mirror':return p?.mirrorGuard==='physical'?'물리 저항 · 방어 +6 · 마법으로 공격하면 마저 저항으로 전환':p?.mirrorGuard==='magic'?'마법 저항 · 마저 +6 · 기본 공격으로 공격하면 물리 저항으로 전환':'맞은 공격에 적응 · 기본 공격 ↔ 마법을 번갈아 사용하세요.'
 }
}
export function monsterMoveChance(monster:Monster,basic=false,pattern?:MonsterPatternState){
 if(monster.skillChance!==undefined)return pattern?.shieldHp?'보호막 유지 중 기본 공격':`${Math.round((basic?1-monster.skillChance:monster.skillChance)*100)}%`
 if((monster.pattern==='golden-scales'||monster.pattern==='sand-devourer'))return '무작위 · 같은 스킬 연속 사용 없음'
 if(['eclipse-moth','gilded-armor','gem-charge','black-sun'].includes(monster.pattern??''))return '몬스터 행동 규칙에 따라 사용'
 if(monster.pattern==='coward'&&pattern?.fleeReady)return basic?'도주 준비 중':'다음 행동 도주'
 if(monster.pattern==='coward')return basic?'도주 준비 전':'체력 절반 이하'
 if(monster.pattern==='hourglass')return basic?'65%':'35%'
 return monster.magic.length===2?'33%':monster.magic.length===1?'50%':'100%'
}
