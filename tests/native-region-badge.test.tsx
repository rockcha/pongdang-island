import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {regionIcons} from '@/features/regions/region-icons'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>path}))
afterEach(cleanup)
it('shows the correct public region icon only for native individuals, including image fallbacks',()=>{
 for(const [id,region] of Object.entries(regionIcons)){
  const view=render(<CollectibleThumbnail path="fish.png" name="물고기" species={{is_native:true,native_region_id:id}}/> )
  const badge=screen.getByLabelText(`주 서식지: ${region.name}`)
  expect(badge.querySelector('img')?.getAttribute('src')).toBe(region.src)
  fireEvent.error(screen.getByAltText('물고기'))
  expect(screen.getByLabelText(`주 서식지: ${region.name}`)).toBeTruthy()
  view.unmount()
 }
})
it('omits badges for non-native, legacy, and unknown regions',()=>{
 for(const species of [undefined,{is_native:false,native_region_id:'mistmoon'},{is_native:true,native_region_id:'unknown'}]){
  const view=render(<CollectibleThumbnail path="fish.png" name="물고기" species={species}/> )
  expect(screen.queryByLabelText(/주 서식지/)).toBeNull()
  view.unmount()
 }
})
