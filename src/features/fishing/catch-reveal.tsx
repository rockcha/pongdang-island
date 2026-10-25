import {HalloweenIcon} from '@/components/collection-filter-icons'
import {Camera} from 'lucide-react'
import {NewDiscoveryBadge} from '@/components/new-discovery-badge'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { collectibleUrl } from '@/features/collection/api'
import type { Species } from '@/features/collection/api'
import { chanceFailurePhrases } from './fishing-practice'
import { rarities } from '@/lib/game/rarity'
import { regionIcons } from '@/features/regions/region-icons'
import {useFishingAudio} from './fishing-audio'
type RevealProps={firstDiscovery?:boolean;onDismiss:()=>void;practice?:boolean;preview?:boolean;regionName?:string;caughtAt?:string;onShare?:()=>void;failureLabel?:string;failureReason?:string|null}&({species:Species;failure?:never}|{species?:never;failure:string})
export function CatchReveal({species,failure,onDismiss,practice=false,preview=false,onShare,failureReason,firstDiscovery=false}:RevealProps){
 const [ready,setReady]=useState(false)
 useFishingAudio('/sounds/caught.mp3',!!species&&!preview,{trigger:species?.id,volume:.7})
 const shareable=!!species&&species.kind!=='map'&&species.kind!=='relic'&&['epic','mythic'].includes(species.rarity)&&!practice&&!!onShare
 useEffect(()=>{const timer=setTimeout(()=>setReady(true),1300);return()=>clearTimeout(timer)},[])
 const nativeRegion=species?.is_native&&species.native_region_id?regionIcons[species.native_region_id]:undefined
 const chanceFailure=['bait','escape','wave'].includes(failureReason??'')
 const [chanceMessage]=useState(()=>chanceFailurePhrases[Math.floor(Math.random()*chanceFailurePhrases.length)])
 const openedAt=useRef(Date.now())
 const lastInput=useRef(0)
 function tryDismiss(){
  const now=Date.now(),previous=lastInput.current
  lastInput.current=now
  if(now-openedAt.current<800||(previous>0&&now-previous<300))return
  onDismiss()
 }
 const failureImage=failureReason==='snap'?'/branding/pongi-fishing-snap.png':failureReason==='slack'?'/branding/pongi-fishing-slack.png':'/branding/pongi-fishing-fail.png'
 const failureAlt=failureReason==='snap'?'끊어진 낚싯줄을 보고 놀란 퐁이':failureReason==='slack'?'느슨해진 낚싯줄을 보고 당황한 퐁이':'낚시에 실패해 시무룩한 퐁이'
 const rarity=species?.rarity??'common',color=species?rarities[rarity].effectColor:'#9aafc9',dismiss=useRef<HTMLButtonElement>(null)
 useEffect(()=>{const previous=document.activeElement;dismiss.current?.focus({preventScroll:true});return()=>{if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true})}},[])
 return createPortal(<div className="fixed inset-0 z-[80] flex h-dvh w-screen items-center justify-center overflow-hidden bg-slate-950/65 p-6 text-center backdrop-blur-sm" style={{color,backgroundImage:species?`radial-gradient(ellipse at center,${color}25,transparent 65%)`:undefined}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();if(!event.repeat)tryDismiss()}}}>
  <button ref={dismiss} type="button" aria-label={species?`${species.name} 결과 닫기`:'낚시 실패 결과 닫기'} onClick={tryDismiss} className="absolute inset-0 size-full cursor-pointer focus-visible:outline-2 focus-visible:outline-white"/>
  <span className="pointer-events-none relative flex w-full max-w-sm flex-col items-center">
   {species&&<span className="catch-grade-rays pointer-events-none absolute left-1/2 top-24 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40" style={{background:`repeating-conic-gradient(from 10deg,transparent 0deg 24deg,${color}33 26deg 32deg,transparent 34deg 48deg)`,maskImage:"radial-gradient(circle,#000 15%,transparent 70%)"}}/>}
   <span className="catch-reveal-glow pointer-events-none absolute left-1/2 top-24 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{background:'radial-gradient(circle,'+color+'88,transparent 68%)'}}/>
   {Array.from({length:!species?0:rarity==='mythic'?22:rarity==='epic'?16:rarity==='rare'?10:6},(_,i)=><span key={i} className="catch-reveal-spark pointer-events-none absolute left-1/2 top-24 size-1.5 rounded-full bg-current" style={{'--spark-x':Math.cos(i*2.4)*(90+i*5)+'px','--spark-y':Math.sin(i*2.4)*120-40+'px'} as CSSProperties}/>)}
   <span className={`${species?"catch-center-figure":"fishing-failure-figure"} relative block size-52 sm:size-64`}><img src={species?collectibleUrl(species.thumbnail_path):failureImage} alt={species?"":failureAlt} className="size-full object-contain" style={{filter:'drop-shadow(0 0 22px '+color+'99)'}}/></span>
   <span role="status" className="relative mt-5 flex w-full flex-col items-center gap-3">
    {species?<span className="flex w-full flex-wrap items-center justify-center gap-x-2.5 gap-y-2">
     {nativeRegion&&<img src={nativeRegion.src} alt={`${nativeRegion.name} 고유종`} title={`${nativeRegion.name} 고유종`} className="size-8 shrink-0 object-contain drop-shadow-md sm:size-9"/>}
     <span className="text-balance break-keep text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_#0005] sm:text-4xl">{species.id.startsWith('halloween-')&&<span aria-label="할로윈 한정" className="mr-1.5 inline-flex align-middle"><HalloweenIcon className="size-[1em] shrink-0"/></span>}{species.name}</span>
     <span className="inline-flex shrink-0 items-center gap-2"><span className="inline-flex h-7 items-center rounded px-2 text-xs font-bold leading-5 text-white" style={{backgroundColor:color}}>{rarities[rarity].label}</span>{firstDiscovery&&!practice&&<NewDiscoveryBadge size="md"/>}</span>
    </span>:<>
     <span className="text-2xl font-bold tracking-tight text-white">낚시 실패</span>
    </>}
    {species&&<span className="h-px w-12 bg-gradient-to-r from-transparent via-current to-transparent opacity-70" aria-hidden="true"/>}
    {species?.description&&<span className="max-w-xs text-pretty break-keep px-2 text-sm font-normal leading-7 text-white/85 drop-shadow-sm">{species.description}</span>}
    {!species&&<span className="max-w-xs text-sm leading-6 text-white/90">{chanceFailure?chanceMessage:failure}</span>}
    {practice&&<span className="text-xs text-white/60">{species?'연습 결과예요. 실제 보상은 지급되지 않아요.':'연습에서는 미끼를 사용하지 않아요.'}</span>}
   </span>
   <span className="relative mt-8 text-xs text-white/50">화면을 누르면 계속해요</span>
  </span>
  {shareable&&<button type="button" disabled={!ready} onClick={()=>onShare?.()} className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 text-sm text-white outline-none backdrop-blur-sm hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"><Camera className="size-4"/>자랑하기</button>}
 </div>,document.body)
}
