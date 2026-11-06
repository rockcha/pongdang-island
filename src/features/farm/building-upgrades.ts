import type {FarmTool,TopviewObject,TopviewState} from './topview-model'
import {isProcessingBuilding} from './workshop-catalog'

export const UPGRADE_COST=2500,UPGRADE_SECONDS=5*60,MAX_BUILDING_LEVEL=10
export const WAREHOUSE_BASE_CAPACITY=120,WAREHOUSE_CAPACITY_PER_LEVEL=60
export const isProductionUpgradeable=(kind:FarmTool)=>kind==='mill'||isProcessingBuilding(kind)
export const isUpgradeable=(kind:FarmTool)=>kind==='waterwheel'||kind==='warehouse'||isProductionUpgradeable(kind)
export const buildingUpgradeCost=(kind:FarmTool)=>kind==='waterwheel'||isProductionUpgradeable(kind)?3000:UPGRADE_COST
export const buildingLevel=(object:TopviewObject)=>Math.max(1,Math.min(MAX_BUILDING_LEVEL,object.level??1))
export const buildingCapacity=(object:TopviewObject)=>object.kind==='warehouse'?WAREHOUSE_BASE_CAPACITY+(buildingLevel(object)-1)*WAREHOUSE_CAPACITY_PER_LEVEL:object.kind==='office'?4:object.kind==='livestockOffice'?2:0
export const activeBuildings=(state:TopviewState,kind:FarmTool)=>state.objects.filter(o=>o.kind===kind&&!o.constructionReadyAt&&!state.simulation.upgradeJobs[o.id])
export const warehouseCapacity=(state:TopviewState)=>activeBuildings(state,'warehouse').reduce((sum,o)=>sum+buildingCapacity(o),0)
// Each completed ranch adds two slots; capacity is independent of level.
export const livestockCapacity=(state:TopviewState)=>2+state.objects.filter(o=>o.kind==='livestockOffice'&&!o.constructionReadyAt).reduce((sum,o)=>sum+buildingCapacity(o),0)
export const warehouseAvailable=(state:TopviewState)=>activeBuildings(state,'warehouse').length>0
export type BuildingUpgradeAction={type:'upgrade'}|{type:'cancelUpgrade'}|{type:'completeUpgrade'}
export function upgradeBuilding(state:TopviewState,id:number,action:BuildingUpgradeAction,now:number){
 const object=state.objects.find(o=>o.id===id),job=state.simulation.upgradeJobs[id]
 const reject=(message:string)=>({state,message})
 if(object?.constructionReadyAt)return reject('건설이 끝난 뒤 사용할 수 있어요.')
 if(!object||!isUpgradeable(object.kind))return reject('업그레이드할 건물을 선택해주세요.')
 const cost=buildingUpgradeCost(object.kind)
 const jobs={...state.simulation.upgradeJobs}
 if(action.type==='upgrade'){
  if(state.simulation.millJobs[id]||state.simulation.processingJobs[id])return reject('생산물을 수령한 뒤 업그레이드해주세요.')
  if(job)return reject('이미 업그레이드 중이에요.')
  if(buildingLevel(object)>=MAX_BUILDING_LEVEL)return reject('최고 레벨이에요.')
  if(state.gold<cost)return reject('체험 골드가 부족해요.')
  jobs[id]={startedAt:now,readyAt:now+UPGRADE_SECONDS*1000,fromLevel:buildingLevel(object)}
  return {state:{...state,gold:state.gold-cost,simulation:{...state.simulation,upgradeJobs:jobs}},message:'업그레이드를 시작했어요.'}
 }
 if(!job)return reject('진행 중인 업그레이드가 없어요.')
 if(action.type==='cancelUpgrade'){
  if(job.readyAt<=now)return reject('완료된 업그레이드는 취소할 수 없어요.')
  delete jobs[id]
  return {state:{...state,gold:state.gold+cost,simulation:{...state.simulation,upgradeJobs:jobs}},message:`업그레이드를 취소하고 ${cost.toLocaleString('ko-KR')}골드를 돌려받았어요.`}
 }
 if(job.readyAt>now)return reject('아직 업그레이드 중이에요.')
 delete jobs[id]
 return {state:{...state,objects:state.objects.map(o=>o.id===id?{...o,level:Math.min(MAX_BUILDING_LEVEL,job.fromLevel+1)}:o),simulation:{...state.simulation,upgradeJobs:jobs}},message:'업그레이드 완료! 건물을 다시 사용할 수 있어요.'}
}
