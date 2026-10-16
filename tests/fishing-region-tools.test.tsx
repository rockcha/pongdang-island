import { cleanup,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { MemoryRouter,Route,Routes } from 'react-router'
import { RegionPage } from '@/features/regions/region-page'

const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:load,regionImageUrl:(path:string)=>'/test/'+path}))
vi.mock('@/features/fishing/fishing-panel',()=>({FishingPanel:()=><p>낚시 화면</p>}))
afterEach(()=>{cleanup();vi.resetAllMocks()})

it('keeps the region banner informational without a picker or back button',async()=>{
 load.mockResolvedValue({currentRegion:'pongdang',regions:[{id:'pongdang',name:'퐁당섬 앞바다',rarity:'common',image_path:'pongdang.png',unlocked:true}]})
 render(<MemoryRouter initialEntries={['/region/pongdang']}><Routes><Route path="region/:regionId" element={<RegionPage/>}/></Routes></MemoryRouter>)
 expect(await screen.findByRole('heading',{name:'퐁당섬 앞바다'})).toBeTruthy()
 expect(screen.getByText('낚시 화면')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'낚시 지역 이동'})).toBeNull()
 expect(screen.queryByRole('link',{name:'선착장으로'})).toBeNull()
})
