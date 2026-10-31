import {expect,it} from 'vitest'
import {getMonster,getFloorMonster} from '@/features/exploration/monster-catalog'
import {newPractice} from '@/features/exploration/practice-state'
import {startMonsterCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {practiceFinalFloor,practiceFinalBossId} from '@/features/exploration/campaign'
it('slightly weakens early enemies and removes fifteen health from the saw-claw crab',()=>{
 expect(getMonster('saw-claw-crab').maxHp).toBe(25)
 expect(getMonster('sand-scorpion').attack).toBe(7);expect(getMonster('bandage-mummy').attack).toBe(9)
 expect(getMonster('jar-wisp').maxHp).toBe(28);expect(getMonster('talisman-lizard').maxHp).toBe(33)
 expect(getMonster('lapis-cobra')).toMatchObject({maxHp:20,attack:11,critical:45})
})
it('gives the final pharaoh two distinct spells and no escape',()=>{
 const monster=getFloorMonster(practiceFinalBossId,practiceFinalFloor,true)
 expect(monster.magic).toHaveLength(2)
 const fresh=newPractice(()=>.5,'practice'),state={...fresh,market:{...fresh.market,floor:practiceFinalFloor}},fight=startMonsterCombat(state,practiceFinalBossId,{random:()=>.5})
 expect(resolveCombatTurn(fight,{type:'flee'},()=>0).state).toBe(fight)
 const solar=resolveCombatTurn(fight,{type:'attack'},()=>.1)
 expect(solar.events.some(event=>event.moveId==='solar-judgment')).toBe(true)
 expect(solar.state.combat?.magicResistanceDown).toBe(10)
 const chain=resolveCombatTurn(fight,{type:'attack'},()=>.5)
 expect(chain.events.some(event=>event.moveId==='golden-chains')).toBe(true)
 expect(chain.state.playerEffects).toContainEqual({kind:'bleed',amount:4,turns:3})
 const physical=resolveCombatTurn(fight,{type:'attack'},()=>.9)
 expect(physical.events.some(event=>event.moveId==='royal-scepter')).toBe(true)
})

it('rewards later optional Anubis fights with high-tier gear',()=>{
 const fresh=newPractice(()=>.5,'practice')
 expect(getMonster('obsidian-anubis')).toMatchObject({attack:14,basic:{damage:14}})
 for(const floor of [30,40]){
  const monster=getFloorMonster('obsidian-anubis',floor,true)
  expect(monster.attack).toBe(floor===30?17:20);expect(monster.basic.damage).toBe(monster.attack)
  expect(monster.magic.map(skill=>skill.damage)).toEqual(floor===30?[14,16]:[17,19])
  const state={...fresh,market:{...fresh.market,floor}},fight=startMonsterCombat(state,'obsidian-anubis',{random:()=>.5})
  expect(fight.combat?.loot).toMatchObject({gear:{tier:'ultimate'}})
 }
 const early=startMonsterCombat({...fresh,market:{...fresh.market,floor:20}},'obsidian-anubis',{random:()=>.5})
 expect(getFloorMonster('obsidian-anubis',20,true).attack).toBe(14)
 expect(early.combat?.loot).toMatchObject({gear:{tier:'advanced'}})
})
