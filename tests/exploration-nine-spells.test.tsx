import {cleanup,render} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {plannedSpells} from '@/features/exploration/spell-catalog'
import {spellMechanics} from '@/features/exploration/spell-mechanics'
import {newPractice,castSpell} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {SpellCastEffect} from '@/features/exploration/spell-cast-effect'
import {enterShopkeeper} from '@/features/exploration/shop-state'
import {getShopkeeper} from '@/features/exploration/shopkeepers'
import {seededRandom} from '../scripts/exploration/simulation'

afterEach(cleanup)
const ids=['silver-crescent','sand-swallow-feather','little-lotus','blood-moon-drain','crystal-petals','dune-slumber','eclipse-serpent','phoenix-breath','stellar-tomb-seal']
function ready(id:string){const spell=plannedSpells.find(x=>x.id===id)!;const base=startMonsterCombat({...newPractice(()=>0),hp:30,spells:[{...spell,message:spell.description}],equippedSpells:[id]},'ancient-giant');return {...base,combat:{...base.combat!,enemyHp:1000}}}
it.each(ids)('casts %s exactly once at its displayed mana cost and has a distinct SVG effect',id=>{
 const state=ready(id),spell=state.spells[0],power=spellMechanics[id],result=resolveCombatTurn(state,{type:'magic',id},()=>.99)
 expect(result.playerState.mp).toBe(40-spell.mana);expect(result.events.filter(x=>x.kind==='player'&&x.spellId===id)).toHaveLength(1)
 if(power.damage)expect(result.playerState.combat?.enemyHp).toBe(1000-(power.damage-3))
 if(power.shield)expect(result.playerState.combat?.shield).toEqual(power.shield)
 if(power.healing)expect(result.playerState.hp).toBe(30+power.healing)
 if(power.attackBuff)expect(result.playerState.combat?.attackBuff).toEqual(power.attackBuff)
 expect(resolveCombatTurn({...state,mp:spell.mana-1},{type:'magic',id}).state.mp).toBe(spell.mana-1)
 expect(readFileSync('public'+spell.image,'utf8')).toContain('<svg')
 const view=render(<SpellCastEffect spellId={id}/>);expect(view.container.querySelector('[data-spell]')?.getAttribute('data-spell')).toBe(id)
 if(id==='silver-crescent'||id==='blood-moon-drain'||id==='stellar-tomb-seal')expect(view.container.querySelector('.spell-secondary-aura')).toBeTruthy()
})
it('cleanses only one condition with the lotus before healing and preserves the input state',()=>{
 const base=ready('little-lotus'),state={...base,playerEffects:[{kind:'burn' as const,amount:80,turns:2},{kind:'bleed' as const,amount:2,turns:3}],combat:{...base.combat,playerBlind:30}}
 const result=resolveCombatTurn(state,{type:'magic',id:'little-lotus'},()=>.99)
 expect(result.playerState.hp).toBe(40) // Twelve healing, followed by the remaining two-damage bleed.
 expect(result.playerState.playerEffects?.map(x=>x.kind)).toEqual(['bleed']);expect(result.playerState.combat?.playerBlind).toBe(30)
 expect(state.playerEffects).toHaveLength(2)
 const justBlind={...base,combat:{...base.combat,playerBlind:30,playerWeaken:2}}
 expect(resolveCombatTurn(justBlind,{type:'magic',id:'little-lotus'},()=>.99).playerState.combat).toMatchObject({playerWeaken:2})
 expect(resolveCombatTurn(justBlind,{type:'magic',id:'little-lotus'},()=>.99).playerState.combat?.playerBlind).toBeUndefined()
})
it('fully cleanses before phoenix healing both inside and outside combat',()=>{
 const base=ready('phoenix-breath'),state={...base,playerEffects:[{kind:'burn' as const,amount:80,turns:3},{kind:'bleed' as const,amount:3,turns:3}],combat:{...base.combat,playerBlind:30,playerWeaken:2,magicResistanceDown:10}}
 const result=resolveCombatTurn(state,{type:'magic',id:'phoenix-breath'},()=>.99)
 expect(result.playerState.hp).toBe(95);expect(result.playerState.playerEffects).toEqual([])
 expect(result.playerState.combat?.playerBlind).toBeUndefined();expect(result.playerState.combat?.playerWeaken).toBeUndefined();expect(result.playerState.combat?.magicResistanceDown).toBeUndefined()
 expect(castSpell({...state,combat:null},'phoenix-breath')).toMatchObject({hp:95,playerEffects:[]})
})
it('uses the existing freeze lock and lets a combined seal defend without adding extra damage hits',()=>{
 const frozen=ready('dune-slumber'),first=resolveCombatTurn(frozen,{type:'magic',id:'dune-slumber'},()=>.99).state
 expect(first.combat?.freezeGuard).toBe(true)
 const second=resolveCombatTurn(first,{type:'magic',id:'dune-slumber'},()=>.99)
 expect(second.events.some(x=>x.kind==='monster')).toBe(true)
 const seal=resolveCombatTurn(ready('stellar-tomb-seal'),{type:'magic',id:'stellar-tomb-seal'},()=>.99)
 expect(seal.playerState.combat?.effects).toContainEqual({kind:'weaken',amount:6,turns:3})
 expect(seal.events.filter(x=>x.kind==='player'&&x.damage)).toHaveLength(1)
})
it('puts exactly three additions in each tier and offers them only through the correct magic merchant',()=>{
 for(const[tier,merchant]of [['starter','nadim'],['advanced','sahira'],['ultimate','nefera']] as const){
  const expected=plannedSpells.filter(x=>ids.includes(x.id)&&x.tier===tier).map(x=>x.id);expect(expected).toHaveLength(3)
  const offered=new Set<string>();for(let seed=0;seed<150;seed++)for(const id of enterShopkeeper(newPractice(()=>0),getShopkeeper(merchant),seededRandom(seed+1)).shamanStock!.spellIds)offered.add(id)
  for(const id of expected)expect(offered.has(id)).toBe(true)
 }
})
