import {waterwheelBonusMinutes,waterwheelDuration} from './waterwheel'
import {farmAnimals,isFarmAnimal,ANIMAL_PURCHASE_SECONDS,ANIMAL_PRODUCTION_OUTPUT,type FarmAnimal} from './animal-catalog'
import {farmDuration} from './farm-duration'
import {topviewItems,type FarmTool,type TopviewState} from './topview-model'
import {cropKinds,farmCrops,isCropKind,seedGood,type CropKind,type SeedGood} from './crop-catalog'
import {deliverableGoods,farmProducts,farmRecipes,millRecipes,isRecipeId,isDeliverableGood,recipeUnlocked,recipeBatchLimit,recipeOutput,type ProductGood,type RecipeId,type MillProduct} from './food-catalog'
import {isBasicFarmBuilding} from './building-rules'
import {isProcessingBuilding} from './workshop-catalog'
import {butcherRecipes,BUTCHER_SECONDS} from './butcher-catalog'
import {isRetiredTradeBuilding} from './market-catalog'
import {farmSupplies,isFarmSupply,type FarmSupply} from './supply-catalog'
import {activeBuildings,livestockCapacity,buildingCapacity,buildingLevel,isUpgradeable,upgradeBuilding,warehouseAvailable,warehouseCapacity,WAREHOUSE_BASE_CAPACITY,type BuildingUpgradeAction} from './building-upgrades'
export {type CropKind} from './crop-catalog'

// Pure farm rules. The production Edge Function executes these against a saved
// farm and the real wallet; the standalone preview uses the same rules locally.

