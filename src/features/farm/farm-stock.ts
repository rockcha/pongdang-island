import {farmCanPurchase} from './farm-simulation'
import {cellKey,objectAt,topviewItems,type FarmTool,type TopviewState} from './topview-model'
import type {LandCell,LandTool} from './land-tools'
import {farmTiles,tileCount,pathTile,addTileStock,type FarmTile} from './tile-catalog'

export const dirtTile=farmTiles[0]
export function buyFarmItem(state:TopviewState,kind:FarmTool):TopviewState{
 const item=topviewItems[kind]
 if(item.group==='동물'||kind==='plot'||!farmCanPurchase(state,kind)||state.gold<item.price)return state
 const orderKeys=kind==='store'||kind==='processed'?{...state.storedOrderKeys,[kind]:[...(state.storedOrderKeys?.[kind]??state.stored.filter(k=>k===kind).map(()=>null)),null]}:state.storedOrderKeys
 return {...state,gold:state.gold-item.price,stored:[...state.stored,kind],storedOrderKeys:orderKeys,storedLevels:{...state.storedLevels,[kind]:[...(state.storedLevels?.[kind]??state.stored.filter(k=>k===kind).map(()=>1)),1]}}
}
export function buyFarmTiles(state:TopviewState,quantity:number,tile:FarmTile='dirt'):TopviewState{
 const product=farmTiles.find(item=>item.id===tile)
 if(!product||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000||state.gold<quantity*product.price||!Number.isSafeInteger(tileCount(state,tile)+quantity))return state
 return {...addTileStock(state,tile,quantity),gold:state.gold-quantity*product.price}
}
export function applyTileStroke(state:TopviewState,tool:LandTool,cells:readonly LandCell[],reserved:readonly LandCell[]=[],tile:FarmTile='dirt'){
 const paths=new Set(state.paths),land=new Set(state.land),pending=new Set(reserved.map(c=>cellKey(c.x,c.y))),changed:LandCell[]=[]
 let next=state
 const pathTiles={...state.pathTiles}
 for(const cell of cells){
  if(!Number.isInteger(cell.x)||!Number.isInteger(cell.y))continue
  const key=cellKey(cell.x,cell.y)
  if(!land.has(key))continue
  if(tool==='place'){
   if(tileCount(next,tile)<=0||paths.has(key)||pending.has(key)||objectAt(state,cell.x,cell.y))continue
   paths.add(key);pathTiles[key]=tile;next=addTileStock(next,tile,-1)
  }else{
   if(!paths.delete(key))continue
   next=addTileStock(next,pathTile(state,key),1);delete pathTiles[key]
  }
  changed.push(cell)
 }
 return {state:changed.length?{...next,paths:[...paths],pathTiles}:state,changed}
}
