import { useEffect,useRef,useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft,ChevronRight,ChevronDown,ChevronUp,Plus,Info } from 'lucide-react'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {CollectiblePreview} from '@/features/collection/collectible-preview'
import {CollectibleKindIcon} from '@/features/collection/collectible-kind-icon'
import {rarities} from '@/lib/game/rarity'
import {kindLabels} from '@/features/collection/api'
import {PrimaryHabitat} from '@/features/collection/native-region-badge'
import { Button } from '@/components/ui/button'
import type { DecorationPlacement,OwnedCollectible } from '@/features/collection/api'
import { AquariumBackdrop } from './aquarium-backdrop'
import { TankInhabitants } from './tank-inhabitants'
import { TankBubbles } from './tank-bubbles'
import { AquariumInventoryDialog } from './aquarium-inventory-dialog'
import { canArrangeSpecies } from './movement-settings'
import { DecorationEditor } from './decoration-editor'
import { decorationGeometry } from './decoration-geometry'
import { GoldIcon } from '@/features/gold/gold-provider'
import {TooltipProvider} from '@/components/ui/tooltip'

type Props={loading?:boolean;items:OwnedCollectible[];name:string;background?:{name:string;image_path:string};nameControls?:ReactNode;backgroundControls?:ReactNode;managementControls?:ReactNode;storageControls?:ReactNode;bottomControls?:ReactNode;purchase?:{price:number;disabled:boolean;onBuy:()=>void};busy:boolean;onPlace:(id:string,x:number,y:number)=>void;onArrange?:(id:string,value:DecorationPlacement)=>Promise<void>;onSell:(ids:string[])=>Promise<void>;onGiftSent?:(ids:string[])=>void;onStore?:(ids:string[])=>Promise<void>;navigation?:{index:number;count:number;onChange:(direction:'previous'|'next')=>void}}
export function AquariumView(props:Props){
 const {items,name,background,busy,onPlace,onSell}=props
 const glass=useRef<HTMLDivElement>(null)
 const [dimensions,setDimensions]=useState({width:320,height:560})
 const [toolsOpen,setToolsOpen]=useState(()=>{try{return localStorage.getItem('pongdang:aquarium-tools-open')==='true'}catch{return false}})
 useEffect(()=>{try{localStorage.setItem('pongdang:aquarium-tools-open',String(toolsOpen))}catch{/* Storage can be disabled. */}},[toolsOpen])
 const toolsGesture=useRef<{y:number;dragged:boolean}|null>(null)
 const [managementOpen,setManagementOpen]=useState(()=>{try{return localStorage.getItem('pongdang:aquarium-management-open')==='true'}catch{return false}})
 useEffect(()=>{try{localStorage.setItem('pongdang:aquarium-management-open',String(managementOpen))}catch{/* Storage can be disabled. */}},[managementOpen])
 useEffect(()=>{
  const element=glass.current
  if(!element||typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(()=>setDimensions({width:element.clientWidth,height:element.clientHeight}))
  observer.observe(element);return()=>observer.disconnect()
 },[])
 const [editing,setEditing]=useState<{id:string;value:DecorationPlacement;anchor:{x:number;y:number}}|null>(null)
 const toolbar=useRef<HTMLDivElement>(null)
 const selectedId=useRef<string|null>(null)
 selectedId.current=editing?.id??null
 const [infoId,setInfoId]=useState<string|null>(null)
 const infoItem=items.find(item=>item.id===infoId)
 const decoration=items.find(item=>item.id===editing?.id)
 const displayed=editing&&decoration?items.map(item=>item.id===editing.id?{...item,...editing.value,editing:true}:item):items
 function selectDecoration(id:string,x?:number,y?:number){
  if(busy||!props.onArrange)return
  const item=items.find(item=>item.id===id)
  if(item){
   const current=editing?.id===id?{...item,...editing.value}:item
   const g=decorationGeometry(current,dimensions.width,dimensions.height)
   const value={position_x:x??item.position_x??(.2+item.animation_seed/1000000*.6),position_y:y??item.position_y??.86,rotation:Number(current.rotation??0),scale:Number(current.scale??1),flipped:current.flipped??false}
   setEditing({id,value,anchor:{x:g.margin+value.position_x*g.w+g.size/2,y:g.margin+value.position_y*g.h}})
  }
 }
 function place(id:string,x:number,y:number){
  if(!canArrangeSpecies(items.find(item=>item.id===id)!.species))return
  if(busy)return
  if(editing?.id===id){
   const g=decorationGeometry({...decoration!,...editing.value},dimensions.width,dimensions.height)
   setEditing({...editing,value:{...editing.value,position_x:x,position_y:y},anchor:{x:g.margin+x*g.w+g.size/2,y:g.margin+y*g.h}})
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
 const toolbarY=geometry&&editing?Math.max(8,Math.min(dimensions.height-52,editing.anchor.y-(decoration&&canArrangeSpecies(decoration.species)?94:52))):8
 function navigate(direction:'previous'|'next'){
  if(busy||!props.navigation||props.navigation.count<2)return
  if(direction==='previous'?props.navigation.index<=0:props.navigation.index>=props.navigation.count-1)return
  setEditing(null)
  props.navigation.onChange(direction)
 }
 return <>
  <div ref={glass} data-testid="aquarium-glass" className="relative min-h-0 w-full flex-1 overflow-hidden bg-gradient-to-b from-blue-100 to-blue-200" tabIndex={0} aria-label={name} onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();navigate(event.key==='ArrowLeft'?'previous':'next')}}}>
   <AquariumBackdrop background={background} loading={props.loading}/>
   <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 border-b border-white/30 bg-background/55 backdrop-blur-md px-3 py-0.5">
   <div role="group" aria-label="어항 이동" className="flex w-full min-w-0 max-w-full items-center justify-center gap-1"><Button variant="ghost" size="icon" className="min-h-11 min-w-11 shrink-0" aria-label="이전 어항" disabled={busy||!props.navigation||props.navigation.index<=0} onClick={()=>navigate('previous')}><ChevronLeft className="size-4"/></Button><div className="flex w-40 min-w-0 items-center justify-center gap-1"><div className="min-w-0">{props.nameControls??<p className="truncate text-sm">{name}</p>}</div></div><Button variant="ghost" size="icon" className="min-h-11 min-w-11 shrink-0" aria-label="다음 어항" disabled={busy||!props.navigation||props.navigation.index>=props.navigation.count-1} onClick={()=>navigate('next')}><ChevronRight className="size-4"/></Button></div>

  </div>
   <div className="absolute left-2 top-14 z-20 flex h-11 items-center rounded-full border border-[#DCC2A7]/40 bg-[#E8D1B8]/50 pl-3 pr-1 text-[#5C3D29] shadow-[0_2px_8px_#5C3D2912] backdrop-blur-sm"><span className="shrink-0 px-1.5 py-0.5 text-[11px] leading-4 tabular-nums text-[#5C3D29]" aria-label="현재 어항" aria-live="polite">{(props.navigation?.index??0)+1}/{props.navigation?.count??1}</span>{props.purchase&&<Button variant="ghost" size="icon" className="size-9 shrink-0 rounded-none" aria-label="어항 추가" disabled={busy} onClick={props.purchase.onBuy}><Plus className="size-4"/></Button>}</div>
   {props.managementControls&&<div className="absolute right-2 top-14 z-20 flex flex-col items-end gap-1">
    <button type="button" aria-label={managementOpen?'어항 도구 접기':'어항 도구 펼치기'} aria-expanded={managementOpen} onClick={()=>setManagementOpen(value=>!value)} className="flex min-h-9 items-center gap-2 rounded-full border border-[#DCC2A7]/40 bg-[#E8D1B8]/70 px-3 text-[#5C3D29] backdrop-blur-sm">
     <span aria-hidden="true" className="size-1 rounded-full bg-current"/><span className="text-[11px]">어항 도구</span>{managementOpen?<ChevronUp aria-hidden="true" className="size-3.5"/>:<ChevronDown aria-hidden="true" className="size-3.5"/>}
    </button>
    <div hidden={!managementOpen}><TooltipProvider><div role="group" aria-label="어항 도구" className="flex items-center overflow-hidden rounded-2xl border border-[#DCC2A7]/40 bg-[#E8D1B8]/50 text-[#5C3D29] shadow-[0_2px_8px_#5C3D2912] backdrop-blur-sm [&_button]:h-13 [&_button]:w-13 [&_button]:flex-col [&_button]:gap-1 [&_button]:rounded-xl [&_button]:bg-transparent [&_button]:text-[#5C3D29] [&_button:hover]:bg-[#DFC2A3]/80 [&_a]:h-13 [&_a]:w-13 [&_a]:flex-col [&_a]:gap-1 [&_a]:rounded-xl [&_a:hover]:bg-[#DFC2A3]/80">{props.managementControls}</div></TooltipProvider></div>
   </div>}
   <TankBubbles/><TankInhabitants items={displayed.map(item=>({...item,interaction_locked:busy}))} onPlace={place} onSelectDecoration={selectDecoration} onSelectionPosition={(id,x,y)=>{
    if(id!==selectedId.current||!toolbar.current)return
    const element=toolbar.current
    const width=glass.current?.clientWidth??dimensions.width
    element.style.left=`${Math.max(toolbarWidth/2+8,Math.min(width-toolbarWidth/2-8,x))}px`
    element.style.top=`${Math.max(element.offsetHeight+8,y-8)}px`
   }} onBackgroundTap={()=>setEditing(null)} onNavigate={direction=>{if(!busy){setEditing(null);props.navigation?.onChange(direction)}}}/>
   {editing&&decoration&&<div ref={toolbar} className="absolute z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1.5" style={{left:toolbarX,top:toolbarY,width:toolbarWidth}}><Button variant="secondary" className="order-2 min-h-11 gap-1.5 rounded-lg border bg-background/95 px-3 text-xs shadow-sm" onClick={()=>setInfoId(decoration.id)}><Info className="size-4"/>정보 보기</Button>{props.onArrange&&canArrangeSpecies(decoration.species)&&<DecorationEditor key={editing.id} name={decoration.species.name} value={editing.value} busy={busy} onChange={changeDecoration}/>}</div>}

  </div>
  <Dialog open={!!infoItem} onOpenChange={open=>{if(!open)setInfoId(null)}}><DialogContent className="gap-4 rounded-xl sm:max-w-sm"><DialogHeader className="pr-7"><DialogTitle className="flex items-center gap-2">{infoItem&&<CollectibleKindIcon kind={infoItem.species.kind} className="size-6 shrink-0 text-primary"/>}{infoItem?.species.name}</DialogTitle><DialogDescription>{infoItem&&kindLabels[infoItem.species.kind]} · {infoItem&&rarities[infoItem.species.rarity].label}</DialogDescription></DialogHeader>{infoItem&&<><div className="grid place-items-center rounded-xl bg-secondary/40 py-5"><CollectiblePreview species={infoItem.species}/></div><p className="text-sm leading-6 text-muted-foreground">{infoItem.species.description}</p><div className="flex items-center justify-between border-t pt-3 text-xs"><span className="text-muted-foreground">가치</span><span className="flex items-center gap-1 text-primary"><GoldIcon className="size-5"/>{infoItem.species.sell_price.toLocaleString('ko-KR')}</span></div><PrimaryHabitat species={infoItem.species}/></>}</DialogContent></Dialog>
  <section aria-label="어항 목록·보관함 도구" className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
   <button type="button" aria-label={toolsOpen?'목록·보관함 접기':'목록·보관함 펼치기'} aria-expanded={toolsOpen} className="flex h-8 w-full touch-none items-center justify-center gap-2 text-primary hover:bg-secondary/50" onClick={()=>{if(!toolsGesture.current?.dragged)setToolsOpen(value=>!value);toolsGesture.current=null}} onPointerDown={event=>{toolsGesture.current={y:event.clientY,dragged:false};event.currentTarget.setPointerCapture(event.pointerId)}} onPointerMove={event=>{const gesture=toolsGesture.current;if(!gesture)return;const delta=event.clientY-gesture.y;if(Math.abs(delta)>16){gesture.dragged=true;setToolsOpen(delta<0)}}} onPointerCancel={()=>{toolsGesture.current=null}}>
    <span aria-hidden="true" className="size-1 rounded-full bg-primary"/><span className="text-[11px]">목록 · 보관함</span>{toolsOpen?<ChevronDown aria-hidden="true" className="size-3.5"/>:<ChevronUp aria-hidden="true" className="size-3.5"/>}
   </button>
   <div hidden={!toolsOpen}><TooltipProvider><div className="grid grid-cols-2 gap-0"><AquariumInventoryDialog items={items} name={name} busy={busy} onSell={onSell} onGiftSent={props.onGiftSent} onStore={props.onStore}/>{props.storageControls}</div></TooltipProvider></div>
  </section>
 </>
}
