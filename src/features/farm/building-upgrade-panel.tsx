import {farmDuration} from './farm-duration'
import {FarmGold} from './farm-gold'
import {farmUpgradeArt} from './upgrade-art'
import {Hammer,ArrowRight} from 'lucide-react'
import {buildingCapacity,buildingLevel,warehouseCapacity,WAREHOUSE_CAPACITY_PER_LEVEL,MAX_BUILDING_LEVEL,buildingUpgradeCost,isProductionUpgradeable,UPGRADE_SECONDS} from './building-upgrades'
import type {TopviewObject,TopviewState} from './topview-model'
import {farmLimits,type FarmSimAction} from './farm-simulation'

export function BuildingUpgradePanel({object,state,now,onAction}:{object:TopviewObject;state:TopviewState;now:number;onAction:(action:FarmSimAction)=>void}){
 const wheel=object.kind==='waterwheel'
 const production=isProductionUpgradeable(object.kind),cost=buildingUpgradeCost(object.kind),busy=!!(state.simulation.millJobs[object.id]||state.simulation.processingJobs[object.id])
 const level=buildingLevel(object),job=state.simulation.upgradeJobs[object.id],capacity=buildingCapacity(object),livestock=object.kind==='livestockOffice',unit=wheel?'분':production?'개':livestock?'마리':object.kind==='warehouse'?'개':'칸'
 const progress=job?Math.min(100,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)*100)):0
 const limits=farmLimits(state),used=object.kind==='office'?limits.usedPlots:livestock?limits.totalAnimals:0
 const total=wheel?level:production?level*2:object.kind==='office'?limits.plots:livestock?limits.animals:warehouseCapacity(state)
 return <section className="farm-upgrade-panel" aria-label="건물 업그레이드">
  <header><span>Lv. {level} <small>/ {MAX_BUILDING_LEVEL}</small></span></header>
  {!job&&<>{!wheel&&!production&&object.kind!=='warehouse'&&<div className="farm-capacity-detail"><div><span>{object.kind==='office'?'텃밭 사용':'전체 동물'}</span><strong>{used} / {total}{unit}</strong></div><div className="farm-sim-progress"><i style={{width:`${Math.min(100,used/Math.max(1,total)*100)}%`}}/></div></div>}{level<MAX_BUILDING_LEVEL&&<div className="farm-upgrade-preview"><span>확장 후 {wheel?'제작 시간 단축':production?'최대 제작량':object.kind==='warehouse'?'창고 용량':'전체 한도'}</span><strong>{total}{unit}<ArrowRight size={14}/>{total+(wheel?1:production?2:object.kind==='warehouse'?WAREHOUSE_CAPACITY_PER_LEVEL:capacity/level)}{unit}</strong></div>}</>}
  {job?<><div className="farm-upgrade-work"><span className="farm-upgrade-art" aria-hidden="true"><img src={farmUpgradeArt} alt="" draggable={false}/></span><div><strong>업그레이드 중</strong><small>{livestock?'기존 정원은 유지되고, 완료 후 정원이 늘어나요.':'완료될 때까지 건물 기능을 사용할 수 없어요.'}</small></div></div><div className="farm-sim-progress farm-upgrade-progress" role="progressbar" aria-label="건물 업그레이드 진행" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:progress+'%'}}/></div><div className="farm-upgrade-running"><span>{farmDuration(Math.max(0,Math.ceil((job.readyAt-now)/1000)))} 남음</span><button onClick={()=>onAction({type:'cancelUpgrade'})}>업그레이드 취소</button></div><p>취소하면 {cost.toLocaleString()}골드를 돌려받아요.</p></>:level>=MAX_BUILDING_LEVEL?<p className="farm-upgrade-max">최고 레벨에 도달했어요.</p>:<button className="farm-upgrade-start" aria-label={`업그레이드 · ${cost.toLocaleString()} G`} disabled={state.gold<cost||busy} onClick={()=>onAction({type:'upgrade'})}><Hammer size={15}/><span>업그레이드 <small>{farmDuration(UPGRADE_SECONDS)}</small></span><strong><FarmGold amount={cost.toLocaleString()}/></strong></button>}
 </section>
}
