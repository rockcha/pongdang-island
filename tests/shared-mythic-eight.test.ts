import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import sheets from '@/features/aquarium/shared-mythic-action-layouts.json'
import {mythicSheetColumns,mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '@/features/aquarium/mythic-swim'

it('registers all seven shared mythics with eight physical poses',()=>{
 expect(sheets).toHaveLength(7)
 for(const sheet of sheets){
  const path=`fish/mythic/${sheet.id}_swim8_sprite.png`
  for(const suffix of ['_sprite.png','_compat_sprite.png','_swim8_sprite.png']){
   expect(mythicSwimAsset(`fish/mythic/${sheet.id}${suffix}`,'mythic')?.path).toBe(path)
  }
  expect(mythicSheetColumns(path)).toBe(4)
  expect(sheet.shifts).toHaveLength(8)
  const asset=mythicSwimAsset(path,'mythic')!
  const png=readFileSync('public'+asset.url)
  expect(png.readUInt32BE(16)).toBe(png.readUInt32BE(20)*2)
  const frames=Array.from({length:600},(_,i)=>mythicSwimFrame(path,i/100,0))
  expect(new Set(frames)).toEqual(new Set([0,1,2,3,4,5,6,7]))
  expect([4.01,4.51,5.01,5.51].map(t=>mythicSwimFrame(path,t,0))).toEqual([4,5,6,7])
  for(const t of [0,.5,2,3.9,4,5.99]){
   expect(mythicSwimFrame(path,t+6,123)).toBe(mythicSwimFrame(path,t,123))
   expect(mythicSwimFrame(path,t,123,true)).toBe(0)
  }
  // Registered body patch remains at one screen position across every pose.
  for(let f=0;f<8;f++){
   const layout=mythicSwimLayout(path,f)!
   expect(layout.scale).toBe(sheet.scale)
   expect((sheet.shifts[f][0]-layout.originX*sheet.cell)).toBeCloseTo(-sheet.cell/2)
   expect((sheet.shifts[f][1]-layout.originY*sheet.cell)).toBeCloseTo(-sheet.cell/2)
  }
 }
})
