import {useFarmQuantity} from './use-farm-quantity'
import './product-categories.css'
import {FarmGold} from './farm-gold'
import {useState} from 'react'
import {Check} from 'lucide-react'
import {deliverableGoods,primaryGoods,isPrimaryGood,finishedFoods,finishedHouseholdGoods,isFinishedFood,type DeliverableGood} from './food-catalog'
import {farmGoods,type FarmSimAction} from './farm-simulation'
import {warehouseAvailable} from './building-upgrades'
import {FarmGoodIcon} from './farm-good-icon'
import type {TopviewState} from './topview-model'
import './food-sale-panel.css'

const goodsByPrice=[...deliverableGoods].sort((a,b)=>farmGoods[a].price-farmGoods[b].price||farmGoods[a].name.localeCompare(farmGoods[b].name,'ko'))

export function FoodSalePanel({state,onAction}:{state:TopviewState;onAction:(action:FarmSimAction)=>void}){
 const [ownedOnly,setOwnedOnly]=useState(true),[selected,setSelected]=useState<Partial<Record<DeliverableGood,number>>>({}),[editing,setEditing]=useState<DeliverableGood|null>(null)
 const {setQuantity:setEditedQuantity,quantityInput,quantityValid}=useFarmQuantity(1)
 const inputReady=editing===null||!(selected[editing]??0)||quantityValid
 function updateQuantity(id:DeliverableGood,count:number){setEditedQuantity(count);setSelected(old=>({...old,[id]:count}))}
 const [category,setCategory]=useState<'primary'|'food'|'household'>(()=>finishedFoods.some(id=>state.simulation.inventory[id]>0)?'food':finishedHouseholdGoods.some(id=>state.simulation.inventory[id]>0)?'household':primaryGoods.some(id=>state.simulation.inventory[id]>0)?'primary':'food')
 const inventory=state.simulation.inventory,goods=goodsByPrice.filter(id=>category==='primary'?isPrimaryGood(id):category==='food'?isFinishedFood(id):finishedHouseholdGoods.some(good=>good===id)),available=goods.filter(id=>inventory[id]>0),visible=ownedOnly?available:goods
 const items=deliverableGoods.flatMap(good=>{const quantity=Math.min(inventory[good],selected[good]??0);return quantity>0?[{good,quantity}]:[]})
 const quantity=items.reduce((sum,item)=>sum+item.quantity,0),total=items.reduce((sum,item)=>sum+item.quantity*farmGoods[item.good].price,0)
 const all=available.length>0&&available.every(id=>(selected[id]??0)===inventory[id])
 return <section className="farm-food-sale" aria-label="상품 판매">
  <nav className="farm-product-categories" aria-label="납품 상품 분류"><button aria-pressed={category==='primary'} onClick={()=>setCategory('primary')}>1차 생산물</button><button aria-pressed={category==='food'} onClick={()=>setCategory('food')}>식품</button><button aria-pressed={category==='household'} onClick={()=>setCategory('household')}>생활용품</button></nav>
  {category==='primary'&&<p className="farm-sim-caption">여분은 바로 팔고, 재료는 남겨두세요. 식품·생활용품으로 만들면 더 높은 값에 판매할 수 있어요.</p>}
  <div className="farm-food-filters"><label><input type="checkbox" checked={ownedOnly} onChange={e=>setOwnedOnly(e.target.checked)}/>보유한 상품만 <span>{available.length}</span></label><button disabled={!available.length} onClick={()=>setSelected(previous=>{const next={...previous};for(const id of available){if(all)delete next[id];else next[id]=inventory[id]}return next})}>{all?'선택 해제':'전체 선택'}</button></div>
  <div className="farm-food-grid">
   {!visible.length&&<p className="farm-food-empty">보유한 상품이 없어요.<br/>필터를 끄면 판매할 수 있는 상품을 볼 수 있어요.</p>}
   {visible.map(id=>{const item=farmGoods[id],owned=inventory[id],count=Math.min(owned,selected[id]??0);return <article key={id} className="farm-food-card" data-selected={count>0} data-empty={!owned}>
    <button className="farm-food-select" aria-label={`${item.name} 선택`} aria-pressed={count>0} disabled={!owned} onClick={()=>{setSelected(old=>({...old,[id]:count?0:owned}));setEditing(null)}}>
     <span className="farm-food-check">{count>0&&<Check size={13}/>}</span><FarmGoodIcon good={id}/><strong>{item.name}</strong><span className="farm-food-owned">보유 <b>{owned.toLocaleString()}</b>개</span><small><FarmGold amount={item.price.toLocaleString()}/> / 개</small>
    </button>
    {count>0&&<div className="farm-food-quantity">{editing===id?<><button aria-label={`${item.name} 수량 줄이기`} onClick={()=>updateQuantity(id,Math.max(1,count-1))}>−</button><input autoFocus {...quantityInput(owned,next=>setSelected(old=>({...old,[id]:next})))} aria-label={`${item.name} 판매 수량`} /><button aria-label={`${item.name} 수량 늘리기`} disabled={count>=owned} onClick={()=>updateQuantity(id,count+1)}>+</button></>:<button onClick={()=>{setEditedQuantity(count);setEditing(id)}} aria-label={`${item.name} 수량 변경`}>{count.toLocaleString()}개 판매 ▾</button>}</div>}
   </article>})}
  </div>
  <footer className="farm-food-summary"><div><span>선택 {items.length}종 · {quantity.toLocaleString()}개</span><strong><FarmGold amount={inputReady?total.toLocaleString():'—'}/></strong></div><button className="farm-sim-primary" disabled={!inputReady||!items.length||!warehouseAvailable(state)} onClick={()=>{onAction({type:'marketSellBatch',items});setSelected({});setEditing(null)}}>{!inputReady?'수량을 입력해주세요':!warehouseAvailable(state)?'창고 이용 가능 후 판매':items.length?<><FarmGold amount={total}/>에 판매</>:'판매할 상품을 선택하세요'}</button></footer>
 </section>
}
