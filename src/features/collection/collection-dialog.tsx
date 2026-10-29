import {fishingDockButton,fishingToolButton} from '@/components/fishing-dock-style'
import {EmptyState} from '@/components/empty-state'
import {appArt} from '@/components/app-art'
import { RarityBadge } from '@/components/rarity-badge'
import { RaritySelect } from '@/components/rarity-select'
import { loadMapShop } from '@/features/regions/map-shop-api'
import {CollectiblePreview} from './collectible-preview'
import { regionIcons } from '@/features/regions/region-icons'
import { Select } from '@base-ui/react/select'
import { Fragment,useEffect, useState } from 'react'
import {LayoutGrid,Plus,Check,ChevronDown} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { GoldIcon } from '@/features/gold/gold-provider'
import { AquariumToolButton } from '@/features/aquarium/aquarium-tool-button'
import { CollectibleThumbnail } from './collectible-thumbnail'
import { CollectibleKindIcon } from './collectible-kind-icon'
import { PrimaryHabitat } from './native-region-badge'
import {TreasureTrashBadge} from './treasure-trash-badge'
import {collectibleCardTones} from './collectible-card-tones'
import {RelicEffectText} from '@/features/relics/relic-equipment-slot'
import { kindLabels, loadCollection } from './api'
import type { CollectionState, CatalogEntry, Species } from './api'
import {useCollectionFilters} from './use-collection-filters'
import { HabitatFilterIcon } from '@/components/habitat-filter-icon'
import { HalloweenIcon } from '@/components/collection-filter-icons'
import { limitedCollectionEvents } from './limited-events'
import {IslandSelect} from '@/components/island-select'
import {useAccountResource} from '@/lib/account-query'
import {readRelics,relicQuantity,type RelicState} from '@/features/relics/api'

const {collection:BookOpenText}=appArt

function entryName(entry:CatalogEntry){
 return entry.kind==='map'&&entry.pieceNumber?`${entry.pieceNumber}번째 지도`:entry.name
}
function mapRegionName(entry:CatalogEntry){
 return entry.kind==='map'?entry.habitats.find(region=>region.id===entry.mapRegionId)?.name:undefined
}
function entryLabel(entry:CatalogEntry){
 const region=mapRegionName(entry)
 return region?`${region} ${entryName(entry)}`:entryName(entry)
}


