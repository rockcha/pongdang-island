import {FarmGold} from './farm-gold'
import {dailyFarmOrders,farmOrderDay,farmOrderKey} from './daily-orders'
import {farmGoods,type FarmSimulation,type FarmSimAction} from './farm-simulation'
import {FarmGoodIcon} from './farm-good-icon'
import type {TopviewObject,TopviewState} from './topview-model'

export function DailyOrderPanel({object,state,simulation,now,onAction}:{object:TopviewObject;state:TopviewState;simulation:FarmSimulation;now:number;onAction:(action:FarmSimAction)=>void}){
 const orders=dailyFarmOrders(object,now,state),delivered=simulation.orderDeliveries[farmOrderKey(object,now)]??{},day=farmOrderDay(now)
 return <section className="farm-daily-orders" aria-label="오늘의 주문"><header><strong>오늘의 주문</strong><small>매일 00:00 갱신 · 한국 시간</small></header>{!orders.length&&<p>아직 생산할 수 있는 주문 상품이 없어요. 작물을 연구하고 생산 시설을 배치해주세요.</p>}<div>{orders.map(order=>{
  const item=farmGoods[order.good],done=delivered[order.good]??0,remaining=Math.max(0,order.quantity-done),owned=simulation.inventory[order.good],quantity=Math.min(owned,remaining)
  return <article key={order.good} data-order-good={order.good} data-order-complete={remaining===0}><FarmGoodIcon good={order.good}/><div><strong>{item.name}<small>{done} / {order.quantity}개</small></strong><span>보유 {owned}개 · 개당 <FarmGold amount={item.price}/></span><div className="farm-order-progress"><i style={{width:`${done/order.quantity*100}%`}}/></div></div><button aria-label={remaining===0?`${item.name} 주문 완료`:`${item.name} ${quantity}개 납품`} disabled={!quantity} onClick={()=>onAction({type:'sell',good:order.good,quantity,orderDay:day})}>{remaining===0?'완료':quantity?`${quantity}개 납품`:'재고 부족'}</button></article>
 })}</div><p>{object.kind==='processed'?'완성된 음식만 최대 5종 주문받아요. 가공 재료는 음식 제작에 사용해주세요.':'생산 가능한 상품을 최대 5종 주문받아요. 필요한 만큼 나누어 납품할 수 있어요.'}</p></section>
}
