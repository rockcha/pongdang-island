// @vitest-environment node
import {expect,it} from 'vitest'
import {explorationMonsters,getMonster} from '@/features/exploration/monster-catalog'
import {floorMonsterPool} from '@/features/exploration/campaign'

it('retires the saw-claw crab from the catalog and every floor pool',()=>{
 expect(explorationMonsters.some(monster=>String(monster.id)==='saw-claw-crab')).toBe(false)
 for(let floor=1;floor<=50;floor++)for(const intermediate of [false,true]){
  for(const entry of floorMonsterPool(floor,intermediate)){
   expect(String(entry.value)).not.toBe('saw-claw-crab')
   expect(getMonster(entry.value).id).toBe(entry.value)
   expect(entry.weight).toBeGreaterThan(0)
  }
 }
})
it('introduces both ordinary casters from floor six while preserving the introductory pool',()=>{
 const ids=['night-eyed-desert-fox','sand-wing-bat'] as const
 for(let floor=1;floor<=50;floor++){
  const pool=floorMonsterPool(floor)
  expect(pool.reduce((sum,entry)=>sum+entry.weight,0)).toBe(100)
  for(const id of ids)expect(pool.some(entry=>entry.value===id)).toBe(floor>=6)
 }
 for(const id of ids){
  const monster=getMonster(id)
  expect(monster.tier).toBe('normal');expect(monster.pattern).toBeUndefined()
  expect(monster.magic).toHaveLength(1)
  expect(monster.magic[0].damage).toBeGreaterThan(0)
  expect(monster.magic[0].effect).toBeUndefined();expect(monster.magic[0].bleed).toBeUndefined()
 }
})
