// @vitest-environment node
import {expect,it} from 'vitest'
import {newGrowthExplorationModel,applyExplorationAction} from '../src/features/exploration/server-engine'
import {merchantPotions} from '../src/features/exploration/practice-state'
import {shopkeepers} from '../src/features/exploration/shopkeepers'

it.each(shopkeepers.filter(shop=>shop.kind==='magic'))('sells both potions at $name with the same prices and quantities as equipment merchants',profile=>{
 let model=newGrowthExplorationModel(()=>.2)
 model=applyExplorationAction(model,{type:'allocate-stat',stat:'attack'})
 model.state={...model.state,gold:1000,market:{...model.state.market,doors:[profile.roomId]}}
 model=applyExplorationAction(model,{type:'door',index:0},0,()=>.2)
 expect(model.view).toBe('shaman')
 for(const potion of merchantPotions){
  const next=applyExplorationAction(model,{type:'buy',id:potion.id,quantity:2})
  expect(next.state.gold).toBe(model.state.gold-potion.price*2)
  expect(next.state.potions[potion.kind]).toBe(model.state.potions[potion.kind]+2)
  expect(next.state.spells).toEqual(model.state.spells)
  const poor={...model,state:{...model.state,gold:potion.price-1}}
  expect(applyExplorationAction(poor,{type:'buy',id:potion.id,quantity:1}).state).toEqual(poor.state)
 }
 const weapon=model.state.market.weaponIds[0]??'merchant-dagger'
 expect(()=>applyExplorationAction(model,{type:'buy',id:weapon,quantity:1})).toThrow()
 expect(()=>applyExplorationAction(model,{type:'buy',id:merchantPotions[0].id,quantity:0})).toThrow()
 expect(()=>applyExplorationAction({...model,view:'doors'},{type:'buy',id:merchantPotions[0].id,quantity:1})).toThrow()
})
