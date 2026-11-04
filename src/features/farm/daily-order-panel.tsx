import {dailyFarmOrders,farmOrderDay,farmOrderKey} from './daily-orders'
import {farmGoods,type FarmSimulation,type FarmSimAction} from './farm-simulation'
import {FarmGoodIcon} from './farm-good-icon'
import type {TopviewObject} from './topview-model'

export function DailyOrderPanel({object,simulation,now,onAction}:{object:TopviewObject;simulation:FarmSimulation;now:number;onAction:(action:FarmSimAction)=>void}){
 const orders=dailyFarmOrders(object,now),delivered=simulation.orderDeliveries[farmOrderKey(object,now)]??{},day=farmOrderDay(now)
 return <section className="farm-daily-orders" aria-label="오늘의 주문"><header><strong>오늘의 주문</strong><small>매일 00:00 갱신 · 한국 시간</small></header><div>{orders.map(order=>{
  const item=farmGoods[order.good],done=delivered[order.good]??0,remaining=Math.max(0,order.quantity-done),owned=simulation.inventory[order.good],quantity=Math.min(owned,remaining)
  return <article key={order.good} data-order-good={order.good} data-order-complete={remaining===0}><FarmGoodIcon good={order.good}/><div><strong>{item.name}<small>{done} / {order.quantity}개</small></strong><span>보유 {owned}개 · 개당 {item.price} G</span><div className="farm-order-progress"><i style={{width:`${done/order.quantity*100}%`}}/></div></div><button aria-label={remaining===0?`${item.name} 주문 완료`:`${item.name} ${quantity}개 납품`} disabled={!quantity} onClick={()=>onAction({type:'sell',good:order.good,quantity,orderDay:day})}>{remaining===0?'완료':quantity?`${quantity}개 납품`:'재고 부족'}</button></article>
 })}</div><p>판매소마다 별도의 주문을 받아요. 필요한 만큼 나누어 납품할 수 있어요.</p></section>
}
