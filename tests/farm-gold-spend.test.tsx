import {afterEach,expect,it,vi} from 'vitest'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {useState} from 'react'
import {useFarmGoldSpend} from '@/features/farm/gold-spend'
import {FarmGold} from '@/features/farm/farm-gold'
import {playPurchaseSound} from '@/features/gold/purchase-sound'
vi.mock('@/features/gold/purchase-sound',()=>({playPurchaseSound:vi.fn()}))

afterEach(()=>{cleanup();vi.useRealTimers();vi.clearAllMocks()})
function Trial(){
 const [gold,setGold]=useState(5000),spend=useFarmGoldSpend(gold)
 return <><FarmGold amount={gold}/><button onClick={()=>setGold(v=>v-2500)}>확장</button><button onClick={()=>setGold(v=>v+2500)}>환불</button><button onClick={()=>{spend.reset(1000);setGold(1000)}}>초기화</button>{spend.effect}</>
}
it('uses the island coin, shows only spending, and clears the animation',()=>{
 vi.useFakeTimers();const {container}=render(<Trial/>)
 expect(container.querySelector('img')?.getAttribute('src')).toBe('/currency/gold-coin-starfish.png')
 expect(screen.queryByRole('status')).toBeNull()
 fireEvent.click(screen.getByText('확장'))
 expect(screen.getByRole('status').textContent).toContain('−2,500')
 expect(playPurchaseSound).toHaveBeenCalledTimes(1)
 act(()=>vi.advanceTimersByTime(1400))
 expect(screen.queryByRole('status')).toBeNull()
 fireEvent.click(screen.getByText('환불'))
 expect(screen.queryByRole('status')).toBeNull()
 fireEvent.click(screen.getByText('초기화'))
 expect(screen.queryByRole('status')).toBeNull()
 expect(playPurchaseSound).toHaveBeenCalledTimes(1)
})
