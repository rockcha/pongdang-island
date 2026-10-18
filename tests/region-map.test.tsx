import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
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
it('defaults to pongdang and selects destinations only through map buttons',async()=>{
 setup()
 await screen.findByRole('heading',{name:'퐁당섬 앞바다'})
 fireEvent.click(screen.getByRole('button',{name:'별잠 유적 지도'}))
 expect(screen.queryByRole('button',{name:'다음 지역'})).toBeNull()
 expect(screen.queryByRole('button',{name:'이전 지역'})).toBeNull()
 expect(screen.queryByText('바다를 골라보세요')).toBeNull()
 expect(screen.getByRole('heading',{name:'별잠 유적'})).toBeTruthy()
 expect(screen.getByRole('img',{name:'별잠 유적'}).className).toContain('grayscale')
 expect(screen.getByText('별빛을 품은 유적')).toBeTruthy()
 expect(screen.queryByText('이곳에서 만날 수 있어요 · 토착 개체')).toBeNull()
 expect((screen.getByRole('button',{name:'잠긴 해역'}) as HTMLButtonElement).disabled).toBe(true)
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByRole('link',{name:'지도 상점에서 구매하기'}).getAttribute('href')).toBe('/shop?tab=maps')
 expect(screen.queryByText('특급')).toBeNull()
 const maps=screen.getByRole('group',{name:'지도 목록'})
 expect(within(maps).getByRole('button',{name:'별잠 유적 지도'}).getAttribute('aria-pressed')).toBe('true')
 fireEvent.click(within(maps).getByRole('button',{name:'퐁당섬 앞바다 지도'}))
 fireEvent.click(screen.getByRole('button',{name:'출항하기'}))
 expect(screen.getByLabelText('경로').textContent).toBe('/sailing/pongdang')
})
it('opens native species details without showing an inventory',async()=>{
 setup()
 expect(screen.queryByRole('button',{name:'퐁당 물고기 살펴보기'})).toBeNull()
 fireEvent.click(await screen.findByRole('button',{name:/확률 10배 업/}))
 fireEvent.click(await screen.findByRole('button',{name:'퐁당 물고기 살펴보기'}))
 expect(await screen.findByText('작은 친구')).toBeTruthy()
 expect(screen.queryByText('미끼 인벤토리')).toBeNull()
})
