import {topviewItems,type FarmTool,type TopviewState} from './topview-model'
import {cropKinds,farmCrops,isCropKind,seedGood,type CropKind,type SeedGood} from './crop-catalog'
import {farmProducts,farmRecipes,isRecipeId,recipeBatchLimit,type ProductGood,type RecipeId} from './food-catalog'
import {activeBuildings,buildingCapacity,buildingLevel,isUpgradeable,upgradeBuilding,warehouseAvailable,warehouseCapacity,type BuildingUpgradeAction} from './building-upgrades'
import {dailyFarmOrders,farmOrderDay,farmOrderKey} from './daily-orders'
export {type CropKind} from './crop-catalog'

// Local farm prototype. This state never reads or writes a player's real inventory or wallet.

export type FarmGood=CropKind|SeedGood|ProductGood
export const WAREHOUSE_CAPACITY=10
export const storedFarmGoods=(inventory:Record<FarmGood,number>)=>(Object.keys(inventory) as FarmGood[]).filter(good=>!good.endsWith('Seed')&&inventory[good]>0)
export const CROP_FRESH_MS=60000
export const cropIsRotten=(job:{readyAt:number;harvestingAt?:number},now:number)=>job.harvestingAt===undefined&&now>=job.readyAt+CROP_FRESH_MS
export function canStoreFarmGoods(state:TopviewState,goods:FarmGood[]){
 if(!warehouseAvailable(state))return false
 const occupied=new Set(storedFarmGoods(state.simulation.inventory))
 for(const job of Object.values(state.simulation.cropJobs))if(job.harvestingAt!==undefined)occupied.add(job.crop)
 const before=occupied.size;for(const good of goods)occupied.add(good)
 return occupied.size<=warehouseCapacity(state)||occupied.size===before
}
type GoodDetails={name:string;price:number;crop?:CropKind;image?:string}
export const farmGoods:Record<FarmGood,GoodDetails>={
 ...Object.fromEntries(cropKinds.flatMap(crop=>[[crop,{name:farmCrops[crop].name,price:farmCrops[crop].sellPrice,crop}],[seedGood(crop),{name:`${farmCrops[crop].name} 종자`,price:farmCrops[crop].seedPrice,crop}]])) as Record<CropKind|SeedGood,GoodDetails>,
 ...farmProducts,
}
export type FarmSimulation={animalPurchaseJobs:Record<number,{animal:'cow'|'chicken';startedAt:number;readyAt:number}>;upgradeJobs:Record<number,{startedAt:number;readyAt:number;fromLevel:number}>;inventory:Record<FarmGood,number>;unlockedCrops:CropKind[];researchJob:{crop:CropKind;labId:number;startedAt:number;readyAt:number}|null;cropJobs:Record<number,{crop:CropKind;readyAt:number;harvestingAt?:number}>;animalJobs:Record<number,number>;millJobs:Record<number,{quantity:number;startedAt:number;readyAt:number}>;processingJobs:Record<number,{recipe:RecipeId;quantity:number;startedAt:number;readyAt:number}>;orderDeliveries:Record<string,Partial<Record<FarmGood,number>>>}
export type FarmEffect={type:'buy'|'sell'|'research'|'unlock'|'harvest'|'craft'|'crafted'|'received'|'discarded';good:FarmGood;quantity?:number;gold?:number;animal?:'cow'|'chicken';items?:{good:FarmGood;quantity:number}[]}
export function initialFarmSimulation():FarmSimulation{
 const inventory=Object.fromEntries(Object.keys(farmGoods).map(good=>[good,0])) as Record<FarmGood,number>
 inventory.wheatSeed=4;inventory.wheat=12
 return {inventory,unlockedCrops:['wheat'],researchJob:null,cropJobs:{},animalJobs:{},animalPurchaseJobs:{},millJobs:{},processingJobs:{},upgradeJobs:{},orderDeliveries:{}}
}
export function farmAnimalHousing(state:TopviewState,animal:'cow'|'chicken'){
 const placed=state.objects.filter(o=>o.kind===animal).length,stored=state.stored.filter(kind=>kind===animal).length,pending=Object.values(state.simulation.animalPurchaseJobs).filter(job=>job.animal===animal).length
 return {capacity:activeBuildings(state,animal==='cow'?'barn':'coop').length*2,placed,stored,pending,total:placed+stored+pending}
}
export function farmLimits(state:TopviewState){
 const count=(kind:FarmTool)=>state.objects.filter(o=>o.kind===kind).length
 const usedAnimals=count('chicken')+count('cow')+count('sheep'),storedAnimals=state.stored.filter(kind=>topviewItems[kind].group==='동물').length,pendingAnimals=Object.keys(state.simulation.animalPurchaseJobs).length
 return {plots:4+activeBuildings(state,'office').reduce((sum,o)=>sum+buildingCapacity(o),0),animals:farmAnimalHousing(state,'cow').capacity+farmAnimalHousing(state,'chicken').capacity,usedPlots:count('plot'),usedAnimals,storedAnimals,pendingAnimals,totalAnimals:usedAnimals+storedAnimals+pendingAnimals}
}
export const farmPurchaseLimit=(kind:FarmTool)=>topviewItems[kind].group==='건물'?(topviewItems[kind].purchaseLimit??1):Infinity
export const farmOwnedCount=(state:TopviewState,kind:FarmTool)=>state.objects.filter(o=>o.kind===kind).length+state.stored.filter(k=>k===kind).length
export const farmCanPurchase=(state:TopviewState,kind:FarmTool)=>farmOwnedCount(state,kind)<farmPurchaseLimit(kind)
export function farmBuildingStorageError(state:TopviewState,id:number,pendingPlots=0){
 const object=state.objects.find(o=>o.id===id),sim=state.simulation
 if(!object||topviewItems[object.kind].group!=='건물')return '보관할 건물을 선택해주세요.'
 if(sim.upgradeJobs[id])return '업그레이드를 완료하거나 취소한 뒤 보관할 수 있어요.'
 if(sim.researchJob?.labId===id)return '연구가 끝난 뒤 보관할 수 있어요.'
 if(sim.animalPurchaseJobs[id])return '준비한 동물을 먼저 받은 뒤 보관할 수 있어요.'
 if(sim.processingJobs[id])return '가공품을 먼저 받은 뒤 건물을 보관할 수 있어요.'
 if(object.kind==='mill'&&sim.millJobs[id])return '제분이 끝나고 밀가루를 받은 뒤 보관할 수 있어요.'
 const after={...state,objects:state.objects.filter(o=>o.id!==id)},limits=farmLimits(after)
 if(object.kind==='office'&&limits.usedPlots+pendingPlots>limits.plots)return '보관하면 밭 한도를 초과해요. 밭을 먼저 정리해주세요.'
 if(object.kind==='barn'||object.kind==='coop'){
  const housing=farmAnimalHousing(after,object.kind==='barn'?'cow':'chicken')
  if(housing.total>housing.capacity)return '보관하면 동물의 거처가 부족해요. 보관·준비·대기 중인 동물도 포함해요.'
 }
 if(object.kind==='warehouse'){
  const goods=new Set(storedFarmGoods(sim.inventory));for(const job of Object.values(sim.cropJobs))if(job.harvestingAt!==undefined)goods.add(job.crop)
  if(goods.size>warehouseCapacity(after))return '창고의 생산물을 먼저 비워야 보관할 수 있어요.'
 }
 return null
}
export function farmPlacementError(state:TopviewState,kind:FarmTool,{fromStorage=false}:{fromStorage?:boolean}={}){
 const limits=farmLimits(state)
 const reusing=fromStorage&&state.stored.includes(kind)
 if(!reusing&&!farmCanPurchase(state,kind))return '이미 보유 중인 건물이에요. 보관함에서 꺼내 배치해주세요.'
 if(kind==='plot'&&limits.usedPlots>=limits.plots)return '텃밭 한도가 찼어요. 농지 관리소를 추가해주세요.'
 if(kind==='cow'||kind==='chicken'){
  const housing=farmAnimalHousing(state,kind),name=kind==='cow'?'외양간':'닭장'
  if(housing.capacity===0)return `${name}을 먼저 배치해주세요.`
  if(reusing?housing.placed>=housing.capacity:housing.total>=housing.capacity)return `${name}의 동물 한도가 찼어요. 건물 한 채당 2마리를 키울 수 있어요.`
 }
 if(kind==='sheep')return '양을 키울 수 있는 시설이 아직 없어요.'
 return null
}
export type FarmSimAction=
 |{type:'storeBuilding'}
 |BuildingUpgradeAction
 |{type:'seed';good:SeedGood;quantity:number}
 |{type:'sell';good:FarmGood;quantity:number;orderDay:string}
 |{type:'research';crop:CropKind}|{type:'completeResearch'}|{type:'mill';quantity:number}|{type:'collectFlour'}
 |{type:'plant';crop:CropKind}|{type:'harvest'}|{type:'beginHarvest'}|{type:'cancelHarvest'}|{type:'discardCrop'}
 |{type:'animal';animal:'cow'|'chicken'}|{type:'completeAnimalPurchase'}|{type:'startAnimal'}|{type:'feed'}|{type:'collectAnimal'}
 |{type:'craft';recipe:RecipeId;quantity:number}|{type:'collectCraft'}
