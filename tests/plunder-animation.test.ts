// @vitest-environment node
import {expect,it} from 'vitest'
import fs from 'node:fs'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '../src/features/aquarium/mythic-swim'
import layouts from '../src/features/aquarium/plunder-mythic-action-layouts.json'
const root='assets/storage-upload/new/20261027-034411'
it('plays all eight registered poses in six seconds and freezes reduced motion',()=>{
 for(const sheet of layouts){
  const asset=mythicSwimAsset(`fish/mythic/${sheet.id}_swim8_v1_sprite.png`,'mythic')!
  expect(asset).toBeTruthy();expect(fs.existsSync('public'+asset.url)).toBe(true)
  const sequence=Array.from({length:600},(_,i)=>mythicSwimFrame(asset.path,i/100,0))
  expect([...new Set(sequence)].sort()).toEqual([0,1,2,3,4,5,6,7])
  for(let time=0;time<12;time+=.125){
   expect(mythicSwimFrame(asset.path,time,0,true)).toBe(0)
   expect(mythicSwimFrame(asset.path,time,0)).toBe(mythicSwimFrame(asset.path,time+6,0))
  }
  expect(new Set(sheet.shifts.map((_,frame)=>mythicSwimLayout(asset.path,frame)?.scale)).size).toBe(1)
 }
})
it('keeps raw source anatomy inside cells and uses measured opaque rigid patches',()=>{
 const audit=JSON.parse(fs.readFileSync(root+'/audit.json','utf8'))
 expect(audit.results).toHaveLength(75)
 for(const result of audit.results){expect(result.missing).toBeFalsy();expect(result.warnings).toEqual([])}
 const registration=JSON.parse(fs.readFileSync(root+'/registration.json','utf8'))
 expect(registration).toHaveLength(28)
 for(const entry of registration){
  const measured=entry.anchorRegistration
  expect(measured.patch[2]*measured.patch[3]).toBeGreaterThan(400)
  expect(measured.frames).toHaveLength(entry.storage_path.includes('swim8')?8:4)
  expect(Math.max(...measured.frames.map(f=>f.rmse))).toBeLessThan(60)
 }
})
