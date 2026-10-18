import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>path}))
import {CatchReveal} from '@/features/fishing/catch-reveal'
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
it('keeps one random chance-failure phrase per reveal and preserves control failure reasons',()=>{
 const random=vi.spyOn(Math,'random').mockReturnValue(.2)
 const dismiss=vi.fn()
 const {rerender}=render(<CatchReveal failure="예약 사유" failureReason="bait" onDismiss={dismiss}/>)
 expect(screen.getByText('조심성이 많은 녀석이었어요.')).toBeTruthy()
 random.mockReturnValue(.99)
 rerender(<CatchReveal failure="예약 사유" failureReason="bait" onDismiss={dismiss}/>)
 expect(screen.getByText('조심성이 많은 녀석이었어요.')).toBeTruthy()
 rerender(<CatchReveal failure="줄이 끊어졌어요." failureReason="snap" onDismiss={dismiss}/>)
 expect(screen.getByText('줄이 끊어졌어요.')).toBeTruthy()
 rerender(<CatchReveal failure="줄이 느슨해서 도망갔어요." failureReason="slack" onDismiss={dismiss}/>)
 expect(screen.getByText('줄이 느슨해서 도망갔어요.')).toBeTruthy()
})
it('ignores rapid reel clicks until the result is visible and tapping pauses',()=>{
 vi.useFakeTimers();vi.setSystemTime(10000);const dismiss=vi.fn()
 render(<CatchReveal failure="Failed" onDismiss={dismiss}/>)
 const button=screen.getByRole('button')
 for(let i=0;i<12;i++){fireEvent.click(button);vi.advanceTimersByTime(100)}
 expect(dismiss).not.toHaveBeenCalled()
 vi.advanceTimersByTime(350);fireEvent.click(button)
 expect(dismiss).toHaveBeenCalledOnce()
})
