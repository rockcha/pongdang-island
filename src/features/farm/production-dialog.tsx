import {waterwheelBonusMinutes} from './waterwheel'
import {buildingLevel,isProductionUpgradeable} from './building-upgrades'
import {BuildingUpgradePanel} from './building-upgrade-panel'
import {farmDuration} from './farm-duration'
import {FarmGold} from './farm-gold'
import {isProcessingBuilding} from './workshop-catalog'
import {useEffect,useState} from 'react'
import {Check,FlaskConical,Move} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {cropKinds,farmCrops,seedGood} from './crop-catalog'
import {cropIsRotten,type FarmSimAction} from './farm-simulation'
import {FarmGoodIcon} from './farm-good-icon'

import {topviewItems,type TopviewObject,type TopviewState} from './topview-model'
import {farmBuildingSubtitle} from './building-subtitle'
import './facility-dialog.css'
import './product-display.css'
import {ProcessingWorkshop} from './processing-workshop'
import {farmLimits} from './farm-simulation'
import {FarmItemPicker} from './item-picker'
import {FarmAnimalPurchase} from './animal-purchase'
import {MillWorkshop} from './mill-workshop'
import {FacilityManagement} from './facility-management'
import {ButcherWorkshop} from './butcher-workshop'
import {FarmSupplyShop} from './supply-shop'
import {FarmTradePanel} from './market-panel'
import {FoodSalePanel} from './food-sale-panel'

