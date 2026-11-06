import {MAP_W,MAP_H,TEST_LAND_PRICE,cellKey,objectAt,objectFootprint,type TopviewState} from './topview-model'
import {addTileStock,pathTile} from './tile-catalog'

export type LandCell={x:number;y:number}
export type LandTool='place'|'recover'
export type LandBlock='outside'|'occupied'|'last-land'|'out-of-stock'
export type LandStrokeResult={state:TopviewState;changed:LandCell[];blocked:{cell:LandCell;reason:LandBlock}[]}
const inside=({x,y}:LandCell)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<MAP_W&&y<MAP_H
const keyOf=({x,y}:LandCell)=>cellKey(x,y)
const fromKey=(key:string):LandCell=>{const [x,y]=key.split(',').map(Number);return{x,y}}

export function buyLandStock(state:TopviewState,quantity:number):TopviewState{
 const cost=quantity*TEST_LAND_PRICE
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000||!Number.isSafeInteger(cost)||state.gold<cost||!Number.isSafeInteger(state.landStock+quantity))return state
 return {...state,gold:state.gold-cost,landStock:state.landStock+quantity}
}

// Fill fast pointer movements with a four-connected line, including diagonal gestures.
export function landLine(from:LandCell,to:LandCell):LandCell[]{
 if(!inside(from)||!inside(to))return []
 const cells=[from],dx=Math.abs(to.x-from.x),dy=Math.abs(to.y-from.y),sx=Math.sign(to.x-from.x),sy=Math.sign(to.y-from.y)
 let x=from.x,y=from.y,ix=0,iy=0
 while(x!==to.x||y!==to.y){
  if(y===to.y||(x!==to.x&&(ix+.5)*dy<=(iy+.5)*dx)){x+=sx;ix++}else{y+=sy;iy++}
  cells.push({x,y})
 }
 return cells
}

export function applyLandStroke(state:TopviewState,tool:LandTool,cells:readonly LandCell[]):LandStrokeResult{
 const unique=[...new Map(cells.map(cell=>[keyOf(cell),cell])).values()],blocked:LandStrokeResult['blocked']=[],land=new Set(state.land),changed:LandCell[]=[]
 for(const cell of unique)if(!inside(cell))blocked.push({cell,reason:'outside'})
 const valid=unique.filter(inside)
 if(tool==='place'){
  const candidates=new Set(valid.filter(cell=>{
   if(land.has(keyOf(cell)))return false
   if(objectAt(state,cell.x,cell.y)){blocked.push({cell,reason:'occupied'});return false}
   return true
  }).map(keyOf))
  const added=[...candidates].slice(0,state.landStock)
  for(const key of added){land.add(key);changed.push(fromKey(key))}
  for(const key of candidates)if(!land.has(key))blocked.push({cell:fromKey(key),reason:'out-of-stock'})
  return {state:changed.length?{...state,land:[...land],landStock:state.landStock-changed.length}:state,changed,blocked}
 }
 const occupied=new Set<string>()
 for(const object of state.objects){const size=objectFootprint(object);for(let y=0;y<size.h;y++)for(let x=0;x<size.w;x++)occupied.add(cellKey(object.x+x,object.y+y))}
 const pending=new Set<string>()
 for(const cell of valid){const key=keyOf(cell);if(!land.has(key))continue;if(occupied.has(key))blocked.push({cell,reason:'occupied'});else pending.add(key)}
 for(const key of pending){if(land.size<=1){blocked.push({cell:fromKey(key),reason:'last-land'});continue}land.delete(key);changed.push(fromKey(key))}
 let recovered=state
 const pathTiles={...state.pathTiles}
 for(const key of state.paths)if(!land.has(key)){recovered=addTileStock(recovered,pathTile(state,key),1);delete pathTiles[key]}
 return {state:changed.length?{...recovered,pathTiles,land:state.land.filter(key=>land.has(key)),paths:state.paths.filter(key=>land.has(key)),landStock:state.landStock+changed.length}:state,changed,blocked}
}

export const landBlockMessages:Record<LandBlock,string>={outside:'섬을 넓힐 수 있는 영역을 골라주세요.',occupied:'장식물·건물·동물·작물이 있는 칸은 먼저 비워주세요.','last-land':'마지막 땅 한 칸은 남겨주세요.','out-of-stock':'여분 땅이 없어요. 땅 구매에서 먼저 준비해주세요.'}
