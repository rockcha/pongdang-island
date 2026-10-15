import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { collectibleUrl } from '@/features/collection/api'
import type { Species } from '@/features/collection/api'
import { rarities } from '@/lib/game/rarity'
type RevealProps={onDismiss:()=>void;practice?:boolean}&({species:Species;failure?:never}|{species?:never;failure:string})
export function CatchReveal({species,failure,onDismiss,practice=false}:RevealProps){
 const rarity=species?.rarity??'common',color=species?rarities[rarity].effectColor:'#9aafc9',dismiss=useRef<HTMLButtonElement>(null)
 useEffect(()=>{const previous=document.activeElement;dismiss.current?.focus({preventScroll:true});return()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true})}},[])
 return createPortal(<button ref={dismiss} type="button" aria-label={species?`${species.name} 결과 닫기`:'낚시 실패 결과 닫기'} onClick={onDismiss} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();onDismiss()}}} className="fixed inset-0 z-[80] flex h-dvh w-screen cursor-pointer items-center justify-center overflow-hidden bg-slate-950/65 p-6 text-center backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-white" style={{color,backgroundImage:species?`radial-gradient(ellipse at center,${color}25,transparent 65%)`:undefined}}>
  <span className="relative flex w-full max-w-sm flex-col items-center">
   {species&&<span className="catch-grade-rays pointer-events-none absolute left-1/2 top-24 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40" style={{background:`repeating-conic-gradient(from 10deg,transparent 0deg 24deg,${color}33 26deg 32deg,transparent 34deg 48deg)`,maskImage:"radial-gradient(circle,#000 15%,transparent 70%)"}}/>}
   <span className="catch-reveal-glow pointer-events-none absolute left-1/2 top-24 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{background:'radial-gradient(circle,'+color+'88,transparent 68%)'}}/>
   {Array.from({length:!species?0:rarity==='mythic'?22:rarity==='epic'?16:rarity==='rare'?10:6},(_,i)=><span key={i} className="catch-reveal-spark pointer-events-none absolute left-1/2 top-24 size-1.5 rounded-full bg-current" style={{'--spark-x':Math.cos(i*2.4)*(90+i*5)+'px','--spark-y':Math.sin(i*2.4)*120-40+'px'} as CSSProperties}/>)}
   <span className={`${species?"catch-center-figure":"fishing-failure-figure"} relative block size-52 sm:size-64`}><img src={species?collectibleUrl(species.thumbnail_path):"/branding/pongi-fishing-fail.png"} alt={species?"":"낚시에 실패해 시무룩한 퐁이"} className="size-full object-contain" style={{filter:'drop-shadow(0 0 22px '+color+'99)'}}/></span>
   <span role="status" className="relative mt-5 flex flex-col items-center gap-3"><span className="rounded-full border border-current/30 px-4 py-1 text-sm font-semibold">{species?rarities[rarity].label:"다음엔 꼭 만나요"}</span><span className="text-xl font-semibold text-white sm:text-2xl">{species?species.name+" 획득!":"낚시 실패"}</span>{!species&&<span className="max-w-xs text-sm leading-6 text-white/90">{failure}</span>}<span className="text-xs text-white/70">{species?(practice?'연습 결과예요. 실제 보상은 지급되지 않아요.':species.kind==='map'?'새 항로가 열렸어요.':'보관함에 들어갔어요.'):(practice?'연습에서는 미끼를 사용하지 않아요.':'사용한 미끼 1개는 소모됐어요.')}</span></span>
   <span className="relative mt-8 text-xs text-white/50">화면을 누르면 계속해요</span>
  </span>
 </button>,document.body)
}
