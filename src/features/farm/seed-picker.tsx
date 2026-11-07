import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {cropKinds,farmCrops,seedGood,type CropKind} from './crop-catalog'
import type {FarmSimulation} from './farm-simulation'
import {FarmGoodIcon} from './farm-good-icon'

export function FarmSeedPicker({open,simulation,onClose,onSelect}:{open:boolean;simulation:FarmSimulation;onClose:()=>void;onSelect:(crop:CropKind)=>void}){
 return <Dialog open={open} onOpenChange={next=>{if(!next)onClose()}}><DialogContent className="farm-sim-dialog farm-seed-picker"><DialogHeader><DialogTitle>씨앗 심기</DialogTitle><DialogDescription>종자를 고른 뒤 빈 밭을 누르거나 드래그해 연속으로 심어요. 빈 곳을 드래그하면 지도를 이동해요.</DialogDescription></DialogHeader>
  <div className="farm-seed-grid">{cropKinds.filter(crop=>simulation.unlockedCrops.includes(crop)).map(crop=>{
   const count=simulation.inventory[seedGood(crop)]
   return <button key={crop} aria-label={`${farmCrops[crop].name} ${count}개`} disabled={!count} onClick={()=>onSelect(crop)}><FarmGoodIcon good={seedGood(crop)}/><span className="farm-seed-details"><strong>{farmCrops[crop].name} 종자</strong><span className="farm-seed-stock" data-empty={!count}>보유 {count.toLocaleString()}개</span><small>한 칸 수확 {farmCrops[crop].yield}개</small>{!count&&<small>상점에서 구매할 수 있어요</small>}</span></button>
  })}</div>
 </DialogContent></Dialog>
}
