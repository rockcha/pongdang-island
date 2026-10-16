import {MapPin} from 'lucide-react'
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {regionIcons} from '@/features/regions/region-icons'
import type {CatalogEntry} from './api'

export function HabitatFilters({habitats,selected,onToggle}:{habitats:CatalogEntry['habitats'];selected:string[];onToggle:(id:string)=>void}){
 return <TooltipProvider><div className="space-y-1.5">
  <p className="text-xs text-muted-foreground">서식지역 · {selected.length?`${selected.length}곳 선택`:'전체'}</p>
  <div role="group" aria-label="도감 서식지역" className="flex flex-wrap gap-2">
   {habitats.map(region=>{
    const active=selected.includes(region.id)
    return <Tooltip key={region.id}><TooltipTrigger render={<button type="button" aria-label={`${region.name} 서식지역 필터`} aria-pressed={active} onClick={()=>onToggle(region.id)} className={`inline-flex size-11 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active?'border-sky-500 bg-sky-100 ring-1 ring-sky-500 dark:bg-sky-900/60':'border-border bg-background hover:bg-muted'}`}/> }>
     {regionIcons[region.id]?<img src={regionIcons[region.id].src} alt="" className="size-7"/>:<MapPin aria-hidden="true" className="size-6"/>}
    </TooltipTrigger><TooltipContent>{region.name}</TooltipContent></Tooltip>
   })}
  </div>
 </div></TooltipProvider>
}

export function HabitatIcons({habitats}:{habitats:CatalogEntry['habitats']}){
 if(!habitats.length)return <span className="text-[11px] text-muted-foreground">서식지역 정보 없음</span>
 return <TooltipProvider><span role="group" aria-label={`서식지역: ${habitats.map(region=>region.name).join(', ')}`} className="flex flex-wrap items-center justify-center gap-1">
  {habitats.map(region=><Tooltip key={region.id}><TooltipTrigger render={<span aria-label={region.name} className="inline-flex size-6 items-center justify-center rounded-full bg-sky-50 p-0.5 dark:bg-sky-950/50"/>}>
   {regionIcons[region.id]?<img src={regionIcons[region.id].src} alt="" className="size-5"/>:<MapPin aria-hidden="true" className="size-4 text-sky-600"/>}
  </TooltipTrigger><TooltipContent>{region.name}</TooltipContent></Tooltip>)}
 </span></TooltipProvider>
}
