import {animalGoods} from './animal-catalog'
import {useState} from 'react'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {farmGoods,storedFarmGoods,farmStorageUsage,harvestReservedQuantity,WAREHOUSE_CAPACITY,type FarmSimulation,type FarmSimAction} from './farm-simulation'
import {processedGoods,isFinishedFood} from './food-catalog'
import {FarmGoodIcon} from './farm-good-icon'
import {type TopviewObject,type TopviewState} from './topview-model'
import {warehouseCapacity} from './building-upgrades'
import {BuildingUpgradePanel} from './building-upgrade-panel'
import {BuildingStoreButton} from './building-store-button'
import {farmBuildingSubtitle} from './building-subtitle'
import './facility-dialog.css'
import {TopviewArt} from './topview-art'

export function FarmWarehouse({simulation,state,object,now=Date.now(),onAction,onClose,onStore,onMove,onFlip}:{simulation:FarmSimulation;state?:TopviewState;object?:TopviewObject;now?:number;onAction?:(action:FarmSimAction)=>void;onClose:()=>void;onStore?:()=>void;onMove?:()=>void;onFlip?:()=>void}){
 const [tab,setTab]=useState<'raw'|'animal'|'processed'>('raw'),[expanded,setExpanded]=useState(false),[selectedGood,setSelectedGood]=useState<typeof all[number]|null>(null),all=storedFarmGoods(simulation.inventory)
 const used=farmStorageUsage(simulation),reserved=harvestReservedQuantity(simulation),capacity=state?warehouseCapacity(state):WAREHOUSE_CAPACITY,locked=!!object&&!!simulation.upgradeJobs[object.id]
 const goods=all.filter(good=>tab==='animal'?animalGoods.some(item=>item===good):tab==='processed'?processedGoods.includes(good as typeof processedGoods[number]):!animalGoods.some(item=>item===good)&&!processedGoods.includes(good as typeof processedGoods[number]))
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="farm-sim-dialog farm-compact-dialog farm-facility-dialog farm-warehouse"><DialogHeader className="farm-compact-header">{object&&<div className="farm-sim-title-art"><TopviewArt kind={object.kind} flipped={object.flipped}/></div>}<DialogTitle>창고 <small>{locked?'업그레이드 중':`${used} / ${capacity}개`}</small></DialogTitle><DialogDescription className="farm-building-subtitle">{farmBuildingSubtitle('warehouse')}</DialogDescription></DialogHeader>
  <div className="farm-sim-body">
  {object&&state&&onAction&&<><button className="farm-warehouse-expand" aria-expanded={expanded||locked} onClick={()=>setExpanded(!expanded)}>창고 확장 <span>{used}개 / {capacity}개</span></button>{(expanded||locked)&&<><BuildingUpgradePanel object={object} state={state} now={now} onAction={onAction}/>{!locked&&<p className="farm-upgrade-warning">확장하는 동안 수확·생산물 수령을 할 수 없어요.</p>}</>}</>}
  {!locked&&reserved>0&&<p className="farm-sim-caption">수확 중 {reserved}개 포함 · 모든 생산물의 총수량으로 계산해요.</p>}
  {!locked&&capacity>0&&<>
  <div className="farm-warehouse-tabs"><button aria-pressed={tab==='raw'} onClick={()=>setTab('raw')}>농작물</button><button aria-pressed={tab==='animal'} onClick={()=>setTab('animal')}>축산물</button><button aria-pressed={tab==='processed'} onClick={()=>setTab('processed')}>가공품</button></div>
  <div className="farm-warehouse-grid">{goods.map(good=><button key={good} className="farm-warehouse-slot" aria-pressed={selectedGood===good} onClick={()=>setSelectedGood(selectedGood===good?null:good)}><FarmGoodIcon good={good}/><span>{farmGoods[good].name}</span><strong>×{simulation.inventory[good]}</strong></button>)}</div>{!goods.length&&<div className="farm-empty-state"><p>아직 보관한 생산물이 없어요</p></div>}{selectedGood&&goods.includes(selectedGood)&&<div className="farm-warehouse-links"><strong>{farmGoods[selectedGood].name}</strong><small>{isFinishedFood(selectedGood)?'요리 납품소에 납품할 수 있어요.':selectedGood==='wool'?'양털의 활용처는 준비 중이에요.':'요리를 만드는 재료예요.'}</small></div>}</>}
  {!locked&&!capacity&&<p className="farm-sim-caption">꾸미기에서 창고를 먼저 배치해주세요.</p>}
  </div>
  {object&&state&&onStore&&<BuildingStoreButton object={object} state={state} onStore={onStore} onMove={onMove} onFlip={onFlip}/>}
 </DialogContent></Dialog>
}
