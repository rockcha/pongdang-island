import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
it('lets Skalla unwind her tail and guarding heads without snapping across the loop seam',()=>{
 const path='fish/mythic/siren-skalla-six-shadows_swim8_sprite.png'
 const frames=Array.from({length:24},(_,i)=>mythicSwimFrame(path,(i+.5)/4,0)!)
 expect(new Set(frames)).toEqual(new Set([0,1,2,3,4,5,6,7]))
 expect(frames).toContain(7)
 for(let i=0;i<frames.length;i++){
  const next=frames[(i+1)%frames.length],current=frames[i]
  const neutralTransition=(current===0&&next===4)||(current===4&&next===0)
  expect(neutralTransition||Math.abs(next-current)<=1,`${current}->${next}`).toBe(true)
  expect(mythicSwimFrame(path,(i+.5)/4+6,0)).toBe(current)
 }
 expect(mythicSwimFrame(path,4,0,true)).toBe(0)
})
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
it('provides a reviewed action sheet with the requested frame grid for every catalog mythic creature',()=>{
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
 const refreshed=id==='atlantean-sentinel'
 const current=refreshed?JSON.parse(readFileSync('assets/storage-upload/new/20261029-055051/final-verification.json','utf8')).results.find((s:{id:string})=>s.id===id):null
 const report=current?{width:current.cell*4,height:current.cell*2,patch:current.patch,frames:current.frames.map((f:{anchor:{frame:number;dx:number;dy:number}})=>f.anchor)}:JSON.parse(readFileSync(`assets/storage-upload/new/20261017-093000/${id}-registration.json`,'utf8'))
 const cell=report.width/4
 const positions=report.frames.map((f:{frame:number;dx:number;dy:number})=>{
  const layout=mythicSwimLayout(`fish/mythic/${id}_swim8_sprite.png`,f.frame)!
  return [(report.patch[0]+f.dx-layout.originX*cell)*layout.scale,(report.patch[1]+f.dy-layout.originY*cell)*layout.scale]
 })
 const tolerance=refreshed?mythicSwimLayout(`fish/mythic/${id}_swim8_sprite.png`,0)!.scale+.001:.005
 for(const p of positions){expect(Math.abs(p[0]-positions[0][0])).toBeLessThan(tolerance);expect(Math.abs(p[1]-positions[0][1])).toBeLessThan(tolerance)}
 const asset=mythicSwimAsset(`fish/mythic/${id}_sprite.png`,'mythic')!
 const png=readFileSync('public'+asset.url)
 expect(png.readUInt32BE(16)).toBe(report.width)
 expect(png.readUInt32BE(20)).toBe(report.height)
})

it('uses the requested action durations for the new megalodon and ghost ship',()=>{
 for(const [id,duration] of [['extinction-defying-megalodon',1.8],['never-return-ghost-ship',2.4]] as const){
  const asset=mythicSwimAsset('fish/mythic/'+id+'_sprite.png','mythic')!
  expect(asset).not.toBeNull()
  const start=6-duration
  expect(mythicSwimFrame(asset.path,start-.01,0)).toBeLessThan(4)
  expect(mythicSwimFrame(asset.path,start+.01,0)).toBe(4)
  expect(mythicSwimFrame(asset.path,5.99,0)).toBe(7)
  expect(mythicSwimFrame(asset.path,5.99,0,true)).toBe(0)
  for(const time of [.1,1.1,3.7,4.8,5.8])expect(mythicSwimFrame(asset.path,time,0)).toBe(mythicSwimFrame(asset.path,time+6,0))
 }
})

it('gives the rebuilt megalodon a reversible tail beat and complete jaw recovery',()=>{
 const path='fish/mythic/extinction-defying-megalodon_swim8_sprite.png'
 expect([0,.4,.8,1.2,1.6,2].map(t=>mythicSwimFrame(path,t+.001,0))).toEqual([0,1,2,3,2,1])
 const frames=Array.from({length:600},(_,i)=>mythicSwimFrame(path,i/100,0))
 expect(new Set(frames)).toEqual(new Set([0,1,2,3,4,5,6,7]))
 expect([4.21,4.7,5.1,5.8].map(t=>mythicSwimFrame(path,t,0))).toEqual([4,5,6,7])
})

it('keeps the rebuilt megalodon inside its cells and registers its body in all eight poses',()=>{
 const root='assets/storage-upload/new/20261021-155200/'
 const read=(file:string)=>JSON.parse(readFileSync(root+file,'utf8').replace(/^\uFEFF/,''))
 const sheet=read('sprite-audit.json').sprites[0],registration=read('registration.json')
 const asset=mythicSwimAsset('fish/mythic/extinction-defying-megalodon_sprite.png','mythic')!
 expect(asset.url).toContain('_swim8_v2_sprite.png')
 expect(sheet.frames).toHaveLength(8)
 for(const f of sheet.frames){
  expect(Math.min(f.x,f.y,sheet.cellWidth-f.x-f.width,sheet.cellHeight-f.y-f.height)).toBeGreaterThan(8)
 }
 const anchors=registration.frames.map((f:{frame:number;dx:number;dy:number})=>{
  const layout=mythicSwimLayout(asset.path,f.frame)!
  return [registration.patch[0]+f.dx-layout.originX*sheet.cellWidth,registration.patch[1]+f.dy-layout.originY*sheet.cellHeight]
 })
 for(const p of anchors){expect(p[0]).toBeCloseTo(anchors[0][0]);expect(p[1]).toBeCloseTo(anchors[0][1])}
})
