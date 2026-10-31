import {expect,it,vi} from 'vitest'
import {basicAttackRange,rollBasicAttack,formatBasicAttack,monsterAttackVariance} from '@/features/exploration/attack-roll'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {newPractice,starterWeapon,practiceSpells} from '@/features/exploration/practice-state'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationMonsters} from '@/features/exploration/monster-catalog'
const rolls=(...values:number[])=>()=>values.shift()??.99

it('keeps unspecified weapons fixed, explicitly rolls variable weapons, and gives monsters a ±2 range',()=>{
 const random=vi.fn(()=>.99)
 expect(rollBasicAttack(10,random)).toBe(10);expect(random).not.toHaveBeenCalled()
 expect(formatBasicAttack(10)).toBe('10');expect(formatBasicAttack(10,3)).toBe('7–13')
 expect(Array.from({length:7},(_,i)=>rollBasicAttack(10,()=>(i+.5)/7,3))).toEqual([7,8,9,10,11,12,13])
 expect(basicAttackRange(1,3)).toEqual({min:1,max:4})
 expect(rollBasicAttack(1,()=>0,3)).toBe(1);expect(rollBasicAttack(1,()=>.999,3)).toBe(4)
 expect(monsterAttackVariance).toBe(2);expect(basicAttackRange(10,monsterAttackVariance)).toEqual({min:8,max:12})
 expect(explorationWeapons.some(weapon=>(weapon.attackVariance??0)>0)).toBe(true);expect(explorationWeapons.some(weapon=>!weapon.attackVariance)).toBe(true)
})
it('rolls all player weapons before critical damage and enemy physical defense',()=>{
 for(const weapon of [starterWeapon,...explorationWeapons])for(const variance of [0,.5,.999])for(const critical of [false,true]){
  const initial=startMonsterCombat({...newPractice(()=>0),weapons:[{...weapon,critical:critical?100:0}],weaponId:weapon.id},'obsidian-anubis')
  initial.combat!.enemyHp=1000
  initial.combat!.effects=[{kind:'freeze',amount:1,turns:1}]
  const result=resolveCombatTurn(initial,{type:'attack'},rolls(.5,...(weapon.attackVariance?[variance]:[]),.999))
  const expected=Math.max(1,rollBasicAttack(weapon.attack??1,()=>variance,weapon.attackVariance??0)*(critical?2:1)-4)
  expect(result.events[0]).toMatchObject({damage:expected,critical})
  const raw=rollBasicAttack(weapon.attack??1,()=>variance,weapon.attackVariance??0)*(critical?2:1)
  expect(result.events[0]).toMatchObject({rawDamage:raw,defenseBlocked:Math.max(0,raw-expected)})
  expect(result.playerState.combat?.enemyHp).toBe(1000-expected)
  expect(initial.combat.enemyHp).toBe(1000)
 }
})
it('rolls all monster basic attacks before critical damage and player armor',()=>{
 for(const monster of explorationMonsters)for(const variance of [0,.5,.999])for(const critical of [false,true]){
  const initial=startMonsterCombat({...newPractice(()=>0),mp:15,potions:{health:0,mana:1}},monster.id)
  const result=resolveCombatTurn(initial,{type:'potion',kind:'mana'},rolls(...(monster.magic.length?[.999]:[]),.999,critical?0:.999,variance))
  const expected=rollBasicAttack(monster.attack,()=>variance,monsterAttackVariance)*(critical?2:1)-1
  expect(result.events.find(event=>event.kind==='monster')).toMatchObject({damage:expected,critical,attackType:'physical',moveId:monster.basic.id})
  expect(result.events.find(event=>event.kind==='monster')).toMatchObject({rawDamage:expected+1,defenseBlocked:1})
  expect(result.state.hp).toBe(100-expected)
 }
})
it('leaves monster magic and player magic fixed and avoids basic variance draws',()=>{
 for(const monster of explorationMonsters.filter(monster=>monster.magic.length)){
  const initial=startMonsterCombat({...newPractice(()=>0),mp:15,potions:{health:0,mana:1}},monster.id)
  const random=vi.fn(rolls(0))
  const result=resolveCombatTurn(initial,{type:'potion',kind:'mana'},random)
  expect(result.events.find(event=>event.kind==='monster')?.damage).toBe(monster.magic[0].damage)
  expect(random).toHaveBeenCalledTimes(1)
 }
 const mage=startMonsterCombat({...newPractice(()=>0),spells:practiceSpells,equippedSpells:['sand']},'sand-scorpion')
 const random=vi.fn(()=>.99)
 expect(resolveCombatTurn(mage,{type:'magic',id:'sand'},random).events[0].damage).toBe(11)
 expect(random).not.toHaveBeenCalled()
})
it('uses the actual rolled, capped damage for lifesteal and never rolls damage on a miss',()=>{
 const gear=explorationWeapons.find(weapon=>weapon.id==='osiris-lifereaper')!
 const initial=startMonsterCombat({...newPractice(()=>0),hp:60,weapons:[{...gear,critical:0}],weaponId:gear.id},'sand-scorpion')
 for(const variance of [0,.999]){
  const result=resolveCombatTurn(initial,{type:'attack'},rolls(.999,variance))
  expect(result.playerState.hp).toBe(variance===0?65:66) // Rolled damage 20 or 26 × 25%, rounded down.
 }
 initial.combat!.playerBlind=30
 const random=vi.fn(rolls(0,.999,.999,.5))
 const missed=resolveCombatTurn(initial,{type:'attack'},random)
 expect(missed.events[0]).toMatchObject({effect:'miss',damage:0})
 expect(missed.playerState.hp).toBe(60)
 expect(random).toHaveBeenCalledTimes(4) // Blindness, enemy evasion, enemy crit, enemy damage.
})
