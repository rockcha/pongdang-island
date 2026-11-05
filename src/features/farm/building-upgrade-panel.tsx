import {farmUpgradeArt} from './upgrade-art'
import {Hammer,ArrowRight} from 'lucide-react'
import {buildingCapacity,buildingLevel,warehouseCapacity,MAX_BUILDING_LEVEL,UPGRADE_COST,UPGRADE_SECONDS} from './building-upgrades'
import type {TopviewObject,TopviewState} from './topview-model'
import {farmLimits,type FarmSimAction} from './farm-simulation'

export function BuildingUpgradePanel({object,state,now,onAction}:{object:TopviewObject;state:TopviewState;now:number;onAction:(action:FarmSimAction)=>void}){
 const level=buildingLevel(object),job=state.simulation.upgradeJobs[object.id],capacity=buildingCapacity(object),livestock=object.kind==='livestockOffice',unit=livestock?'마리':'칸'
 const progress=job?Math.min(100,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)*100)):0
 const limits=farmLimits(state),used=object.kind==='office'?limits.usedPlots:livestock?limits.totalAnimals:0
 const total=object.kind==='office'?limits.plots:livestock?limits.animals:warehouseCapacity(state)
 return <section className="farm-upgrade-panel" aria-label="건물 업그레이드">
  <header><span>Lv. {level} <small>/ {MAX_BUILDING_LEVEL}</small></span></header>
  {!job&&<>{object.kind!=='warehouse'&&<div className="farm-capacity-detail"><div><span>{object.kind==='office'?'텃밭 사용':'전체 동물'}</span><strong>{used} / {total}{unit}</strong></div><div className="farm-sim-progress"><i style={{width:`${Math.min(100,used/Math.max(1,total)*100)}%`}}/></div></div>}{level<MAX_BUILDING_LEVEL&&<div className="farm-upgrade-preview"><span>확장 후 {object.kind==='warehouse'?'창고 용량':'전체 한도'}</span><strong>{total}{unit}<ArrowRight size={14}/>{total+capacity/level}{unit}</strong></div>}</>}
  {job?<><div className="farm-upgrade-work"><span className="farm-upgrade-art" aria-hidden="true"><img src={farmUpgradeArt} alt="" draggable={false}/></span><div><strong>업그레이드 중</strong><small>{livestock?'기존 정원은 유지되고, 완료 후 정원이 늘어나요.':'완료될 때까지 건물 기능을 사용할 수 없어요.'}</small></div></div><div className="farm-sim-progress farm-upgrade-progress" role="progressbar" aria-label="건물 업그레이드 진행" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:progress+'%'}}/></div><div className="farm-upgrade-running"><span>{Math.max(0,Math.ceil((job.readyAt-now)/1000))}초 남음</span><button onClick={()=>onAction({type:'cancelUpgrade'})}>업그레이드 취소</button></div><p>취소하면 50골드를 돌려받아요.</p></>:level>=MAX_BUILDING_LEVEL?<p className="farm-upgrade-max">최고 레벨에 도달했어요.</p>:<button className="farm-upgrade-start" aria-label="업그레이드 · 50 G" disabled={state.gold<UPGRADE_COST} onClick={()=>onAction({type:'upgrade'})}><Hammer size={15}/><span>업그레이드 <small>{UPGRADE_SECONDS}초</small></span><strong>{UPGRADE_COST} G</strong></button>}
 </section>
}
