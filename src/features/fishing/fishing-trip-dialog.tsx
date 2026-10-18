import { useState } from 'react'
import { LandscapeImage } from '@/components/landscape-image'
import { PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from '@/components/ui/dialog'
import { collectibleUrl } from '@/features/collection/api'
import { rarities } from '@/lib/game/rarity'
import type { FishingAttempt } from './api'

export function FishingTripDialog({catches,disabled}:{catches:FishingAttempt[];disabled:boolean}){
 const [detail,setDetail]=useState<FishingAttempt|null>(null)
 const entries=new Map<string,{attempt:FishingAttempt;count:number}>()
 for(const attempt of catches){
  if(!attempt.species)continue
  const previous=entries.get(attempt.species.id)
  if(previous)previous.count++
  else entries.set(attempt.species.id,{attempt,count:1})
 }
 return <Dialog>
  <DialogTrigger render={<Button variant="ghost" disabled={disabled} aria-label={`보관함 · ${catches.length}개`} className="relative h-16 w-16 flex-col gap-0.5 rounded-none border border-white/25 bg-slate-950/25 px-2 text-white shadow-lg shadow-black/10 backdrop-blur-md hover:bg-slate-950/40 hover:text-white"/>}>
   <PackageOpen className="size-5"/><span className="text-xs tabular-nums">{catches.length}</span>
  </DialogTrigger>
  <DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[85dvh] max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
   <DialogHeader><DialogTitle className="flex items-center gap-2"><img src="/branding/pongi-starfish.png" alt="" className="size-6 object-contain"/>보관함 <span className="ml-1 text-sm font-normal text-muted-foreground">총 {catches.length}개</span></DialogTitle><DialogDescription className="sr-only">이번 낚시에서 만난 개체예요.</DialogDescription></DialogHeader>
   {entries.size?<ul className="-mx-4 min-h-0 divide-y border-t overflow-y-auto overscroll-contain">{Array.from(entries.values()).map(({attempt,count})=>{
    const species=attempt.species!
    return <li key={species.id}><button type="button" onClick={()=>setDetail(attempt)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40">
     <span className="relative size-14 shrink-0"><LandscapeImage retryable={false} src={collectibleUrl(species.thumbnail_path)} alt="" className="absolute inset-0 size-full object-contain"/></span>
     <div className="min-w-0 flex-1"><p className="break-keep text-sm font-semibold">{species.name}</p></div>
     <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">×{count}</span>
    </button></li>
   })}</ul>:<div className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><PackageOpen className="size-10 opacity-40"/><p className="text-sm">아직 잡은 개체가 없어요.</p></div>}

  </DialogContent>
 <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent><DialogHeader><DialogTitle>{detail?.species?.name}</DialogTitle><DialogDescription>{detail?.species&&rarities[detail.species.rarity].label}</DialogDescription></DialogHeader>{detail?.species&&<div className="relative mx-auto size-40"><LandscapeImage src={collectibleUrl(detail.species.thumbnail_path)} alt={detail.species.name} className="absolute inset-0 size-full object-contain"/></div>}</DialogContent></Dialog>
 </Dialog>
}
