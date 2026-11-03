import type {FarmTool,TopviewObject,TopviewState} from './topview-model'

export const UPGRADE_COST=50,UPGRADE_SECONDS=10,MAX_BUILDING_LEVEL=10
export const isUpgradeable=(kind:FarmTool)=>kind==='warehouse'||kind==='office'||kind==='livestock'
export const buildingLevel=(object:TopviewObject)=>Math.max(1,Math.min(MAX_BUILDING_LEVEL,object.level??1))
export const buildingCapacity=(object:TopviewObject)=>buildingLevel(object)*(object.kind==='warehouse'?10:object.kind==='office'?4:object.kind==='livestock'?2:0)
export const activeBuildings=(state:TopviewState,kind:FarmTool)=>state.objects.filter(o=>o.kind===kind&&!state.simulation.upgradeJobs[o.id])
export const warehouseCapacity=(state:TopviewState)=>activeBuildings(state,'warehouse').reduce((sum,o)=>sum+buildingCapacity(o),0)
export const warehouseAvailable=(state:TopviewState)=>activeBuildings(state,'warehouse').length>0
export type BuildingUpgradeAction={type:'upgrade'}|{type:'cancelUpgrade'}|{type:'completeUpgrade'}
export function upgradeBuilding(state:TopviewState,id:number,action:BuildingUpgradeAction,now:number){
 const object=state.objects.find(o=>o.id===id),job=state.simulation.upgradeJobs[id]
 const reject=(message:string)=>({state,message})
 if(!object||!isUpgradeable(object.kind))return reject('업그레이드할 건물을 선택해주세요.')
 const jobs={...state.simulation.upgradeJobs}
 if(action.type==='upgrade'){
  if(job)return reject('이미 업그레이드 중이에요.')
  if(buildingLevel(object)>=MAX_BUILDING_LEVEL)return reject('최고 레벨이에요.')
  if(state.gold<UPGRADE_COST)return reject('체험 골드가 부족해요.')
  jobs[id]={startedAt:now,readyAt:now+UPGRADE_SECONDS*1000,fromLevel:buildingLevel(object)}
  return {state:{...state,gold:state.gold-UPGRADE_COST,simulation:{...state.simulation,upgradeJobs:jobs}},message:'업그레이드를 시작했어요.'}
 }
 if(!job)return reject('진행 중인 업그레이드가 없어요.')
 if(action.type==='cancelUpgrade'){
  if(job.readyAt<=now)return reject('완료된 업그레이드는 취소할 수 없어요.')
  delete jobs[id]
  return {state:{...state,gold:state.gold+UPGRADE_COST,simulation:{...state.simulation,upgradeJobs:jobs}},message:'업그레이드를 취소하고 50골드를 돌려받았어요.'}
 }
 if(job.readyAt>now)return reject('아직 업그레이드 중이에요.')
 delete jobs[id]
 return {state:{...state,objects:state.objects.map(o=>o.id===id?{...o,level:Math.min(MAX_BUILDING_LEVEL,job.fromLevel+1)}:o),simulation:{...state.simulation,upgradeJobs:jobs}},message:'업그레이드 완료! 건물을 다시 사용할 수 있어요.'}
}
