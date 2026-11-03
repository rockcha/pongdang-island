import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {TopviewFarm} from '@/features/farm/topview-farm'
afterEach(()=>{cleanup();vi.useRealTimers()})
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
it('keeps animals idle until tapped, fills bubble backgrounds and shows remaining seconds on tap, then returns to idle after collection',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 expect(container.querySelectorAll('[data-animal-status="idle"]')).toHaveLength(2)
 act(()=>vi.advanceTimersByTime(30000))
 expect(container.querySelectorAll('[data-animal-status="idle"]')).toHaveLength(2)
 click('젖소 생산 시작')
 expect(screen.getByRole('progressbar',{name:'우유 생산 (16,9)'}).getAttribute('aria-valuenow')).toBe('0')
 act(()=>vi.advanceTimersByTime(5000))
 expect(screen.getByRole('progressbar',{name:'우유 생산 (16,9)'}).getAttribute('aria-valuenow')).toBe('50')
 const bubble=container.querySelector('[data-status-bubble="우유 생산 (16,9)"]')!
 expect(bubble.querySelector('[data-bubble-fill]')?.getAttribute('height')).toBe('21.5')
 click('우유 생산 (16,9)');expect(bubble.textContent).toContain('5초')
 expect(container.querySelector('[data-farm-effect="harvest"]')).toBeNull()
 act(()=>vi.advanceTimersByTime(5000));click('우유 생산 (16,9)')
 expect(container.querySelectorAll('[data-animal-status="idle"]')).toHaveLength(2)
 expect(screen.getByRole('button',{name:'젖소 생산 시작'})).toBeTruthy()
 click('창고 (18,5)');click('축산물');expect(screen.getByText('우유')).toBeTruthy();expect(screen.getByText('×1')).toBeTruthy()
})
it('uses the same filling bubbles for research, processing and clearing, without map bottom progress strips',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 click('제분소 (6,12)');click('밀 제분 시작');click('Close');act(()=>vi.advanceTimersByTime(5000))
 expect(screen.getByRole('progressbar',{name:'제분 진행'}).getAttribute('aria-valuenow')).toBe('50')
 click('제분 진행');expect(container.querySelector('[data-status-bubble="제분 진행"]')?.textContent).toContain('5초')
 click('편집하기');click('개간하기');click('개간 위치 8,13');act(()=>vi.advanceTimersByTime(1500))
 expect(screen.getByRole('progressbar',{name:'개간 진행'}).getAttribute('aria-valuenow')).toBe('50')
 expect(container.querySelector('.farm-clearing-progress')).toBeNull()
})
