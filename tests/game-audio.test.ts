import {afterEach,beforeEach,expect,it,vi} from 'vitest'
let contexts:FakeContext[]=[],sources:FakeSource[]=[]
const buffer={duration:1,length:44100,numberOfChannels:1,sampleRate:44100,getChannelData:()=>new Float32Array(44100)} as unknown as AudioBuffer
class FakeSource{
 buffer:AudioBuffer|null=null;loop=false;onended:(()=>void)|null=null
 connect=vi.fn();disconnect=vi.fn();start=vi.fn();stop=vi.fn()
 constructor(){sources.push(this)}
}
class FakeContext{
 state='suspended';currentTime=0;destination={}
 resume=vi.fn(async()=>{this.state='running'});suspend=vi.fn(async()=>{this.state='suspended'})
 decodeAudioData=vi.fn(async()=>buffer)
 createBufferSource=vi.fn(()=>new FakeSource())
 createGain=vi.fn(()=>({connect:vi.fn(),disconnect:vi.fn(),gain:{setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()}}))
 constructor(){contexts.push(this)}
}
let audio:typeof import('@/features/fishing/game-audio')
beforeEach(async()=>{
 vi.resetModules();vi.useFakeTimers();contexts=[];sources=[];localStorage.clear()
 vi.stubGlobal('AudioContext',FakeContext);vi.stubGlobal('Audio',vi.fn())
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})))
 audio=await import('@/features/fishing/game-audio')
})
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.clear()})
it('shares one context and decoded buffer without making media players, and sleeps when the last voice stops',async()=>{
 const first=audio.createGameAudio('/sounds/buy.mp3'),second=audio.createGameAudio('/sounds/buy.mp3')
 first.volume=.6;second.loop=true;await Promise.all([first.play(),second.play()])
 expect(contexts).toHaveLength(1);expect(fetch).toHaveBeenCalledOnce();expect(contexts[0].decodeAudioData).toHaveBeenCalledOnce()
 expect(Audio).not.toHaveBeenCalled();expect(sources).toHaveLength(2);expect(sources[1].loop).toBe(true)
 first.pause();await vi.advanceTimersByTimeAsync(400);expect(contexts[0].suspend).not.toHaveBeenCalled()
 second.pause();await vi.advanceTimersByTimeAsync(300);expect(contexts[0].suspend).toHaveBeenCalledOnce()
})
it('loads short water and reel buffers rather than decoding the large originals',async()=>{
 for(const [original,derived] of [['aquarium-ambience','aquarium-water-loop'],['fishing-bg','fishing-water-loop'],['reel','reel-four-seconds']]){
  const sound=audio.createGameAudio(`/sounds/${original}.mp3`);await sound.play();sound.pause()
  expect(fetch).toHaveBeenCalledWith(`/sounds/buffers/${derived}.mp3`,expect.anything())
 }
})
it('does not start a voice after it was disposed during download or decode',async()=>{
 const sound=audio.createGameAudio('/sounds/caught.mp3'),pending=sound.play()
 sound.removeAttribute('src');await pending
 expect(sources).toHaveLength(0)
})
it('cleans up naturally ended voices and rejects failed downloads without a media-element fallback',async()=>{
 const sound=audio.createGameAudio('/sounds/add.mp3'),ended=vi.fn();sound.addEventListener('ended',ended)
 await sound.play();sources[0].onended?.();expect(ended).toHaveBeenCalledOnce();expect(sources[0].disconnect).toHaveBeenCalled()
 vi.mocked(fetch).mockResolvedValueOnce({ok:false} as Response)
 await expect(audio.createGameAudio('/sounds/missing.mp3').play()).rejects.toThrow('AUDIO_LOAD_FAILED')
 expect(Audio).not.toHaveBeenCalled()
 await vi.advanceTimersByTimeAsync(300);expect(contexts[0].suspend).toHaveBeenCalledOnce()
})
it('primes once on a gesture and suspends active effects when the page is hidden',async()=>{
 const cleanup=audio.installGameAudioLifecycle()
 window.dispatchEvent(new Event('pointerdown'));expect(contexts).toHaveLength(1)
 await vi.advanceTimersByTimeAsync(300)
 const resumes=contexts[0].resume.mock.calls.length
 window.dispatchEvent(new Event('pointerdown'));expect(contexts[0].resume).toHaveBeenCalledTimes(resumes)
 const sound=audio.createGameAudio('/sounds/buy.mp3');await sound.play()
 vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'))
 expect(sources[0].stop).toHaveBeenCalledOnce();expect(contexts[0].state).toBe('suspended')
 cleanup()
})
it('evicts old decoded audio when the PCM cache exceeds its memory budget',async()=>{
 const first=audio.createGameAudio('/sounds/cache-a.mp3')
 const initial=first.play();contexts[0].decodeAudioData.mockResolvedValue({...buffer,length:3*1024*1024})
 await initial;first.pause()
 for(const name of ['b','c']){const sound=audio.createGameAudio(`/sounds/cache-${name}.mp3`);await sound.play();sound.pause()}
 expect(fetch).toHaveBeenCalledTimes(3)
 const again=audio.createGameAudio('/sounds/cache-a.mp3');await again.play();again.pause()
 expect(fetch).toHaveBeenCalledTimes(4)
})
