import {facilityFor,canPlace,type Cell,type IslandState,type Placement} from './island-model'
import {footprint} from './island-model'
export function storedDecorationIds(state:IslandState,type:string){
 const occupied=new Set(state.layout.map(p=>p.id))
 return [...new Set(state.owned)].filter(id=>!occupied.has(id)&&facilityFor(id)?.category==='decoration'&&facilityFor(id)?.id===type)
}
export function supportsLinePlacement(type:string){return ['wood-fence','stone-wall','farm-white-fence'].includes(facilityFor(type)?.kind??'')}
export type DecorationPlan={slots:{cell:Cell;allowed:boolean;placement:Placement}[];placements:Placement[];remaining:number}
/** Preview and commit use the same deterministic plan. Invalid cells never consume an item. */
export function planDecorationPlacement(state:IslandState,type:string,from:Cell,to:Cell,rotation=0):DecorationPlan{
 const stock=storedDecorationIds(state,type),f=facilityFor(type)
 const result:DecorationPlan={slots:[],placements:[],remaining:stock.length}
 if(!f||!stock.length||![from.x,from.y,to.x,to.y].every(Number.isInteger))return result
 const area=f.kind==='farm-plot',line=supportsLinePlacement(type),dx=to.x-from.x,dy=to.y-from.y,horizontal=Math.abs(dx)>=Math.abs(dy)
 const width=area?Math.min(40,Math.abs(dx)+1):1
 const distance=area?width*Math.min(36,Math.abs(dy)+1)-1:line?Math.min(40,horizontal?Math.abs(dx):Math.abs(dy)):0
 const origin=area?{x:Math.min(from.x,to.x),y:Math.min(from.y,to.y)}:line?from:to
 const layout=[...state.layout]
 for(let i=0;i<=distance&&result.placements.length<stock.length;i++){
  const cell={x:origin.x+(area?i%width:line&&horizontal?Math.sign(dx)*i:0),y:origin.y+(area?Math.floor(i/width):line&&!horizontal?Math.sign(dy)*i:0)}
  const id=stock[result.placements.length]
  const heading=line&&distance>0?(horizontal?0:90):rotation
  const placement:Placement={id,...cell,rotation:f.kind==='farm-white-fence'&&line&&distance>0?heading+(rotation>=180?180:0):heading,...(state.signLabels?.[id]!==undefined?{label:state.signLabels[id]}:{})}
  const allowed=canPlace(layout,placement,state.land,state.removedLand,state.farmPlotLimit)
  result.slots.push({cell,allowed,placement})
  if(allowed){result.placements.push(placement);layout.push(placement)}
 }
 result.remaining=stock.length-result.placements.length
 return result
}
export function applyDecorationPlacement(state:IslandState,type:string,from:Cell,to:Cell,rotation=0){
 const plan=planDecorationPlacement(state,type,from,to,rotation)
 return plan.placements.length?{state:{...state,layout:[...state.layout,...plan.placements]},plan}:null
}

// Remove placements only: ownership, sign text, terrain and coins stay intact.
export function planDecorationRemoval(state:IslandState,cells:Cell[]){
 const placements=state.layout.filter(p=>{
  if(facilityFor(p.id)?.category!=='decoration')return false
  const {w,h}=footprint(p)
  return cells.some(c=>c.x>=p.x&&c.x<p.x+w&&c.y>=p.y&&c.y<p.y+h)
 })
 const ids=new Set(placements.map(p=>p.id))
 return {placements,count:placements.length,state:ids.size?{...state,layout:state.layout.filter(p=>!ids.has(p.id))}:state}
}
