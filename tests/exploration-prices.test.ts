import {expect,it} from 'vitest'
import {explorationWeapons,starterWeapons} from '@/features/exploration/weapon-catalog'
import {plannedSpells,practiceSpellLearningPrices} from '@/features/exploration/spell-catalog'
import {merchantGoods,practiceSpells,newPractice,buyMerchantItem} from '@/features/exploration/practice-state'

it('sets positive gold prices for every weapon while requiring a floor offering to buy it',()=>{
 const bands={starter:[220,560],advanced:[700,900],ultimate:[2200,2800]}
 for(const weapon of explorationWeapons){
  expect(Number.isInteger(weapon.price)).toBe(true)
  expect(weapon.price%10).toBe(0)
  expect(weapon.price).toBeGreaterThanOrEqual(bands[weapon.tier][0])
  expect(weapon.price).toBeLessThanOrEqual(bands[weapon.tier][1])
  const sale=merchantGoods.find(item=>item.id===weapon.id)
  expect(sale?.price).toBe(weapon.price)
  const state=newPractice()
  const notStocked={...state,market:{...state.market,weaponIds:[]}}
  expect(buyMerchantItem(notStocked,weapon.id)).toBe(notStocked)
 }
})
it('prices equivalent plain weapons equally and adds a modest premium for special effects',()=>{
 for(const tier of ['advanced','ultimate'] as const){
  const weapons=explorationWeapons.filter(weapon=>weapon.tier===tier)
  const plain=weapons.filter(weapon=>!weapon.proc&&!weapon.lifesteal&&!weapon.cleanseChance)
  expect(new Set(plain.map(weapon=>weapon.price)).size).toBe(1)
  for(const weapon of weapons.filter(item=>!plain.includes(item)))expect(weapon.price).toBeGreaterThan(plain[0].price)
 }
})
it('sets distinct learning costs and keeps every registered spell usable',()=>{
 expect(plannedSpells).toHaveLength(17)
 expect(new Set(plannedSpells.map(spell=>spell.id)).size).toBe(17)
 for(const spell of plannedSpells){
  expect(spell.available).toBe(true)
  expect(practiceSpells.some(item=>item.id===spell.id)).toBe(false)
  expect(Number.isInteger(spell.learnPrice)).toBe(true)
  expect(spell.learnPrice%10).toBe(0)
  expect(spell.learnPrice).toBeGreaterThan(0)
  const comparable=explorationWeapons.filter(weapon=>weapon.tier===spell.tier&&!weapon.proc&&!weapon.lifesteal&&!weapon.cleanseChance&&(spell.tier!=='starter'||starterWeapons.some(item=>item.id===weapon.id)))
  expect(spell.learnPrice).toBeLessThanOrEqual(Math.min(...comparable.map(weapon=>weapon.price))*1.5)
 }
 expect(plannedSpells.filter(spell=>spell.tier==='starter')).toHaveLength(4)
 expect(plannedSpells.filter(spell=>spell.tier==='advanced')).toHaveLength(8)
 expect(plannedSpells.filter(spell=>spell.tier==='ultimate')).toHaveLength(5)
})
it('keeps existing spell learning costs and the scroll shop price in one place',()=>{
 for(const spell of practiceSpells)expect(spell.learnPrice).toBe(practiceSpellLearningPrices[spell.id as keyof typeof practiceSpellLearningPrices])
 expect(merchantGoods.find(item=>item.id==='ember')?.price).toBe(practiceSpells.find(spell=>spell.id==='ember')?.learnPrice)
})
