import {cropKinds,isCropKind,type CropKind} from './crop-catalog'
import {finishedFoods,farmRecipes,millRecipes,isRecipeId,recipeUnlocked,type ProductGood,type MillProduct} from './food-catalog'
import {animalGoods,farmAnimals,farmAnimalKinds} from './animal-catalog'
import {butcherRecipes} from './butcher-catalog'
import type {TopviewObject,TopviewState} from './topview-model'

export type OrderGood=CropKind|ProductGood
export const farmOrderDay=(now:number)=>new Date(now+9*60*60*1000).toISOString().slice(0,10)
export const farmOrderKey=(object:TopviewObject,now:number)=>`${farmOrderDay(now)}:${object.kind}:${object.orderKey??object.id}`
export function canProduceOrderGood(state:TopviewState,good:OrderGood):boolean{
 const has=(kind:TopviewObject['kind'])=>state.objects.some(object=>object.kind===kind)
 if(isCropKind(good))return state.simulation.unlockedCrops.includes(good)&&has('plot')&&has('seedShop')
 const meatAnimals=farmAnimalKinds.filter(animal=>butcherRecipes[animal].good===good)
 if(meatAnimals.length)return has('butcher')&&meatAnimals.some(animal=>(state.simulation.unlockedAnimals??['cow','chicken']).includes(animal)&&(has(animal)||state.stored.includes(animal)||has(farmAnimals[animal].housing)))
 if(good==='egg')return (has('chicken')||has('coop'))&&canProduceOrderGood(state,'wheat')
 if(good==='milk')return (has('cow')||has('barn'))&&canProduceOrderGood(state,'wheat')
 const animal=farmAnimalKinds.find(animal=>farmAnimals[animal].product===good)
 if(animal)return has(animal)&&canProduceOrderGood(state,'wheat')
 if(Object.hasOwn(millRecipes,good))return has('mill')&&canProduceOrderGood(state,millRecipes[good as MillProduct].crop)
 if(isRecipeId(good)){const recipe=farmRecipes[good];return recipeUnlocked(good,state.simulation.unlockedAnimals)&&has(recipe.building)&&recipe.ingredients.every(item=>canProduceOrderGood(state,item.good))}
 return false
}
export function dailyFarmOrders(object:TopviewObject,now:number,state:TopviewState){
 const pool:OrderGood[]=object.kind==='store'?[...cropKinds,...animalGoods.filter(good=>good!=='wool')]:object.kind==='processed'?[...finishedFoods]:[]
 let seed=2166136261
 for(const char of farmOrderKey(object,now))seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 for(let index=pool.length-1;index>0;index--){const other=Math.floor(random()*(index+1));[pool[index],pool[other]]=[pool[other],pool[index]]}
 const orders=pool.map(good=>({good,quantity:5+Math.floor(random()*6)}))
 // Preserve partially delivered and completed orders when crops or buildings change.
 const delivered=state.simulation.orderDeliveries[farmOrderKey(object,now)]??{}
 const started=orders.filter(order=>(delivered[order.good]??0)>0)
 const available=orders.filter(order=>!(delivered[order.good]??0)&&canProduceOrderGood(state,order.good))
 return [...started,...available].slice(0,5)
}
