import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {FarmStatusBubble} from '@/features/farm/status-bubble'
import {formatFarmRemaining,farmWorkPosition} from '@/features/farm/work-status'
import {TopviewFarm} from '@/features/farm/topview-farm'

afterEach(()=>{cleanup();vi.useRealTimers()})
it.each([[0,'0초'],[59.1,'1분 0초'],[61,'1분 1초'],[3601,'1시간 0분 1초'],[3661,'1시간 1분 1초']])('formats %s seconds as %s',(seconds,expected)=>expect(formatFarmRemaining(Number(seconds))).toBe(expected))
it('reveals hours, minutes and seconds on click or keyboard without activating ongoing work, then hides them again',()=>{
 vi.useFakeTimers();const onActivate=vi.fn()
 render(<svg><FarmStatusBubble x={0} y={0} label="작업 진행" progress={.5} remaining={3661} onActivate={onActivate}><circle r={4}/></FarmStatusBubble></svg>)
 expect(screen.queryByText('1시간 1분 1초')).toBeNull()
 const gauge=screen.getByRole('button',{name:'작업 진행'})
 fireEvent.click(gauge)
 expect(screen.getByText('1시간 1분 1초')).toBeTruthy()
 expect(onActivate).not.toHaveBeenCalled()
 act(()=>vi.advanceTimersByTime(2600))
 expect(screen.queryByText('1시간 1분 1초')).toBeNull()
 fireEvent.keyDown(gauge,{key:'Enter'})
 expect(screen.getByText('1시간 1분 1초')).toBeTruthy()
 expect(onActivate).not.toHaveBeenCalled()
})
it('keeps completed production full and collectible with a short completion effect',()=>{
 const onActivate=vi.fn(),{container}=render(<svg><FarmStatusBubble x={0} y={0} label="생산 완료" progress={.99} remaining={0} ready onActivate={onActivate}><circle r={4}/></FarmStatusBubble></svg>)
 expect(screen.getByRole('progressbar',{name:'생산 완료'}).getAttribute('aria-valuenow')).toBe('100')
 expect(container.querySelector('.farm-gauge-complete')).toBeTruthy()
 expect(container.querySelector('.farm-work-time')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'생산 완료'}))
 expect(onActivate).toHaveBeenCalledOnce()
})
it('holds the full gauge briefly after automatic upgrade completion without delaying the capacity increase',()=>{
 vi.useFakeTimers();const {container}=render(<MemoryRouter><TopviewFarm/></MemoryRouter>)
 const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
 click('축산 관리소 (4,9)');click('업그레이드 · 50 G');click('Close')
 act(()=>vi.advanceTimersByTime(10000))
 const completed=container.querySelector('[data-work-completed="27"]')!
 expect(completed.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('100')
 expect(completed.querySelector('.farm-gauge-complete')).toBeTruthy()
 expect(screen.getByRole('img',{name:/^동물 2 \/ 6/})).toBeTruthy()
 act(()=>vi.advanceTimersByTime(1800))
 expect(container.querySelector('[data-work-completed="27"]')).toBeNull()
})
it('anchors building and animal gauges at the roof and back rather than far above the object',()=>{
 expect(farmWorkPosition({id:1,kind:'office',x:4,y:8})).toEqual({x:200,y:271})
 expect(farmWorkPosition({id:2,kind:'cow',x:4,y:8})).toEqual({x:200,y:303})
})
