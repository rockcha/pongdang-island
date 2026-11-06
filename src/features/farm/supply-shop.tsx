import {useState} from 'react'
import {farmSupplies,farmSupplyKinds,type FarmSupply} from './supply-catalog'
import type {FarmSimAction} from './farm-simulation'
import type {TopviewState} from './topview-model'
import {FarmItemPicker} from './item-picker'
import {FarmGoodIcon} from './farm-good-icon'

export function FarmSupplyShop({state,onAction}:{state:TopviewState;onAction:(action:FarmSimAction)=>void}){
 const [supply,setSupply]=useState<FarmSupply>('fertilizer'),[quantity,setQuantity]=useState(1),item=farmSupplies[supply]
 const max=Math.min(1000,Math.floor(state.gold/item.price)),amount=Math.min(Math.max(1,quantity),Math.max(1,max))
 return <section className="farm-supply-shop">
  <FarmItemPicker items={farmSupplyKinds} value={supply} onChange={value=>{setSupply(value);setQuantity(1)}} label="구매할 비료" owned={good=>state.simulation.inventory[good]}/>
  <div className="farm-sim-item"><FarmGoodIcon good={supply}/><div><strong>{item.name}</strong><small>보유 {state.simulation.inventory[supply]}개 · 개당 {item.price} G</small></div></div>
  <p className="farm-sim-caption">{item.description}{supply==='fertilizer'?' · 작물마다 한 번 사용':''}</p>
  <div className="farm-market-quantity"><button aria-label="비료 구매 수량 줄이기" disabled={amount<=1||!max} onClick={()=>setQuantity(amount-1)}>−</button><input type="number" aria-label="비료 구매 수량" min={1} max={Math.max(1,max)} value={amount} disabled={!max} onChange={event=>setQuantity(Math.min(max,Math.max(1,Math.floor(Number(event.target.value)||1))))}/><button aria-label="비료 구매 수량 늘리기" disabled={amount>=max||!max} onClick={()=>setQuantity(amount+1)}>＋</button><button disabled={!max} onClick={()=>setQuantity(max)}>전체</button></div>
  <button className="farm-sim-primary" aria-label={`${item.name} 구매`} disabled={!max} onClick={()=>onAction({type:'buySupply',supply,quantity:amount})}>구매 · {(amount*item.price).toLocaleString()} G</button>
  <p className="farm-sim-caption">농사 메뉴에서 비료를 선택한 뒤 자라고 있는 밭을 눌러주세요.</p>
 </section>
}
