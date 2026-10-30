import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect,it} from 'vitest'
import sprites from '../src/features/my-island/island-png-manifest.json'
import {Building} from '../src/features/my-island/island-art'
import {facilities,floorTiles} from '../src/features/my-island/island-model'
import {ownedFacilities} from '../src/features/my-island/owned-facilities'
import {facilityPng} from '../src/features/my-island/facility-png-art'

it('publishes immutable PNG URLs that match the actual bytes',()=>{
 const manifest=JSON.parse(readFileSync('assets/ui/island-front-v2/manifest.json','utf8'))
 expect(Object.keys(sprites).sort()).toEqual(manifest.assets.map(a=>a.id).sort())
 for(const f of [...facilities,...ownedFacilities()]){
  if(f.kind==='farm-plot'||f.kind==='farm-office'||f.kind==='farm-white-fence'){
   const markup=renderToStaticMarkup(<svg><Building f={f}/></svg>)
   expect(markup).toContain(f.kind==='farm-plot'?'data-farm-plot':f.kind==='farm-office'?'data-farm-office-level':'data-white-fence')
   expect(markup).not.toContain('<image')
  }else expect(facilityPng(f),f.name).toBeTruthy()
 }
 for(const tile of floorTiles)expect((sprites as Record<string,string>)['floor-'+tile.id],tile.name).toBeTruthy()
 for(const url of Object.values(sprites)){
  const bytes=readFileSync('public'+url)
  expect(url).toMatch(/^\/game-art\/island\/[a-f0-9]{24}-(256|384)\.png$/)
  expect(url).toContain(createHash('sha256').update(bytes).digest('hex').slice(0,24))
  expect(bytes.subarray(1,4).toString()).toBe('PNG')
 }
})
it('changes office details across five levels while retaining the same two-by-two footprint',()=>{
 const office=facilities.find(f=>f.kind==='farm-office')!
 expect([office.w,office.h]).toEqual([2,2])
 const variants=[1,2,3,4,5].map(level=>{
  const art=renderToStaticMarkup(<svg><Building f={office} level={level}/></svg>)
  expect(art).toContain(`data-farm-office-level="${level}"`)
  return art
 })
 expect(new Set(variants).size).toBe(5)
})
it('uses front artwork without mirroring while preserving the outer saved rotation',()=>{
 for(const kind of ['tree','pine','flowers','bench']){
  const f=facilities.find(f=>f.kind===kind)!
  for(const rotation of [0,90,180,270]){
   const markup=renderToStaticMarkup(<svg><Building f={f} rotation={rotation}/></svg>)
   expect(markup).toContain('data-png-view="front"')
   expect(markup).not.toContain('data-png-mirrored')
   expect(markup).toContain(sprites[kind as keyof typeof sprites])
   expect(markup.match(/data-facility-png/g)).toHaveLength(1)
   if(rotation)expect(markup).toContain(`data-art-rotation="${rotation}"`)
  }
 }
})
it('covers the full water crossing for every bridge length',()=>{
 for(const f of facilities.filter(f=>f.kind==='bridge')){
  const container=document.createElement('div')
  container.innerHTML=renderToStaticMarkup(<svg><Building f={f}/></svg>)
  const image=container.querySelector('image')!
  expect(Number(image.getAttribute('width'))).toBe(f.w*32)
  expect(Number(image.getAttribute('height'))).toBe(f.h*32)
 }
})
