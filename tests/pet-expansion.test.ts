import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {expect,it} from 'vitest'
import {petSpecies,petUsesAtlas,petJobsFor,petJobRewards,petJobDuration} from '@/features/pets/pet-catalog'
import {createPetPreview,restorePetPreview,petPreviewReducer} from '@/features/pets/pet-preview-model'
import {petAtlasFrame} from '@/features/pets/pet-atlas'
import {createPetBlinkSchedule} from '@/features/pets/pet-idle-animation'
const now=1_800_000_000_000
const base='assets/storage-upload/new/20261111-160000'
const manifest=JSON.parse(readFileSync(`${base}/manifest.json`,'utf8'))
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex')
it('ships all ten new character identities, sixteen-state sheets and transparent padding',async()=>{
  expect(manifest.items.map((p:{id:string})=>p.id)).toEqual(petSpecies.filter(p=>petUsesAtlas(p.id)).map(p=>p.id))
  for(const entry of manifest.items){
    const bytes=readFileSync(`public/${entry.sprite_sheet_path}`)
    expect(sha(bytes)).toBe(entry.sprite_sha256)
    expect(sha(readFileSync(`${base}/${entry.source}`))).toBe(entry.source_sha256)
    expect(sha(readFileSync(`public/${entry.thumbnail_path}`))).toBe(entry.thumbnail_sha256)
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    expect([info.width,info.height]).toEqual([1280,1280])
    let filled=0,marginAlpha=0
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
      const a=data[(y*info.width+x)*4+3],cx=x%320,cy=y%320
      if(cx<32||cx>=288||cy<32||cy>=288)marginAlpha=Math.max(marginAlpha,a)
      if(a>=128)filled++
    }
    expect(filled).toBeGreaterThan(info.width*info.height*.1)
    expect(marginAlpha,`${entry.id} frame padding`).toBe(0)
    const neutral=await sharp(bytes).extract({left:0,top:0,width:320,height:320}).raw().toBuffer()
    for(const i of [2,4,8,12,14]){
      const pose=await sharp(bytes).extract({left:i%4*320,top:Math.floor(i/4)*320,width:320,height:320}).raw().toBuffer()
      expect(sha(pose)).not.toBe(sha(neutral))
    }
  }
},30000)
it('blinks on every resting emotion, holds the same stage and respects reduced motion',()=>{
  const schedule=createPetBlinkSchedule(42),at=schedule.starts[1]
  for(const [clip,base] of [['idleA',0],['hungry',4],['lonely',8]] as const){
    expect(petAtlasFrame(clip,0,schedule)).toBe(base)
    expect(petAtlasFrame(clip,at+150,schedule)).toBe(base+2)
    expect(petAtlasFrame(clip,at+350,schedule)).toBe(base)
    expect(petAtlasFrame(clip,at+150,schedule,true)).toBe(base)
  }
})
it('upgrades a previous sandbox once without resetting old names or resurrecting later sales',()=>{
  const old=createPetPreview(now);old.pets=old.pets.slice(0,4);old.nextId=5;delete old.catalogVersion
  old.pets[0].name='나의 친구';old.pets[0].level=4
  const restored=restorePetPreview(JSON.stringify(old),now)
  expect(restored.pets).toHaveLength(14)
  expect(restored.pets[0]).toMatchObject({name:'나의 친구',level:4})
  const sold=petPreviewReducer(restored,{type:'sell',id:restored.pets[4].id,now})
  expect(restorePetPreview(JSON.stringify(sold),now).pets).toHaveLength(13)
  const added=petPreviewReducer(sold,{type:'add-pet',speciesId:'maple-panda',now})
  expect(new Set(added.pets.map(p=>p.id)).size).toBe(14)
})
it('keeps balanced job rates, two jobs per species and the enhancement ceiling at fifteen percent',()=>{
  for(const species of petSpecies){
    const jobs=petJobsFor(species.id)
    expect(jobs).toHaveLength(2)
    for(const j of jobs){
      expect((j.min+j.max)/2/(j.minutes/60)).toBeGreaterThanOrEqual(170)
      expect((j.min+j.max)/2/(j.minutes/60)).toBeLessThanOrEqual(200)
      const range=petJobRewards(j,5)
      expect(Math.abs(range.min-j.min*1.15)).toBeLessThanOrEqual(.500001)
      expect(Math.abs(range.max-j.max*1.15)).toBeLessThanOrEqual(.500001)
    }
  }
  expect(petJobDuration(90)).toBe('1시간 30분')
  expect(petJobRewards({min:270,max:330},5)).toEqual({min:311,max:380})
})
