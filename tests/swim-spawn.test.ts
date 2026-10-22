// @vitest-environment node
import {it,expect} from 'vitest'
import type {OwnedCollectible} from '../src/features/collection/api'
import {swimSpawnLayout} from '../src/features/aquarium/swim-spawn'
import {InhabitantMotion} from '../src/features/aquarium/inhabitant-motion'
import {createSwimMotion} from '../src/features/aquarium/swim-motion'

const fish=(i:number)=>({id:`spread-${i}`,animation_seed:0,position_x:.5,position_y:.5,species:{id:'fish',kind:'fish',movement_type:'swim',travel_direction:'both',size:48,speed:.05,swim_y_min:.2,swim_y_max:.8}} as OwnedCollectible)
it('spreads fish with identical saved center positions across mobile and desktop tanks without changing saved data',()=>{
 for(const [width,height] of [[320,560],[768,800]]){
  const items=Array.from({length:15},(_,i)=>fish(i)),before=JSON.stringify(items),layout=swimSpawnLayout(items,width,height)
  const points=items.map(item=>new InhabitantMotion(item,0,layout.get(item.id)).update(0,0,width,height))
  expect(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x))).toBeGreaterThan(width*.65)
  expect(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))).toBeGreaterThan(height*.35)
  for(const p of points){expect(p.y).toBeGreaterThanOrEqual(.2*(height-p.size));expect(p.y).toBeLessThanOrEqual(.8*(height-p.size))}
  expect(JSON.stringify(items)).toBe(before)
  const reversed=swimSpawnLayout([...items].reverse(),width,height)
  for(const item of items)expect(reversed.get(item.id)).toEqual(layout.get(item.id))
 }
})
it('leaves locked, editing, crawling, pulsing and fixed inhabitants out of automatic placement',()=>{
 const items=Array.from({length:5},(_,i)=>fish(i))
 items[0].position_locked=true;items[1].editing=true
 items[2].species.movement_type='crawl';items[3].species.movement_type='pulse';items[4].species.kind='decoration'
 expect(swimSpawnLayout(items,400,600).size).toBe(0)
})
it('starts active swimmers cruising and keeps their later pauses individual and less frequent',()=>{
 let rests=0
 for(let i=0;i<300;i++){
  const m=createSwimMotion(`lively-${i}`,i,.05,true,undefined,true)
  expect(m(.5).behavior).toBe('cruise')
  expect(m(2).x).not.toBe(m(0).x)
  if(m(6.5).behavior==='rest')rests++
  expect(Math.abs(m(6.0001).x-m(5.9999).x)).toBeLessThan(.001)
 }
 expect(rests).toBeGreaterThan(30);expect(rests).toBeLessThan(90)
})
