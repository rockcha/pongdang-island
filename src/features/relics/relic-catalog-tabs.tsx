import {useState,type RefObject} from 'react'
import {Menu} from '@base-ui/react/menu'
import {BookOpen,Ellipsis} from 'lucide-react'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {RarityBadge} from '@/components/rarity-badge'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {RelicEffectText} from './relic-equipment-slot'
import {RelicGold} from './relic-gold'
import type {Relic,RelicState} from './api'



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
 const [catalogOpen,setCatalogOpen]=useState(false)
 const owned=state.relics.filter(r=>r.owned)
 const renderItems=(items:Relic[],catalog=false)=><>
   {items.map(r=>{
    const equipped=state.equippedId===r.id
    return <article key={r.id} aria-label={r.name} className={`flex items-center gap-3 px-1 py-4 ${equipped?'bg-primary/[0.035]':''}`}>
     <CollectibleThumbnail path={r.thumbnail_path} name={r.name} className={`size-11 shrink-0 ${r.discovered||r.owned?'':'[&_img]:grayscale [&_img]:brightness-[.08]'}`}/>
     <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><h3 className="text-[13px] font-medium leading-5">{r.name}</h3><RarityBadge rarity={r.rarity}/>{catalog&&<span className="text-[10px] text-muted-foreground">{r.owned?'보유':r.discovered?'미보유':'미발견'}</span>}</div><p className="mt-0.5 text-[11px] leading-[1.65] text-muted-foreground"><RelicEffectText description={r.description}/></p></div>
     {!catalog&&<div className="flex shrink-0 items-center gap-0.5"><Button size="sm" variant="ghost" className={`h-9 px-2 text-[11px] ${equipped?'text-primary disabled:opacity-100':'text-muted-foreground'}`} disabled={disabled||!r.owned||equipped} onClick={()=>onEquip(r)}>{equipped?'장착 중':r.owned?(state.equippedId?'교체':'장착'):r.discovered?'미보유':'미발견'}</Button>
      {r.owned&&r.sell_price>0&&<RelicMenu relic={r} equipped={equipped} disabled={disabled} onSell={()=>onSell(r)} onShare={onShare?()=>onShare(r):undefined}/>}
     </div>}
    </article>
   })}
 </>
 return <section className="flex min-h-0 flex-1 flex-col">
  <div className="flex shrink-0 items-center justify-between border-b border-border/45 pb-2">
   <h3 className="text-sm font-medium">나의 유물 <span className="ml-1 text-xs text-muted-foreground">{owned.length}</span></h3>
   <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary" onClick={()=>setCatalogOpen(true)}><BookOpen className="size-4"/>유물 도감</Button>
  </div>
  <div ref={listRef} aria-label="보유 유물" className="min-h-0 flex-1 divide-y divide-border/45 overflow-y-auto overscroll-contain">
   {owned.length===0&&<p className="py-10 text-center text-xs text-muted-foreground">아직 보유한 유물이 없어요.</p>}
   {renderItems(owned)}
  </div>
  <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}><DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-lg">
   <DialogHeader><DialogTitle>유물 도감</DialogTitle><DialogDescription>발견한 유물과 아직 만나지 못한 유물을 확인해요.</DialogDescription></DialogHeader>
   <div aria-label="유물 도감 목록" className="min-h-0 flex-1 divide-y divide-border/45 overflow-y-auto overscroll-contain">{renderItems(state.relics,true)}</div>
  </DialogContent></Dialog>
 </section>
}
