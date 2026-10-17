import { useEffect, useState } from 'react'
import { BookOpenText, LayoutGrid, Plus, Search, X } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { GoldIcon } from '@/features/gold/gold-provider'
import { AquariumToolButton } from '@/features/aquarium/aquarium-tool-button'
import { CollectibleThumbnail } from './collectible-thumbnail'
import { CollectibleKindIcon } from './collectible-kind-icon'
import { HabitatIcons, HabitatFilters } from './habitat-icons'
import { kindLabels, loadCollection } from './api'
import type { CollectibleKind, CollectionState, Species } from './api'

type CollectionDialogProps = { onAddTemporary?: (species: Species) => void; fishing?:boolean;disabled?:boolean }
type OriginFilter = 'all' | 'native' | 'shared'
const selectClass = 'min-h-10 min-w-0 flex-1 rounded-xl border border-border/60 bg-background px-2.5 text-xs text-foreground'

export function CollectionDialog({ onAddTemporary,fishing=false,disabled=false }: CollectionDialogProps) {
 const { session } = useAuth()
 const [open, setOpen] = useState(false)
 return <Dialog open={open} onOpenChange={setOpen}>
  {fishing?<TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" disabled={disabled} aria-label="바다 도감" className="size-11 rounded-full border border-white/20 bg-slate-950/20 text-white backdrop-blur-sm hover:bg-slate-950/35 hover:text-white"/>}/> }><BookOpenText className="size-5"/></TooltipTrigger><TooltipContent>바다 도감</TooltipContent></Tooltip></TooltipProvider>:<AquariumToolButton label="바다 도감" icon={<BookOpenText className="size-[18px]" strokeWidth={1.7}/>}/>}
  <DialogContent className="flex h-[88dvh] max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
   <DialogHeader className="shrink-0 border-b border-border/50 px-5 pb-4 pt-5 pr-12">
    <DialogTitle className="flex items-center gap-2 text-lg"><span aria-hidden="true">📖</span>바다 도감</DialogTitle>
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
 const [query, setQuery] = useState('')
 const [origin, setOrigin] = useState<OriginFilter>('all')
 const [selectedHabitats, setSelectedHabitats] = useState<string[]>([])
 const [attempt, setAttempt] = useState(0)
 useEffect(() => {
  let active = true
  loadCollection().then(data => { if (active) { setState(data); setError('') } })
   .catch(() => { if (active) setError('도감을 불러오지 못했어요. 잠시 후 다시 시도해주세요.') })
  return () => { active = false }
 }, [attempt])
 const catalog=state?.catalog.filter(s=>s.kind!=='map')??[]
 const habitats = Array.from(new Map(catalog.flatMap(s => s.habitats).map(region => [region.id, region])).values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
 const entries = catalog.filter(s =>
  (s.name.normalize('NFKC').toLocaleLowerCase('ko').includes(query.trim().normalize('NFKC').toLocaleLowerCase('ko'))) &&
  (tab === 'all' || s.kind === tab) && (rarity === 'all' || s.rarity === rarity) &&
  (origin === 'all' || (s.kind !== 'map' && (origin === 'native' ? s.habitats.length === 1 : s.habitats.length > 1))) &&
  (!selectedHabitats.length || s.habitats.some(region => selectedHabitats.includes(region.id)))
 ).sort((a, b) => a.sell_price - b.sell_price || a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id)) ?? []
 return <section className="flex min-h-0 flex-1 flex-col">
  <div className="shrink-0 space-y-3 border-b border-border/50 bg-popover px-4 py-3 sm:px-5">
   <div className="relative">
    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
    <Input type="search" aria-label="도감 개체 검색" placeholder="이름으로 검색" value={query} onChange={event=>setQuery(event.target.value)} className="h-10 rounded-xl pl-9 pr-10 [&::-webkit-search-cancel-button]:appearance-none"/>
    {query&&<Button type="button" variant="ghost" size="icon" aria-label="검색어 지우기" className="absolute right-1 top-1 size-8 rounded-lg" onClick={()=>setQuery('')}><X className="size-3.5"/></Button>}
   </div>
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
    <select aria-label="도감 등급" value={rarity} onChange={event => setRarity(event.target.value as 'all' | Rarity)} className={selectClass}>
     <option value="all">전체 등급</option>{(Object.keys(rarities) as Rarity[]).map(value => <option key={value} value={value}>{rarities[value].label}</option>)}
    </select>
    <select aria-label="도감 토착 여부" value={origin} onChange={event => setOrigin(event.target.value as OriginFilter)} className={selectClass}>
     <option value="all">모든 서식 유형</option><option value="native">토착 개체 · 한 지역</option><option value="shared">공통 개체 · 여러 지역</option>
    </select>
   </div>
   <HabitatFilters habitats={habitats} selected={selectedHabitats} onToggle={id => setSelectedHabitats(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])}/>
  </div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
   {error && <div role="alert" className="space-y-2 py-8 text-center text-sm"><p>{error}</p><Button variant="outline" onClick={() => setAttempt(v => v + 1)}>다시 불러오기</Button></div>}
   {!state && !error && <p role="status" className="py-12 text-center text-sm text-muted-foreground">도감을 펼치는 중…</p>}
   {state && entries.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">조건에 맞는 개체가 없어요.</p>}
   <ul aria-label="도감 개체" className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
    {entries.map(s => <li key={s.id}>
     <article aria-label={s.name} className={`collection-card relative flex h-full flex-col rounded-2xl border p-3.5 ${s.rarity ? rarities[s.rarity].className : 'rarity-common'}`}>
      <span className="sr-only">{s.rarity ? rarities[s.rarity].label : kindLabels[s.kind]}</span>
      <div className="flex min-h-28 items-center justify-center"><CollectibleThumbnail path={s.thumbnail_path} name={s.name} className="size-28"/></div>
      <h3 className="mt-2 text-sm font-semibold tracking-tight">{s.name}</h3>
      <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">{s.description}</p>
      <dl className="mt-auto space-y-2 border-t border-current/10 pt-3 text-[11px]">
       <div className="flex items-start gap-1.5"><dt className="shrink-0 pt-1 text-muted-foreground">서식지:</dt><dd><HabitatIcons habitats={s.habitats}/></dd></div>
       <div className="flex items-center gap-1.5"><dt className="text-muted-foreground">가치:</dt><dd className="flex items-center gap-1 font-medium tabular-nums"><GoldIcon className="size-3.5"/>{s.sell_price.toLocaleString()}</dd></div>
      </dl>
      {onAddTemporary && s.kind !== 'map' && <TooltipProvider><Tooltip><TooltipTrigger render={<Button size="icon" variant="ghost" className="absolute right-1.5 top-1.5 size-9 rounded-full" aria-label={`${s.name} 임시 넣기`} onClick={() => onAddTemporary(s)}/> }><Plus className="size-4"/></TooltipTrigger><TooltipContent>어항에 임시 넣기 · 새로고침하면 사라져요</TooltipContent></Tooltip></TooltipProvider>}
     </article>
    </li>)}
   </ul>
  </div>
 </section>
}
