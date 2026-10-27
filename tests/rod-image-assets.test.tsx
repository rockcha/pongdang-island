import {cleanup,fireEvent,render} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
import {RodSkinFrame,RodSkinRotor,RodSkinFloat} from '@/features/fishing/rod-skin-art'
import {hasRodImages,rodImagePath,rodThumbnailUrl} from '@/features/fishing/rod-image-assets'
import {fishingRods} from '@/features/fishing/fishing-rods'

afterEach(cleanup)
it('loads each image part from Storage and falls back when an image fails',()=>{
 for(const {id} of fishingRods){
  expect(hasRodImages(id)).toBe(true)
  const view=render(<svg><RodSkinFrame id={id}/><g transform="rotate(144)"><RodSkinRotor id={id}/></g><RodSkinFloat id={id}/></svg>)
  const images=view.container.querySelectorAll('image')
  expect(images).toHaveLength(3)
  expect(images[0].getAttribute('href')).toContain(rodImagePath(id,'reel-frame'))
  expect(images[1].parentElement?.parentElement?.getAttribute('transform')).toBe('rotate(144)')
  fireEvent.error(images[0])
  expect(view.container.querySelectorAll('image')).toHaveLength(2)
  expect(view.container.querySelector('[data-skin-frame] :is(circle,path,ellipse)')).toBeTruthy()
  view.unmount()
 }
})
it('keeps the starter equipment ID and uses Storage thumbnails for every rod',()=>{
 expect(fishingRods[0]).toMatchObject({id:'basic',name:'입문용 낚싯대',price:0,failureReductionBp:0,nativeBonusBp:0})
 expect(fishingRods.find(r=>r.id==='bronze')).toMatchObject({name:'청동 낚싯대',failureReductionBp:0,nativeBonusBp:0,waitReductionSeconds:1})
 for(const rod of fishingRods){
  expect(rodThumbnailUrl(rod.id)).toContain(rodImagePath(rod.id,'thumbnail'))
  if(rod.region)expect(rod).toMatchObject({failureReductionBp:200,nativeBonusBp:200})
 }
 expect(fishingRods.find(r=>r.id==='calm')).toMatchObject({failureReductionBp:0,waitReductionSeconds:2})
 expect(rodImagePath('swift','thumbnail')).toBe('equipment/rods/swift-v2/thumbnail.png')
 expect(fishingRods.find(r=>r.id==='nyamnyam')).toMatchObject({region:'nyamnyam',price:1500,waitReductionSeconds:1})
 expect(fishingRods.find(r=>r.id==='plunder')).toMatchObject({region:'plunder',price:1500,waitReductionSeconds:1})
 expect(hasRodImages('missing')).toBe(false)
})
