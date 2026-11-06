import {farmDuration} from './farm-duration'
import {FarmGold} from './farm-gold'
import {useState} from 'react'
import {cropKinds,farmCrops,seedGood} from './crop-catalog'
import {farmGoods,type FarmGood,type FarmSimAction} from './farm-simulation'
import {warehouseAvailable} from './building-upgrades'
import {FarmItemPicker} from './item-picker'
import {FarmGoodIcon} from './farm-good-icon'
import type {TopviewState} from './topview-model'
import {deliverableGoods} from './food-catalog'
import './market-panel.css'
import './product-display.css'

export function FarmTradePanel({kind,state,onAction,lastPurchasedSeed='wheat'}:{kind:'seedShop'|'store';state:TopviewState;onAction:(action:FarmSimAction)=>void;lastPurchasedSeed?:typeof cropKinds[number]}){
 const buying=kind==='seedShop'
 const [choice,setChoice]=useState<FarmGood|undefined>(buying?seedGood(lastPurchasedSeed):undefined)
 const items:FarmGood[]=buying?cropKinds.map(seedGood):[...deliverableGoods].sort((a,b)=>farmGoods[a].price-farmGoods[b].price)
 const selected=choice&&items.includes(choice)?choice:items.find(id=>state.simulation.inventory[id]>0)??items[0]
 const crop=buying?cropKinds.find(c=>seedGood(c)===selected):undefined,locked=!!crop&&!state.simulation.unlockedCrops.includes(crop)
 return <section className="farm-market">
  <FarmItemPicker items={items} value={selected} onChange={setChoice} label={buying?'구매할 종자':'납품할 상품'} owned={id=>state.simulation.inventory[id]} isLocked={id=>buying&&!state.simulation.unlockedCrops.some(c=>seedGood(c)===id)}/>
  <MarketTrade key={kind+selected} good={selected} buying={buying} locked={locked} state={state} onAction={action=>{setChoice(selected);onAction(action)}}/>
 </section>
}
function MarketTrade({good,buying,locked,state,onAction}:{good:FarmGood;buying:boolean;locked:boolean;state:TopviewState;onAction:(action:FarmSimAction)=>void}){
 const [quantity,setQuantity]=useState(1),item=farmGoods[good],owned=state.simulation.inventory[good]
 const max=buying?Math.min(1000,Math.floor(state.gold/item.price)):owned,amount=Math.min(Math.max(1,quantity),Math.max(1,max)),total=amount*item.price
 const available=!locked&&max>0&&(buying||warehouseAvailable(state))
 const crop=buying?cropKinds.find(c=>seedGood(c)===good):undefined
 return <article className="farm-market-trade" aria-label={`${item.name} ${buying?'구매':'납품'}`}>
  <div className="farm-sim-item farm-market-product"><FarmGoodIcon good={good}/><div><strong>{item.name}</strong><small>보유 <b>{owned.toLocaleString()}</b>개</small></div></div>
  <dl className="farm-product-facts"><div><dt>{buying?'개당 가격':'개당 납품가'}</dt><dd><FarmGold amount={item.price}/></dd></div>{crop&&<><div><dt>재배 시간</dt><dd>{farmDuration(farmCrops[crop].growSeconds)}</dd></div><div><dt>한 칸 수확</dt><dd>{farmCrops[crop].yield}<small>개</small></dd></div></>}</dl>
  <div className="farm-market-order-heading"><span>{buying?'구매':'납품'} 수량</span><small>{buying?<>보유 골드 <FarmGold amount={state.gold}/></>:`납품 가능 ${owned.toLocaleString()}개`}</small></div>
  <div className="farm-market-quantity"><button aria-label="거래 수량 줄이기" disabled={!available||amount<=1} onClick={()=>setQuantity(amount-1)}>−</button><input aria-label="거래 수량" type="number" min={1} max={Math.max(1,max)} value={amount} disabled={!available} onChange={event=>setQuantity(Math.max(1,Math.min(max,Math.floor(Number(event.target.value)||1))))}/><button aria-label="거래 수량 늘리기" disabled={!available||amount>=max} onClick={()=>setQuantity(amount+1)}>＋</button><button disabled={!available} onClick={()=>setQuantity(max)}>전체</button></div>
  <button className="farm-sim-primary" disabled={!available} aria-label={`${item.name} ${buying?'구매':'납품'}`} onClick={()=>onAction(buying?{type:'seed',good:good as ReturnType<typeof seedGood>,quantity:amount}:{type:'marketSell',good,quantity:amount})}>{locked?'종자 연구가 필요해요':!max?buying?'골드 부족':'납품할 상품이 없어요':<>{buying?'구매':'납품'} · <FarmGold amount={(buying?'':'+ ')+total.toLocaleString()}/></>}</button>
 </article>
}
