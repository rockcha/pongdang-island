import type {ComponentProps} from 'react'
import {isFarmFence,type FarmFenceKind} from './fence-kinds'
export {isFarmFence} from './fence-kinds'
import {TILE,type TopviewObject} from './topview-model'
import {farmDecorationArt} from './decoration-art'

export type FenceConnections={north:boolean;east:boolean;south:boolean;west:boolean}
export function fenceConnections(objects:TopviewObject[],object:Pick<TopviewObject,'id'|'x'|'y'>):FenceConnections{
 const at=(dx:number,dy:number)=>objects.some(other=>other.id!==object.id&&isFarmFence(other.kind)&&other.x===object.x+dx&&other.y===object.y+dy)
 return {north:at(0,-1),east:at(1,0),south:at(0,1),west:at(-1,0)}
}

// Reuse the original wood texture for rails and posts; neighbors share a single
// center post. Geometry stays in map coordinates, independent of sprite mirroring.
function WoodPiece({x,y,width,height,post=false,kind='fence'}:{x:number;y:number;width:number;height:number;post?:boolean;kind?:FarmFenceKind}){
 return <svg x={x} y={y} width={width} height={height} viewBox={post?'20 120 94 270':'112 183 284 48'} preserveAspectRatio="none" overflow="hidden"><image href={farmDecorationArt[kind].path} width="512" height="512"/></svg>
}
export function ConnectedFenceArt({connections:c,kind='fence',postsOnly=false}:{connections:FenceConnections;kind?:FarmFenceKind;postsOnly?:boolean}){
 const Piece=(props:ComponentProps<typeof WoodPiece>)=><WoodPiece {...props} kind={kind}/>
 return <svg viewBox="0 0 40 40" overflow="visible" aria-hidden="true" data-farm-connected-fence={`${c.north?'n':''}${c.east?'e':''}${c.south?'s':''}${c.west?'w':''}`}>
  {!postsOnly&&<>
  {c.north&&<g data-fence-arm="north"><g transform="translate(18 14) rotate(-90)"><Piece x={0} y={-1.5} width={20} height={3}/></g><g transform="translate(23 23) rotate(-90)"><Piece x={0} y={-1.5} width={20} height={3}/></g></g>}
  {c.west&&<g data-fence-arm="west">{[14,23].map(y=><Piece key={y} x={-1} y={y-1.5} width={21} height={3}/>)}</g>}
  {c.east&&<g data-fence-arm="east">{[14,23].map(y=><Piece key={y} x={20} y={y-1.5} width={21} height={3}/>)}</g>}
  {c.south&&<g data-fence-arm="south"><g transform="translate(18 14) rotate(90)"><Piece x={0} y={-1.5} width={20} height={3}/></g><g transform="translate(23 23) rotate(90)"><Piece x={0} y={-1.5} width={20} height={3}/></g></g>}
  </>}
  <Piece x={15.5} y={6.5} width={9} height={26} post/>
 </svg>
}

export function fenceSegments(objects:TopviewObject[]){
 const fences=objects.filter(object=>isFarmFence(object.kind))
 return fences.flatMap(object=>{
  const c=fenceConnections(fences,object)
  return ([['east',c.east],['south',c.south]] as const).filter(([,connected])=>connected).map(([direction])=>({object,direction}))
 })
}

// Each span is painted once, in full, behind the shared posts. This avoids
// seams in the middle of rails and keeps every corner joint hidden by wood.
export function FarmFenceRails({objects}:{objects:TopviewObject[]}){
 return <g pointerEvents="none" data-farm-fence-rails="true">{fenceSegments(objects).map(({object,direction})=>{
  const kind=object.kind as FarmFenceKind
  return <g key={`${object.id}:${direction}`} transform={`translate(${object.x*TILE} ${object.y*TILE})`} data-fence-span={direction}>
   {direction==='east'?[14,23].map(y=><WoodPiece key={y} kind={kind} x={20} y={y-2.1} width={40} height={4.2}/>):<>
    <g transform="translate(18 14) rotate(90)"><WoodPiece kind={kind} x={0} y={-2.25} width={40} height={4.5}/></g>
    <g transform="translate(22 23) rotate(90)"><WoodPiece kind={kind} x={0} y={-2.25} width={40} height={4.5}/></g>
   </>}
  </g>
 })}</g>
}
