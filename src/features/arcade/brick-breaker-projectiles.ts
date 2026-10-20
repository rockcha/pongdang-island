import {BRICK,WAVE_SHOT,DASH_SHOT,STAR_SHOT} from './brick-breaker-config'
import type {Brick} from './brick-breaker-model'

export type WaveShot={id:number;x:number;y:number;age:number;hitIds:Set<number>}
export type DashShot={id:number;x:number;y:number;age:number}
export type StarShot={id:number;x:number;y:number;vx:number;vy:number;age:number;delay:number}

/** Swept hit testing keeps a shot from skipping bricks at low frame rates. */
export function crossedBrick(brick:Brick,x:number,fromY:number,toY:number,radius:number){
 return x+radius>=brick.x&&x-radius<=brick.x+BRICK.width
  &&Math.min(fromY,toY)-radius<=brick.y+BRICK.height
  &&Math.max(fromY,toY)+radius>=brick.y
}

export function advanceWave(shot:WaveShot,dt:number,bricks:Brick[]){
 const previousY=shot.y
 shot.y-=WAVE_SHOT.speed*dt;shot.age+=dt
 const hits=bricks.filter(brick=>!shot.hitIds.has(brick.id)&&crossedBrick(brick,shot.x,previousY,shot.y,WAVE_SHOT.hitRadius))
 for(const brick of hits)shot.hitIds.add(brick.id)
 return hits
}

/** A dash stops at the nearest brick along its upward path. */
export function advanceDash(shot:DashShot,dt:number,bricks:Brick[]){
 const previousY=shot.y
 shot.y-=DASH_SHOT.speed*dt;shot.age+=dt
 return bricks.filter(brick=>crossedBrick(brick,shot.x,previousY,shot.y,DASH_SHOT.hitRadius))
  .sort((a,b)=>b.y-a.y||Math.abs(a.x+BRICK.width/2-shot.x)-Math.abs(b.x+BRICK.width/2-shot.x)||a.id-b.id)[0]
}

// A segment against an expanded brick catches diagonal shots without tunnelling.
function starHitTime(brick:Brick,x:number,y:number,dx:number,dy:number){
 let entry=0,exit=1
 for(const [position,delta,min,max] of [[x,dx,brick.x-STAR_SHOT.hitRadius,brick.x+BRICK.width+STAR_SHOT.hitRadius],[y,dy,brick.y-STAR_SHOT.hitRadius,brick.y+BRICK.height+STAR_SHOT.hitRadius]]){
  if(Math.abs(delta)<1e-9){if(position<min||position>max)return null;continue}
  const a=(min-position)/delta,b=(max-position)/delta
  entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b))
  if(entry>exit)return null
 }
 return entry
}

export function advanceStar(shot:StarShot,dt:number,bricks:Brick[]){
 const activeTime=Math.max(0,dt-shot.delay)
 shot.delay=Math.max(0,shot.delay-dt)
 if(activeTime===0)return
 const x=shot.x,y=shot.y,dx=shot.vx*activeTime,dy=shot.vy*activeTime
 shot.x+=dx;shot.y+=dy;shot.age+=activeTime
 return bricks.map(brick=>({brick,time:starHitTime(brick,x,y,dx,dy)}))
  .filter((hit):hit is {brick:Brick;time:number}=>hit.time!==null)
  .sort((a,b)=>a.time-b.time||a.brick.id-b.brick.id)[0]?.brick
}
