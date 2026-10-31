import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {createExplorationAudio} from '@/features/exploration/exploration-audio'
import {claimPlayback} from '@/features/music/playback-ownership'

const settings=vi.hoisted(()=>({music:50,effects:80,enabled:true}))
vi.mock('@/features/audio/audio-preferences',()=>({audioVolume:(channel:'music'|'effects')=>settings[channel],audioVolumeChanged:'test-audio-volume'}))
vi.mock('@/features/fishing/sound-preference',()=>({readFishingSound:()=>settings.enabled,fishingSoundChanged:'test-sound-enabled'}))
let audios:FakeAudio[],sources:ReturnType<typeof source>[],cleanup:(()=>void)|undefined
function source(){return {connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null,buffer:null,loop:false}}
class FakeAudio{
 paused=true;loop=false;preload='';volume=1;currentTime=0
 constructor(public src:string){audios.push(this)}
 play=vi.fn(async()=>{this.paused=false})
 pause=vi.fn(()=>{this.paused=true})
 removeAttribute=vi.fn();load=vi.fn()
}
beforeEach(()=>{
 audios=[];sources=[];settings.music=50;settings.effects=80;settings.enabled=true
 vi.stubGlobal('Audio',FakeAudio)
 vi.stubGlobal('AudioContext',class {
  state='running';currentTime=0;destination={}
  createGain(){return {gain:{value:1,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}}
  createOscillator(){const node={...source(),type:'sine',frequency:{setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()}};sources.push(node);return node}
  createBufferSource(){const node=source();sources.push(node);return node}
  decodeAudioData=vi.fn(async()=>({duration:1}))
  resume=vi.fn(async()=>{});close=vi.fn(async()=>{})
 })
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})))
})
afterEach(()=>{cleanup?.();cleanup=undefined;vi.unstubAllGlobals()})
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve()}

it('loops supplied music at music volume, yields to another player and releases it on exit',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.startMusic();await settle()
 expect(audios[0].src).toContain('dark-sahara-egypt-22334.mp3')
 expect(audios[0].loop).toBe(true);expect(audios[0].volume).toBeCloseTo(.14)
 expect(audios[0].play).toHaveBeenCalledTimes(1)
 claimPlayback('library');audio.unlock();await settle()
 expect(audios[0].paused).toBe(true)
 expect(audios[0].play).toHaveBeenCalledTimes(1)
 audio.dispose();cleanup=undefined
 expect(audios[0].removeAttribute).toHaveBeenCalledWith('src')
})

it('loads supplied sword, hit and door samples and stops looping steps on arrival',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.startDescent();await settle()
 expect(sources).toHaveLength(1);expect(sources[0].loop).toBe(true)
 audio.stopDescent();expect(sources[0].stop).toHaveBeenCalled()
 audio.play('attack');await settle();audio.play('hit');await settle()
 expect(sources).toHaveLength(3)
 expect(sources[1].start).toHaveBeenCalled();expect(sources[2].start).toHaveBeenCalled()
 audio.play('door');await settle()
 expect(sources).toHaveLength(4);expect(sources[3].start).toHaveBeenCalled()
 audio.play('arrival');await settle()
 expect(sources).toHaveLength(5);expect(sources[4].start).toHaveBeenCalled()
 audio.play('critical');await settle()
 expect(sources).toHaveLength(6);expect(sources[5].start).toHaveBeenCalled()
 const urls=vi.mocked(fetch).mock.calls.map(call=>String(call[0]))
 expect(urls.some(url=>url.includes('sword-slice'))).toBe(true)
 expect(urls.some(url=>url.includes('punch-impact-hit'))).toBe(true)
 expect(urls.some(url=>url.includes('concrete-footsteps'))).toBe(true)
 expect(urls.some(url=>url.includes('opening-door'))).toBe(true)
 expect(urls.some(url=>url.includes('growl-of-the-beast'))).toBe(true)
 expect(urls.some(url=>url.includes('violent-sword-slice'))).toBe(true)
})

it('cancels pending footsteps on arrival and respects effects mute',async()=>{
 const finishes:Array<()=>void>=[]
 vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>{
  finishes.push(()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}))
 })))
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.startDescent();audio.stopDescent();finishes.forEach(finish=>finish());await settle()
 expect(sources).toHaveLength(0)
 settings.enabled=false;audio.play('attack');await settle()
 expect(sources).toHaveLength(0)
})

