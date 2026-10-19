import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { MemoryRouter,Route,Routes } from 'react-router'
import { RegionPage } from '@/features/regions/region-page'

const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:load,regionImageUrl:(path:string)=>'/test/'+path}))
vi.mock('@/features/fishing/fishing-panel',()=>({FishingPanel:()=><p>낚시 화면</p>}))
afterEach(()=>{cleanup();vi.resetAllMocks()})

it.each(['pongdang','coral','mistmoon','starruins','dreamabyss'])('shows the location and description with the appropriate banner for %s',async id=>{
 load.mockResolvedValue({currentRegion:id,regions:[{id,name:'퐁당섬 앞바다',description:'따뜻한 물결이 반기는 바다',rarity:'common',image_path:'pongdang.png',unlocked:true}]})
 const {container}=render(<MemoryRouter initialEntries={['/region/'+id]}><Routes><Route path="region/:regionId" element={<RegionPage/>}/></Routes></MemoryRouter>)
 expect(await screen.findByRole('heading',{name:'퐁당섬 앞바다'})).toBeTruthy()
 expect(screen.getByText('낚시 화면')).toBeTruthy()
 expect(screen.getByText('따뜻한 물결이 반기는 바다')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'퐁당섬 앞바다 안내'}))
 expect(await screen.findByText('미끼와 낚싯대를 준비하고 낚시를 시작해요.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(container.querySelector('img')?.getAttribute('src')).toBe(`/banners/${id}-horizon.png`)
 expect(screen.getByRole('group',{name:'낚시 게이지'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'낚시 지역 이동'})).toBeNull()
 expect(screen.queryByRole('link',{name:'지도로'})).toBeNull()
})
