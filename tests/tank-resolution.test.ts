import {afterAll,expect,it,vi} from 'vitest'
import {tankResolution} from '@/features/aquarium/tank-resolution'
import Camera from '../node_modules/phaser/src/cameras/2d/Camera.js'
// Camera math does not draw pixels, but Phaser probes canvas support on import.
const originalContext=vi.hoisted(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=(()=>({fillRect(){},putImageData(){},getImageData(){return {data:new Uint8ClampedArray(4)}}})) as typeof original;return original})
afterAll(()=>{HTMLCanvasElement.prototype.getContext=originalContext})
it('increases render pixels without changing logical size, including fractional DPR',()=>{
 for(const dpr of [1,1.25,1.5,2,3]){
  const r=tankResolution(400,600,dpr)
  expect([r.width,r.height]).toEqual([400,600])
  expect(r.pixelWidth).toBe(400*Math.min(dpr,2));expect(r.pixelHeight).toBe(600*Math.min(dpr,2))
 }
})
it('preserves world bounds, sprite screen size and pointer positions through the actual Phaser camera',()=>{
 const camera=new Camera(0,0,400,600)
 for(const [w,h,dpr] of [[400,600,1],[400,600,2],[399,613,1.25],[600,400,3]]){
  const r=tankResolution(w,h,dpr)
  camera.setViewport(0,0,r.pixelWidth,r.pixelHeight).setZoom(r.pixelWidth/r.width,r.pixelHeight/r.height).centerOn(r.width/2,r.height/2)
  camera.preRender()
  expect(camera.worldView.x).toBeCloseTo(0);expect(camera.worldView.y).toBeCloseTo(0)
  expect(camera.worldView.width).toBeCloseTo(w);expect(camera.worldView.height).toBeCloseTo(h)
  for(const [x,y] of [[0,0],[w/2,h/2],[w,h],[135,240]]){
   const point=camera.getWorldPoint(x*r.pixelWidth/w,y*r.pixelHeight/h)
   expect(point.x).toBeCloseTo(x,3);expect(point.y).toBeCloseTo(y,3)
  }
  const a=camera.matrixCombined.transformPoint(100,100),b=camera.matrixCombined.transformPoint(172,100)
  expect((b.x-a.x)*w/r.pixelWidth).toBeCloseTo(72,3)
 }
})
it('limits fill rate for large windows and handles an initially hidden container',()=>{
 const r=tankResolution(2000,1500,3)
 expect(r.pixelWidth*r.pixelHeight).toBeLessThanOrEqual(4005000)
 expect(r.width).toBe(2000);expect(r.ratio).toBeGreaterThanOrEqual(1)
 expect(tankResolution(0,0,NaN)).toMatchObject({width:1,height:1,pixelWidth:1,pixelHeight:1})
})
