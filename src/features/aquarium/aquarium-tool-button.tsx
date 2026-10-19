import type { ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip,TooltipContent,TooltipTrigger } from '@/components/ui/tooltip'
import { DialogTrigger } from '@/components/ui/dialog'

/** An icon-only dialog trigger; used inside the joined aquarium toolbar. */
export function AquariumToolButton({label,icon,count,prominent=false,caption}:{label:string;icon:ReactElement;count?:number;prominent?:boolean;caption?:string}){
 return <Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size={prominent?'default':'icon'} className={prominent?'relative h-16 min-h-16 w-full min-w-0 gap-2 rounded-none border-0 border-r border-[#DCC2A7] bg-[#E8D1B8] px-2 text-sm text-[#5C3D29] hover:bg-[#DFC2A3] hover:text-[#5C3D29] last:border-r-0':'relative size-10 rounded-xl border-0'} aria-label={count===undefined?label:`${label} ${count}개`}/>}/>}>{caption&&<span className="text-[10px] font-normal leading-none">{caption}</span>}{icon}{prominent&&<span>{label}</span>}{count!==undefined&&<span aria-hidden="true" className={prominent?'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] font-medium leading-none tabular-nums text-secondary-foreground ring-1 ring-border':'absolute right-0.5 top-0.5 min-w-3.5 rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-[14px] tabular-nums text-secondary-foreground'}>{count>99?'99+':count}</span>}</TooltipTrigger><TooltipContent>{label}{count!==undefined&&` · ${count}개`}</TooltipContent></Tooltip>
}
