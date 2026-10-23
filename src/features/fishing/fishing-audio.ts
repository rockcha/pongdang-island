import {useEffect} from 'react'
import type {Rarity} from '@/lib/game/rarity'
import {fishingSoundChanged,fishingSoundKey,readFishingSound} from './sound-preference'
import {createGameAudio} from './game-audio'

export function fishingSplash(rarity:Rarity){
 return `/sounds/${rarity==='common'?'tiny-splash':rarity==='rare'?'small-splash':'big-splash'}.mp3`
}

/** Each sound belongs to one scene/action, including its timers and mute listeners. */
export function useFishingAudio(src:string,enabled:boolean,{loop=false,volume=.65,segmentSeconds,trigger,delayMs=0}:{loop?:boolean;volume?:number;segmentSeconds?:number;trigger?:string;delayMs?:number}={}){
 useEffect(()=>{
  if(!enabled)return
  const audio=createGameAudio(src)
  audio.preload='none';audio.volume=volume;audio.loop=loop&&!segmentSeconds
  let disposed=false,playing=false,played=false,generation=0
  let segmentTimer:ReturnType<typeof setTimeout>|undefined
  const clearSegment=()=>{clearTimeout(segmentTimer);segmentTimer=undefined}
  const stop=()=>{generation++;playing=false;clearSegment();audio.pause()}
  const allowed=()=>!disposed&&readFishingSound()&&!document.hidden
  const play=()=>{
   if(!allowed()||playing||(!loop&&played))return
   playing=true;played=true
   const request=++generation
   void Promise.resolve(audio.play()).then(()=>{
    if(disposed){audio.pause();return}
    if(request!==generation){if(!playing)audio.pause();return}
    if(!allowed()){stop();return}
    if(segmentSeconds)segmentTimer=setTimeout(repeatSegment,segmentSeconds*1000)
   }).catch(()=>{if(request===generation)playing=false})
  }
  const repeatSegment=()=>{
   if(!playing)return
   stop();audio.currentTime=0
   if(loop)play()
  }
  const timeUpdate=()=>{if(segmentSeconds&&audio.currentTime>=segmentSeconds)repeatSegment()}
  const sync=()=>{if(!allowed())stop();else if(loop)play()}
  const gesture=()=>{if(loop)play()}
  const storage=(event:StorageEvent)=>{if(event.key===fishingSoundKey||event.key===null)sync()}
  // Delay one-shot playback until the effect survives Strict Mode's cleanup pass.
  const startTimer=setTimeout(play,delayMs)
  audio.addEventListener('timeupdate',timeUpdate)
  window.addEventListener(fishingSoundChanged,sync);window.addEventListener('storage',storage)
  document.addEventListener('visibilitychange',sync)
  if(loop){window.addEventListener('pointerdown',gesture);window.addEventListener('keydown',gesture)}
  return()=>{
   disposed=true;clearTimeout(startTimer);stop()
   audio.removeEventListener('timeupdate',timeUpdate)
   window.removeEventListener(fishingSoundChanged,sync);window.removeEventListener('storage',storage)
   document.removeEventListener('visibilitychange',sync)
   window.removeEventListener('pointerdown',gesture);window.removeEventListener('keydown',gesture)
   audio.removeAttribute('src');audio.load()
  }
 },[src,enabled,loop,volume,segmentSeconds,trigger,delayMs])
}
