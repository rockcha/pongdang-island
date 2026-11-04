import {useState} from 'react'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {farmGoods,storedFarmGoods,WAREHOUSE_CAPACITY,type FarmSimulation,type FarmSimAction} from './farm-simulation'
import {processedGoods} from './food-catalog'
import {FarmGoodIcon} from './farm-good-icon'
import type {TopviewObject,TopviewState} from './topview-model'
import {warehouseCapacity} from './building-upgrades'
import {BuildingUpgradePanel} from './building-upgrade-panel'
import {BuildingStoreButton} from './building-store-button'
import {BuildingInfo} from './building-info'

export function FarmWarehouse({simulation,state,object,now=Date.now(),onAction,onClose,onStore,onNavigate,onMove}:{simulation:FarmSimulation;state?:TopviewState;object?:TopviewObject;now?:number;onAction?:(action:FarmSimAction)=>void;onClose:()=>void;onStore?:()=>void;onNavigate?:(kind:'store'|'processed'|'mill'|'dairy'|'bakery')=>void;onMove?:()=>void}){
 const [tab,setTab]=useState<'raw'|'animal'|'processed'>('raw'),[expanded,setExpanded]=useState(false),[selectedGood,setSelectedGood]=useState<typeof all[number]|null>(null),all=storedFarmGoods(simulation.inventory)
 const capacity=state?warehouseCapacity(state):WAREHOUSE_CAPACITY,locked=!!object&&!!simulation.upgradeJobs[object.id]
 const goods=all.filter(good=>tab==='animal'?good==='egg'||good==='milk':tab==='processed'?processedGoods.includes(good as typeof processedGoods[number]):good!=='egg'&&good!=='milk'&&!processedGoods.includes(good as typeof processedGoods[number]))
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="farm-sim-dialog farm-compact-dialog farm-warehouse"><DialogHeader className="farm-compact-header"><DialogTitle>창고 <small>{locked?'업그레이드 중':`${all.length} / ${capacity}칸`}</small></DialogTitle><DialogDescription>같은 품목은 수량에 관계없이 1칸을 사용해요.</DialogDescription></DialogHeader>
  {object&&state&&<BuildingInfo object={object} state={state}/>}
  {object&&state&&onAction&&<><button className="farm-warehouse-expand" aria-expanded={expanded||locked} onClick={()=>setExpanded(!expanded)}>창고 확장 <span>{all.length}종 / {capacity}칸</span></button>{(expanded||locked)&&<><BuildingUpgradePanel object={object} state={state} now={now} onAction={onAction}/>{!locked&&<p className="farm-upgrade-warning">확장하는 동안 수확·생산물 수령을 할 수 없어요.</p>}</>}</>}
  {!locked&&capacity>0&&<>
  <div className="farm-warehouse-tabs"><button aria-pressed={tab==='raw'} onClick={()=>setTab('raw')}>농작물</button><button aria-pressed={tab==='animal'} onClick={()=>setTab('animal')}>축산물</button><button aria-pressed={tab==='processed'} onClick={()=>setTab('processed')}>가공품</button></div>
  <div className="farm-warehouse-grid">{goods.map(good=><button key={good} className="farm-warehouse-slot" aria-pressed={selectedGood===good} onClick={()=>setSelectedGood(selectedGood===good?null:good)}><FarmGoodIcon good={good}/><span>{farmGoods[good].name}</span><strong>×{simulation.inventory[good]}</strong></button>)}</div>{!goods.length&&<div className="farm-empty-state"><p>아직 보관한 생산물이 없어요</p></div>}{selectedGood&&goods.includes(selectedGood)&&onNavigate&&<div className="farm-warehouse-links"><strong>{farmGoods[selectedGood].name}</strong><button onClick={()=>onNavigate(processedGoods.includes(selectedGood as typeof processedGoods[number])?'processed':'store')}>판매소로 →</button>{['wheat','milk','egg'].includes(selectedGood)&&<button onClick={()=>onNavigate(selectedGood==='wheat'?'mill':selectedGood==='milk'?'dairy':'bakery')}>가공소로 →</button>}</div>}</>}
  {!locked&&!capacity&&<p className="farm-sim-caption">꾸미기에서 창고를 먼저 배치해주세요.</p>}
  {object&&state&&onStore&&<BuildingStoreButton object={object} state={state} onStore={onStore} onMove={onMove}/>}
 </DialogContent></Dialog>
}
