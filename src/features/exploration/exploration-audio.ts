import { audioVolume, audioVolumeChanged } from '@/features/audio/audio-preferences'
import { readFishingSound, fishingSoundChanged } from '@/features/fishing/sound-preference'
import {claimPlayback,playbackEvent} from '@/features/music/playback-ownership'

const audioRoot='/sounds/exploration/'
const musicTracks={exploration:'freesound_community-dark-sahara-egypt-22334.mp3',merchant:'kaazoom-embers-on-the-flagstone-stinger-medieval-tavern-rpg-game-music-616104.mp3',combat:'dragon-studio-ancient-war-drums-463214.mp3'} as const
export type ExplorationMusicScene=keyof typeof musicTracks
const samples={loot:'yodguard-inventory-open_close-3-540173.mp3',equip:'freesound_community-item-equip-6904.mp3',magic:'yodguard-wind-magic-5-378630.mp3','enemy-magic':'yodguard-dark-magic-6-378652.mp3',gold:'universfield-coin-drop-229314.mp3','health-potion':'yodguard-potion-drink-3-540167.mp3','mana-potion':'yodguard-potion-drink-4-540186.mp3',fire:'yodguard-fire-magic-5-378639.mp3',critical:'dragon-studio-violent-sword-slice-393848.mp3',attack:'dragon-studio-sword-slice-393847.mp3',hit:'universfield-punch-impact-hit-567196.mp3',door:'dragon-studio-opening-door-450444.mp3',arrival:'dragon-studio-growl-of-the-beast-504021.mp3',descent:'freesound_community-concrete-footsteps-1-6265.mp3'} as const

