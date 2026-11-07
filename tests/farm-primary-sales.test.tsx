import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,farmGoods,type FarmGood} from '@/features/farm/farm-simulation'
import {cropKinds,farmCrops} from '@/features/farm/crop-catalog'
import {farmAnimals,ANIMAL_PRODUCTION_OUTPUT} from '@/features/farm/animal-catalog'
import {primaryGoods,deliverableGoods,isPrimaryGood,finishedFoods,finishedHouseholdGoods,isRecipeId,farmRecipes,millRecipes,recipeOutput,type MillProduct} from '@/features/farm/food-catalog'
import {FoodSalePanel} from '@/features/farm/food-sale-panel'

afterEach(cleanup)
it.each(primaryGoods)('sells %s once at its configured price',good=>{
 const state=initialTopview();state.simulation.inventory[good]=2
 const action={type:'marketSell' as const,good,quantity:2}
 const result=simulateFarm(state,2,action,0)
 expect(result.state.gold-state.gold).toBe(farmGoods[good].price*2)
 expect(result.state.simulation.inventory[good]).toBe(0)
 expect(simulateFarm(result.state,2,action,0).state).toBe(result.state)
 expect(state.simulation.inventory[good]).toBe(2)
})
it.each(['wheatSeed','fertilizer','flour','cottonFabric','woolYarn','felt','redMeat'] as const)('does not expose %s as a primary sale',good=>{
 const state=initialTopview();state.simulation.inventory[good]=5
 expect(isPrimaryGood(good)).toBe(false)
 expect(simulateFarm(state,2,{type:'marketSell',good,quantity:1},0).state).toBe(state)
})
it.each([0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid sale quantity %s',quantity=>{
 const state=initialTopview();state.simulation.inventory.egg=10
 expect(simulateFarm(state,2,{type:'marketSell',good:'egg',quantity},0).state).toBe(state)
})
it('sells mixed categories atomically and preserves stock and gold on a partial failure',()=>{
 const state=initialTopview();state.simulation.inventory.egg=2;state.simulation.inventory.towel=1
 const items=[{good:'wheat' as const,quantity:3},{good:'egg' as const,quantity:2},{good:'towel' as const,quantity:1}]
 const result=simulateFarm(state,2,{type:'marketSellBatch',items},0)
 expect(result.state.gold-state.gold).toBe(3*farmGoods.wheat.price+2*farmGoods.egg.price+farmGoods.towel.price)
 expect(result.state.simulation.inventory.wheat).toBe(9)
 expect(simulateFarm(state,2,{type:'marketSellBatch',items:[...items,{good:'egg',quantity:1}]},0).state).toBe(state)
 expect(new Set(deliverableGoods).size).toBe(deliverableGoods.length)
})
it('starts on owned primary goods, separates categories and submits selected raw quantities',()=>{
 const state=initialTopview(),onAction=vi.fn();state.simulation.inventory.egg=2
 render(<FoodSalePanel state={state} onAction={onAction}/>);
 expect(screen.getByRole('button',{name:'1차 생산물'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.getByRole('button',{name:'밀 선택'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'달걀 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'식품',exact:true}))
 expect(screen.queryByRole('button',{name:'밀 선택'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'생활용품',exact:true}))
 expect(screen.queryByRole('button',{name:'달걀 선택'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:/16\s*골드에 판매/}))
 expect(onAction).toHaveBeenCalledWith({type:'marketSellBatch',items:[{good:'egg',quantity:2}]})
})
it.each(cropKinds)('keeps %s direct income small without making wheat dominate other choices',crop=>{
 const definition=farmCrops[crop],profit=definition.yield*definition.sellPrice-definition.seedPrice
 const hourly=profit*3600/definition.growSeconds
 expect(profit).toBeGreaterThan(0)
 expect(hourly).toBeGreaterThanOrEqual(18)
 expect(hourly).toBeLessThanOrEqual(25)
 if(crop!=='wheat')expect(profit).toBeGreaterThan(3)
})
it('keeps animal direct income modest after feed and honey income at 30 G/hour per apiary',()=>{
 for(const animal of Object.values(farmAnimals)){
  const hourly=(farmGoods[animal.product].price*ANIMAL_PRODUCTION_OUTPUT-farmGoods.wheat.price)*3600/animal.seconds
  expect(hourly).toBeGreaterThanOrEqual(27)
  expect(hourly).toBeLessThanOrEqual(36)
 }
 expect(farmGoods.honey.price*2*3600/farmRecipes.honey.seconds).toBe(30)
})
function rawValue(good:FarmGood):number{
 if(isPrimaryGood(good))return farmGoods[good].price
 if(Object.hasOwn(millRecipes,good)){const recipe=millRecipes[good as MillProduct];return rawValue(recipe.crop)*recipe.input/recipe.output}
 if(isRecipeId(good))return farmRecipes[good].ingredients.reduce((sum,item)=>sum+rawValue(item.good)*item.quantity,0)/recipeOutput(good)
 return farmGoods[good].price
}
it.each([...finishedFoods,...finishedHouseholdGoods])('preserves at least 40 percent added value from processing %s',good=>{
 // Meat still uses its internal valuation; it is not directly deliverable.
 expect(farmGoods[good].price).toBeGreaterThanOrEqual(rawValue(good)*1.4)
})
