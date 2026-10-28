import {addLand,storeLand,paintFloor,type FloorKind,type Cell,type IslandState} from './island-model'

// Fill gaps between pointer events and visit each tile at most once per stroke.
export function extendLandStroke(cells:Cell[],to:Cell,from:Cell=cells.at(-1)??to):Cell[]{
 const steps=Math.max(Math.abs(to.x-from.x),Math.abs(to.y-from.y))
 if(![from.x,from.y,to.x,to.y].every(Number.isInteger)||steps>200)return cells
 const result=[...cells],seen=new Set(cells.map(c=>`${c.x},${c.y}`))
 for(let i=0;i<=steps;i++){
  const cell={x:Math.round(from.x+(to.x-from.x)*(steps?i/steps:0)),y:Math.round(from.y+(to.y-from.y)*(steps?i/steps:0))},key=`${cell.x},${cell.y}`
  if(cell.x<0||cell.x>=40||cell.y<0||cell.y>=36||seen.has(key))continue
  seen.add(key);result.push(cell)
 }
 return result
}
export function planLandStroke(state:IslandState,cells:Cell[],mode:'place'|'remove'='place'){
 let next=state,count=0
 const slots=cells.map(cell=>{
  const placed=mode==='remove'?storeLand(next,cell):addLand(next,cell)
  if(placed){next=placed;count++}
  return {cell,allowed:!!placed}
 })
 return {state:next,count,slots}
}

export function planFloorStroke(state:IslandState,cells:Cell[],type:FloorKind|'bare'){
 let next=state,count=0
 const slots=cells.map(cell=>{
  const painted=paintFloor(next,cell,type)
  if(painted){next=painted;count++}
  return {cell,allowed:!!painted}
 })
 return {state:next,count,slots}
}
