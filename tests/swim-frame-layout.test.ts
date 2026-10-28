import {expect,it} from 'vitest'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'

it('keeps the thread snail shell stationary instead of anchoring its stretching face',()=>{
 // Shell-spiral patch positions measured from the four 627px atlas cells.
 const anchors=[[255,340],[235,360],[257,306],[245,306]]
 const path='fish/normal/siren-thread-snail_sprite.png'
 const first=swimFrameLayout(path,0)
 for(const [frame,[x,y]] of anchors.entries()){
  const layout=swimFrameLayout(path,frame)
  expect(layout.scale).toBe(first.scale)
  expect((y-layout.originY*627)*layout.scale).toBeCloseTo((340-first.originY*627)*first.scale)
  for(const flipped of [false,true]){
   const origin=flipped?1-layout.originX:layout.originX
   expect(((flipped?627-x:x)-origin*627)*layout.scale).toBeCloseTo((flipped?313.5-255:255-313.5)*first.scale)
  }
 }
})

it('anchors the whale body at the same position through all four frames and both headings',()=>{
 const measurements=[[0,0,1],[-1,1,.94],[3,-17,.94],[0,-17,.98]]
 const reference={x:72,y:57}
 for(const [frame,[dx,dy,scale]] of measurements.entries()){
  const layout=swimFrameLayout('fish/epic/pongdang-whale_sprite.png',frame)
  const point={x:48+(reference.x-48)*scale+dx,y:48+(reference.y-48)*scale+dy}
  expect((point.y-layout.originY*96)*layout.scale).toBeCloseTo(reference.y-48)
  expect((point.x-layout.originX*96)*layout.scale).toBeCloseTo(reference.x-48)
  const mirroredOrigin=1-layout.originX
  expect((96-mirroredOrigin*96-point.x)*layout.scale).toBeCloseTo(-(reference.x-48))
 }
})

it('preserves existing stable sheets including filefish',()=>{
 expect(swimFrameLayout('fish/normal/round-filefish_sprite.png',3)).toEqual({originX:.5,originY:.5,scale:1})
})

it.each([
 ['fish/rare/silver-mist-goby_sprite.png',[[0,0],[-1,0],[4,-48],[-1,-48]]],
 ['fish/epic/muk-landscape-back-carp_sprite.png',[[0,0],[-35,1],[9,-60],[-41,-61]]],
 ['fish/epic/starpattern-manta_sprite.png',[[0,0],[-45,0],[6,-80],[-28,-79]]],
] as const)('keeps the measured head stationary through every frame and heading: %s',(path,offsets)=>{
 const anchor={x:510,y:350}
 const first=swimFrameLayout(path,0)
 for(const [frame,[dx,dy]] of offsets.entries()){
  const layout=swimFrameLayout(path,frame)
  expect(layout.scale).toBe(first.scale)
  for(const flipped of [false,true]){
   const x=anchor.x+dx,origin=flipped?1-layout.originX:layout.originX
   expect(((flipped?627-x:x)-origin*627)*layout.scale).toBeCloseTo((flipped?313.5-anchor.x:anchor.x-313.5)*first.scale)
   expect((anchor.y+dy-layout.originY*627)*layout.scale).toBeCloseTo((anchor.y-313.5)*first.scale)
  }
 }
})

it.each([
 ['fish/rare/sea-crocodile_sprite.png',[357.195,358.911,288.804,293.595]],
 ['fish/normal/soft-sea-cucumber_sprite.png',[423.312,423.074,342.513,344.394]],
 ['fish/normal/pink-scallop_sprite.png',[361.670,373.779,292.525,290.878]],
] as const)('registers the reviewed head/body anchor without resizing %s',(path,measurements)=>{
 const y=measurements.map((value,frame)=>(value/627-swimFrameLayout(path,frame).originY)*88)
 expect(Math.max(...y)-Math.min(...y)).toBeLessThan(.01)
 expect([0,1,2,3].every(frame=>swimFrameLayout(path,frame).scale===1)).toBe(true)
})

