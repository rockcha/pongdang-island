import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {FarmOverview} from '@/features/farm/farm-overview'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {developedFarmFixture as initialTopview} from './helpers/developed-farm-fixture'
import {dailyFarmOrders,farmOrderKey} from '@/features/farm/daily-orders'
import {farmGoods} from '@/features/farm/farm-simulation'
vi.mock('@/features/farm/trial-inventory',async importOriginal=>({
 ...await importOriginal<typeof import('@/features/farm/trial-inventory')>(),
 initialFarmTrial:()=>initialTopview(),
}))

afterEach(()=>{cleanup();vi.restoreAllMocks()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('filters production and updates completion without collecting or navigating',()=>{
 const state=initialTopview(),now=10000
 state.objects.push({id:50,kind:'mill',x:4,y:7})
 state.simulation.millJobs={21:{quantity:2,startedAt:0,readyAt:10000},50:{quantity:1,startedAt:10000,readyAt:20000}}
 const {rerender}=render(<FarmOverview state={state} now={now} onClose={()=>{}}/>)
 click('수령 가능1')
 expect(screen.queryByLabelText('밀가루 수령 · 제분소 (4,7)')).toBeNull()
 expect(screen.getByLabelText('밀가루 수령 · 제분소 (6,13)')).toBeTruthy()
 expect(state.simulation.inventory.flour).toBe(0)
 rerender(<FarmOverview state={state} now={20000} onClose={()=>{}}/>)
 expect(screen.getByLabelText('밀가루 수령 · 제분소 (4,7)')).toBeTruthy()
 expect(state.simulation.inventory.flour).toBe(0)
})
it('shows owned stock and current prices in delivery status',()=>{
 const state=initialTopview()
 state.simulation.inventory.butterPotato=2
 render(<FarmOverview state={state} now={0} onClose={()=>{}}/>)
 fireEvent.click(screen.getByRole('button',{name:/^납품 현황/}))
 const item=screen.getByText('버터감자').closest('article')!
 expect(within(item).getByText('보유 2개')).toBeTruthy()
 expect(item.textContent).toContain('개당 230 골드')
 expect(screen.queryByRole('button',{name:/이동/})).toBeNull()
})
it('shows ready animal production without consuming the output',()=>{
 const state=initialTopview(),before=structuredClone(state)
 state.simulation.animalJobs[4]=10000
 render(<FarmOverview state={state} now={10000} onClose={()=>{}}/>)
 const task=screen.getByLabelText('우유 수령 · 젖소 (16,9)')
 expect(within(task).getByText('수령 가능')).toBeTruthy()
 expect(state.simulation.inventory.milk).toBe(before.simulation.inventory.milk)
 expect(state.simulation.animalJobs[4]).toBe(10000)
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
 click('이동하기')
 expect(screen.getByRole('region',{name:'이동 메뉴'})).toBeTruthy()
 click('완료')
 expect(screen.getByRole('button',{name:'이동하기'}).getAttribute('aria-pressed')).toBe('false')
 click('타일');click('타일 회수하기')
 fireEvent.keyDown(container.querySelector('.top-farm')!,{key:'Escape'})
 expect(container.querySelector('.farm-tool-panel')).toBeNull()
 expect(container.querySelector('.top-farm-viewport')?.getAttribute('data-land-tool')).toBe('false')
})
