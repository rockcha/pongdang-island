// @vitest-environment node
import {expect,it} from 'vitest'
import {readFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import manifest from '../assets/optimized-rod-shop/manifest.json'
import assets from '../src/features/fishing/rod-shop-assets.json'
import geometry from '../src/features/fishing/rod-artwork.json'

it('packages separate immutable thumbnails and reels for every existing rod without editing originals',async()=>{
 expect(manifest.items.map(item=>item.id).sort()).toEqual(Object.keys(geometry).sort())
 for(const item of manifest.items){
  for(const source of Object.values(item.sources))expect(createHash('sha256').update(readFileSync(source.source)).digest('hex')).toBe(source.sourceHash)
  for(const part of ['thumbnail','reel'] as const){
   const image=item[part]
   expect(assets[item.id as keyof typeof assets][part]).toBe(image.url)
   expect(image.url).toMatch(/^\/game-art\/rod-shop\/(thumbnail|reel)\/[a-f0-9]{24}-320\.webp$/)
   expect(statSync('public'+image.url).size).toBe(image.bytes)
   const info=await sharp('public'+image.url).metadata()
   expect(info.hasAlpha).toBe(true)
   expect(Math.max(info.width!,info.height!)).toBeLessThanOrEqual(320)
  }
  // Axle positioning must leave the reel's silhouette inside the image bounds.
  const {data,info}=await sharp('public'+item.reel.url).ensureAlpha().extractChannel('alpha').raw().toBuffer({resolveWithObject:true})
  for(let x=0;x<info.width;x++){
   expect(data[x]).toBeLessThanOrEqual(1)
   expect(data[(info.height-1)*info.width+x]).toBeLessThanOrEqual(1)
  }
  for(let y=0;y<info.height;y++){
   expect(data[y*info.width]).toBeLessThanOrEqual(1)
   expect(data[y*info.width+info.width-1]).toBeLessThanOrEqual(1)
  }
 }
 expect(manifest.summary.displayBytes).toBeLessThan(manifest.summary.sourceBytes*.05)
})
