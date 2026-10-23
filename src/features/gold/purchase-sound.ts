import {fishingSoundChanged,fishingSoundKey,readFishingSound} from '@/features/fishing/sound-preference'

const heard=new Set<string>()
let stopPrevious:(()=>void)|undefined
/** Call after a confirmed result, with its stable operation ID. */
function playTradeSound(action:'buy'|'sell'|'add',operationId:string){
 const key=`${action}:${operationId}`
 if(typeof window==='undefined'||heard.has(key))return
 heard.add(key)
 if(heard.size>500)heard.delete(heard.values().next().value!)
 if(!readFishingSound()||document.hidden)return
 // Rewards share a channel: simultaneous items chime once; trades take priority.
 if(action==='add'&&stopPrevious)return
 stopPrevious?.()
 try{
  const audio=new Audio(`/sounds/${action}.mp3`);audio.volume=.6
  let stopped=false
  const mute=()=>{if(!readFishingSound())stop()}
  const storage=(event:StorageEvent)=>{if(event.key===fishingSoundKey||event.key===null)mute()}
  const visibility=()=>{if(document.hidden)stop()}
  const timer=setTimeout(()=>stop(),10000)
  function stop(){
   if(stopped)return;stopped=true;clearTimeout(timer)
   audio.pause();audio.removeAttribute('src');audio.load()
   audio.removeEventListener('ended',stop);audio.removeEventListener('error',stop)
   window.removeEventListener(fishingSoundChanged,mute);window.removeEventListener('storage',storage)
   document.removeEventListener('visibilitychange',visibility)
   if(stopPrevious===stop)stopPrevious=undefined
  }
  stopPrevious=stop
  audio.addEventListener('ended',stop);audio.addEventListener('error',stop)
  window.addEventListener(fishingSoundChanged,mute);window.addEventListener('storage',storage)
  document.addEventListener('visibilitychange',visibility)
  void Promise.resolve(audio.play()).then(()=>{if(stopped)audio.pause()}).catch(stop)
 }catch{/* Audio must never turn a successful trade into an error. */}
}
export const playPurchaseSound=(operationId:string)=>playTradeSound('buy',operationId)
export const playSaleSound=(operationId:string)=>playTradeSound('sell',operationId)
export const playRewardSound=(operationId:string)=>playTradeSound('add',operationId)
