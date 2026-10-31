import {useEffect,useState} from 'react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GearAttributes} from './equipment-stats'
import type {PracticeState} from './practice-state'
import {lootDiscoveryText,type RoomLoot} from './room-loot'
export function LootDialog({loot,state,onClaim}:{loot:RoomLoot|null;state:PracticeState;onClaim:(replaceId?:string)=>void}){
 const [replaceId,setReplaceId]=useState('')
 useEffect(()=>setReplaceId(''),[loot])
 const inventory=loot?.kind==='weapon'?state.weapons:state.armor,full=!!loot&&loot.kind!=='potion'&&inventory.length>=3
 const validReplacement=inventory.some(item=>item.id===replaceId)
 return <Dialog open={!!loot} onOpenChange={()=>{}}><DialogContent showCloseButton={false} className="exploration-modal exploration-selection-modal exploration-loot-dialog"><DialogHeader><span className="exploration-modal-eyebrow">DISCOVERY</span><DialogTitle>아이템 발견</DialogTitle><DialogDescription>{loot?lootDiscoveryText(loot,()=>0)+' ':''}{full?'보관함이 가득 찼어요. 교체할 장비를 선택한 뒤 새 물품을 넣으세요.':'발견한 물품을 보관함에 넣으세요.'}</DialogDescription></DialogHeader>{loot&&<><div className="exploration-found-item">{loot.image&&<img src={loot.image} alt=""/>}<h3>{loot.name}{loot.kind==='potion'?' ×1':''}</h3>{loot.kind!=='potion'&&<GearAttributes gear={loot.gear}/>}</div>{full&&<label className="exploration-loot-replacement">교체할 장비<select aria-label="교체할 장비" value={validReplacement?replaceId:''} onChange={event=>setReplaceId(event.target.value)}><option value="" disabled>교체할 장비를 선택하세요</option>{inventory.map(item=><option key={item.id} value={item.id}>{item.name}{item.id===state.weaponId||item.id===state.armorId?' · 장착 중':''}</option>)}</select></label>}<button className="exploration-choice-confirm" disabled={full&&!validReplacement} onClick={()=>onClaim(full?replaceId:undefined)}>보관함에 넣기</button></>}</DialogContent></Dialog>
}
