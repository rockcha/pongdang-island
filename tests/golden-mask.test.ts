// @vitest-environment node
import fs from 'node:fs'
import sharp from 'sharp'
import {expect,it} from 'vitest'
import {mythicSwimAsset,mythicSwimLayout} from '@/features/aquarium/mythic-swim'
import {pharaohGoldenPaths} from '@/features/aquarium/pharaoh-golden-effects'
const batch='assets/storage-upload/new/20261030-104151/',read=(p:string)=>JSON.parse(fs.readFileSync(batch+p,'utf8').replace(/^\uFEFF/,'')),id='pharaoh-solar-scarab'
it('replaces the existing slot in place at the same price, with explicit floating movement',()=>{
 const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8')),s=catalog.collectible_species.find(s=>s.id===id)
 expect(s.name).toBe('천년왕조의 마지막 유산, 황금가면');expect(s.sell_price).toBe(3300)
 expect(s).toMatchObject({kind:'fish',rarity:'mythic',movement_type:'swim',swim_y_min:'0.28',swim_y_max:'0.72',speed:'0.008',travel_direction:'right',flip_with_direction:true})
 expect(catalog.collectible_species.filter(s=>s.native_region_id==='pharaoh'&&s.rarity==='mythic')).toHaveLength(4)
 expect(s.thumbnail_path).toContain('_v3_');expect(s.sprite_sheet_path).toContain('_compat_v3_')
})
it('keeps old aliases compatible while selecting the aligned golden mask sheet',()=>{
 const registration=read('registration.json')[0]
 for(const alias of [id+'_sprite.png',id+'_compat_v1_sprite.png',id+'_compat_v2_sprite.png',id+'_compat_v3_sprite.png']){
  const asset=mythicSwimAsset('fish/mythic/'+alias,'mythic')!
  expect(asset.url).toBe('/aquarium/swim/pharaoh-solar-scarab_swim8_v3_sprite.png')
  expect(mythicSwimLayout(asset.path,0)).toEqual({originX:.5,originY:.5,scale:registration.scale})
 }
})
it('preserves the entire generated mask and soul ribbons when aligning frames',async()=>{
 const r=read('registration.json')[0],source=await sharp(batch+r.normalized_source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),final=await sharp(batch+r.storage_path).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 expect(r.rawAudit.bounds.every(b=>b.minMargin>=.08)).toBe(true)
 let same=true,count=0
 for(const f of r.frames)for(let y=0;y<r.sourceCell;y++)for(let x=0;x<r.sourceCell;x++){
  const s=((Math.floor(f.frame/4)*r.sourceCell+y)*source.info.width+f.frame%4*r.sourceCell+x)*4;if(!source.data[s+3])continue
  const d=((Math.floor(f.frame/4)*r.cell+y+r.padding-f.dy)*final.info.width+f.frame%4*r.cell+x+r.padding-f.dx)*4
  count++;if(!source.data.subarray(s,s+4).equals(final.data.subarray(d,d+4)))same=false
 }
 expect(count).toBeGreaterThan(10000);expect(same).toBe(true)
 for(const p of read('final-registration.json'))for(const f of p.frames){expect(Math.max(Math.abs(f.dx),Math.abs(f.dy))).toBeLessThanOrEqual(1);expect(f.rmse).toBeLessThan(35)}
})
it('flows blue souls from both eyes, brightens during awakening and freezes for reduced motion',()=>{
 const basic=pharaohGoldenPaths(id,1),peak=pharaohGoldenPaths(id,5)
 expect(basic.filter(p=>p.color===0x5abaff)).toHaveLength(2)
 expect(peak.filter(p=>p.color===0x5abaff)).toHaveLength(2)
 expect(peak.reduce((n,p)=>n+p.alpha,0)).toBeGreaterThan(basic.reduce((n,p)=>n+p.alpha,0))
 expect(pharaohGoldenPaths(id,1)).not.toEqual(pharaohGoldenPaths(id,2))
 expect(pharaohGoldenPaths(id,5,0,true)).toEqual(pharaohGoldenPaths(id,0,0,true))
})
