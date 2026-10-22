import type {ReactNode} from 'react'
import {Select} from '@base-ui/react/select'
import {Check,ChevronDown} from 'lucide-react'

export type IslandSelectOption<T extends string>={value:T;label:string;icon?:ReactNode}

export function IslandSelect<T extends string>({value,onChange,options,label,disabled=false,className=''}:{value:T;onChange:(value:T)=>void;options:readonly IslandSelectOption<T>[];label:string;disabled?:boolean;className?:string}){
 const selected=options.find(option=>option.value===value)
 return <Select.Root value={value} items={options} disabled={disabled} onValueChange={next=>{if(next!==null)onChange(next as T)}}>
  <Select.Trigger aria-label={label} className={`flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-primary/15 bg-secondary/60 px-3 text-xs text-primary outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${className}`}>
   <Select.Value className="min-w-0"><span className="flex min-w-0 items-center gap-1.5">{selected?.icon}<span className="truncate">{selected?.label}</span></span></Select.Value>
   <Select.Icon><ChevronDown aria-hidden="true" className="size-3.5 shrink-0"/></Select.Icon>
  </Select.Trigger>
  <Select.Portal><Select.Positioner align="start" alignItemWithTrigger={false} sideOffset={6} collisionPadding={12} className="z-[70]">
   <Select.Popup className="max-h-[min(20rem,var(--available-height))] min-w-[max(10rem,var(--anchor-width))] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-primary/15 bg-popover p-1.5 text-foreground shadow-lg outline-none">
    <Select.List>{options.map(option=><Select.Item key={option.value} value={option.value} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-xs outline-none data-highlighted:bg-secondary data-selected:text-primary">
     <Select.ItemText className="flex items-center gap-2">{option.icon}{option.label}</Select.ItemText>
     <Select.ItemIndicator><Check aria-hidden="true" className="size-3.5 text-primary"/></Select.ItemIndicator>
    </Select.Item>)}</Select.List>
   </Select.Popup>
  </Select.Positioner></Select.Portal>
 </Select.Root>
}