export function FarmProductionDialog({object,state,message,onAction,onClose,onStore,onMove,onFlip,onSell,pendingPlots=0,lastPurchasedSeed='wheat'}:{object:TopviewObject;state:TopviewState;message:string;onAction:(action:FarmSimAction)=>void;onClose:()=>void;onStore?:()=>void;pendingPlots?:number;lastPurchasedSeed?:typeof cropKinds[number];onMove?:()=>void;onFlip?:()=>void;onSell?:()=>void}){
 const [now,setNow]=useState(Date.now),[selectedCrop,setSelectedCrop]=useState<typeof cropKinds[number]>(object.kind==='lab'?'potato':object.kind==='seedShop'?lastPurchasedSeed:'wheat')
 const sim=state.simulation,kind=object.kind,job=sim.researchJob
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),100);return()=>window.clearInterval(timer)},[])
 const crop=sim.cropJobs[object.id],animalHouse=kind==='coop'||kind==='barn'
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className={`farm-sim-dialog farm-compact-dialog farm-facility-dialog ${isProcessingBuilding(kind)||kind==='mill'?'farm-workbench-dialog':''} ${kind==='store'?'farm-food-dialog':''} ${animalHouse?'farm-animal-dialog':''}`}><DialogHeader className="farm-compact-header"><DialogTitle>{topviewItems[kind].name}</DialogTitle><DialogDescription className="farm-building-subtitle">{farmBuildingSubtitle(kind)}</DialogDescription></DialogHeader>
  <div className="farm-sim-body">
   {waterwheelBonusMinutes(state,object)>0&&<p className="farm-sim-caption">물레방아 효과 · 총 제작 시간 {waterwheelBonusMinutes(state,object)}분 단축 (최소 1초)</p>}
   {kind==='waterwheel'&&<section className="farm-building-info"><h3>인접 생산 건물 시간 −{buildingLevel(object)}분</h3><p>변이 맞닿은 주방·공방·빵집·제분소·양봉장·정육점에 적용돼요. 대각선은 제외됩니다.</p><p>작업 시작 시 총 제작 시간을 {buildingLevel(object)}분 줄여요. 최소 1초이며, 여러 물레방아 중 가장 높은 레벨 하나만 적용돼요.</p><p>이미 시작한 작업의 시간은 바뀌지 않아요.</p></section>}
   {(isProductionUpgradeable(kind)||kind==='waterwheel')&&<BuildingUpgradePanel object={object} state={state} now={now} onAction={onAction}/>}
   {kind==='store'&&<FoodSalePanel state={state} onAction={onAction}/>}
   {kind==='agriShop'&&<FarmSupplyShop state={state} onAction={onAction}/>}
   {kind==='seedShop'&&<FarmTradePanel kind={kind} state={state} onAction={onAction} lastPurchasedSeed={lastPurchasedSeed}/>}
   {kind==='butcher'&&<ButcherWorkshop state={state} buildingId={object.id} now={now} onAction={onAction}/>}
   {(kind==='office'||kind==='livestockOffice')&&<section className="farm-building-info"><strong>{kind==='office'?'밭 한도 +4칸':'동물 정원 +2마리'}</strong><p>{kind==='office'?`전체 밭 ${farmLimits(state).usedPlots} / ${farmLimits(state).plots}칸`:`전체 동물 ${farmLimits(state).totalAnimals} / ${farmLimits(state).animals}마리`}</p><p>상점에서 5,000골드에 구매해 여러 채 지을 수 있어요.</p></section>}
   {!sim.upgradeJobs[object.id]&&isProcessingBuilding(kind)&&<ProcessingWorkshop waterwheelBonus={waterwheelBonusMinutes(state,object)} maxOutput={buildingLevel(object)*2} buildingId={object.id} kind={kind} simulation={sim} now={now} onAction={onAction}/>}
   {kind==='lab'&&<><FarmItemPicker items={cropKinds} value={selectedCrop} onChange={setSelectedCrop} label="연구할 종자" isLocked={c=>!sim.unlockedCrops.includes(c)}/>{cropKinds.filter(c=>c===selectedCrop).map(cropKind=>{
    const details=farmCrops[cropKind],unlocked=sim.unlockedCrops.includes(cropKind),researching=job?.crop===cropKind
    const remaining=researching?Math.max(0,Math.ceil((job.readyAt-now)/1000)):0,progress=researching?Math.min(100,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)*100)):0
    return <article className="farm-research-card" key={cropKind} data-locked={!unlocked||undefined} data-researching={researching}>
     <div className="farm-research-heading"><FarmGoodIcon good={cropKind}/><div><h3>{details.name}</h3><p>{farmDuration(details.growSeconds)} 재배 · 수확 {details.yield}개</p></div>{unlocked?<span className="farm-researched"><Check size={13}/>{details.researchPrice===0?'기본 종자':'연구 완료'}</span>:<span className="farm-research-time">{farmDuration(details.researchSeconds)}</span>}</div>
     {!unlocked&&(researching?<div className="farm-research-running"><div className="farm-sim-progress" role="progressbar" aria-label={`${details.name} 연구 진행`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${progress}%`}}/></div><span>{remaining?`${farmDuration(remaining)} 남았어요`:'연구를 마무리하고 있어요'}</span></div>:<button className="farm-research-start" disabled={!!job||state.gold<details.researchPrice} onClick={()=>onAction({type:'research',crop:cropKind})} aria-label={`${details.name} 연구 · ${details.researchPrice.toLocaleString()} G`}><FlaskConical size={14}/><span>{job?'다른 종자 연구 중':'연구하기'}</span><strong><FarmGold amount={details.researchPrice.toLocaleString()}/></strong></button>)}
    </article>
   })}</>}
   {!sim.upgradeJobs[object.id]&&kind==='mill'&&<MillWorkshop waterwheelBonus={waterwheelBonusMinutes(state,object)} key={object.id} maxOutput={buildingLevel(object)*2} buildingId={object.id} simulation={sim} now={now} onAction={onAction}/>}
   {(kind==='coop'||kind==='barn')&&<FarmAnimalPurchase buildingId={object.id} kind={kind} state={state} now={now} onAction={onAction}/>}
   {kind==='plot'&&<>{crop&&cropIsRotten(crop,now)?<div className="farm-sim-feature"><FarmGoodIcon good={crop.crop} className="farm-crop-rotten farm-crop-hero"/><h3>작물이 썩었어요</h3><p>수확 가능 시간 24시간이 지났어요.<br/>폐기한 뒤 새 종자를 심어주세요.</p><button className="farm-sim-primary" onClick={()=>onAction({type:'discardCrop'})}>폐기하기</button></div>:crop?<><FarmGoodIcon good={crop.crop} className="farm-crop-hero"/><JobProgress readyAt={crop.readyAt} now={now} label={`${farmCrops[crop.crop].name} 재배`} seconds={farmCrops[crop.crop].growSeconds} onCollect={()=>onAction({type:'harvest'})}/><p className="farm-sim-caption">다 자란 뒤 24시간 안에 수확해주세요. 이후에는 썩어요.</p></>:<><FarmItemPicker items={cropKinds} value={selectedCrop} onChange={setSelectedCrop} label="심을 작물" owned={c=>sim.inventory[seedGood(c)]}/>{cropKinds.filter(c=>c===selectedCrop).map(cropKind=>{
    const seed=seedGood(cropKind),details=farmCrops[cropKind],locked=!sim.unlockedCrops.includes(cropKind)
    return <div className="farm-sim-crop" key={cropKind}><FarmGoodIcon good={cropKind}/><div><strong>{details.name}</strong><small>{`재배 ${farmDuration(details.growSeconds)} · 한 칸 수확 ${details.yield}개`}</small></div><button aria-label={`${details.name} 심기`} disabled={locked||sim.inventory[seed]<1} onClick={()=>onAction({type:'plant',crop:cropKind})}>{`${details.name} 심기`}</button></div>
   })}</>}</>}
   {message&&<p className="farm-sim-feedback" role="status">{message}</p>}
  </div>
  {kind==='plot'&&onMove&&<div className="farm-building-store"><div className="farm-building-actions" role="group" aria-label="밭 배치 관리"><button onClick={onMove}><Move size={15}/>이동하기</button></div></div>}
  {onStore&&<FacilityManagement object={object} state={state} onStore={onStore} pendingPlots={pendingPlots} onMove={onMove} onFlip={onFlip} onSell={onSell}/>}
 </DialogContent></Dialog>
}

function JobProgress({readyAt,now,label,seconds,onCollect}:{readyAt:number;now:number;label:string;seconds:number;onCollect:()=>void}){
 const remaining=Math.min(seconds,Math.max(0,Math.ceil((readyAt-now)/1000))),progress=Math.min(100,Math.max(0,100-(readyAt-now)/(seconds*10)))
 return <div className="farm-sim-feature"><h3>{label}</h3><div className="farm-sim-progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:progress+'%'}}/></div><p>{remaining?`${farmDuration(remaining)} 남았어요.`:'완료! 생산물을 받을 수 있어요.'}</p><button className="farm-sim-primary" disabled={remaining>0} onClick={onCollect}>수령하기</button></div>
}
