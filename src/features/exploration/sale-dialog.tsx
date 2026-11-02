import {useState} from 'react'
import {Coins,Shield,Sparkles,Swords} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GearAttributes,WeaponEffect} from './equipment-stats'
import {combatMagic} from './combat-state'
import {spellManaCost,type PracticeState} from './practice-state'
import {gearSaleBlock,gearSalePrice,spellSalePrice,type RoomSaleKind} from './room-loot'
import './sale-dialog.css'

const tabs=[{id:'weapon',name:'무기',Icon:Swords},{id:'armor',name:'방어구',Icon:Shield},{id:'magic',name:'마법',Icon:Sparkles}] as const
export function SaleDialog({state,open,onOpenChange,onSell,busy=false}:{state:PracticeState;open:boolean;onOpenChange:(open:boolean)=>void;onSell:(kind:RoomSaleKind,id:string)=>void;busy?:boolean}){
 const [tab,setTab]=useState<RoomSaleKind>('weapon')
 const weapons=state.weapons.filter(item=>item.id!==state.weaponId),armor=state.armor.filter(item=>item.id!==state.armorId),spells=state.spells.filter(item=>!state.equippedSpells.includes(item.id))
 const counts={weapon:weapons.length,armor:armor.length,magic:spells.length}
 const goods=tab==='magic'?spells.map(item=>({item,gear:null,spell:item,price:spellSalePrice(item)})):(tab==='weapon'?weapons:armor).map(item=>({item,gear:item,spell:null,price:gearSalePrice(item)}))
 const Icon=tabs.find(item=>item.id===tab)!.Icon
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="exploration-modal exploration-sale-dialog"><DialogHeader><DialogTitle>망자의 거래소</DialogTitle><DialogDescription>장착하지 않은 물품을 판매합니다. 판매가는 구매가의 40%입니다.</DialogDescription></DialogHeader>
  <div className="sale-balance" aria-label="판매소 보유 골드"><Coins size={16}/>{state.gold.toLocaleString()} 골드</div>
  <div className="sale-tabs" role="tablist" aria-label="판매 물품 종류">{tabs.map(({id,name,Icon})=><button key={id} role="tab" id={`sale-tab-${id}`} aria-selected={tab===id} aria-controls="sale-items" onClick={()=>setTab(id)}><Icon size={14}/>{name}<small>{counts[id]}</small></button>)}</div>
  <div className="sale-items" role="tabpanel" id="sale-items" aria-labelledby={`sale-tab-${tab}`}>
   {!goods.length&&<p className="sale-empty">판매할 {tabs.find(item=>item.id===tab)!.name}{tab==='magic'?'이':'가'} 없습니다.<small>장착 중인 물품은 목록에 표시하지 않습니다.</small></p>}
   {goods.map(({item,gear,spell,price})=><article key={item.id}>{item.image?<img src={item.image} alt=""/>:<Icon size={26}/>}<div className="sale-item-copy"><h3>{item.name}</h3>{gear?<><GearAttributes gear={gear}/><WeaponEffect gear={gear} compact/></>:spell&&<><small>마나 {spellManaCost(state,spell)} 소모</small><p>{combatMagic[spell.id as keyof typeof combatMagic]??spell.description}</p></>}</div><div className="sale-item-action"><span><Coins size={12}/>{price.toLocaleString()}</span><button aria-label={`${item.name} 판매`} disabled={busy||!!gearSaleBlock(state,tab,item.id)} onClick={()=>onSell(tab,item.id)}>판매</button></div></article>)}
  </div>
  <button className="exploration-modal-return" onClick={()=>onOpenChange(false)}>닫기</button>
 </DialogContent></Dialog>
}
