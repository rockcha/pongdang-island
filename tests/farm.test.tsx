import {cleanup, fireEvent, render, screen, within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {IslandEditor} from '@/features/my-island/my-island-page'
import {facilityFor} from '@/features/my-island/island-model'
import {farmCamera, farmCategory} from '@/features/my-island/farm-model'
import {materializeIsland} from '@/features/my-island/island-document'
import {planDecorationPlacement, applyDecorationPlacement} from '@/features/my-island/island-batch-placement'
import {islandFixture} from './island-fixture'

beforeEach(()=>vi.stubGlobal('ResizeObserver',class{observe(){} disconnect(){}}))
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const openFarm=()=>{
 const snapshot=islandFixture(true)
 render(<MemoryRouter><IslandEditor farm storageKey="farm-test" managed={[]} account={{snapshot,gold:1000,walletLoading:false,walletError:'',save:vi.fn(),reload:vi.fn(),trade:vi.fn()}}/></MemoryRouter>)
 return snapshot
}
it('opens a small farm with four plots and decoration, tile, plot and land controls',()=>{
 openFarm()
 expect(screen.getByRole('heading',{name:'내 농장'})).toBeTruthy()
 expect(document.querySelectorAll('[data-farm-plot]')).toHaveLength(4)
 const bar=screen.getByRole('navigation',{name:'농장 카테고리'})
 expect(within(bar).getAllByRole('button').map(b=>b.getAttribute('aria-label')??b.textContent)).toEqual(['장식물','건물','타일','밭','땅 추가 0칸','제거 모드'])
 fireEvent.click(within(bar).getByRole('button',{name:'밭',exact:true}))
 const plot=screen.getByRole('heading',{name:'밭',exact:true,level:3}).closest('article')!
 expect(within(plot).getByRole('button',{name:/10.*구매/})).toBeTruthy()
 fireEvent.click(within(bar).getByRole('button',{name:'장식물',exact:true}))
 expect(screen.getByRole('heading',{name:'동글 나무'})).toBeTruthy()
 expect(screen.getByRole('heading',{name:'솔솔 소나무'})).toBeTruthy()
 expect(screen.queryByRole('heading',{name:'밭',level:3})).toBeNull()
 fireEvent.click(within(bar).getByRole('button',{name:'타일'}))
 expect(screen.getByRole('heading',{name:'흙길'})).toBeTruthy()
 expect(within(bar).getByRole('button',{name:'건물',exact:true})).toBeTruthy()
})
it('lists the office under buildings and opens its construction and upgrade dialog',()=>{
 openFarm()
 const bar=screen.getByRole('navigation',{name:'농장 카테고리'})
 fireEvent.click(within(bar).getByRole('button',{name:'장식물',exact:true}))
 expect(screen.queryByRole('heading',{name:'텃밭 관리소',level:3})).toBeNull()
 fireEvent.click(within(bar).getByRole('button',{name:'건물',exact:true}))
 const office=screen.getByRole('heading',{name:'텃밭 관리소',level:3}).closest('article')!
 fireEvent.click(within(office).getByRole('button',{name:'건설하기'}))
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(screen.getByRole('button',{name:/5,000.*건설하기/})).toBeTruthy()
 expect(farmCategory(facilityFor('farm-office')!)).toBe('building')
})
it('places a stored office from the building inventory without showing an empty inventory notice',()=>{
 const snapshot=islandFixture(true)
 snapshot.farm={officeLevel:1,plotLimit:9,nextCost:10000}
 snapshot.items.push({id:'farm-office~stored',type:'farm-office',sellPrice:0})
 render(<MemoryRouter><IslandEditor farm storageKey="farm-office-storage" managed={[]} account={{snapshot,gold:1000,walletLoading:false,walletError:'',save:vi.fn(),reload:vi.fn(),trade:vi.fn()}}/></MemoryRouter>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'농장 카테고리'})).getByRole('button',{name:'건물',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:'보관함',exact:true}))
 expect(screen.queryByText('아직 보관한 물건이 없어요')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'꺼내서 배치'}))
 expect(screen.getByRole('heading',{name:'텃밭 관리소'})).toBeTruthy()
 expect(screen.queryByRole('region',{name:'농장 보관함'})).toBeNull()
})
it.each([
 ['땅 회수','땅 제거'],
 ['장식물·밭 회수','장식물 제거'],
 ['타일 회수','타일 제거'],
])('opens removal mode for %s and can finish it', (choice,region)=>{
 openFarm()
 fireEvent.click(screen.getByRole('button',{name:'제거 모드'}))
 fireEvent.click(screen.getByRole('button',{name:choice,exact:true}))
 expect(screen.getByRole('button',{name:'제거 모드'}).getAttribute('aria-pressed')).toBe('true')
 const toolbar=screen.getByRole('region',{name:region})
 fireEvent.click(within(toolbar).getByRole('button',{name:'완료',exact:true}))
 expect(screen.getByRole('button',{name:'제거 모드'}).getAttribute('aria-pressed')).toBe('false')
})
it('recovers a plot into inventory without spending gold or losing ownership',()=>{
 vi.stubGlobal('PointerEvent',MouseEvent)
 vi.stubGlobal('DOMPoint',class{constructor(public x:number,public y:number){} matrixTransform(){return this}})
 openFarm()
 const map=screen.getByRole('img',{name:'드래그로 이동하고 마우스 휠로 확대·축소하는 섬 지도'})
 Object.defineProperty(map,'getScreenCTM',{value:()=>({inverse:()=>({})})})
 Object.defineProperty(map,'setPointerCapture',{value:()=>{}})
 fireEvent.click(screen.getByRole('button',{name:'제거 모드'}))
 fireEvent.click(screen.getByRole('button',{name:'장식물·밭 회수'}))
 const at={button:0,clientX:19*32+1,clientY:16*32+1}
 fireEvent.pointerDown(map,at)
 fireEvent.pointerUp(map,at)
 expect(document.querySelectorAll('[data-farm-plot]')).toHaveLength(3)
 expect(screen.getByRole('button',{name:'보유 골드 1,000'})).toBeTruthy()
 fireEvent.click(within(screen.getByRole('region',{name:'장식물 제거'})).getByRole('button',{name:'완료'}))
 fireEvent.click(within(screen.getByRole('navigation',{name:'농장 카테고리'})).getByRole('button',{name:'밭'}))
 fireEvent.click(screen.getByRole('button',{name:'보관함',exact:true}))
 expect(screen.getByText('1',{selector:'.island-count'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'꺼내서 배치'})).toBeTruthy()
})
it('shows zero stored land and opens its purchase panel from the bottom control',()=>{
 openFarm()
 const button=screen.getByRole('button',{name:'땅 추가 0칸',exact:true})
 expect(button.querySelector('.island-dock-count')?.textContent).toBe('0')
 fireEvent.click(button)
 expect(screen.getByRole('heading',{name:'땅 조각'})).toBeTruthy()
})
it('shows the available land count and starts placement directly when land is stored',()=>{
 const snapshot=islandFixture(true)
 snapshot.stocks['land-piece']+=3
 render(<MemoryRouter><IslandEditor farm storageKey="farm-land" managed={[]} account={{snapshot,gold:1000,walletLoading:false,walletError:'',save:vi.fn(),reload:vi.fn(),trade:vi.fn()}}/></MemoryRouter>)
 const button=screen.getByRole('button',{name:'땅 추가 3칸',exact:true})
 expect(button.querySelector('.island-dock-count')?.textContent).toBe('3')
 fireEvent.click(button)
 expect(screen.getByRole('button',{name:'땅 추가 3칸 배치 완료'}).getAttribute('aria-pressed')).toBe('true')
 expect(screen.queryByRole('heading',{name:'땅 조각'})).toBeNull()
 fireEvent.click(button)
 expect(screen.getByRole('button',{name:'땅 추가 3칸',exact:true}).getAttribute('aria-pressed')).toBe('false')
})
it('puts recovered plots in their own inventory category',()=>{
 const snapshot=islandFixture(true)
 snapshot.document.layout=snapshot.document.layout.filter(p=>!p.id.startsWith('farm-plot~'))
 render(<MemoryRouter><IslandEditor farm storageKey="farm-storage" managed={[]} account={{snapshot,gold:1000,walletLoading:false,walletError:'',save:vi.fn(),reload:vi.fn(),trade:vi.fn()}}/></MemoryRouter>)
 fireEvent.click(within(screen.getByRole('navigation',{name:'농장 카테고리'})).getByRole('button',{name:'밭'}))
 fireEvent.click(screen.getByRole('button',{name:'보관함',exact:true}))
 expect(screen.getByText('4',{selector:'.island-count'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'꺼내서 배치'})).toBeTruthy()
 expect(farmCategory(facilityFor('farm-plot')!)).toBe('plot')
})
it('fills a rectangle without spending gold, duplicating stock or placing over another item',()=>{
 const state={...materializeIsland(islandFixture(true)),coins:1000}
 state.layout=state.layout.filter(p=>!p.id.startsWith('farm-plot~'))
 const plan=planDecorationPlacement(state,'farm-plot',{x:20,y:17},{x:19,y:16})
 expect(plan.placements.map(p=>[p.x,p.y])).toEqual([[19,16],[20,16],[19,17],[20,17]])
 const result=applyDecorationPlacement(state,'farm-plot',{x:19,y:16},{x:20,y:17})!
 expect(result.state.coins).toBe(1000)
 expect(result.state.owned).toEqual(state.owned)
 expect(new Set(result.plan.placements.map(p=>p.id)).size).toBe(4)
 const blocked=planDecorationPlacement(state,'farm-plot',{x:17,y:19},{x:18,y:20})
 expect(blocked.slots[0].allowed).toBe(false)
 const water=planDecorationPlacement(state,'farm-plot',{x:0,y:0},{x:1,y:1})
 expect(water.placements).toEqual([])
})
it('fits the full farm on a phone and preserves the larger bounds of an existing island',()=>{
 const farm=farmCamera(islandFixture(true).document,390,844),old=farmCamera(islandFixture().document,390,844)
 expect(farm.zoom).toBeGreaterThan(old.zoom)
 expect(farm.x).toBe(640)
 expect(farm.y).toBe(544)
 expect(farm.zoom*390/1280*16*32).toBeLessThanOrEqual(331)
})
it('keeps existing floor and land management reachable without adding more main categories',()=>{
 openFarm()
 fireEvent.click(screen.getByRole('button',{name:'섬 보기 설정'}))
 fireEvent.click(screen.getByRole('button',{name:'바닥 타일',exact:true}))
 expect(screen.getByRole('heading',{name:'흙길'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'패널 닫기'}))
 fireEvent.click(screen.getByRole('button',{name:'섬 보기 설정'}))
 fireEvent.click(screen.getByRole('button',{name:'땅 확장'}))
 expect(screen.getByRole('heading',{name:'땅 조각'})).toBeTruthy()
})
