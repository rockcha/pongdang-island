import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {expect,it} from 'vitest'
import {petFrameDrawLayout,petDrawLayout} from '@/features/pets/pet-draw-layout'
import {petSpecies,type PetSpeciesId} from '@/features/pets/pet-catalog'
const review=JSON.parse(readFileSync('assets/storage-upload/new/20261111-160000/horizontal-registration.json','utf8'))

it.each(petSpecies)('fixes $name horizontal head drift without changing scale or its grounded height',pet=>{
  for(const [kind,r] of Object.entries(review[pet.id]) as [string,any][]){
    expect(createHash('sha256').update(readFileSync(`public/${r.path.replace(/^public\//,'')}`)).digest('hex')).toBe(r.sourceSha256)
    expect(r.samples).toBeGreaterThan(50)
    const motion=kind==='atlas'?'happy':kind as 'idle'|'happy'|'eat'|'needs'
    const base=petDrawLayout(pet.id,motion)
    const targetX=base.x+(r.patch[0]+r.patch[2]/2)*r.cell/400*base.scale
    for(let f=0;f<r.matches.length;f++){
      const m=r.matches[f],draw=petFrameDrawLayout(pet.id as PetSpeciesId,motion,f)
      expect(m.rmse).toBeLessThan(48)
      expect(draw.size).toBe(base.size)
      const headX=draw.x+(r.patch[0]+r.patch[2]/2+m.dx)*r.cell/400*draw.scale
      expect(Math.abs(headX-targetX)).toBeLessThan(.001)
    }
  }
})
