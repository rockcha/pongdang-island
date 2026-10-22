import { act,cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,beforeEach,expect,it,vi } from 'vitest'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))
import { TensionFishingGame } from '@/features/fishing/tension-fishing-game'
import { fishingBiteSeconds } from '@/features/fishing/tension-game'
import {saveBiteConfirmation} from '@/features/fishing/bite-confirmation-preference'

// These scenarios exercise automatic play after opting out of bite confirmation.
beforeEach(()=>saveBiteConfirmation(false))
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();localStorage.clear()})
it('ends an eighty-second foreground wait after eighty real seconds at low FPS',()=>{
 let next:FrameRequestCallback=()=>{}
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{next=callback;return 1})
 vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{})
 render(<TensionFishingGame challenge={{wait:80}} onCaught={vi.fn()} onFailed={vi.fn()} onCancel={vi.fn()}/> )
 act(()=>next(1))
 for(let frame=1;frame<160;frame++)act(()=>next(1+frame*500))
 expect((screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement).disabled).toBe(true)
 act(()=>next(80001))
 expect((screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement).disabled).toBe(false)
 expect(screen.getByRole('meter')).toBeTruthy()
})
it('freezes the current cast for a leave dialog and resumes without resetting or holding the reel',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
 const props={onCaught:vi.fn(),onCancel:vi.fn(),onFailed:vi.fn(),castId:'same-cast',challenge:{wait:.1}}
 const {rerender}=render(<TensionFishingGame {...props}/>)
 await act(async()=>{vi.advanceTimersByTime(150+fishingBiteSeconds(0)*1000)})
 fireEvent.keyDown(screen.getByRole('button',{name:'꾹 눌러 당기기'}),{code:'Space'})
 rerender(<TensionFishingGame {...props} paused/>)
 const before=screen.getByRole('meter').getAttribute('aria-valuenow')
 await act(async()=>{vi.advanceTimersByTime(20000)})
 expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe(before)
 expect(props.onFailed).not.toHaveBeenCalled()
 expect(props.onCaught).not.toHaveBeenCalled()
 rerender(<TensionFishingGame {...props}/>)
 expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe(before)
 expect(screen.getByRole('button',{name:'꾹 눌러 당기기'}).getAttribute('aria-pressed')).toBe('false')
 await act(async()=>{vi.advanceTimersByTime(300)})
 expect(screen.getByRole('meter').getAttribute('aria-valuenow')).not.toBe(before)
})
it('never enables the reel or shows bites and gauges for chance failures',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
 const failed=vi.fn(),caught=vi.fn()
 const {container}=render(<TensionFishingGame onCaught={caught} onFailed={failed} onCancel={vi.fn()} challenge={{wait:.1,failureAt:3,failureReason:'escape'}}/>)
 await act(async()=>{vi.advanceTimersByTime(2900)})
 const reel=screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement
 expect(reel.disabled).toBe(true)
 fireEvent.keyDown(reel,{code:'Space'})
 expect(reel.getAttribute('aria-pressed')).toBe('false')
 expect(screen.queryByRole('meter',{hidden:true})).toBeNull()
 expect(container.querySelector('[data-rod-gauge]')).toBeNull()
 expect(container.querySelector('[data-fishing-shadow]')).toBeTruthy()
 expect(container.querySelector('[data-fishing-resistance]')).toBeNull()
 expect(screen.queryByText('입질이 왔어요!')).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(1100)})
 expect(failed).toHaveBeenCalledExactlyOnceWith('escape')
 expect(caught).not.toHaveBeenCalled()
})
it('preserves loaded scenery across casts while resetting gameplay',async()=>{
 vi.useFakeTimers()
 const props={onCaught:vi.fn(),onCancel:vi.fn(),onFailed:vi.fn()}
 const {container,rerender}=render(<TensionFishingGame {...props} active={false} castId="ready"/>)
 expect(container.querySelector('[data-fishing-camera="front"]')).toBeTruthy()
 expect(container.querySelector('[data-fishing-view="top"]')).toBeNull()
 expect(container.querySelectorAll('[data-fishing-platform]')).toHaveLength(1)
 const sea=container.querySelector('[data-fishing-sea] image')!
 const platform=container.querySelector('[data-fishing-platform] image')!
 fireEvent.load(sea);fireEvent.load(platform)
 rerender(<TensionFishingGame {...props} castId="first" challenge={{wait:.1,failureAt:.2}}/>)
 expect(container.querySelector('[data-fishing-camera="front"]')).toBeTruthy()
 expect(container.querySelector('[data-fishing-view="top"]')).toBeNull()
 expect(container.querySelectorAll('[data-fishing-platform]')).toHaveLength(1)
 expect(container.querySelector('[data-fishing-sea] image')).toBe(sea)
 expect(sea.getAttribute('opacity')).toBe('1');expect(platform.getAttribute('opacity')).toBe('1')
 await act(async()=>{vi.advanceTimersByTime(1500)})
 expect(props.onFailed).toHaveBeenCalledOnce()
 rerender(<TensionFishingGame {...props} active={false} castId="ready"/>)
 expect(container.querySelector('[data-fishing-camera="front"]')).toBeTruthy()
 rerender(<TensionFishingGame {...props} castId="second" challenge={{wait:3}}/>)
 expect(container.querySelector('[data-fishing-platform] image')).toBe(platform)
 expect((screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement).disabled).toBe(true)
 expect(screen.queryByRole('button',{name:'다시 도전'})).toBeNull()
})
it('shows the reel before play and starts through its center action',()=>{
 const start=vi.fn()
 const {rerender}=render(<TensionFishingGame active={false} start={{label:'미끼 1개로 낚시하기',disabled:false,onStart:start}} onCaught={vi.fn()} onCancel={vi.fn()}/>)
 const reel=screen.getByRole('button',{name:'미끼 1개로 낚시하기'})
 expect(screen.getByText('낚시 시작')).toBeTruthy()
 fireEvent.click(reel);expect(start).toHaveBeenCalledOnce()
 rerender(<TensionFishingGame active={false} start={{label:'미끼 1개로 낚시하기',disabled:true,onStart:start}} onCaught={vi.fn()} onCancel={vi.fn()}/>)
 fireEvent.click(reel);expect(start).toHaveBeenCalledOnce()
})
it('replaces the ready badge with an accessible help dialog',()=>{
 render(<TensionFishingGame active={false} onCaught={vi.fn()} onCancel={vi.fn()}/>)
 expect(screen.queryByText('낚시 준비')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'낚시 도움말'}))
 expect(screen.getByRole('dialog')).toBeTruthy()
 expect(screen.getByRole('heading',{name:'바다와 밀고 당기기'})).toBeTruthy()
 expect(screen.getByText(/95 이상이 0.8초/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'알겠어요'}))
})
it('pauses gameplay while help is open and resumes without a held reel',async()=>{
 vi.useFakeTimers()
 vi.spyOn(Math,'random').mockReturnValue(0)
 render(<TensionFishingGame onCaught={vi.fn()} onCancel={vi.fn()} challenge={{wait:.1}}/>)
 await act(async()=>{vi.advanceTimersByTime(150+fishingBiteSeconds(0)*1000)})
 const reel=screen.getByRole('button',{name:'꾹 눌러 당기기'})
 fireEvent.keyDown(reel,{code:'Space'})
 fireEvent.click(screen.getByRole('button',{name:'낚시 도움말'}))
 const before=screen.getByRole('meter',{hidden:true}).getAttribute('aria-valuenow')
 await act(async()=>{vi.advanceTimersByTime(5000)})
 expect(screen.getByRole('meter',{hidden:true}).getAttribute('aria-valuenow')).toBe(before)
 fireEvent.click(screen.getByRole('button',{name:'알겠어요'}))
 await act(async()=>{vi.advanceTimersByTime(300)})
 expect(reel.getAttribute('aria-pressed')).toBe('false')
 expect(screen.getByRole('meter').getAttribute('aria-valuenow')).not.toBe(before)
})
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
 expect(screen.queryByRole('button',{name:'그만하기'})).toBeNull();expect(cancel).not.toHaveBeenCalled();expect(caught).not.toHaveBeenCalled()
})
it('shows a loss and can restart the waiting phase',async()=>{
 vi.useFakeTimers();vi.spyOn(Math,'random').mockReturnValue(0)
 const caught=vi.fn()
 render(<TensionFishingGame onCaught={caught} onCancel={vi.fn()}/> )
 await act(async()=>{vi.advanceTimersByTime(20000)})
 expect(screen.getByText(/낚싯줄이 느슨해져 물고기가 빠져나갔어요/)).toBeTruthy()
 expect(screen.queryByText(/사용한 미끼 1개는 소모됐어요/)).toBeNull()
 expect(caught).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'다시 도전'}))
 expect(screen.queryByRole('status')).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(3100)})
 expect(screen.getByRole('status').textContent).toBeTruthy()
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
 expect(screen.queryByText(/사용한 미끼 1개는 소모/)).toBeNull()
 expect(screen.queryByText('지나가는 물결을 따라 훌쩍 떠났어요.')).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(2000)})
 expect(failed).toHaveBeenCalledExactlyOnceWith('wave');expect(caught).not.toHaveBeenCalled()
})

it('places one text-free gauge near the float instead of in the toolbar',async()=>{
 vi.useFakeTimers();const target=document.createElement('div');document.body.appendChild(target);
 try{
  const view=render(<TensionFishingGame toolbarTarget={target} active={false} onCaught={vi.fn()} onCancel={vi.fn()}/>);
  expect(target.querySelector('[data-rod-gauge]')).toBeNull();
  expect(view.container.querySelector('[data-fishing-gauge-layer]')).toBeNull();
  expect(screen.queryByRole('button',{name:'낚시 도움말'})).toBeNull();
  view.rerender(<TensionFishingGame toolbarTarget={target} onCaught={vi.fn()} onCancel={vi.fn()} challenge={{wait:.1}}/>);
  expect(view.container.querySelector('[data-fishing-gauge-layer]')).toBeNull();
  await act(async()=>{vi.advanceTimersByTime(1000)});
  expect(document.querySelectorAll('[data-rod-gauge]')).toHaveLength(1);
  expect(view.container.querySelector('[data-fishing-gauge-layer]')?.textContent).toBe('');
  expect(screen.getByRole('button',{name:'꾹 눌러 당기기'})).toBeTruthy();
 }finally{cleanup();target.remove()}
});
