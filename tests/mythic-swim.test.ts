import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
it('anchors Siren to her face rather than the moving wing in every pose',()=>{
 const path='fish/mythic/siren-siren-last-song_swim8_sprite.png'
 const faceShifts=[[0,0],[-7.5,-1],[-22,-3],[-24.5,-1],[-21,-47.5],[-39.5,-45.5],[-56,-47.5],[-26.5,-47.5]]
 const positions=faceShifts.map(([x,y],frame)=>{
  const layout=mythicSwimLayout(path,frame)!
  return [(360+x-layout.originX*443.5)*layout.scale,(198+y-layout.originY*443.5)*layout.scale]
 })
 for(const position of positions){
  expect(position[0]).toBeCloseTo(positions[0][0])
  expect(position[1]).toBeCloseTo(positions[0][1])
 }
})
it('keeps new action sheets clear of frame edges with one scale and a registered body anchor',()=>{
 const root='assets/storage-upload/new/mythic-eight-actions/'
 const read=(file:string)=>JSON.parse(readFileSync(root+file,'utf8').replace(/^\uFEFF/,''))
 const audit=read('sprite-audit.json'),registration=read('registration.json')
 expect(audit.sprites).toHaveLength(10)
 for(const sheet of audit.sprites){
  expect(sheet.width/sheet.height).toBe(2)
  expect(sheet.frames).toHaveLength(8)
  for(const f of sheet.frames){
   expect(Math.min(f.x,f.y,sheet.cellWidth-f.x-f.width,sheet.cellHeight-f.y-f.height)).toBeGreaterThan(8)
  }
 }
 for(const r of registration){
  const cell=443.5
  const poses=r.frames.map((f:{frame:number;dx:number;dy:number})=>{
   const layout=mythicSwimLayout(r.storage_path,f.frame)!
   return [(r.patch[0]+f.dx-layout.originX*cell)*layout.scale,(r.patch[1]+f.dy-layout.originY*cell)*layout.scale,layout.scale]
  })
  for(const p of poses){expect(p[0]).toBeCloseTo(poses[0][0]);expect(p[1]).toBeCloseTo(poses[0][1]);expect(p[2]).toBe(poses[0][2])}
 }
})
it('provides an eight-frame action sheet for every catalog mythic creature',()=>{
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const creatures=catalog.collectible_species.filter((s:{kind:string;rarity:string})=>s.kind==='fish'&&s.rarity==='mythic')
 for(const creature of creatures){
  const asset=mythicSwimAsset(creature.sprite_sheet_path,creature.rarity)
  expect(asset,creature.id).not.toBeNull()
  const png=readFileSync('public'+asset!.url)
  expect(png.readUInt32BE(16)/png.readUInt32BE(20),creature.id).toBe(2)
  for(const time of [0,1,3.5,4,5,5.9])expect(mythicSwimFrame(asset!.path,time+6,17)).toBe(mythicSwimFrame(asset!.path,time,17))
  expect(mythicSwimFrame(asset!.path,5,17,true)).toBe(0)
 }
})
it('keeps the repaired leviathan head aligned and all four poses inside their cells',()=>{
 const root='assets/storage-upload/new/leviathan-frame-fix/'
 const read=(file:string)=>JSON.parse(readFileSync(root+file,'utf8').replace(/^\uFEFF/,''))
 const audit=read('sprite-audit.json').sprites[0]
 for(const f of audit.frames){
  expect(f.x).toBeGreaterThan(20)
  expect(f.y).toBeGreaterThan(20)
  expect(f.x+f.width).toBeLessThan(audit.cellWidth-20)
  expect(f.y+f.height).toBeLessThan(audit.cellHeight-20)
 }
 const registration=read('registration.json')
 const positions=registration.frames.map((f:{frame:number;dx:number;dy:number})=>{
  const layout=swimFrameLayout('fish/mythic/god-devouring-leviathan_sprite.png',f.frame)
  return [(490+f.dx-layout.originX*627)*layout.scale,(310+f.dy-layout.originY*627)*layout.scale]
 })
 for(const p of positions){expect(p[0]).toBeCloseTo(positions[0][0]);expect(p[1]).toBeCloseTo(positions[0][1])}
})
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout,mythicDetailedPaths,luneaDetailedSwimPath} from '@/features/aquarium/mythic-swim'
it('only replaces reviewed mythic sheets',()=>{
 const path='fish/mythic/lunea-mistmoon-goddess_sprite.png'
 expect(mythicSwimAsset(path,'mythic')?.path).toBe(luneaDetailedSwimPath)
 expect(mythicSwimAsset(path,'epic')).toBeNull()
 expect(mythicSwimAsset('fish/mythic/other.png','mythic')).toBeNull()
})
it.each([
 ['atlantean-sentinel','atlantean-sentinel-walk'],
 ['pongi-explorer','pongi-explorer-cruise'],
 ['ancient-coral-giant-crab','ancient-coral-giant-crab-walk'],
 ['dawn-narwhal','dawn-narwhal'],
])('maps both current and older %s paths to the detailed sheet',(id,alias)=>{
 for(const name of [id,alias])expect(mythicSwimAsset(`fish/mythic/${name}_sprite.png`,'mythic')?.path).toBe(`fish/mythic/${id}_swim8_sprite.png`)
 expect(mythicSwimAsset(`fish/mythic/${alias}_sprite.png`,'epic')).toBeNull()
})
it.each(mythicDetailedPaths)('uses the same six-second action cycle for %s',path=>{
 for(const time of [0,.1,1.7,3.4,4.8,5.9])expect(mythicSwimFrame(path,time+6,19433)).toBe(mythicSwimFrame(path,time,19433))
 expect(mythicSwimFrame(path,5,99,true)).toBe(0)
 expect(new Set(Array.from({length:8},(_,f)=>mythicSwimLayout(path,f)?.scale)).size).toBe(1)
})
it('cycles all eight swimming poses and freezes for reduced motion',()=>{
 expect(Array.from({length:8},(_,f)=>mythicSwimFrame(luneaDetailedSwimPath,10/3+f/3+.001,0))).toEqual([0,1,2,3,4,5,6,7])
 expect(mythicSwimFrame(luneaDetailedSwimPath,6.001,0)).toBe(0)
 for(const time of [0,1,3.4,4.8,5.9])expect(mythicSwimFrame(luneaDetailedSwimPath,time+6,0)).toBe(mythicSwimFrame(luneaDetailedSwimPath,time,0))
 expect(mythicSwimFrame(luneaDetailedSwimPath,4,3,true)).toBe(0)
 expect(mythicSwimFrame('other.png',4,0)).toBeNull()
})
it('keeps the measured chest stationary through all poses in both directions',()=>{
 const measured=[[0,0],[1,0],[2,1],[-7,1],[-6,-36],[0,-36],[3,-36],[3,-36]]
 const positions=measured.map(([dx,dy],frame)=>{
  const layout=mythicSwimLayout(luneaDetailedSwimPath,frame)!
  return {x:(324+dx-layout.originX*443.5)*layout.scale,y:(248+dy-layout.originY*443.5)*layout.scale}
 })
 for(const sign of [1,-1])for(const p of positions){expect(sign*p.x).toBeCloseTo(sign*positions[0].x);expect(p.y).toBeCloseTo(positions[0].y)}
})
it.each(['atlantean-sentinel','pongi-explorer','ancient-coral-giant-crab','dawn-narwhal'])('aligns the registered rigid body for %s',id=>{
 const batch=id==='atlantean-sentinel'?'20261017-095349':'20261017-093000'
 const report=JSON.parse(readFileSync(`assets/storage-upload/new/${batch}/${id}-registration.json`,'utf8'))
 const cell=report.width/4
 const positions=report.frames.map((f:{frame:number;dx:number;dy:number})=>{
  const layout=mythicSwimLayout(`fish/mythic/${id}_swim8_sprite.png`,f.frame)!
  return [(report.patch[0]+f.dx-layout.originX*cell)*layout.scale,(report.patch[1]+f.dy-layout.originY*cell)*layout.scale]
 })
 for(const p of positions){expect(p[0]).toBeCloseTo(positions[0][0]);expect(p[1]).toBeCloseTo(positions[0][1])}
 const png=readFileSync(`public/aquarium/swim/${id}_swim8_sprite.png`)
 expect(png.readUInt32BE(16)).toBe(report.width)
 expect(png.readUInt32BE(20)).toBe(report.height)
})
