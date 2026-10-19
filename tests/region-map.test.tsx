import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import { HarborPage } from '@/pages/harbor-page'
const {load,catalog}=vi.hoisted(()=>({load:vi.fn(),catalog:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:load,regionImageUrl:(path:string)=>`/test/${path}`}))
vi.mock('@/features/regions/harbor-catalog',()=>({loadHarborCatalog:catalog}))
vi.mock('@/features/collection/collectible-thumbnail',()=>({CollectibleThumbnail:({name}:{name:string})=><span role="img" aria-label={name}/>}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
function Location(){return <output aria-label="경로">{useLocation().pathname}</output>}
function setup(){
 load.mockResolvedValue({currentRegion:'starruins',regions:[
 {id:'pongdang',name:'퐁당섬 앞바다',description:'잔잔한 바다',rarity:'common',image_path:'pongdang.png',requires_map_fragment:false,unlocked:true,hasFragment:false},
 {id:'starruins',name:'별잠 유적',description:'별빛을 품은 유적',rarity:'epic',image_path:'starruins.png',requires_map_fragment:true,unlocked:false,hasFragment:false}]})
 catalog.mockResolvedValue([{id:'native',name:'퐁당 물고기',description:'작은 친구',rarity:'rare',is_native:true,native_region_id:'pongdang',discovered:true,thumbnail_path:'fish.png'}])
 render(<MemoryRouter initialEntries={['/harbor']}><HarborPage/><Location/></MemoryRouter>)
}
it('offers fishing and expedition actions and only shopping for locked seas',async()=>{
 setup()
 await screen.findByRole('heading',{name:'퐁당섬 앞바다'})
 expect(screen.getByRole('button',{name:'퐁당섬 앞바다 지도'}).textContent).toBe('')
 expect(screen.getByRole('button',{name:'별잠 유적 지도'}).textContent).toBe('')
 expect(screen.getByRole('button',{name:'어선 파견'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'낚시 하기'}))
 expect(screen.getByLabelText('경로').textContent).toBe('/sailing/pongdang')
 fireEvent.click(screen.getByRole('button',{name:'별잠 유적 지도'}))
 expect(screen.queryByRole('button',{name:'낚시 하기'})).toBeNull()
 expect(screen.queryByRole('button',{name:'어선 파견'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'상점에서 구매하기'}))
 expect(screen.getByLabelText('경로').textContent).toBe('/shop')
})
it('opens expedition setup from the selected unlocked sea',async()=>{
 setup()
 fireEvent.click(await screen.findByRole('button',{name:'어선 파견'}))
 expect(screen.getByLabelText('경로').textContent).toBe('/expeditions')
})
