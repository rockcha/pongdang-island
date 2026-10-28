import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {expect,it} from 'vitest'
import {starruinsArtUrl} from '@/features/aquarium/starruins-art'
import {optimizedThumbnailUrl} from '@/features/collection/thumbnail-art'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
import {premiumSwimFrame} from '@/features/aquarium/premium-swim-frame'
import {mythicSwimAsset,mythicSheetColumns,mythicSwimFrame,mythicSwimLayout} from '@/features/aquarium/mythic-swim'

const root='assets/storage-upload/new/20261029-055051/'
const read=(file:string)=>JSON.parse(readFileSync(root+file,'utf8').replace(/^\uFEFF/,''))
it('replaces all sixteen existing Star Ruins thumbnails, including the optimized list path',()=>{
 const manifest=read('manifest.json')
 expect(manifest.items).toHaveLength(16)
 for(const s of manifest.items){
  const old=s.path+'_thumbnail.png'
  expect(starruinsArtUrl(old),s.id).toContain('bluegold_v2_thumbnail.png')
  for(const resolution of ['small','large'] as const){
   const url=optimizedThumbnailUrl(old,resolution)!
   expect(url,s.id).toMatch(/^\/game-art\/thumbnails\/[a-f0-9]{24}-(320|640)\.webp$/)
   expect(readFileSync('public'+url).length).toBeGreaterThan(100)
  }
  for(const [file,hash] of Object.entries(s.hashes))expect(createHash('sha256').update(readFileSync(root+file)).digest('hex')).toBe(hash)
 }
 expect(starruinsArtUrl('fish/rare/unrelated_sprite.png')).toBeUndefined()
 expect(starruinsArtUrl('https://example.com/private.png')).toBeUndefined()
})
it('has complete original silhouettes and physically different poses with measured final anchors',()=>{
 const raw=read('audit.json'),final=read('final-verification.json')
 expect(raw.results).toHaveLength(29)
 for(const asset of raw.results){
  expect(asset.missing,asset.id).toBeFalsy()
  expect(asset.warnings,asset.id).toEqual([])
 }
 expect(final.passed).toBe(true)
 expect(final.results).toHaveLength(13)
 for(const sheet of final.results)for(const f of sheet.frames){
  expect(f.margin,sheet.id).toBeGreaterThan(sheet.cell*.075)
  expect(f.occupancy,sheet.id).toBeLessThan(.84)
  expect(f.anchor.rmse,sheet.id).toBeLessThanOrEqual(60)
  expect(Math.abs(f.anchor.dy),sheet.id).toBeLessThanOrEqual(1)
  expect(Math.abs(f.anchor.dx),sheet.id).toBeLessThanOrEqual(1)
  if(f.frame>0)expect(f.changedPixelsFromFirst,sheet.id).toBeGreaterThan(sheet.cell*sheet.cell*.001)
 }
})
it('disables legacy position shifts for baked sheets in both regular and mythic playback',()=>{
 const manifest=read('manifest.json')
 for(const s of manifest.items.filter((s:{frames:number})=>s.frames>1)){
  const old=s.id==='atlantean-sentinel'?'fish/mythic/atlantean-sentinel-standing_sprite.png':s.path+'_sprite.png'
  const enhanced=mythicSwimAsset(old,s.rarity)
  const path=enhanced?.path??old
  const layouts=Array.from({length:s.frames},(_,f)=>enhanced?mythicSwimLayout(path,f)!:swimFrameLayout(path,f))
  expect(new Set(layouts.map(l=>JSON.stringify(l))).size,s.id).toBe(1)
  expect(layouts[0].originX).toBe(.5)
  expect(layouts[0].originY).toBe(.5)
  if(s.frames===8){
   expect(enhanced!.url).toBe('/aquarium/swim/atlantean-sentinel_swim8_v2_sprite.png')
   expect(mythicSheetColumns(path)).toBe(4)
   expect(new Set(Array.from({length:60},(_,i)=>mythicSwimFrame(path,i/10,0)))).toEqual(new Set([0,1,2,3,4,5,6,7]))
   for(const t of [0,.3,3.8,4.2,5.9]){
    expect(mythicSwimFrame(path,t+6,0)).toBe(mythicSwimFrame(path,t,0))
    expect(mythicSwimFrame(path,t,0,true)).toBe(0)
   }
  }else{
   const frames=Array.from({length:6},(_,i)=>premiumSwimFrame(path,(i+.1)/3,0,0))
   expect(frames).toEqual([0,1,2,3,2,1])
   for(const t of [0,.3,3.8])expect(premiumSwimFrame(path,t,0,3,true)).toBe(0)
  }
 }
})
