// @vitest-environment node
import {expect,it} from 'vitest'
import fs from 'node:fs'
import sharp from 'sharp'
import {mythicSheetColumns,mythicSwimAsset,mythicSwimFrame} from '@/features/aquarium/mythic-swim'
import {fishingEnvironment} from '@/features/fishing/fishing-environment'
import {fishingRods} from '@/features/fishing/fishing-rods'
import {rodImagePath} from '@/features/fishing/rod-image-assets'

const batch='assets/storage-upload/new/20261027-154009'
const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
const species=catalog.collectible_species.filter(s=>s.native_region_id==='mechsanctum')

it('ships all requested native thumbnails and real animation sheets with safe frame boundaries',async()=>{
 const audit=JSON.parse(fs.readFileSync(batch+'/registration.json','utf8'))
 expect(species).toHaveLength(59)
 expect(audit).toHaveLength(32)
 expect(JSON.parse(fs.readFileSync(batch+'/sprite-errors.json','utf8'))).toEqual([])
 for(const s of species){
  const thumbnail=await sharp(batch+'/'+s.thumbnail_path).metadata()
  expect(thumbnail.hasAlpha,s.id).toBe(true)
  if(s.kind!=='fish')continue
  const report=audit.find(r=>r.id===s.id)
  expect(report,s.id).toBeTruthy()
  expect(report.frames).toHaveLength(s.rarity==='mythic'?8:4)
  for(const frame of report.rawFrames)expect(frame.margin,s.id).toBeGreaterThan(0)
  for(const frame of report.frames)expect(frame.margin,s.id).toBeGreaterThanOrEqual(60)
  for(const anchor of report.registration)expect(anchor.rmse,s.id).toBeLessThanOrEqual(60)
  const png=await sharp(batch+'/'+s.sprite_sheet_path).metadata()
  expect(png.width!/png.height!,s.id).toBe(s.rarity==='mythic'?2:1)
 }
})

it('connects both machine gods to eight frames, six-second actions and reduced-motion rest',()=>{
 for(const s of species.filter(s=>s.kind==='fish'&&s.rarity==='mythic')){
  const asset=mythicSwimAsset(s.sprite_sheet_path,'mythic')!
  expect(asset,s.id).toBeTruthy();expect(fs.existsSync('public'+asset.url)).toBe(true)
  expect(mythicSheetColumns(asset.path)).toBe(4)
  const frames=Array.from({length:120},(_,i)=>mythicSwimFrame(asset.path,i/20,0))
  expect(new Set(frames).size).toBe(8)
  for(let i=0;i<60;i++)expect(mythicSwimFrame(asset.path,i/10,0)).toBe(mythicSwimFrame(asset.path,i/10+6,0))
  expect(mythicSwimFrame(asset.path,5,0,true)).toBe(0)
 }
})

it('uses dedicated sanctuary landscape, close water, metal pier and all rod parts',()=>{
 const theme=fishingEnvironment('mechsanctum')
 expect(theme).toMatchObject({id:'mechsanctum',material:'metal'})
 for(const file of [theme.src,theme.frontSrc,theme.platformSrc,'/regions/mechsanctum/scenery-v1.png','/regions/mechsanctum/map-v1.png','/region-icons/mechsanctum-v1.png'])expect(fs.existsSync('public'+file),file).toBe(true)
 expect(fishingRods.find(r=>r.id==='mechsanctum')).toMatchObject({price:1800,region:'mechsanctum'})
 for(const part of ['thumbnail','reel-frame','reel-rotor','float'])expect(fs.existsSync(batch+'/'+rodImagePath('mechsanctum',part))).toBe(true)
})
