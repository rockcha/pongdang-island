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
it('keeps cooking after closing the workshop and collects and sells butter only once',()=>{
 vi.useFakeTimers()
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 getMilk();open('유제품 공방 (14,12)');open('버터 만들기')
 expect(document.querySelector('[data-farm-effect="craft"]')).toBeTruthy()
 expect(screen.getByRole('progressbar',{name:'버터 제작 진행'})).toBeTruthy()
 close();act(()=>vi.advanceTimersByTime(4000));open('유제품 공방 (14,12)')
 expect(screen.getByRole('status').textContent).toContain('버터 ×1창고에 보관했습니다.')
 expect(screen.queryByRole('button',{name:'가공품 받기'})).toBeNull()
 expect(document.querySelector('[data-farm-effect="crafted"]')).toBeTruthy()
 open('가공품 판매소 (12,12)');open('버터 판매')
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('15,030')
 expect(screen.getByRole('status').textContent).toContain('버터 1개를 판매했어요.')
 expect(screen.getByRole('button',{name:'버터 판매'})).toHaveProperty('disabled',true)
 expect(screen.getByRole('button',{name:'버터 선택'}).textContent).toContain('×0')
 expect(document.querySelector('[data-farm-effect="sell"]')).toBeTruthy()
 open('버터 선택');expect(screen.getByRole('button',{name:'버터 판매'})).toHaveProperty('disabled',true)
 for(const name of ['밀가루','딸기우유','달걀과자','팬케이크','케이크']){open(`${name} 선택`);expect(screen.getByRole('button',{name:`${name} 판매`})).toBeTruthy()}
 expect(screen.queryByRole('button',{name:'우유 판매'})).toBeNull()
})
it('blocks recovery while a workshop has an active or uncollected batch',()=>{
 vi.useFakeTimers()
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 getMilk();open('유제품 공방 (14,12)');open('버터 만들기');close()
 open('편집하기');open('유제품 공방 (14,12)');open('회수')
 expect(screen.getByRole('status').textContent).toContain('가공품을 먼저 받은 뒤')
 expect(screen.getByRole('button',{name:'유제품 공방 (14,12)'})).toBeTruthy()
 act(()=>vi.advanceTimersByTime(4000));open('회수')
 expect(screen.getByRole('status').textContent).toContain('가공품을 먼저 받은 뒤')
})
