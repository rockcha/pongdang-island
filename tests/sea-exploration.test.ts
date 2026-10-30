import {expect,it} from 'vitest'
import {advanceOcean,type OceanState} from '@/features/sea-exploration/ocean'

const initial:OceanState={player:{x:500,y:300},camera:{x:0,y:0},angle:0,moving:false}
it('lets the diver swim before following at the viewport margin',()=>{
 const first=advanceOcean(initial,{x:1,y:0},1000,600,1,100)
 expect(first.player.x).toBe(600);expect(first.camera.x).toBe(0)
 const next=advanceOcean(first,{x:1,y:0},1000,600,2,100)
 expect(next.camera.x).toBe(80);expect(next.player.x-next.camera.x).toBe(720)
})
it('keeps moving in all directions without finite world boundaries',()=>{
 for(const input of [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
  const next=advanceOcean(initial,input,1000,600,10000,170)
  expect(Math.hypot(next.player.x-initial.player.x,next.player.y-initial.player.y)).toBe(1700000)
  expect(next.player.x-next.camera.x).toBeGreaterThanOrEqual(280)
  expect(next.player.x-next.camera.x).toBeLessThanOrEqual(720)
  expect(next.player.y-next.camera.y).toBeGreaterThanOrEqual(168)
  expect(next.player.y-next.camera.y).toBeLessThanOrEqual(432)
 }
})
it('normalizes diagonal speed and holds position when controls are released',()=>{
 const next=advanceOcean(initial,{x:1,y:1},1000,600,1,170)
 expect(Math.hypot(next.player.x-500,next.player.y-300)).toBeCloseTo(170)
 expect(advanceOcean(next,{x:0,y:0},1000,600,1,170).player).toEqual(next.player)
})
