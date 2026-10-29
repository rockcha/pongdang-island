import {useState,type RefObject} from 'react'
import {Menu} from '@base-ui/react/menu'
import {Ellipsis} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {RarityBadge} from '@/components/rarity-badge'
import {RelicArtwork} from './relic-artwork'
import {RelicEffectText} from './relic-equipment-slot'
import {RelicGold} from './relic-gold'
import type {Relic,RelicState} from './api'
import {relicQuantity} from './api'
import {rarities} from '@/lib/game/rarity'



function RelicMenu({relic,equipped,disabled,onSell,onShare}:{relic:Relic;equipped:boolean;disabled:boolean;onSell:()=>void;onShare?:()=>void}){
 const lastEquipped=equipped&&relicQuantity(relic)<=1
 return <Menu.Root>
  <Menu.Trigger disabled={disabled} render={<Button variant="ghost" size="icon" aria-label={`${relic.name} 더보기`} className="size-9 shrink-0 text-muted-foreground/65"/>}><Ellipsis className="size-4"/></Menu.Trigger>
  <Menu.Portal><Menu.Positioner align="end" sideOffset={4} collisionPadding={12} className="z-[65]"><Menu.Popup className="min-w-40 rounded-xl border border-border/60 bg-popover p-1.5 text-xs shadow-lg outline-none">
   {(relic.crafted||relic.rarity==='mythic')&&onShare&&<Menu.Item onClick={onShare} className="flex min-h-10 cursor-pointer items-center rounded-lg px-3 outline-none data-highlighted:bg-secondary">자랑하기</Menu.Item>}
   {!relic.crafted&&relic.sell_price>0&&<Menu.Item aria-label={`판매 ${relic.sell_price.toLocaleString('ko-KR')} 골드`} disabled={lastEquipped} onClick={onSell} className="flex min-h-10 cursor-pointer items-center justify-between gap-5 rounded-lg px-3 outline-none data-highlighted:bg-secondary data-disabled:cursor-default data-disabled:opacity-40"><span>1개 판매</span><RelicGold amount={relic.sell_price}/></Menu.Item>}
   {!relic.crafted&&equipped&&<p className="px-3 pb-2 pt-1 text-[10px] text-muted-foreground">{lastEquipped?'장착한 1개는 해제 후 판매할 수 있어요':'장착한 1개를 제외한 여분을 판매해요'}</p>}
  </Menu.Popup></Menu.Positioner></Menu.Portal>
 </Menu.Root>
}

export function RelicCatalogTabs({state,disabled,listRef,onEquip,onSell,onShare}:{state:RelicState;disabled:boolean;listRef:RefObject<HTMLDivElement|null>;onEquip:(relic:Relic)=>void;onSell:(relic:Relic)=>void;onShare?:(relic:Relic)=>void}){
 const [grade,setGrade]=useState('all')
 const owned=state.relics.filter(r=>r.owned)
 const items=owned.filter(r=>grade==='all'||r.rarity===grade).toSorted((a,b)=>Number(!!b.crafted)-Number(!!a.crafted)||Number(b.id===state.equippedId)-Number(a.id===state.equippedId)||rarities[b.rarity].rank-rarities[a.rarity].rank||relicQuantity(b)-relicQuantity(a)||a.name.localeCompare(b.name,'ko'))
 const renderItems=()=> <>
   {items.map(r=>{
    const equipped=state.equippedId===r.id
    return <article key={r.id} aria-label={r.name} data-equipped={equipped} data-rarity={r.rarity} className="relic-inventory-card">
     <div className="relic-inventory-thumbnail relative shrink-0"><RelicArtwork relic={r} className="size-14"/><span aria-label={`보유 ${relicQuantity(r)}개`} className="relic-quantity-badge" style={r.crafted?{left:-2,right:'auto'}:undefined}>×{relicQuantity(r)}</span></div>
     <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><h3 className="text-[13px] font-semibold leading-5">{r.name}</h3><RarityBadge rarity={r.rarity}/></div><p className="mt-1 text-[11px] leading-[1.65] text-muted-foreground"><RelicEffectText description={r.description}/></p><p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground">{equipped?`장착 1개 · 여분 ${Math.max(0,relicQuantity(r)-1)}개`:`사용 가능 ${relicQuantity(r)}개`}</p></div>
     <div className="flex shrink-0 flex-col items-end gap-1"><Button size="sm" variant={equipped?'ghost':'outline'} className={`h-8 rounded-lg px-2.5 text-[11px] ${equipped?'text-primary disabled:opacity-100':'text-muted-foreground'}`} disabled={disabled||equipped} onClick={()=>onEquip(r)}>{equipped?'장착 중':state.equippedId?'교체':'장착'}</Button>
      {r.owned&&(r.sell_price>0||(r.crafted&&onShare))&&<RelicMenu relic={r} equipped={equipped} disabled={disabled} onSell={()=>onSell(r)} onShare={onShare?()=>onShare(r):undefined}/>}
     </div>
    </article>
   })}
 </>
 return <section className="flex min-h-0 flex-1 flex-col">
  <div className="flex shrink-0 items-center justify-between gap-2 pb-3">
   <div><h3 className="text-sm font-semibold">나의 유물</h3><p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{owned.length}종 · 총 {owned.reduce((n,r)=>n+relicQuantity(r),0)}개</p></div>
  </div>
  <label className="mb-3 flex shrink-0 items-center justify-between gap-3 text-xs text-muted-foreground">유물 등급<select aria-label="유물 등급" value={grade} onChange={event=>setGrade(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-foreground"><option value="all">전체 등급</option>{(['common','rare','epic','mythic'] as const).filter(value=>owned.some(r=>r.rarity===value)).map(value=><option key={value} value={value}>{rarities[value].label}</option>)}</select></label>
  <div ref={listRef} aria-label="보유 유물" className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain pb-2">
   {items.length===0&&<p className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-xs text-muted-foreground">아직 보유한 유물이 없어요.</p>}
   {renderItems()}
  </div>
 </section>
}
