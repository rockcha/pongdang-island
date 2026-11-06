import {cropKinds} from './crop-catalog'
import {animalGoods} from './animal-catalog'
import {farmProducts,farmRecipes,isRecipeId,isFinishedFood,deliverableGoods,type RecipeIngredient} from './food-catalog'
import type {TopviewState} from './topview-model'

export const isRetiredTradeBuilding=(kind:string)=>kind==='market'||kind==='processed'
// Remove the retired market from a farm that was already open during the split.
export function removeRetiredMarket(state:TopviewState):TopviewState{
 if(!state.objects.some(object=>String(object.kind)==='market')&&!state.stored.some(kind=>String(kind)==='market'))return state
 return {...state,objects:state.objects.filter(object=>String(object.kind)!=='market'),stored:state.stored.filter(kind=>String(kind)!=='market')}
}
export type SaleCategory='crops'|'products'|'food'
export function farmSaleCategory(good:RecipeIngredient):SaleCategory{
 if(cropKinds.some(crop=>crop===good)||animalGoods.some(product=>product===good))return 'crops'
 if(isRecipeId(good))return isFinishedFood(good)?'food':'products'
 return 'products'
}
export const goodsForDelivery=(inventory:Record<RecipeIngredient,number>)=>deliverableGoods.filter(good=>inventory[good]>0)
export function goodsForSale(category:SaleCategory,inventory:Record<RecipeIngredient,number>){
 const goods:RecipeIngredient[]=[...cropKinds,...Object.keys(farmProducts) as (keyof typeof farmProducts)[]]
 return goods.filter(good=>farmSaleCategory(good)===category&&(!isRecipeId(good)||!('retired' in farmRecipes[good])||inventory[good]>0))
}
