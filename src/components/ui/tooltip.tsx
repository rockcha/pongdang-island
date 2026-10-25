import { Tooltip as Primitive } from '@base-ui/react/tooltip'
import type { ComponentProps } from 'react'
import { cn } from 'cn'

export function TooltipProvider(props:ComponentProps<typeof Primitive.Provider>){return <Primitive.Provider {...props}/>}
export function Tooltip(props:ComponentProps<typeof Primitive.Root>){return <Primitive.Root {...props}/>}
export function TooltipTrigger(props:ComponentProps<typeof Primitive.Trigger>){return <Primitive.Trigger {...props}/>}
export function TooltipContent({children,className,...props}:ComponentProps<typeof Primitive.Popup>){
 return <Primitive.Portal><Primitive.Positioner data-slot="tooltip-positioner" sideOffset={6} className="z-[100]">
  <Primitive.Popup {...props} className={cn('max-w-64 rounded-md px-2.5 py-1.5 text-xs shadow-md',className,'bg-black text-white')}>{children}</Primitive.Popup>
 </Primitive.Positioner></Primitive.Portal>
}
