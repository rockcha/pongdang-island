import {expect,it} from 'vitest'
import {wideTankFrame} from '../src/features/aquarium/wide-tank-frame'

it('fills landscape screens without exposing space beyond the canonical tank or changing item geometry',()=>{
 for(const [width,height] of [[1920,1080],[1912,1011],[844,390],[1024,768]]){
  const frame=wideTankFrame(width,height)
  const visibleWidth=1/frame.zoom,visibleHeight=height/width/frame.zoom
  expect(frame.zoom).toBeGreaterThanOrEqual(1/3)
  expect(frame.position).toBeGreaterThanOrEqual(0)
  expect(frame.position+visibleWidth).toBeLessThanOrEqual(3.000001)
  expect(frame.y).toBeGreaterThanOrEqual(0)
  expect(frame.y+visibleHeight).toBeLessThanOrEqual(1.600001)
 }
})
it('retains the entire canonical tank in the explicitly selected overview frame',()=>{
 expect(wideTankFrame(1875,1000,false)).toEqual({zoom:1/3,position:0,y:0})
})
