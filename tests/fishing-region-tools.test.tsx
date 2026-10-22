import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react'
import {createPortal} from 'react-dom'
import {FishingOdds} from '@/features/fishing/fishing-odds'
import { afterEach,expect,it,vi } from 'vitest'
import { MemoryRouter,Route,Routes } from 'react-router'
import { RegionPage } from '@/features/regions/region-page'

const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:load,regionImageUrl:(path:string)=>'/test/'+path}))
vi.mock('@/features/fishing/fishing-panel',()=>({FishingPanel:({oddsTarget}:{oddsTarget?:HTMLElement|null})=><><p>낚시 화면</p>{oddsTarget&&createPortal(<FishingOdds/>,oddsTarget)}</>}))
vi.mock('@/features/fishing/scene-images',()=>({useFishingSceneImages:()=>true}))
vi.mock('@/features/music/region-music',()=>({RegionMusic:()=>null}))
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

it('opens tips beside the banner information and travels only to an unlocked destination from the map dropdown',async()=>{
 load.mockResolvedValue({currentRegion:'pongdang',regions:[
  {id:'pongdang',name:'퐁당섬 앞바다',unlocked:true},
  {id:'coral',name:'산호 해역',unlocked:true},
  {id:'mistmoon',name:'안개달 해역',unlocked:false},
 ]})
 render(<MemoryRouter initialEntries={['/region/pongdang']}><Routes><Route path="region/:regionId" element={<RegionPage/>}/><Route path="sailing/coral" element={<p>산호 해역으로 출항</p>}/></Routes></MemoryRouter>)
 const title=await screen.findByRole('heading',{name:'퐁당섬 앞바다'})
 const titleRow=title.parentElement!
 expect(within(titleRow).getByRole('button',{name:'퐁당섬 앞바다 안내'})).toBeTruthy()
 fireEvent.click(within(titleRow).getByRole('button',{name:'낚시 잘하는 꿀팁'}))
 expect(await screen.findByRole('dialog',{name:'낚시 잘하는 꿀팁'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
 expect(screen.queryByRole('link',{name:'지도로 이동'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'지도',exact:true}))
 const menu=await screen.findByRole('menu',{name:'낚시터 선택'})
 expect(within(menu).getByRole('menuitem',{name:'퐁당섬 앞바다 · 현재 위치'}).getAttribute('aria-disabled')).toBe('true')
 expect(within(menu).getByRole('menuitem',{name:'안개달 해역 · 지도 필요'}).getAttribute('aria-disabled')).toBe('true')
 expect(within(menu).getByRole('menuitem',{name:'전체 지도 보기'}).getAttribute('href')).toBe('/harbor')
 const destination=within(menu).getByRole('menuitem',{name:'산호 해역'})
 expect(destination.getAttribute('href')).toBe('/sailing/coral')
 fireEvent.click(destination)
 expect(await screen.findByText('산호 해역으로 출항')).toBeTruthy()
 expect(screen.queryByRole('menu')).toBeNull()
})
