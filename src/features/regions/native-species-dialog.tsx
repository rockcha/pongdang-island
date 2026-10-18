import { useEffect,useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger } from '@/components/ui/dialog'
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from '@/components/ui/tooltip'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import type { CatalogEntry } from '@/features/collection/api'
import { rarities } from '@/lib/game/rarity'
import { loadHarborCatalog } from './harbor-catalog'

export function NativeSpeciesDialog({regionId,disabled}:{regionId:string;disabled:boolean}){
 const [open,setOpen]=useState(false)
 return <Dialog open={open} onOpenChange={setOpen}>
  <TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button disabled={disabled} variant="ghost" size="icon" aria-label="이 바다를 주 서식지로 하는 개체" className="size-11 rounded-full border border-white/20 bg-slate-950/20 text-white backdrop-blur-sm hover:bg-slate-950/35 hover:text-white"/>}/> }><Sparkles className="size-5"/></TooltipTrigger><TooltipContent>이 바다를 주 서식지로 하는 개체</TooltipContent></Tooltip></TooltipProvider>
  <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden rounded-3xl sm:max-w-lg">
   <DialogHeader><DialogTitle>이 바다를 주 서식지로 하는 개체</DialogTitle><DialogDescription>확률 10배 업 · 다른 해역 대비 추첨 가중치예요.</DialogDescription></DialogHeader>
   {open&&<NativeSpeciesList key={regionId} regionId={regionId}/>}
  </DialogContent>
 </Dialog>
}

function NativeSpeciesList({regionId}:{regionId:string}){
 const [items,setItems]=useState<CatalogEntry[]|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0)
 useEffect(()=>{
  let active=true
  loadHarborCatalog().then(catalog=>{if(active){setItems(catalog.filter(item=>item.is_native&&item.native_region_id===regionId));setError(false)}}).catch(()=>{if(active)setError(true)})
  return()=>{active=false}
 },[regionId,retry])
 if(error)return <div role="alert" className="space-y-3 py-6 text-center"><p className="text-sm text-muted-foreground">개체를 불러오지 못했어요.</p><Button variant="outline" onClick={()=>setRetry(value=>value+1)}>다시 불러오기</Button></div>
 if(!items)return <p role="status" className="py-10 text-center text-sm text-muted-foreground">바다 친구들을 찾고 있어요…</p>
 if(!items.length)return <p className="py-10 text-center text-sm text-muted-foreground">새로운 바다 친구들을 기다리고 있어요.</p>
 return <ul aria-label="이 바다가 주 서식지인 개체" className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto pb-1">{items.map(item=>{
  const grade=rarities[item.rarity]
  return <li key={item.id} className="flex flex-col items-center rounded-2xl border border-border/50 bg-muted/25 p-3 text-center">
   <span className={item.discovered?'':'brightness-0 opacity-30'}><CollectibleThumbnail path={item.thumbnail_path} name={item.discovered?item.name:'미발견 개체'} className="size-24"/></span>
   <p className="mt-2 break-keep text-sm font-semibold">{item.discovered?item.name:'아직 만나지 못한 친구'}</p>
   <span className="mt-2 rounded px-2 py-0.5 text-[10px] font-bold text-white" style={{backgroundColor:grade.effectColor}}>{grade.label}</span>
   <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.discovered?item.description:'이곳에서 낚시하며 발견해보세요.'}</p>
  </li>
 })}</ul>
}
