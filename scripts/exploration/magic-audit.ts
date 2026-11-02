import {playerAttackStats,playerMaxHp,playerManaMax,spellManaCost,potionRecoveryAmount,incomingDamage,basicAttackEvasion,equipGear,type PracticeState,type Gear} from '../../src/features/exploration/practice-state'
import {getCombatMonster} from '../../src/features/exploration/monster-patterns'
import {spellMechanics} from '../../src/features/exploration/spell-mechanics'
import {healingAfterReduction} from '../../src/features/exploration/status-effects'
import {hasTimedSpell} from '../../src/features/exploration/timed-spells'
import {shieldDamage} from '../../src/features/exploration/shield-damage'
import type {CombatAction} from '../../src/features/exploration/combat-state'

export type MagicStrategy='burst'|'control'|'defense'|'adaptive'
/** Heuristic decisions from currently visible state. No simulation RNG or future room access. */
export function magicPlan(state:PracticeState,strategy:MagicStrategy='adaptive'):{action:CombatAction;weaponId:string}{
 const combat=state.combat!,monster=getCombatMonster(state)
 if(state.playerEffects?.some(e=>e.kind==='freeze'))return {action:{type:'attack'},weaponId:state.weaponId}
 const shield=combat.pattern?.shieldHp??0,brand=hasTimedSpell(state,'solar-brand')?1.2:1
 const physicalShare=monster.basic.attackType==='magic'?.15:.65
 const weak=combat.effects?.find(e=>e.kind==='weaken')?.amount??0
 const physicalRaw=Math.max(0,monster.attack*(1+monster.critical/100)-weak)
 const magicRaw=monster.magic.reduce((sum,m)=>sum+m.damage,0)/Math.max(1,monster.magic.length)
 const evasion=basicAttackEvasion(state,'physical')/100
 const raw=physicalRaw*physicalShare+magicRaw*(1-physicalShare)
 const incoming=Math.max(1,incomingDamage(state,physicalRaw,'physical')*(1-evasion)*physicalShare+incomingDamage(state,magicRaw,'magic')*(1-physicalShare))
 const maxHit=Math.max(physicalRaw*1.4,...monster.magic.map(m=>m.damage))
 const missing=playerMaxHp(state)-state.hp,urgent=state.hp<Math.max(incoming*2,playerMaxHp(state)*.3)
 const healthWeight=urgent?2.5:state.hp<playerMaxHp(state)*.6?1.2:.65
 const manaWeight=(.25+incoming/15)*(strategy==='burst'?.55:strategy==='defense'?1.1:1)
 const controlWeight=strategy==='control'?1.25:1,defenseWeight=strategy==='defense'?1.3:1
 const capacity=combat.shield?.remaining??0
 const weaponScore=(gear:Gear)=>{
  const s=equipGear(state,'weapon',gear.id,true),stats=playerAttackStats(s)
  const hit=(critical:boolean)=>shieldDamage(stats.attack*(critical?2:1)*brand,gear.shieldBreak?0:shield,n=>Math.max(1,n-monster.defense)).damage
  const damage=hit(false)*(1-stats.critical/100)+hit(true)*stats.critical/100
  const healing=Math.min(missing,healingAfterReduction(damage*(gear.lifesteal??0)/100,state.playerEffects??[]))
  const proc=gear.proc,procValue=!proc||combat.effects?.some(e=>e.kind===proc.kind)?0:proc.chance/100*(proc.kind==='freeze'&&!combat.freezeGuard?incoming:proc.kind==='bleed'?proc.amount*Math.min(proc.turns,3):proc.kind==='weaken'?Math.min(proc.amount,incoming)*2:proc.kind==='blind'?incoming*physicalShare*proc.amount/100*2:monster.basic.lifesteal?incoming*.5:0)
  return {damage,score:damage+healing*healthWeight+procValue*controlWeight+(gear.shieldBreak?Math.min(shield,50)*.6:0)}
 }
 const weapon=[...state.weapons].sort((a,b)=>weaponScore(b).score-weaponScore(a).score)[0]
 const armed=equipGear(state,'weapon',weapon.id,true),stats=playerAttackStats(armed),basic=weaponScore(weapon)
 const baseline=Math.max(1,stats.attack*(1+stats.critical/100)-monster.defense)
 const damageValue=(damage:number)=>Math.min(monster.maxHp,damage)/baseline*incoming
 const horizon=Math.min(6,Math.max(1,Math.ceil((combat.enemyHp+shield)/baseline)))
 const minBasic=shieldDamage(Math.max(1,stats.attack-(stats.variance??0))*brand,weapon.shieldBreak?0:shield,n=>Math.max(1,n-monster.defense)).damage
 if(minBasic>=combat.enemyHp)return {action:{type:'attack'},weaponId:weapon.id}
 let best:{action:CombatAction;score:number}={action:{type:'attack'},score:damageValue(basic.damage)+(weaponScore(weapon).score-basic.damage)*healthWeight}
 const consider=(action:CombatAction,score:number)=>{if(score>best.score)best={action,score}}
 if(state.potions.health&&(urgent||missing>=Math.min(playerMaxHp(state)*.3,potionRecoveryAmount(state,'health')*.8)))consider({type:'potion',kind:'health'},Math.min(missing,potionRecoveryAmount(state,'health'))*healthWeight)
 const affordable=armed.spells.filter(spell=>spellManaCost(armed,spell)<=armed.mp)
 for(const spell of affordable){
  const p=spellMechanics[spell.id];if(!p)continue
  const cost=spellManaCost(armed,spell)
  const damage=p.damage?shieldDamage(p.damage*brand,p.breakShield?0:shield,n=>Math.max(1,n-monster.magicResistance)).damage:0
  if(damage>=combat.enemyHp)return {action:{type:'magic',id:spell.id},weaponId:weapon.id}
  let value=damageValue(damage)
  if(p.healing&&(p.damage||urgent||missing>=Math.min(playerMaxHp(state)*.3,p.healing*.7)))value+=Math.min(missing,healingAfterReduction(p.healing,state.playerEffects??[]))*healthWeight
  if(p.shield)value+=Math.max(0,p.shield.remaining-capacity)/Math.max(1,raw)*incoming*healthWeight*defenseWeight
  if(p.guard&&!combat.ward)value+=Math.min(p.guard,incoming)*Math.min(p.guardTurns??1,horizon)*defenseWeight
  if(p.stun)value+=incoming*controlWeight
  if(p.attackBuff&&!combat.attackBuff){const b=p.attackBuff;const buffed=Math.max(1,(stats.attack+b.attack)*(1+Math.min(100,stats.critical+b.critical)/100)-monster.defense);value+=damageValue(Math.max(0,buffed-baseline)*Math.min(b.turns,Math.max(0,horizon-1)))*.9}
  const effect=p.ailment
  if(effect&&!combat.effects?.some(e=>e.kind===effect.kind)){
   const turns=Math.min(effect.turns,horizon)
   value+=(effect.kind==='freeze'&&!combat.freezeGuard?incoming:effect.kind==='bleed'?damageValue(effect.amount*turns):effect.kind==='weaken'?Math.min(incoming,effect.amount)*turns:effect.kind==='blind'?incoming*physicalShare*effect.amount/100*turns:monster.basic.lifesteal?damageValue(incoming*(monster.basic.lifesteal/100)*effect.amount/100*turns):0)*effect.chance/100*controlWeight
  }
  if(p.cleanse||p.cleanseCount){const harmful=(state.playerEffects??[]).reduce((sum,e)=>sum+(e.kind==='bleed'?e.amount*e.turns:e.kind==='burn'?missing*e.amount/100*.5:incoming*.25),0);value+=Math.min(harmful,40)*healthWeight}
  const timed=p.timed
  if(timed&&!hasTimedSpell(armed,timed.id)){
   const turns=Math.min(timed.turns,horizon)
   if(timed.id==='solar-brand'){
    let budget=armed.mp-cost,extra=0
    const strikes=armed.spells.filter(s=>spellMechanics[s.id]?.damage).sort((a,b)=>spellMechanics[b.id].damage!-spellMechanics[a.id].damage!)
    for(let turn=0;turn<Math.min(3,Math.max(0,horizon-1));turn++){
     const strike=strikes.find(s=>spellManaCost(armed,s)<=budget)
     if(strike){extra+=spellMechanics[strike.id].damage!*.2;budget-=spellManaCost(armed,strike)}else extra+=stats.attack*.2
    }
    value+=damageValue(extra)
   }
   if(timed.id==='lapis-veil'){const armor=armed.armor.find(a=>a.id===armed.armorId)!;value+=Math.min(magicRaw,armor.magicReduction??0)*(1-physicalShare)*turns*defenseWeight}
   if(timed.id==='sandstone-skin'){const armor=armed.armor.find(a=>a.id===armed.armorId)!;value+=((armor.reduction??0)*physicalShare-physicalRaw*.1)*turns*defenseWeight}
   if(timed.id==='silent-seal'){
    const basicHp=incomingDamage(armed,physicalRaw,monster.basic.attackType??'physical')*(monster.basic.attackType==='magic'?1:1-evasion)
    value+=Math.max(0,incoming-basicHp)*turns+(monster.magic.some(m=>m.bleed||m.playerAilment)?incoming*.7:0)
    if(!shield&&monster.magic.some(m=>m.enemyShield)){
     const chance=monster.pattern==='black-sun'?((combat.pattern?.cycle??0)%5===4?1:0):monster.skillChance??.3
     value+=damageValue(Math.max(...monster.magic.map(m=>m.enemyShield?.amount??0))*chance)
    }
   }
   if(timed.id==='soul-knot'&&armed.hp<=maxHit&&!state.potions.health&&capacity<raw)value+=incoming*2.5*healthWeight
  }
  consider({type:'magic',id:spell.id},value-cost*manaWeight)
 }
 const usefulCost=Math.min(...state.spells.filter(spell=>spellMechanics[spell.id]).map(spell=>spellManaCost(armed,spell)))
 if(state.potions.mana&&state.mp<Math.min(12,usefulCost)&&playerManaMax(state)-state.mp>=10&&state.hp>maxHit){consider({type:'potion',kind:'mana'},Math.min(15,playerManaMax(state)-state.mp)*manaWeight*1.1)}
 return {action:best.action,weaponId:weapon.id}
}

export function magicPurchaseValue(id:string,strategy:MagicStrategy){
 const p=spellMechanics[id];if(!p)return {role:'none',value:0}
 const roles=p.healing?'healing':p.attackBuff?'attack-buff':p.shield?'shield':p.timed?p.timed.id:p.ailment&&!p.damage?p.ailment.kind:p.cleanse?'cleanse':'damage'
 const utility=p.attackBuff?p.attackBuff.attack*p.attackBuff.turns*1.4:p.shield?p.shield.remaining: p.timed?({ 'solar-brand':20,'soul-knot':25,'silent-seal':28,'lapis-veil':22,'sandstone-skin':20}[p.timed.id]):0
 return {role:roles,value:(p.damage??0)+(p.healing??0)+(p.stun?18:0)+utility*(strategy==='burst'?.65:1)+(p.ailment?15:0)}
}
