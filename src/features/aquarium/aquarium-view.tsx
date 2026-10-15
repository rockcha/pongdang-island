import { useEffect,useRef,useState } from 'react'
import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DecorationPlacement,OwnedCollectible } from '@/features/collection/api'
import { backgroundUrl } from './api'
import { TankInhabitants } from './tank-inhabitants'
import { TankBubbles } from './tank-bubbles'
import { AquariumInventoryDialog } from './aquarium-inventory-dialog'
import { DecorationEditor } from './decoration-editor'
import { decorationGeometry } from './decoration-geometry'
import { GoldIcon } from '@/features/gold/gold-provider'
import {TooltipProvider} from '@/components/ui/tooltip'

type Props={items:OwnedCollectible[];name:string;background?:{name:string;image_path:string};backgroundControls?:ReactNode;storageControls?:ReactNode;bottomControls?:ReactNode;purchase?:{price:number;disabled:boolean;onBuy:()=>void};busy:boolean;onPlace:(id:string,x:number,y:number)=>void;onArrange?:(id:string,value:DecorationPlacement)=>Promise<void>;onSell:(ids:string[])=>Promise<void>;onGiftSent?:(ids:string[])=>void;onStore?:(ids:string[])=>Promise<void>;navigation?:{index:number;count:number;onChange:(direction:'previous'|'next')=>void}}
export function AquariumView(props:Props){
 const {items,name,background,busy,onPlace,onSell}=props
 const [failedPath,setFailedPath]=useState('')
 const glass=useRef<HTMLDivElement>(null)
 const [dimensions,setDimensions]=useState({width:320,height:560})
 useEffect(()=>{
  const element=glass.current
  if(!element||typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(()=>setDimensions({width:element.clientWidth,height:element.clientHeight}))
  observer.observe(element);return()=>observer.disconnect()
 },[])
 const [editing,setEditing]=useState<{id:string;value:DecorationPlacement}|null>(null)
 const decoration=items.find(item=>item.id===editing?.id&&item.species.kind==='decoration')
 const displayed=editing&&decoration?items.map(item=>item.id===editing.id?{...item,...editing.value}:item):items
 function selectDecoration(id:string){
  if(busy||!props.onArrange)return
  const item=items.find(item=>item.id===id)
  if(item)setEditing({id,value:{position_x:item.position_x??(.2+item.animation_seed/1000000*.6),position_y:item.position_y??.86,rotation:Number(item.rotation??0),scale:Number(item.scale??1)}})
 }
 function place(id:string,x:number,y:number){
  if(busy)return
  if(editing?.id===id)setEditing({...editing,value:{...editing.value,position_x:x,position_y:y}})
  onPlace(id,x,y)
 }
 const geometry=decoration&&editing?decorationGeometry({...decoration,...editing.value},dimensions.width,dimensions.height):null
 async function changeDecoration(value:DecorationPlacement){
  if(!editing||!props.onArrange)return
  const previous=editing
  setEditing({id:previous.id,value})
  try{await props.onArrange(previous.id,value)}catch(cause){
   setEditing(current=>current?.id===previous.id&&current.value===value?previous:current)
   throw cause
  }
 }
 // Screen-space controls stay the same size regardless of decoration scale.
 const toolbarWidth=110
 const toolbarX=geometry&&editing?Math.max(toolbarWidth/2+8,Math.min(dimensions.width-toolbarWidth/2-8,geometry.margin+editing.value.position_x*geometry.w+geometry.size/2)):0
 const toolbarY=geometry&&editing?Math.max(64,Math.min(dimensions.height-72,geometry.margin+editing.value.position_y*geometry.h-62)):64
 return <>
  <div ref={glass} data-testid="aquarium-glass" className="relative min-h-0 w-full flex-1 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200" tabIndex={0} aria-label={`${name} · 좌우로 밀거나 방향키로 어항 이동`} onKeyDown={event=>{if(event.target!==event.currentTarget||busy)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setEditing(null);props.navigation?.onChange(event.key==='ArrowLeft'?'previous':'next')}}}>
   {background&&failedPath!==background.image_path&&<img key={background.image_path} src={backgroundUrl(background.image_path)} alt={background.name} className="absolute inset-0 h-full w-full object-cover" onError={()=>setFailedPath(background.image_path)}/>}
   <TankBubbles/><TankInhabitants items={displayed} onPlace={place} onSelectDecoration={selectDecoration} onBackgroundTap={()=>setEditing(null)} onNavigate={direction=>{if(!busy){setEditing(null);props.navigation?.onChange(direction)}}}/>
   <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-1">
    <TooltipProvider><div role="group" aria-label="어항 도구" className="pointer-events-auto flex items-center divide-x divide-foreground/10 overflow-visible rounded-xl bg-background/95"><AquariumInventoryDialog items={items} name={name} busy={busy} onSell={onSell} onGiftSent={props.onGiftSent} onStore={props.onStore}/>{props.backgroundControls}{props.storageControls}</div></TooltipProvider>
    <div className="pointer-events-auto flex shrink-0 items-center overflow-hidden rounded-full bg-background/90 shadow-sm backdrop-blur"><span className="px-2.5 text-xs tabular-nums" aria-label="현재 어항" aria-live="polite">{(props.navigation?.index??0)+1}/{props.navigation?.count??1}</span>{props.purchase&&<Button variant="ghost" size="sm" className="gap-1 rounded-none border-l px-2" aria-label={`어항 구매 ${props.purchase.price} 골드`} disabled={props.purchase.disabled} onClick={props.purchase.onBuy}><Plus className="size-3.5"/><GoldIcon className="size-4"/><span className="text-xs tabular-nums">{props.purchase.price}</span></Button>}</div>
   </div>
   {editing&&decoration&&props.onArrange&&<div className="absolute z-20 -translate-x-1/2" style={{left:toolbarX,top:toolbarY,width:toolbarWidth}}><DecorationEditor key={editing.id} name={decoration.species.name} value={editing.value} busy={busy} onChange={changeDecoration}/></div>}
   {props.bottomControls&&<div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-2">{props.bottomControls}</div>}
  </div>
 </>
}
