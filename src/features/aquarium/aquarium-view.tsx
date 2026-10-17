import { useEffect,useRef,useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft,ChevronRight,Plus,Ellipsis } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DecorationPlacement,OwnedCollectible } from '@/features/collection/api'
import { backgroundUrl } from './api'
import { TankInhabitants } from './tank-inhabitants'
import { TankBubbles } from './tank-bubbles'
import { AquariumInventoryDialog } from './aquarium-inventory-dialog'
import { canArrangeSpecies } from './movement-settings'
import { DecorationEditor } from './decoration-editor'
import { decorationGeometry } from './decoration-geometry'
import { GoldIcon } from '@/features/gold/gold-provider'
import {TooltipProvider} from '@/components/ui/tooltip'

type Props={items:OwnedCollectible[];name:string;background?:{name:string;image_path:string};backgroundControls?:ReactNode;managementControls?:ReactNode;storageControls?:ReactNode;bottomControls?:ReactNode;purchase?:{price:number;disabled:boolean;onBuy:()=>void};busy:boolean;onPlace:(id:string,x:number,y:number)=>void;onArrange?:(id:string,value:DecorationPlacement)=>Promise<void>;onSell:(ids:string[])=>Promise<void>;onGiftSent?:(ids:string[])=>void;onStore?:(ids:string[])=>Promise<void>;navigation?:{index:number;count:number;onChange:(direction:'previous'|'next')=>void}}
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
 const [editing,setEditing]=useState<{id:string;value:DecorationPlacement;anchor:{x:number;y:number}}|null>(null)
 const decoration=items.find(item=>item.id===editing?.id)
 const displayed=editing&&decoration?items.map(item=>item.id===editing.id?{...item,...editing.value,editing:true}:item):items
 function selectDecoration(id:string,x?:number,y?:number){
  if(busy||!props.onArrange)return
  const item=items.find(item=>item.id===id)
  if(item&&canArrangeSpecies(item.species)){
   const current=editing?.id===id?{...item,...editing.value}:item
   const g=decorationGeometry(current,dimensions.width,dimensions.height)
   const value={position_x:x??item.position_x??(.2+item.animation_seed/1000000*.6),position_y:y??item.position_y??.86,rotation:Number(current.rotation??0),scale:Number(current.scale??1),flipped:current.flipped??false}
   setEditing({id,value,anchor:{x:g.margin+value.position_x*g.w+g.size/2,y:g.margin+value.position_y*g.h-44}})
  }
 }
 function place(id:string,x:number,y:number){
  if(!canArrangeSpecies(items.find(item=>item.id===id)!.species))return
  if(busy)return
  if(editing?.id===id){
   const g=decorationGeometry({...decoration!,...editing.value},dimensions.width,dimensions.height)
   setEditing({...editing,value:{...editing.value,position_x:x,position_y:y},anchor:{x:g.margin+x*g.w+g.size/2,y:g.margin+y*g.h-44}})
  }
  onPlace(id,x,y)
 }
 const geometry=decoration&&editing?decorationGeometry({...decoration,...editing.value},dimensions.width,dimensions.height):null
 async function changeDecoration(value:DecorationPlacement){
  if(!editing||!props.onArrange)return
  const previous=editing
  if(geometry&&decoration){
   const next=decorationGeometry({...decoration,...value},dimensions.width,dimensions.height)
   const cx=geometry.margin+previous.value.position_x*geometry.w+geometry.size/2
   const cy=geometry.margin+previous.value.position_y*geometry.h+geometry.size/2
   value={...value,position_x:next.w?(cx-next.margin-next.size/2)/next.w:.5,position_y:next.h?(cy-next.margin-next.size/2)/next.h:.5}
   value.position_x=Math.max(0,Math.min(1,value.position_x));value.position_y=Math.max(0,Math.min(1,value.position_y))
  }
  setEditing({...previous,value})
  try{await props.onArrange(previous.id,value)}catch(cause){
   setEditing(current=>current?.id===previous.id&&current.value===value?previous:current)
   throw cause
  }
 }
 // Screen-space controls stay the same size regardless of decoration scale.
 const toolbarWidth=176
 const toolbarX=geometry&&editing?Math.max(toolbarWidth/2+8,Math.min(dimensions.width-toolbarWidth/2-8,editing.anchor.x)):0
 const toolbarY=geometry&&editing?Math.max(64,Math.min(dimensions.height-72,editing.anchor.y)):64
 function navigate(direction:'previous'|'next'){
  if(busy||!props.navigation||props.navigation.count<2)return
  if(direction==='previous'?props.navigation.index<=0:props.navigation.index>=props.navigation.count-1)return
  setEditing(null)
  props.navigation.onChange(direction)
 }
 return <>
  <div className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-background px-3 py-2">
   <div role="group" aria-label="어항 이동" className="flex min-w-0 items-center gap-1"><Button variant="ghost" size="icon" aria-label="이전 어항" disabled={busy||!props.navigation||props.navigation.index<=0} onClick={()=>navigate('previous')}><ChevronLeft className="size-4"/></Button><div className="min-w-0 text-center"><p className="truncate text-sm">{name}</p><span className="text-[11px] tabular-nums text-muted-foreground" aria-label="현재 어항" aria-live="polite">{(props.navigation?.index??0)+1}/{props.navigation?.count??1}</span></div><Button variant="ghost" size="icon" aria-label="다음 어항" disabled={busy||!props.navigation||props.navigation.index>=props.navigation.count-1} onClick={()=>navigate('next')}><ChevronRight className="size-4"/></Button></div>
   <details className="relative"><summary aria-label="어항 관리" className="grid size-11 cursor-pointer list-none place-items-center rounded-xl hover:bg-secondary [&::-webkit-details-marker]:hidden"><Ellipsis className="size-5"/></summary><div className="absolute right-0 top-12 z-30 flex w-64 flex-col gap-3 rounded-xl border bg-popover p-3 shadow-lg"><TooltipProvider><div role="group" aria-label="어항 도구" className="flex items-center gap-1"><AquariumInventoryDialog items={items} name={name} busy={busy} onSell={onSell} onGiftSent={props.onGiftSent} onStore={props.onStore}/>{props.managementControls}</div></TooltipProvider>{props.bottomControls}{props.purchase&&<Button variant="outline" className="min-h-11" aria-label={'어항 구매 '+props.purchase.price+' 골드'} disabled={props.purchase.disabled} onClick={props.purchase.onBuy}><Plus className="size-4"/>새 어항<GoldIcon className="size-4"/>{props.purchase.price}</Button>}</div></details>
  </div>
  <div ref={glass} data-testid="aquarium-glass" className="relative min-h-0 w-full flex-1 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200" tabIndex={0} aria-label={name} onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();navigate(event.key==='ArrowLeft'?'previous':'next')}}}>
   {background&&failedPath!==background.image_path&&<img key={background.image_path} src={backgroundUrl(background.image_path)} alt={background.name} className="absolute inset-0 h-full w-full object-cover" onError={()=>setFailedPath(background.image_path)}/>}
   <TankBubbles/><TankInhabitants items={displayed.map(item=>({...item,interaction_locked:busy}))} onPlace={place} onSelectDecoration={selectDecoration} onBackgroundTap={()=>setEditing(null)} onNavigate={direction=>{if(!busy){setEditing(null);props.navigation?.onChange(direction)}}}/>
   {editing&&decoration&&props.onArrange&&<div className="absolute z-20 -translate-x-1/2" style={{left:toolbarX,top:toolbarY,width:toolbarWidth}}><DecorationEditor key={editing.id} name={decoration.species.name} value={editing.value} busy={busy} onChange={changeDecoration}/></div>}

  </div>
  <TooltipProvider><div className="flex shrink-0 items-center justify-center gap-3 border-t border-border/50 bg-background px-3 pt-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">{props.storageControls}{props.backgroundControls}</div></TooltipProvider>
 </>
}
