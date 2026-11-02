import {it,expect} from 'vitest'
import {shieldDamage} from '../src/features/exploration/shield-damage'
import {newPractice,practiceSpells} from '../src/features/exploration/practice-state'
import {startMonsterCombat,resolveCombatTurn} from '../src/features/exploration/combat-state'
import {plannedSpells} from '../src/features/exploration/spell-catalog'

it('absorbs raw damage before armor, without applying minimum HP damage on a fully absorbed hit',()=>{
 expect(shieldDamage(30,20,n=>Math.max(1,n-4))).toEqual({absorbed:20,damage:6,defenseBlocked:4})
 expect(shieldDamage(15,20,n=>Math.max(1,n-4))).toEqual({absorbed:15,damage:0,defenseBlocked:0})
 expect(shieldDamage(15,0,n=>Math.max(1,n-4))).toEqual({absorbed:0,damage:11,defenseBlocked:4})
})
it('consumes identical player shield capacity regardless of armor or resistance',()=>{
 for(const id of ['sand-scorpion','black-sun-aker'] as const){
  const base=startMonsterCombat({...newPractice(),mp:0,potions:{health:0,mana:2}},id)
  const hit=(reduction:number)=>resolveCombatTurn({...base,armor:[{id:'test',name:'test',description:'',reduction,magicReduction:reduction}],armorId:'test',combat:{...base.combat!,shield:{remaining:100,turns:1}}},{type:'potion',kind:'mana'},()=>.99)
  const weak=hit(0),strong=hit(20)
  expect(strong.state.combat?.shield).toEqual(weak.state.combat?.shield)
  expect(strong.state.combat?.shield?.remaining).toBeLessThan(100)
  expect(strong.state.combat?.shield?.turns).toBeUndefined()
  expect(strong.state.hp).toBe(base.hp)
 }
})
it('keeps enemy capacity through blocked turns, then consumes raw player damage before resistance',()=>{
 const base=startMonsterCombat({...newPractice(),spells:practiceSpells,equippedSpells:['sand','ember']},'black-sun-aker')
 base.combat!.pattern={shieldHp:50,shieldTurns:1}
 const hit=resolveCombatTurn(base,{type:'magic',id:'sand'},()=>.99)
 expect(hit.state.combat?.pattern?.shieldHp).toBe(38)
 expect(hit.state.combat?.pattern?.shieldTurns).toBeUndefined()
 const spill=resolveCombatTurn({...base,combat:{...base.combat!,pattern:{shieldHp:10}}},{type:'magic',id:'ember'},()=>.99)
 expect(spill.events.find(e=>e.kind==='player')?.damage).toBe(4)
})
it('keeps player shields while frozen enemies cannot attack and refreshes without stacking',()=>{
 const spell=plannedSpells.find(s=>s.id==='crystal-petals')!
 const base=startMonsterCombat({...newPractice(),spells:[{...spell,message:spell.description}],equippedSpells:[spell.id]},'sand-scorpion')
 base.combat!.effects=[{kind:'freeze',amount:1,turns:1}]
 base.combat!.shield={remaining:40,turns:1}
 const result=resolveCombatTurn(base,{type:'magic',id:spell.id},()=>.99)
 expect(result.state.combat?.shield).toEqual({remaining:40})
 expect(base.combat!.shield).toEqual({remaining:40,turns:1})
})
