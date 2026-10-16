import { PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from '@/components/ui/dialog'
import { collectibleUrl } from '@/features/collection/api'
import { rarities } from '@/lib/game/rarity'
import type { FishingAttempt } from './api'

export function FishingTripDialog({catches,disabled}:{catches:FishingAttempt[];disabled:boolean}){
 const entries=new Map<string,{attempt:FishingAttempt;count:number}>()
 for(const attempt of catches){
  if(!attempt.species)continue
  const previous=entries.get(attempt.species.id)
  if(previous)previous.count++
  else entries.set(attempt.species.id,{attempt,count:1})
 }
 return <Dialog>
  <DialogTrigger render={<Button variant="ghost" disabled={disabled} aria-label={`보관함 · ${catches.length}개`} className="relative h-14 w-16 flex-col gap-0.5 rounded-2xl border border-white/25 bg-slate-950/25 px-2 text-white shadow-lg shadow-black/10 backdrop-blur-md hover:bg-slate-950/40 hover:text-white"/>}>
   <PackageOpen className="size-5"/><span className="text-[10px]">보관함</span>
   {catches.length>0&&<span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-teal-200 px-1 text-[10px] font-bold leading-5 text-teal-950">{catches.length}</span>}
  </DialogTrigger>
  <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden rounded-3xl sm:max-w-md">
   <DialogHeader><DialogTitle>보관함 <span className="ml-1 text-sm font-normal text-muted-foreground">총 {catches.length}개</span></DialogTitle><DialogDescription>지역을 이동해도 유지돼요. 다른 메뉴로 나가면 비워져요.</DialogDescription></DialogHeader>
   {entries.size?<ul className="min-h-0 space-y-2 overflow-y-auto">{Array.from(entries.values()).map(({attempt,count})=>{
    const species=attempt.species!,grade=rarities[species.rarity]
    return <li key={species.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 p-3">
     <img src={collectibleUrl(species.thumbnail_path)} alt="" className="size-14 shrink-0 object-contain"/>
     <div className="min-w-0 flex-1"><p className="break-keep text-sm font-semibold">{species.name}</p><span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{backgroundColor:grade.effectColor}}>{grade.label}</span></div>
     <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">×{count}</span>
    </li>
   })}</ul>:<div className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><PackageOpen className="size-10 opacity-40"/><p className="text-sm">잡은 물고기를 여기서 확인할 수 있어요.</p></div>}
   <p className="text-center text-xs text-muted-foreground">다른 메뉴로 나가도 실제 획득한 개체는 사라지지 않아요.</p>
  </DialogContent>
 </Dialog>
}
