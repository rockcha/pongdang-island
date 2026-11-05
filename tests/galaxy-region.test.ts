import {describe,it,expect} from 'vitest'
import {fishingEnvironment} from '../src/features/fishing/fishing-environment'
import {fishingBannerPath} from '../src/features/regions/fishing-banner'
import {fishingRods} from '../src/features/fishing/fishing-rods'
import {hasExtraRodSkin} from '../src/features/fishing/extra-rod-skin-art'
import {readFileSync} from 'node:fs'

const manifest=JSON.parse(readFileSync('assets/storage-upload/new/20261105-033000/manifest.json','utf8'))
describe('은하수의 끝자락 content contract',()=>{
 it('requires three rare and three epic map pieces',()=>{
  expect(manifest.map_piece_rarities).toEqual(['rare','rare','rare','epic','epic','epic'])
 })
 it('preserves the complete roster and requested per-kind sale averages',()=>{
  const expected=[['fish','common',15,60],['fish','rare',12,260],['fish','epic',8,1450],['fish','mythic',7,3300],['trash','common',19,25],['trash','rare',19,80],['decoration','common',14,40],['decoration','rare',16,155],['decoration','epic',2,900]]
  expect(new Set(manifest.items.map((i:{id:string})=>i.id)).size).toBe(112)
  for(const [kind,rarity,count,average] of expected){
   const group=manifest.items.filter((i:{kind:string;rarity:string})=>i.kind===kind&&i.rarity===rarity)
   expect(group).toHaveLength(Number(count))
   expect(group.reduce((sum:number,i:{sell_price:number})=>sum+i.sell_price,0)).toBe(Number(count)*Number(average))
  }
 })
 it('keeps crawling creatures low and lunar structures stationary',()=>{
  for(const i of manifest.items){
   expect(['swim','crawl','pulse','fixed']).toContain(i.movement_type)
   if(i.movement_type==='crawl')expect(i.swim_y_min).toBeGreaterThanOrEqual(.8)
   if(i.kind==='fish'&&i.movement_type==='fixed'){
    expect(i.flip_with_direction).toBe(false)
    expect(i.swim_y_min).toBeGreaterThanOrEqual(.8)
    expect(i.action).toBeTruthy()
   }
  }
 })
 it('uses dedicated cosmic water, scenery and platform without falling back to the starter sea',()=>{
  const environment=fishingEnvironment('galaxy')
  expect(environment.id).toBe('galaxy')
  expect(environment.src).toContain('/galaxy-v2.png')
  expect(environment.frontSrc).not.toBe(environment.src)
  expect(environment.platformSrc).not.toBe(environment.frontSrc)
  expect(fishingBannerPath('galaxy')).toBe('/regions/galaxy/overview-v2.png')
 })
 it('provides regional rod skin and existing regional bonuses',()=>{
  expect(hasExtraRodSkin('galaxy')).toBe(true)
  expect(fishingRods.find(r=>r.id==='galaxy')).toMatchObject({region:'galaxy',price:2800,failureReductionBp:200,nativeBonusBp:200,waitReductionSeconds:1})
 })
})
