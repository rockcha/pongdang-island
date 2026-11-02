import {expect,it} from 'vitest'
import {existsSync} from 'node:fs'
import {deepMonsters} from '@/features/exploration/deep-monsters'
import {getFloorMonster,getMonster,sandScorpion,type MonsterId} from '@/features/exploration/monster-catalog'
import {floorMonsterPool} from '@/features/exploration/campaign'
import {newPractice,practiceSpells,type PracticeState} from '@/features/exploration/practice-state'
import {startMonsterCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {getCombatMonster,monsterPatternNotice} from '@/features/exploration/monster-patterns'
import {monsterGrounding} from '@/features/exploration/monster-grounding'
const roll=()=>.99
function fight(id:MonsterId){
 const base=newPractice(roll,'practice')
 return startMonsterCombat({...base,market:{...base.market,floor:id==='black-sun-aker'?80:id==='golden-scales-maaken'?65:51},weapons:[{...base.weapons[0],attack:26,attackVariance:0,critical:0}],armor:[{...base.armor[0],reduction:5,magicReduction:6,evasion:0}],spells:practiceSpells,equippedSpells:['ember','sand'],potions:{health:5,mana:3}},id,{random:roll})
}
const attack=(state:PracticeState)=>resolveCombatTurn(state,{type:'attack'},roll)
it('buffs direct damage across every late-floor encounter without changing bosses or test mode',()=>{
 for(const floor of [51,60,79])for(const {value:id} of floorMonsterPool(floor)){
  const before=getFloorMonster(id,50,true),after=getFloorMonster(id,floor,true)
  expect(after.attack).toBe(Math.round(before.attack*1.3))
  expect(after.basic.damage).toBe(after.attack)
  expect(after.magic.map(move=>move.damage)).toEqual(before.magic.map(move=>Math.round(move.damage*1.3)))
  expect([after.maxHp,after.defense,after.magicResistance,after.gold]).toEqual([before.maxHp,before.defense,before.magicResistance,before.gold])
  expect(getFloorMonster(id,floor,false)).toEqual(getMonster(id))
 }
})
it.each(deepMonsters)('ships $id artwork, skill icons and explicit late-game stats without double scaling',monster=>{
 expect(existsSync('public'+monster.image)).toBe(true)
 for(const move of [monster.basic,...monster.magic])expect(existsSync('public'+move.image)).toBe(true)
 expect(monsterGrounding[monster.id].bottomGap).toBeGreaterThan(0)
 expect(getFloorMonster(monster.id,50,true)).toEqual(monster)
 const late=getFloorMonster(monster.id,80,true)
 expect(late).toMatchObject({maxHp:monster.maxHp,defense:monster.defense,magicResistance:monster.magicResistance,gold:monster.gold})
 if(monster.tier==='boss')expect(late).toEqual(monster)
 else{
  expect(late.attack).toBe(Math.round(monster.attack*1.3))
  expect(late.basic.damage).toBe(late.attack)
  expect(late.magic.map(move=>move.damage)).toEqual(monster.magic.map(move=>Math.round(move.damage*1.3)))
 }
 expect(sandScorpion.id).toBe('sand-scorpion')
})
it('alternates the moth physical and magic counters and previews the next one',()=>{
 const initial=fight('black-sun-moth')
 expect(monsterPatternNotice(initial)).toBeUndefined()
 const first=attack(initial),second=attack(first.state)
 expect(first.events.find(event=>event.kind==='monster')?.attackType).toBe('physical')
 expect(second.events.find(event=>event.kind==='monster')?.attackType).toBe('magic')
 expect(first.events.find(event=>event.kind==='monster')?.rawDamage).toBe(22)
 expect(second.events.find(event=>event.kind==='monster')?.rawDamage).toBe(22)
 expect(first.state.combat?.pattern?.cycle).toBe(1)
})
it('strips crocodile armor after a landed basic while magic cannot strip it',()=>{
 const initial=fight('golden-armored-crocodile'),first=attack(initial),second=attack(first.state)
 expect(first.events.find(event=>event.kind==='player')?.damage).toBe(18)
 expect(second.events.find(event=>event.kind==='player')?.damage).toBe(20)
 expect(getCombatMonster(second.state).defense).toBe(4)
 const magic=resolveCombatTurn(initial,{type:'magic',id:'ember'},roll)
 expect(magic.state.combat?.pattern?.shellHits).toBeUndefined()
 expect(initial.combat?.pattern?.shellHits).toBeUndefined()
})
it('uses crocodile physical bleeding skills after its basic attack without stacking bleeding',()=>{
 const first=attack(fight('golden-armored-crocodile'))
 expect(first.events.find(event=>event.kind==='monster')?.moveId).toBe('gilded-bite')
 const second=attack(first.state)
 expect(second.events.find(event=>event.kind==='monster')).toMatchObject({moveId:'gilded-fangs',attackType:'physical'})
 expect(second.state.playerEffects).toContainEqual({kind:'bleed',amount:2,turns:2})
 const third=attack(second.state)
 expect(third.events.find(event=>event.kind==='monster')).toMatchObject({moveId:'gilded-tail',attackType:'physical'})
 expect(third.state.playerEffects?.filter(effect=>effect.kind==='bleed')).toHaveLength(1)
})
it('uses devourer bleeding and 20 percent blindness without molting or healing at low HP',()=>{
 const initial=fight('black-sand-devourer'),low={...initial,combat:{...initial.combat!,enemyHp:55}}
 const jaws=resolveCombatTurn(low,{type:'attack'},()=>.1)
 expect(jaws.events.find(event=>event.kind==='monster')).toMatchObject({moveId:'devourer-jaws',attackType:'physical'})
 expect(jaws.state.playerEffects).toContainEqual({kind:'bleed',amount:2,turns:3})
 expect(jaws.state.combat?.pattern?.shed).toBeUndefined()
 expect(jaws.events.some(event=>event.effect==='enemy-heal')).toBe(false)
 expect(getCombatMonster(jaws.state)).toMatchObject({maxHp:140,attack:22,defense:4})
 const breath=resolveCombatTurn(initial,{type:'attack'},()=>.3)
 expect(breath.events.find(event=>event.kind==='monster')).toMatchObject({moveId:'devourer-breath',attackType:'magic'})
 expect(breath.state.combat?.playerBlind).toBe(20)
 expect(resolveCombatTurn(breath.state,{type:'attack'},()=>.3).events.find(event=>event.kind==='monster')?.moveId).toBe('devourer-claw')
 expect(monsterPatternNotice(breath.state)).toBeUndefined()
})
it('interrupts charged tortoise attacks, pays its bonus once on victory and never while farming charges',()=>{
 const initial=fight('gem-backed-tomb-tortoise'),charged={...initial,combat:{...initial.combat!,pattern:{charging:true,cycle:2}}}
 const broken=attack(charged)
 expect(broken.events.some(event=>event.kind==='monster')).toBe(false)
 expect(broken.state.gold).toBe(initial.gold)
 expect(broken.state.combat?.pattern?.bonusGold).toBe(50)
 const again=attack({...broken.state,combat:{...broken.state.combat!,pattern:{...broken.state.combat?.pattern,charging:true,cycle:2}}})
 expect(again.state.combat?.pattern?.bonusGold).toBe(50)
 const killed=attack({...again.state,combat:{...again.state.combat!,enemyHp:1}})
 expect(killed.state.gold).toBe(initial.gold+420+50)
 expect(attack(killed.state).state).toBe(killed.state)
 const weak=attack({...charged,weapons:charged.weapons.map(weapon=>({...weapon,attack:10}))})
 expect(weak.events.find(event=>event.kind==='monster')?.moveId).toBe('gem-burst')
})
it('uses Maaken lifesteal and two debuff skills without resistance switches or phase changes',()=>{
 const initial=fight('golden-scales-maaken'),first=attack(initial)
 const hit=first.events.find(event=>event.kind==='monster')!
 expect(hit.moveId).toBe('maaken-hammer')
 expect(first.events.find(event=>event.effect==='enemy-heal')?.healing).toBe(Math.floor(hit.damage!*.3))
 expect(getCombatMonster(first.state)).toMatchObject({defense:5,magicResistance:5})
 const second=resolveCombatTurn(first.state,{type:'attack'},()=>.1)
 expect(second.events.find(event=>event.kind==='monster')).toMatchObject({moveId:'maaken-weight',attackType:'physical'})
 expect(second.state.playerEffects).toContainEqual({kind:'weaken',amount:3,turns:2})
 const third=attack(second.state),fourth=resolveCombatTurn(third.state,{type:'attack'},()=>.3)
 expect(fourth.events.find(event=>event.kind==='monster')?.moveId).toBe('maaken-mark')
 expect(fourth.state.playerEffects).toContainEqual({kind:'burn',amount:30,turns:3})
 expect(fourth.state.playerEffects?.some(effect=>effect.kind==='weaken')).toBe(false)
 expect(fourth.state.combat?.pattern?.stage).toBeUndefined()
})
it('chooses Maaken moves randomly at the same turn without repeating a skill or announcing the next one',()=>{
 const initial=fight('golden-scales-maaken')
 const selected=[.1,.3,.99].map(value=>resolveCombatTurn(initial,{type:'attack'},()=>value).events.find(event=>event.kind==='monster')?.moveId)
 expect(selected).toEqual(['maaken-weight','maaken-mark','maaken-hammer'])
 const skill=resolveCombatTurn(initial,{type:'attack'},()=>.1)
 expect(resolveCombatTurn(skill.state,{type:'attack'},()=>.1).events.find(event=>event.kind==='monster')?.moveId).toBe('maaken-hammer')
 expect(monsterPatternNotice(skill.state)).toBeUndefined()
})
it('never heals Maaken on evaded or fully blocked hammer attacks, and caps healing at maximum HP',()=>{
 const initial=fight('golden-scales-maaken')
 const evaded=resolveCombatTurn({...initial,armor:initial.armor.map(gear=>({...gear,evasion:100}))},{type:'attack'},()=>0)
 expect(evaded.events.some(event=>event.effect==='enemy-heal')).toBe(false)
 const blocked=attack({...initial,combat:{...initial.combat!,shield:{remaining:1000}}})
 expect(blocked.events.some(event=>event.effect==='enemy-heal')).toBe(false)
 const lethal=attack({...initial,combat:{...initial.combat!,enemyHp:1}})
 expect(lethal.state.combat?.status).toBe('won')
 expect(lethal.events.some(event=>event.effect==='enemy-heal')).toBe(false)
 expect(attack(initial).state.combat!.enemyHp).toBeLessThanOrEqual(290)
})
it('uses Golden Mask magic basics, bleeding condemnation and a non-refreshing capacity shield',()=>{
 const initial=fight('black-sun-aker'),first=attack(initial),preparation=attack(first.state),second=attack(preparation.state)
 expect(first.events.find(event=>event.kind==='monster')).toMatchObject({moveId:'mask-flash',attackType:'magic'})
 expect(preparation.events.some(event=>event.kind==='monster')).toBe(false)
 expect(monsterPatternNotice(preparation.state)).toBeUndefined()
 expect(second.events.find(event=>event.kind==='monster')).toMatchObject({moveId:'mask-condemnation',attackType:'physical'})
 expect(second.state.playerEffects).toContainEqual({kind:'bleed',amount:3,turns:3})
 const cast=attack({...initial,combat:{...initial.combat!,pattern:{cycle:4}}})
 expect(cast.state.combat?.pattern).toMatchObject({shieldHp:50})
 const hit=attack(cast.state)
 expect(hit.events.find(event=>event.kind==='player')?.damage).toBe(0)
 expect(hit.state.combat?.enemyHp).toBe(cast.state.combat?.enemyHp)
 const existing=attack({...initial,combat:{...initial.combat!,pattern:{cycle:4,shieldHp:30,shieldTurns:2}}})
 expect(existing.events.some(event=>event.moveId==='mask-golden-light')).toBe(false)
 const expire=attack({...initial,combat:{...initial.combat!,pattern:{cycle:0,shieldHp:30,shieldTurns:1}}})
 expect(expire.state.combat?.pattern?.shieldHp).toBeGreaterThan(0)
 const magic=resolveCombatTurn(cast.state,{type:'magic',id:'ember'},roll)
 expect(magic.events.find(event=>event.kind==='player')?.damage??0).toBe(0)
 expect(magic.state.combat?.enemyHp).toBe(cast.state.combat?.enemyHp)
})
it('gives Golden Mask magic basics a 15 percent critical chance, without critical skills',()=>{
 const initial=fight('black-sun-aker')
 expect(getCombatMonster(initial).critical).toBe(15)
 const critical=resolveCombatTurn(initial,{type:'attack'},()=>.1499).events.find(event=>event.kind==='monster')!
 const regular=resolveCombatTurn(initial,{type:'attack'},()=>.15).events.find(event=>event.kind==='monster')!
 expect(critical).toMatchObject({moveId:'mask-flash',attackType:'magic',critical:true})
 expect(regular.critical).toBe(false)
 expect(critical.rawDamage).toBe(regular.rawDamage!*2)
 const skill=resolveCombatTurn({...initial,combat:{...initial.combat!,pattern:{cycle:2}}},{type:'attack'},()=>0)
 expect(skill.events.find(event=>event.kind==='monster')).toMatchObject({moveId:'mask-condemnation',critical:false})
})
it.each(deepMonsters)('holds $id pattern while frozen instead of consuming its promised action',monster=>{
 const initial=fight(monster.id),frozen={...initial,combat:{...initial.combat!,effects:[{kind:'freeze' as const,amount:1,turns:1}]}}
 const result=attack(frozen)
 expect(result.events.some(event=>event.effect==='freeze')).toBe(true)
 expect(result.events.some(event=>event.kind==='monster')).toBe(false)
 expect(result.state.combat?.pattern?.cycle).toBeUndefined()
})
it.each(deepMonsters.filter(monster=>monster.tier!=='boss'))('lets a late-game physical loadout defeat $id without requiring a specific spell',monster=>{
 let wins=0
 for(let seed=1;seed<=20;seed++){
  let value=seed,state=fight(monster.id),turns=0
  const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296}
  while(state.combat?.status==='active'&&turns++<60){
   const action=state.hp<=40&&state.potions.health>0?{type:'potion' as const,kind:'health' as const}:{type:'attack' as const}
   state=resolveCombatTurn(state,action,random).state
  }
  expect(['won','lost']).toContain(state.combat?.status)
  if(state.combat?.status==='won')wins++
  expect(turns).toBeLessThan(60)
 }
 // Harder encounters should remain viable for this fixed physical-only policy,
 // rather than guaranteeing a win for every seed without using any magic.
 expect(wins).toBeGreaterThanOrEqual(16)
})
