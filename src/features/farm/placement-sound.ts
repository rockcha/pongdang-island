import {createGameAudio} from '@/features/fishing/game-audio'
import {readFishingSound,fishingSoundChanged,fishingSoundKey} from '@/features/fishing/sound-preference'

let stopPrevious:(()=>void)|undefined
export function playFarmPlacementSound(volume=.4){
 if(typeof window==='undefined'||!readFishingSound()||document.hidden)return
 stopPrevious?.()
 try{
  const audio=createGameAudio('/sounds/farm-place.wav');audio.volume=Math.max(0,Math.min(1,volume))
  let stopped=false
  const mute=()=>{if(!readFishingSound()||document.hidden)stop()}
  const storage=(event:StorageEvent)=>{if(event.key===fishingSoundKey||event.key===null)mute()}
  const timer=window.setTimeout(stop,1200)
  function stop(){
   if(stopped)return;stopped=true;window.clearTimeout(timer)
   audio.pause();audio.removeAttribute('src');audio.load()
   audio.removeEventListener('ended',stop);audio.removeEventListener('error',stop)
   window.removeEventListener(fishingSoundChanged,mute);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',mute)
   if(stopPrevious===stop)stopPrevious=undefined
  }
  stopPrevious=stop
  audio.addEventListener('ended',stop);audio.addEventListener('error',stop)
  window.addEventListener(fishingSoundChanged,mute);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',mute)
  void Promise.resolve(audio.play()).then(()=>{if(stopped)audio.pause()}).catch(stop)
 }catch{/* Placement remains successful if audio is unavailable. */}
}
