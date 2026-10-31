// Pin attack variation to its midpoint for these status, armor and presentation fixtures.
// Real random damage is covered in exploration-attack-roll.test.ts.
vi.mock('@/features/exploration/attack-roll',async importOriginal=>({...await importOriginal<typeof import('@/features/exploration/attack-roll')>(),rollBasicAttack:(attack:number)=>Math.max(1,attack)}))
import {expect,it,vi} from 'vitest'
import {explorationWeapons,hasWeaponEffect} from '@/features/exploration/weapon-catalog'
import {newPractice,practiceSpells} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startScorpionCombat} from '@/features/exploration/combat-state'
const rolls=(...values:number[])=>()=>values.shift()??.99
function armed(id:string,hp=80,enemyHp=48){
 const catalog=explorationWeapons.find(item=>item.id===id)!
 // Keep fixed hit sizes for rounding and overkill mechanics, independently of tier tuning.
 const attack:Record<string,number>={'bloodstone-battleaxe':24,'osiris-lifereaper':42,'crimson-sap-warclub':23}
 const weapon={...catalog,attack:attack[id]??catalog.attack}
 const state=startScorpionCombat({...newPractice(),hp,weapons:[weapon],weaponId:id})
 state.combat!.enemyHp=enemyHp
 return state
}
it('trades direct damage for five lifesteal weapons and one cleanse weapon',()=>{
 const utility=explorationWeapons.filter(weapon=>weapon.lifesteal||weapon.cleanseChance)
 expect(utility).toHaveLength(6)
 expect(utility.filter(weapon=>weapon.lifesteal)).toHaveLength(5)
 expect(utility.filter(weapon=>weapon.cleanseChance)).toHaveLength(1)
 for(const weapon of utility){
  const plain=explorationWeapons.filter(item=>item.tier===weapon.tier&&!hasWeaponEffect(item))
  const reference=plain.reduce((sum,item)=>sum+item.attack*(1+item.critical/100),0)/plain.length
  const damage=weapon.attack*(1+weapon.critical/100)
  expect(damage).toBeLessThan(reference)
  expect(damage).toBeGreaterThan(reference*(weapon.tier==='ultimate'?.65:.85))
 }
})
it('heals on the player phase before the enemy reply, rounding down and preserving the input',()=>{
 const initial=armed('bloodstone-battleaxe')
 const result=resolveCombatTurn(initial,{type:'attack'},()=>.99)
 expect(result.playerState.hp).toBe(84)
 expect(result.state.hp).toBe(78)
 expect(result.events.find(event=>event.effect==='lifesteal')?.healing).toBe(4)
 expect(initial.hp).toBe(80)
})
it('uses actual damage for critical and killing blows rather than overkill, capped at maximum health',()=>{
 const critical=resolveCombatTurn(armed('osiris-lifereaper'),{type:'attack'},()=>0)
 expect(critical.state.hp).toBe(92)
 expect(critical.state.combat?.status).toBe('won')
 const overkill=resolveCombatTurn(armed('osiris-lifereaper',80,7),{type:'attack'},()=>0)
 expect(overkill.state.hp).toBe(81)
 const capped=resolveCombatTurn(armed('osiris-lifereaper',99),{type:'attack'},()=>0)
 expect(capped.state.hp).toBe(100)
 const fractional=resolveCombatTurn(armed('osiris-lifereaper',80,1),{type:'attack'},()=>0)
 expect(fractional.state.hp).toBe(80)
})
it('does not leech damage over time, magic or escape actions',()=>{
 const state=armed('crimson-sap-warclub')
 state.combat!.effects=[{kind:'bleed',amount:20,turns:2}]
 const hit=resolveCombatTurn(state,{type:'attack'},()=>.99)
 expect(hit.playerState.hp).toBe(84);expect(hit.state.hp).toBe(78)
 const magic={...armed('osiris-lifereaper'),spells:practiceSpells,equippedSpells:['ember']}
 expect(resolveCombatTurn(magic,{type:'magic',id:'ember'},()=>.99).state.hp).toBe(74)
 expect(resolveCombatTurn(armed('osiris-lifereaper'),{type:'flee'},()=>0).state.hp).toBe(80)
})
it('applies burn healing reduction consistently to lifesteal and healing magic',()=>{
 const state=armed('osiris-lifereaper');state.playerEffects=[{kind:'burn',amount:40,turns:2}]
 expect(resolveCombatTurn(state,{type:'attack'},()=>.99).playerState.hp).toBe(86)
 const magic={...state,spells:practiceSpells,equippedSpells:['light']}
 const result=resolveCombatTurn(magic,{type:'magic',id:'light'},()=>.99)
 expect(result.playerState.hp).toBe(90)
 expect(result.events[0].healing).toBe(10)
 expect(result.events[0].text).toContain('체력 10 회복')
})
it('cleanses only the oldest player ailment and never clears the enemy ailments',()=>{
 const state=armed('dawn-purification-mace')
 state.playerEffects=[{kind:'burn',amount:40,turns:3},{kind:'weaken',amount:2,turns:2}]
 state.combat!.effects=[{kind:'blind',amount:20,turns:3}]
 const result=resolveCombatTurn(state,{type:'attack'},rolls(.99,.34,.99,.99))
 expect(result.playerState.playerEffects).toEqual([{kind:'weaken',amount:2,turns:2}])
 expect(result.playerState.combat?.effects).toEqual([{kind:'blind',amount:20,turns:3}])
 expect(state.playerEffects).toHaveLength(2)
 expect(result.events.some(event=>event.effect==='cleanse')).toBe(true)
 const missed=resolveCombatTurn(state,{type:'attack'},rolls(.99,.35,.99,.99))
 expect(missed.state.playerEffects).toEqual(state.playerEffects)
})
it('does not spend a cleanse roll when healthy or trigger cleanse with magic',()=>{
 const random=vi.fn(()=>.99)
 const result=resolveCombatTurn(armed('dawn-purification-mace'),{type:'attack'},random)
 expect(random).toHaveBeenCalledTimes(3)
 expect(result.events.some(event=>event.effect==='cleanse')).toBe(false)
 const state={...armed('dawn-purification-mace'),spells:practiceSpells,equippedSpells:['light'],playerEffects:[{kind:'weaken' as const,amount:2,turns:2}]}
 expect(resolveCombatTurn(state,{type:'magic',id:'light'},()=>0).state.playerEffects).toEqual(state.playerEffects)
})