it('stabilizes the refreshed right-facing crocodile head without changing size',()=>{
 const ys=[329.120,330.181,287.052,289.791],xs=[563,556,563,558]
 const x=xs.map((value,frame)=>(value/627-swimFrameLayout('fish/rare/sea-crocodile-v2_sprite.png',frame).originX)*88)
 const y=ys.map((value,frame)=>(value/627-swimFrameLayout('fish/rare/sea-crocodile-v2_sprite.png',frame).originY)*88)
 expect(Math.max(...x)-Math.min(...x)).toBeLessThan(.01)
 expect(Math.max(...y)-Math.min(...y)).toBeLessThan(.01)
})

it('applies the measured coral head and root translations without frame scaling',async()=>{
 const {readFileSync}=await import('node:fs')
 const rows=JSON.parse(readFileSync('assets/storage-upload/new/20261015-192806/frame-registration.json','utf8').replace(/^\uFEFF/,'')) as {storage_path:string;frames:{frame:number;dx:number;dy:number}[]}[]
 expect(rows).toHaveLength(11)
 for(const row of rows)for(const frame of row.frames){
  const layout=swimFrameLayout(row.storage_path,frame.frame)
  expect((frame.dx/627-layout.originX)*132).toBeCloseTo(-66,2)
  expect((frame.dy/627-layout.originY)*132).toBeCloseTo(-66,2)
  expect(layout.scale).toBe(1)
 }
})
it('registers the walking giant crab head while its legs and pincers move',async()=>{
 const {readFileSync}=await import('node:fs')
 const row=JSON.parse(readFileSync('assets/storage-upload/new/20261015-195827/frame-registration.json','utf8').replace(/^\uFEFF/,'')) as {storage_path:string;frames:{frame:number;dx:number;dy:number}[]}
 for(const frame of row.frames){
  const layout=swimFrameLayout(row.storage_path,frame.frame)
  expect((frame.dx/627-layout.originX)*132).toBeCloseTo(-66,2)
  expect((frame.dy/627-layout.originY)*132).toBeCloseTo(-66,2)
  expect(layout.scale).toBe(1)
 }
})
it('stabilizes shared ocean sprites using measured rigid anchors',async()=>{
 const {readFileSync}=await import('node:fs')
 const rows=JSON.parse(readFileSync('assets/storage-upload/new/20261015-201817/frame-registration.json','utf8').replace(/^\uFEFF/,'')) as {storage_path:string;frames:{frame:number;dx:number;dy:number}[]}[]
 expect(rows).toHaveLength(15)
 for(const row of rows)for(const frame of row.frames){
  const layout=swimFrameLayout(row.storage_path,frame.frame)
  expect((frame.dx/627-layout.originX)*132).toBeCloseTo(-66,2)
  expect((frame.dy/627-layout.originY)*132).toBeCloseTo(-66,2)
  expect(layout.scale).toBe(1)
 }
})
it('anchors animated decoration bases independently of lids and rotating parts',async()=>{
 const {readFileSync}=await import('node:fs')
 const rows=JSON.parse(readFileSync('assets/storage-upload/new/20261015-204537/frame-registration.json','utf8').replace(/^\uFEFF/,'')) as {storage_path:string;frames:{frame:number;dx:number;dy:number}[]}[]
 expect(rows).toHaveLength(4)
 for(const row of rows)for(const f of row.frames){
  const layout=swimFrameLayout(row.storage_path,f.frame)
  expect((f.dx/627-layout.originX)*132).toBeCloseTo(-66,2)
  expect((f.dy/627-layout.originY)*132).toBeCloseTo(-66,2)
  expect(layout.scale).toBe(1)
 }
})
it('registers the rigid structures of the five additional animated decorations',async()=>{
 const {readFileSync}=await import('node:fs')
 const rows=JSON.parse(readFileSync('assets/storage-upload/new/20261015-205549/frame-registration.json','utf8').replace(/^\uFEFF/,'')) as {storage_path:string;frames:{frame:number;dx:number;dy:number}[]}[]
 expect(rows).toHaveLength(5)
 for(const row of rows)for(const f of row.frames){
  const layout=swimFrameLayout(row.storage_path,f.frame)
  expect((f.dx/627-layout.originX)*132).toBeCloseTo(-66,2)
  expect((f.dy/627-layout.originY)*132).toBeCloseTo(-66,2)
  expect(layout.scale).toBe(1)
 }
})
it('keeps the moon archive base stable while bookmarks move',()=>{
 const offsets=[[0,0],[-26,0],[0,-26],[-26,-26]]
 for(const [frame,[x,y]] of offsets.entries()){
  const layout=swimFrameLayout('decorations/epic/lunea-record-shelf_sprite.png',frame)
  expect((x/627-layout.originX)*100).toBeCloseTo(-50,2)
  expect((y/627-layout.originY)*100).toBeCloseTo(-50,2)
 }
})
it('stabilizes Atlantis heads and decoration bases without rescaling frames',async()=>{
 const {readFileSync}=await import('node:fs')
 const {starruinsArtUrl}=await import('@/features/aquarium/starruins-art')
 const {mythicSwimAsset,mythicSwimLayout}=await import('@/features/aquarium/mythic-swim')
 const refreshed=JSON.parse(readFileSync('assets/storage-upload/new/20261029-055051/final-verification.json','utf8')).results
 const rows=JSON.parse(readFileSync('assets/storage-upload/new/20261015-213344/frame-registration.json','utf8').replace(/^\uFEFF/,'')) as {storage_path:string;frames:{frame:number;dx:number;dy:number}[]}[]
 expect(rows).toHaveLength(15)
 for(const row of rows){
  const id=row.storage_path.split('/').pop()!.replace('_sprite.png','')
  const current=starruinsArtUrl(row.storage_path)?refreshed.find((s:{id:string})=>s.id===id):undefined
  if(current){
   const enhanced=mythicSwimAsset(row.storage_path,'mythic')
   for(const f of current.frames){
    const layout=enhanced?mythicSwimLayout(enhanced.path,f.frame)!:swimFrameLayout(row.storage_path,f.frame)
    expect(layout.originX).toBe(.5)
    expect(layout.originY).toBe(.5)
    expect(layout.scale).toBe(current.displayScale)
    expect(Math.abs(f.anchor.dx)).toBeLessThanOrEqual(1)
    expect(Math.abs(f.anchor.dy)).toBeLessThanOrEqual(1)
   }
  }else for(const f of row.frames){
  const layout=swimFrameLayout(row.storage_path,f.frame)
  expect((f.dx/627-layout.originX)*132).toBeCloseTo(-66,2)
  expect((f.dy/627-layout.originY)*132).toBeCloseTo(-66,2)
  expect(layout.scale).toBe(1)
  }
 }
})
it('anchors the walking sentinel head while feet alternate',()=>{
 const offsets=[[0,0],[-9,0],[1,-21],[-9,-22]]
 for(const [frame,[x,y]] of offsets.entries()){
  const layout=swimFrameLayout('fish/mythic/atlantean-sentinel-walk_sprite.png',frame)
  expect((x/627-layout.originX)*150).toBeCloseTo(-75,2)
  expect((y/627-layout.originY)*150).toBeCloseTo(-75,2)
  expect(layout.scale).toBe(1)
 }
})
it('stabilizes sand and stone bases in the five aquatic plant animations',async()=>{
 const {readFileSync}=await import('node:fs')
 const rows=JSON.parse(readFileSync('assets/storage-upload/new/20261015-225310/frame-registration.json','utf8').replace(/^\uFEFF/,'')) as {storage_path:string;frames:{frame:number;dx:number;dy:number}[]}[]
 expect(rows).toHaveLength(5)
 for(const row of rows)for(const f of row.frames){
  const layout=swimFrameLayout(row.storage_path,f.frame)
  expect((f.dx/627-layout.originX)*100).toBeCloseTo(-50,2)
  expect((f.dy/627-layout.originY)*100).toBeCloseTo(-50,2)
  expect(layout.scale).toBe(1)
 }
})
