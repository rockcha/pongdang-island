import {FarmGold} from './farm-gold'
import {useState} from 'react'
import {farmOwnedCount,farmPurchaseLimit} from './farm-simulation'
import {topviewItems,type FarmTool,type TopviewState} from './topview-model'

export function FarmShopItemPurchase({kind,state,onBuy}:{kind:FarmTool;state:TopviewState;onBuy:(kind:FarmTool,quantity:number)=>void}){
 const [quantity,setQuantity]=useState(1),item=topviewItems[kind],limit=farmPurchaseLimit(kind)-farmOwnedCount(state,kind),max=Math.max(0,Math.min(1000,limit,Math.floor(state.gold/item.price))),amount=Math.min(Math.max(1,quantity),Math.max(1,max)),cost=amount*item.price
 if(limit<=0)return <span className="farm-shop-owned">보유 중</span>
 return <>{limit>1&&<div className="farm-shop-item-quantity"><button aria-label={`${item.name} 구매 수량 줄이기`} disabled={amount<=1} onClick={()=>setQuantity(amount-1)}>−</button><input aria-label={`${item.name} 구매 수량`} type="number" inputMode="numeric" min={1} max={Math.max(1,max)} value={amount} disabled={!max} onChange={event=>setQuantity(Math.min(Math.max(1,max),Math.max(1,Math.floor(Number(event.target.value)||1))))}/><button aria-label={`${item.name} 구매 수량 늘리기`} disabled={amount>=max} onClick={()=>setQuantity(amount+1)}>+</button></div>}<button className="farm-shop-card-buy" aria-label={amount===1?`${item.name} 구매 · ${item.price} G`:`${item.name} ${amount}개 구매 · ${cost.toLocaleString()} G`} disabled={!max} onClick={()=>onBuy(kind,amount)}><span>{amount===1?'구매':`${amount}개 구매`}</span><strong><FarmGold amount={cost.toLocaleString()}/></strong></button></>
}
