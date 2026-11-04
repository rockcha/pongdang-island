import {farmCanPurchase} from './farm-simulation'
import {cellKey,objectAt,topviewItems,type FarmTool,type TopviewState} from './topview-model'
import type {LandCell,LandTool} from './land-tools'

export const dirtTile={id:'dirt',name:'흙길',price:10} as const
export function buyFarmItem(state:TopviewState,kind:FarmTool):TopviewState{
 const item=topviewItems[kind]
 if(item.group==='동물'||kind==='plot'||!farmCanPurchase(state,kind)||state.gold<item.price)return state
 const orderKeys=kind==='store'||kind==='processed'?{...state.storedOrderKeys,[kind]:[...(state.storedOrderKeys?.[kind]??state.stored.filter(k=>k===kind).map(()=>null)),null]}:state.storedOrderKeys
 return {...state,gold:state.gold-item.price,stored:[...state.stored,kind],storedOrderKeys:orderKeys,storedLevels:{...state.storedLevels,[kind]:[...(state.storedLevels?.[kind]??state.stored.filter(k=>k===kind).map(()=>1)),1]}}
}
export function buyFarmTiles(state:TopviewState,quantity:number):TopviewState{
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000||state.gold<quantity*dirtTile.price||!Number.isSafeInteger(state.tileStock+quantity))return state
 return {...state,gold:state.gold-quantity*dirtTile.price,tileStock:state.tileStock+quantity}
}
export function applyTileStroke(state:TopviewState,tool:LandTool,cells:readonly LandCell[],reserved:readonly LandCell[]=[]){
 const paths=new Set(state.paths),land=new Set(state.land),pending=new Set(reserved.map(c=>cellKey(c.x,c.y))),changed:LandCell[]=[]
 let stock=state.tileStock
 for(const cell of cells){
  if(!Number.isInteger(cell.x)||!Number.isInteger(cell.y))continue
  const key=cellKey(cell.x,cell.y)
  if(!land.has(key))continue
  if(tool==='place'){
   if(stock<=0||paths.has(key)||pending.has(key)||objectAt(state,cell.x,cell.y))continue
   paths.add(key);stock--
  }else{
   if(!paths.delete(key))continue
   stock++
  }
  changed.push(cell)
 }
 return {state:changed.length?{...state,paths:[...paths],tileStock:stock}:state,changed}
}
