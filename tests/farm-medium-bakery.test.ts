import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {farmRecipes,farmProducts,recipesForBuilding} from '@/features/farm/food-catalog'
import {simulateFarm} from '@/features/farm/farm-simulation'
import {buyFarmItem} from '@/features/farm/farm-stock'
import {resellStoredFarmItem} from '@/features/farm/resale'

it.each(['cake','carrotCake'] as const)('moves %s production to the medium bakery and delivers the finished cake once',recipe=>{
 const state=initialTopview();state.objects.push({id:90,kind:'bakery',x:6,y:13},{id:91,kind:'mediumBakery',x:12,y:9})
 for(const item of farmRecipes[recipe].ingredients)state.simulation.inventory[item.good]=item.quantity
 expect(recipesForBuilding('bakery')).not.toContain(recipe)
 expect(recipesForBuilding('mediumBakery')).toContain(recipe)
 expect(simulateFarm(state,90,{type:'craft',recipe,quantity:1},0).state).toBe(state)
 const started=simulateFarm(state,91,{type:'craft',recipe,quantity:1},0).state
 for(const item of farmRecipes[recipe].ingredients)expect(started.simulation.inventory[item.good]).toBe(0)
 expect(simulateFarm(started,91,{type:'collectCraft'},9999).state).toBe(started)
 const ready=simulateFarm(started,91,{type:'collectCraft'},10000).state
 expect(ready.simulation.inventory[recipe]).toBe(1)
 const sold=simulateFarm(ready,2,{type:'marketSell',good:recipe,quantity:1},10000).state
 expect(sold.gold).toBe(ready.gold+farmProducts[recipe].price)
 expect(simulateFarm(sold,2,{type:'marketSell',good:recipe,quantity:1},10000).state).toBe(sold)
})
it('preserves cakes already baking in an existing small bakery',()=>{
 const state=initialTopview();state.objects.push({id:90,kind:'bakery',x:6,y:13})
 state.simulation.processingJobs[90]={recipe:'cake',quantity:1,startedAt:0,readyAt:10000}
 const collected=simulateFarm(state,90,{type:'collectCraft'},10000).state
 expect(collected.simulation.inventory.cake).toBe(1)
 expect(collected.simulation.processingJobs[90]).toBeUndefined()
 expect(farmProducts.cake.name).toBe('딸기 케이크')
})
it('buys multiple medium bakeries and resells one without removing the other copy',()=>{
 const bought=buyFarmItem(initialTopview(),'mediumBakery',2)
 expect(bought.gold).toBe(3000);expect(bought.stored).toEqual(['mediumBakery','mediumBakery'])
 const sold=resellStoredFarmItem(bought,'mediumBakery')
 expect(sold.state.gold).toBe(6000);expect(sold.state.stored).toEqual(['mediumBakery'])
})
