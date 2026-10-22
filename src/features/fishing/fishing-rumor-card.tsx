import {memo,useEffect,useRef} from 'react'
import {ChevronDown,Minus,Shell} from 'lucide-react'
import {islandRumorAt} from './island-rumors'

export const FishingRumorCard=memo(function FishingRumorCard({seed,page=0,collapsed,onCollapsedChange}:{seed:number;page?:number;collapsed:boolean;onCollapsedChange:(collapsed:boolean)=>void}){
 const rumor=islandRumorAt(seed,page)
 const toggle=useRef<HTMLButtonElement>(null),previous=useRef(collapsed)
 useEffect(()=>{if(previous.current!==collapsed){previous.current=collapsed;toggle.current?.focus({preventScroll:true})}},[collapsed])
 if(collapsed)return <button ref={toggle} type="button" aria-label="알고 계신가요? 이야기 펼치기" aria-expanded={false} onClick={()=>onCollapsedChange(false)} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/25 px-3 text-[10px] text-white/80 backdrop-blur-[2px] hover:bg-slate-950/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><Shell aria-hidden="true" className="size-3"/>바닷속 이야기<ChevronDown aria-hidden="true" className="size-3"/></button>
 return <aside aria-label="알고 계신가요?" className="pointer-events-none relative min-w-0 max-w-sm flex-1 rounded-xl border border-white/10 bg-slate-950/25 px-3.5 py-3 text-white backdrop-blur-[2px]">
  <div className="mb-1.5 flex items-center gap-1.5 pr-6 text-white/65"><Shell aria-hidden="true" className="size-3"/><h2 className="text-[9px] font-normal tracking-wider">알고 계신가요?</h2></div>
  <button ref={toggle} type="button" aria-label="알고 계신가요? 이야기 최소화" title="이야기 최소화" aria-expanded={true} onClick={()=>onCollapsedChange(true)} className="pointer-events-auto absolute right-0.5 top-0.5 flex size-9 items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"><Minus aria-hidden="true" className="size-3.5"/></button>
  <p key={rumor.id} className="fishing-rumor-enter break-keep pr-3 text-[11px] font-normal leading-[1.85] text-white/90 [text-shadow:0_1px_3px_#092f4b80]">{rumor.text}</p>
 </aside>
})
