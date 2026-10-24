import {TankBubbles} from './tank-bubbles'
import './aquarium-loading.css'

export function AquariumLoading({error,onRetry}:{error?:string;onRetry?:()=>void}){
 return <div role={error?'alert':'status'} aria-live="polite" className="aquarium-loading absolute inset-0 z-20 grid place-items-center overflow-hidden">
  <div aria-hidden="true" className="aquarium-loading-light"/><TankBubbles/>
  <div className="relative flex max-w-xs flex-col items-center gap-3 px-5 text-center text-white">
   <img src="/branding/pongi-aquarium-loading.png" alt="" aria-hidden="true" width={480} height={480} className="h-[min(11rem,30dvh)] w-44 object-contain" draggable={false}/>
   <p className="text-xs leading-6 drop-shadow-sm">{error||'어항을 준비하고 있어요…'}</p>
   {error&&onRetry&&<button type="button" onClick={onRetry} className="min-h-11 rounded-xl border border-white/50 bg-white/15 px-5 text-xs text-white backdrop-blur-sm hover:bg-white/25">다시 준비하기</button>}
  </div>
 </div>
}
