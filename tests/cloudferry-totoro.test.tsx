import {cleanup,fireEvent,render} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ExtraFloat} from '@/features/fishing/extra-rod-skin-art'
import {regionIcons} from '@/features/regions/region-icons'
import {collectibleUrl} from '@/features/collection/api'
vi.mock('@/lib/client',()=>({createClient:()=>({storage:{from:()=>({getPublicUrl:(path:string)=>({data:{publicUrl:`https://example.test/${path}`}})})}})}))
afterEach(cleanup)
it('uses the Totoro statue icon and floating Totoro art with an image failure fallback',()=>{
 expect(regionIcons.cloudferry.src).toBe('/region-icons/cloudferry-totoro.png')
 const {container}=render(<svg><ExtraFloat id="cloudferry"/></svg>)
 const picture=container.querySelector('image')!
 expect(picture.getAttribute('href')).toBe('/fishing/equipment/cloudferry-totoro-float.png')
 expect(picture.getAttribute('width')).toBe('34')
 fireEvent.error(picture)
 expect(container.querySelector('image')).toBeNull();expect(container.querySelector('[data-skin-float="cloudferry"] path')).toBeTruthy()
})
it('refreshes the edited map and rod thumbnails without changing other storage URLs',()=>{
 expect(collectibleUrl('map/routes/map-cloudferry_thumbnail.png')).toContain('?v=totoro-2')
 expect(collectibleUrl('equipment/rods/cloudferry/thumbnail.png')).toContain('?v=totoro-2')
 expect(collectibleUrl('fish/normal/test.png')).toBe('https://example.test/fish/normal/test.png')
})
