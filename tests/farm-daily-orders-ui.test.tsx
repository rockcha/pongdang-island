import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {dailyFarmOrders} from '@/features/farm/daily-orders'
import {initialTopview} from '@/features/farm/topview-model'
afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('keeps sold inventory deducted when the market is stored and placed again',()=>{
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('판매소 (11,6)');click('전체');click('밀 판매');click('보관하기')
 click('보관함');click('건물');click('판매소 보관 1개 배치하기')
 fireEvent.click(document.querySelector('[data-farm-cell="11,6"]')!);click('완료');click('판매소 (11,6)');click('밀 선택')
 expect(screen.getByRole('button',{name:'밀 판매'})).toHaveProperty('disabled',true)
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain('15,084')
})

it('keeps all market products available across Korean midnight',()=>{
 vi.useFakeTimers();vi.setSystemTime(Date.parse('2026-11-04T14:59:59.900Z'))
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>);click('판매소 (11,6)');
 const count=document.querySelectorAll('.farm-item-picker>button').length
 act(()=>vi.advanceTimersByTime(200))
 expect(document.querySelectorAll('.farm-item-picker>button')).toHaveLength(count)
 expect(screen.getByRole('button',{name:'밀 판매'})).toHaveProperty('disabled',false)
})

it('allows repeated production and housing buildings in the shop and explains their effects in their details',()=>{
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>);click('축사 (15,6)')
 expect(screen.getByRole('heading',{name:'축사',exact:true})).toBeTruthy();expect(screen.getByText('젖소·양을 키우는 사육 시설')).toBeTruthy();expect(screen.getByLabelText('사육 정원 2 / 4마리 · 보관·준비 중 포함')).toBeTruthy();expect(screen.getByLabelText('젖소 1회 생산 시간 10초')).toBeTruthy()
 click('Close');click('가금사 (10,9)')
 expect(screen.getByRole('heading',{name:'가금사',exact:true})).toBeTruthy();expect(screen.getByText('닭·오리를 키우는 사육 시설')).toBeTruthy();expect(screen.getByLabelText('사육 정원 2 / 4마리 · 보관·준비 중 포함')).toBeTruthy();expect(screen.getByLabelText('닭 1회 생산 시간 10초')).toBeTruthy()
 click('Close');click('상점')
 const shop=screen.getByRole('dialog',{name:'상점'})
 expect(within(shop).getByRole('article',{name:'축산 관리소'})).toBeTruthy()
 expect(within(shop).queryByRole('button',{name:'축산 관리소 구매 · 1,000 G'})).toBeNull()
 for(const name of ['제분소','작은 빵집','축사','가금사'])expect(within(shop).getByRole('button',{name:new RegExp(name+' 구매 ·')})).toHaveProperty('disabled',false)
})
