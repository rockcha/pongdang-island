import { useState } from 'react'
import type { ReactNode } from 'react'
import { Maximize2,ChevronLeft,ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog'
import type { OwnedCollectible } from '@/features/collection/api'
import { backgroundUrl } from './api'
import { TankInhabitants } from './tank-inhabitants'
import { TankBubbles } from './tank-bubbles'
import { AquariumInventoryDialog } from './aquarium-inventory-dialog'

type Props={items:OwnedCollectible[];name:string;background?:{name:string;image_path:string};backgroundControls?:ReactNode;busy:boolean;onPlace:(id:string,x:number,y:number)=>void;onSell:(ids:string[])=>Promise<void>;onGiftSent?:(ids:string[])=>void;expanded?:boolean;navigation?:{index:number;count:number;onChange:(direction:'previous'|'next')=>void}}
export function AquariumView(props:Props){
 const {items,name,background,busy,onPlace,onSell,expanded=false}=props
 const [detail,setDetail]=useState(false),[failedPath,setFailedPath]=useState('')
 return <>
  <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b from-sky-100 to-teal-100 ${expanded?'h-[70dvh]':'aspect-[9/16]'}`}>
   {background&&failedPath!==background.image_path&&<img key={background.image_path} src={backgroundUrl(background.image_path)} alt={background.name} className="absolute inset-0 h-full w-full object-cover" onError={()=>setFailedPath(background.image_path)}/>}
   <TankBubbles/><TankInhabitants items={items} onPlace={onPlace} paused={detail} onNavigate={direction=>{if(!busy)props.navigation?.onChange(direction)}}/>
   {props.navigation&&props.navigation.count>1&&<><Button variant="secondary" size="icon" className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/85 shadow-sm backdrop-blur md:inline-flex" aria-label="이전 어항" disabled={busy||props.navigation.index===0} onClick={()=>props.navigation?.onChange('previous')}><ChevronLeft/></Button><Button variant="secondary" size="icon" className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-background/85 shadow-sm backdrop-blur md:inline-flex" aria-label="다음 어항" disabled={busy||props.navigation.index===props.navigation.count-1} onClick={()=>props.navigation?.onChange('next')}><ChevronRight/></Button><span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-black/25 px-2.5 py-1 text-xs tabular-nums text-white" aria-live="polite">{props.navigation.index+1} / {props.navigation.count}</span></>}
   <div className="absolute left-3 top-3 z-10 flex items-center gap-2"><AquariumInventoryDialog items={items} name={name} busy={busy} onSell={onSell} onGiftSent={props.onGiftSent}/>{props.backgroundControls}</div>
   {!expanded&&<Button variant="secondary" size="icon" className="absolute right-3 top-3 z-10 bg-background/90 shadow-sm backdrop-blur" aria-label="아쿠아리움 크게 보기" onClick={()=>setDetail(true)}><Maximize2 className="size-4"/></Button>}
   <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-4 text-sm text-white">{name}{background&&` · ${background.name}`}</div>
  </div>
  {!expanded&&<Dialog open={detail} onOpenChange={setDetail}><DialogContent className="max-h-[95dvh] gap-3 sm:max-w-lg"><DialogHeader><DialogTitle>{name}</DialogTitle><DialogDescription>개체를 잡아 원하는 위치에 놓아보세요.</DialogDescription></DialogHeader>{detail&&<AquariumView {...props} expanded/>}</DialogContent></Dialog>}
 </>
}
