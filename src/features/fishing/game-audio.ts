import {readFishingSound} from './sound-preference'

export type GameAudio=EventTarget&{preload:string;volume:number;loop:boolean;currentTime:number;play:()=>Promise<void>;pause:()=>void;removeAttribute:(name:string)=>void;load:()=>void}
const smallAssets:Record<string,string>={
 '/sounds/aquarium-ambience.mp3':'/sounds/buffers/aquarium-water-loop.mp3',
 '/sounds/fishing-bg.mp3':'/sounds/buffers/fishing-water-loop.mp3',
 '/sounds/reel.mp3':'/sounds/buffers/reel-four-seconds.mp3',
}
let context:AudioContext|undefined,idleTimer:ReturnType<typeof setTimeout>|undefined,primed=false
const active=new Set<BufferedAudio>()
const buffers=new Map<string,Promise<AudioBuffer>>()
const sizes=new Map<string,number>()
let cachedBytes=0
function constructor(){return window.AudioContext??(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext}
function engine(){
 if(!context||context.state==='closed'){const AudioEngine=constructor();if(!AudioEngine)throw Error('WEB_AUDIO_UNAVAILABLE');context=new AudioEngine({latencyHint:'interactive'})}
 clearTimeout(idleTimer)
 return context
}
function idle(){
 clearTimeout(idleTimer)
 if(!active.size)idleTimer=setTimeout(()=>{if(!active.size&&context?.state==='running')void context.suspend().catch(()=>{})},300)
}
function bufferFor(src:string,audioContext:AudioContext){
 const existing=buffers.get(src)
 if(existing){buffers.delete(src);buffers.set(src,existing);return existing}
 const pending=fetch(src,{cache:'force-cache'}).then(response=>{if(!response.ok)throw Error('AUDIO_LOAD_FAILED');return response.arrayBuffer()}).then(bytes=>audioContext.decodeAudioData(bytes)).then(buffer=>{
  // Smooth the copied ambience boundaries without allocating another PCM buffer.
  if(src.startsWith('/sounds/buffers/')){
   const edge=Math.min(Math.floor(buffer.sampleRate*.015),Math.floor(buffer.length/2))
   for(let channel=0;channel<buffer.numberOfChannels;channel++){
    const samples=buffer.getChannelData(channel)
    for(let i=0;i<edge;i++){const gain=i/edge;samples[i]*=gain;samples[samples.length-1-i]*=gain}
   }
  }
  if(buffers.get(src)!==pending)return buffer
  const size=buffer.length*buffer.numberOfChannels*4;sizes.set(src,size);cachedBytes+=size
  for(const key of buffers.keys()){
   if(cachedBytes<=24*1024*1024)break
   if(key===src)continue
   cachedBytes-=sizes.get(key)??0;sizes.delete(key);buffers.delete(key)
  }
  return buffer
 }).catch(error=>{if(buffers.get(src)===pending)buffers.delete(src);throw error})
 buffers.set(src,pending);return pending
}

/** One shared ambient Web Audio context; no media element or Now Playing owner. */
class BufferedAudio extends EventTarget implements GameAudio{
 preload='none';loop=false;volume=.65
 private offset=0;private began=0;private epoch=0
 private source?:AudioBufferSourceNode;private gain?:GainNode;private duration=0
 private src:string
 constructor(src:string){super();this.src=src}
 get currentTime(){const elapsed=this.source&&context?Math.max(0,context.currentTime-this.began):0;const value=this.offset+elapsed;return this.loop&&this.duration?value%this.duration:value}
 set currentTime(value:number){this.offset=Math.max(0,value)}
 async play(){
  if(this.source)return
  const request=++this.epoch,audioContext=engine();active.add(this)
  try{
   // Resume immediately, before fetch/decode, to retain a direct gesture when available.
   await (audioContext.state==='running'?Promise.resolve():audioContext.resume())
   if(request!==this.epoch)return
   // Suspended iOS autoplay must not download/decode ambience before a gesture.
   const buffer=await bufferFor(smallAssets[this.src]??this.src,audioContext)
   if(request!==this.epoch)return
   if(document.hidden||!readFishingSound()){this.pause();return}
   const source=audioContext.createBufferSource(),gain=audioContext.createGain()
   this.duration=buffer.duration;source.buffer=buffer;source.loop=this.loop
   source.connect(gain);gain.connect(audioContext.destination)
   gain.gain.setValueAtTime(0,audioContext.currentTime)
   gain.gain.linearRampToValueAtTime(Math.max(0,Math.min(1,this.volume)),audioContext.currentTime+.015)
   source.onended=()=>{
    if(this.source!==source)return
    this.source=undefined;source.disconnect();gain.disconnect();this.gain=undefined;this.offset=0;active.delete(this);idle();this.dispatchEvent(new Event('ended'))
   }
   this.source=source;this.gain=gain;this.began=audioContext.currentTime
   source.start(0,this.offset%buffer.duration)
  }catch(error){if(request===this.epoch){this.pause();this.dispatchEvent(new Event('error'))}throw error}
 }
 pause(){
  this.epoch++
  const source=this.source,gain=this.gain
  this.offset=this.currentTime;this.source=undefined;this.gain=undefined
  if(source){source.onended=null;try{source.stop()}catch{}source.disconnect()}
  gain?.disconnect();active.delete(this);idle()
 }
 removeAttribute(name:string){if(name==='src'){this.pause();this.src='';this.offset=0}}
 load(){}
}
export function createGameAudio(src:string):GameAudio{
 return constructor()?new BufferedAudio(src):new Audio(src)
}

/** Prime once on a real gesture; never run an inaudible keep-alive loop. */
export function installGameAudioLifecycle(){
 const unlock=()=>{
  if(!readFishingSound()||document.hidden||primed&&!active.size)return
  try{const audioContext=engine();primed=true;if(audioContext.state!=='running')void audioContext.resume().catch(()=>{});idle()}catch{}
 }
 const visibility=()=>{if(document.hidden){for(const sound of [...active])sound.pause();if(context?.state==='running')void context.suspend().catch(()=>{})}}
 window.addEventListener('pointerdown',unlock,{capture:true,passive:true});window.addEventListener('keydown',unlock,true)
 document.addEventListener('visibilitychange',visibility)
 return()=>{window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true);document.removeEventListener('visibilitychange',visibility)}
}
