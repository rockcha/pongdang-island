import {useState,type RefObject} from 'react'
import {Menu} from '@base-ui/react/menu'
import {Ellipsis} from 'lucide-react'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {Button} from '@/components/ui/button'
import {RarityBadge} from '@/components/rarity-badge'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {RelicEffectText} from './relic-equipment-slot'
import {RelicGold} from './relic-gold'
import type {Relic,RelicState} from './api'

const filters=[{value:'owned',label:'보유'},{value:'all',label:'전체'}] as const

function RelicMenu({relic,equipped,disabled,onSell,onShare}:{relic:Relic;equipped:boolean;disabled:boolean;onSell:()=>void;onShare?:()=>void}){
 return <Menu.Root>
  <Menu.Trigger disabled={disabled} render={<Button variant="ghost" size="icon" aria-label={`${relic.name} 더보기`} className="size-9 shrink-0 text-muted-foreground/65"/>}><Ellipsis className="size-4"/></Menu.Trigger>
  <Menu.Portal><Menu.Positioner align="end" sideOffset={4} collisionPadding={12} className="z-[65]"><Menu.Popup className="min-w-40 rounded-xl border border-border/60 bg-popover p-1.5 text-xs shadow-lg outline-none">
   {relic.rarity==='mythic'&&onShare&&<Menu.Item onClick={onShare} className="flex min-h-10 cursor-pointer items-center rounded-lg px-3 outline-none data-highlighted:bg-secondary">자랑하기</Menu.Item>}
   <Menu.Item aria-label={`판매 ${relic.sell_price.toLocaleString('ko-KR')} 골드`} disabled={equipped} onClick={onSell} className="flex min-h-10 cursor-pointer items-center justify-between gap-5 rounded-lg px-3 outline-none data-highlighted:bg-secondary data-disabled:cursor-default data-disabled:opacity-40"><span>판매</span><RelicGold amount={relic.sell_price}/></Menu.Item>
   {equipped&&<p className="px-3 pb-2 pt-1 text-[10px] text-muted-foreground">해제 후 판매할 수 있어요</p>}
  </Menu.Popup></Menu.Positioner></Menu.Portal>
 </Menu.Root>
}

export function RelicCatalogTabs({state,disabled,listRef,onEquip,onSell,onShare}:{state:RelicState;disabled:boolean;listRef:RefObject<HTMLDivElement|null>;onEquip:(relic:Relic)=>void;onSell:(relic:Relic)=>void;onShare?:(relic:Relic)=>void}){
 const [tab,setTab]=useState('owned')
 const items=(filter:string)=>state.relics.filter(r=>filter==='all'||r.owned)
 return <Tabs value={tab} onValueChange={value=>setTab(String(value))} className="flex min-h-0 flex-1 flex-col">
  <TabsList aria-label="유물 목록" className="relic-tabs shrink-0">{filters.map(f=><TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>)}</TabsList>
  {filters.map(f=><TabsContent key={f.value} value={f.value} aria-label={`${f.label} 유물`} ref={tab===f.value?listRef:undefined} className="mt-0 min-h-0 flex-1 divide-y divide-border/45 overflow-y-auto overscroll-contain">
   {items(f.value).length===0&&<div className="py-10 text-center"><p className="text-xs text-muted-foreground">아직 보유한 유물이 없어요.</p><Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={()=>setTab('all')}>전체 보기</Button></div>}
   {items(f.value).map(r=>{
    const equipped=state.equippedId===r.id
    return <article key={r.id} aria-label={r.name} className={`flex items-center gap-3 px-1 py-4 ${equipped?'bg-primary/[0.035]':''}`}>
     <CollectibleThumbnail path={r.thumbnail_path} name={r.name} className={`size-11 shrink-0 ${r.owned?'':'grayscale opacity-45'}`}/>
     <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><h3 className="text-[13px] font-medium leading-5">{r.name}</h3><RarityBadge rarity={r.rarity}/></div><p className="mt-0.5 text-[11px] leading-[1.65] text-muted-foreground"><RelicEffectText description={r.description}/></p></div>
     <div className="flex shrink-0 items-center gap-0.5"><Button size="sm" variant="ghost" className={`h-9 px-2 text-[11px] ${equipped?'text-primary disabled:opacity-100':'text-muted-foreground'}`} disabled={disabled||!r.owned||equipped} onClick={()=>onEquip(r)}>{equipped?'장착 중':r.owned?(state.equippedId?'교체':'장착'):r.discovered?'미보유':'미발견'}</Button>
      {r.owned&&r.sell_price>0&&<RelicMenu relic={r} equipped={equipped} disabled={disabled} onSell={()=>onSell(r)} onShare={onShare?()=>onShare(r):undefined}/>}
     </div>
    </article>
   })}
  </TabsContent>)}
 </Tabs>
}
