import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {FarmOverview} from '@/features/farm/farm-overview'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {initialTopview} from '@/features/farm/topview-model'
import {dailyFarmOrders,farmOrderKey} from '@/features/farm/daily-orders'
import {farmGoods} from '@/features/farm/farm-simulation'

afterEach(()=>{cleanup();vi.restoreAllMocks()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('filters production, updates completion from time, and navigates to an exact facility without collecting',()=>{
 const state=initialTopview(),onVisit=vi.fn(),now=10000
 state.objects.push({id:50,kind:'mill',x:4,y:7})
 state.simulation.millJobs={21:{quantity:2,startedAt:0,readyAt:10000},50:{quantity:1,startedAt:10000,readyAt:20000}}
 const {rerender}=render(<FarmOverview state={state} now={now} onClose={()=>{}} onVisit={onVisit}/>)
 click('수령 가능1')
 expect(screen.queryByRole('button',{name:'밀가루 수령 · 제분소 (4,7)으로 이동'})).toBeNull()
 click('밀가루 수령 · 제분소 (6,12)으로 이동')
 expect(onVisit).toHaveBeenCalledWith(21)
 expect(state.simulation.inventory.flour).toBe(0)
 rerender(<FarmOverview state={state} now={20000} onClose={()=>{}} onVisit={onVisit}/>)
 click('밀가루 수령 · 제분소 (4,7)으로 이동')
 expect(onVisit).toHaveBeenLastCalledWith(50)
})
it('shows actual shortages and completed orders without allowing inventory from another store to be reserved',()=>{
 const state=initialTopview(),now=Date.parse('2026-11-04T03:00:00Z'),store=state.objects.find(object=>object.kind==='store')!,orders=dailyFarmOrders(store,now),first=orders[0]
 state.simulation.inventory[first.good]=2
 state.simulation.orderDeliveries[farmOrderKey(store,now)]={[first.good]:1,[orders[1].good]:orders[1].quantity}
 const visit=vi.fn()
 render(<FarmOverview state={state} now={now} onClose={()=>{}} onVisit={visit}/>)
 fireEvent.click(screen.getByRole('button',{name:/^오늘의 주문/}))
 const panel=screen.getByRole('region',{name:'농작물 판매소 (11,5) 주문'})
 const row=within(panel).getByText(farmGoods[first.good].name).closest('.farm-overview-order')!
 expect(row.textContent).toContain(`${first.quantity-3}개 부족`)
 expect(within(panel).getByText('납품 완료')).toBeTruthy()
 click('농작물 판매소 (11,5)으로 이동')
 expect(visit).toHaveBeenCalledWith(store.id)
})
it('moves from the overview to the highlighted facility and leaves ready produce untouched',()=>{
 let now=Date.parse('2026-11-04T03:00:00Z')
 vi.spyOn(Date,'now').mockImplementation(()=>now)
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('젖소 (16,9)')
 now+=10000
 click('농장 현황')
 expect(screen.getByRole('dialog',{name:'농장 현황'})).toBeTruthy()
 click('우유 수령 · 젖소 (16,9)으로 이동')
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(container.querySelector('[aria-label="젖소 (16,9)"] [data-object-art]')?.getAttribute('filter')).toBe('url(#farm-selection-outline)')
 expect(container.querySelector('[data-animal-status="ready"]')).toBeTruthy()
 expect(screen.getByRole('button',{name:'편집하기'}).getAttribute('aria-pressed')).toBe('false')
})
it('uses one panel and completion location across tools and clears the previous placement mode when switching',()=>{
 const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 for(const name of ['땅 0칸 보유','타일','농사','보관함']){
  click(name)
  expect(container.querySelectorAll('.farm-tool-panel')).toHaveLength(1)
  expect(container.querySelector('.farm-tool-panel>header .farm-tool-done')?.textContent).toBe('완료')
  expect(container.querySelectorAll('.farm-crop-tools>button[aria-pressed="true"]')).toHaveLength(1)
 }
 click('완료')
 expect(container.querySelector('.farm-tool-panel')).toBeNull()
 expect(container.querySelector('.top-farm-viewport')?.getAttribute('data-land-tool')).toBe('false')
 click('편집하기')
 expect(screen.getByRole('region',{name:'배치 편집 메뉴'})).toBeTruthy()
 click('완료')
 expect(screen.getByRole('button',{name:'편집하기'}).getAttribute('aria-pressed')).toBe('false')
 click('타일');click('회수하기')
 fireEvent.keyDown(container.querySelector('.top-farm')!,{key:'Escape'})
 expect(container.querySelector('.farm-tool-panel')).toBeNull()
 expect(container.querySelector('.top-farm-viewport')?.getAttribute('data-land-tool')).toBe('false')
})
