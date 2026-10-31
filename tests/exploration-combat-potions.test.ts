import {expect,it} from 'vitest'
import {newPractice,type PracticeState} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startScorpionCombat} from '@/features/exploration/combat-state'
const initial=()=>startScorpionCombat({...newPractice(),hp:40,mp:10,potions:{health:2,mana:2}})
it('uses health potions as a turn, heals before the counter and consumes exactly one',()=>{
 const state=initial(),snapshot=structuredClone(state),result=resolveCombatTurn(state,{type:'potion',kind:'health'},()=>.5)
 expect(result.playerState.hp).toBe(70);expect(result.playerState.potions).toEqual({health:1,mana:2})
 expect(result.state.hp).toBe(64);expect(result.state.combat?.turn).toBe(1)
 expect(result.state.combat?.enemyHp).toBe(state.combat?.enemyHp)
 expect(result.events[0]).toMatchObject({kind:'player',effect:'potion',healing:30})
 expect(result.events.some(event=>event.kind==='monster')).toBe(true);expect(state).toEqual(snapshot)
})
it('restores fifteen mana and clamps at maximum',()=>{
 const result=resolveCombatTurn(initial(),{type:'potion',kind:'mana'},()=>.5)
 expect(result.playerState.mp).toBe(25);expect(result.playerState.potions.mana).toBe(1)
 expect(result.events[0].manaRestored).toBe(15)
 const aboveOldLimit=resolveCombatTurn({...initial(),mp:30},{type:'potion',kind:'mana'},()=>.5)
 expect(aboveOldLimit.playerState.mp).toBe(40);expect(aboveOldLimit.events[0].manaRestored).toBe(10)
 const capped=resolveCombatTurn({...initial(),mp:37},{type:'potion',kind:'mana'},()=>.5)
 expect(capped.playerState.mp).toBe(40);expect(capped.events[0].manaRestored).toBe(3)
})
it('does not consume a turn or potion when unavailable or full',()=>{
 for(const state of [{...initial(),potions:{health:0,mana:0}},{...initial(),hp:100,mp:40}])for(const kind of ['health','mana'] as const){
  const result=resolveCombatTurn(state,{type:'potion',kind},()=>.5)
  expect(result.state).toBe(state);expect(result.events).toEqual([])
 }
})
it('respects reduced healing and applies bleeding after drinking',()=>{
 const state:PracticeState={...initial(),playerEffects:[{kind:'burn',amount:40,turns:2},{kind:'bleed',amount:2,turns:2}]}
 const result=resolveCombatTurn(state,{type:'potion',kind:'health'},()=>.5)
 expect(result.events[0].healing).toBe(18);expect(result.playerState.hp).toBe(56)
 expect(result.playerState.playerEffects).toContainEqual({kind:'bleed',amount:2,turns:1})
})
it('caps health recovery and rejects potion actions outside an active fight',()=>{
 const result=resolveCombatTurn({...initial(),hp:95},{type:'potion',kind:'health'},()=>.5)
 expect(result.playerState.hp).toBe(100);expect(result.events[0].healing).toBe(5)
 const state=newPractice();expect(resolveCombatTurn(state,{type:'potion',kind:'health'}).state).toBe(state)
})
