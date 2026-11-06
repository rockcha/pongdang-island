import {Sprout,Warehouse,PawPrint} from 'lucide-react'
import {farmLimits,farmStorageUsage} from './farm-simulation'
import {warehouseCapacity} from './building-upgrades'
import type {TopviewState} from './topview-model'

export function FarmCapacitySummary({state,clearingCount=0}:{state:TopviewState;clearingCount?:number}){
 const limits=farmLimits(state),plots=limits.usedPlots+clearingCount,stock=farmStorageUsage(state.simulation),storageLimit=warehouseCapacity(state)
 const items=[
  {name:'밭',Icon:Sprout,used:plots,limit:limits.plots,detail:`배치 ${limits.usedPlots}칸${clearingCount?` · 개간 중 ${clearingCount}칸`:''}`},
  {name:'창고',Icon:Warehouse,used:stock,limit:storageLimit,detail:'농작물·축산물·가공품 총수량 · 수확 중 예약 포함'},
  {name:'동물',Icon:PawPrint,used:limits.totalAnimals,limit:limits.animals,detail:`배치 ${limits.usedAnimals} · 보관 ${limits.storedAnimals} · 준비·수령 대기 ${limits.pendingAnimals}`},
 ]
 return <div className="farm-capacity-summary" role="group" aria-label="농장 수용 현황">{items.map(({name,Icon,used,limit,detail})=><span key={name} className="farm-capacity-item" data-full={used>=limit} role="img" aria-label={`${name} ${used} / ${limit} · ${detail}`} title={`${name} ${used} / ${limit} · ${detail}`}><Icon size={14} strokeWidth={1.7} aria-hidden="true"/><span aria-hidden="true">{name}</span><strong aria-hidden="true">{used}<i> / {limit}</i></strong></span>)}</div>
}
