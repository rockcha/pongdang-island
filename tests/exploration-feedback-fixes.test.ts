// @vitest-environment node
import {expect,it} from 'vitest'
import {newGrowthExplorationModel,applyExplorationAction} from '../src/features/exploration/server-engine'
import {drawPracticeFloor,floorMonsterPool} from '../src/features/exploration/campaign'
import {bossSupplyFloors,campaignBossFloors} from '../src/features/exploration/campaign-profile'
import {getFloorMonster} from '../src/features/exploration/monster-catalog'
import {createRoomVisit} from '../src/features/exploration/adventure-rooms'
import {combatPresentation} from '../src/features/exploration/combat-presentation'
import {startScorpionCombat,resolveCombatTurn} from '../src/features/exploration/combat-state'
import {requiredDoorRoom} from '../src/features/exploration/run-state'

it('puts a single guaranteed potion chest before every scheduled boss and awards supplies once',()=>{
 expect(bossSupplyFloors).toEqual([19,29,39,49,64,79])
 for(const floor of bossSupplyFloors){
  const initial=newGrowthExplorationModel(()=>.5)
  initial.state.market={...initial.state.market,floor}
  initial.state.growth!.allocations.attack=Math.max(1,Math.floor((floor-1)/10))
  expect(drawPracticeFloor(floor,()=>.9,initial.state).doors).toEqual(['boss-supply-chest'])
  expect(requiredDoorRoom(initial.state)).toBe('boss-supply-chest')
  const entered=applyExplorationAction(initial,{type:'door',index:0},0,()=>.9)
  expect(entered.visit?.outcome).toEqual({kind:'potions',health:2,mana:1})
  expect(()=>applyExplorationAction(entered,{type:'descend'},0,()=>.9)).toThrow()
  const opened=applyExplorationAction(entered,{type:'search'},0,()=>.9)
  expect(opened.state.potions).toEqual({health:2,mana:1})
  expect(()=>applyExplorationAction(opened,{type:'search'},0,()=>.9)).toThrow()
  const boss=applyExplorationAction(opened,{type:'descend'},0,()=>.9)
  expect(boss.state.market.floor).toBe(floor+1)
  expect(requiredDoorRoom(boss.state)).toBe(campaignBossFloors[(floor+1) as keyof typeof campaignBossFloors])
 }
})
it('defers sand wraiths until floor 21 and lowers only early growth-run HP',()=>{
 for(let floor=1;floor<=20;floor++)for(const intermediate of [false,true])expect(floorMonsterPool(floor,intermediate).some(item=>item.value==='sand-wraith')).toBe(false)
 expect(floorMonsterPool(21,true).some(item=>item.value==='sand-wraith')).toBe(true)
 const old=getFloorMonster('talisman-lizard',5,true),adjusted=getFloorMonster('talisman-lizard',5,true,true)
 expect(adjusted.maxHp).toBe(Math.floor(old.maxHp*.85));expect(adjusted.attack).toBe(old.attack)
 expect(getFloorMonster('talisman-lizard',10,true,true)).toEqual(getFloorMonster('talisman-lizard',10,true))
})
it('shows the exact awarded chest gold and preserves flee results during the counter pause',()=>{
 const state=newGrowthExplorationModel(()=>.2).state
 const visit=createRoomVisit('chest',state,'test',()=>.2)
 expect(visit.outcome.kind).toBe('gold')
 if(visit.outcome.kind==='gold')expect(visit.progress).toContain(visit.outcome.gold.toLocaleString())
 const result=resolveCombatTurn(startScorpionCombat(state),{type:'flee'},()=>0)
 const presentation=combatPresentation(result,'counter','flee')
 expect(presentation.text).not.toMatch(/다음 행동|공격의 결과/)
 expect(presentation.text).toBe(combatPresentation(result,'player','flee').text)
})
