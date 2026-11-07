import {describe,it,expect} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {fishingEnvironment} from '../src/features/fishing/fishing-environment'
import {fishingBannerPath} from '../src/features/regions/fishing-banner'
import {fishingRods} from '../src/features/fishing/fishing-rods'
import {hasExtraRodSkin} from '../src/features/fishing/extra-rod-skin-art'
import {rodThumbnailUrl} from '../src/features/fishing/rod-image-assets'

const spec=JSON.parse(readFileSync('assets/storage-upload/new/20261107-153000/specification.json','utf8'))
describe('홀로그램 심해도시 content contract',()=>{
 it('retains the complete deduplicated roster and requested sale averages',()=>{
  expect(new Set(spec.items.map((i:{id:string})=>i.id)).size).toBe(95)
  expect(new Set(spec.items.map((i:{name:string})=>i.name)).size).toBe(95)
  for(const [kind,rarity,count,average] of [['fish','common',10,65],['fish','rare',9,280],['fish','epic',9,1250],['fish','mythic',5,3500],['trash','common',12,25],['trash','rare',14,80],['decoration','common',15,40],['decoration','rare',15,155],['decoration','epic',6,900]]){
   const group=spec.items.filter((i:{kind:string;rarity:string})=>i.kind===kind&&i.rarity===rarity)
   expect(group).toHaveLength(Number(count))
   expect(group.reduce((n:number,i:{sell_price:number})=>n+i.sell_price,0)).toBe(Number(count)*Number(average))
  }
 })
 it('keeps ground creatures and the rooted fiberoptic anemone low and prevents objects swimming',()=>{
  for(const i of spec.items){
   if(i.kind==='decoration')expect(i).toMatchObject({movement_type:'fixed',speed:'0',swim_y_min:null,swim_y_max:null,flip_with_direction:false})
   if(i.kind==='trash'||i.id==='hologram-prism')expect(i).toMatchObject({movement_type:'fixed',speed:'0.001',flip_with_direction:false})
   if(i.kind!=='decoration'&&(i.movement_type==='crawl'||i.movement_type==='fixed'))expect(i.swim_y_min).toBeGreaterThanOrEqual(.8)
   if(i.kind==='fish')expect(i.frames).toBe(i.rarity==='mythic'?8:4)
  }
  expect(spec.items.find((i:{id:string})=>i.id==='hologram-glitch-crab').movement_type).toBe('crawl')
  expect(spec.items.find((i:{id:string})=>i.id==='hologram-pixel-jellyfish').movement_type).toBe('pulse')
  expect(spec.items.find((i:{id:string})=>i.id==='hologram-sweeper').movement_type).toBe('crawl')
 })
 it('uses the revised unreleased roster without the removed experimental creatures',()=>{
  const ids=spec.items.map((i:{id:string})=>i.id)
  for(const id of ['quicksilver','proto-x','proto-09','leviathan','override'])expect(ids).not.toContain('hologram-'+id)
  for(const [id,rarity] of [['sos','epic'],['sweeper','epic'],['seraphim','mythic'],['masquerade','mythic']])expect(spec.items.find((i:{id:string})=>i.id==='hologram-'+id)).toMatchObject({rarity})
 })
 it('uses two pieces of each requested rarity',()=>{
  expect(spec.mapPieces).toEqual(['common','common','rare','rare','epic','epic'])
 })
 it('loads dedicated art without falling back to starter water',()=>{
  const env=fishingEnvironment('hologram')
  expect(env.id).toBe('hologram')
  expect(new Set([env.src,env.frontSrc,env.platformSrc]).size).toBe(3)
  for(const file of [env.src,env.frontSrc,env.platformSrc,fishingBannerPath('hologram')])expect(existsSync('public'+file)).toBe(true)
 })
 it('matches the preceding regional rod price and bonuses with a usable skin',()=>{
  expect(fishingRods[0]).toMatchObject({id:'basic',price:0})
  const rod=fishingRods.find(r=>r.id==='hologram')!,previous=fishingRods.find(r=>r.id==='galaxy')!
  expect(rod.price).toBe(previous.price)
  expect(rod).toMatchObject({region:'hologram',failureReductionBp:previous.failureReductionBp,nativeBonusBp:previous.nativeBonusBp,waitReductionSeconds:previous.waitReductionSeconds})
  expect(hasExtraRodSkin('hologram')).toBe(true)
  expect(rodThumbnailUrl('hologram')).toBe('/fishing/equipment/hologram-thumbnail-v1.webp')
  expect(existsSync('public'+rodThumbnailUrl('hologram'))).toBe(true)
 })
})
