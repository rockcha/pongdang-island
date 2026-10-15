import type { ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip,TooltipContent,TooltipTrigger } from '@/components/ui/tooltip'
import { DialogTrigger } from '@/components/ui/dialog'

/** An icon-only dialog trigger; used inside the joined aquarium toolbar. */
export function AquariumToolButton({label,icon,count}:{label:string;icon:ReactElement;count?:number}){
 return <Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" className="relative size-10 rounded-none border-0 first:rounded-l-xl last:rounded-r-xl" aria-label={count===undefined?label:`${label} ${count}개`}/>}/>}>{icon}{count!==undefined&&count>0&&<span aria-hidden="true" className="absolute right-0.5 top-0.5 min-w-3.5 rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-[14px] tabular-nums text-white">{count>99?'99+':count}</span>}</TooltipTrigger><TooltipContent>{label}{count!==undefined&&` · ${count}개`}</TooltipContent></Tooltip>
}
