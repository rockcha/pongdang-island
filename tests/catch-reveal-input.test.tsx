import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>path}))
import {CatchReveal} from '@/features/fishing/catch-reveal'
afterEach(()=>{cleanup();vi.useRealTimers()})
it('ignores rapid reel clicks until the result is visible and tapping pauses',()=>{
 vi.useFakeTimers();vi.setSystemTime(10000);const dismiss=vi.fn()
 render(<CatchReveal failure="Failed" onDismiss={dismiss}/>)
 const button=screen.getByRole('button')
 for(let i=0;i<12;i++){fireEvent.click(button);vi.advanceTimersByTime(100)}
 expect(dismiss).not.toHaveBeenCalled()
 vi.advanceTimersByTime(350);fireEvent.click(button)
 expect(dismiss).toHaveBeenCalledOnce()
})
