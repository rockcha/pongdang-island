import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {playFarmPlacementSound} from '@/features/farm/placement-sound'
import {saveFishingSound} from '@/features/fishing/sound-preference'
import {readFileSync} from 'node:fs'
let players:FakeAudio[]=[]
class FakeAudio extends EventTarget{
 volume=1;play=vi.fn(()=>Promise.resolve());pause=vi.fn();load=vi.fn();removeAttribute=vi.fn()
 constructor(public src:string){super();players.push(this)}
}
beforeEach(()=>{players=[];vi.useFakeTimers();vi.stubGlobal('Audio',FakeAudio);localStorage.clear()})
afterEach(()=>{vi.runOnlyPendingTimers();vi.useRealTimers();vi.unstubAllGlobals();localStorage.clear()})
it('uses one short sound, interrupts repeated impacts and releases finished audio',()=>{
 playFarmPlacementSound()
 expect(players[0].src).toBe('/sounds/farm-place.wav')
 expect(players[0].play).toHaveBeenCalledOnce()
 playFarmPlacementSound();expect(players[0].pause).toHaveBeenCalled()
 players[1].dispatchEvent(new Event('ended'))
 expect(players[1].removeAttribute).toHaveBeenCalledWith('src')
 const bytes=readFileSync('public/sounds/farm-place.wav')
 expect(bytes.toString('ascii',0,4)).toBe('RIFF')
 expect(bytes.readUInt32LE(40)/bytes.readUInt32LE(28)).toBeLessThan(.2)
})
it('supports a softer land placement impact',()=>{
 playFarmPlacementSound(.22)
 expect(players[0].volume).toBe(.22)
})
it('respects mute and immediately stops when sound is disabled',()=>{
 saveFishingSound(false);playFarmPlacementSound();expect(players).toHaveLength(0)
 saveFishingSound(true);playFarmPlacementSound();expect(players).toHaveLength(1)
 saveFishingSound(false);expect(players[0].pause).toHaveBeenCalled()
})
it('stops when the page is hidden and ignores blocked playback',async()=>{
 playFarmPlacementSound();Object.defineProperty(document,'hidden',{configurable:true,value:true})
 document.dispatchEvent(new Event('visibilitychange'));expect(players[0].pause).toHaveBeenCalled()
 playFarmPlacementSound();expect(players).toHaveLength(1)
 Object.defineProperty(document,'hidden',{configurable:true,value:false})
 playFarmPlacementSound();players[1].dispatchEvent(new Event('error'))
 await Promise.resolve();expect(players[1].pause).toHaveBeenCalled()
})
