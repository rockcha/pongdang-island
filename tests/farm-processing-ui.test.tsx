import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {MillWorkshop} from '@/features/farm/mill-workshop'
import {initialFarmSimulation} from '@/features/farm/farm-simulation'

afterEach(()=>{cleanup();vi.useRealTimers()})
const open=(name:string)=>fireEvent.click(screen.getByRole('button',{name}))
const close=()=>{open('Close');act(()=>vi.advanceTimersByTime(200))}
it('selects corn flour, requires corn research, and submits and displays the selected mill product',()=>{
 const simulation=initialFarmSimulation(),onAction=vi.fn()
 simulation.inventory.corn=4
 const {rerender}=render(<MillWorkshop buildingId={21} simulation={simulation} now={0} onAction={onAction}/>)
 open('옥수수가루 선택')
 expect(screen.getByRole('button',{name:'옥수수 제분 시작'})).toHaveProperty('disabled',true)
 simulation.unlockedCrops.push('corn')
 rerender(<MillWorkshop buildingId={21} simulation={simulation} now={0} onAction={onAction}/>)
 fireEvent.change(screen.getByRole('spinbutton',{name:'옥수수 수량'}),{target:{value:'2'}})
 open('옥수수 제분 시작')
 expect(onAction).toHaveBeenCalledWith({type:'mill',product:'cornFlour',quantity:2})
 simulation.millJobs[21]={product:'cornFlour',quantity:2,startedAt:0,readyAt:10000}
 rerender(<MillWorkshop buildingId={21} simulation={simulation} now={10000} onAction={onAction}/>)
 expect(screen.getByRole('heading',{name:'옥수수 4개 → 옥수수가루 2개'})).toBeTruthy()
 open('수령하기');expect(onAction).toHaveBeenLastCalledWith({type:'collectFlour'})
})
function getMilk(){for(let i=0;i<2;i++){open('젖소 (16,9)');act(()=>vi.advanceTimersByTime(10000));open('젖소 (16,9)')}}

it('shows the correct dairy and bakery recipes and locks creation when ingredients are missing',()=>{
 vi.useFakeTimers()
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 open('유제품 공방 (14,12)')
 expect(screen.getByRole('button',{name:'버터 만들기'})).toHaveProperty('disabled',true)
 for(const name of ['딸기우유','치즈','생크림','요구르트']){open(`${name} 선택`);expect(screen.getByRole('button',{name:`${name} 만들기`})).toHaveProperty('disabled',true)}
 close();open('작은 빵집 (18,8)')
 for(const name of ['달걀과자','팬케이크','케이크','콘브레드','감자빵','고구마파이','쿠키']){open(`${name} 선택`);expect(screen.getByRole('button',{name:`${name} 만들기`})).toHaveProperty('disabled',true)}
})
it('keeps cooking after closing the workshop and collects butter once before showing processed orders',()=>{
 vi.useFakeTimers()
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 getMilk();open('유제품 공방 (14,12)');open('버터 만들기')
 expect(document.querySelector('[data-farm-effect="craft"]')).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'버터 제작 진행'})).toBeTruthy()
 expect(screen.queryByRole('dialog')).toBeNull();act(()=>vi.advanceTimersByTime(4000));open('유제품 공방 (14,12)')
 expect(screen.getByRole('status').textContent).toContain('버터 ×1창고에 보관했습니다.')
 expect(screen.queryByRole('button',{name:'가공품 받기'})).toBeNull()
 expect(document.querySelector('[data-farm-effect="crafted"]')).toBeTruthy()
 open('가공품 판매소 (12,12)')
 expect(document.querySelectorAll('[data-order-good]')).toHaveLength(3)
 expect(document.querySelector('[data-order-good="butter"]')).toBeNull()
 expect(document.querySelector('[data-order-good="cheese"]')).toBeNull()
 expect(document.querySelector('[data-order-good="milk"]')).toBeNull()
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('15,000')
})
it('blocks recovery while a workshop has an active or uncollected batch',()=>{
 vi.useFakeTimers()
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 getMilk();open('유제품 공방 (14,12)');open('버터 만들기');expect(screen.queryByRole('dialog')).toBeNull()
 open('회수하기');open('유제품 공방 (14,12)')
 expect(screen.getByRole('status').textContent).toContain('가공품을 먼저 받은 뒤')
 expect(screen.getByRole('button',{name:'유제품 공방 (14,12)'})).toBeTruthy()
 act(()=>vi.advanceTimersByTime(4000));open('유제품 공방 (14,12)')
 expect(screen.getByRole('status').textContent).toContain('가공품을 먼저 받은 뒤')
})
