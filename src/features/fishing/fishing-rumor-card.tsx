import {memo,useEffect,useRef,useId} from 'react'
import {fishingToolButton} from '@/components/fishing-dock-style'
import {appArt} from '@/components/app-art'
import {ChevronDown,Minus} from 'lucide-react'
import {islandRumorAt} from './island-rumors'

export const FishingRumorCard=memo(function FishingRumorCard({seed,page=0,collapsed,onCollapsedChange,iconOnly=false}:{seed:number;page?:number;collapsed:boolean;onCollapsedChange:(collapsed:boolean)=>void;iconOnly?:boolean}){
 const rumor=islandRumorAt(seed,page)
 const storyId=useId()
 const toggle=useRef<HTMLButtonElement>(null),previous=useRef(collapsed)
 useEffect(()=>{if(previous.current!==collapsed){previous.current=collapsed;toggle.current?.focus({preventScroll:true})}},[collapsed])
 if(iconOnly)return <div className="relative">
  <button ref={toggle} type="button" aria-label={collapsed?'알고 계신가요? 이야기 펼치기':'알고 계신가요? 이야기 최소화'} title="알고 계신가요?" aria-expanded={!collapsed} aria-controls={storyId} onClick={()=>onCollapsedChange(!collapsed)} className={fishingToolButton}><appArt.fishingTips className="size-7"/></button>
  {!collapsed&&<aside id={storyId} aria-label="알고 계신가요?" className="absolute bottom-0 left-full ml-2 w-[min(18rem,calc(100vw-5rem))] rounded-xl border border-white/20 bg-slate-950/75 px-3.5 py-3 text-white shadow-lg backdrop-blur-md">
   <h2 className="mb-1.5 flex items-center gap-1.5 pr-6 text-[10px] font-normal text-white/70"><appArt.fishingTips className="size-5"/>알고 계신가요?</h2>
   <button type="button" aria-label="이야기 닫기" onClick={()=>onCollapsedChange(true)} className="absolute right-0.5 top-0.5 flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><Minus aria-hidden="true" className="size-3.5"/></button>
   <p key={rumor.id} className="fishing-rumor-enter break-keep text-[11px] leading-[1.85] text-white/90">{rumor.text}</p>
  </aside>}
 </div>
 if(collapsed)return <button ref={toggle} type="button" aria-label="알고 계신가요? 이야기 펼치기" aria-expanded={false} onClick={()=>onCollapsedChange(false)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/25 px-3 text-[10px] text-white/80 backdrop-blur-[2px] hover:bg-slate-950/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><appArt.fishingTips className="size-4"/>바닷속 이야기<ChevronDown aria-hidden="true" className="size-3"/></button>
 return <aside aria-label="알고 계신가요?" className="pointer-events-none relative min-w-0 max-w-sm flex-1 rounded-xl border border-white/10 bg-slate-950/25 px-3.5 py-3 text-white backdrop-blur-[2px]">
  <div className="mb-1.5 flex items-center gap-1.5 pr-6 text-white/65"><appArt.fishingTips className="size-4"/><h2 className="text-[9px] font-normal tracking-wider">알고 계신가요?</h2></div>
  <button ref={toggle} type="button" aria-label="알고 계신가요? 이야기 최소화" title="이야기 최소화" aria-expanded={true} onClick={()=>onCollapsedChange(true)} className="pointer-events-auto absolute right-0.5 top-0.5 flex size-9 items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"><Minus aria-hidden="true" className="size-3.5"/></button>
  <p key={rumor.id} className="fishing-rumor-enter break-keep pr-3 text-[11px] font-normal leading-[1.85] text-white/90 [text-shadow:0_1px_3px_#092f4b80]">{rumor.text}</p>
 </aside>
})
