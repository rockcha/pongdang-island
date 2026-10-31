import {createRoomVisit} from '@/features/exploration/adventure-rooms'
﻿import {expect,it} from 'vitest'
import {drawPracticeFloor,drawFloorMonster,drawRewardTier,practiceFinalFloor} from '@/features/exploration/campaign'
import {newPractice,grantPracticeSupplies} from '@/features/exploration/practice-state'
import {getMonster,getFloorMonster} from '@/features/exploration/monster-catalog'
import {advanceExploration} from '@/features/exploration/run-state'
import {seededRandom} from '../scripts/exploration/simulation'
it('separates operator testing from the 100-gold fifty-floor practice run',()=>{
 const testing=newPractice(()=>.5),practice=newPractice(()=>.5,'practice')
 expect(testing.gold).toBe(100000);expect(practice.gold).toBe(100)
 expect(practice.potions).toEqual({health:0,mana:0});expect(practice.mode).toBe('practice')
 expect(grantPracticeSupplies(practice)).toBe(practice)
})
it('keeps exactly one ordinary-monster door on every floor and never replaces it with an event',()=>{
 for(let seed=1;seed<=100;seed++)for(let floor=1;floor<=practiceFinalFloor;floor++){
  const market=drawPracticeFloor(floor,seededRandom(seed*100+floor))
  expect(market.doors).toHaveLength(3);expect(market.doors.filter(id=>id==='monster')).toHaveLength(1)
  expect(market.doors.filter(id=>id.startsWith('merchant-')||id.startsWith('magic-')).length).toBeLessThanOrEqual(1)
  const monster=market.monsterIds![market.doors.indexOf('monster')]
  expect(monster).not.toBe('random');expect(getMonster(monster==='random'?undefined:monster).tier).toBe('normal')
 }
})
it('gates monsters, merchants and boss opportunities by floor',()=>{
 for(let seed=0;seed<200;seed++){
  for(let floor=1;floor<=5;floor++)expect(['jar-wisp','talisman-lizard','sand-scorpion']).toContain(drawFloorMonster(floor,seededRandom(seed)))
  expect(drawFloorMonster(11,seededRandom(seed),true)).toBe('sand-wraith')
  expect(['sand-wraith','tomb-hook-guard']).toContain(drawFloorMonster(16,seededRandom(seed),true))
 }
 for(const [floor,id] of [[3,'merchant-hasan'],[8,'magic-nadim'],[18,'merchant-karim'],[19,'rest-oasis'],[20,'boss-anubis'],[28,'magic-sahira'],[29,'rest-garden'],[30,'boss-anubis'],[38,'merchant-zahir'],[39,'rest-camp'],[40,'boss-anubis'],[48,'magic-nefera'],[49,'rest-oasis'],[50,'boss-pharaoh']] as const)expect(drawPracticeFloor(floor,seededRandom(floor)).doors).toContain(id)
 expect(drawRewardTier(10,()=>0)).toBe('starter');expect(drawRewardTier(11,()=>0)).toBe('advanced');expect(drawRewardTier(30,()=>.6)).toBe('starter')
 expect(drawRewardTier(31,()=>0)).toBe('ultimate');expect(drawRewardTier(50,()=>.9)).toBe('advanced')
 expect(getFloorMonster('obsidian-anubis',30,true).maxHp).toBeGreaterThan(getFloorMonster('obsidian-anubis',20,true).maxHp)
})
it('finishes fifty floors without creating floor fifty-one, blocks unresolved fights and preserves test mode',()=>{
 const practice=newPractice(()=>.5,'practice')
 const final={...practice,market:{...practice.market,floor:practiceFinalFloor}}
 expect(advanceExploration(final,()=>.5)).toBe(final)
 const completed=advanceExploration({...final,finalBossDefeated:true},()=>.5)
 expect(completed.completed).toBe(true);expect(completed.market.floor).toBe(practiceFinalFloor);expect(advanceExploration(completed)).toBe(completed)
 const active={...final,combat:{status:'active' as const,enemyHp:1,turn:0}}
 expect(advanceExploration(active)).toBe(active)
 expect(advanceExploration({...newPractice(),market:{...newPractice().market,floor:30}}).market.floor).toBe(31)
})

it('allows an escaped investigation encounter to descend without claiming its reserved reward',()=>{
 const state=newPractice(()=>0,'practice'),escaped={...state,combat:{monsterId:'sand-scorpion' as const,enemyHp:20,turn:1,status:'escaped' as const,loot:{kind:'potion' as const,id:'health-potion',name:'체력 포션',potionKind:'health' as const,price:100},lootClaimed:false}}
 expect(advanceExploration(escaped).market.floor).toBe(2)
})

it('limits chest ambushes to ordinary monsters while investigation rooms can include intermediates',()=>{
 const fresh=newPractice(()=>.5,'practice'),state={...fresh,market:{...fresh.market,floor:25}}
 let chestMonsters=0,intermediates=0
 for(let seed=1;seed<200;seed++){
  const chest=createRoomVisit('chest',state,'chest',seededRandom(seed)),investigation=createRoomVisit('investigate-wall',state,'search',seededRandom(seed))
  if(chest.outcome.kind==='monster'){chestMonsters++;expect(getMonster(chest.outcome.monsterId).tier).toBe('normal')}
  if(investigation.outcome.kind==='monster'&&getMonster(investigation.outcome.monsterId).tier==='intermediate')intermediates++
 }
 expect(chestMonsters).toBeGreaterThan(0);expect(intermediates).toBeGreaterThan(0)
})
