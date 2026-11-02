import type {Monster,MonsterMove} from './monster-catalog'
import type {PracticeState} from './practice-state'
import type {CombatEvent} from './combat-state'

type Fight=PracticeState&{combat:NonNullable<PracticeState['combat']>}
export function adjustDeepMonster(monster:Monster,state:Pick<PracticeState,'combat'>):Monster{
 const p=state.combat?.pattern??{}
 if(monster.pattern==='gilded-armor')return {...monster,defense:monster.defense-2*Math.min(3,p.shellHits??0)}
 return monster
}

/** Show persistent encounter mechanics, never the next skill choice. */
export function deepPatternNotice(state:Pick<PracticeState,'combat'>,monster:Monster):string|undefined{
 const p=state.combat?.pattern??{}
 switch(monster.pattern){
  case 'eclipse-moth':return
  case 'gilded-armor':return `갑주 균열 ${Math.min(3,p.shellHits??0)}/3 · 기본 공격 적중마다 방어 −2`
  case 'gem-charge':return p.charging?'보석 충전 중! 피해 18 이상 → 충전 중단 · 처치 보상 +50골드(1회)':undefined
  case 'golden-scales':return
  case 'black-sun':{
   return p.shieldHp?`보호막 ${p.shieldHp}`:undefined
  }
 }
}

type Plan={handled:boolean;magic?:MonsterMove}
export function planDeepCounter(next:Fight,monster:Monster,damageDealt:number,record:(event:CombatEvent)=>void):Plan|null{
 const p=next.combat.pattern!,cycle=p.cycle??0
 const rest=(text:string):Plan=>{record({kind:'status',source:monster.name,text});return {handled:true}}
 switch(monster.pattern){
  case 'eclipse-moth':p.cycle=cycle+1;return {handled:false,magic:cycle%2===1?monster.magic[0]:undefined}
  case 'gilded-armor':p.cycle=cycle+1;return {handled:false,magic:cycle%3===1?monster.magic[0]:cycle%3===2?monster.magic[1]:undefined}
  case 'gem-charge':
   if(p.charging){
    p.charging=false;p.cycle=0
    if(damageDealt>=18){p.bonusGold=50;return rest('보석 충전이 깨졌습니다! 이번 반격 없음 · 처치 시 추가 골드 50(1회).')}
    return {handled:false,magic:monster.magic[0]}
   }
   p.cycle=cycle+1
   if(cycle%3===1){p.charging=true;return rest('등의 보석이 빛납니다. 다음 행동에 방출! 피해 18 이상으로 충전을 끊을 수 있습니다.')}
   return {handled:false}
  case 'golden-scales':
  case 'sand-devourer':
   return null // Use the ordinary random basic/skill choice from the shared resolver.
  case 'black-sun':{
   p.cycle=(cycle+1)%5
   if(cycle%5===1)return rest('황금가면의 입에서 붉은 빛이 새어 나온다… 천년의 단죄를 준비합니다.')
   return {handled:false,magic:cycle%5===2?monster.magic[0]:cycle%5===4&&!p.shieldHp?monster.magic[1]:undefined}
  }
  default:return null
 }
}
