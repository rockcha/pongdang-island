// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {plannedSpells} from '../src/features/exploration/spell-catalog'
import {spellMechanics} from '../src/features/exploration/spell-mechanics'
import {shamanSpells} from '../src/features/exploration/shaman-stock'
import {newPractice} from '../src/features/exploration/practice-state'
import {normalizeExplorationSpells} from '../src/features/exploration/spell-availability'
import {resolveCombatTurn,startMonsterCombat} from '../src/features/exploration/combat-state'
import {newExplorationModel as legacyModel,applyExplorationAction as legacyStep} from '../supabase/functions/_shared/exploration-engine-v1.js'

it('retires purifying spring from offers and removes it from existing saves without changing their rewards or equipment',()=>{
 expect(shamanSpells.some(spell=>spell.id==='purifying-spring')).toBe(false)
 expect(spellMechanics['purifying-spring']).toBeUndefined()
 const original=newPractice(),old={...original,spells:[{id:'purifying-spring',name:'정화의 샘',mana:7,message:'',description:''},{id:'solar-lance',name:'태양의 창',mana:8,message:'',description:'피해 50',image:'/exploration/magic/solar-lance.png'}],equippedSpells:['purifying-spring','solar-lance']}
 const current=normalizeExplorationSpells(old)
 expect(current.spells.map(spell=>spell.id)).toEqual(['solar-lance'])
 expect(current.equippedSpells).toEqual(['solar-lance'])
 expect(current.spells[0]).toMatchObject({description:'피해 45',image:'/exploration/magic/svg-v2/solar-lance.svg'})
 expect(current.gold).toBe(old.gold);expect(current.weapons).toBe(old.weapons)
 expect(old.spells).toHaveLength(2)
 expect(normalizeExplorationSpells(current)).toBe(current)
})
it.each([['solar-lance',45],['black-sandstorm',70]] as const)('uses the reduced %s damage in current and legacy runs', (id,damage)=>{
 const spell=plannedSpells.find(spell=>spell.id===id)!,owned={...spell,message:spell.description}
 expect(spellMechanics[id].damage).toBe(damage)
 expect(spell.description).toContain(`피해 ${damage}`)
 const state=startMonsterCombat({...newPractice(),spells:[owned],equippedSpells:[id]},'sand-scorpion')
 expect(resolveCombatTurn(state,{type:'magic',id},()=>.99).events.find(event=>event.kind==='player')?.rawDamage).toBe(damage)
 let model=legacyModel(()=>.99)
 model={...model,state:{...model.state,spells:[owned],equippedSpells:[id],market:{...model.state.market,doors:['monster'],monsterIds:['sand-scorpion']}}}
 model=legacyStep(model,{type:'door',index:0},0,()=>.99)
 model=legacyStep(model,{type:'combat',action:{type:'magic',id}},0,()=>.99)
 expect(model.result.events.find((event:any)=>event.kind==='player')?.rawDamage).toBe(damage)
})
it.each(shamanSpells)('provides a vector-only icon for $name',spell=>{
 expect(spell.image).toMatch(/\.svg$/)
 const svg=readFileSync('public'+spell.image,'utf8')
 expect(svg).toContain('viewBox="0 0 96 96"')
 expect(svg).not.toMatch(/<image|base64|\.png/)
})
