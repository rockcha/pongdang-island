import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {existsSync} from 'node:fs'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm} from '@/features/farm/farm-simulation'
import {farmProducts,farmRecipes,recipesForBuilding} from '@/features/farm/food-catalog'
import {goodsForSale} from '@/features/farm/market-catalog'
import {butcherRecipes} from '@/features/farm/butcher-catalog'
import {FarmProductionDialog} from '@/features/farm/production-dialog'
import {FarmTradePanel} from '@/features/farm/market-panel'
afterEach(cleanup)
const meals=[['butterSteak','cow'],['chickenSoup','chicken'],['duckPotatoStirFry','duck'],['meatStew','sheep'],['chickenGratin','chicken'],['duckFriedRice','duck']] as const
it.each(meals)('makes %s from a stored animal, collects exactly once and sells the two meals',(id,animal)=>{
 let state=initialTopview();state.objects.push({id:90,kind:'butcher',x:8,y:15});state.stored=[animal]
 state.objects.find(o=>o.kind==='warehouse')!.level=10
 const recipe=farmRecipes[id],meat=butcherRecipes[animal].good,building=state.objects.find(o=>o.kind===recipe.building)!.id
 for(const item of recipe.ingredients)if(item.good!==meat)state.simulation.inventory[item.good]=item.quantity*2
 expect(simulateFarm(state,building,{type:'craft',recipe:id,quantity:2},0).state).toBe(state)
 state=simulateFarm(state,90,{type:'butcher',animal,quantity:1},0).state
 expect(state.stored).toEqual([])
 const before={...state.simulation.inventory}
 state=simulateFarm(state,building,{type:'craft',recipe:id,quantity:2},0).state
 for(const item of recipe.ingredients)expect(state.simulation.inventory[item.good]).toBe(before[item.good]-item.quantity*2)
 expect(simulateFarm(state,building,{type:'collectCraft'},recipe.seconds*1000-1).state).toBe(state)
 state=simulateFarm(state,building,{type:'collectCraft'},recipe.seconds*1000).state
 expect(state.simulation.inventory[id]).toBe(2)
 expect(simulateFarm(state,building,{type:'collectCraft'},recipe.seconds*1000).state).toBe(state)
 expect(goodsForSale('food',state.simulation.inventory)).toContain(id)
 expect(goodsForSale('products',state.simulation.inventory)).not.toContain(id)
 const sold=simulateFarm(state,2,{type:'marketSell',good:id,quantity:2},recipe.seconds*1000)
 expect(sold.state.simulation.inventory[id]).toBe(0)
 expect(sold.state.gold).toBe(state.gold+farmProducts[id].price*2)
 expect(existsSync('public'+farmProducts[id].image)).toBe(true)
})
it.each(meals)('shows %s at the assigned kitchen and in the food sales tab',id=>{
 const state=initialTopview(),recipe=farmRecipes[id],onAction=vi.fn()
 for(const item of recipe.ingredients)state.simulation.inventory[item.good]=item.quantity
 const view=render(<FarmProductionDialog state={state} object={state.objects.find(o=>o.kind===recipe.building)!} message="" onAction={onAction} onClose={()=>{}} onResearch={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:farmProducts[id].name+' 선택'}))
 fireEvent.click(screen.getByRole('button',{name:farmProducts[id].name+' 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:id,quantity:1})
 expect(recipesForBuilding(recipe.building==='kitchen'?'advancedKitchen':'kitchen')).not.toContain(id)
 view.unmount();state.simulation.inventory[id]=1
 render(<FarmTradePanel kind="store" state={state} onAction={onAction}/>)
 fireEvent.click(screen.getByRole('button',{name:'음식',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:farmProducts[id].name+' 선택'}))
 fireEvent.click(screen.getByRole('button',{name:farmProducts[id].name+' 판매'}))
 expect(onAction).toHaveBeenLastCalledWith({type:'marketSell',good:id,quantity:1})
})
