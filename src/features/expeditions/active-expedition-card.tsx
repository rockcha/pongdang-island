import type {ReactNode} from 'react'
import {ChevronDown} from 'lucide-react'
import {BoatImage} from './expedition-controls'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {regionIcons} from '@/features/regions/region-icons'
import type {Expedition,ExpeditionState} from './api'

export function ActiveExpeditionCard({expedition:e,baits,regionName,remaining,children}:{expedition:Expedition;baits:ExpeditionState['baits'];regionName:string;remaining:number;children:ReactNode}){
 const boosts=e.boosts??[]
 const progress=Math.min(100,Math.max(0,100*(1-remaining/(e.vessel_snapshot.duration_minutes*60000||1))))
 const seconds=Math.ceil(remaining/1000)
 const time=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':')
 return <article className="shrink-0 space-y-5 rounded-2xl border border-border bg-card p-4">
  <div className="rounded-xl bg-gradient-to-b from-secondary/35 to-secondary/80 p-3">
   <div className="relative z-10 space-y-2">
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/50 bg-card/85 py-1 pr-3 pl-1.5 text-[11px] text-foreground">{regionIcons[e.region_id]&&<img src={regionIcons[e.region_id].src} alt="" className="size-5 shrink-0 object-contain"/>}<span className="min-w-0 break-keep">{regionName}</span></span>
    <ul aria-label="통발에 넣은 미끼" className="flex flex-wrap gap-1.5">{Object.entries(e.cargo).map(([id,count])=>{const bait=baits.find(b=>b.id===id);return <li key={id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/40 bg-card/75 py-0.5 pr-2.5 pl-1 text-[10px] text-muted-foreground">{bait&&<img src={bait.image_path} alt="" className="size-5 shrink-0 object-contain"/>}<span className="min-w-0 break-keep">{bait?.name??id}</span><span className="shrink-0 pl-0.5 font-medium tabular-nums text-primary">×{count}</span></li>})}</ul>
   </div>
   <BoatImage id={e.vessel_snapshot.id} name="꼬마 통발" className="mx-auto h-40 w-full max-w-64"/>
  </div>
  <div className="space-y-3">
   <div className="flex items-center justify-between gap-3"><h2 className="text-base">꼬마 통발</h2><span className="shrink-0 text-[11px] text-primary">{remaining?'유인 중':'수확 가능'}</span></div>
  </div>
  <div className="space-y-3">
   <div role="progressbar" aria-label="통발 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary motion-safe:transition-[width]" style={{width:`${progress}%`}}/></div>
   <div className="space-y-1 text-center"><p role="timer" aria-live="off" className="text-[28px] leading-10 tabular-nums tracking-wide">{remaining?time:'수확 준비 완료'}</p><p className="text-[11px] text-muted-foreground">{remaining?'수확까지':'결과를 받을 수 있어요'}</p></div>
  </div>
  {boosts.length>0&&<details className="group border-t border-border/70 pt-3">
   <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs [&::-webkit-details-marker]:hidden">
    <div className="flex -space-x-2" aria-hidden="true">{boosts.slice(0,3).map(b=><PlayerAvatar key={b.id} nickname={b.nickname} path={b.avatar_path} className="size-7 ring-2 ring-card"/>)}</div>
    <span className="min-w-0 flex-1"><span className="block text-foreground">친구의 물고기 유인</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{boosts[0].nickname}님{boosts.length>1?` 외 ${boosts.length-1}명`:''}</span></span>
    <span className="shrink-0 tabular-nums text-primary">−{boosts.reduce((sum,b)=>sum+b.minutes,0)}분</span><ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"/>
   </summary>
   <ul aria-label="물고기를 유인해준 친구" className="mt-2 space-y-2 pb-1">{boosts.map(b=><li key={b.id} className="flex items-center gap-2 text-xs"><PlayerAvatar nickname={b.nickname} path={b.avatar_path} className="size-6"/><span className="min-w-0 flex-1 truncate">{b.nickname}</span><span className="text-[11px] text-muted-foreground">{b.minutes}분 가속</span></li>)}</ul>
  </details>}
  {children}
 </article>
}
