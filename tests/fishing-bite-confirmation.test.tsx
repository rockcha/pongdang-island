import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {TensionFishingGame} from '@/features/fishing/tension-fishing-game'
import {saveBiteConfirmation} from '@/features/fishing/bite-confirmation-preference'
import {saveFishingSound} from '@/features/fishing/sound-preference'
import {newTensionGame,startTensionFight,stepTensionGame} from '@/features/fishing/tension-game'
import {waitingFloatRipples} from '@/features/fishing/waiting-float-ripples'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>'/collectibles/'+path}))

beforeEach(()=>{
 vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue()
 vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})
})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();saveBiteConfirmation(false);localStorage.clear()})
const overlay=()=>screen.queryByRole('button',{name:'입질이 왔어요. 터치해서 시작'})

it.each([true,false])('plays once when the bite arrives with confirmation %s',async confirmBite=>{
 vi.useFakeTimers()
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue()
 const pause=vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{})
 let frame:FrameRequestCallback=()=>{}
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(next=>{frame=next;return 1})
 vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{})
 render(<TensionFishingGame challenge={{wait:1,confirmBite}} onCaught={vi.fn()} onCancel={vi.fn()}/>)
 act(()=>{frame(1);frame(501)})
 await act(async()=>{vi.advanceTimersByTime(1)})
 expect(play).not.toHaveBeenCalled()
 act(()=>{frame(1001)})
 await act(async()=>{vi.advanceTimersByTime(1)})
 expect(play).toHaveBeenCalledOnce()
 if(confirmBite)fireEvent.click(overlay()!)
 act(()=>{frame(1101)})
 await act(async()=>{vi.advanceTimersByTime(1)})
 expect(play).toHaveBeenCalledOnce()
 expect(pause).not.toHaveBeenCalled()
 act(()=>{saveFishingSound(false)})
 expect(pause).toHaveBeenCalledOnce()
})

it('stops even a delayed frame at the bite until explicitly started',()=>{
 const initial=newTensionGame(()=>.5,{wait:80,confirmBite:true})
 const ready=stepTensionGame(initial,500,false)
 expect(ready).toMatchObject({phase:'ready',time:0,tension:38,progress:.12})
 expect(stepTensionGame(ready,120,true)).toBe(ready)
 const started=startTensionFight(ready)
 expect(started).toMatchObject({phase:'playing',time:0,tension:38})
 expect(startTensionFight(started)).toBe(started)
 expect(stepTensionGame(newTensionGame(()=>.5,{wait:80}),80,false).phase).toBe('playing')
})

it('hides the gauge, freezes the fight and consumes the confirming touch without holding',async()=>{
 vi.useFakeTimers();localStorage.clear()
 const props={castId:'first',challenge:{wait:.1},onCaught:vi.fn(),onFailed:vi.fn(),onCancel:vi.fn()}
 const view=render(<TensionFishingGame {...props}/>)
 await act(async()=>{vi.advanceTimersByTime(300)})
 expect(overlay()).toBe(document.activeElement)
 expect(screen.getByText(/입질 일시정지는 기본으로 켜져 있어요/)).toBeTruthy()
 expect(screen.queryByRole('meter')).toBeNull()
 expect(view.container.querySelector('[data-rod-gauge]')).toBeNull()
 const reel=screen.getByRole('button',{name:'꾹 눌러 당기기'}) as HTMLButtonElement
 expect(reel.disabled).toBe(true)
 await act(async()=>{vi.advanceTimersByTime(60000)})
 expect(props.onFailed).not.toHaveBeenCalled();expect(props.onCaught).not.toHaveBeenCalled()
 fireEvent.click(overlay()!)
 expect(overlay()).toBeNull()
 expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe('38')
 expect(reel.disabled).toBe(false);expect(reel.getAttribute('aria-pressed')).toBe('false')
 expect(document.activeElement).toBe(reel)
})

it('starts from the keyboard and applies a changed setting only to the next cast',async()=>{
 vi.useFakeTimers();saveBiteConfirmation(true)
 const props={castId:'first',challenge:{wait:.1},onCaught:vi.fn(),onFailed:vi.fn(),onCancel:vi.fn()}
 const {rerender}=render(<TensionFishingGame {...props}/>)
 await act(async()=>{vi.advanceTimersByTime(300)})
 saveBiteConfirmation(false)
 rerender(<TensionFishingGame {...props}/>)
 expect(overlay()).toBeTruthy()
 fireEvent.keyDown(overlay()!,{code:'Space'})
 expect(overlay()).toBeNull()
 expect(screen.getByRole('button',{name:'꾹 눌러 당기기'}).getAttribute('aria-pressed')).toBe('false')
 rerender(<TensionFishingGame {...props} castId="second"/>)
 await act(async()=>{vi.advanceTimersByTime(300)})
 expect(overlay()).toBeNull();expect(screen.getByRole('meter')).toBeTruthy()
})

