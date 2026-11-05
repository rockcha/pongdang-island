import {canDeliver,type MerchantOrder} from './api'

// Each copy can fulfill only one order, even when several rows show it in stock.
export function merchantDeliveryPlan(orders:readonly MerchantOrder[]){
 const stock=new Map<string,number>()
 for(const order of orders)for(const item of order.items)stock.set(item.speciesId,Math.min(stock.get(item.speciesId)??item.owned,item.owned))
 return [...orders].sort((a,b)=>a.number-b.number).filter(order=>{
  if(!canDeliver(order)||order.items.some(item=>(stock.get(item.speciesId)??0)<item.quantity))return false
  for(const item of order.items)stock.set(item.speciesId,stock.get(item.speciesId)!-item.quantity)
  return true
 })
}
