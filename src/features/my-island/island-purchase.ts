import {buyItem,buyLand,buyFloor,type FloorKind,type IslandState} from './island-model'
export type IslandPurchase={kind:'land'}|{kind:'floor';type:FloorKind}|{kind:'item';type:string}
// Apply a whole quantity or nothing; the caller saves one history entry.
export function buyIslandBatch(state:IslandState,purchase:IslandPurchase,quantity:number,makeId:(type:string)=>string){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100)return null
 let next=state
 for(let i=0;i<quantity;i++){
  const result=purchase.kind==='land'?buyLand(next):purchase.kind==='floor'?buyFloor(next,purchase.type):buyItem(next,purchase.type,makeId(purchase.type))
  if(!result)return null
  next=result
 }
 return next
}
