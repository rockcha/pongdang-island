import {Menu} from '@base-ui/react/menu'
import {Check,ChevronDown,LockKeyhole} from 'lucide-react'
import {Link} from 'react-router'
import {appArt} from '@/components/app-art'
import {regionIcons} from './region-icons'
import type {RegionMap} from './api'

export function FishingDestinationMenu({map}:{map:RegionMap}){
 return <Menu.Root>
  <Menu.Trigger aria-label="지도" className="group flex min-h-11 items-center gap-2 rounded-full border border-white/70 bg-[#fff8eb]/90 px-3 text-[#725039] shadow-sm backdrop-blur-md outline-none transition-colors hover:bg-[#fff8eb] focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-[#fff8eb]">
   <appArt.map aria-hidden="true" className="size-7 transition-transform motion-safe:group-hover:-rotate-6"/>
   <span className="text-xs">지도</span>
   <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-data-popup-open:rotate-180"/>
  </Menu.Trigger>
  <Menu.Portal>
   <Menu.Positioner sideOffset={6} align="end" collisionPadding={12} className="z-[60]">
    <Menu.Popup aria-label="낚시터 선택" className="flex max-h-[min(28rem,var(--available-height))] w-64 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border/70 bg-popover text-popover-foreground shadow-xl outline-none">
     <div className="shrink-0 border-b px-4 py-3"><p className="text-sm text-primary">어디로 떠나볼까요?</p><p className="mt-1 text-[10px] text-muted-foreground">열린 해역을 골라 출항하세요.</p></div>
     <div className="min-h-0 overflow-y-auto overscroll-contain p-1.5">
      {map.regions.map(region=>{
       const current=region.id===map.currentRegion
       const content=<><img src={regionIcons[region.id]?.src??'/region-icons/pongdang.svg'} alt="" className="size-8 shrink-0 object-contain"/><span className="min-w-0 flex-1 text-xs">{region.name}</span>{current?<span className="flex shrink-0 items-center gap-1 text-[10px] text-primary"><Check aria-hidden="true" className="size-3.5"/>현재</span>:!region.unlocked?<LockKeyhole aria-label="지도 필요" className="size-3.5 shrink-0"/>:null}</>
       const className='flex min-h-12 items-center gap-2.5 rounded-xl px-3 py-2 outline-none data-highlighted:bg-secondary data-disabled:text-muted-foreground '+(current?'bg-primary/10 text-primary':'')
       return current||!region.unlocked?<Menu.Item key={region.id} disabled aria-label={`${region.name} · ${current?'현재 위치':'지도 필요'}`} className={className}>{content}</Menu.Item>:<Menu.LinkItem key={region.id} render={<Link to={`/sailing/${region.id}`}/>} className={className}>{content}</Menu.LinkItem>
      })}
     </div>
     <Menu.Separator className="h-px shrink-0 bg-border"/>
     <Menu.LinkItem render={<Link to="/harbor"/>} className="flex min-h-11 shrink-0 items-center justify-center gap-2 text-xs text-primary outline-none data-highlighted:bg-secondary"><appArt.map aria-hidden="true" className="size-5"/>전체 지도 보기</Menu.LinkItem>
    </Menu.Popup>
   </Menu.Positioner>
  </Menu.Portal>
 </Menu.Root>
}
