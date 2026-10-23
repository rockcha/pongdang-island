import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {fishingSplash,useFishingAudio} from '@/features/fishing/fishing-audio'
import {saveFishingSound} from '@/features/fishing/sound-preference'
import {TensionFishingGame} from '@/features/fishing/tension-fishing-game'
import {CatchReveal} from '@/features/fishing/catch-reveal'
import type {Species} from '@/features/collection/api'
vi.mock('@/features/collection/api',()=>({collectibleUrl:(path:string)=>path}))
let players:FakeAudio[]=[]
class FakeAudio extends EventTarget{
 loop=false;preload='';volume=1;currentTime=0
 play=vi.fn(()=>Promise.resolve());pause=vi.fn();load=vi.fn();removeAttribute=vi.fn()
 constructor(public src:string){super();players.push(this)}
}
beforeEach(()=>{vi.useFakeTimers();localStorage.clear();players=[];vi.stubGlobal('Audio',FakeAudio)})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear()})
const tick=async(ms=1)=>act(async()=>{await vi.advanceTimersByTimeAsync(ms)})
function Reel({enabled=true}:{enabled?:boolean}){useFishingAudio('/sounds/reel.mp3',enabled,{loop:true,segmentSeconds:4});return null}
it('uses only the first four seconds while held and stops on release or unmount',async()=>{
 const view=render(<Reel/>);await tick()
 const reel=players[0];expect(reel.play).toHaveBeenCalledOnce();expect(reel.loop).toBe(false)
 reel.currentTime=4;act(()=>reel.dispatchEvent(new Event('timeupdate')));await tick()
 expect(reel.currentTime).toBe(0);expect(reel.play).toHaveBeenCalledTimes(2)
 await tick(4000);expect(reel.play).toHaveBeenCalledTimes(3)
 view.rerender(<Reel enabled={false}/>);expect(reel.pause).toHaveBeenCalled()
 const calls=reel.play.mock.calls.length;await tick(8000);expect(reel.play).toHaveBeenCalledTimes(calls)
 view.unmount();expect(reel.removeAttribute).toHaveBeenCalledWith('src')
})
it('mutes immediately, resumes only loops, and pauses when the tab is hidden',async()=>{
 const view=render(<Reel/>);await tick();const reel=players[0]
 act(()=>saveFishingSound(false));expect(reel.pause).toHaveBeenCalled()
 const calls=reel.play.mock.calls.length;await tick(8000);expect(reel.play).toHaveBeenCalledTimes(calls)
 act(()=>saveFishingSound(true));await tick();expect(reel.play).toHaveBeenCalledTimes(calls+1)
 vi.spyOn(document,'hidden','get').mockReturnValue(true)
 fireEvent(document,new Event('visibilitychange'));expect(reel.pause).toHaveBeenCalled()
 view.unmount()
})
it.each(['common','rare','epic','mythic'] as const)('casts once and uses the %s splash on a bite, never on confirmation twice',async rarity=>{
 const props={active:false,castId:'ready',challenge:{rarity,wait:.01,confirmBite:true},onCaught:vi.fn(),onCancel:vi.fn()}
 const view=render(<TensionFishingGame {...props}/>);await tick();expect(players).toHaveLength(0)
 view.rerender(<TensionFishingGame {...props} active castId="cast-1"/>);await tick()
 expect(players.find(p=>p.src==='/sounds/throwbait.mp3')?.play).not.toHaveBeenCalled()
 expect(players.find(p=>p.src==='/sounds/fishing-bg.mp3')?.loop).toBe(true)
 expect(players.find(p=>p.src.includes('splash'))).toBeUndefined()
 await tick(100);await tick()
 const splash=players.find(p=>p.src===fishingSplash(rarity))!;expect(splash.play).toHaveBeenCalledOnce()
 fireEvent.click(screen.getByRole('button',{name:'입질이 왔어요. 터치해서 시작'}));await tick()
 expect(players.filter(p=>p.src.includes('splash'))).toHaveLength(1)
 const struggle=players.find(p=>p.src==='/sounds/fish-struggle.mp3')
 if(rarity==='common'||rarity==='rare'){expect(struggle?.play).toHaveBeenCalledOnce();expect(struggle?.loop).toBe(true)}else expect(struggle).toBeUndefined()
 const unheld=players.find(p=>p.src==='/sounds/reel-unheld.mp3')!
 expect(unheld.play).toHaveBeenCalledOnce();expect(unheld.loop).toBe(true)
 fireEvent.keyDown(screen.getByRole('button',{name:'꾹 눌러 당기기'}),{code:'Space'});await tick()
 expect(unheld.pause).toHaveBeenCalled()
 const reel=players.find(p=>p.src==='/sounds/reel.mp3')!;expect(reel.play).toHaveBeenCalledOnce()
 fireEvent.keyUp(screen.getByRole('button',{name:'꾹 눌러 당기기'}),{code:'Space'});expect(reel.pause).toHaveBeenCalled()
 await tick();expect(players.filter(p=>p.src==='/sounds/reel-unheld.mp3')).toHaveLength(2)
 view.rerender(<TensionFishingGame {...props} active castId="cast-1" paused/>);await tick()
 view.unmount();expect(players.every(p=>p.pause.mock.calls.length>0)).toBe(true)
})
it('delays casting audio by one second and cancels it when leaving before then',async()=>{
 function Cast({enabled=true}:{enabled?:boolean}){useFishingAudio('/sounds/throwbait.mp3',enabled,{delayMs:1000});return null}
 const view=render(<Cast/>);const audio=players[0]
 await tick(999);expect(audio.play).not.toHaveBeenCalled()
 await tick(1);expect(audio.play).toHaveBeenCalledOnce()
 view.rerender(<Cast enabled={false}/>);view.rerender(<Cast/>);const cancelled=players[1]
 await tick(500);view.unmount();await tick(1000)
 expect(cancelled.play).not.toHaveBeenCalled()
})
it('plays caught on the successful result modal, without replaying on a rerender or on failures',async()=>{
 const species={id:'fish',name:'물고기',rarity:'common',kind:'fish',thumbnail_path:'fish.png',sell_price:50} as Species
 const props={species,onDismiss:vi.fn()}
 const view=render(<CatchReveal {...props}/>);await tick()
 expect(players[0].src).toBe('/sounds/caught.mp3');expect(players[0].play).toHaveBeenCalledOnce()
 view.rerender(<CatchReveal {...props}/>);await tick();expect(players).toHaveLength(1)
 view.rerender(<CatchReveal failure="실패" onDismiss={props.onDismiss}/>);await tick();expect(players).toHaveLength(1)
 expect(players[0].pause).toHaveBeenCalled()
})
it('does not play muted one-shots later when sound is re-enabled',async()=>{
 saveFishingSound(false)
 render(<CatchReveal species={{id:'fish',name:'물고기',rarity:'common',kind:'fish',thumbnail_path:'fish.png'} as Species} onDismiss={vi.fn()}/>);await tick()
 expect(players[0].play).not.toHaveBeenCalled()
 act(()=>saveFishingSound(true));await tick();expect(players[0].play).not.toHaveBeenCalled()
})
