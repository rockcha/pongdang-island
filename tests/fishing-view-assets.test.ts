// @vitest-environment node
import {readFileSync,existsSync} from 'node:fs'
import {expect,it} from 'vitest'
import {fishingEnvironment,fishingEnvironments} from '@/features/fishing/fishing-environment'

it.each(Object.keys(fishingEnvironments))('has separate front and top paintings and valid terrain for %s',id=>{
 const theme=fishingEnvironment(id)
 expect(theme.src).not.toBe(theme.frontSrc)
 for(const src of [theme.src,theme.frontSrc,theme.platformSrc??theme.platformFallbackSrc]){
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
