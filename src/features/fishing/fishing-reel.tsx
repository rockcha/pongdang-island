import {hasRodImages} from './rod-image-assets'
import {hasRodSkin,RodSkinFrame,RodSkinRotor,rodReelBackground} from './rod-skin-art'
import type {FishingRod} from './fishing-rods'
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

export type FishingStart={label:string;disabled:boolean;onStart:()=>void;caption?:string}
type Props={rod?:FishingRod;active:boolean;waiting:boolean;won:boolean;pressed:boolean;reduced:boolean;tension:number;rotation:number;start?:FishingStart;buttonRef:RefObject<HTMLButtonElement|null>;onHold:(pointerId?:number)=>void;onRelease:()=>void}
export function FishingReel({rod,active,waiting,won,pressed,reduced,tension,rotation,start,buttonRef,onHold,onRelease}:Props){
 const pointer=useRef<number|null>(null)
 useEffect(()=>{if(!pressed)pointer.current=null},[pressed])
 const release=()=>{pointer.current=null;onRelease()}
 const danger=tension>85||tension<20
 return <>{active&&!waiting&&!won&&<div className="pointer-events-none absolute bottom-[100px] left-[30px] z-20 flex size-23 items-center justify-center rounded-full bg-slate-950/75 text-white shadow-lg" aria-hidden="true"><svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90"><circle cx="50" cy="50" r="43" fill="none" stroke="white" strokeOpacity=".15" strokeWidth="8"/><circle cx="50" cy="50" r="43" fill="none" stroke={danger?'#ff9c7a':'#b9f5df'} strokeWidth="8" strokeLinecap="round" strokeDasharray={Math.max(0,Math.min(100,tension))/100*270+' 270'}/></svg><span className={'text-sm font-semibold '+(danger?'text-orange-200 motion-safe:animate-pulse':'text-white')}>{danger?'위험':'안정'}</span></div>}<button ref={buttonRef} type="button" disabled={active?waiting||won:!start||start.disabled} aria-label={active?'꾹 눌러 당기기':start?.label??'낚시 시작'} aria-pressed={active?pressed:undefined}
  style={!rod||rod.id==='basic'?{backgroundImage:'linear-gradient(140deg,#53565a,#292b2f 55%,#181a1d)'}:hasRodSkin(rod.id)?{backgroundImage:`linear-gradient(140deg,${rod.color},${rodReelBackground(rod.id)})`}:undefined}
  className={`absolute bottom-10 right-4 flex size-36 touch-none select-none flex-col items-center justify-center overflow-hidden rounded-full border border-white/35 text-white shadow-[0_12px_36px_#092f3e50,inset_0_2px_0_#ffffff55] outline-none transition-[transform,box-shadow] focus-visible:ring-4 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-teal-800 motion-reduce:transition-none sm:size-40 ${pressed?'scale-95 bg-gradient-to-br from-teal-500 to-teal-800 shadow-[0_0_35px_#94cfff66]':'bg-gradient-to-br from-[#438b89] via-[#286a71] to-[#164657] hover:shadow-[0_12px_40px_#092f3e70,inset_0_2px_0_#ffffff66]'} disabled:opacity-60`}
  onClick={()=>{if(!active)start?.onStart()}}
  onPointerDown={e=>{if(!active||waiting||won||pointer.current!==null)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);onHold(e.pointerId)}}
  onPointerUp={e=>{if(pointer.current===e.pointerId)release()}} onPointerCancel={release} onLostPointerCapture={release} onContextMenu={e=>{if(active)e.preventDefault()}}
  onKeyDown={e=>{if(active&&!waiting&&!won&&(e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();onHold()}}}
  onKeyUp={e=>{if(active&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();release()}}} onBlur={release}>
  <svg data-equipped-reel={rod?.id??"basic"} style={rod&&rod.id!=="basic"?{color:rod.accent}:undefined} viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
   {(hasRodSkin(rod?.id)||hasRodImages(rod?.id))?<g opacity={active?1:.35}><g transform="translate(50 50)"><RodSkinFrame id={rod!.id}/><g transform={`rotate(${reduced?0:rotation})`}><RodSkinRotor id={rod!.id}/></g></g></g>:<>   <g opacity={active?1:.17} transform={`rotate(${reduced?0:rotation} 50 50)`}><circle cx="50" cy="50" r="29" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeOpacity=".45"/><path d="M23 50h54M50 23v54" stroke="currentColor" strokeWidth="2"/><circle cx="74" cy="50" r="6" fill={rod&&rod.id!=="basic"?rod.accent:"#e4bf91"}/><circle cx="50" cy="50" r="7" fill={rod&&rod.id!=="basic"?rod.color:"#d9eee3"}/></g></>}
  </svg>
  {!active?<span className="pointer-events-none relative flex max-w-28 flex-col items-center gap-1 px-2 text-center"><span className="text-base font-bold tracking-wide sm:text-lg">{start?.caption??'낚시 시작'}</span><span className="text-[10px] font-normal tracking-widest text-white/60">릴을 눌러 시작</span></span>:<span className="sr-only">{waiting?'찌가 잠기면 시작해요':pressed?'당기는 중 · 떼면 줄 풀기':'꾹 눌러 당기기'}</span>}
 </button></>
}
