// @vitest-environment node
import {expect,it} from 'vitest'
import {newLocalGrowthModel,starterSpell} from '../src/features/exploration/local-growth-model'
import {newExplorationModel,applyExplorationAction} from '../src/features/exploration/server-engine'
import {allocateGrowth,availableGrowthPoints,earnedGrowthPoints,directSpellDamage} from '../src/features/exploration/growth'
import {playerMaxHp,playerManaMax,playerAttackStats,basicAttackEvasion,type PracticeState} from '../src/features/exploration/practice-state'
import {startScorpionCombat,resolveCombatTurn} from '../src/features/exploration/combat-state'
import {getFloorMonster} from '../src/features/exploration/monster-catalog'
import {advanceExploration} from '../src/features/exploration/run-state'

it('starts local play with mana bolt equipped, preserving production and saved-run starts',()=>{
 const local=newLocalGrowthModel(()=>0),legacy=newExplorationModel(()=>0)
 expect(local.state.spells).toEqual([starterSpell]);expect(local.state.equippedSpells).toEqual(['mana-bolt'])
 expect(legacy.state.growth).toBeUndefined();expect(legacy.state.spells).toEqual([])
 const saved=JSON.parse(JSON.stringify({...legacy,state:{...legacy.state,market:{...legacy.state.market,floor:11,doors:['rest-oasis']}}}))
 const next=applyExplorationAction(saved,{type:'door',index:0},0,()=>0)
 expect(next.state.growth).toBeUndefined();expect(next.state.equippedSpells).toEqual([])
})
it('grants seven points at ten-floor milestones without bypassing a protected checkpoint',()=>{
 expect([1,10,11,20,21,71,80].map(earnedGrowthPoints)).toEqual([0,0,1,1,2,7,7])
 const state=newLocalGrowthModel(()=>0).state
 state.market.floor=9;state.pendingFloorAdvance=3
 const next=advanceExploration(state,()=>0)
 expect(next.market.floor).toBe(10);expect(availableGrowthPoints(next)).toBe(0)
 const milestone=advanceExploration(next,()=>0)
 expect(milestone.market.floor).toBe(11);expect(availableGrowthPoints(milestone)).toBe(1)
})
it('changes real resource limits, attacks, direct magic and physical evasion',()=>{
 const state=newLocalGrowthModel(()=>0).state;state.market.floor=11
 const hp=allocateGrowth(state,'health'),mp=allocateGrowth(state,'mana'),strength=allocateGrowth(state,'attack'),magic=allocateGrowth(state,'magic'),evasion=allocateGrowth(state,'evasion')
 expect([playerMaxHp(hp),hp.hp]).toEqual([105,105]);expect([playerManaMax(mp),mp.mp]).toEqual([43,43])
 expect(playerAttackStats(strength).attack).toBe(11)
 expect(directSpellDamage(magic,10)).toBe(11);expect(directSpellDamage(magic,undefined)).toBe(0)
 expect(basicAttackEvasion(evasion,'physical')).toBe(basicAttackEvasion(state,'physical')+4)
 expect(basicAttackEvasion(evasion,'magic')).toBe(0)
 expect(allocateGrowth(hp,'health')).toBe(hp)
 expect(allocateGrowth({...state,market:{...state.market,floor:10}},'health').hp).toBe(100)
})
it('spends five mana for ten raw damage and applies strength and magic to actual combat',()=>{
 const original=newLocalGrowthModel(()=>0).state
 const raw=resolveCombatTurn(startScorpionCombat(original),{type:'magic',id:'mana-bolt'},()=>.5)
 expect(raw.state.mp).toBe(35);expect(raw.events.find(e=>e.spellId==='mana-bolt')).toMatchObject({rawDamage:10,damage:9})
 original.market.floor=11
 for(const stat of ['attack','magic'] as const){
  const upgraded=allocateGrowth(original,stat),battle=startScorpionCombat(upgraded)
  const result=resolveCombatTurn(battle,stat==='attack'?{type:'attack'}:{type:'magic',id:'mana-bolt'},()=>.5)
  expect(result.events.find(e=>e.kind==='player')).toMatchObject({rawDamage:11})
 }
 const poor=startScorpionCombat({...original,mp:4});expect(resolveCombatTurn(poor,{type:'magic',id:'mana-bolt'}).state).toBe(poor)
})
it('requires exactly one valid allocation before another room and preserves door generation',()=>{
 const model=newLocalGrowthModel(()=>0);model.state.market.floor=11
 const doors=JSON.stringify(model.state.market)
 expect(()=>applyExplorationAction(model,{type:'door',index:0})).toThrow()
 expect(()=>applyExplorationAction(model,{type:'allocate-stat',stat:'unknown' as never})).toThrow()
 const next=applyExplorationAction(model,{type:'allocate-stat',stat:'magic'})
 expect(next.state.growth?.allocations.magic).toBe(1);expect(JSON.stringify(next.state.market)).toBe(doors)
 expect(()=>applyExplorationAction(next,{type:'allocate-stat',stat:'magic'})).toThrow()
 expect(model.state.growth.allocations.magic).toBe(0)
})
it('keeps all legacy monster rules and applies the local adjustment to normal and deep bosses',()=>{
 expect(getFloorMonster('sand-scorpion',1,true,true)).toEqual(getFloorMonster('sand-scorpion',1,true))
 for(const id of ['sand-scorpion','golden-pharaoh','black-sun-aker'] as const){
  const old=getFloorMonster(id,80,true),adjusted=getFloorMonster(id,80,true,true)
  expect(adjusted.maxHp).toBeGreaterThan(old.maxHp)
  expect(getFloorMonster(id,80,true)).toEqual(old)
 }
 let state:PracticeState=newLocalGrowthModel(()=>0).state;state.market.floor=80
 for(let i=0;i<7;i++)state=allocateGrowth(state,'attack')
 expect(playerAttackStats(state).attack).toBe(17);expect(availableGrowthPoints(state)).toBe(0)
})
