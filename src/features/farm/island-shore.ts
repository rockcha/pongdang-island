import {TILE} from './topview-model'
type Point={x:number;y:number}
type Edge={from:Point;to:Point;direction:number}
const key=(p:Point)=>`${p.x},${p.y}`

// Trace exposed tile edges into complete loops, then round only their corners.
// Straight shores remain one line regardless of how many tiles they span.
export function islandShorePath(land:readonly string[]){
 const owned=new Set(land),edges:Edge[]=[],outgoing=new Map<string,number[]>()
 for(const cell of owned){const [x,y]=cell.split(',').map(Number)
  const candidates:Edge[]=[{from:{x,y},to:{x:x+1,y},direction:0},{from:{x:x+1,y},to:{x:x+1,y:y+1},direction:1},{from:{x:x+1,y:y+1},to:{x,y:y+1},direction:2},{from:{x,y:y+1},to:{x,y},direction:3}]
  const neighbors=[`${x},${y-1}`,`${x+1},${y}`,`${x},${y+1}`,`${x-1},${y}`]
  candidates.forEach((edge,i)=>{if(owned.has(neighbors[i]))return;const id=edges.length;edges.push(edge);const k=key(edge.from);outgoing.set(k,[...(outgoing.get(k)??[]),id])})
 }
 const used=new Set<number>(),paths:string[]=[]
 for(let first=0;first<edges.length;first++){
  if(used.has(first))continue
  const loop:Point[]=[];let id=first
  while(!used.has(id)){
   const edge=edges[id];used.add(id);loop.push(edge.from)
   if(key(edge.to)===key(edges[first].from))break
   const next=(outgoing.get(key(edge.to))??[]).filter(i=>!used.has(i)).sort((a,b)=>{
    const rank=(direction:number)=>[1,0,3,2][(direction-edge.direction+4)%4]
    return rank(edges[a].direction)-rank(edges[b].direction)
   })[0]
   if(next===undefined)break
   id=next
  }
  const corners=loop.filter((point,i)=>{const prev=loop[(i+loop.length-1)%loop.length],next=loop[(i+1)%loop.length];return (point.x-prev.x)*(next.y-point.y)!==(point.y-prev.y)*(next.x-point.x)}).map(p=>({x:p.x*TILE,y:p.y*TILE}))
  if(corners.length<3)continue
  const toward=(from:Point,to:Point)=>{const distance=Math.hypot(to.x-from.x,to.y-from.y),radius=Math.min(10,distance/2);return {x:from.x+(to.x-from.x)/distance*radius,y:from.y+(to.y-from.y)/distance*radius}}
  paths.push(corners.map((point,i)=>{const before=toward(point,corners[(i+corners.length-1)%corners.length]),after=toward(point,corners[(i+1)%corners.length]);return `${i?'L':'M'}${before.x} ${before.y}Q${point.x} ${point.y} ${after.x} ${after.y}`}).join('')+'Z')
 }
 return paths.join('')
}
