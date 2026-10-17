import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
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
