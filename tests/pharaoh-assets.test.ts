// @vitest-environment node
import {expect,it} from 'vitest'
import fs from 'node:fs'
import sharp from 'sharp'
import {mythicSwimAsset,mythicSwimFrame} from '@/features/aquarium/mythic-swim'
const root='assets/storage-upload/new/20261030-044000/'
const read=(p:string)=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''))
it('keeps all 30 original sheets clear of cell edges before export',()=>{
 const a=read('raw-sprite-audit.json').assets
 expect(a).toHaveLength(30)
 for(const s of a){expect(s.valid,s.id).toBe(true);expect(s.frames).toHaveLength(s.id.includes('scarab')||s.id.includes('anubis')||s.id.includes('colossus')||s.id.includes('horus')?8:4)}
 expect(read('audit.json').results.every(r=>!r.missing&&!r.warnings.length)).toBe(true)
})
it('preserves source pixels and encodes measured anchors in the PNG without runtime double correction',()=>{
 const r=read('registration.json')
 expect(r).toHaveLength(30)
 for(const s of r)expect(s.rgbaPreserved,s.id).toBe(true)
 for(const n of [4,8])for(const s of read(`final-registered-${n}.json`))for(const f of s.frames){expect([f.dx,f.dy],s.storage_path+' '+f.frame).toEqual([0,0]);expect(f.rmse).toBeLessThan(60)}
})
it('plays all eight mythical poses over six seconds and freezes on frame zero',()=>{
 const mythics=read('manifest.json').items.filter(i=>i.rarity==='mythic')
 expect(mythics).toHaveLength(4)
 for(const i of mythics){const a=mythicSwimAsset(i.sprite_sheet_path,'mythic')!;expect(a).not.toBeNull();expect(new Set(Array.from({length:120},(_,n)=>mythicSwimFrame(a.path,n/20,0)))).toEqual(new Set([0,1,2,3,4,5,6,7]));expect(mythicSwimFrame(a.path,5,0,true)).toBe(0)}
})
it('serves old clients a real 2x2 sheet while new clients resolve eight poses',async()=>{
 const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
 for(const s of catalog.collectible_species.filter(s=>s.native_region_id==='pharaoh'&&s.rarity==='mythic')){
  expect(s.sprite_sheet_path).toMatch(/_compat_v\d+_sprite\.png$/)
  const manifests=JSON.parse(fs.readFileSync('assets/references/mythic-sprites/sources.json','utf8')).manifests as string[]
  const compat=manifests.map(p=>p.slice(0,p.lastIndexOf('/')+1)+s.sprite_sheet_path).find(p=>fs.existsSync(p))!
  expect(compat).toBeTruthy()
  const meta=await sharp(compat).metadata(),cell=meta.width!/2
  expect(meta.width).toBe(meta.height)
  const enhanced=mythicSwimAsset(s.sprite_sheet_path,'mythic')!
  expect(enhanced).not.toBeNull()
  const canonical='public'+enhanced.url
  for(let frame=0;frame<4;frame++){
   const a=await sharp(compat).extract({left:frame%2*cell,top:Math.floor(frame/2)*cell,width:cell,height:cell}).ensureAlpha().raw().toBuffer()
   const b=await sharp(canonical).extract({left:frame*cell,top:0,width:cell,height:cell}).ensureAlpha().raw().toBuffer()
   expect(a.equals(b),s.id+' basic pose '+frame).toBe(true)
  }
 }
})
