import {render,screen,cleanup} from '@testing-library/react'
import {it,expect,vi,afterEach} from 'vitest'
import {NativeSpeciesStrip} from '@/features/regions/native-species-strip'
import type {CatalogEntry} from '@/features/collection/api'
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span role="img" aria-label={name}/>}))
afterEach(cleanup)
const native={id:'native',name:'산호 물고기',description:'산호 바다의 친구',kind:'fish',rarity:'epic',thumbnail_path:'fish.png',is_native:true,native_region_id:'coral',discovered:true} as CatalogEntry
it('shows discovered map slide species in color and keeps undiscovered species silhouetted',()=>{
 const {container}=render(<NativeSpeciesStrip items={[native,{...native,id:'hidden',name:'비밀',discovered:false}]} regionId="coral" regionName="산호빛 여울"/>)
 expect(container.querySelector('[data-discovered="true"]')?.className).not.toContain('brightness-0')
 expect(container.querySelector('[data-discovered="false"]')?.className).toContain('brightness-0')
 expect(screen.getByRole('img',{name:'산호 물고기'})).toBeTruthy()
 expect(screen.queryByRole('img',{name:'비밀'})).toBeNull()
})
