import { loadMapShop } from '@/features/regions/map-shop-api'
import {CollectiblePreview} from './collectible-preview'
import { regionIcons } from '@/features/regions/region-icons'
import { Select } from '@base-ui/react/select'
import { useEffect, useState } from 'react'
import { BookOpenText, LayoutGrid, Plus, LockKeyhole, Check, ChevronDown } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { GoldIcon } from '@/features/gold/gold-provider'
import { AquariumToolButton } from '@/features/aquarium/aquarium-tool-button'
import { CollectibleThumbnail } from './collectible-thumbnail'
import { CollectibleKindIcon } from './collectible-kind-icon'
import { HabitatIcons } from './habitat-icons'
import { kindLabels, loadCollection } from './api'
import type { CollectibleKind, CollectionState, CatalogEntry, Species } from './api'

type CollectionDialogProps = { onAddTemporary?: (species: Species) => void; fishing?:boolean;disabled?:boolean }
function BookSelect({ label, value, onChange, items, region = false }: {label:string;value:string;onChange:(value:string)=>void;items:{value:string;label:string}[];region?:boolean}) {
 return <Select.Root value={value} onValueChange={value=>{if(value!==null)onChange(value)}} items={items}><Select.Trigger aria-label={label} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><Select.Value className="min-w-0 truncate">{region?<span className="flex min-w-0 items-center gap-2">{regionIcons[value]?<img src={regionIcons[value].src} alt="" className="size-6 shrink-0 object-contain"/>:<LayoutGrid aria-hidden="true" className="size-4 shrink-0 text-primary"/>}<span className="truncate">{items.find(item=>item.value===value)?.label}</span></span>:undefined}</Select.Value><Select.Icon><ChevronDown className="size-4 text-primary"/></Select.Icon></Select.Trigger><Select.Portal><Select.Positioner sideOffset={5} className="z-[70]"><Select.Popup className="max-h-72 min-w-40 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-foreground shadow-lg outline-none"><Select.List>{items.map(item=><Select.Item key={item.value} value={item.value} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm outline-none data-highlighted:bg-secondary data-selected:bg-secondary/60 data-selected:text-primary"><Select.ItemText className="flex items-center gap-2">{region&&(regionIcons[item.value]?<img src={regionIcons[item.value].src} alt="" className="size-6 shrink-0 object-contain"/>:<LayoutGrid aria-hidden="true" className="size-4 shrink-0 text-primary"/>)}{item.label}</Select.ItemText><Select.ItemIndicator><Check className="size-4"/></Select.ItemIndicator></Select.Item>)}</Select.List></Select.Popup></Select.Positioner></Select.Portal></Select.Root>
}

export function CollectionDialog({ onAddTemporary,fishing=false,disabled=false }: CollectionDialogProps) {
 const { session } = useAuth()
 const [open, setOpen] = useState(false)
 return <Dialog open={open} onOpenChange={setOpen}>
  {fishing?<TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" disabled={disabled} aria-label="바다 도감" className="size-11 rounded-full border border-white/20 bg-slate-950/20 text-white backdrop-blur-sm hover:bg-slate-950/35 hover:text-white"/>}/> }><BookOpenText className="size-5"/></TooltipTrigger><TooltipContent>바다 도감</TooltipContent></Tooltip></TooltipProvider>:<AquariumToolButton label="바다 도감" icon={<BookOpenText className="size-[18px]" strokeWidth={1.7}/>}/>}
  <DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex h-[92dvh] max-h-[92dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2">
   <DialogHeader className="shrink-0 border-b border-border/50 px-4 pb-3 pt-4 pr-12">
    <DialogTitle className="flex items-center gap-2 text-lg"><BookOpenText aria-hidden="true" className="size-5 text-primary"/>바다 도감</DialogTitle>
    <DialogDescription className="text-xs">작은 바다에서 만나는 친구와 보물들.</DialogDescription>
   </DialogHeader>
   {open && <CollectionBook key={session?.user.id} onAddTemporary={onAddTemporary}/>}
  </DialogContent>
 </Dialog>
}

function CollectionBook({ onAddTemporary }: CollectionDialogProps) {
 const [state, setState] = useState<CollectionState | null>(null)
 const [error, setError] = useState('')
 const [tab, setTab] = useState<'all' | CollectibleKind>('all')
 const [rarity, setRarity] = useState<'all' | Rarity>('all')
 const [habitat, setHabitat] = useState('all')
 const [detail,setDetail] = useState<CatalogEntry|null>(null)
 const [attempt, setAttempt] = useState(0)
 const [mapPrices,setMapPrices]=useState<Record<string,number>>({})
 useEffect(()=>{let active=true;void loadMapShop().then(data=>{if(active)setMapPrices(Object.fromEntries(data.items.map(item=>[item.region_id,item.price])))}).catch(()=>{});return()=>{active=false}},[])
 useEffect(() => {
  let active = true
  loadCollection().then(data => { if (active) { setState(data); setError('') } })
   .catch(() => { if (active) setError('도감을 불러오지 못했어요. 잠시 후 다시 시도해주세요.') })
  return () => { active = false }
 }, [attempt])
 const catalog=state?.catalog.filter(s=>s.kind!=='map')??[]
 const habitats = Array.from(new Map(catalog.flatMap(s => s.habitats).map(region => [region.id, region])).values()).sort((a, b) => (a.id==='pongdang'?-1:mapPrices[a.id]??(['coral','bluegrove','mistmoon'].includes(a.id)?['coral','bluegrove','mistmoon'].indexOf(a.id):Infinity))-(b.id==='pongdang'?-1:mapPrices[b.id]??(['coral','bluegrove','mistmoon'].includes(b.id)?['coral','bluegrove','mistmoon'].indexOf(b.id):Infinity)) || a.name.localeCompare(b.name,'ko'))
 const entries = catalog.filter(s =>
  (tab === 'all' || s.kind === tab) && (rarity === 'all' || s.rarity === rarity) &&
  (habitat === 'all' || s.habitats.some(region => region.id === habitat))
 ).sort((a, b) => a.sell_price - b.sell_price || a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id)) ?? []
 return <section className="flex min-h-0 flex-1 flex-col">
  <div className="shrink-0 space-y-3 border-b border-border/50 bg-popover px-4 py-3 sm:px-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <TooltipProvider><div role="group" aria-label="도감 분류" className="flex gap-1">
     {(['all', 'fish', 'trash', 'decoration'] as const).map(value => {
      const label = value === 'all' ? '전체' : kindLabels[value]
      return <Tooltip key={value}><TooltipTrigger render={<Button type="button" size="icon" variant={tab === value ? 'secondary' : 'ghost'} aria-label={label} aria-pressed={tab === value} className="size-10 rounded-xl" onClick={() => setTab(value)}/> }>
       {value === 'all' ? <LayoutGrid className="size-[18px]"/> : <CollectibleKindIcon kind={value} className="size-[18px]"/>}
      </TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
     })}
    </div></TooltipProvider>
    <span className="text-[11px] tabular-nums text-muted-foreground">{state ? `${entries.length}종 · 가치순` : '가치순'}</span>
   </div>
   <div className="flex gap-2">
    <BookSelect region label="도감 서식지역" value={habitat} onChange={setHabitat} items={[{value:'all',label:'전체 해역'},...habitats.map(region=>({value:region.id,label:region.name}))]}/>
    <BookSelect label="도감 등급" value={rarity} onChange={value=>setRarity(value as 'all'|Rarity)} items={[{value:'all',label:'전체 등급'},...Object.entries(rarities).map(([value,meta])=>({value,label:meta.label}))]}/>
   </div>
  </div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
   {error && <div role="alert" className="space-y-2 py-8 text-center text-sm"><p>{error}</p><Button variant="outline" onClick={() => setAttempt(v => v + 1)}>다시 불러오기</Button></div>}
   {!state && !error && <div role="status" aria-label="도감을 펼치는 중"><span className="sr-only">도감을 펼치는 중…</span><div aria-hidden="true" className="grid grid-cols-3 border-t border-border sm:grid-cols-4">{Array.from({length:12},(_,i)=><div key={i} className="flex flex-col items-center border-r border-b border-border bg-card px-1 pb-2 pt-3 motion-safe:animate-pulse"><div className="aspect-square w-full max-w-24 rounded-lg bg-secondary/60"/><div className="mt-2 flex h-10 w-full items-start justify-center pt-1"><div className="h-3 w-3/4 rounded bg-secondary/60"/></div></div>)}</div></div>}
   {state && entries.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">조건에 맞는 개체가 없어요.</p>}
   <ul aria-label="도감 개체" className="grid grid-cols-3 border-t border-border sm:grid-cols-4">
    {entries.map(s => <li key={s.id}>
     <article aria-label={s.name} className={`collection-card relative h-full border-r border-b ${rarities[s.rarity].className}`}>
      <button type="button" aria-label={s.name+(s.discovered?' 상세 보기':' 잠김')} disabled={!s.discovered} onClick={()=>{if(s.discovered)setDetail(s)}} className="flex h-full w-full cursor-pointer disabled:cursor-default flex-col items-center px-1 pb-2 pt-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
       <div className="relative flex w-full items-center justify-center"><CollectibleThumbnail fadeIn path={s.thumbnail_path} name={s.name} className={"aspect-square w-full max-w-24 "+(!s.discovered?"[&_img]:brightness-0":"")}/>{!s.discovered&&<span className="absolute inset-0 flex items-center justify-center"><LockKeyhole aria-hidden="true" className="size-6 rounded-md bg-background/90 p-1 text-foreground shadow-sm"/></span>}</div>
       <h3 className="mt-2 h-10 line-clamp-2 text-xs font-medium leading-5">{s.name}</h3>

      </button>
      {s.is_native&&s.native_region_id&&regionIcons[s.native_region_id]&&<TooltipProvider><Tooltip><TooltipTrigger render={<span tabIndex={0} aria-label={regionIcons[s.native_region_id].name+' 토착 개체'} className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full border border-border bg-background/95 p-0.5"/>}><img src={regionIcons[s.native_region_id].src} alt="" className="size-5 object-contain"/></TooltipTrigger><TooltipContent>{regionIcons[s.native_region_id].name} 토착 개체</TooltipContent></Tooltip></TooltipProvider>}
      {onAddTemporary&&<TooltipProvider><Tooltip><TooltipTrigger render={<Button type="button" size="icon" variant="secondary" aria-label={s.name+' 임시 넣기'} className="absolute left-0.5 top-0.5 z-10 size-9 rounded-lg border border-border bg-background/95 shadow-sm" onClick={()=>onAddTemporary(s)}/> }><Plus className="size-4"/></TooltipTrigger><TooltipContent>어항에 임시 넣기</TooltipContent></Tooltip></TooltipProvider>}
     </article>
    </li>)}
   </ul>
  </div>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="top-auto bottom-0 max-h-[85dvh] max-w-full translate-y-0 overflow-y-auto rounded-b-none rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:max-w-sm sm:-translate-y-1/2 sm:rounded-xl">
   <DialogHeader className="pr-7"><DialogTitle className="flex items-center gap-2">{detail&&<CollectibleKindIcon kind={detail.kind} className="size-5 shrink-0 text-primary"/>}{detail?.name}</DialogTitle><DialogDescription>{detail&&rarities[detail.rarity].label} · {detail&&kindLabels[detail.kind]}</DialogDescription></DialogHeader>
   {detail&&<><div className="flex justify-center rounded-xl bg-secondary/40 p-4"><CollectiblePreview species={detail}/></div><p className="text-sm leading-6 text-muted-foreground">{detail.description}</p><div className="flex items-center justify-between gap-2 text-xs"><span>서식지역</span><HabitatIcons habitats={detail.habitats}/></div><div className="flex items-center justify-between text-sm"><span>가치</span><span className="flex items-center gap-1"><GoldIcon className="size-4"/>{detail.sell_price.toLocaleString()}</span></div></>}
  </DialogContent></Dialog>
 </section>
}
