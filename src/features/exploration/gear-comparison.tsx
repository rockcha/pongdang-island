import {GearAttributes,WeaponEffect} from './equipment-stats'
import type {Gear} from './practice-state'
import './exploration-usability.css'

export function GearComparison({items,equippedId,selected,onSelect}:{items:Gear[];equippedId:string;selected?:string;onSelect?:(id:string)=>void}){
 return <div className="exploration-gear-comparison" role={onSelect?'radiogroup':'group'} aria-label={onSelect?'교체할 장비':'보유 장비 능력치'}>{items.map(item=>{
  const content=<>{item.image&&<img src={item.image} alt=""/>}<div className="comparison-gear-copy"><strong>{item.name}{item.id===equippedId&&<small>장착 중</small>}</strong><GearAttributes gear={item}/><WeaponEffect gear={item}/></div></>
  return onSelect?<button key={item.id} type="button" role="radio" aria-checked={selected===item.id} onClick={()=>onSelect(item.id)}>{content}</button>:<article key={item.id}>{content}</article>
 })}</div>
}
