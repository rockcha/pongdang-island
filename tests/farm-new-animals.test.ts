import {expect,it} from 'vitest'
import {farmAnimals} from '@/features/farm/animal-catalog'
import {legacyTradeFixture as initialTopview} from './helpers/legacy-trade-fixture'
import {simulateFarm,farmAnimalHousing,farmBuildingStorageError,farmLimits,farmGoods} from '@/features/farm/farm-simulation'
import {canProduceOrderGood,dailyFarmOrders,farmOrderDay} from '@/features/farm/daily-orders'
import {recipeUnlocked} from '@/features/farm/food-catalog'
import {farmProductionTasks} from '@/features/farm/farm-overview-model'

it.each(['duck','sheep'] as const)('buys and places %s, produces its own goods once, and unlocks recipes and orders',animal=>{
 let state=initialTopview();state.simulation.unlockedCrops.push('sugarcane');const item=farmAnimals[animal],house=state.objects.find(object=>object.kind===item.housing)!,recipe='duckEggTart' as const,workshop=25
 const action={type:'animal',animal} as const
 if(animal==='duck')expect(recipeUnlocked(recipe,state.simulation.unlockedAnimals)).toBe(false)
 expect(canProduceOrderGood(state,item.product)).toBe(false)
 expect(simulateFarm(state,item.housing==='coop'?3:18,action,100).state).toBe(state)
 const before=state.gold;state=simulateFarm(state,house.id,action,100).state
 expect(state.gold).toBe(before-item.price)
 expect(farmAnimalHousing(state,animal)).toMatchObject({placed:2,pending:1,total:3,capacity:4})
 expect(simulateFarm(state,house.id,action,100).state).toBe(state)
 expect(simulateFarm(state,house.id,{type:'completeAnimalPurchase'},10099).state).toBe(state)
 state=simulateFarm(state,house.id,{type:'completeAnimalPurchase'},10100).state
 expect(state.stored).toContain(animal);if(animal==='duck')expect(recipeUnlocked(recipe,state.simulation.unlockedAnimals)).toBe(true)
 expect(simulateFarm(state,house.id,{type:'completeAnimalPurchase'},10100).state).toBe(state)
 expect(canProduceOrderGood(state,item.product)).toBe(false)
 expect(farmBuildingStorageError(state,house.id)).not.toBeNull()
 state={...state,stored:state.stored.filter(kind=>kind!==animal),objects:[...state.objects,{id:50,kind:animal,x:7,y:7}]}
 expect(farmLimits(state).usedAnimals).toBe(3)
 expect(canProduceOrderGood(state,item.product)).toBe(true)
 state=simulateFarm(state,50,{type:'feed'},10100).state
 expect(state.simulation.inventory.wheat).toBe(11)
 expect(farmProductionTasks(state,20100).find(task=>task.objectId===50)).toMatchObject({good:item.product,status:'ready'})
 expect(simulateFarm(state,50,{type:'collectAnimal'},20099).state).toBe(state)
 state=simulateFarm(state,50,{type:'collectAnimal'},20100).state
 expect(state.simulation.inventory[item.product]).toBe(1)
 expect(simulateFarm(state,50,{type:'collectAnimal'},20100).state).toBe(state)
 if(animal==='sheep')return
 Object.assign(state.simulation.inventory,{flour:1,cream:1,sugar:1})
 state=simulateFarm(state,workshop,{type:'craft',recipe,quantity:1},30100).state
 expect(state.simulation.inventory[item.product]).toBe(0)
 state=simulateFarm(state,workshop,{type:'collectCraft'},38100).state
 expect(state.simulation.inventory[recipe]).toBe(1)
 const processed=state.objects.find(object=>object.kind==='processed')!
 const at=Array.from({length:60},(_,day)=>Date.UTC(2026,10,6+day)).find(at=>dailyFarmOrders(processed,at,state).some(order=>order.good===recipe))!
 expect(at).toBeDefined()
 const sold=simulateFarm(state,processed.id,{type:'sell',good:recipe,quantity:1,orderDay:farmOrderDay(at)},at).state
 expect(sold.gold).toBe(state.gold+farmGoods[recipe].price);expect(sold.simulation.inventory[recipe]).toBe(0)
})

it('shares the global quota across all animal species and includes stored and pending animals',()=>{
 const state=initialTopview();state.stored.push('duck')
 expect(farmAnimalHousing(state,'chicken')).toMatchObject({stored:1,total:3,capacity:4})
 expect(farmAnimalHousing(state,'sheep').total).toBe(3)
 const pending=simulateFarm(state,3,{type:'animal',animal:'sheep'},1).state
 expect(farmAnimalHousing(pending,'cow')).toMatchObject({placed:2,stored:1,pending:1,total:4,capacity:4})
 expect(simulateFarm(pending,18,{type:'animal',animal:'duck'},1).state).toBe(pending)
 expect(farmBuildingStorageError(pending,3)).not.toBeNull()
})

it('rejects locked animal recipes even if ingredients were injected into inventory',()=>{
 const state=initialTopview();Object.assign(state.simulation.inventory,{duckEgg:2,flour:2,cream:2})
 expect(simulateFarm(state,25,{type:'craft',recipe:'duckEggTart',quantity:1},1).state).toBe(state)
})
