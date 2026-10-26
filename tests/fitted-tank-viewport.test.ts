import {expect,it} from 'vitest'
import {fittedTankViewport} from '../src/features/aquarium/use-fitted-tank-viewport'

it('fits the water and reserved header between navigation and bottom actions without cropping',()=>{
 for(const width of [320,390,480,1440])for(const height of [240,410,650,900]){
  const frame=fittedTankViewport(width,height)
  expect(frame.width).toBeLessThanOrEqual(width)
  expect(frame.height).toBeLessThanOrEqual(height+.001)
  expect((frame.height-56)/frame.width).toBeCloseTo(1.6)
 }
})
it('keeps a single world scale when browser chrome or the desktop window changes size',()=>{
 const short=fittedTankViewport(390,500),tall=fittedTankViewport(390,650)
 expect(short.height).toBe(500)
 expect(tall.height).toBe(650)
 // The same normalized floor coordinate stays on the floor in both views.
 for(const frame of [short,tall])expect((frame.height-56)*.98/frame.width).toBeCloseTo(1.6*.98)
 expect(fittedTankViewport(1440,1200).width).toBe(488)
 const friend=fittedTankViewport(390,550,0)
 expect(friend.height).toBe(550)
 expect(friend.height/friend.width).toBeCloseTo(1.6)
})
it('fills the available width and height for an overlay-header aquarium',()=>{
 for(const width of [320,390,480])for(const height of [300,550,800]){
  const frame=fittedTankViewport(width,height,0,true)
  expect(frame).toEqual({width,height})
  const zoom=frame.height/(frame.width*1.6)
  expect(frame.height/(frame.width*zoom)).toBeCloseTo(1.6)
 }
})
