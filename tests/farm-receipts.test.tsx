import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
const start=()=>{vi.useFakeTimers();return render(<MemoryRouter><TopviewFarm/></MemoryRouter>)}
it('claims flour directly from the ready bubble once and keeps the storage copy inside the receipt',()=>{
 start();click('제분소 (6,12)');click('밀 제분 시작');click('Close');act(()=>vi.advanceTimersByTime(10000));click('제분 진행')
 expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('status').textContent).toContain('밀가루 ×1창고에 보관했습니다.')
 expect(document.querySelector('.top-farm-message')).toBeNull()
 click('제분소 (6,12)');expect(screen.getByRole('button',{name:'밀 제분 시작'})).toBeTruthy();click('Close');click('창고');click('가공품');expect(screen.getByText('×1')).toBeTruthy()
})
it('shows animal products and prepared animals in the same receipt with the correct destination',()=>{
 start();click('젖소 (16,9)');act(()=>vi.advanceTimersByTime(10000));click('젖소 (16,9)')
 expect(screen.getByRole('status').textContent).toContain('우유 ×1창고에 보관했습니다.');expect(document.querySelector('.top-farm-message')).toBeNull()
 click('닭장 (10,8)');click('닭 구매 · 300 G');click('Close');act(()=>vi.advanceTimersByTime(10000));click('닭 보관함으로 받기')
 expect(screen.getByRole('status').textContent).toContain('닭 ×1보관함에 보관했습니다.');expect(document.querySelector('.top-farm-message')).toBeNull()
})
it('includes all concurrently harvested crops in one warehouse receipt',()=>{
 start();click('심기');click('밀 4개');click('밭 (9,13)');click('밭 (10,13)');act(()=>vi.advanceTimersByTime(10000));click('밭 (9,13)');click('밭 (10,13)');act(()=>vi.advanceTimersByTime(3000))
 expect(screen.getByRole('status').textContent).toContain('밀 ×2창고에 보관했습니다.');expect(document.querySelector('.top-farm-message')).toBeNull()
})
