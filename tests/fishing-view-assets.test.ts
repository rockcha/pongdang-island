// @vitest-environment node
import {readFileSync,existsSync} from 'node:fs'
import {expect,it} from 'vitest'
import {fishingEnvironment,fishingEnvironments} from '@/features/fishing/fishing-environment'

it.each(Object.keys(fishingEnvironments))('has the expected camera paintings and valid local assets for %s',id=>{
 const theme=fishingEnvironment(id)
 if(['sunkenrift','nyamnyam','loveletter'].includes(id))expect(theme.src).toBe(theme.frontSrc)
 else expect(theme.src).not.toBe(theme.frontSrc)
 const sources=id==='nyamnyam'
  ? [theme.platformSrc??theme.platformFallbackSrc]
  : [...new Set([theme.src,theme.frontSrc,theme.platformSrc??theme.platformFallbackSrc])]
 for(const src of sources){
  expect(existsSync(`public${src}`)).toBe(true)
  const png=readFileSync(`public${src}`)
  expect(png.subarray(1,4).toString()).toBe('PNG')
  expect(png.readUInt32BE(16)).toBeGreaterThan(0)
  expect(png.readUInt32BE(20)).toBeGreaterThan(0)
 }
 expect(theme.waterEnd).toBeGreaterThan(0)
 expect(theme.waterEnd).toBeLessThanOrEqual(1536)
 expect(theme.frontWaterEnd).toBeGreaterThan(0)
 expect(theme.frontWaterEnd).toBeLessThanOrEqual(1536)
})
