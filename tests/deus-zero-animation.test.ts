import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {sharedDecorationFrame,deusZeroCompatSpritePath,deusZeroIdleSpritePath} from '@/features/aquarium/shared-decoration-animation'
import {mythicSheetColumns,mythicSwimAsset} from '@/features/aquarium/mythic-swim'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'

const root='assets/storage-upload/new/20261027-184600'
it('loads eight frames from the compatibility catalog path and keeps the statue fixed',()=>{
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 expect(catalog.collectible_species.find(s=>s.id==='mechsanctum-deus-zero')).toMatchObject({kind:'decoration',movement_type:'fixed',speed:'0',sell_price:4000,sprite_sheet_path:deusZeroCompatSpritePath})
 expect(mythicSwimAsset(deusZeroCompatSpritePath,'mythic')).toEqual({path:deusZeroIdleSpritePath,url:'/aquarium/swim/mechsanctum-deus-zero_idle8_v1_sprite.png'})
 expect(mythicSheetColumns(deusZeroIdleSpritePath)).toBe(4)
 expect(mythicSheetColumns(deusZeroCompatSpritePath)).toBe(2)
 expect(Array.from({length:8},(_,i)=>sharedDecorationFrame('mechsanctum-deus-zero',i+.1))).toEqual([0,1,2,3,4,5,6,7])
 expect(sharedDecorationFrame('mechsanctum-deus-zero',8)).toBe(0)
 expect(sharedDecorationFrame('mechsanctum-deus-zero',-1)).toBe(0)
 expect(sharedDecorationFrame('mechsanctum-deus-zero',2,true)).toBe(0)
 expect(sharedDecorationFrame('mechsanctum-deus-zero',2,false,true)).toBe(0)
 const registration=JSON.parse(readFileSync(root+'/registration.json','utf8').replace(/^\uFEFF/,''))
 for(const f of registration.frames){
  expect(f.rmse).toBeLessThan(30)
  const layout=swimFrameLayout(deusZeroIdleSpritePath,f.frame)
  expect((registration.patch[0]+f.dx-layout.originX*512)*layout.scale).toBeCloseTo((registration.patch[0]-256)*1.1)
  expect((registration.patch[1]+f.dy-layout.originY*512)*layout.scale).toBeCloseTo((registration.patch[1]-256)*1.1)
 }
 const bounds=JSON.parse(readFileSync(root+'/bounds.json','utf8'))
 for(const b of bounds.rawBounds)expect(b.margin).toBeGreaterThan(0)
 for(const b of bounds.finalBounds)expect(b.margin).toBeGreaterThanOrEqual(.08)
 expect(readFileSync(root+'/'+deusZeroIdleSpritePath).equals(readFileSync('public/aquarium/swim/mechsanctum-deus-zero_idle8_v1_sprite.png'))).toBe(true)
})
