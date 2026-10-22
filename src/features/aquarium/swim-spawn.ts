import type {OwnedCollectible} from '@/features/collection/api'
import {isPositionFixed,movementSettings} from './movement-settings'
import {inhabitantBaseSize} from './inhabitant-size'

export type SwimSpawn={x:number;y:number;direction:number}
export function swimSpawnLayout(items:OwnedCollectible[],width:number,height:number){
 const result=new Map<string,SwimSpawn>(),occupied:{x:number;y:number;size:number}[]=[]
 // Stable ID ordering makes asynchronous texture arrival irrelevant to placement.
 for(const item of [...items].sort((a,b)=>a.id.localeCompare(b.id))){
  const settings=movementSettings(item.species)
  if(item.species.kind!=='fish'||settings.type!=='swim'||settings.travel!=='both'||isPositionFixed(item)||item.position_locked||item.editing)continue
  let seed=item.animation_seed>>>0
  for(const c of item.id)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const size=inhabitantBaseSize(item.species,width)*Number(item.scale??1),w=Math.max(0,width-size),h=Math.max(0,height-size)
  const low=Number(item.species.swim_y_min),high=Number(item.species.swim_y_max)
  let best:SwimSpawn={x:.5,y:.5,direction:1},bestScore=-Infinity,bestCenter={x:0,y:0,size}
  // One jittered candidate per cell; choose the least crowded physical position.
  for(let cell=0;cell<15;cell++){
   const x=(cell%5+.18+random()*.64)/5,y=(Math.floor(cell/5)+.18+random()*.64)/3
   const center={x:x*w+size/2,y:(low+(high-low)*y)*h+size/2,size}
   const score=occupied.length?Math.min(...occupied.map(p=>Math.hypot(center.x-p.x,center.y-p.y)/Math.max(1,(size+p.size)/2))):random()
   if(score>bestScore){bestScore=score;best={x,y,direction:random()<.5?-1:1};bestCenter=center}
  }
  occupied.push(bestCenter);result.set(item.id,best)
 }
 return result
}
