import {EmptyState} from '@/components/empty-state'
import {appArt} from '@/components/app-art'
import {CollectibleSearchInput} from './collectible-search-input'
import {RaritySelect} from '@/components/rarity-select'
import { Label } from '@/components/ui/label'
import { useRef, useState } from 'react'
import {Minus,Plus} from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {CollectibleQuantityCard} from './collectible-quantity-card'
import type { CollectibleKind,OwnedCollectible } from '@/features/collection/api'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { GoldIcon } from '@/features/gold/gold-provider'
import { groupCollectibles } from './collectible-groups'
import type { CollectibleGroup } from './collectible-groups'

import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import { SendGiftDialog } from '@/features/gifts/send-gift-dialog'
import { AquariumToolButton } from './aquarium-tool-button'
import { storageError } from './api'

const {list:ListFilter,storage:Archive,mailGift:Gift}=appArt


export function AquariumInventoryDialog({items,name,busy,onSell,onGiftSent,onStore}:{items:OwnedCollectible[];name:string;busy:boolean;onSell:(ids:string[])=>Promise<void>;onGiftSent?:(ids:string[])=>void;onStore?:(ids:string[])=>Promise<void>}){
 const [open,setOpen]=useState(false),[category,setCategory]=useState<CollectibleKind|'all'>('all'),[rarity,setRarity]=useState<Rarity|'all'>('all')
 const [query,setQuery]=useState('')
 const [selection,setSelection]=useState<Set<string>>(new Set())
 const [storeIds,setStoreIds]=useState<string[]|null>(null),[storeError,setStoreError]=useState('')
 const [batch,setBatch]=useState<OwnedCollectible[]|null>(null)
 const [pending,setPending]=useState<CollectibleGroup|null>(null),[quantity,setQuantity]=useState(1),[selling,setSelling]=useState(false),[error,setError]=useState('')
 const locked=useRef(false)
 const groups=groupCollectibles(items).sort((a,b)=>rarities[a.species.rarity].rank-rarities[b.species.rarity].rank)
 const movableIds=(group:CollectibleGroup)=>group.items.filter(item=>!item.id.startsWith('test-')&&item.species.kind!=='map').slice(0,50).map(item=>item.id)
 const filtered=groups.filter(group=>(category==='all'||group.species.kind===category)&&(rarity==='all'||group.species.rarity===rarity)&&group.species.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
 const selected=groups.map(group=>({...group,items:group.items.filter(item=>selection.has(item.id)),sellable:group.sellable.filter(item=>selection.has(item.id))})).filter(group=>group.items.length)
 const movable=selected.flatMap(movableIds).slice(0,50)
 const sellable=selected.flatMap(group=>group.sellable).slice(0,100)
 const total=sellable.reduce((sum,item)=>sum+item.species.sell_price,0)
 const available=batch??(pending?groups.find(group=>group.species.id===pending.species.id)?.sellable??[]:[])
 const valid=Number.isInteger(quantity)&&quantity>=1&&quantity<=Math.min(available.length,100)
 async function sell(){
  if(locked.current||busy||!valid)return
  locked.current=true;setSelling(true);setError('')
  try{await onSell(available.slice(0,quantity).map(item=>item.id));setPending(null);setBatch(null);setSelection(new Set())}
  catch(cause){setError(cause instanceof Error?cause.message:'판매하지 못했어요. 다시 시도해주세요.')}
  finally{locked.current=false;setSelling(false)}
 }
 return <TooltipProvider><Dialog open={open} onOpenChange={value=>{if(!selling){setOpen(value);if(value)setSelection(new Set())}}}>
  <AquariumToolButton prominent count={items.length} label="목록" icon={<ListFilter className="size-8"/>}/>
  <DialogContent className="bottom-0 top-auto left-0 flex h-[88dvh] max-h-[88dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-3 overflow-hidden rounded-t-2xl rounded-b-none pb-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
   <DialogHeader className="shrink-0 pr-7"><DialogTitle className="flex items-center gap-2"><ListFilter aria-hidden="true" className="size-5 shrink-0 text-primary"/>{name} <span className="ml-1 text-sm font-normal text-muted-foreground">{items.length}개</span></DialogTitle></DialogHeader>
   <div className="segmented-control grid shrink-0 grid-cols-4 gap-1" role="group" aria-label="개체 카테고리">{([{id:'all',name:'전체'},{id:'fish',name:'물고기'},{id:'decoration',name:'장식물'},{id:'trash',name:'쓰레기'}] as const).map(item=><Button key={item.id} size="sm" className="min-h-16 min-w-0 flex-col gap-1 px-1 py-2 text-[11px]" variant={category===item.id?'secondary':'ghost'} aria-pressed={category===item.id} onClick={()=>setCategory(item.id)}>{item.id==='all'?<appArt.list className="size-7"/>:item.id==='fish'?<appArt.fish className="size-7"/>:item.id==='decoration'?<appArt.decoration className="size-7"/>:<appArt.trash className="size-7"/>}<span>{item.name}</span></Button>)}</div>
   <div className="flex min-w-0 shrink-0 items-center gap-2"><CollectibleSearchInput value={query} disabled={busy||selling} onChange={value=>{setQuery(value);setSelection(new Set())}}/><RaritySelect value={rarity} onChange={setRarity}/></div>
   <div className="-mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">{filtered.length?<ul className="grid grid-cols-3 border-t border-border/60">{filtered.map(group=>{const eligible=group.items.filter(item=>!item.id.startsWith('test-')&&item.species.kind!=='map');const value=eligible.filter(item=>selection.has(item.id)).length;return <li key={group.species.id} className="min-w-0"><CollectibleQuantityCard species={group.species} count={group.items.length} value={value} max={Math.min(eligible.length,Math.max(0,50-selection.size+value))} disabled={busy||selling} onChange={quantity=>setSelection(old=>{const next=new Set(old);group.items.forEach(item=>next.delete(item.id));eligible.slice(0,quantity).forEach(item=>next.add(item.id));return next})}/></li>})}</ul>:<EmptyState>조건에 맞는 개체가 없어요.</EmptyState>}</div>
   {selected.length>0&&<div className="flex min-h-12 shrink-0 items-center gap-3 overflow-x-auto border-t pt-2" aria-label="선택한 개체">{selected.map(group=><div key={group.species.id} className="relative shrink-0 px-1 pt-3"><span className="absolute inset-x-0 top-0 text-center text-[10px] tabular-nums text-primary">×{group.items.length}</span><CollectibleThumbnail species={group.species} path={group.species.thumbnail_path} name={group.species.name} className="size-9"/></div>)}</div>}
   <div className="-mx-4 -mb-4 -mt-3 grid shrink-0 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)]"><Button variant="secondary" aria-label={movable.length+'개 보관함으로'} className="h-16 min-w-0 gap-2 rounded-none border-r" disabled={busy||selling||!onStore||!movable.length} onClick={()=>{setStoreError('');setStoreIds([...movable])}}><Archive className="size-6"/></Button>{selected.length===1?<SendGiftDialog species={selected[0].species} items={selected[0].items} disabled={busy||selling||selected[0].species.kind==='map'} onSent={ids=>{onGiftSent?.(ids);setSelection(new Set())}}/>:<Button variant="secondary" className="h-16 min-w-0 rounded-none border-r" aria-label="선물할 종류 하나를 선택해주세요" disabled><Gift className="size-7"/></Button>}<Button className="h-16 min-w-0 gap-2 rounded-none" aria-label={'선택한 개체 판매 '+total+' 골드'} disabled={busy||selling||!sellable.length} onClick={()=>{setError('');setPending(null);setBatch(sellable);setQuantity(sellable.length)}}><GoldIcon className="size-6"/><span className="tabular-nums">{total.toLocaleString('ko-KR')}</span></Button></div>
   <ConfirmDialog illustration="aquarium" open={storeIds!==null} onOpenChange={value=>{if(!value)setStoreIds(null)}} title="보관함에 보관할까요?" description={`선택한 ${storeIds?.length??0}개를 보관함으로 옮겨요.`} busy={selling} error={storeError} confirmDisabled={busy||!storeIds?.length} onConfirm={async()=>{if(locked.current||!onStore||!storeIds?.length)return;locked.current=true;setSelling(true);setStoreError('');try{await onStore(storeIds);setSelection(new Set());setStoreIds(null)}catch(cause){setStoreError(storageError(cause))}finally{locked.current=false;setSelling(false)}}}/>
   <ConfirmDialog illustration="sale" open={!!pending||!!batch} onOpenChange={value=>{if(!value){setPending(null);setBatch(null)}}} title={`${pending?.species.name??'선택한 개체'} ${quantity}개를 판매하겠습니까?`} description="판매한 개체는 어항에서 사라져요. 도감의 발견 기록은 유지돼요." busy={selling} confirmDisabled={busy||!valid} error={error} onConfirm={()=>void sell()}>
    <div className="space-y-3">{batch&&<ul className="max-h-28 overflow-y-auto text-xs">{groupCollectibles(batch.slice(0,quantity)).map(g=><li key={g.species.id} className="flex justify-between py-1"><span>{g.species.name}</span><span>×{g.items.length}</span></li>)}</ul>}{!batch&&<><Label htmlFor="sell-quantity">판매 수량 · 보유 {available.length}</Label><div className="flex items-center gap-2"><Button size="icon" variant="outline" aria-label="판매 수량 줄이기" disabled={selling||quantity<=1} onClick={()=>setQuantity(value=>value-1)}><Minus/></Button><Input id="sell-quantity" type="number" min={1} max={Math.min(available.length,100)} value={quantity} disabled={selling} onChange={event=>setQuantity(Number(event.target.value))} className="text-center tabular-nums"/><Button size="icon" variant="outline" aria-label="판매 수량 늘리기" disabled={selling||quantity>=Math.min(available.length,100)} onClick={()=>setQuantity(value=>value+1)}><Plus/></Button></div></>}<p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">받을 골드</span><span className="flex items-center gap-1 font-medium tabular-nums"><GoldIcon className="size-5"/>{valid?available.slice(0,quantity).reduce((sum,item)=>sum+item.species.sell_price,0).toLocaleString('ko-KR'):'—'}</span></p></div>
   </ConfirmDialog>
  </DialogContent>
 </Dialog></TooltipProvider>
}
