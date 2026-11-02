// @vitest-environment node
import {expect,it} from 'vitest'
import {newExplorationModel,applyExplorationAction} from '../src/features/exploration/server-engine'
import {drawPracticeFloor,canUseTeleport,floorMonsterPool} from '../src/features/exploration/campaign'
import {requiredDoorRoom} from '../src/features/exploration/run-state'
import {newPractice} from '../src/features/exploration/practice-state'
import {newExplorationModel as legacyModel,applyExplorationAction as legacyStep} from '../supabase/functions/_shared/exploration-engine-v1.js'

it('requires every campaign boss and protects boss/preparation floors from teleports',()=>{
 const model=newExplorationModel(()=>.99)
 expect(model).toMatchObject({version:2,state:{campaignFinalFloor:80,gold:100,potions:{health:0,mana:0}}})
 for(const [floor,id] of [[20,'boss-anubis'],[30,'boss-anubis'],[40,'boss-anubis'],[50,'boss-pharaoh'],[65,'boss-maaken'],[80,'boss-golden-mask']] as const){
  const state={...model.state,market:drawPracticeFloor(floor,()=>.99,model.state)}
  expect(state.market.doors).toEqual([id]);expect(requiredDoorRoom(state)).toBe(id)
  expect(canUseTeleport(floor-1)).toBe(false)
 }
 for(const floor of [64,79])expect(drawPracticeFloor(floor,()=>.99,model.state).doors).toEqual(['rest-garden'])
 expect(floorMonsterPool(51).some(item=>item.value==='black-sun-moth')).toBe(true)
 expect(floorMonsterPool(60).some(item=>item.value==='gem-backed-tomb-tortoise')).toBe(true)
 expect(drawPracticeFloor(100,()=>.99,model.state).floor).toBe(80)
 expect(drawPracticeFloor(80,()=>.99,newPractice()).floor).toBe(50)
})
it('continues after the 50 and 65 floor bosses and completes only after the 80 floor boss',()=>{
 for(const [floor,monster] of [[50,'golden-pharaoh'],[65,'golden-scales-maaken'],[80,'black-sun-aker']] as const){
  let model=newExplorationModel(()=>.99)
  model={...model,state:{...model.state,market:drawPracticeFloor(floor,()=>.99,model.state),weapons:model.state.weapons.map(gear=>({...gear,attack:10000}))}}
  model=applyExplorationAction(model,{type:'door',index:0},0,()=>.99)
  expect(model.state.combat?.monsterId).toBe(monster)
  model=applyExplorationAction(model,{type:'combat',action:{type:'attack'}},0,()=>.99)
  model=applyExplorationAction(model,{type:'loot'},0,()=>.99)
  model=applyExplorationAction(model,{type:'descend'},0,()=>.99)
  if(model.view==='room'){model=applyExplorationAction(model,{type:'rest'},0,()=>.99);model=applyExplorationAction(model,{type:'descend'},0,()=>.99)}
  expect(!!model.state.completed).toBe(floor===80)
  expect(model.state.market.floor).toBe(floor===80?80:floor+1)
 }
})
it('keeps the deployed v1 engine resumable with its original 50-floor ending',()=>{
 let model=legacyModel(()=>.99)
 expect(model.version).toBe(1)
 model={...model,state:{...model.state,market:{...model.state.market,floor:50},weapons:model.state.weapons.map((gear:any)=>({...gear,attack:10000}))}}
 model=legacyStep(model,{type:'door',index:0},0,()=>.99)
 model=legacyStep(model,{type:'combat',action:{type:'attack'}},0,()=>.99)
 model=legacyStep(model,{type:'loot'},0,()=>.99)
 model=legacyStep(model,{type:'descend'},0,()=>.99)
 expect(model.state).toMatchObject({completed:true,market:{floor:50}})
})