export type FarmGood=CropKind|SeedGood|ProductGood|FarmSupply
export const WAREHOUSE_CAPACITY=WAREHOUSE_BASE_CAPACITY
export const storedFarmGoods=(inventory:Record<FarmGood,number>)=>(Object.keys(inventory) as FarmGood[]).filter(good=>!good.endsWith('Seed')&&!isFarmSupply(good)&&inventory[good]>0)
export const storedFarmQuantity=(inventory:Record<FarmGood,number>)=>storedFarmGoods(inventory).reduce((sum,good)=>sum+inventory[good],0)
export const harvestReservedQuantity=(simulation:FarmSimulation)=>Object.values(simulation.cropJobs).reduce((sum,job)=>sum+(job.harvestingAt===undefined?0:farmCrops[job.crop].yield),0)
export const farmStorageUsage=(simulation:FarmSimulation)=>storedFarmQuantity(simulation.inventory)+harvestReservedQuantity(simulation)
export const CROP_FRESH_MS=24*60*60*1000
export const cropIsRotten=(job:{readyAt:number;harvestingAt?:number},now:number)=>job.harvestingAt===undefined&&now>=job.readyAt+CROP_FRESH_MS
export function canStoreFarmGoods(state:TopviewState,goods:readonly {good:FarmGood;quantity:number}[]){
 if(!warehouseAvailable(state))return false
 const added=goods.reduce((sum,item)=>sum+(item.good.endsWith('Seed')||isFarmSupply(item.good)?0:item.quantity),0)
 return farmStorageUsage(state.simulation)+added<=warehouseCapacity(state)
}
type GoodDetails={name:string;price:number;crop?:CropKind;image?:string}
export const farmGoods:Record<FarmGood,GoodDetails>={
 ...Object.fromEntries(cropKinds.flatMap(crop=>[[crop,{name:farmCrops[crop].name,price:farmCrops[crop].sellPrice,crop}],[seedGood(crop),{name:`${farmCrops[crop].name} 종자`,price:farmCrops[crop].seedPrice,crop}]])) as Record<CropKind|SeedGood,GoodDetails>,
 ...farmProducts,
 ...farmSupplies,
}
export type FarmSimulation={butcherJobs?:Record<number,{good:ProductGood;quantity:number;startedAt:number;readyAt:number}>;animalPurchaseJobs:Record<number,{animal:FarmAnimal;startedAt:number;readyAt:number}>;upgradeJobs:Record<number,{startedAt:number;readyAt:number;fromLevel:number}>;inventory:Record<FarmGood,number>;unlockedCrops:CropKind[];unlockedAnimals?:FarmAnimal[];researchJob:{crop:CropKind;labId:number;startedAt:number;readyAt:number}|null;cropJobs:Record<number,{crop:CropKind;readyAt:number;harvestingAt?:number;fertilized?:boolean}>;animalJobs:Record<number,number>;millJobs:Record<number,{product?:MillProduct;quantity:number;startedAt:number;readyAt:number}>;processingJobs:Record<number,{recipe:RecipeId;quantity:number;startedAt:number;readyAt:number}>;orderDeliveries:Record<string,Partial<Record<FarmGood,number>>>}
export type FarmEffect={type:'buy'|'sell'|'research'|'unlock'|'harvest'|'craft'|'crafted'|'received'|'discarded';good:FarmGood;quantity?:number;gold?:number;animal?:FarmAnimal;items?:{good:FarmGood;quantity:number}[]}
export function initialFarmSimulation():FarmSimulation{
 const inventory=Object.fromEntries(Object.keys(farmGoods).map(good=>[good,0])) as Record<FarmGood,number>
 inventory.wheatSeed=4;inventory.wheat=12
 return {inventory,unlockedCrops:['wheat','carrot','potato'],unlockedAnimals:['cow','chicken'],researchJob:null,cropJobs:{},animalJobs:{},animalPurchaseJobs:{},millJobs:{},processingJobs:{},butcherJobs:{},upgradeJobs:{},orderDeliveries:{}}
}
export function farmAnimalHousing(state:TopviewState,animal:FarmAnimal){
 const isAnimal=(kind:FarmTool)=>topviewItems[kind].group==='동물'
 const placed=state.objects.filter(o=>isAnimal(o.kind)).length,stored=state.stored.filter(isAnimal).length,pending=Object.values(state.simulation.animalPurchaseJobs).length
 return {capacity:livestockCapacity(state),placed,stored,pending,total:placed+stored+pending,hasHousing:activeBuildings(state,farmAnimals[animal].housing).length>0}
}
export function farmLimits(state:TopviewState){
 const count=(kind:FarmTool)=>state.objects.filter(o=>o.kind===kind).length
 const usedAnimals=state.objects.filter(object=>topviewItems[object.kind].group==='동물').length,storedAnimals=state.stored.filter(kind=>topviewItems[kind].group==='동물').length,pendingAnimals=Object.keys(state.simulation.animalPurchaseJobs).length
 return {plots:activeBuildings(state,'office').reduce((sum,o)=>sum+buildingCapacity(o),0),animals:livestockCapacity(state),usedPlots:count('plot'),usedAnimals,storedAnimals,pendingAnimals,totalAnimals:usedAnimals+storedAnimals+pendingAnimals}
}
export const farmPurchaseLimit=(kind:FarmTool)=>isBasicFarmBuilding(kind)?1:Infinity
export const farmOwnedCount=(state:TopviewState,kind:FarmTool)=>state.objects.filter(o=>o.kind===kind).length+state.stored.filter(k=>k===kind).length
export const farmCanPurchase=(state:TopviewState,kind:FarmTool)=>!isBasicFarmBuilding(kind)&&!isRetiredTradeBuilding(kind)&&farmOwnedCount(state,kind)<farmPurchaseLimit(kind)
export function farmBuildingStorageError(state:TopviewState,id:number,pendingPlots=0){
 const object=state.objects.find(o=>o.id===id),sim=state.simulation
 if(!object||topviewItems[object.kind].group!=='건물')return '보관할 건물을 선택해주세요.'
 if(object.constructionReadyAt)return '건설이 끝난 뒤 보관할 수 있어요.'
 if(sim.upgradeJobs[id])return '업그레이드를 완료하거나 취소한 뒤 보관할 수 있어요.'
 if(sim.researchJob?.labId===id)return '연구가 끝난 뒤 보관할 수 있어요.'
 if(sim.animalPurchaseJobs[id])return '준비한 동물을 먼저 받은 뒤 보관할 수 있어요.'
 if(sim.processingJobs[id])return '가공품을 먼저 받은 뒤 건물을 보관할 수 있어요.'
 if(sim.butcherJobs?.[id])return '가공한 고기를 먼저 받은 뒤 건물을 보관할 수 있어요.'
 if(object.kind==='mill'&&sim.millJobs[id])return `제분이 끝나고 ${farmGoods[sim.millJobs[id].product??'flour'].name}를 받은 뒤 보관할 수 있어요.`
 const after={...state,objects:state.objects.filter(o=>o.id!==id)},limits=farmLimits(after)
 if(object.kind==='office'&&limits.usedPlots+pendingPlots>limits.plots)return '보관하면 밭 한도를 초과해요. 밭을 먼저 정리해주세요.'
 if(object.kind==='livestockOffice'&&limits.totalAnimals>limits.animals)return '보관하면 동물 정원을 초과해요. 보관·준비 중인 동물까지 먼저 정리해주세요.'
 if(object.kind==='barn'||object.kind==='coop'){
  const housing=farmAnimalHousing(after,object.kind==='barn'?'cow':'chicken')
  if(!housing.hasHousing&&[...after.objects.map(o=>o.kind),...after.stored,...Object.values(sim.animalPurchaseJobs).map(job=>job.animal)].some(kind=>isFarmAnimal(kind)&&farmAnimals[kind].housing===object.kind))return '보관하면 동물의 거처가 부족해요. 보관·준비·대기 중인 동물도 포함해요.'
 }
 if(object.kind==='warehouse'){
  if(farmStorageUsage(sim)>warehouseCapacity(after))return '창고의 생산물을 먼저 비워야 보관할 수 있어요.'
 }
 return null
}
export function farmPlacementError(state:TopviewState,kind:FarmTool,{fromStorage=false}:{fromStorage?:boolean}={}){
 const limits=farmLimits(state)
 const reusing=fromStorage&&state.stored.includes(kind)
 if(!reusing&&!farmCanPurchase(state,kind))return '이미 보유 중인 건물이에요. 보관함에서 꺼내 배치해주세요.'
 if(kind==='plot'&&limits.usedPlots>=limits.plots)return '텃밭 한도가 찼어요. 퐁이 개간터을 추가로 지어주세요.'
 if(isFarmAnimal(kind)){
  const housing=farmAnimalHousing(state,kind),name=topviewItems[farmAnimals[kind].housing].name
  if(!housing.hasHousing)return `${name}를 먼저 배치해주세요.`
  if(reusing?housing.placed>=housing.capacity:housing.total>=housing.capacity)return '전체 동물 정원이 찼어요. 퐁이 돌봄터을 추가로 지어주세요.'
 }
 return null
}
export type FarmSimAction=
 |{type:'buySupply';supply:FarmSupply;quantity:number}
 |{type:'fertilize';supply:FarmSupply}
 |{type:'marketSell';good:FarmGood;quantity:number}
 |{type:'marketSellBatch';items:{good:FarmGood;quantity:number}[]}
 |{type:'butcher';animal:FarmAnimal;quantity:number}
 |{type:'collectMeat'}
 |{type:'storeBuilding'}
 |BuildingUpgradeAction
 |{type:'seed';good:SeedGood;quantity:number}
 |{type:'sell';good:FarmGood;quantity:number;orderDay:string}
 |{type:'research';crop:CropKind}|{type:'completeResearch'}|{type:'mill';quantity:number;product?:MillProduct}|{type:'collectFlour'}
 |{type:'plant';crop:CropKind}|{type:'harvest'}|{type:'beginHarvest'}|{type:'cancelHarvest'}|{type:'discardCrop'}
 |{type:'animal';animal:FarmAnimal}|{type:'completeAnimalPurchase'}|{type:'startAnimal'}|{type:'feed'}|{type:'collectAnimal'}
 |{type:'craft';recipe:RecipeId;quantity:number}|{type:'collectCraft'}