/** Short, softly enveloped effects share the game's volume and mute preference. */
export function createExplorationAudio() {
  let context: AudioContext | undefined,
    master: GainNode | undefined,
    disposed = false
  const sources = new Set<AudioScheduledSourceNode>()
  let musicScene:ExplorationMusicScene='exploration',musicEpoch=0
  const music=new Audio(audioRoot+musicTracks[musicScene])
  music.loop=true;music.preload='auto'
  let musicWanted=true,musicPending=false,descending=false,descentEpoch=0,descentSource:AudioBufferSourceNode|undefined
  let quizClock:HTMLAudioElement|undefined,quizClockWanted=false,quizClockPending=false,quizClockEpoch=0
  function syncQuizClock(){
    if(!quizClock)return
    quizClock.volume=.5*audioVolume('effects')/100
    if(disposed||document.hidden||!quizClockWanted||!musicWanted||!readFishingSound()||audioVolume('effects')===0){quizClock.pause();return}
    if(quizClockPending||!quizClock.paused)return
    const clock=quizClock,epoch=quizClockEpoch;quizClockPending=true
    void clock.play().catch(()=>{}).finally(()=>{if(epoch!==quizClockEpoch)return;quizClockPending=false;if(disposed||document.hidden||!quizClockWanted||!musicWanted||!readFishingSound()||audioVolume('effects')===0)clock.pause()})
  }
  function stopQuizClock(){quizClockWanted=false;quizClockEpoch++;quizClockPending=false;if(quizClock){quizClock.pause();quizClock.currentTime=0}}
  const decoded=new Map<string,Promise<AudioBuffer>>()
  function startMusic(){
    if(disposed||document.hidden||!musicWanted||musicPending||!music.paused||audioVolume('music')===0)return
    musicPending=true
    const epoch=musicEpoch
    claimPlayback('exploration')
    void music.play().catch(()=>{}).finally(()=>{if(epoch!==musicEpoch)return;musicPending=false;if(disposed||document.hidden||!musicWanted)music.pause()})
  }
  function prepare(){
    context??=new AudioContext()
    if(!master){master=context.createGain();master.connect(context.destination)}
    if(context.state==='suspended')void context.resume().catch(()=>{})
    volume()
  }
  function bufferFor(kind:keyof typeof samples){
    let buffer=decoded.get(kind)
    if(!buffer){const ctx=context!;buffer=fetch(audioRoot+samples[kind]).then(response=>{if(!response.ok)throw Error('AUDIO_LOAD_FAILED');return response.arrayBuffer()}).then(bytes=>ctx.decodeAudioData(bytes));decoded.set(kind,buffer);void buffer.catch(()=>{decoded.delete(kind)})}
    return buffer
  }
  function sample(kind:keyof typeof samples,loop=false){
    if(disposed||document.hidden||!readFishingSound()||audioVolume('effects')===0)return
    try{
      prepare()
      const ctx=context!,epoch=descentEpoch,requested=performance.now()
      const buffer=bufferFor(kind)
      void buffer.then(data=>{
        if(disposed||document.hidden||!readFishingSound()||audioVolume('effects')===0)return
        if(loop?(!descending||epoch!==descentEpoch||!!descentSource):performance.now()-requested>500)return
        const source=ctx.createBufferSource(),gain=ctx.createGain()
        source.buffer=data;source.loop=loop;gain.gain.value=loop?.38:kind==='attack'?.55:.6
        gain.connect(master!);attach(source,gain)
        if(loop){descentSource=source;const ended=source.onended;source.onended=event=>{if(descentSource===source)descentSource=undefined;ended?.call(source,event)}}
        source.start()
      }).catch(()=>{})
    }catch{/* Unavailable audio never interrupts the run. */}
  }
  function stopDescent(){
    descending=false;descentEpoch++
    if(descentSource){try{descentSource.stop()}catch{}sources.delete(descentSource);descentSource=undefined}
  }
  const volume = () => {
    music.volume=.28*audioVolume('music')/100
    syncQuizClock()
    if (context && master)
      master.gain.setValueAtTime(
        readFishingSound() && !document.hidden ? audioVolume('effects') / 100 : 0,
        context.currentTime,
      )
  }
  const stop = () => {
    for (const source of sources) {
      try {
        source.stop()
      } catch {}
      source.disconnect()
    }
    sources.clear()
  }
  const visibility = () => {
    if (document.hidden){music.pause();descentEpoch++;stop();descentSource=undefined}
    volume()
    if(!document.hidden){startMusic();if(descending)sample('descent',true)}
  }
  const preferences=()=>{volume();if(audioVolume('music')===0)music.pause();else startMusic();if(descending)sample('descent',true)}
  const ownership=(event:Event)=>{if((event as CustomEvent).detail!=='exploration'){musicWanted=false;music.pause();syncQuizClock()}}
  const gesture=()=>{if(disposed)return;startMusic();try{prepare();if(descending)sample('descent',true)}catch{}}
  window.addEventListener(audioVolumeChanged, preferences)
  window.addEventListener(fishingSoundChanged, preferences)
  window.addEventListener(playbackEvent,ownership)
  window.addEventListener('pointerdown',gesture,{capture:true,passive:true})
  window.addEventListener('keydown',gesture,true)
  document.addEventListener('visibilitychange', visibility)
  function attach(source: AudioScheduledSourceNode, node: AudioNode) {
    source.connect(node)
    sources.add(source)
    source.onended = () => {
      sources.delete(source)
      source.disconnect()
      node.disconnect()
    }
  }
  function tone(
    frequency: number,
    end: number,
    duration: number,
    delay = 0,
    type: OscillatorType = 'sine',
    level = 0.2,
  ) {
    const ctx = context!,
      at = ctx.currentTime + delay,
      osc = ctx.createOscillator(),
      gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, at)
    osc.frequency.exponentialRampToValueAtTime(end, at + duration)
    gain.gain.setValueAtTime(0.001, at)
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
    gain.connect(master!)
    attach(osc, gain)
    osc.start(at)
    osc.stop(at + duration + 0.01)
  }
  function noise(duration: number, frequency: number, level: number) {
    const ctx = context!,
      buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate),
      data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain()
    source.buffer = buffer
    filter.type = 'lowpass'
    filter.frequency.value = frequency
    gain.gain.value = level
    source.connect(filter)
    filter.connect(gain)
    gain.connect(master!)
    sources.add(source)
    source.onended = () => {
      sources.delete(source)
      source.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
    source.start()
    source.stop(ctx.currentTime + duration)
  }
  return {
    startMusic(scene:ExplorationMusicScene=musicScene){
      if(disposed)return
      if(scene!==musicScene){musicEpoch++;musicPending=false;music.pause();musicScene=scene;music.src=audioRoot+musicTracks[scene];music.currentTime=0;music.load()}
      volume();startMusic()
    },
    startDescent(){if(disposed)return;descending=true;sample('descent',true);if(context)for(const kind of ['attack','critical','hit','door','arrival','fire','gold','magic','enemy-magic','equip','loot'] as const)void bufferFor(kind).catch(()=>{})},
    stopDescent,
    startQuizClock(){
      if(disposed)return
      if(!quizClock){quizClock=new Audio(audioRoot+'phoenix_connection_brazil-time-passing-sound-effect-fast-clock-108403.mp3');quizClock.loop=true;quizClock.preload='auto'}
      quizClockWanted=true;syncQuizClock()
    },
    stopQuizClock,
    // Resume inside the user's gesture; delayed combat cues cannot unlock mobile audio.
    unlock() {
      if (disposed) return
      try {
        prepare();startMusic()
      } catch {}
    },
    play(kind: 'loot'|'enemy-magic'|'equip'|'attack'|'fire'|'magic'|'flee'|'hit'|'defense'|'door'|'arrival'|'critical'|'health-potion'|'mana-potion'|'gold') {
      if (disposed || document.hidden || !readFishingSound() || audioVolume('effects') === 0) return
      if(kind==='loot'||kind==='equip'||kind==='magic'||kind==='enemy-magic'||kind==='gold'||kind==='health-potion'||kind==='mana-potion'||kind==='fire'||kind==='critical'||kind==='attack'||kind==='hit'||kind==='door'||kind==='arrival'){sample(kind);return}
      try {
        context ??= new AudioContext()
        if (!master) {
          master = context.createGain()
          master.connect(context.destination)
        }
        volume()
        if (context.state === 'suspended') void context.resume().catch(() => {})
        if (kind === 'flee') {
          noise(0.12, 1800, 0.08)
          tone(180, 100, 0.07, 0, 'triangle', 0.09)
          tone(150, 80, 0.07, 0.11, 'triangle', 0.06)
          tone(120, 60, 0.08, 0.22, 'triangle', 0.035)
        } else {
          tone(720, 430, 0.13, 0, 'sine', 0.07)
        }
      } catch {
        /* Sound never blocks input or score. */
      }
    },
    dispose() {
      disposed = true
      stopQuizClock();if(quizClock){quizClock.removeAttribute('src');quizClock.load()}
      stopDescent();musicWanted=false;music.pause();music.removeAttribute('src');music.load()
      stop()
      window.removeEventListener(audioVolumeChanged, preferences)
      window.removeEventListener(fishingSoundChanged, preferences)
      window.removeEventListener(playbackEvent,ownership)
      window.removeEventListener('pointerdown',gesture,true)
      window.removeEventListener('keydown',gesture,true)
      document.removeEventListener('visibilitychange', visibility)
      if (context) void context.close().catch(() => {})
    },
  }
}
