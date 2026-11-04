import { cleanup,fireEvent,render,screen,waitFor,within } from '@testing-library/react'
import {createPortal} from 'react-dom'
import {FishingOdds} from '@/features/fishing/fishing-odds'
import {useFishingTools} from '@/features/fishing/fishing-tools'
import { afterEach,expect,it,vi } from 'vitest'
import { MemoryRouter,Route,Routes } from 'react-router'
import { RegionPage } from '@/features/regions/region-page'

const {load}=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'me'}}})}))
vi.mock('@/features/regions/api',()=>({loadRegionMap:load,regionImageUrl:(path:string)=>'/test/'+path}))
vi.mock('@/features/fishing/fishing-panel',()=>({FishingPanel:({sceneHeader}:{sceneHeader?:React.ReactNode})=>{const tools=useFishingTools();return <>{sceneHeader}<p>낚시 화면</p>{tools?.helpTarget&&createPortal(<FishingOdds dock/>,tools.helpTarget)}</>}}))
vi.mock('@/features/fishing/scene-images',()=>({useFishingSceneImages:()=>true}))
vi.mock('@/features/music/region-music',()=>({RegionMusic:()=>null}))
afterEach(()=>{cleanup();vi.resetAllMocks()})

it('lets the operator preview rain, snow, dust, meteor and blossom in the currently visited sea',async()=>{
 load.mockResolvedValue({currentRegion:'coral',regions:[{id:'coral',name:'산호 해역',unlocked:true}]})
 render(<MemoryRouter><RegionPage weatherTest/></MemoryRouter>)
 expect(await screen.findByRole('heading',{name:'산호 해역'})).toBeTruthy()
 const select=screen.getByRole('combobox',{name:'테스트 날씨'}) as HTMLSelectElement
 expect(Array.from(select.options).map(option=>option.text)).toEqual(['비','눈','황사','유성우','꽃비'])
 fireEvent.change(select,{target:{value:'snow'}})
 expect(select.value).toBe('snow')
 expect(screen.getByText('미끼·보상 없음')).toBeTruthy()
})

it.each(['pongdang','coral','mistmoon','starruins','dreamabyss'])('overlays the location and description on the fishing scene without a separate banner for %s',async id=>{
 load.mockResolvedValue({currentRegion:id,regions:[{id,name:'퐁당섬 앞바다',description:'따뜻한 물결이 반기는 바다',rarity:'common',image_path:'pongdang.png',unlocked:true}]})
 const {container}=render(<MemoryRouter initialEntries={['/region/'+id]}><Routes><Route path="region/:regionId" element={<RegionPage/>}/></Routes></MemoryRouter>)
 expect(await screen.findByRole('heading',{name:'퐁당섬 앞바다'})).toBeTruthy()
 expect(screen.getByText('낚시 화면')).toBeTruthy()
 expect(screen.getByText('따뜻한 물결이 반기는 바다')).toBeTruthy()
 expect(container.querySelector('[data-fishing-region-overlay]')).toBeTruthy()
 expect(container.querySelector(`img[src="/banners/${id}-horizon.png"]`)).toBeNull()
 expect(screen.getByRole('group',{name:'낚시 게이지'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'낚시 지역 이동'})).toBeNull()
 expect(screen.queryByRole('link',{name:'지도로'})).toBeNull()
})

it('opens tips from the left tools instead of the title and travels only to unlocked destinations',async()=>{
 load.mockResolvedValue({currentRegion:'pongdang',regions:[
  {id:'pongdang',name:'퐁당섬 앞바다',unlocked:true},
  {id:'coral',name:'산호 해역',unlocked:true},
  {id:'mistmoon',name:'안개달 해역',unlocked:false},
 ]})
 render(<MemoryRouter initialEntries={['/region/pongdang']}><Routes><Route path="region/:regionId" element={<RegionPage/>}/><Route path="sailing/coral" element={<p>산호 해역으로 출항</p>}/></Routes></MemoryRouter>)
 const title=await screen.findByRole('heading',{name:'퐁당섬 앞바다'})
 const titleRow=title.parentElement!
 expect(within(titleRow).queryByRole('button',{name:'낚시 잘하는 꿀팁'})).toBeNull()
 const tips=screen.getByRole('button',{name:'낚시 잘하는 꿀팁'})
 expect(tips.closest('[data-fishing-tools]')).toBeTruthy()
 fireEvent.click(tips)
 expect(await screen.findByRole('dialog',{name:'낚시 잘하는 꿀팁'})).toBeTruthy()
 expect(screen.queryByText('지도 조각과 유물도 발견해요')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'Close'}))
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'낚시 잘하는 꿀팁'})).toBeNull())
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
