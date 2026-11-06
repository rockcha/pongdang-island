import {isProcessingBuilding} from './workshop-catalog'
import {useEffect,useState} from 'react'
import {Check,FlaskConical,Move} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {cropKinds,farmCrops,seedGood} from './crop-catalog'
import {cropIsRotten,type FarmSimAction} from './farm-simulation'
import {FarmGoodIcon} from './farm-good-icon'
import {TopviewArt} from './topview-art'
import {topviewItems,type TopviewObject,type TopviewState} from './topview-model'
import {farmBuildingSubtitle} from './building-subtitle'
import './facility-dialog.css'
import './product-display.css'
import {ProcessingWorkshop} from './processing-workshop'
import {BuildingUpgradePanel} from './building-upgrade-panel'
import {FarmItemPicker} from './item-picker'
import {FarmAnimalPurchase} from './animal-purchase'
import {MillWorkshop} from './mill-workshop'
import {BuildingStoreButton} from './building-store-button'
import {ButcherWorkshop} from './butcher-workshop'
import {FarmSupplyShop} from './supply-shop'
import {FarmTradePanel} from './market-panel'

export function FarmProductionDialog({object,state,message,onAction,onClose,onStore,onMove,onFlip,onSell,pendingPlots=0,lastPurchasedSeed='wheat'}:{object:TopviewObject;state:TopviewState;message:string;onAction:(action:FarmSimAction)=>void;onClose:()=>void;onStore?:()=>void;pendingPlots?:number;lastPurchasedSeed?:typeof cropKinds[number];onMove?:()=>void;onFlip?:()=>void;onSell?:()=>void}){
 const [now,setNow]=useState(Date.now),[selectedCrop,setSelectedCrop]=useState<typeof cropKinds[number]>(object.kind==='lab'?'potato':object.kind==='seedShop'?lastPurchasedSeed:'wheat')
 const sim=state.simulation,kind=object.kind,job=sim.researchJob
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),100);return()=>window.clearInterval(timer)},[])
 const crop=sim.cropJobs[object.id],animalHouse=kind==='coop'||kind==='barn'
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className={`farm-sim-dialog farm-compact-dialog farm-facility-dialog ${animalHouse?'farm-animal-dialog':''}`}><DialogHeader className="farm-compact-header"><div className="farm-sim-title-art"><TopviewArt kind={kind} flipped={object.flipped} compact/></div><DialogTitle>{topviewItems[kind].name}</DialogTitle><DialogDescription className="farm-building-subtitle">{farmBuildingSubtitle(kind)}</DialogDescription></DialogHeader>
  <div className="farm-sim-body">
   {kind==='agriShop'&&<FarmSupplyShop state={state} onAction={onAction}/>}
   {(kind==='seedShop'||kind==='store')&&<FarmTradePanel kind={kind} state={state} onAction={onAction} lastPurchasedSeed={lastPurchasedSeed}/>}
   {kind==='butcher'&&<ButcherWorkshop state={state} onAction={onAction}/>}
   {(kind==='office'||kind==='livestockOffice')&&<BuildingUpgradePanel object={object} state={state} now={now} onAction={onAction}/>}
   {isProcessingBuilding(kind)&&<ProcessingWorkshop buildingId={object.id} kind={kind} simulation={sim} now={now} onAction={onAction}/>}
   {kind==='lab'&&<><FarmItemPicker items={cropKinds} value={selectedCrop} onChange={setSelectedCrop} label="연구할 종자" isLocked={c=>!sim.unlockedCrops.includes(c)}/>{cropKinds.filter(c=>c===selectedCrop).map(cropKind=>{
    const details=farmCrops[cropKind],unlocked=sim.unlockedCrops.includes(cropKind),researching=job?.crop===cropKind
    const remaining=researching?Math.max(0,Math.ceil((job.readyAt-now)/1000)):0,progress=researching?Math.min(100,Math.max(0,(now-job.startedAt)/(job.readyAt-job.startedAt)*100)):0
    return <article className="farm-research-card" key={cropKind} data-researching={researching}>
     <div className="farm-research-heading"><FarmGoodIcon good={cropKind}/><div><h3>{details.name}</h3><p>{details.growSeconds}초 재배 · 수확 {details.yield}개</p></div>{unlocked?<span className="farm-researched"><Check size={13}/>{cropKind==='wheat'?'기본 종자':'연구 완료'}</span>:<span className="farm-research-time">{details.researchSeconds}초</span>}</div>
     {!unlocked&&(researching?<div className="farm-research-running"><div className="farm-sim-progress" role="progressbar" aria-label={`${details.name} 연구 진행`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${progress}%`}}/></div><span>{remaining?`${remaining}초 남았어요`:'연구를 마무리하고 있어요'}</span></div>:<button className="farm-research-start" disabled={!!job||state.gold<details.researchPrice} onClick={()=>onAction({type:'research',crop:cropKind})} aria-label={`${details.name} 연구 · ${details.researchPrice.toLocaleString()} G`}><FlaskConical size={14}/><span>{job?'다른 종자 연구 중':'연구하기'}</span><strong>{details.researchPrice.toLocaleString()} G</strong></button>)}
    </article>
   })}</>}
   {kind==='mill'&&<MillWorkshop buildingId={object.id} simulation={sim} now={now} onAction={onAction}/>}
   {(kind==='coop'||kind==='barn')&&<FarmAnimalPurchase buildingId={object.id} kind={kind} state={state} now={now} onAction={onAction}/>}
   {kind==='plot'&&<>{crop&&cropIsRotten(crop,now)?<div className="farm-sim-feature"><FarmGoodIcon good={crop.crop} className="farm-crop-rotten farm-crop-hero"/><h3>작물이 썩었어요</h3><p>수확 가능 시간 60초가 지났어요.<br/>폐기한 뒤 새 종자를 심어주세요.</p><button className="farm-sim-primary" onClick={()=>onAction({type:'discardCrop'})}>폐기하기</button></div>:crop?<><FarmGoodIcon good={crop.crop} className="farm-crop-hero"/><JobProgress readyAt={crop.readyAt} now={now} label={`${farmCrops[crop.crop].name} 재배`} seconds={farmCrops[crop.crop].growSeconds} onCollect={()=>onAction({type:'harvest'})}/><p className="farm-sim-caption">다 자란 뒤 60초 안에 수확해주세요. 이후에는 썩어요.</p></>:<><FarmItemPicker items={cropKinds} value={selectedCrop} onChange={setSelectedCrop} label="심을 작물" owned={c=>sim.inventory[seedGood(c)]}/>{cropKinds.filter(c=>c===selectedCrop).map(cropKind=>{
    const seed=seedGood(cropKind),details=farmCrops[cropKind],locked=!sim.unlockedCrops.includes(cropKind)
    return <div className="farm-sim-crop" key={cropKind}><FarmGoodIcon good={cropKind}/><div><strong>{details.name}</strong><small>{`재배 ${details.growSeconds}초 · 한 칸 수확 ${details.yield}개`}</small></div><button aria-label={`${details.name} 심기`} disabled={locked||sim.inventory[seed]<1} onClick={()=>onAction({type:'plant',crop:cropKind})}>{`${details.name} 심기`}</button></div>
   })}</>}</>}
   {message&&<p className="farm-sim-feedback" role="status">{message}</p>}
  </div>
  {kind==='plot'&&onMove&&<div className="farm-building-store"><div className="farm-building-actions" role="group" aria-label="밭 배치 관리"><button onClick={onMove}><Move size={15}/>이동하기</button></div></div>}
  {onStore&&<BuildingStoreButton object={object} state={state} onStore={onStore} pendingPlots={pendingPlots} onMove={onMove} onFlip={onFlip} onSell={onSell}/>}
 </DialogContent></Dialog>
}

function JobProgress({readyAt,now,label,seconds,onCollect}:{readyAt:number;now:number;label:string;seconds:number;onCollect:()=>void}){
 const remaining=Math.min(seconds,Math.max(0,Math.ceil((readyAt-now)/1000))),progress=Math.min(100,Math.max(0,100-(readyAt-now)/(seconds*10)))
 return <div className="farm-sim-feature"><h3>{label}</h3><div className="farm-sim-progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:progress+'%'}}/></div><p>{remaining?`${remaining}초 남았어요.`:'완료! 생산물을 받을 수 있어요.'}</p><button className="farm-sim-primary" disabled={remaining>0} onClick={onCollect}>수령하기</button></div>
}
