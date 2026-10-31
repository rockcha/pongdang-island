import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GearAttributes,WeaponEffect} from './equipment-stats'
import {lootDiscoveryText,type RoomLoot} from './room-loot'
export function LootDialog({loot,onClaim}:{loot:RoomLoot|null;onClaim:()=>void}){
 return <Dialog open={!!loot} onOpenChange={()=>{}}><DialogContent showCloseButton={false} className="exploration-modal exploration-selection-modal exploration-loot-dialog">
  <DialogHeader><DialogTitle>아이템 발견</DialogTitle><DialogDescription>{loot?lootDiscoveryText(loot,()=>0)+' ':''}발견한 물품을 보관함에 넣으세요.</DialogDescription></DialogHeader>
  {loot&&<><div className="exploration-found-item">{loot.image&&<img src={loot.image} alt=""/>}<h3>{loot.name}{loot.kind==='potion'?' ×1':''}</h3>{loot.kind!=='potion'&&<><GearAttributes gear={loot.gear}/><WeaponEffect gear={loot.gear}/></>}</div>
   <button className="exploration-choice-confirm" onClick={()=>onClaim()}>보관함에 넣기</button>
  </>}
 </DialogContent></Dialog>
}