type CollectionDialogProps = { onAddTemporary?: (species: Species) => void; fishing?:boolean;disabled?:boolean;dock?:boolean;iconOnly?:boolean;items?:boolean }
function BookSelect({ label, value, onChange, items, region = false }: {label:string;value:string;onChange:(value:string)=>void;items:{value:string;label:string}[];region?:boolean}) {
 return <Select.Root value={value} onValueChange={value=>{if(value!==null)onChange(value)}} items={items}><Select.Trigger aria-label={label} className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-border bg-secondary/60 px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><Select.Value className="min-w-0 truncate">{region?<span className="flex min-w-0 items-center gap-2"><HabitatFilterIcon value={value}/><span className="truncate">{items.find(item=>item.value===value)?.label}</span></span>:undefined}</Select.Value><Select.Icon><ChevronDown className="size-4 text-primary"/></Select.Icon></Select.Trigger><Select.Portal><Select.Positioner sideOffset={5} className="z-[70]"><Select.Popup className="max-h-72 min-w-40 overflow-y-auto rounded-xl border border-border bg-popover p-1 text-foreground shadow-lg outline-none"><Select.List>{items.map(item=><Select.Item key={item.value} value={item.value} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm outline-none data-highlighted:bg-secondary data-selected:bg-secondary/60 data-selected:text-primary"><Select.ItemText className="flex items-center gap-2">{region&&<HabitatFilterIcon value={item.value}/>}{item.label}</Select.ItemText><Select.ItemIndicator><Check className="size-4"/></Select.ItemIndicator></Select.Item>)}</Select.List></Select.Popup></Select.Positioner></Select.Portal></Select.Root>
}

export function CollectionDialog({ onAddTemporary,fishing=false,disabled=false,dock=false,iconOnly=false,items=false }: CollectionDialogProps) {
 const { session } = useAuth()
 const [open, setOpen] = useState(false)
 const label=items?'아이템 도감':'개체 도감'
 const Icon=items?appArt.map:BookOpenText
 return <Dialog open={open} onOpenChange={setOpen}>
  {fishing?<TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" disabled={disabled} aria-label={label} className={iconOnly?fishingToolButton:dock?fishingDockButton:"size-11 rounded-full border border-white/20 bg-slate-950/20 text-white backdrop-blur-sm hover:bg-slate-950/35 hover:text-white"}/>}/> }><Icon className={iconOnly?"size-6":"size-8"}/>{dock&&!iconOnly&&<span className="text-[11px]">도감</span>}</TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip></TooltipProvider>:<AquariumToolButton label={label} icon={<Icon className="size-8"/>}/>}
  <DialogContent className="aquarium-work-panel aquarium-catalog-panel flex h-[min(760px,85dvh)] max-h-[85dvh] w-[calc(100%-2rem)] min-w-0 max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
   <DialogHeader className="shrink-0 border-b border-border/50 px-4 pb-3 pt-4 pr-12">
    <DialogTitle className="flex items-center gap-2 text-lg"><Icon aria-hidden="true" className="size-5 text-primary"/>{label}</DialogTitle>
    <DialogDescription className="text-xs">{items?'지도 조각과 유물의 수집 기록을 확인해요.':'모든 해역에서 만날 수 있어요. 주 서식지에서는 더 자주 발견돼요.'}</DialogDescription>
   </DialogHeader>
   {open && <CollectionBook mode={items?'items':'creatures'} key={session?.user.id} onAddTemporary={onAddTemporary} rememberFiltersFor={fishing&&!items?(session?.user.id??'guest'):undefined}/>}
  </DialogContent>
 </Dialog>
}

export function CollectionBook({ onAddTemporary,previewAll=false,initialRegion='all',rememberFiltersFor,mode='creatures',initialTab }: CollectionDialogProps & {previewAll?:boolean;initialRegion?:string;rememberFiltersFor?:string;mode?:'creatures'|'items';initialTab?:'map'|'relic'}) {
 const [state, setState] = useState<CollectionState | null>(null)
 const [error, setError] = useState('')
 const [filters,setFilters]=useCollectionFilters(rememberFiltersFor,initialRegion,initialTab)
 const {rarity,habitat}=filters
 const tab=mode==='items'?(filters.tab==='relic'?'relic':'map'):(filters.tab==='map'||filters.tab==='relic'?'all':filters.tab)
 const isMapBook=mode==='items'&&tab==='map'
 const [relicStatus,setRelicStatus]=useState<'all'|'discovered'|'undiscovered'>('all')
 const status=isMapBook?'all':tab==='relic'?relicStatus:filters.status
 const [effect,setEffect]=useState('all')
 const [limited,setLimited] = useState('all')
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
 const catalog=(state?.catalog??[]).filter(entry=>mode==='items'?(entry.kind==='map'||entry.kind==='relic'):(entry.kind!=='map'&&entry.kind!=='relic'))
 const relics=useAccountResource<RelicState>('relics',readRelics,{enabled:mode==='items'&&tab==='relic'})
 const effectCategory=(kind:string)=>kind.startsWith('harbor_')||kind.startsWith('boat_')?'voyage':kind.includes('active_slots')||kind==='production_auto_claim'||kind==='personal_bait_hours'?'production':kind.startsWith('pongi_')?'arcade':'fishing'
 const matchesStatus=(entry:CatalogEntry)=>status==='all'||(status==='discovered'?entry.discovered:!entry.discovered)
 const habitats = Array.from(new Map(catalog.flatMap(s => s.habitats).map(region => [region.id, region])).values()).sort((a, b) => (a.id==='pongdang'?-1:mapPrices[a.id]??(['coral','bluegrove','mistmoon'].includes(a.id)?['coral','bluegrove','mistmoon'].indexOf(a.id):Infinity))-(b.id==='pongdang'?-1:mapPrices[b.id]??(['coral','bluegrove','mistmoon'].includes(b.id)?['coral','bluegrove','mistmoon'].indexOf(b.id):Infinity)) || a.name.localeCompare(b.name,'ko'))
 const filteredEntries = catalog.filter(s =>
  (tab === 'all' || s.kind === tab) && (isMapBook || rarity === 'all' || s.rarity === rarity) &&
  (isMapBook||tab==='relic'||habitat === 'all' || (mode==='items'?s.mapRegionId===habitat:s.is_native && s.native_region_id===habitat)||mode==='creatures'&&habitat==='common'&&s.native_region_id==null) &&
  (limited === 'all' || limitedCollectionEvents.some(event=>event.value===limited&&(event.speciesIds.includes(s.id)||s.id.startsWith(event.speciesPrefix)))) &&
  (s.kind!=='relic'||effect==='all'||relics.data?.relics.some(relic=>relic.id===(s.relicId??s.id.replace(/^relic-/,''))&&effectCategory(relic.effect_kind)===effect))
 ).sort((a, b) => a.kind==='map'&&b.kind==='map'
  ? a.mapRegionId===b.mapRegionId?(a.pieceNumber??0)-(b.pieceNumber??0):catalog.indexOf(a)-catalog.indexOf(b)
  : a.kind==='map'?-1:b.kind==='map'?1:a.sell_price - b.sell_price || a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id)) ?? []
 const entries=filteredEntries.filter(matchesStatus)
 const progress=<span className="ml-auto text-right text-[11px] tabular-nums text-muted-foreground">{previewAll?(state?`전체 ${filteredEntries.length}종`:'전체 —종'):state?`발견 ${filteredEntries.filter(entry=>entry.discovered).length}/${filteredEntries.length}`:'발견 —/—'}</span>
 return <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
  {mode==='items'&&<div role="group" aria-label="아이템 도감 분류" className="grid shrink-0 grid-cols-2 border-b border-border/60">{(['map','relic'] as const).map(value=><Button key={value} variant="ghost" aria-pressed={tab===value} onClick={()=>setFilters(previous=>({...previous,tab:value,rarity:'all',habitat:'all'}))} className={`min-h-14 gap-2 rounded-none border-r border-border/60 last:border-r-0 ${tab===value?'bg-secondary text-primary':'text-muted-foreground'}`}><CollectibleKindIcon kind={value}/>{kindLabels[value]}</Button>)}</div>}
  <div className="shrink-0 space-y-3 border-b border-border/50 bg-popover px-4 py-3 sm:px-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    {mode==='creatures'&&<TooltipProvider><div role="group" aria-label="도감 분류" className="grid w-full grid-cols-4 gap-1">
     {(['all', 'fish', 'trash', 'decoration'] as const).map(value => {
      const label = value === 'all' ? '전체' : value==='decoration'?'장식품':kindLabels[value]
      return <Tooltip key={value}><TooltipTrigger render={<Button type="button" variant={tab === value ? 'secondary' : 'ghost'} aria-label={label} data-selection-icons aria-pressed={tab === value} className="min-h-12 min-w-0 gap-1 rounded-xl px-1 text-[11px]" onClick={() => setFilters(previous=>({...previous,tab:value}))}/> }>
       {value === 'all' ? <LayoutGrid className="size-[18px]"/> : <CollectibleKindIcon kind={value} className="size-7"/>}
      <span>{label}</span></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
     })}
     </div></TooltipProvider>}

    {mode==='items'&&progress}
   </div>
   {!isMapBook&&<div className="grid grid-cols-2 gap-2">
    {tab!=='relic'&&<BookSelect region label={mode==='items'?'지도 해역':'도감 서식지'} value={habitat} onChange={habitat=>setFilters(previous=>({...previous,habitat}))} items={[{value:'all',label:mode==='items'?'전체 해역':'전체 서식지'},...(mode==='creatures'?[{value:'common',label:'공통 개체'}]:[]),...habitats.map(region=>({value:region.id,label:region.name}))]}/>}
    {(mode==='creatures'||tab==='relic')&&<RaritySelect className="w-full" value={rarity} onChange={rarity=>setFilters(previous=>({...previous,rarity}))}/>}
    {tab==='relic'&&<IslandSelect label="유물 효과" value={effect} onChange={setEffect} options={[{value:'all',label:'전체 효과'},{value:'fishing',label:'낚시'},{value:'voyage',label:'항해'},{value:'production',label:'생산'},{value:'arcade',label:'미니게임'}]}/>}
   </div>}
   {mode==='creatures'&&<div className="grid grid-cols-2 gap-2"><IslandSelect label="한정 이벤트 선택" value={limited} onChange={setLimited} options={[{value:'all',label:'전체 이벤트'},...limitedCollectionEvents.map(event=>({value:event.value,label:event.label,icon:<HalloweenIcon className="size-5 shrink-0"/>}))]}/><IslandSelect label="도감 발견 상태" value={filters.status} onChange={status=>setFilters(previous=>({...previous,status}))} options={[{value:'all',label:'전체'},{value:'discovered',label:'발견'},{value:'undiscovered',label:'미발견'}]}/></div>}
   {mode==='creatures'&&<div className="flex justify-end">{progress}</div>}
   {tab==='relic'&&<div role="group" aria-label={tab==='relic'?'유물 발견 상태':'도감 발견 상태'} className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/40 p-1">{([{value:'all',label:'전체'},{value:'discovered',label:'발견'},{value:'undiscovered',label:'미발견'}] as const).map(option=><button key={option.value} type="button" aria-pressed={status===option.value} onClick={()=>tab==='relic'?setRelicStatus(option.value):setFilters(previous=>({...previous,status:option.value}))} className={`min-h-11 rounded-lg px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring ${status===option.value?'bg-background text-primary':'text-muted-foreground hover:bg-background/50'}`}>{option.label}</button>)}</div>}
  </div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
   {error && <div role="alert" className="space-y-2 py-8 text-center text-sm"><p>{error}</p><Button variant="outline" onClick={() => setAttempt(v => v + 1)}>다시 불러오기</Button></div>}
   {!state && !error && <div role="status" aria-label="도감을 펼치는 중"><span className="sr-only">도감을 펼치는 중…</span><div aria-hidden="true" className="grid grid-cols-3 border-t border-border sm:grid-cols-4">{Array.from({length:12},(_,i)=><div key={i} className="flex flex-col items-center border-r border-b border-border bg-card px-1 pb-2 pt-3 motion-safe:animate-pulse"><div className="aspect-square w-full max-w-24 rounded-lg bg-secondary/60"/><div className="mt-2 flex h-10 w-full items-start justify-center pt-1"><div className="h-3 w-3/4 rounded bg-secondary/60"/></div></div>)}</div></div>}
   {state && entries.length === 0 && <EmptyState className="py-12">조건에 맞는 개체가 없어요.</EmptyState>}
   <ul aria-label="도감 개체" className="grid grid-cols-3 border-t border-border sm:grid-cols-4">
    {entries.map((s,index) => <Fragment key={s.id}>
     {s.kind==='map'&&(index===0||entries[index-1].mapRegionId!==s.mapRegionId)&&<li className="col-span-full flex items-center justify-between gap-2 border-b border-border/60 bg-secondary/20 px-4 py-3 text-xs"><span className="flex min-w-0 items-center gap-2"><HabitatFilterIcon value={s.mapRegionId??s.habitats[0]?.id??'all'}/><span className="truncate">{mapRegionName(s)??s.habitats[0]?.name??'지도 조각'}</span></span><span className="text-[11px] text-muted-foreground">수집 {catalog.filter(entry=>entry.kind==='map'&&entry.mapRegionId===s.mapRegionId&&entry.discovered).length} / {catalog.filter(entry=>entry.kind==='map'&&entry.mapRegionId===s.mapRegionId).length}조각{catalog.filter(entry=>entry.kind==='map'&&entry.mapRegionId===s.mapRegionId).every(entry=>entry.discovered)?' · 지도 완성':''}</span></li>}
     <li>
     <article aria-label={entryLabel(s)} className="collection-card relative h-full border-r border-b bg-background/80">
      <button type="button" aria-label={entryLabel(s)+(s.discovered||previewAll&&s.kind!=='map'?' 상세 보기':s.kind==='map'?' 미획득':' 미발견')} onClick={()=>setDetail(s)} className="flex h-full w-full cursor-pointer flex-col items-center pb-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
       <div className={`relative flex w-full items-center justify-center bg-gradient-to-b px-1 pt-3 pb-2 ${collectibleCardTones[s.rarity]}`}><CollectibleThumbnail loading="lazy" fadeIn path={s.thumbnail_path} name={entryLabel(s)} className={"aspect-square w-full max-w-24 "+(!s.discovered&&(!previewAll||s.kind==='map')?(s.kind==='map'?"grayscale opacity-70":"[&_img]:grayscale [&_img]:brightness-[.08]"):"")}/></div>
       <span className={`pointer-events-none absolute left-2 ${onAddTemporary?'top-12':'top-2'}`}><TreasureTrashBadge speciesId={s.id}/></span>
       {s.id.startsWith('halloween-')?<span aria-label="할로윈 한정 개체" title="할로윈 한정 개체" className="pointer-events-none absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full border border-border/60 bg-background/95 p-1 shadow-sm"><HalloweenIcon className="size-5 shrink-0"/></span>:s.is_native&&s.native_region_id&&regionIcons[s.native_region_id]&&<span aria-label={regionIcons[s.native_region_id].name+' 주 서식지'} title={regionIcons[s.native_region_id].name+' 주 서식지'} className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full border border-border/60 bg-background/95 p-1 shadow-sm"><img src={regionIcons[s.native_region_id].src} alt="" className="size-5 object-contain"/></span>}
       <h3 title={s.name} className="mt-2 h-5 w-full truncate px-1 text-xs font-medium leading-5">{entryName(s)}</h3>
       {mapRegionName(s)&&<span className="w-full truncate px-1 text-[10px] text-muted-foreground">{mapRegionName(s)}</span>}
       {s.kind==='map'||s.kind==='relic'?<span className="mt-0.5 text-[11px] text-muted-foreground">{s.kind==='map'?(s.discovered?'획득 완료':'미획득'):(s.discovered?'발견 완료':'미발견')}</span>:<span aria-label={`가치 ${s.sell_price.toLocaleString('ko-KR')} 골드`} className="mt-0.5 inline-flex items-center justify-center gap-1 text-[11px] tabular-nums text-primary"><GoldIcon className="size-3.5"/>{s.sell_price.toLocaleString('ko-KR')}</span>}
       {s.kind==='relic'&&relics.data&&<span className="mt-0.5 text-[10px] tabular-nums text-primary">보유 {relicQuantity(relics.data.relics.find(r=>r.id===(s.relicId??s.id.replace(/^relic-/,''))))}개</span>}
       {s.kind==='relic'&&<span className="mt-1 h-10 w-full px-2 text-[10px] leading-5 text-muted-foreground line-clamp-2"><RelicEffectText description={s.description}/></span>}
      </button>
      {onAddTemporary&&s.kind!=='map'&&s.kind!=='relic'&&<TooltipProvider><Tooltip><TooltipTrigger render={<Button type="button" size="icon" variant="secondary" aria-label={s.name+' 임시 넣기'} className="absolute left-0.5 top-0.5 z-10 size-9 rounded-lg border border-border bg-background/95 shadow-sm" onClick={()=>onAddTemporary(s)}/> }><Plus className="size-4"/></TooltipTrigger><TooltipContent>어항에 임시 넣기</TooltipContent></Tooltip></TooltipProvider>}
     </article>
    </li></Fragment>)}
   </ul>
  </div>
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="aquarium-work-panel aquarium-detail-panel max-h-[85dvh] w-[calc(100%-2rem)] min-w-0 max-w-md overflow-y-auto rounded-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-md">
   <DialogHeader className="pr-7"><DialogTitle className="flex items-center gap-2">{detail&&<CollectibleKindIcon kind={detail.kind} className="size-6 shrink-0 text-primary"/>}{detail&&entryLabel(detail)}</DialogTitle><DialogDescription>{detail&&<RarityBadge rarity={detail.rarity} filled/>} · {detail&&kindLabels[detail.kind]}</DialogDescription></DialogHeader>
   {detail&&<>
    <div className={`flex justify-center rounded-xl bg-gradient-to-b p-4 ${collectibleCardTones[detail.rarity]}`}>
     <div className={"w-full min-w-0 flex justify-center "+(!detail.discovered&&(!previewAll||detail.kind==='map')?(detail.kind==='map'?"grayscale opacity-70":"[&_canvas]:grayscale [&_canvas]:brightness-[.08] [&_img]:grayscale [&_img]:brightness-[.08]"):"")}><CollectiblePreview species={detail} large/></div>
    </div>
    <p className="text-sm leading-6 text-muted-foreground">{detail.kind==='relic'?<RelicEffectText description={detail.description}/>:detail.description}</p>
    {detail.kind!=='map'&&detail.kind!=='relic'&&<PrimaryHabitat species={detail}/>}
    {detail.kind!=='relic'&&<div className="flex items-center justify-between text-sm">{detail.kind==='map'?<span className="text-xs text-muted-foreground">최초 1회 발견 · 어항 배치·판매·선물·거래 불가</span>:<><span>가치</span><span className="flex items-center gap-1"><GoldIcon className="size-4"/>{detail.sell_price.toLocaleString()}</span></>}</div>}
   </>}
  </DialogContent></Dialog>
 </section>
}
