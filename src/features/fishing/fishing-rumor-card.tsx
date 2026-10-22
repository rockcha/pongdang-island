import {memo} from 'react'
import {Quote,Shell} from 'lucide-react'
import {islandRumorAt} from './island-rumors'

export const FishingRumorCard=memo(function FishingRumorCard({seed,page=0}:{seed:number;page?:number}){
 const rumor=islandRumorAt(seed,page)
 return <aside aria-label="퐁당섬 소문 한 줄" className="pointer-events-none absolute inset-x-4 top-16 z-10 mx-auto max-w-sm rounded-2xl border border-[#e9dcc3]/90 bg-[#fffaf0]/95 px-4 py-3 shadow-[0_6px_24px_#153b5520] backdrop-blur-sm">
  <div className="mb-1.5 flex items-center gap-1.5 text-[#927347]"><span className="flex size-6 items-center justify-center rounded-full bg-[#f1e5cc]"><Shell aria-hidden="true" className="size-3.5"/></span><h2 className="text-[10px] font-medium tracking-wide">퐁당섬 소문 한 줄</h2><Quote aria-hidden="true" className="ml-auto size-4 text-[#d9c6a0]"/></div>
  <p key={rumor.id} className="fishing-rumor-enter text-[12px] leading-[1.85] font-normal break-keep text-[#66513b]">{rumor.text}</p>
 </aside>
})
