import {useState,type RefObject} from 'react'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {Button} from '@/components/ui/button'
import {RarityBadge} from '@/components/rarity-badge'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {RelicEffectText} from './relic-equipment-slot'
import {RelicGold} from './relic-gold'
import type {Relic,RelicState} from './api'

const filters=[{value:'all',label:'전체'},{value:'owned',label:'보유'},{value:'missing',label:'미보유'}] as const
export function RelicCatalogTabs({state,disabled,listRef,onEquip,onSell}:{state:RelicState;disabled:boolean;listRef:RefObject<HTMLDivElement|null>;onEquip:(relic:Relic)=>void;onSell:(relic:Relic)=>void}){
 const [tab,setTab]=useState('all')
 const items=(filter:string)=>state.relics.filter(r=>filter==='all'||(filter==='owned'?r.owned:!r.owned))
 return <Tabs value={tab} onValueChange={value=>setTab(String(value))} className="flex min-h-0 flex-1 flex-col gap-2">
  <TabsList aria-label="유물 목록" className="shrink-0">{filters.map(f=><TabsTrigger key={f.value} value={f.value} aria-label={`${f.label} ${items(f.value).length}`} className="gap-1 px-2 text-xs">{f.label}<span className="text-[10px] tabular-nums opacity-60">{items(f.value).length}</span></TabsTrigger>)}</TabsList>
  {filters.map(f=><TabsContent key={f.value} value={f.value} aria-label={`${f.label} 유물`} ref={tab===f.value?listRef:undefined} className="mt-0 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
   {items(f.value).length===0&&<p className="rounded-xl border border-dashed p-6 text-center text-xs leading-6 text-muted-foreground">{f.value==='owned'?'아직 보유한 유물이 없어요. 전체 탭에서 유물을 살펴보세요.':'모든 유물을 보유하고 있어요.'}</p>}
   {items(f.value).map(r=><article key={r.id} aria-label={r.name} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${state.equippedId===r.id?'border-primary/30 bg-primary/5':'bg-card/40'}`}>
    <CollectibleThumbnail path={r.thumbnail_path} name={r.name} className={`size-16 ${r.owned?'':'grayscale opacity-50'}`}/>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><h3 className="text-sm font-medium">{r.name}</h3><RarityBadge rarity={r.rarity}/></div><p className="mt-1 text-xs leading-5 text-muted-foreground"><RelicEffectText description={r.description}/></p></div>
    <div className="flex shrink-0 flex-col items-center gap-1.5"><Button size="sm" variant={state.equippedId===r.id?'secondary':'outline'} disabled={disabled||!r.owned||state.equippedId===r.id} onClick={()=>onEquip(r)}>{state.equippedId===r.id?'장착 중':r.owned?(state.equippedId?'교체':'장착'):r.discovered?'미보유':'미발견'}</Button>
     {r.owned&&state.equippedId!==r.id&&<span className="text-[10px] text-muted-foreground">{state.equippedId?<RelicGold amount={state.unequipFee??state.changeFee}/>: '무료'}</span>}
     {r.owned&&r.sell_price>0&&<Button size="sm" variant="ghost" disabled={disabled||state.equippedId===r.id} title={state.equippedId===r.id?'해제 후 판매할 수 있어요':undefined} onClick={()=>onSell(r)}>판매 <RelicGold amount={r.sell_price}/></Button>}
    </div>
   </article>)}
  </TabsContent>)}
 </Tabs>
}
