import {cleanup,render} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {existsSync,writeFileSync} from 'node:fs'
import {plannedSpells} from '@/features/exploration/spell-catalog'
import {practiceSpells,newPractice} from '@/features/exploration/practice-state'
import {spellMechanics} from '@/features/exploration/spell-mechanics'
import {startMonsterCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {spellVisuals} from '@/features/exploration/spell-visuals'
import {SpellCastEffect} from '@/features/exploration/spell-cast-effect'
import {enterShopkeeper} from '@/features/exploration/shop-state'
import {getShopkeeper} from '@/features/exploration/shopkeepers'
afterEach(cleanup)
const ids=['sandstone-bolt','ember-brand','crimson-shards','binding-chain','glacial-crown']
it.each(ids)('casts %s with the catalog mana cost, one damage hit and only an existing ailment',id=>{
 const spell=plannedSpells.find(spell=>spell.id===id)!,power=spellMechanics[id]
 const state=startMonsterCombat({...newPractice(()=>0),spells:[{...spell,message:spell.description}],equippedSpells:[id]},'ancient-giant')
 const result=resolveCombatTurn(state,{type:'magic',id},()=>0)
 expect(result.playerState.mp).toBe(40-spell.mana)
 expect(result.events.filter(event=>event.kind==='player'&&event.spellId===id)).toHaveLength(1)
 expect(result.events[0].damage).toBe(power.damage!-3)
 expect(result.playerState.combat?.enemyHp).toBe(115-(power.damage!-3))
 if(power.ailment){expect(['burn','bleed','weaken','freeze']).toContain(power.ailment.kind);expect(result.playerState.combat?.effects).toContainEqual({kind:power.ailment.kind,amount:power.ailment.amount,turns:power.ailment.turns})}
 expect(state.mp).toBe(40);expect(existsSync('public'+spell.image)).toBe(true)
 const empty={...state,mp:spell.mana-1};expect(resolveCombatTurn(empty,{type:'magic',id},()=>0).state).toBe(empty)
})
it('respects chance failures and the existing freeze lock rule',()=>{
 for(const id of ['ember-brand','crimson-shards','glacial-crown']){
  const spell=plannedSpells.find(s=>s.id===id)!,state=startMonsterCombat({...newPractice(()=>0),spells:[{...spell,message:''}],equippedSpells:[id]},'ancient-giant')
  expect(resolveCombatTurn(state,{type:'magic',id},()=>.99).playerState.combat?.effects).toEqual([])
 }
 const spell=plannedSpells.find(s=>s.id==='glacial-crown')!,state=startMonsterCombat({...newPractice(()=>0),spells:[{...spell,message:''}],equippedSpells:[spell.id]},'ancient-giant')
 state.combat!.enemyHp=1000
 const first=resolveCombatTurn(state,{type:'magic',id:spell.id},()=>0).state
 expect(first.combat?.freezeGuard).toBe(true)
 const second=resolveCombatTurn(first,{type:'magic',id:spell.id},()=>0)
 expect(second.playerState.combat?.effects?.some(e=>e.kind==='freeze')).toBe(false)
 expect(second.events.some(e=>e.kind==='monster')).toBe(true)
})
it('gives every learned spell a distinct visual and uses self effects for protective spells',()=>{
 const spells=[...practiceSpells,...plannedSpells]
 expect(spells).toHaveLength(21)
 expect(new Set(spells.map(s=>JSON.stringify(spellVisuals[s.id]))).size).toBe(21)
 for(const spell of spells){
  const visual=spellVisuals[spell.id],p=spellMechanics[spell.id],enemy=!!(p.damage||p.ailment||p.stun)
  expect(visual.target).toBe(enemy?'enemy':'self')
  const view=render(<SpellCastEffect spellId={spell.id}/>)
  expect(view.container.querySelector('.spell-cast-effect')?.getAttribute('data-spell')).toBe(spell.id)
  expect(view.container.querySelectorAll('.spell-missile')).toHaveLength(enemy?visual.count:0)
  if(process.env.SPELL_VISUAL_QA)writeFileSync(`artifacts/spell-fx-${spell.id}.fragment.html`,view.container.innerHTML)
  view.unmount()
 }
})
it('adds new spells to the corresponding merchant pools',()=>{
 for(const [tier,shop]of [['starter','nadim'],['advanced','sahira'],['ultimate','nefera']] as const){
  const stocks=[0,.25,.5,.75,.99].map(roll=>enterShopkeeper(newPractice(()=>0),getShopkeeper(shop),()=>roll).shamanStock!.spellIds)
  expect(stocks.flat().some(id=>ids.includes(id))).toBe(true)
  expect(stocks.flat().every(id=>[...practiceSpells.map(s=>({...s,tier:'starter'})),...plannedSpells].find(s=>s.id===id)?.tier===tier)).toBe(true)
 }
})
