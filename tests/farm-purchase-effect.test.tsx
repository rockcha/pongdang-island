import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
import {playPurchaseSound} from '@/features/gold/purchase-sound'

vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))
afterEach(()=>{cleanup();vi.clearAllMocks();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('celebrates each confirmed batch once, replaces a recent receipt, and clears it automatically',()=>{
 vi.useFakeTimers();render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('상점');click('장식')
 fireEvent.change(screen.getByRole('spinbutton',{name:'오리배 구매 수량'}),{target:{value:'3'}})
 click('오리배 3개 구매 · 2,700 G')
 expect(document.querySelector('[data-farm-gold-spent="2700"]')).toBeTruthy()
 const receipt=document.querySelector('.farm-purchase-effect')!
 expect(receipt.textContent).toContain('오리배');expect(receipt.textContent).toContain('× 3')
 expect(receipt.querySelector('svg')).toBeTruthy()
 expect(document.querySelector('.farm-shop-feedback')).toBeNull()
 expect(playPurchaseSound).toHaveBeenCalledTimes(1)
 act(()=>vi.advanceTimersByTime(1200))
 fireEvent.change(screen.getByRole('spinbutton',{name:'오리배 구매 수량'}),{target:{value:'1'}})
 click('오리배 구매 · 900 G')
 expect(document.querySelectorAll('.farm-purchase-effect')).toHaveLength(1)
 expect(document.querySelector('.farm-purchase-effect')?.textContent).toContain('× 1')
 expect(playPurchaseSound).toHaveBeenCalledTimes(2)
 expect(vi.mocked(playPurchaseSound).mock.calls[0][0]).not.toBe(vi.mocked(playPurchaseSound).mock.calls[1][0])
 act(()=>vi.advanceTimersByTime(1799));expect(document.querySelector('.farm-purchase-effect')).toBeTruthy()
 act(()=>vi.advanceTimersByTime(1));expect(document.querySelector('.farm-purchase-effect')).toBeNull()
})
