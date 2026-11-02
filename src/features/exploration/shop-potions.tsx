import {merchantPotions,potionRecoveryAmount,purchaseBlock,type PracticeState} from './practice-state'

export function ShopPotions({state,onBuy,busy=false}:{state:PracticeState;onBuy:(id:string)=>void;busy?:boolean}){
 return <>{merchantPotions.map(potion=>{
  const blocked=purchaseBlock(state,potion.id)
  return <article key={potion.id}><img className="exploration-shop-weapon" src={potion.image} alt=""/><div><h3>{potion.name}</h3><p>{potion.kind==='health'?'체력':'마나'} {potionRecoveryAmount(state,potion.kind)} 회복 · 보유 {state.potions[potion.kind]}개</p><small>{potion.price.toLocaleString()} 골드</small></div><button aria-label={`${potion.name} 구매`} disabled={busy||!!blocked} onClick={()=>onBuy(potion.id)}>{blocked??'구매'}</button></article>
 })}</>
}
