import {act,cleanup,renderHook} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {useFarmClockTicker} from '@/features/farm/use-farm-clock-ticker'
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers()})
it('ticks long jobs once per second, short jobs four times per second and stops when idle',()=>{
 vi.useFakeTimers();const tick=vi.fn(),now=()=>Date.now()
 const {rerender}=renderHook(({running,fast})=>useFarmClockTicker(running,fast,now,tick),{initialProps:{running:true,fast:false}})
 tick.mockClear();act(()=>vi.advanceTimersByTime(1000));expect(tick).toHaveBeenCalledTimes(1)
 rerender({running:true,fast:true});tick.mockClear()
 act(()=>vi.advanceTimersByTime(1000));expect(tick).toHaveBeenCalledTimes(4)
 rerender({running:false,fast:false});tick.mockClear()
 act(()=>vi.advanceTimersByTime(1000));expect(tick).not.toHaveBeenCalled()
})
it('stops background ticks and catches up with the current time when visible',()=>{
 vi.useFakeTimers();let hidden=false
 vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden)
 const tick=vi.fn();renderHook(()=>useFarmClockTicker(true,false,()=>Date.now(),tick))
 tick.mockClear();hidden=true;act(()=>{document.dispatchEvent(new Event('visibilitychange'));vi.advanceTimersByTime(5000)})
 expect(tick).not.toHaveBeenCalled()
 hidden=false;act(()=>document.dispatchEvent(new Event('visibilitychange')))
 expect(tick).toHaveBeenCalledExactlyOnceWith(Date.now())
})
