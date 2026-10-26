import {afterEach,expect,it,vi} from 'vitest'
import {createWhackAudio} from '@/features/arcade/pongi-whack-audio'
const prefs=vi.hoisted(()=>({sound:true,volume:40}))
vi.mock('@/features/audio/audio-preferences',()=>({audioVolume:()=>prefs.volume,audioVolumeChanged:'test-volume'}))
vi.mock('@/features/fishing/sound-preference',()=>({readFishingSound:()=>prefs.sound,fishingSoundChanged:'test-sound'}))
const param=()=>({value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()})
afterEach(()=>{prefs.sound=true;prefs.volume=40;vi.unstubAllGlobals()})
it('makes distinct short tones/noise for all five targets and applies effects volume changes',()=>{
 const gains:any[]=[],tones:any[]=[],noises:any[]=[]
 const node=()=>({connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null})
 class Context{
  currentTime=0;state='running';sampleRate=48000;destination={};close=vi.fn().mockResolvedValue(undefined)
  createGain(){const g={...node(),gain:param()};gains.push(g);return g}
  createOscillator(){const n={...node(),frequency:param()};tones.push(n);return n}
  createBuffer(_:number,length:number){return {getChannelData:()=>new Float32Array(length)}}
  createBufferSource(){const n={...node(),buffer:null};noises.push(n);return n}
  createBiquadFilter(){return {...node(),frequency:param()}}
 }
 vi.stubGlobal('AudioContext',Context)
 const audio=createWhackAudio()
 for(const kind of ['pongi','golden','bomb','impostor','hay'] as const)audio.play(kind)
 expect(tones).toHaveLength(8);expect(noises).toHaveLength(2)
 expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(.4,0)
 prefs.volume=0;window.dispatchEvent(new Event('test-volume'))
 expect(gains[0].gain.setValueAtTime).toHaveBeenLastCalledWith(0,0)
 audio.play('pongi');expect(tones).toHaveLength(8)
 audio.dispose();expect(tones.every(n=>n.stop.mock.calls.length>=2)).toBe(true)
})
it('does not create an audio engine while sound is disabled',()=>{
 const Context=vi.fn();vi.stubGlobal('AudioContext',Context);prefs.sound=false
 const audio=createWhackAudio();audio.play('bomb');audio.dispose();expect(Context).not.toHaveBeenCalled()
})
