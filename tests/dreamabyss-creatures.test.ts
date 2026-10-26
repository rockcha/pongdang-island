import {expect,it} from 'vitest'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '@/features/aquarium/mythic-swim'
const root='assets/storage-upload/new/20261026-033245'
const read=(file:string)=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''))
const manifest=read(root+'/manifest.json'),registration=read(root+'/final-registration.json')
const catalog=read('supabase/catalog/catalog.json')
it('keeps all ten creatures native to Dream Abyss with explicit movement and the requested price bands',()=>{
 expect(manifest.items).toHaveLength(10)
 const bands:Record<string,number[]>={common:[50,60],rare:[200,250],epic:[800,1000],mythic:[2500,3200]}
 for(const item of manifest.items){
  const species=catalog.collectible_species.find((s:{id:string})=>s.id===item.id)
  expect(species.native_region_id).toBe('dreamabyss')
  expect(catalog.collectible_habitats.filter((h:{species_id:string})=>h.species_id===item.id)).toEqual([{species_id:item.id,region_id:'dreamabyss'}])
  expect(species.sell_price).toBeGreaterThanOrEqual(bands[species.rarity][0]);expect(species.sell_price).toBeLessThanOrEqual(bands[species.rarity][1])
  expect(species.movement_type).toBe(item.movement_type)
  expect(Number(species.swim_y_min)).toBeLessThan(Number(species.swim_y_max))
  if(item.movement_type==='crawl')expect(Number(species.swim_y_min)).toBeGreaterThan(.8)
 }
})
for(const item of manifest.items)it(item.id+' has clean transparent frame margins, distinct poses and a measured rigid anchor',async()=>{
 const columns=item.frames===8?4:2
 const {data,info}=await sharp(root+'/'+item.sprite_sheet_path).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 expect(info.width).toBe(columns*512);expect(info.height).toBe(1024)
 const hashes=new Set<string>(),measured=registration.find((r:{storage_path:string})=>r.storage_path===item.sprite_sheet_path)
 expect(measured.frames).toHaveLength(item.frames)
 const positions=[]
 for(let frame=0;frame<item.frames;frame++){
  const crop=await sharp(root+'/'+item.sprite_sheet_path).extract({left:frame%columns*512,top:Math.floor(frame/columns)*512,width:512,height:512}).ensureAlpha().raw().toBuffer()
  hashes.add(createHash('sha256').update(crop).digest('hex'))
  let minX=512,minY=512,maxX=-1,maxY=-1,opaque=0
  for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(crop[(y*512+x)*4+3]>=32){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);opaque++}
  expect(opaque).toBeGreaterThan(1500);expect(Math.min(minX,minY,511-maxX,511-maxY)).toBeGreaterThanOrEqual(30)
  const f=measured.frames[frame]
  expect(f.rmse).toBeLessThan(35);expect(Math.abs(f.dx)).toBeLessThanOrEqual(3);expect(Math.abs(f.dy)).toBeLessThanOrEqual(3)
  const layout=item.frames===8?mythicSwimLayout(mythicSwimAsset(item.sprite_sheet_path,'mythic')!.path,frame)!:swimFrameLayout(item.sprite_sheet_path,frame)
  positions.push([(measured.patch[0]+f.dx-layout.originX*512)*layout.scale,(measured.patch[1]+f.dy-layout.originY*512)*layout.scale,layout.scale])
 }
 expect(hashes.size).toBe(item.frames)
 for(const p of positions){expect(p[0]).toBeCloseTo(positions[0][0]);expect(p[1]).toBeCloseTo(positions[0][1]);expect(p[2]).toBe(positions[0][2])}
 expect(info.channels).toBe(4);expect(data[3]).toBe(0)
})
it('retains eight percent padding in the unprocessed mythic and plays all eight poses in a six second cycle',()=>{
 const raw=read(root+'/raw-audit.json').find((a:{id:string})=>a.id==='dreamabyss-ancient-sleeper')
 for(const [x,y,w,h] of raw.frames)expect(Math.min(x,y,raw.cell-x-w,raw.cell-y-h)).toBeGreaterThanOrEqual(raw.cell*.08)
 const item=manifest.items.find((i:{frames:number})=>i.frames===8),asset=mythicSwimAsset(item.sprite_sheet_path,'mythic')!
 expect(mythicSwimAsset(item.catalog_sprite_sheet_path,'mythic')).toEqual(asset)
 const compatibility=fs.readFileSync(root+'/'+item.catalog_sprite_sheet_path)
 expect(compatibility.readUInt32BE(16)).toBe(compatibility.readUInt32BE(20))
 expect(asset.url).toContain('_swim8_v1_sprite.png')
 const poses=new Set()
 for(let i=0;i<120;i++){const t=i/20;poses.add(mythicSwimFrame(asset.path,t,0));expect(mythicSwimFrame(asset.path,t+6,0)).toBe(mythicSwimFrame(asset.path,t,0));expect(mythicSwimFrame(asset.path,t,0,true)).toBe(0)}
 expect(poses).toEqual(new Set([0,1,2,3,4,5,6,7]))
})
