import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {dailyFarmOrders} from '@/features/farm/daily-orders'
import {initialTopview} from '@/features/farm/topview-model'
afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('keeps a fulfilled order fulfilled after the sales building is stored and placed again',()=>{
 vi.useFakeTimers();const store=initialTopview().objects.find(o=>o.kind==='store')!
 let now=Date.UTC(2026,10,4)
 while(!dailyFarmOrders(store,now).some(o=>o.good==='wheat'))now+=86400000
 vi.setSystemTime(now);const quantity=dailyFarmOrders(store,now).find(o=>o.good==='wheat')!.quantity
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('농작물 판매소 (11,5)');click(`밀 ${quantity}개 납품`);click('보관하기')
 click('보관함');click('건물');click('농작물 판매소 보관 1개 배치하기')
 fireEvent.click(document.querySelector('[data-farm-cell="11,5"]')!);click('완료')
 click('농작물 판매소 (11,5)')
 expect(screen.getByRole('button',{name:'밀 주문 완료'})).toHaveProperty('disabled',true)
 expect(document.querySelector('.top-farm-gold')?.textContent).toContain((15000+quantity*7).toLocaleString())
})
it('refreshes an open order panel at Korean midnight',()=>{
 vi.useFakeTimers();const now=Date.parse('2026-11-04T14:59:59.900Z');vi.setSystemTime(now)
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>);click('가공품 판매소 (12,12)')
 const source=initialTopview().objects.find(o=>o.kind==='processed')!
 const goods=()=>Array.from(document.querySelectorAll('[data-order-good]')).map(row=>row.getAttribute('data-order-good'))
 expect(goods()).toEqual(dailyFarmOrders(source,now).map(order=>order.good))
 act(()=>vi.advanceTimersByTime(200))
 expect(goods()).toEqual(dailyFarmOrders(source,now+200).map(order=>order.good))
})
it('allows repeated production and housing buildings in the shop and explains their effects in their details',()=>{
 render(<MemoryRouter><TopviewFarm/></MemoryRouter>);click('외양간 (15,5)')
 expect(screen.getByRole('region',{name:'외양간 용도와 효과'}).textContent).toContain('한 채당 소 2마리 수용')
 click('Close');click('닭장 (10,8)')
 expect(screen.getByRole('region',{name:'닭장 용도와 효과'}).textContent).toContain('한 채당 닭 2마리 수용')
 click('Close');click('상점')
 const shop=screen.getByRole('dialog',{name:'상점'})
 expect(within(shop).queryByText('축산 관리소')).toBeNull()
 for(const name of ['제분소','작은 빵집','외양간','닭장','농작물 판매소','가공품 판매소'])expect(within(shop).getByRole('button',{name:new RegExp(name+' 구매 ·')})).toHaveProperty('disabled',false)
})
