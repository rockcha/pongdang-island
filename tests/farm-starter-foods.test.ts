import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,farmGoods} from '@/features/farm/farm-simulation'
import {farmRecipes,isFinishedFood} from '@/features/farm/food-catalog'
it.each(['wholeWheatPorridge','steamedPotato','roastedCarrot','steamedCorn','tomatoSalad'] as const)('cooks %s directly from crops and sells it once',id=>{
 const state=initialTopview(),recipe=farmRecipes[id],ingredient=recipe.ingredients[0]
 const kitchen=state.objects.find(o=>o.kind==='kitchen')!
 expect(kitchen.constructionReadyAt).toBeUndefined()
 state.simulation.inventory[ingredient.good]=3
 const start=simulateFarm(state,kitchen.id,{type:'craft',recipe:id,quantity:1},0).state
 expect(start.simulation.inventory[ingredient.good]).toBe(0)
 expect(simulateFarm(start,kitchen.id,{type:'collectCraft'},recipe.seconds*1000-1).state).toBe(start)
 const done=simulateFarm(start,kitchen.id,{type:'collectCraft'},recipe.seconds*1000).state
 expect(done.simulation.inventory[id]).toBe(1)
 expect(isFinishedFood(id)).toBe(true)
 const store=done.objects.find(o=>o.kind==='store')!.id
 const action={type:'marketSell' as const,good:id,quantity:1}
 const sold=simulateFarm(done,store,action,10000).state
 expect(sold.gold).toBe(done.gold+farmGoods[id].price)
 expect(simulateFarm(sold,store,action,10001).state).toBe(sold)
})