it('plays the supplied fire sample, reuses its buffer, and respects mute and disposal',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.play('fire');await settle()
 expect(fetch).toHaveBeenCalledWith('/sounds/exploration/yodguard-fire-magic-5-378639.mp3')
 expect(sources).toHaveLength(1);expect(sources[0].start).toHaveBeenCalled()
 audio.play('fire');await settle()
 expect(fetch).toHaveBeenCalledTimes(1);expect(sources).toHaveLength(2)
 settings.effects=0;audio.play('fire');await settle();expect(sources).toHaveLength(2)
 settings.effects=80;settings.enabled=false;audio.play('fire');await settle();expect(sources).toHaveLength(2)
 settings.enabled=true;audio.dispose();cleanup=undefined;audio.play('fire');await settle();expect(sources).toHaveLength(2)
})
it('switches shop and combat music on one player, then returns to exploration',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.startMusic();await settle()
 audio.startMusic('merchant');await settle()
 expect(audios).toHaveLength(1);expect(audios[0].src).toContain('kaazoom-embers-on-the-flagstone')
 expect(audios[0].loop).toBe(true);expect(audios[0].paused).toBe(false)
 const plays=audios[0].play.mock.calls.length
 audio.startMusic('merchant');await settle();expect(audios[0].play).toHaveBeenCalledTimes(plays)
 audio.startMusic('combat');await settle();expect(audios[0].src).toContain('ancient-war-drums-463214.mp3')
 expect(audios[0].volume).toBeCloseTo(.14)
 settings.music=0;window.dispatchEvent(new Event('test-audio-volume'));expect(audios[0].paused).toBe(true)
 audio.startMusic('exploration');await settle();expect(audios[0].src).toContain('dark-sahara-egypt');expect(audios[0].paused).toBe(true)
 settings.music=50;window.dispatchEvent(new Event('test-audio-volume'));await settle();expect(audios[0].paused).toBe(false)
 claimPlayback('library');audio.startMusic('merchant');await settle();expect(audios[0].paused).toBe(true)
 audio.dispose();cleanup=undefined;audio.startMusic('combat');expect(audios[0].paused).toBe(true)
})
it('keeps the newest scene playing when an old play promise finishes late',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 let finish!:()=>void
 audios[0].play.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve}))
 audio.startMusic();audio.startMusic('combat');await settle()
 finish();await settle();expect(audios[0].paused).toBe(false)
 expect(audios[0].src).toContain('ancient-war-drums')
})

it('uses separate supplied player and enemy magic samples, with buffer reuse and mute',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.play('magic');await settle();audio.play('enemy-magic');await settle()
 expect(fetch).toHaveBeenCalledWith('/sounds/exploration/yodguard-wind-magic-5-378630.mp3')
 expect(fetch).toHaveBeenCalledWith('/sounds/exploration/yodguard-dark-magic-6-378652.mp3')
 expect(sources).toHaveLength(2)
 audio.play('magic');await settle();expect(fetch).toHaveBeenCalledTimes(2);expect(sources).toHaveLength(3)
 settings.effects=0;audio.play('enemy-magic');await settle();expect(sources).toHaveLength(3)
})

it('plays the supplied equipment sound, caches it and respects mute',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.play('equip');await settle()
 expect(fetch).toHaveBeenCalledWith('/sounds/exploration/freesound_community-item-equip-6904.mp3')
 expect(sources).toHaveLength(1)
 audio.play('equip');await settle();expect(fetch).toHaveBeenCalledTimes(1);expect(sources).toHaveLength(2)
 settings.effects=0;audio.play('equip');await settle();expect(sources).toHaveLength(2)
})

it('loops the supplied quiz clock at effects volume and stops or disposes it immediately',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.startQuizClock();await settle()
 const clock=audios[1]
 expect(clock.src).toContain('phoenix_connection_brazil-time-passing-sound-effect-fast-clock-108403.mp3')
 expect(clock.loop).toBe(true);expect(clock.paused).toBe(false);expect(clock.volume).toBeCloseTo(.4)
 audio.startQuizClock();await settle();expect(clock.play).toHaveBeenCalledOnce()
 settings.effects=0;window.dispatchEvent(new Event('test-audio-volume'));expect(clock.paused).toBe(true)
 settings.effects=60;window.dispatchEvent(new Event('test-audio-volume'));await settle();expect(clock.paused).toBe(false);expect(clock.volume).toBeCloseTo(.3)
 settings.enabled=false;window.dispatchEvent(new Event('test-sound-enabled'));expect(clock.paused).toBe(true)
 settings.enabled=true;window.dispatchEvent(new Event('test-sound-enabled'));await settle();expect(clock.paused).toBe(false)
 clock.currentTime=5;audio.stopQuizClock();expect(clock.paused).toBe(true);expect(clock.currentTime).toBe(0)
 window.dispatchEvent(new Event('test-audio-volume'));await settle();expect(clock.paused).toBe(true)
 audio.startQuizClock();await settle();audio.dispose();cleanup=undefined
 expect(clock.paused).toBe(true);expect(clock.removeAttribute).toHaveBeenCalledWith('src')
})
it('does not revive the quiz clock after a pending play finishes past the end of the quiz',async()=>{
 const audio=createExplorationAudio();cleanup=audio.dispose
 audio.startQuizClock();await settle();audio.stopQuizClock()
 const clock=audios[1];let finish!:()=>void
 clock.play.mockImplementationOnce(()=>new Promise<void>(resolve=>{clock.paused=false;finish=resolve}))
 audio.startQuizClock();audio.stopQuizClock();finish();await settle()
 expect(clock.paused).toBe(true)
})