it('keeps the confirmation across a leave pause and never prompts for a planned failure',async()=>{
 vi.useFakeTimers()
 const props={challenge:{wait:.1,confirmBite:true},onCaught:vi.fn(),onFailed:vi.fn(),onCancel:vi.fn()}
 const {rerender}=render(<TensionFishingGame {...props}/>)
 await act(async()=>{vi.advanceTimersByTime(300)})
 rerender(<TensionFishingGame {...props} paused/>)
 expect(overlay()).toBeNull()
 await act(async()=>{vi.advanceTimersByTime(10000)})
 rerender(<TensionFishingGame {...props}/>)
 expect(overlay()).toBeTruthy()
 rerender(<TensionFishingGame {...props} castId="failure" challenge={{wait:.1,confirmBite:true,failureAt:.2}}/>)
 await act(async()=>{vi.advanceTimersByTime(1500)})
 expect(overlay()).toBeNull();expect(props.onFailed).toHaveBeenCalledOnce()
})

it('settles an expired cast once while waiting for confirmation instead of starting a stale fight',async()=>{
 vi.useFakeTimers()
 const failed=vi.fn(),caught=vi.fn()
 render(<TensionFishingGame challenge={{wait:.1,confirmBite:true}} expiresAt={new Date(Date.now()+2000).toISOString()} onCaught={caught} onFailed={failed} onCancel={vi.fn()}/>)
 await act(async()=>{vi.advanceTimersByTime(300)})
 expect(overlay()).toBeTruthy()
 await act(async()=>{vi.advanceTimersByTime(10000)})
 expect(overlay()).toBeNull();expect(caught).not.toHaveBeenCalled()
 expect(failed).toHaveBeenCalledExactlyOnceWith('expired')
})

it('uses quiet seeded ripple bursts that vary across casts and cycles',()=>{
 const sample=(seed:number)=>Array.from({length:130},(_,i)=>waitingFloatRipples(seed,i/10))
 expect(sample(1)).toEqual(sample(1));expect(sample(1)).not.toEqual(sample(2))
 expect(sample(1).some(r=>r.length===0)).toBe(true)
 expect(sample(1).flat().length).toBeGreaterThan(0)
 for(const ripple of sample(1).flat()){
  expect(ripple.opacity).toBeGreaterThan(0);expect(ripple.opacity).toBeLessThanOrEqual(.16)
  expect(ripple.rx).toBeLessThan(35)
 }
 expect(waitingFloatRipples(1,-1)).toEqual([])
})

it('waits twenty minutes at the bite, then starts the server-confirmed three-minute deadline without holding the reel',async()=>{
 vi.useFakeTimers()
 let frame:FrameRequestCallback=()=>{}
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(next=>{frame=next;return 1})
 vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{})
 const failed=vi.fn(),onStartFight=vi.fn(async()=>true)
 const props={challenge:{wait:.1,confirmBite:true},onCaught:vi.fn(),onFailed:failed,onCancel:vi.fn(),onStartFight}
 const view=render(<TensionFishingGame {...props} expiresAt={new Date(Date.now()+86400000).toISOString()}/>)
 act(()=>{frame(1);frame(301)})
 await act(async()=>{vi.advanceTimersByTime(20*60*1000)})
 expect(overlay()).toBeTruthy();expect(failed).not.toHaveBeenCalled()
 await act(async()=>{fireEvent.click(overlay()!)})
 expect(onStartFight).toHaveBeenCalledOnce()
 expect(overlay()).toBeNull()
 expect(screen.getByRole('button',{name:'꾹 눌러 당기기'}).getAttribute('aria-pressed')).toBe('false')
 view.rerender(<TensionFishingGame {...props} expiresAt={new Date(Date.now()+180000).toISOString()} paused/>)
 await act(async()=>{vi.advanceTimersByTime(179000)})
 expect(failed).not.toHaveBeenCalled()
 await act(async()=>{vi.advanceTimersByTime(1001)})
 expect(failed).toHaveBeenCalledExactlyOnceWith('expired')
})

it('keeps the bite paused on a failed start, blocks double taps in flight, and retries without starting another cast',async()=>{
 vi.useFakeTimers()
 let resolve!:(started:boolean)=>void
 const onStartFight=vi.fn().mockRejectedValueOnce(Error('offline')).mockImplementationOnce(()=>new Promise<boolean>(done=>{resolve=done}))
 render(<TensionFishingGame challenge={{wait:.1,confirmBite:true}} onStartFight={onStartFight} onCaught={vi.fn()} onFailed={vi.fn()} onCancel={vi.fn()}/>)
 await act(async()=>{vi.advanceTimersByTime(300)})
 await act(async()=>{fireEvent.click(overlay()!)})
 expect(screen.getByRole('alert').textContent).toContain('다시 터치')
 expect(screen.queryByRole('meter')).toBeNull()
 fireEvent.click(overlay()!);fireEvent.click(overlay()!)
 expect(onStartFight).toHaveBeenCalledTimes(2)
 expect(overlay()).toHaveProperty('disabled',true)
 await act(async()=>{resolve(true)})
 expect(overlay()).toBeNull();expect(screen.getByRole('meter')).toBeTruthy()
})

it('uses the server clock to avoid expiring a valid cast on a phone with a different date',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
 const failed=vi.fn()
 render(<TensionFishingGame challenge={{wait:.1,confirmBite:true}} expiresAt="2026-10-22T12:03:00Z" serverNow="2026-10-22T12:00:00Z" onCaught={vi.fn()} onFailed={failed} onCancel={vi.fn()}/>)
 await act(async()=>{vi.advanceTimersByTime(300)})
 expect(overlay()).toBeTruthy();expect(failed).not.toHaveBeenCalled()
})
