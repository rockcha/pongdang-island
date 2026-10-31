import {useEffect,useState} from 'react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GearAttributes,WeaponEffect} from './equipment-stats'
import {GearComparison} from './gear-comparison'
import type {PracticeState} from './practice-state'
import {lootDiscoveryText,type RoomLoot} from './room-loot'
export function LootDialog({loot,state,onClaim,onDecline}:{loot:RoomLoot|null;state:PracticeState;onClaim:(replaceId?:string)=>void;onDecline?:()=>void}){
 const [replaceId,setReplaceId]=useState('')
 useEffect(()=>setReplaceId(''),[loot])
 const inventory=loot?.kind==='weapon'?state.weapons:state.armor,full=!!loot&&loot.kind!=='potion'&&inventory.length>=3
 const validReplacement=inventory.some(item=>item.id===replaceId)
 return <Dialog open={!!loot} onOpenChange={()=>{}}><DialogContent showCloseButton={false} className="exploration-modal exploration-selection-modal exploration-loot-dialog">
  <DialogHeader><DialogTitle>아이템 발견</DialogTitle><DialogDescription>{loot?lootDiscoveryText(loot,()=>0)+' ':''}{full?'보관함이 가득 찼어요. 능력치를 비교하고 기존 장비를 교체하거나, 새 장비를 두고 갈 수 있어요.':'발견한 물품을 보관함에 넣으세요.'}</DialogDescription></DialogHeader>
  {loot&&<><div className="exploration-found-item">{loot.image&&<img src={loot.image} alt=""/>}<h3>{loot.name}{loot.kind==='potion'?' ×1':''}</h3>{loot.kind!=='potion'&&<><GearAttributes gear={loot.gear}/><WeaponEffect gear={loot.gear}/></>}</div>
   {full&&<GearComparison items={inventory} equippedId={loot.kind==='weapon'?state.weaponId:state.armorId} selected={replaceId} onSelect={setReplaceId}/>}
   <button className="exploration-choice-confirm" disabled={full&&!validReplacement} onClick={()=>onClaim(full?replaceId:undefined)}>{full?'교체해서 보관':'보관함에 넣기'}</button>
   {full&&onDecline&&<button className="exploration-modal-return" onClick={onDecline}>두고 가기</button>}
  </>}
 </DialogContent></Dialog>
}
