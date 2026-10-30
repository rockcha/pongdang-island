import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {HomePage} from '@/pages/home-page'
import {RegionLandscape} from '@/features/regions/region-landscape'
import {pharaohArt} from '@/features/regions/pharaoh-art'
import {fishingEnvironment} from '@/features/fishing/fishing-environment'
import {fishingBannerPath} from '@/features/regions/fishing-banner'
const url='https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/overview-v2.png'
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'news-background-test'}}})}))
vi.mock('@/features/regions/api',async original=>({...await original<typeof import('@/features/regions/api')>(),loadRegionMap:async()=>({regions:[{id:'pharaoh',name:'파라오의 황금해',description:'황금빛 물결',sort_order:17,image_path:'https://ewafafphiovbpjwogwzn.supabase.co/storage/v1/object/public/collectibles/regions/pharaoh/overview-v2.png',created_at:new Date(Date.now()-60000).toISOString()}]})}))
vi.mock('@/features/regions/harbor-catalog',()=>({loadHarborCatalog:async()=>[]}))
afterEach(cleanup)
it('renders the actual news background using its public URL without the fallback illustration',async()=>{
 render(<MemoryRouter><HomePage/></MemoryRouter>)
 const image=await screen.findByRole('img',{name:'파라오의 황금해 풍경'})
 expect(image.getAttribute('src')).toBe(url)
 fireEvent.load(image)
 expect(image.className).toContain('opacity-100')
 expect(image.className).toContain('object-contain')
 expect(image.className).not.toContain('object-bottom')
 expect(screen.queryByRole('button',{name:'이미지 다시 시도'})).toBeNull()
})
it('keeps fishing at sea level and the kingdom overview separate',()=>{
 expect(pharaohArt.scenery).not.toBe(pharaohArt.fishing.scenery)
 expect(fishingEnvironment('pharaoh').frontSrc).toBe(pharaohArt.fishing.scenery)
 expect(fishingBannerPath('pharaoh')).toBe(pharaohArt.fishing.scenery)
})
it('preserves the framing and locked treatment of other regions',()=>{
 render(<RegionLandscape region={{id:'coral',name:'산호',image_path:'/coral.png'}} position="bottom" locked/>)
 const image=screen.getByRole('img',{name:'산호'})
 expect(image.className).toContain('object-cover object-bottom')
 expect(image.className).toContain('grayscale')
})
