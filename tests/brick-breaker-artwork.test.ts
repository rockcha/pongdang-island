import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {afterAll,expect,it,vi} from 'vitest'
import {brickViewport,dropArtwork} from '@/features/arcade/brick-breaker-artwork'
import Camera from '../node_modules/phaser/src/cameras/2d/Camera.js'

const originalContext=vi.hoisted(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=(()=>({fillRect(){},putImageData(){},getImageData(){return {data:new Uint8ClampedArray(4)}}})) as typeof original;return original})
afterAll(()=>{HTMLCanvasElement.prototype.getContext=originalContext})

it('raises drawing resolution while keeping board, paddle and pointer coordinates unchanged',()=>{
 const camera=new Camera(0,0,360,520)
 for(const [width,height,dpr] of [[360,520,1],[360,520,2],[360,520,3],[399,613,1.25],[600,400,2]]){
  const r=brickViewport(width,height,dpr),logicalHeight=height/(width/360)
  expect(r.pixelWidth).toBe(Math.round(width*Math.min(dpr,2)))
  camera.setViewport(0,0,r.pixelWidth,r.pixelHeight).setZoom(r.pixelWidth/360,r.pixelHeight/logicalHeight).centerOn(180,logicalHeight/2)
  camera.preRender()
  expect(camera.worldView.width).toBeCloseTo(360);expect(camera.worldView.height).toBeCloseTo(logicalHeight)
  for(const [x,y] of [[0,0],[180,logicalHeight/2],[49,logicalHeight-34],[311,logicalHeight-34]]){
   const point=camera.getWorldPoint(x*r.pixelWidth/360,y*r.pixelHeight/logicalHeight)
   expect(point.x).toBeCloseTo(x,3);expect(point.y).toBeCloseTo(y,3)
  }
  const a=camera.matrixCombined.transformPoint(100,100),b=camera.matrixCombined.transformPoint(182,100)
  expect((b.x-a.x)*width/r.pixelWidth).toBeCloseTo(82*width/360,3)
 }
})

it('caps mobile GPU work and handles hidden or very large containers',()=>{
 expect(brickViewport(360,520,3).ratio).toBe(2)
 const large=brickViewport(2000,1500,3)
 expect(large.pixelWidth*large.pixelHeight).toBeLessThanOrEqual(4005000)
 expect(brickViewport(0,0,NaN)).toMatchObject({width:1,height:1,pixelWidth:1,pixelHeight:1})
 expect(brickViewport(360,520,0.5).ratio).toBe(1)
})

it('keeps simple hazards as vector art and ships the remaining PNGs with valid source hashes',()=>{
 const manifest=JSON.parse(readFileSync('public/arcade/brick-breaker/artwork.manifest.json','utf8'))
 for(const kind of ['urchin','ink','seaweed','heart','sticky','shrink','magnet','wave'] as const){
  expect(dropArtwork[kind]).toMatchObject({sheet:false,src:expect.stringMatching(/\.svg$/)})
  expect(readFileSync('public'+dropArtwork[kind].src,'utf8')).toContain('viewBox="0 0 64 64"')
 }
 expect(dropArtwork.puffer).toMatchObject({sheet:true,src:expect.stringMatching(/puffer-sprite\.png$/),preview:expect.stringMatching(/puffer\.png$/)})
 const assets=Object.values(dropArtwork).flatMap(asset=>[asset,...(asset.preview?[{src:asset.preview,sheet:false}]:[])])
 for(const asset of assets){
  if(asset.src.endsWith('.svg'))continue
  const data=readFileSync('public'+asset.src),width=data.readUInt32BE(16),height=data.readUInt32BE(20)
  expect(data.subarray(1,4).toString()).toBe('PNG');expect(data[25]).toBe(6)
  expect(width/(asset.sheet?2:1)).toBeGreaterThanOrEqual(256)
  expect(height/(asset.sheet?2:1)).toBeGreaterThanOrEqual(256)
  if(asset.sheet){expect(width%2).toBe(0);expect(height%2).toBe(0)}
  const record=manifest.assets.find((entry:{file:string})=>entry.file===asset.src.split('/').at(-1))
  expect(record).toMatchObject({width,height,transparent:true})
  expect(record.sha256).toBe(createHash('sha256').update(data).digest('hex'))
 }
})
