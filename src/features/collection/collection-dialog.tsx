import {fishingDockButton} from '@/components/fishing-dock-style'
import {EmptyState} from '@/components/empty-state'
import {appArt} from '@/components/app-art'
import { RarityBadge } from '@/components/rarity-badge'
import { RaritySelect } from '@/components/rarity-select'
import { loadMapShop } from '@/features/regions/map-shop-api'
import {CollectiblePreview} from './collectible-preview'
import { regionIcons } from '@/features/regions/region-icons'
import { Select } from '@base-ui/react/select'
import { useEffect, useState } from 'react'
import {LayoutGrid,Plus,Check,ChevronDown} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Rarity } from '@/lib/game/rarity'
import { GoldIcon } from '@/features/gold/gold-provider'
import { AquariumToolButton } from '@/features/aquarium/aquarium-tool-button'
import { CollectibleThumbnail } from './collectible-thumbnail'
import { CollectibleKindIcon } from './collectible-kind-icon'
import { PrimaryHabitat } from './native-region-badge'
import {collectibleCardTones} from './collectible-card-tones'
import { kindLabels, loadCollection } from './api'
import type { CollectibleKind, CollectionState, CatalogEntry, Species } from './api'

const {collection:BookOpenText}=appArt


type CollectionDialogProps = { onAddTemporary?: (species: Species) => void; fishing?:boolean;disabled?:boolean;dock?:boolean }
function BookSelect({ label, value, onChange, items, region = false }: {label:string;value:string;onChange:(value:string)=>void;items:{value:string;label:string}[];region?:boolean}) {
 return <Select.Root value={value} onValueChange={value=>{if(value!==null)onChange(value)}} items={items}><Select.Trigger aria-label={label} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><Select.Value className="min-w-0 truncate">{region?<span className="flex min-w-0 items-center gap-2">{regionIcons[value]?<img src={regionIcons[value].src} alt="" className="size-6 shrink-0 object-contain"/>:<LayoutGrid aria-hidden="true" className="size-4 shrink-0 text-primary"/>}<span className="truncate">{items.find(item=>item.value===value)?.label}</span></span>:undefined}</Select.Value><Select.Icon><ChevronDown className="size-4 text-primary"/></Select.Icon></Select.Trigger><Select.Portal><Select.Positioner sideOffset={5} className="z-[70]"><Select.Popup className="max-h-72 min-w-40 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-foreground shadow-lg outline-none"><Select.List>{items.map(item=><Select.Item key={item.value} value={item.value} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm outline-none data-highlighted:bg-secondary data-selected:bg-secondary/60 data-selected:text-primary"><Select.ItemText className="flex items-center gap-2">{region&&(regionIcons[item.value]?<img src={regionIcons[item.value].src} alt="" className="size-6 shrink-0 object-contain"/>:<LayoutGrid aria-hidden="true" className="size-4 shrink-0 text-primary"/>)}{item.label}</Select.ItemText><Select.ItemIndicator><Check className="size-4"/></Select.ItemIndicator></Select.Item>)}</Select.List></Select.Popup></Select.Positioner></Select.Portal></Select.Root>
}

export function CollectionDialog({ onAddTemporary,fishing=false,disabled=false,dock=false }: CollectionDialogProps) {
 const { session } = useAuth()
 const [open, setOpen] = useState(false)
 return <Dialog open={open} onOpenChange={setOpen}>
  {fishing?<TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" disabled={disabled} aria-label="바다 도감" className={dock?fishingDockButton:"size-11 rounded-full border border-white/20 bg-slate-950/20 text-white backdrop-blur-sm hover:bg-slate-950/35 hover:text-white"}/>}/> }><BookOpenText className="size-8"/>{dock&&<span className="text-[11px]">도감</span>}</TooltipTrigger><TooltipContent>바다 도감</TooltipContent></Tooltip></TooltipProvider>:<AquariumToolButton label="바다 도감" icon={<BookOpenText className="size-8"/>}/>}
  <DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex h-[92dvh] max-h-[92dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2">
   <DialogHeader className="shrink-0 border-b border-border/50 px-4 pb-3 pt-4 pr-12">
    <DialogTitle className="flex items-center gap-2 text-lg"><BookOpenText aria-hidden="true" className="size-5 text-primary"/>바다 도감</DialogTitle>
    <DialogDescription className="text-xs">모든 해역에서 만날 수 있어요. 주 서식지에서는 더 자주 발견돼요.</DialogDescription>
   </DialogHeader>
   {open && <CollectionBook key={session?.user.id} onAddTemporary={onAddTemporary}/>}
  </DialogContent>
 </Dialog>
}

export function CollectionBook({ onAddTemporary,previewAll=false }: CollectionDialogProps & {previewAll?:boolean}) {
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
  (habitat === 'all' || (s.is_native && s.native_region_id === habitat))
 ).sort((a, b) => a.sell_price - b.sell_price || a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id)) ?? []
 return <section className="flex min-h-0 flex-1 flex-col">
  <div className="shrink-0 space-y-3 border-b border-border/50 bg-popover px-4 py-3 sm:px-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <TooltipProvider><div role="group" aria-label="도감 분류" className="flex gap-1">
     {(['all', 'fish', 'trash', 'decoration'] as const).map(value => {
      const label = value === 'all' ? '전체' : kindLabels[value]
      return <Tooltip key={value}><TooltipTrigger render={<Button type="button" size="icon" variant={tab === value ? 'secondary' : 'ghost'} aria-label={label} data-selection-icons aria-pressed={tab === value} className="size-10 rounded-xl" onClick={() => setTab(value)}/> }>
       {value === 'all' ? <LayoutGrid className="size-[18px]"/> : <CollectibleKindIcon kind={value} className="size-7"/>}
      </TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
     })}
    </div></TooltipProvider>
    <span className="text-[11px] tabular-nums text-muted-foreground">{previewAll?(state?`전체 ${entries.length}종`:'전체 —종'):state ? `발견 ${entries.filter(s=>s.discovered).length}/${entries.length}` : '발견 —/—'}</span>
   </div>
   <div className="flex gap-2">
    <BookSelect region label="도감 주 서식지" value={habitat} onChange={setHabitat} items={[{value:'all',label:'전체 주 서식지'},...habitats.map(region=>({value:region.id,label:region.name}))]}/>
    <RaritySelect value={rarity} onChange={setRarity}/>
   </div>
  </div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
   {error && <div role="alert" className="space-y-2 py-8 text-center text-sm"><p>{error}</p><Button variant="outline" onClick={() => setAttempt(v => v + 1)}>다시 불러오기</Button></div>}
   {!state && !error && <div role="status" aria-label="도감을 펼치는 중"><span className="sr-only">도감을 펼치는 중…</span><div aria-hidden="true" className="grid grid-cols-3 border-t border-border sm:grid-cols-4">{Array.from({length:12},(_,i)=><div key={i} className="flex flex-col items-center border-r border-b border-border bg-card px-1 pb-2 pt-3 motion-safe:animate-pulse"><div className="aspect-square w-full max-w-24 rounded-lg bg-secondary/60"/><div className="mt-2 flex h-10 w-full items-start justify-center pt-1"><div className="h-3 w-3/4 rounded bg-secondary/60"/></div></div>)}</div></div>}
   {state && entries.length === 0 && <EmptyState className="py-12">조건에 맞는 개체가 없어요.</EmptyState>}
   <ul aria-label="도감 개체" className="grid grid-cols-3 border-t border-border sm:grid-cols-4">
    {entries.map(s => <li key={s.id}>
     <article aria-label={s.name} className="collection-card relative h-full border-r border-b bg-background/80">
      <button type="button" aria-label={s.name+(s.discovered||previewAll?' 상세 보기':' 미발견')} onClick={()=>setDetail(s)} className="flex h-full w-full cursor-pointer flex-col items-center pb-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
       <div className={`relative flex w-full items-center justify-center bg-gradient-to-b px-1 pt-3 pb-2 ${collectibleCardTones[s.rarity]}`}><CollectibleThumbnail loading="lazy" fadeIn path={s.thumbnail_path} name={s.name} className={"aspect-square w-full max-w-24 "+(!s.discovered&&!previewAll?"opacity-80 [&_img]:brightness-[.25]":"")}/></div>
       {s.is_native&&s.native_region_id&&regionIcons[s.native_region_id]&&<span aria-label={regionIcons[s.native_region_id].name+' 주 서식지'} title={regionIcons[s.native_region_id].name+' 주 서식지'} className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full border border-border/60 bg-background/95 p-1 shadow-sm"><img src={regionIcons[s.native_region_id].src} alt="" className="size-5 object-contain"/></span>}
       <h3 title={s.name} className="mt-2 h-5 w-full truncate px-1 text-xs font-medium leading-5">{s.name}</h3>

      </button>
      {onAddTemporary&&<TooltipProvider><Tooltip><TooltipTrigger render={<Button type="button" size="icon" variant="secondary" aria-label={s.name+' 임시 넣기'} className="absolute left-0.5 top-0.5 z-10 size-9 rounded-lg border border-border bg-background/95 shadow-sm" onClick={()=>onAddTemporary(s)}/> }><Plus className="size-4"/></TooltipTrigger><TooltipContent>어항에 임시 넣기</TooltipContent></Tooltip></TooltipProvider>}
     </article>
    </li>)}
   </ul>
  </div>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="top-auto bottom-0 max-h-[85dvh] max-w-full translate-y-0 overflow-y-auto rounded-b-none rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:max-w-sm sm:-translate-y-1/2 sm:rounded-xl">
   <DialogHeader className="pr-7"><DialogTitle className="flex items-center gap-2">{detail&&<CollectibleKindIcon kind={detail.kind} className="size-6 shrink-0 text-primary"/>}{detail?.name}</DialogTitle><DialogDescription>{detail&&<RarityBadge rarity={detail.rarity}/>} · {detail&&kindLabels[detail.kind]}</DialogDescription></DialogHeader>
   {detail&&<><div className="flex justify-center rounded-xl bg-secondary/40 p-4"><div className={detail.discovered||previewAll?"w-full min-w-0 flex justify-center":"w-full min-w-0 flex justify-center [&_canvas]:brightness-[.25] [&_img]:brightness-0"}><CollectiblePreview species={detail} large/></div></div><p className="text-sm leading-6 text-muted-foreground">{detail.description}</p><PrimaryHabitat species={detail}/><div className="flex items-center justify-between text-sm"><span>가치</span><span className="flex items-center gap-1"><GoldIcon className="size-4"/>{detail.sell_price.toLocaleString()}</span></div></>}
  </DialogContent></Dialog>
 </section>
}
