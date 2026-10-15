import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {regionIcons} from '@/features/regions/region-icons'
import type {Species} from './api'

export function NativeRegionBadge({species}:{species:Pick<Species,'is_native'|'native_region_id'>}){
 const region=species.is_native&&species.native_region_id?regionIcons[species.native_region_id]:undefined
 if(!region)return null
 const label=`${region.name} 토착 개체`
 return <TooltipProvider><Tooltip><TooltipTrigger render={<span tabIndex={0} aria-label={label} className="absolute -bottom-0.5 -right-0.5 inline-flex size-6 items-center justify-center rounded-full border border-background bg-background p-0.5"/>}><img src={region.src} alt="" className="size-5"/></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip></TooltipProvider>
}