export function simulateFarm(state:TopviewState,sourceId:number,action:FarmSimAction,now:number):{state:TopviewState;message:string;place?:FarmTool;effect?:FarmEffect}{
 const source=state.objects.find(o=>o.id===sourceId),sim=state.simulation
 const reject=(message:string)=>({state,message})
 if(!source)return reject('시설을 먼저 배치해주세요.')
 if(source.constructionReadyAt)return reject('건설이 끝난 뒤 사용할 수 있어요.')
 if(action.type==='storeBuilding'){
  const error=farmBuildingStorageError(state,sourceId);if(error)return reject(error)
  const levels=state.storedLevels?.[source.kind]??state.stored.filter(kind=>kind===source.kind).map(()=>1)
  const orderKeys=source.kind==='store'||source.kind==='processed'?{...state.storedOrderKeys,[source.kind]:[...(state.storedOrderKeys?.[source.kind]??state.stored.filter(kind=>kind===source.kind).map(()=>null)),source.orderKey??source.id]}:state.storedOrderKeys
  return {state:{...state,objects:state.objects.filter(o=>o.id!==sourceId),stored:[...state.stored,source.kind],storedTransforms:{...state.storedTransforms,[source.kind]:[...(state.storedTransforms?.[source.kind]??state.stored.filter(kind=>kind===source.kind).map(()=>({}))),{rotation:source.rotation,flipped:source.flipped}]},storedOrderKeys:orderKeys,storedLevels:isUpgradeable(source.kind)?{...state.storedLevels,[source.kind]:[...levels,buildingLevel(source)]}:state.storedLevels},message:'건물을 보관함에 넣었어요. 언제든 다시 배치할 수 있어요.'}
 }
 if(action.type==='upgrade'||action.type==='cancelUpgrade'||action.type==='completeUpgrade')return upgradeBuilding(state,sourceId,action,now)
 if(sim.upgradeJobs[sourceId])return reject('업그레이드 중에는 이 건물을 사용할 수 없어요.')
 if(action.type==='marketSellBatch'){
  if(!action.items.length||action.items.length>deliverableGoods.length)return reject('판매할 상품을 선택해주세요.')
  let nextState=state,total=0,quantity=0
  for(const item of action.items){
   const result=simulateFarm(nextState,sourceId,{type:'marketSell',...item},now)
   if(result.state===nextState)return reject(result.message)
   total+=result.effect?.gold??0;quantity+=item.quantity;nextState=result.state
  }
  return {state:nextState,message:`${quantity}개 판매 · +${total.toLocaleString()} G`,effect:{type:'sell',good:action.items[0].good,quantity,gold:total,items:action.items}}
 }
 if(action.type==='butcher'){
  if(source.kind!=='butcher'||!isFarmAnimal(action.animal))return reject('정육점에서 넣을 동물을 선택해주세요.')
  if(sim.butcherJobs?.[sourceId])return reject('가공 중인 고기를 먼저 받아주세요.')
  const count=state.stored.filter(kind=>kind===action.animal).length,recipe=butcherRecipes[action.animal],quantity=recipe.output*action.quantity
  if(!Number.isSafeInteger(action.quantity)||action.quantity<1||action.quantity>count)return reject('보관함에 있는 동물만 넣을 수 있어요.')
  if(!canStoreFarmGoods(state,[{good:recipe.good,quantity}]))return reject('사용 가능한 창고에 고기를 보관할 공간이 필요해요.')
  let remaining=action.quantity
  const stored=state.stored.filter(kind=>kind===action.animal&&remaining>0?(remaining--,false):true)
  return {state:{...state,stored,storedTransforms:{...state.storedTransforms,[action.animal]:state.storedTransforms?.[action.animal]?.slice(action.quantity)},simulation:{...sim,butcherJobs:{...sim.butcherJobs,[sourceId]:{good:recipe.good,quantity,startedAt:now,readyAt:now+waterwheelDuration(BUTCHER_SECONDS*action.quantity,waterwheelBonusMinutes(state,source))*1000}}}},message:`고기 가공을 시작했어요. ${farmDuration(waterwheelDuration(BUTCHER_SECONDS*action.quantity,waterwheelBonusMinutes(state,source)))} 후 받을 수 있어요.`}
 }
 if(action.type==='collectMeat'){
  const job=sim.butcherJobs?.[sourceId]
  if(source.kind!=='butcher'||!job||job.readyAt>now)return reject('아직 고기 가공이 끝나지 않았어요.')
  if(!canStoreFarmGoods(state,[job]))return reject('고기를 받을 창고 공간이 부족해요.')
  const jobs={...sim.butcherJobs};delete jobs[sourceId]
  return {state:{...state,simulation:{...sim,butcherJobs:jobs,inventory:{...sim.inventory,[job.good]:sim.inventory[job.good]+job.quantity}}},message:'가공한 고기를 받았어요.',effect:{type:'crafted',good:job.good,quantity:job.quantity}}
 }
 if(['marketSell','sell','beginHarvest','harvest','mill','collectFlour','craft','collectCraft','startAnimal','feed','collectAnimal'].includes(action.type)&&!warehouseAvailable(state))return reject('사용 가능한 창고가 없어요. 창고를 배치한 뒤 이용해주세요.')
 const inventory={...sim.inventory},next:FarmSimulation={...sim,inventory,animalPurchaseJobs:{...sim.animalPurchaseJobs},cropJobs:{...sim.cropJobs},animalJobs:{...sim.animalJobs},millJobs:{...sim.millJobs},processingJobs:{...sim.processingJobs}}
 let gold=state.gold,message='',place:FarmTool|undefined,effect:FarmEffect|undefined
 if('quantity'in action&&(!Number.isSafeInteger(action.quantity)||action.quantity<1))return reject('수량을 확인해주세요.')
 switch(action.type){
  case 'buySupply':{
   if(source.kind!=='agriShop'||!isFarmSupply(action.supply))return reject('농업용품점에서 구매할 비료를 선택해주세요.')
   const cost=farmSupplies[action.supply].price*action.quantity
   if(action.quantity>1000||!Number.isSafeInteger(cost)||cost>gold||!Number.isSafeInteger(inventory[action.supply]+action.quantity))return reject('수량과 보유 골드를 확인해주세요.')
   gold-=cost;inventory[action.supply]+=action.quantity
   message=`${farmSupplies[action.supply].name} ${action.quantity}개를 구매했어요.`;effect={type:'buy',good:action.supply,quantity:action.quantity,gold:cost};break
  }
  case 'fertilize':{
   if(source.kind!=='plot'||!isFarmSupply(action.supply))return reject('자라고 있는 작물이 심어진 밭을 선택해주세요.')
   const job=sim.cropJobs[sourceId]
   if(!job||job.readyAt<=now||job.harvestingAt!==undefined)return reject('비료는 자라고 있는 작물에만 사용할 수 있어요.')
   if(action.supply==='fertilizer'&&job.fertilized)return reject('이 작물에는 비료를 이미 사용했어요. 고급 비료는 사용할 수 있어요.')
   if(!(inventory[action.supply]>=1))return reject('보유한 비료가 없어요. 농업용품점에서 구매해주세요.')
   inventory[action.supply]--
   next.cropJobs[sourceId]={...job,fertilized:true,readyAt:action.supply==='premiumFertilizer'?now:now+Math.ceil((job.readyAt-now)/2)}
   message=action.supply==='premiumFertilizer'?'작물이 다 자랐어요. 밭을 눌러 수확해주세요.':'남은 재배 시간이 절반으로 줄었어요.';break
  }
  case 'seed':{
   if(source.kind!=='seedShop')return reject('종자는 종자 상점에서 구매해요.')
   const crop=typeof action.good==='string'?action.good.slice(0,-4):''
   if(!isCropKind(crop)||seedGood(crop)!==action.good)return reject('구매할 종자를 확인해주세요.')
   if(!sim.unlockedCrops.includes(crop))return reject(`종자 연구소에서 ${farmCrops[crop].name}를 먼저 연구해주세요.`)
   const cost=farmGoods[action.good].price*action.quantity
   if(action.quantity>1000||!Number.isSafeInteger(cost)||!Number.isSafeInteger(inventory[action.good]+action.quantity))return reject('수량과 보유 종자를 확인해주세요.')
   if(cost>gold)return reject('골드가 부족해요.')
   gold-=cost;inventory[action.good]+=action.quantity;message=`${farmGoods[action.good].name} ${action.quantity}개를 구매했어요.`;effect={type:'buy',good:action.good,quantity:action.quantity,gold:cost};break
  }
  case 'sell':
  case 'marketSell':{
   if(source.kind!=='store'||!isDeliverableGood(action.good))return reject('농장 납품소에는 1차 생산물·식품·생활용품을 납품할 수 있어요.')
   if(!Number.isSafeInteger(action.quantity)||action.quantity<1)return reject('판매 수량을 확인해주세요.')
   const proceeds=farmGoods[action.good].price*action.quantity
   if(inventory[action.good]<action.quantity)return reject('보유 수량이 부족해요.')
   if(proceeds<=0||!Number.isSafeInteger(proceeds)||!Number.isSafeInteger(gold+proceeds))return reject('판매 금액을 확인해주세요.')
   inventory[action.good]-=action.quantity;gold+=proceeds
   message=`${farmGoods[action.good].name} ${action.quantity}개를 납품했어요.`;effect={type:'sell',good:action.good,quantity:action.quantity,gold:proceeds};break
  }
  case 'research':{
   if(source.kind!=='lab')return reject('종자 연구소를 이용해주세요.')
   if(!isCropKind(action.crop))return reject('연구할 작물을 확인해주세요.')
   if(sim.unlockedCrops.includes(action.crop))return reject('이미 연구한 작물이에요.')
   if(sim.researchJob)return reject('진행 중인 연구가 끝나면 다음 연구를 시작할 수 있어요.')
   const details=farmCrops[action.crop]
   if(gold<details.researchPrice)return reject('골드가 부족해요.')
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
   if(!canStoreFarmGoods(state,[{good:job.crop,quantity:farmCrops[job.crop].yield}]))return reject('창고가 가득 찼어요. 판매하거나 업그레이드한 뒤 수확해주세요.')
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
   const product=action.product??'flour'
   if(!Object.hasOwn(millRecipes,product))return reject('제분할 재료를 확인해주세요.')
   const recipe=millRecipes[product]
   if(action.quantity*recipe.output>buildingLevel(source)*2)return reject('건물의 최대 제작량을 초과했어요.')
   const cycles=Math.ceil(action.quantity*recipe.output/2)
   if(!sim.unlockedCrops.includes(recipe.crop))return reject('먼저 해당 작물을 연구해주세요.')
   if(inventory[recipe.crop]<action.quantity*recipe.input)return reject(farmGoods[recipe.crop].name+'이 부족해요.')
   inventory[recipe.crop]-=action.quantity*recipe.input;next.millJobs[sourceId]={product,quantity:action.quantity,startedAt:now,readyAt:now+waterwheelDuration(recipe.seconds*cycles,waterwheelBonusMinutes(state,source))*1000};message=`가공을 시작했어요. ${farmDuration(waterwheelDuration(recipe.seconds*cycles,waterwheelBonusMinutes(state,source)))} 후 수령할 수 있어요.`;break
  }
  case 'collectFlour':{
   const job=sim.millJobs[sourceId]
   if(source.kind!=='mill'||!job||job.readyAt>now)return reject('아직 제분이 끝나지 않았어요.')
   const product=job.product??'flour',output=job.quantity*millRecipes[product].output
   inventory[product]+=output;delete next.millJobs[sourceId];message=farmGoods[product].name+'를 수령했어요.';effect={type:'crafted',good:product,quantity:output};break
  }
  case 'craft':{
   if(!isRecipeId(action.recipe))return reject('만들 가공품을 확인해주세요.')
   if(!recipeUnlocked(action.recipe,sim.unlockedAnimals))return reject('해당 동물을 먼저 구매해주세요.')
   const recipe=farmRecipes[action.recipe]
   if(source.kind!==recipe.building)return reject('이 가공품을 만드는 건물을 이용해주세요.')
   if(sim.processingJobs[sourceId])return reject('만든 가공품을 먼저 받아주세요.')
   if(action.quantity>recipeBatchLimit(inventory,action.recipe,buildingLevel(source)*2))return reject('재료가 부족하거나 한 번에 만들 수 있는 수량을 넘었어요.')
   const cycles=Math.ceil(action.quantity*recipeOutput(action.recipe)/2)
   if(recipe.ingredients.some(item=>inventory[item.good]<item.quantity*action.quantity))return reject('제작에 필요한 재료가 부족해요.')
   for(const item of recipe.ingredients)inventory[item.good]-=item.quantity*action.quantity
   next.processingJobs[sourceId]={recipe:action.recipe,quantity:action.quantity*recipeOutput(action.recipe),startedAt:now,readyAt:now+waterwheelDuration(recipe.seconds*cycles,waterwheelBonusMinutes(state,source))*1000}
   message=`${farmGoods[action.recipe].name} ${action.quantity*recipeOutput(action.recipe)}개를 만들고 있어요.`;effect={type:'craft',good:action.recipe,quantity:action.quantity*recipeOutput(action.recipe)};break
  }
  case 'collectCraft':{
   const job=sim.processingJobs[sourceId]
   // Jobs belong to the facility that started them, even if a recipe is reassigned later.
   if(!job||!isProcessingBuilding(source.kind)||job.readyAt>now)return reject('아직 가공품이 준비되지 않았어요.')
   inventory[job.recipe]+=job.quantity;delete next.processingJobs[sourceId]
   message=`${farmGoods[job.recipe].name} ${job.quantity}개를 받았어요.`;effect={type:'crafted',good:job.recipe,quantity:job.quantity};break
  }
  case 'animal':{
   if(!isFarmAnimal(action.animal)||source.kind!==farmAnimals[action.animal].housing)return reject('해당 동물의 시설을 이용해주세요.')
   const error=farmPlacementError(state,action.animal)
   if(error)return reject(error)
   if(sim.animalPurchaseJobs[sourceId])return reject('이미 동물을 준비하고 있어요.')
   const price=farmAnimals[action.animal].price
   if(gold<price)return reject('골드가 부족해요.')
   gold-=price;next.animalPurchaseJobs[sourceId]={animal:action.animal,startedAt:now,readyAt:now+ANIMAL_PURCHASE_SECONDS*1000};message='동물을 준비하고 있어요. 10초 후 건물 위 말풍선을 눌러 받아주세요.';break
  }
  case 'completeAnimalPurchase':{
   const job=sim.animalPurchaseJobs[sourceId]
   if(!job||job.readyAt>now||source.kind!==farmAnimals[job.animal].housing)return reject('아직 동물을 준비하고 있어요.')
   delete next.animalPurchaseJobs[sourceId]
   return {state:{...state,simulation:{...next,unlockedAnimals:[...new Set([...(sim.unlockedAnimals??['cow','chicken'] as FarmAnimal[]),job.animal])]},stored:[...state.stored,job.animal]},message:'새 동물이 보관함에 도착했어요. 원하는 곳에 배치해주세요.',effect:{type:'received',good:farmAnimals[job.animal].product,animal:job.animal,quantity:1}}
  }
  case 'startAnimal':
  case 'feed':{
   if(!isFarmAnimal(source.kind)||sim.animalJobs[sourceId])return reject('지금은 먹이를 줄 수 없어요.')
   if(inventory.wheat<1)return reject('먹이로 줄 밀 1개가 필요해요.')
   inventory.wheat--;next.animalJobs[sourceId]=now+farmAnimals[source.kind].seconds*1000;message=`밀 1개를 먹였어요. ${farmDuration(farmAnimals[source.kind].seconds)} 후 생산물 ${ANIMAL_PRODUCTION_OUTPUT}개를 받을 수 있어요.`;break
  }
  case 'collectAnimal':{
   if(!isFarmAnimal(source.kind)||sim.animalJobs[sourceId]===undefined||sim.animalJobs[sourceId]>now)return reject('아직 생산물이 준비되지 않았어요.')
   const good=farmAnimals[source.kind].product
   inventory[good]+=ANIMAL_PRODUCTION_OUTPUT;delete next.animalJobs[sourceId];message=`${farmGoods[good].name} ${ANIMAL_PRODUCTION_OUTPUT}개를 창고에 보관했어요.`;effect={type:'harvest',good,quantity:ANIMAL_PRODUCTION_OUTPUT};break
  }
 }
 const reserved=farmStorageUsage(next),beforeReserved=farmStorageUsage(sim)
 if(reserved>warehouseCapacity(state)&&reserved>beforeReserved)return reject(`창고 용량 ${warehouseCapacity(state)}개가 가득 찼어요. 생산물을 판매해 공간을 만들어주세요.`)
 return {state:{...state,gold,simulation:next,stored:place?[...state.stored,place]:state.stored,storedTransforms:place?{...state.storedTransforms,[place]:[...(state.storedTransforms?.[place]??state.stored.filter(kind=>kind===place).map(()=>({}))),{}]}:state.storedTransforms},message,place,effect}
}
