import {fishingDockButton} from '@/components/fishing-dock-style'
import {appArt} from '@/components/app-art'
import { useState } from 'react'
import { RaritySelect } from '@/components/rarity-select'
import type { RarityFilter } from '@/components/rarity-select'
import { LandscapeImage } from '@/components/landscape-image'

import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from '@/components/ui/dialog'
import { collectibleUrl } from '@/features/collection/api'
import type { FishingAttempt } from './api'

const {storage:PackageOpen}=appArt


export function FishingTripDialog({catches,disabled,dock=false}:{catches:FishingAttempt[];disabled:boolean;dock?:boolean}){
 const [rarity,setRarity]=useState<RarityFilter>('all')
 const entries=new Map<string,{attempt:FishingAttempt;count:number}>()
 for(const attempt of catches){
  if(!attempt.species||(rarity!=='all'&&attempt.species.rarity!==rarity))continue
  const previous=entries.get(attempt.species.id)
  if(previous)previous.count++
  else entries.set(attempt.species.id,{attempt,count:1})
 }
 return <Dialog>
  <DialogTrigger render={<Button variant="ghost" disabled={disabled} aria-label={`보관함 · ${catches.length}개`} className={dock?fishingDockButton:"relative h-14 min-w-20 flex-row gap-2 rounded-none border border-white/25 bg-slate-950/25 px-2 text-white shadow-lg shadow-black/10 backdrop-blur-md hover:bg-slate-950/40 hover:text-white"}/>}>
   <PackageOpen className="size-6"/><span className="text-[11px] tabular-nums">{dock&&"보관함 · "}{catches.length}</span>
  </DialogTrigger>
  <DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[85dvh] max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
   <DialogHeader><DialogTitle className="flex items-center gap-2"><img src="/branding/pongi-starfish.png" alt="" className="size-6 object-contain"/>보관함 <span className="ml-1 text-sm font-normal text-muted-foreground">총 {catches.length}개</span></DialogTitle><DialogDescription className="sr-only">이번 낚시에서 만난 개체예요.</DialogDescription></DialogHeader>
   <div className="flex shrink-0 justify-end"><RaritySelect value={rarity} onChange={setRarity}/></div>
   {entries.size?<ul className="-mx-4 min-h-0 space-y-2 px-4 overflow-y-auto overscroll-contain">{Array.from(entries.values()).map(({attempt,count})=>{
    const species=attempt.species!
    return <li key={species.id} className={"flex w-full items-center gap-3 rounded-xl border border-border/60 px-3 py-3 "+({common:"bg-slate-50 dark:bg-slate-900/40",rare:"bg-blue-50 dark:bg-blue-950/40",epic:"bg-purple-50 dark:bg-purple-950/40",mythic:"bg-amber-50 dark:bg-amber-950/40"}[species.rarity])}>
     <span className="relative size-14 shrink-0"><LandscapeImage retryable={false} src={collectibleUrl(species.thumbnail_path)} alt="" className="absolute inset-0 size-full object-contain"/></span>
     <div className="min-w-0 flex-1"><p className="break-keep text-sm font-semibold">{species.name}</p></div>
     <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">{count}</span>
    </li>
   })}</ul>:<div className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><PackageOpen className="size-10 opacity-40"/><p className="text-sm">{rarity==='all'?'아직 잡은 개체가 없어요.':'해당 등급의 개체가 없어요.'}</p></div>}

  </DialogContent>

 </Dialog>
}