export function simulateFarm(state:TopviewState,sourceId:number,action:FarmSimAction,now:number):{state:TopviewState;message:string;place?:FarmTool;effect?:FarmEffect}{
 const source=state.objects.find(o=>o.id===sourceId),sim=state.simulation
 const reject=(message:string)=>({state,message})
 if(!source)return reject('시설을 먼저 배치해주세요.')
 if(action.type==='storeBuilding'){
  const error=farmBuildingStorageError(state,sourceId);if(error)return reject(error)
  const levels=state.storedLevels?.[source.kind]??state.stored.filter(kind=>kind===source.kind).map(()=>1)
  const orderKeys=source.kind==='store'||source.kind==='processed'?{...state.storedOrderKeys,[source.kind]:[...(state.storedOrderKeys?.[source.kind]??state.stored.filter(kind=>kind===source.kind).map(()=>null)),source.orderKey??source.id]}:state.storedOrderKeys
  return {state:{...state,objects:state.objects.filter(o=>o.id!==sourceId),stored:[...state.stored,source.kind],storedOrderKeys:orderKeys,storedLevels:isUpgradeable(source.kind)?{...state.storedLevels,[source.kind]:[...levels,buildingLevel(source)]}:state.storedLevels},message:'건물을 보관함에 넣었어요. 언제든 다시 배치할 수 있어요.'}
 }
 if(action.type==='upgrade'||action.type==='cancelUpgrade'||action.type==='completeUpgrade')return upgradeBuilding(state,sourceId,action,now)
 if(sim.upgradeJobs[sourceId])return reject('업그레이드 중에는 이 건물을 사용할 수 없어요.')
 if(['sell','beginHarvest','harvest','mill','collectFlour','craft','collectCraft','feed','collectAnimal'].includes(action.type)&&!warehouseAvailable(state))return reject('사용 가능한 창고가 없어요. 업그레이드가 끝나거나 취소한 뒤 이용해주세요.')
 const inventory={...sim.inventory},next:FarmSimulation={...sim,inventory,animalPurchaseJobs:{...sim.animalPurchaseJobs},cropJobs:{...sim.cropJobs},animalJobs:{...sim.animalJobs},millJobs:{...sim.millJobs},processingJobs:{...sim.processingJobs}}
 let gold=state.gold,message='',place:FarmTool|undefined,effect:FarmEffect|undefined
 if('quantity'in action&&(!Number.isSafeInteger(action.quantity)||action.quantity<1))return reject('수량을 확인해주세요.')
 switch(action.type){
  case 'seed':{
   if(source.kind!=='seedShop')return reject('종자는 종자 상점에서 구매해요.')
   const crop=action.good.slice(0,-4)
   if(!isCropKind(crop))return reject('구매할 종자를 확인해주세요.')
   if(!sim.unlockedCrops.includes(crop))return reject(`종자 연구소에서 ${farmCrops[crop].name}를 먼저 연구해주세요.`)
   const cost=farmGoods[action.good].price*action.quantity
   if(cost>gold)return reject('테스트 골드가 부족해요.')
   gold-=cost;inventory[action.good]+=action.quantity;message=`${farmGoods[action.good].name} ${action.quantity}개를 구매했어요.`;effect={type:'buy',good:action.good,quantity:action.quantity,gold:cost};break
  }
  case 'sell':{
   if(action.orderDay!==farmOrderDay(now))return reject('주문이 새로 바뀌었어요. 오늘의 주문을 다시 확인해주세요.')
   const order=dailyFarmOrders(source,now).find(order=>order.good===action.good),key=farmOrderKey(source,now),delivered=sim.orderDeliveries[key]??{}
   if(!order)return reject('오늘 이 판매소에서 주문하지 않은 물품이에요.')
   if(action.quantity>order.quantity-(delivered[action.good]??0))return reject('남은 주문 수량을 확인해주세요.')
   if(inventory[action.good]<action.quantity)return reject('보유 수량이 부족해요.')
   const proceeds=farmGoods[action.good].price*action.quantity
   next.orderDeliveries={...Object.fromEntries(Object.entries(sim.orderDeliveries).filter(([key])=>key.startsWith(farmOrderDay(now)))),[key]:{...delivered,[action.good]:(delivered[action.good]??0)+action.quantity}}
   inventory[action.good]-=action.quantity;gold+=proceeds;message=`${farmGoods[action.good].name} ${action.quantity}개를 납품했어요.`;effect={type:'sell',good:action.good,quantity:action.quantity,gold:proceeds};break
  }
  case 'research':{
   if(source.kind!=='lab')return reject('종자 연구소를 이용해주세요.')
   if(!isCropKind(action.crop))return reject('연구할 작물을 확인해주세요.')
   if(sim.unlockedCrops.includes(action.crop))return reject('이미 연구한 작물이에요.')
   if(sim.researchJob)return reject('진행 중인 연구가 끝나면 다음 연구를 시작할 수 있어요.')
   const details=farmCrops[action.crop]
   if(gold<details.researchPrice)return reject('테스트 골드가 부족해요.')
   gold-=details.researchPrice
   next.researchJob={crop:action.crop,labId:sourceId,startedAt:now,readyAt:now+details.researchSeconds*1000}
   message=`${details.name} 종자를 연구하고 있어요.`;effect={type:'research',good:action.crop};break
  }
  case 'completeResearch':{
   const job=sim.researchJob
   if(source.kind!=='lab'||!job||job.labId!==sourceId||job.readyAt>now)return reject('아직 연구가 끝나지 않았어요.')
   next.unlockedCrops=Array.from(new Set([...sim.unlockedCrops,job.crop]));next.researchJob=null
   message=`${farmCrops[job.crop].name} 연구 완료! 종자 상점에서 구매할 수 있어요.`;effect={type:'unlock',good:job.crop};break
  }
  case 'plant':{
   if(source.kind!=='plot'||sim.cropJobs[sourceId])return reject('비어 있는 텃밭을 골라주세요.')
   if(!isCropKind(action.crop)||!sim.unlockedCrops.includes(action.crop))return reject('종자 연구소에서 먼저 연구해주세요.')
   const seed=seedGood(action.crop)
   if(inventory[seed]<1)return reject('종자가 없어요. 종자 상점에서 구매해주세요.')
   inventory[seed]--;next.cropJobs[sourceId]={crop:action.crop,readyAt:now+farmCrops[action.crop].growSeconds*1000};message='종자를 심었어요.';break
  }
  case 'harvest':{
   const job=sim.cropJobs[sourceId]
   if(source.kind!=='plot'||!job||job.readyAt>now)return reject('아직 수확할 수 없어요.')
   if(cropIsRotten(job,now))return reject('작물이 썩었어요. 폐기한 뒤 다시 심어주세요.')
   if(job.harvestingAt!==undefined&&now<job.harvestingAt+3000)return reject('아직 수확 중이에요.')
   const quantity=farmCrops[job.crop].yield;inventory[job.crop]+=quantity;delete next.cropJobs[sourceId];message=`${farmGoods[job.crop].name} ${quantity}개를 수확했어요.`;effect={type:'harvest',good:job.crop,quantity};break
  }
  case 'beginHarvest':{
   const job=sim.cropJobs[sourceId]
   if(source.kind!=='plot'||!job||job.readyAt>now||job.harvestingAt!==undefined)return reject('지금은 수확할 수 없어요.')
   if(cropIsRotten(job,now))return reject('작물이 썩었어요. 폐기해주세요.')
   if(!canStoreFarmGoods(state,[job.crop]))return reject('창고가 가득 찼어요. 판매하거나 업그레이드한 뒤 수확해주세요.')
   next.cropJobs[sourceId]={...job,harvestingAt:now};message='낫으로 수확하고 있어요…';break
  }
  case 'cancelHarvest':{
   const job=sim.cropJobs[sourceId];if(source.kind!=='plot'||!job||job.harvestingAt===undefined)return reject('수확 중인 밭이 아니에요.')
   next.cropJobs[sourceId]={crop:job.crop,readyAt:job.readyAt};message='수확물을 보관하지 못했어요. 창고를 확인해주세요.';break
  }
  case 'discardCrop':{
   const job=sim.cropJobs[sourceId];if(source.kind!=='plot'||!job||!cropIsRotten(job,now))return reject('썩은 작물만 폐기할 수 있어요.')
   delete next.cropJobs[sourceId];message='썩은 작물을 폐기했어요. 다시 심을 수 있어요.';effect={type:'discarded',good:job.crop,quantity:1};break
  }
  case 'mill':{
   if(source.kind!=='mill')return reject('제분소를 이용해주세요.')
   if(sim.millJobs[sourceId])return reject('진행 중인 제분을 먼저 수령해주세요.')
   if(action.quantity>2)return reject('제분소 한 채에서 한 번에 최대 2개까지 만들 수 있어요.')
   if(inventory.wheat<action.quantity)return reject('밀이 부족해요.')
   inventory.wheat-=action.quantity;next.millJobs[sourceId]={quantity:action.quantity,startedAt:now,readyAt:now+10000};message='제분을 시작했어요. 10초 후 수령할 수 있어요.';break
  }
  case 'collectFlour':{
   const job=sim.millJobs[sourceId]
   if(source.kind!=='mill'||!job||job.readyAt>now)return reject('아직 제분이 끝나지 않았어요.')
   inventory.flour+=job.quantity;delete next.millJobs[sourceId];message='밀가루를 수령했어요.';effect={type:'crafted',good:'flour',quantity:job.quantity};break
  }
  case 'craft':{
   if(!isRecipeId(action.recipe))return reject('만들 가공품을 확인해주세요.')
   const recipe=farmRecipes[action.recipe]
   if(source.kind!==recipe.building)return reject('이 가공품을 만드는 건물을 이용해주세요.')
   if(sim.processingJobs[sourceId])return reject('만든 가공품을 먼저 받아주세요.')
   if(action.quantity>recipeBatchLimit(inventory,action.recipe))return reject('재료가 부족하거나 한 번에 만들 수 있는 수량을 넘었어요.')
   for(const item of recipe.ingredients)inventory[item.good]-=item.quantity*action.quantity
   next.processingJobs[sourceId]={recipe:action.recipe,quantity:action.quantity,startedAt:now,readyAt:now+recipe.seconds*1000}
   message=`${farmGoods[action.recipe].name} ${action.quantity}개를 만들고 있어요.`;effect={type:'craft',good:action.recipe,quantity:action.quantity};break
  }
  case 'collectCraft':{
   const job=sim.processingJobs[sourceId]
   if(!job||farmRecipes[job.recipe].building!==source.kind||job.readyAt>now)return reject('아직 가공품이 준비되지 않았어요.')
   inventory[job.recipe]+=job.quantity;delete next.processingJobs[sourceId]
   message=`${farmGoods[job.recipe].name} ${job.quantity}개를 받았어요.`;effect={type:'crafted',good:job.recipe,quantity:job.quantity};break
  }
  case 'animal':{
   if(source.kind!==(action.animal==='cow'?'barn':'coop'))return reject('해당 동물의 시설을 이용해주세요.')
   const error=farmPlacementError(state,action.animal)
   if(error)return reject(error)
   if(sim.animalPurchaseJobs[sourceId])return reject('이미 동물을 준비하고 있어요.')
   const price=action.animal==='cow'?800:300
   if(gold<price)return reject('테스트 골드가 부족해요.')
   gold-=price;next.animalPurchaseJobs[sourceId]={animal:action.animal,startedAt:now,readyAt:now+10000};message='동물을 준비하고 있어요. 10초 후 건물 위 말풍선을 눌러 받아주세요.';break
  }
  case 'completeAnimalPurchase':{
   const job=sim.animalPurchaseJobs[sourceId]
   if(!job||job.readyAt>now||source.kind!==(job.animal==='cow'?'barn':'coop'))return reject('아직 동물을 준비하고 있어요.')
   delete next.animalPurchaseJobs[sourceId]
   return {state:{...state,simulation:next,stored:[...state.stored,job.animal]},message:'새 동물이 보관함에 도착했어요. 원하는 곳에 배치해주세요.',effect:{type:'received',good:job.animal==='cow'?'milk':'egg',animal:job.animal,quantity:1}}
  }
  case 'startAnimal':{
   if(!['cow','chicken'].includes(source.kind)||sim.animalJobs[sourceId])return reject('이미 생산 중이에요.')
   next.animalJobs[sourceId]=now+10000;message='생산을 시작했어요. 10초 후 받을 수 있어요.';break
  }
  case 'feed':{
   if(!['cow','chicken'].includes(source.kind)||sim.animalJobs[sourceId])return reject('지금은 먹이를 줄 수 없어요.')
   if(inventory.wheat<1)return reject('먹이로 줄 밀 1개가 필요해요.')
   inventory.wheat--;next.animalJobs[sourceId]=now+10000;message='먹이를 줬어요. 10초 후 생산물을 받을 수 있어요.';break
  }
  case 'collectAnimal':{
   if(!['cow','chicken'].includes(source.kind)||!sim.animalJobs[sourceId]||sim.animalJobs[sourceId]>now)return reject('아직 생산물이 준비되지 않았어요.')
   const good=source.kind==='cow'?'milk':'egg'
   inventory[good]++;delete next.animalJobs[sourceId];message=`${farmGoods[good].name} 1개를 창고에 보관했어요.`;effect={type:'harvest',good,quantity:1};break
  }
 }
 const reserved=new Set(storedFarmGoods(inventory));for(const job of Object.values(next.cropJobs))if(job.harvestingAt!==undefined)reserved.add(job.crop)
 const beforeReserved=new Set(storedFarmGoods(sim.inventory));for(const job of Object.values(sim.cropJobs))if(job.harvestingAt!==undefined)beforeReserved.add(job.crop)
 if(reserved.size>warehouseCapacity(state)&&reserved.size>beforeReserved.size)return reject(`창고 ${warehouseCapacity(state)}칸이 가득 찼어요. 생산물을 판매해 공간을 만들어주세요.`)
 return {state:{...state,gold,simulation:next,stored:place?[...state.stored,place]:state.stored},message,place,effect}
}
