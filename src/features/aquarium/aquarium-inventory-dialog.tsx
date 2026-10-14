import { useRef, useState } from 'react'
import { Fish, ListFilter, Minus, Plus } from 'lucide-react'
import { CollectibleKindIcon } from '@/features/collection/collectible-kind-icon'
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle } from '@/components/ui/alert-dialog'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { kindLabels } from '@/features/collection/api'
import type { CollectibleKind,OwnedCollectible } from '@/features/collection/api'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { GoldIcon } from '@/features/gold/gold-provider'
import { groupCollectibles } from './collectible-groups'
import type { CollectibleGroup } from './collectible-groups'
import { SendGiftDialog } from '@/features/gifts/send-gift-dialog'

function KindIcon({kind}:{kind:CollectibleKind}){
 return <Tooltip><TooltipTrigger render={<span className="inline-flex items-center" tabIndex={0}/> }><CollectibleKindIcon kind={kind}/><span className="sr-only">{kindLabels[kind]}</span></TooltipTrigger><TooltipContent>{kindLabels[kind]}</TooltipContent></Tooltip>
}

export function AquariumInventoryDialog({items,name,busy,onSell,onGiftSent}:{items:OwnedCollectible[];name:string;busy:boolean;onSell:(ids:string[])=>Promise<void>;onGiftSent?:(ids:string[])=>void}){
 const [open,setOpen]=useState(false),[category,setCategory]=useState<CollectibleKind|'all'>('all'),[rarity,setRarity]=useState<Rarity|'all'>('all')
 const [pending,setPending]=useState<CollectibleGroup|null>(null),[quantity,setQuantity]=useState(1),[selling,setSelling]=useState(false),[error,setError]=useState('')
 const locked=useRef(false)
 const groups=groupCollectibles(items)
 const filtered=groups.filter(group=>(category==='all'||group.species.kind===category)&&(rarity==='all'||group.species.rarity===rarity))
 const available=pending?groups.find(group=>group.species.id===pending.species.id)?.sellable??[]:[]
 const valid=Number.isInteger(quantity)&&quantity>=1&&quantity<=Math.min(available.length,100)
 async function sell(){
  if(locked.current||busy||!valid)return
  locked.current=true;setSelling(true);setError('')
  try{await onSell(available.slice(0,quantity).map(item=>item.id));setPending(null)}
  catch(cause){setError(cause instanceof Error?cause.message:'판매하지 못했어요. 다시 시도해주세요.')}
  finally{locked.current=false;setSelling(false)}
 }
 return <TooltipProvider><Dialog open={open} onOpenChange={value=>{if(!selling)setOpen(value)}}>
  <DialogTrigger render={<Button variant="secondary" size="sm" className="gap-1.5 bg-background/90 shadow-sm backdrop-blur"/>}><ListFilter className="size-4"/>개체 목록</DialogTrigger>
  <DialogContent className="max-h-[85dvh] gap-4 sm:max-w-md">
   <DialogHeader><DialogTitle>{name}</DialogTitle><DialogDescription>{groups.length}종 · {items.length}개체</DialogDescription></DialogHeader>
   <div className="flex gap-1" role="group" aria-label="개체 카테고리">{(['all','fish','trash','structure'] as const).map(value=><Tooltip key={value}><TooltipTrigger render={<Button size={value==='all'?'sm':'icon'} variant={category===value?'secondary':'ghost'} aria-label={value==='all'?'전체':kindLabels[value]} aria-pressed={category===value} onClick={()=>setCategory(value)}/>}>{value==='all'?'전체':<CollectibleKindIcon kind={value}/>}</TooltipTrigger><TooltipContent>{value==='all'?'전체':kindLabels[value]}</TooltipContent></Tooltip>)}</div>
   <div className="flex items-center justify-between gap-3 border-b pb-3"><Label htmlFor="aquarium-rarity-filter">등급</Label><select id="aquarium-rarity-filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={rarity} onChange={event=>setRarity(event.target.value as Rarity|'all')}><option value="all">전체 등급</option>{Object.entries(rarities).map(([value,meta])=><option key={value} value={value}>{meta.label}</option>)}</select></div>
   <ul className="max-h-[48dvh] space-y-1 overflow-y-auto">{filtered.map(group=><li key={group.species.id} className="flex items-center gap-3 rounded-lg py-2">
    <CollectibleThumbnail path={group.species.thumbnail_path} name={group.species.name} className="size-14 shrink-0"/>
    <div className="min-w-0 flex-1"><p className="truncate font-medium">{group.species.name} <span className="ml-1 text-xs tabular-nums text-muted-foreground">×{group.items.length}</span></p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><KindIcon kind={group.species.kind}/><span>· {rarities[group.species.rarity].label}{group.items.some(item=>item.id.startsWith('test-'))&&' · 테스트 포함'}</span></p></div>
    <div className="shrink-0 text-right"><p className="mb-1 flex items-center justify-end gap-1 text-xs tabular-nums text-muted-foreground"><GoldIcon className="size-3.5"/>{group.species.sell_price}</p><div className="flex items-center gap-1"><SendGiftDialog species={group.species} items={group.items} disabled={busy||selling||group.species.kind==='map'} onSent={ids=>onGiftSent?.(ids)}/><Button size="sm" variant="outline" disabled={busy||selling||!group.sellable.length} aria-label={`${group.species.name} 판매`} onClick={()=>{setPending(group);setQuantity(1);setError('')}}>판매</Button></div></div>
   </li>)}</ul>
   {!filtered.length&&<div className="py-10 text-center text-muted-foreground"><Fish className="mx-auto mb-3 size-7 opacity-40"/><p className="text-sm">조건에 맞는 개체가 없어요.</p></div>}
   <AlertDialog open={!!pending} onOpenChange={value=>{if(!value&&!selling)setPending(null)}}><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>{pending?.species.name} 판매</AlertDialogTitle><AlertDialogDescription>판매한 개체는 어항에서 사라져요. 도감의 발견 기록은 유지됩니다.</AlertDialogDescription></AlertDialogHeader>
    <div className="space-y-3"><Label htmlFor="sell-quantity">판매 수량 · 보유 {available.length}</Label><div className="flex items-center gap-2"><Button size="icon" variant="outline" aria-label="판매 수량 줄이기" disabled={selling||quantity<=1} onClick={()=>setQuantity(value=>value-1)}><Minus/></Button><Input id="sell-quantity" type="number" min={1} max={Math.min(available.length,100)} value={quantity} disabled={selling} onChange={event=>setQuantity(Number(event.target.value))} className="text-center tabular-nums"/><Button size="icon" variant="outline" aria-label="판매 수량 늘리기" disabled={selling||quantity>=Math.min(available.length,100)} onClick={()=>setQuantity(value=>value+1)}><Plus/></Button></div><p className="flex items-center justify-between text-sm"><span className="text-muted-foreground">받을 골드</span><span className="flex items-center gap-1 font-medium tabular-nums"><GoldIcon className="size-5"/>{valid?((pending?.species.sell_price??0)*quantity).toLocaleString('ko-KR'):'—'}</span></p>{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}</div>
    <AlertDialogFooter><Button variant="outline" disabled={selling} onClick={()=>setPending(null)}>취소</Button><Button disabled={selling||busy||!valid} onClick={()=>void sell()}>{selling?'판매 중…':'판매하기'}</Button></AlertDialogFooter>
   </AlertDialogContent></AlertDialog>
  </DialogContent>
 </Dialog></TooltipProvider>
}
