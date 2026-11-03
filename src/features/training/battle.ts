import {companionDefinition,statsAtLevel,debuffs,statusNames,type Ability,type Stats,type Status,type StatusKind} from './catalog'
import {isEligible,type LocalCompanion} from './local-state'

export type Fighter={hp:number;maxHp:number;shield:number;stats:Stats;effects:Status[];passiveUsed:boolean}
export type Cue={id:number;kind:'physical'|'magic'|'shield'|'heal'|'miss'|'hit';target:'companion'|'dummy';amount:number;critical?:boolean;passive?:string}
export type TrainingBattle={unitId:string;player:Fighter;dummy:Fighter;turn:number;cooldowns:Record<string,number>;focus:number;focusTurns:number;logs:string[];cue:Cue|null}
const amount=(actor:Fighter,kind:StatusKind)=>actor.effects.find(effect=>effect.kind===kind&&effect.turns>0)?.amount??0
const clone=(actor:Fighter):Fighter=>({...actor,stats:{...actor.stats},effects:actor.effects.map(effect=>({...effect}))})
export function addStatus(effects:Status[],status:Status):Status[]{
 const previous=effects.find(effect=>effect.kind===status.kind)
 return [...effects.filter(effect=>effect.kind!==status.kind),{...status,amount:Math.max(status.amount,previous?.amount??0),turns:Math.max(status.turns,previous?.turns??0)}]
}
export function effectiveStat(actor:Fighter,key:'attack'|'magic'|'defense'|'resistance'){
 const up:Record<typeof key,StatusKind>={attack:'attack-up',magic:'magic-up',defense:'defense-up',resistance:'resistance-up'}
 const down=key==='attack'?amount(actor,'weaken'):key==='defense'?amount(actor,'corrosion'):0
 return actor.stats[key]*(1+amount(actor,up[key])/100)*Math.max(0,1-down/100)
}
export function receiveDamage(actor:Fighter,raw:number,kind:'physical'|'magic',options:{penetration?:number;breakShield?:boolean;execute?:number;armoredShell?:boolean}={}){
 const next=clone(actor),defense=effectiveStat(actor,kind==='physical'?'defense':'resistance')*(1-Math.min(100,Math.max(0,options.penetration??0))/100)
 const reduction=Math.min(90,Math.max(0,amount(actor,'damage-down')+(options.armoredShell&&actor.shield>0?10:0)))
 const damage=Math.max(0,Math.round(raw*100/(100+Math.max(0,defense))*(1+amount(actor,'vulnerable')/100)*(1-reduction/100)))
 if(options.breakShield)next.shield=0
 const absorbed=Math.min(next.shield,damage);next.shield-=absorbed
 const lost=Math.min(next.hp,damage-absorbed);next.hp-=lost
 if(next.hp>0&&options.execute&&next.hp/next.maxHp*100<=options.execute)next.hp=0
 let survived:string|undefined
 if(next.hp<=0){
  const undying=amount(next,'undying'),revive=amount(next,'revive')
  if(undying){next.hp=Math.min(next.maxHp,Math.max(1,undying));survived='불사'}
  else if(revive){next.hp=Math.min(next.maxHp,Math.max(1,revive));next.effects=next.effects.filter(effect=>effect.kind!=='revive');survived='부활'}
 }
 return {actor:next,damage:lost,absorbed,survived}
}
function recover(actor:Fighter,value:number){const restored=Math.min(actor.maxHp-actor.hp,Math.max(0,Math.round(value*(1-Math.min(100,amount(actor,'burn'))/100))));actor.hp+=restored;return restored}
export function newTrainingBattle(unit:LocalCompanion):TrainingBattle{
 const stats=statsAtLevel(companionDefinition(unit.speciesId),unit.level)
 return {unitId:unit.id,player:{hp:stats.hp,maxHp:stats.hp,shield:0,stats,effects:[],passiveUsed:false},dummy:{hp:2000,maxHp:2000,shield:0,stats:{hp:2000,attack:0,critical:0,magic:0,defense:0,resistance:0,evasion:0},effects:[],passiveUsed:false},turn:0,cooldowns:{},focus:0,focusTurns:0,logs:['동료와 함께 첫 동작을 연습해보세요.'],cue:null}
}
export function abilityBlock(battle:TrainingBattle,unit:LocalCompanion,ability:Ability){
 if(battle.unitId!==unit.id||!isEligible(unit)||!unit.trained)return '훈련을 마친 보관함 동료를 선택해주세요.'
 if(battle.player.hp<=0)return '동료가 지쳤어요. 다시 연습해주세요.'
 if(battle.dummy.hp<=0)return '연습을 마쳤어요. 허수아비를 초기화해주세요.'
 if(ability.id!==companionDefinition(unit.speciesId).basic.id&&amount(battle.player,'silence'))return '침묵 · 스킬 사용 불가'
 if((battle.cooldowns[ability.id]??0)>0)return `${battle.cooldowns[ability.id]}턴 후 사용 가능`
 return null
}
export function practiceAction(previous:TrainingBattle,unit:LocalCompanion,abilityId:string,random=Math.random):TrainingBattle{
 const definition=companionDefinition(unit.speciesId),ability=[definition.basic,...definition.skills].find(item=>item.id===abilityId)
 if(!ability||abilityBlock(previous,unit,ability))return previous
 const next:TrainingBattle={...previous,player:clone(previous.player),dummy:clone(previous.dummy),cooldowns:{...previous.cooldowns},turn:previous.turn+1,logs:[...previous.logs]},lines:string[]=[]
 const basic=ability.id===definition.basic.id
 for(const key of Object.keys(next.cooldowns))next.cooldowns[key]=Math.max(0,next.cooldowns[key]-1)
 if(!basic)next.cooldowns[ability.id]=ability.cooldown
 const accuracy=Math.max(0,100-amount(next.player,'blind')-next.dummy.stats.evasion-amount(next.dummy,'evasion-up'))
 const hit=!ability.damage||random()*100<accuracy
 let critical=false,damage=0,absorbed=0
 if(ability.damage&&hit){
  critical=random()*100<Math.min(40,next.player.stats.critical+(previous.focusTurns>0?previous.focus*5:0))
  const raw=effectiveStat(next.player,ability.damage==='physical'?'attack':'magic')*(ability.power??100)/100*(critical?1.5:1)
  const result=receiveDamage(next.dummy,raw,ability.damage,{penetration:ability.penetration,breakShield:ability.breakShield,execute:ability.execute})
  next.dummy=result.actor;damage=result.damage;absorbed=result.absorbed
  lines.push(`${ability.name} · ${critical?'치명타! ':''}${damage} 피해${absorbed?` · 보호막 ${absorbed} 흡수`:''}`)
  if(result.survived)lines.push(`허수아비 ${result.survived} 발동`)
  if(ability.lifesteal)lines.push(`흡혈 · 체력 ${recover(next.player,damage*ability.lifesteal/100)} 회복`)
 }else if(ability.damage)lines.push(`${ability.name} · 빗나갔어요.`)
 // New effects begin after the existing effects have used this action's turn.
 if(ability.cleanse){let remaining=ability.cleanse;next.player.effects=next.player.effects.filter(effect=>!(remaining>0&&debuffs.includes(effect.kind)&&remaining--));lines.push(`정화 · 디버프 ${ability.cleanse}개 해제`)}
 let restored=0
 if(ability.heal){restored=recover(next.player,next.player.maxHp*ability.heal/100);lines.push(`${ability.name} · 체력 ${restored} 회복`)}
 if(ability.shield){const shield=Math.round(next.player.maxHp*ability.shield/100);next.player.shield=Math.max(next.player.shield,shield);lines.push(`${ability.name} · 보호막 ${shield}`)}
 for(const actor of [next.player,next.dummy])actor.effects=actor.effects.flatMap(effect=>effect.turns>1?[{...effect,turns:effect.turns-1}]:[])
 next.focusTurns=Math.max(0,next.focusTurns-1);if(!next.focusTurns)next.focus=0
 if(hit&&ability.targetStatus&&next.dummy.hp>0){next.dummy.effects=addStatus(next.dummy.effects,ability.targetStatus);lines.push(`${statusNames[ability.targetStatus.kind]} ${ability.targetStatus.amount}% · ${ability.targetStatus.turns}턴`)}
 if(ability.selfStatus){next.player.effects=addStatus(next.player.effects,ability.selfStatus);lines.push(`${statusNames[ability.selfStatus.kind]} ${ability.selfStatus.amount}% · ${ability.selfStatus.turns}턴`)}
 let passive:string|undefined
 if(basic&&hit&&definition.passive.id==='current'){next.focus=Math.min(2,previous.focusTurns>0?previous.focus+1:1);next.focusTurns=2;passive=definition.passive.name;lines.push(`${passive} · 치명타율 +${next.focus*5}%p`)}
 if(!basic&&definition.passive.id==='apricot'){next.player.shield=Math.max(next.player.shield,Math.round(next.player.maxHp*.05));passive=definition.passive.name;lines.push(`${passive} · 보호막 ${Math.round(next.player.maxHp*.05)}`)}
 next.cue={id:(previous.cue?.id??0)+1,kind:!hit?'miss':ability.damage?ability.damage:ability.shield?'shield':'heal',target:ability.damage?'dummy':'companion',amount:ability.damage?damage:ability.shield?next.player.shield:restored,critical,passive}
 next.logs=[...lines,...next.logs].slice(0,20)
 return next
}
/** Sandbox hit, not a dummy counterattack. It grants no XP and spends no player turn. */
export function testIncomingHit(previous:TrainingBattle,unit:LocalCompanion,kind:'physical'|'magic',random=Math.random):TrainingBattle{
 if(!unit.trained||!isEligible(unit)||previous.player.hp<=0||previous.dummy.hp<=0||previous.unitId!==unit.id)return previous
 const definition=companionDefinition(unit.speciesId),next={...previous,player:clone(previous.player),logs:[...previous.logs]}
 if(random()*100<Math.min(25,next.player.stats.evasion+amount(next.player,'evasion-up'))){next.cue={id:(previous.cue?.id??0)+1,kind:'miss' as const,target:'companion' as const,amount:0};next.logs=['피격 테스트 · 회피했어요.',...next.logs].slice(0,20);return next}
 const result=receiveDamage(next.player,30,kind,{armoredShell:definition.passive.id==='spiral'});next.player=result.actor
 let passive:string|undefined
 if(definition.passive.id==='round'&&!next.player.passiveUsed&&next.player.hp>0&&next.player.hp<=next.player.maxHp*.5){next.player.passiveUsed=true;next.player.shield=Math.max(next.player.shield,Math.round(next.player.maxHp*.15));passive=definition.passive.name}
 next.cue={id:(previous.cue?.id??0)+1,kind:'hit',target:'companion',amount:result.damage,passive}
 next.logs=[`${kind==='physical'?'물리':'마법'} 피격 테스트 · ${result.damage} 피해${result.absorbed?` · 보호막 ${result.absorbed} 흡수`:''}${result.survived?` · ${result.survived} 발동`:''}`,...(passive?[`${passive} · 보호막 ${Math.round(next.player.maxHp*.15)}`]:[]),...next.logs].slice(0,20)
 return next
}
