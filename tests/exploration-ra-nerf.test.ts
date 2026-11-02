// @vitest-environment node
import {it,expect} from 'vitest'
import {plannedSpells} from '../src/features/exploration/spell-catalog'
import {spellMechanics} from '../src/features/exploration/spell-mechanics'
import {newPractice} from '../src/features/exploration/practice-state'
import {startMonsterCombat,resolveCombatTurn} from '../src/features/exploration/combat-state'
import {newExplorationModel,applyExplorationAction} from '../supabase/functions/_shared/exploration-engine-v1.js'
it('shows and deals 95 raw Ra damage in the current engine and existing legacy runs',()=>{
 const spell=plannedSpells.find(spell=>spell.id==='judgment-of-ra')!
 expect(spell.description).toBe('피해 95');expect(spellMechanics[spell.id].damage).toBe(95)
 const state=startMonsterCombat({...newPractice(),spells:[{...spell,message:spell.description}],equippedSpells:[spell.id]},'sand-scorpion')
 expect(resolveCombatTurn(state,{type:'magic',id:spell.id},()=>.99).events.find(event=>event.kind==='player')).toMatchObject({rawDamage:95,damage:94})
 let model=newExplorationModel(()=>.99)
 model={...model,state:{...model.state,spells:[{...spell,message:spell.description}],equippedSpells:[spell.id],market:{...model.state.market,doors:['monster'],monsterIds:['sand-scorpion']}}}
 model=applyExplorationAction(model,{type:'door',index:0},0,()=>.99)
 model=applyExplorationAction(model,{type:'combat',action:{type:'magic',id:spell.id}},0,()=>.99)
 expect(model.result.events.find((event:any)=>event.kind==='player')).toMatchObject({rawDamage:95,damage:94})
})
