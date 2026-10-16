import {expect,it} from 'vitest'
import reviewed from '@/features/aquarium/artwork-facing.json'
import {movementSettings,shouldFlipSpecies,speciesFacing} from '@/features/aquarium/movement-settings'
import type {Species} from '@/features/collection/api'

const species=(settings:Partial<Species>={}):Species=>({id:'test',kind:'fish',name:'test',description:'',swim_y_min:.2,swim_y_max:.8,speed:.05,size:60,rarity:'common',sprite_sheet_path:null,thumbnail_path:'unknown.png',sell_price:30,...settings})

it.each(reviewed)('faces the travel direction for reviewed artwork: $id',art=>{
 const fish=species({sprite_sheet_path:art.path,flip_with_direction:true})
 expect(speciesFacing(fish)).toBe(art.facing==='left'?'left':'right')
 for(const direction of [-1,1]){
  const flipped=shouldFlipSpecies(fish,direction)
  {
   expect(movementSettings(fish).flip).toBe(true)
   const original=art.facing==='left'?-1:1
   expect(flipped?-original:original).toBe(direction)
  }
 }
})

it('preserves reviewed left artwork even with stale DB facing values',()=>{
 const fish=species({sprite_sheet_path:'fish/normal/bean-pufferfish_sprite.png',facing_direction:'right'})
 expect(shouldFlipSpecies(fish,1)).toBe(true)
 expect(shouldFlipSpecies(fish,-1)).toBe(false)
})

it('keeps legacy unknown images, explicit disabled flipping and fixed objects compatible',()=>{
 expect(shouldFlipSpecies(species(),-1)).toBe(true)
 expect(shouldFlipSpecies(species({flip_with_direction:false,facing_direction:'left'}),1)).toBe(true)
 expect(shouldFlipSpecies(species({kind:'decoration',facing_direction:'left'}),1)).toBe(false)
 expect(shouldFlipSpecies(species({facing_direction:'left'}),0)).toBe(false)
})

it.each(['swim','pulse','crawl'] as const)('always turns right-facing fish toward their travel direction for %s',movement_type=>{
 const fish=species({movement_type,facing_direction:'right',flip_with_direction:false})
 expect(shouldFlipSpecies(fish,-1)).toBe(true)
 expect(shouldFlipSpecies(fish,1)).toBe(false)
 expect(shouldFlipSpecies({...fish,facing_direction:'front'},-1)).toBe(true)
})
