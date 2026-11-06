import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {existsSync} from 'node:fs'
import {initialTopview} from '@/features/farm/topview-model'
import {farmProducts,farmRecipes,isFinishedFood} from '@/features/farm/food-catalog'
import {FarmProductionDialog} from '@/features/farm/production-dialog'
import {canProduceOrderGood} from '@/features/farm/daily-orders'
import {cropKinds} from '@/features/farm/crop-catalog'

afterEach(cleanup)
it.each(['butterPotato','roastedSweetPotato','cornCheese','potatoGratin','cornCookies'] as const)('shows %s with its recipe, submits production and requires its full chain for delivery',id=>{
 const state=initialTopview(),recipe=farmRecipes[id],onAction=vi.fn()
 state.simulation.unlockedCrops=[...cropKinds]
 for(const item of recipe.ingredients)state.simulation.inventory[item.good]=item.quantity
 render(<FarmProductionDialog state={state} object={state.objects.find(o=>o.kind===recipe.building)!} message="" onAction={onAction} onClose={()=>{}} onResearch={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:farmProducts[id].name+' 선택'}))
 fireEvent.click(screen.getByRole('button',{name:farmProducts[id].name+' 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:id,quantity:1})
 expect(existsSync('public'+farmProducts[id].image)).toBe(true)
 expect(isFinishedFood(id)).toBe(true)
 expect(canProduceOrderGood(state,id)).toBe(true)
 state.objects=state.objects.filter(o=>o.kind!==recipe.building)
 expect(canProduceOrderGood(state,id)).toBe(false)
})
it('retains the existing omurice ingredients and intermediate kitchen',()=>{
 expect(farmRecipes.omurice).toMatchObject({building:'advancedKitchen',ingredients:[{good:'rice',quantity:2},{good:'egg',quantity:2},{good:'butter',quantity:1},{good:'tomatoKetchup',quantity:1}]})
})
