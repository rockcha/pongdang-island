import {act,cleanup,fireEvent,render} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {AquariumAmbience} from '@/features/aquarium/aquarium-ambience'
import {saveFishingSound} from '@/features/fishing/sound-preference'
let players:FakeAudio[]=[]
class FakeAudio extends EventTarget{
 loop=false;preload='';volume=1
 play=vi.fn(()=>Promise.resolve());pause=vi.fn();load=vi.fn();removeAttribute=vi.fn()
 constructor(public src:string){super();players.push(this)}
}
beforeEach(()=>{vi.useFakeTimers();localStorage.clear();players=[];vi.stubGlobal('Audio',FakeAudio)})
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear()})
const tick=()=>act(async()=>{await vi.advanceTimersByTimeAsync(1)})
it('loops the supplied ambience quietly and stops on leaving the aquarium',async()=>{
 const view=render(<AquariumAmbience/>);await tick()
 const audio=players[0]
 expect(audio.src).toBe('/sounds/aquarium-ambience.mp3')
 expect(audio.loop).toBe(true);expect(audio.volume).toBe(.25)
 expect(audio.play).toHaveBeenCalledOnce()
 view.rerender(<AquariumAmbience/>);expect(players).toHaveLength(1)
 view.unmount();expect(audio.pause).toHaveBeenCalled();expect(audio.removeAttribute).toHaveBeenCalledWith('src')
})
it('follows the sound setting and pauses while the tab is hidden',async()=>{
 saveFishingSound(false);render(<AquariumAmbience/>);await tick()
 const audio=players[0];expect(audio.play).not.toHaveBeenCalled()
 act(()=>saveFishingSound(true));await tick();expect(audio.play).toHaveBeenCalledOnce()
 act(()=>saveFishingSound(false));expect(audio.pause).toHaveBeenCalled()
 act(()=>saveFishingSound(true));await tick()
 const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(true)
 fireEvent(document,new Event('visibilitychange'));expect(audio.pause).toHaveBeenCalled()
 hidden.mockReturnValue(false);fireEvent(document,new Event('visibilitychange'));await tick()
 expect(audio.play).toHaveBeenCalledTimes(3)
})
it('retries blocked autoplay on an interaction without creating another player',async()=>{
 render(<AquariumAmbience/>);players[0].play.mockRejectedValueOnce(new DOMException('blocked','NotAllowedError'))
 await tick();fireEvent.pointerDown(window);await tick()
 expect(players).toHaveLength(1);expect(players[0].play).toHaveBeenCalledTimes(2)
})
