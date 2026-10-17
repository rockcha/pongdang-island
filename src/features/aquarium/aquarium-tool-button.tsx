import type { ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip,TooltipContent,TooltipTrigger } from '@/components/ui/tooltip'
import { DialogTrigger } from '@/components/ui/dialog'

/** An icon-only dialog trigger; used inside the joined aquarium toolbar. */
export function AquariumToolButton({label,icon,count,prominent=false}:{label:string;icon:ReactElement;count?:number;prominent?:boolean}){
 return <Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size={prominent?'default':'icon'} className={prominent?'relative min-h-11 flex-1 gap-2 rounded-xl border border-border/60 bg-card px-4':'relative size-10 rounded-xl border-0'} aria-label={count===undefined?label:`${label} ${count}개`}/>}/>}>{icon}{prominent&&<span>{label}</span>}{count!==undefined&&count>0&&<span aria-hidden="true" className="absolute right-0.5 top-0.5 min-w-3.5 rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-[14px] tabular-nums text-white">{count>99?'99+':count}</span>}</TooltipTrigger><TooltipContent>{label}{count!==undefined&&` · ${count}개`}</TooltipContent></Tooltip>
}
