import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {regionIcons} from '@/features/regions/region-icons'
import type {Species} from './api'

export function NativeRegionBadge({species}:{species:Pick<Species,'is_native'|'native_region_id'>}){
 const region=species.is_native&&species.native_region_id?regionIcons[species.native_region_id]:undefined
 if(!region)return null
 const label=`주 서식지: ${region.name}`
 return <TooltipProvider><Tooltip><TooltipTrigger render={<span tabIndex={0} aria-label={label} className="absolute -bottom-0.5 -right-0.5 inline-flex size-6 items-center justify-center rounded-full border border-background bg-background p-0.5"/>}><img src={region.src} alt="" className="size-5"/></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip></TooltipProvider>
}

export function PrimaryHabitat({species}:{species:Pick<Species,'is_native'|'native_region_id'>}){
 const region=species.is_native&&species.native_region_id?regionIcons[species.native_region_id]:undefined
 if(!region)return null
 return <div className="flex items-center justify-between gap-3 text-xs"><span className="shrink-0 text-muted-foreground">주 서식지</span><TooltipProvider><Tooltip><TooltipTrigger render={<span tabIndex={0} aria-label={`주 서식지: ${region.name}`} className="inline-flex items-center gap-1.5 text-primary"/>}><img src={region.src} alt="" className="size-6 object-contain"/><span>확률 10배 업</span></TooltipTrigger><TooltipContent>{region.name} · 다른 해역 대비 추첨 가중치 10배</TooltipContent></Tooltip></TooltipProvider></div>
}
