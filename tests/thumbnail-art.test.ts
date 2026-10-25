// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {optimizedThumbnailUrl} from '../src/features/collection/thumbnail-art'
import manifest from '../assets/optimized-thumbnails/manifest.json'
import catalog from '../supabase/catalog/catalog.json'

it('covers every catalog thumbnail with immutable, distinct display-size assets',()=>{
 const paths=[...new Set(catalog.collectible_species.map(s=>s.thumbnail_path))]
 expect(manifest.items.map(i=>i.key).sort()).toEqual(paths.sort())
 for(const item of manifest.items){
  for(const size of ['small','large'] as const){
   const asset=item[size]
   expect(optimizedThumbnailUrl(item.key,size)).toBe(asset.url)
   expect(asset.url).toMatch(/^\/game-art\/thumbnails\/[a-f0-9]{24}-(320|640)\.webp$/)
   expect(statSync('public'+asset.url).size).toBe(asset.bytes)
   expect(Math.max(asset.width,asset.height)).toBeLessThanOrEqual(size==='small'?320:640)
   expect(asset.width).toBeLessThanOrEqual(item.sourceWidth)
  }
 }
 expect(manifest.summary.smallBytes).toBeLessThan(manifest.summary.sourceBytes*.1)
})
it('leaves unknown, private and already absolute image paths on the existing fallback',()=>{
 for(const path of ['unknown.png','https://other.test/private.png','__proto__'])expect(optimizedThumbnailUrl(path)).toBeUndefined()
 const item=manifest.items[0]
 expect(optimizedThumbnailUrl(item.key)).toBe(optimizedThumbnailUrl(item.key))
})
it('preserves source bytes and the resized alpha silhouette for representative large images',async()=>{
 const samples=[...manifest.items].sort((a,b)=>b.sourceBytes-a.sourceBytes).slice(0,3)
 for(const item of samples){
  const original=readFileSync(item.source)
  expect(createHash('sha256').update(original).digest('hex')).toBe(item.sourceHash)
  const expected=await sharp(original).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).ensureAlpha().extractChannel('alpha').raw().toBuffer()
  const actual=await sharp('public'+item.small.url).ensureAlpha().extractChannel('alpha').raw().toBuffer()
  expect(actual.length).toBe(expected.length)
  // WebP retains the alpha plane losslessly; no trim or recenter is allowed.
  let maxDifference=0
  for(let i=0;i<expected.length;i++)maxDifference=Math.max(maxDifference,Math.abs(expected[i]-actual[i]))
  expect(maxDifference).toBeLessThanOrEqual(1)
 }
})
