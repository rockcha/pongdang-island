import { act,cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { TensionFishingGame } from '@/features/fishing/tension-fishing-game'

afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks()})
it('shows an inline prepared rod without starting a game or opening a dialog',async()=>{
 vi.useFakeTimers()
 const caught=vi.fn()
 render(<TensionFishingGame active={false} onCaught={caught} onCancel={vi.fn()}/> )
 expect(screen.getByRole('group',{name:'낚시터'})).toBeTruthy()
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByText('낚싯대가 준비됐어요')).toBeTruthy()
 await act(async()=>{vi.advanceTimersByTime(20000)})
 expect(screen.getByText('낚싯대가 준비됐어요')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'꾹 눌러 당기기'})).toBeNull()
 expect(caught).not.toHaveBeenCalled()
})
it('waits for a bite, accepts keyboard hold/release and clears hold on blur',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
 const caught=vi.fn(),cancel=vi.fn()
 render(<TensionFishingGame onCaught={caught} onCancel={cancel}/> )
 const button=screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement
 expect(button.disabled).toBe(true)
 await act(async()=>{vi.advanceTimersByTime(3100)})
 expect(button.disabled).toBe(false);expect(document.activeElement).toBe(button)
 fireEvent.keyDown(button,{code:'Space'});expect(button.getAttribute('aria-pressed')).toBe('true')
 fireEvent(window,new Event('blur'));expect(button.getAttribute('aria-pressed')).toBe('false')
 fireEvent.keyDown(button,{code:'Enter'});fireEvent.keyUp(button,{code:'Enter'})
 expect(button.getAttribute('aria-pressed')).toBe('false')
 fireEvent.click(screen.getByRole('button',{name:'그만하기'}));expect(cancel).toHaveBeenCalledOnce();expect(caught).not.toHaveBeenCalled()
})
it('shows a loss and can restart the waiting phase',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
 const caught=vi.fn()
 render(<TensionFishingGame onCaught={caught} onCancel={vi.fn()}/> )
 await act(async()=>{vi.advanceTimersByTime(20000)})
 expect(screen.getByText(/사용한 미끼 1개는 소모됐어요/)).toBeTruthy()
 expect(caught).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'다시 도전'}))
 expect(screen.getByText('입질을 기다려요')).toBeTruthy()
})
it('completes once after responsive keyboard play',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
 const caught=vi.fn()
 render(<TensionFishingGame onCaught={caught} onCancel={vi.fn()}/> )
 await act(async()=>{vi.advanceTimersByTime(3050)})
 const button=screen.getByRole('button',{name:'꾹 눌러 당기기'})
 let sawLanding=false
 for(let i=0;i<260&&!caught.mock.calls.length;i++){
  if(!screen.queryByRole('status')){
   sawLanding=true
   expect(caught).not.toHaveBeenCalled()
  }
    const tension=Number(screen.queryByRole('meter')?.getAttribute('aria-valuenow')??0)
  const rest=tension>=65
  fireEvent[rest?'keyUp':'keyDown'](button,{code:'Space'})
  await act(async()=>{vi.advanceTimersByTime(100)})
 }
 expect(caught).toHaveBeenCalledOnce()
 expect(sawLanding).toBe(true)
 await act(async()=>{vi.advanceTimersByTime(2000)})
 expect(caught).toHaveBeenCalledOnce()
})

it('reports a reserved failure once and prevents a retry before settlement',async()=>{
 vi.useFakeTimers();const failed=vi.fn(),caught=vi.fn()
 render(<TensionFishingGame onCaught={caught} onFailed={failed} onCancel={vi.fn()} challenge={{wait:.1,failureAt:.2,failureReason:'wave'}}/>)
 await act(async()=>{vi.advanceTimersByTime(400)})
 expect(screen.queryByRole('button',{name:'다시 도전'})).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(2000)})
 expect(failed).toHaveBeenCalledExactlyOnceWith('wave');expect(caught).not.toHaveBeenCalled()
})
