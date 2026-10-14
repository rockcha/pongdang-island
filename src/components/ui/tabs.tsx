import { Tabs as Primitive } from '@base-ui/react/tabs'
import type { ComponentProps } from 'react'
import { cn } from 'cn'

export function Tabs(props:ComponentProps<typeof Primitive.Root>){return <Primitive.Root {...props}/>}
export function TabsList({className,...props}:ComponentProps<typeof Primitive.List>){return <Primitive.List className={cn('flex w-full gap-1 rounded-lg bg-muted/60 p-1',className)} {...props}/>}
export function TabsTrigger({className,...props}:ComponentProps<typeof Primitive.Tab>){return <Primitive.Tab className={cn('flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors data-active:bg-background data-active:text-foreground data-active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',className)} {...props}/>}
export function TabsContent({className,...props}:ComponentProps<typeof Primitive.Panel>){return <Primitive.Panel className={cn('mt-4 outline-none',className)} {...props}/>}
