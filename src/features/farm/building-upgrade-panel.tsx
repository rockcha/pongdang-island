import {farmDuration} from './farm-duration'
import {FarmGold} from './farm-gold'
import {farmUpgradeArt} from './upgrade-art'
import {Hammer,ArrowRight} from 'lucide-react'
import {buildingCapacity,buildingLevel,warehouseCapacity,WAREHOUSE_CAPACITY_PER_LEVEL,buildingMaxLevel,buildingUpgradeCost,isProductionUpgradeable,UPGRADE_SECONDS} from './building-upgrades'
import type {TopviewObject,TopviewState} from './topview-model'
import {farmLimits,type FarmSimAction} from './farm-simulation'
import './material-requirements.css'

export function BuildingUpgradePanel({object,state,now,onAction}:{object:TopviewObject;state:TopviewState;now:number;onAction:(action:FarmSimAction)=>void}){
 const wheel=object.kind==='waterwheel'
 const production=isProductionUpgradeable(object.kind),cost=buildingUpgradeCost(object.kind),busy=!!(state.simulation.millJobs[object.id]||state.simulation.processingJobs[object.id])
 const maxLevel=buildingMaxLevel(object.kind),level=buildingLevel(object),job=state.simulation.upgradeJobs[object.id],capacity=buildingCapacity(object),livestock=object.kind==='livestockOffice',unit=wheel?'분':production?'개':livestock?'마리':object.kind==='warehouse'?'개':'칸'
 const progress=job?Math.min(100,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)*100)):0
 const limits=farmLimits(state)
 const total=wheel?level:production?level*2:object.kind==='office'?limits.plots:livestock?limits.animals:warehouseCapacity(state)
 if(!job){
  const maxed=level>=maxLevel,reason=busy?'생산물을 수령한 뒤 확장할 수 있어요.':state.gold<cost?'업그레이드에 필요한 골드가 부족해요.':undefined
  return <section className="farm-upgrade-panel farm-upgrade-compact" aria-label="건물 업그레이드">
   <div className="farm-upgrade-overview"><span className="farm-upgrade-symbol"><Hammer size={17}/></span><div><strong>{wheel?'시간 단축':production?'생산량 확장':'창고 확장'} <small>Lv. {level} / {maxLevel}</small></strong><span className="farm-upgrade-effect">{wheel?'제작 시간 단축':production?'최대 제작량':'용량'} <b>{total}{unit}</b>{!maxed&&<><ArrowRight size={12}/><b>{total+(wheel?1:production?2:object.kind==='warehouse'?WAREHOUSE_CAPACITY_PER_LEVEL:capacity/level)}{unit}</b></>}</span></div></div>
   {maxed?<span className="farm-upgrade-complete">최고 레벨</span>:<button className="farm-upgrade-start" aria-label={`업그레이드 · ${cost.toLocaleString()} G`} disabled={!!reason} onClick={()=>onAction({type:'upgrade'})}><span>업그레이드 <small>{farmDuration(UPGRADE_SECONDS)}</small></span><strong><FarmGold amount={cost}/></strong></button>}
   {reason&&!maxed&&<p className="farm-upgrade-unavailable">{reason}</p>}
  </section>
 }
 return <section className="farm-upgrade-panel" aria-label="건물 업그레이드">
  <header><span>Lv. {level} <small>/ {maxLevel}</small></span></header>
  <div className="farm-upgrade-work"><span className="farm-upgrade-art" aria-hidden="true"><img src={farmUpgradeArt} alt="" draggable={false}/></span><div><strong>업그레이드 중</strong><small>{object.kind==='warehouse'?`기존 용량 ${total}개까지 계속 이용할 수 있어요.`:'완료될 때까지 건물 기능을 사용할 수 없어요.'}</small></div></div>
  <div className="farm-sim-progress farm-upgrade-progress" role="progressbar" aria-label="건물 업그레이드 진행" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:progress+'%'}}/></div>
  <div className="farm-upgrade-running"><span>{farmDuration(Math.max(0,Math.ceil((job.readyAt-now)/1000)))} 남음</span><button onClick={()=>onAction({type:'cancelUpgrade'})}>업그레이드 취소</button></div><p>취소하면 {cost.toLocaleString()}골드를 돌려받아요.</p>
 </section>
}
