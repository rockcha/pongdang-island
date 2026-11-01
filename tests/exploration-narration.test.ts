// @vitest-environment node
import {expect,it} from 'vitest'
import {doorArrivalLines,singleDoorArrivalLines,encounterWonderLines,drawNarration,drawDoorArrival,drawMonsterArrival,monsterArrivalLines} from '@/features/exploration/exploration-narration'
import {explorationMonsters} from '@/features/exploration/monster-catalog'

it('has varied door and approach dialogue without immediate repeats even with identical random rolls',()=>{
 for(const lines of [doorArrivalLines,encounterWonderLines]){
  expect(new Set(lines).size).toBeGreaterThanOrEqual(20)
  let previous:string|undefined
  for(let index=0;index<12;index++){
   const line=drawNarration(lines,previous,()=>0)
   expect(lines).toContain(line);expect(line).not.toBe(previous);previous=line
  }
 }
})

it('gives every monster its own reveal descriptions without repeating its last reveal',()=>{
 for(const monster of explorationMonsters){
  const lines=monsterArrivalLines(monster.id)
  expect(new Set(lines).size).toBeGreaterThanOrEqual(6)
  expect(lines).toContain(monster.arrival)
  for(const roll of [0,.2,.5,.8,.999999]){
   const first=drawMonsterArrival(monster.id,undefined,()=>roll),next=drawMonsterArrival(monster.id,first,()=>roll)
   expect(lines).toContain(first);expect(lines).toContain(next);expect(next).not.toBe(first)
  }
 }
})
it('uses varied single-door lines only when a single door is actually shown',()=>{
 expect(new Set(singleDoorArrivalLines).size).toBeGreaterThanOrEqual(12)
 let previous:string|undefined
 for(let index=0;index<12;index++){
  const line=drawDoorArrival(1,previous,()=>0)
  expect(singleDoorArrivalLines).toContain(line);expect(line).not.toBe(previous);previous=line
 }
 expect(doorArrivalLines).toContain(drawDoorArrival(3,previous,()=>0))
})
