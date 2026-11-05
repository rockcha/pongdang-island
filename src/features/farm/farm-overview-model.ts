import {farmAnimals,isFarmAnimal} from './animal-catalog'
import {farmGoods,cropIsRotten,canStoreFarmGoods,type FarmGood} from './farm-simulation'
import {warehouseAvailable} from './building-upgrades'
import {farmCrops} from './crop-catalog'
import {dailyFarmOrders,farmOrderKey} from './daily-orders'
import {farmRecipes,millRecipes,isRecipeId,recipeOutput,type MillProduct} from './food-catalog'
import {topviewItems,type TopviewState} from './topview-model'

export type FarmTask={id:string;objectId:number;title:string;detail:string;status:'ready'|'working'|'attention'|'blocked';readyAt:number;good?:FarmGood;quantity?:number}
export function farmProductionTasks(state:TopviewState,now:number){
 const tasks:FarmTask[]=[],sim=state.simulation
 // Derive from the live farm rather than keeping a second copy of production state.
 for(const object of state.objects){
  const id=object.id,upgrade=sim.upgradeJobs[id],crop=sim.cropJobs[id],mill=sim.millJobs[id],processing=sim.processingJobs[id],purchase=sim.animalPurchaseJobs[id]
  const add=(key:string,title:string,readyAt:number,good?:FarmGood,quantity?:number,detail='')=>tasks.push({id:`${key}:${id}`,objectId:id,title,detail,status:readyAt<=now?'ready':'working',readyAt,good,quantity})
  if(upgrade)add('upgrade',`${topviewItems[object.kind].name} 확장`,upgrade.readyAt,undefined,undefined,'완료하면 시설을 다시 사용할 수 있어요')
  if(crop){
   const rotten=cropIsRotten(crop,now)
   if(rotten)tasks.push({id:`crop:${id}`,objectId:id,title:`${farmGoods[crop.crop].name} 폐기`,detail:'시든 작물을 정리하면 다시 심을 수 있어요',status:'attention',readyAt:crop.readyAt,good:crop.crop})
   else add('crop',`${farmGoods[crop.crop].name} ${crop.harvestingAt===undefined?'수확':'수확 중'}`,crop.harvestingAt===undefined?crop.readyAt:crop.harvestingAt+3000,crop.crop,farmCrops[crop.crop].yield)
  }
  if(sim.animalJobs[id]!==undefined){const good=isFarmAnimal(object.kind)?farmAnimals[object.kind].product:'egg';add('animal',`${farmGoods[good].name} 수령`,sim.animalJobs[id],good,1)}
  if(mill){const good=mill.product??'flour';add('mill',`${farmGoods[good].name} 수령`,mill.readyAt,good,mill.quantity*millRecipes[good].output)}
  if(processing)add('processing',`${farmGoods[processing.recipe].name} 수령`,processing.readyAt,processing.recipe,processing.quantity)
  if(purchase)add('purchase',`${farmAnimals[purchase.animal].name} 맞이하기`,purchase.readyAt,undefined,1,'준비된 동물은 보관함으로 받을 수 있어요')
  if(sim.researchJob?.labId===id)add('research',`${farmGoods[sim.researchJob.crop].name} 종자 연구`,sim.researchJob.readyAt,sim.researchJob.crop,undefined,'연구가 끝나면 새 종자를 구매할 수 있어요')
 }
 for(const task of tasks){
  if(task.status!=='ready'||!task.good||!['crop:','animal:','mill:','processing:'].some(prefix=>task.id.startsWith(prefix)))continue
  if(!warehouseAvailable(state)){task.status='blocked';task.detail='사용 가능한 창고가 생기면 받을 수 있어요.'}
  else if(!canStoreFarmGoods(state,[task.good])){task.status='blocked';task.detail='창고에 새 품목을 보관할 공간이 필요해요.'}
 }
 const priority={ready:0,attention:1,blocked:2,working:3}
 tasks.sort((a,b)=>priority[a.status]-priority[b.status]||a.readyAt-b.readyAt||a.objectId-b.objectId)
 return tasks
}
export function farmOverview(state:TopviewState,now:number){
 const tasks=farmProductionTasks(state,now),sim=state.simulation
 const orders=state.objects.filter(o=>o.kind==='store'||o.kind==='processed').map(object=>{
  const delivered=sim.orderDeliveries[farmOrderKey(object,now)]??{}
  const items=dailyFarmOrders(object,now,state).map(order=>{
   const remaining=Math.max(0,order.quantity-(delivered[order.good]??0)),owned=sim.inventory[order.good]
   const missing=Math.max(0,remaining-owned)
   const recipe=isRecipeId(order.good)?farmRecipes[order.good]:Object.hasOwn(millRecipes,order.good)?{ingredients:[{good:millRecipes[order.good as MillProduct].crop,quantity:millRecipes[order.good as MillProduct].input}]}:null
   const batches=isRecipeId(order.good)?Math.ceil(missing/recipeOutput(order.good)):Object.hasOwn(millRecipes,order.good)?Math.ceil(missing/millRecipes[order.good as MillProduct].output):missing
   const ingredients=missing&&recipe?recipe.ingredients.map(item=>({good:item.good,required:item.quantity*batches,missing:Math.max(0,item.quantity*batches-sim.inventory[item.good])})):[]
   return {...order,remaining,owned,deliverable:Math.min(remaining,owned),missing,ingredients}
  })
  return {object,items,locked:!!sim.upgradeJobs[object.id],warehouseReady:warehouseAvailable(state),complete:items.length>0&&items.every(item=>item.remaining===0)}
 })
 return {tasks,orders,ready:tasks.filter(task=>task.status==='ready').length,working:tasks.filter(task=>task.status==='working').length,attention:tasks.filter(task=>task.status==='attention').length,blocked:tasks.filter(task=>task.status==='blocked').length}
}

export function farmRemainingTime(readyAt:number,now:number){
 const seconds=Math.max(0,Math.ceil((readyAt-now)/1000))
 if(seconds<60)return `${seconds}초 남음`
 const minutes=Math.ceil(seconds/60)
 return minutes<60?`${minutes}분 남음`:`${Math.floor(minutes/60)}시간${minutes%60?` ${minutes%60}분`:''} 남음`
}
