import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(()=>{cleanup();vi.useRealTimers()})
const open=(name:string)=>fireEvent.click(screen.getByRole('button',{name}))
const close=()=>{open('Close');act(()=>vi.advanceTimersByTime(200))}
function getMilk(){open('젖소 (16,9)');act(()=>vi.advanceTimersByTime(10000));open('젖소 (16,9)')}

it('shows the correct dairy and bakery recipes and locks creation when ingredients are missing',()=>{
 vi.useFakeTimers()
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 open('유제품 공방 (14,12)')
 expect(screen.getByRole('button',{name:'버터 만들기'})).toHaveProperty('disabled',true)
 open('딸기우유 선택');expect(screen.getByRole('button',{name:'딸기우유 만들기'})).toHaveProperty('disabled',true)
 close();open('작은 빵집 (18,8)')
 for(const name of ['달걀과자','팬케이크','케이크']){open(`${name} 선택`);expect(screen.getByRole('button',{name:`${name} 만들기`})).toHaveProperty('disabled',true)}
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
 expect(document.querySelectorAll('[data-order-good]')).toHaveLength(5)
 expect(document.querySelector('[data-order-good="milk"]')).toBeNull()
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('15,000')
})
it('blocks recovery while a workshop has an active or uncollected batch',()=>{
 vi.useFakeTimers()
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 getMilk();open('유제품 공방 (14,12)');open('버터 만들기');expect(screen.queryByRole('dialog')).toBeNull()
 open('편집하기');open('유제품 공방 (14,12)');open('회수')
 expect(screen.getByRole('status').textContent).toContain('가공품을 먼저 받은 뒤')
 expect(screen.getByRole('button',{name:'유제품 공방 (14,12)'})).toBeTruthy()
 act(()=>vi.advanceTimersByTime(4000));open('회수')
 expect(screen.getByRole('status').textContent).toContain('가공품을 먼저 받은 뒤')
})
