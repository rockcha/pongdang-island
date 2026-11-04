import {cropKinds,type CropKind} from './crop-catalog'
import {processedGoods,type ProductGood} from './food-catalog'
import type {TopviewObject} from './topview-model'

export type OrderGood=CropKind|ProductGood
export const farmOrderDay=(now:number)=>new Date(now+9*60*60*1000).toISOString().slice(0,10)
export const farmOrderKey=(object:TopviewObject,now:number)=>`${farmOrderDay(now)}:${object.kind}:${object.orderKey??object.id}`
export function dailyFarmOrders(object:TopviewObject,now:number){
 const pool:OrderGood[]=object.kind==='store'?[...cropKinds,'egg','milk']:object.kind==='processed'?[...processedGoods]:[]
 let seed=2166136261
 for(const char of farmOrderKey(object,now))seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
 for(let index=pool.length-1;index>0;index--){const other=Math.floor(random()*(index+1));[pool[index],pool[other]]=[pool[other],pool[index]]}
 return pool.slice(0,5).map(good=>({good,quantity:5+Math.floor(random()*6)}))
}
