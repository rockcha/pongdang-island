import {expect,it} from 'vitest'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'

it('anchors the whale body at the same position through all four frames and both headings',()=>{
 const measurements=[[0,0,1],[-1,1,.94],[3,-17,.94],[0,-17,.98]]
 const reference={x:72,y:57}
 for(const [frame,[dx,dy,scale]] of measurements.entries()){
  const layout=swimFrameLayout('fish/epic/pongdang-whale_sprite.png',frame)
  const point={x:48+(reference.x-48)*scale+dx,y:48+(reference.y-48)*scale+dy}
  expect((point.y-layout.originY*96)*layout.scale).toBeCloseTo(reference.y-48)
  expect((point.x-layout.originX*96)*layout.scale).toBeCloseTo(reference.x-48)
  const mirroredOrigin=1-layout.originX
  expect((96-mirroredOrigin*96-point.x)*layout.scale).toBeCloseTo(-(reference.x-48))
 }
})

it('preserves existing stable sheets including filefish',()=>{
 expect(swimFrameLayout('fish/normal/round-filefish_sprite.png',3)).toEqual({originX:.5,originY:.5,scale:1})
})
