import {NewDiscoveryBadge} from '@/components/new-discovery-badge'
import {appArt} from '@/components/app-art'
import {RarityBadge} from '@/components/rarity-badge'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {Catch,ExpeditionOutcome} from './api'
import './expedition-results.css'

function ResultSummary({outcome}:{outcome:ExpeditionOutcome}){
 const failed=outcome.failed??0,bonus=outcome.items.filter(item=>item.bonus).length
 const succeeded=outcome.succeeded??Math.max(0,(outcome.attempted??outcome.items.length-bonus+failed)-failed)
 return <dl className="rounded-xl bg-secondary/40 px-4 py-3">
  <div className="flex items-center justify-center gap-6 text-sm"><div className="flex items-center gap-2"><dt className="text-muted-foreground">성공</dt><dd className="font-medium tabular-nums text-primary">{succeeded}</dd></div><div className="h-3 w-px bg-border" aria-hidden="true"/><div className="flex items-center gap-2"><dt className="text-muted-foreground">실패</dt><dd className="tabular-nums">{failed}</dd></div></div>
  <div className="mt-2.5 flex items-center justify-center gap-5 border-t border-primary/10 pt-2.5 text-xs">{(['mythic','epic'] as const).map(rarity=><div key={rarity} className="flex items-center gap-2"><dt><RarityBadge rarity={rarity}/></dt><dd className="tabular-nums">{outcome.items.filter(item=>item.species.rarity===rarity).length}개</dd></div>)}</div>
 </dl>
}

export function ExpeditionResults({outcome,compact=false,preview=false,onCelebrate}:{outcome:ExpeditionOutcome;compact?:boolean;preview?:boolean;onCelebrate?:(item:Catch)=>void}){
 const {items,refunds={}}=outcome
 const refunded=Object.values(refunds).reduce((sum,n)=>sum+n,0)
 const bonus=items.filter(item=>item.bonus).length
 const shareButtons=onCelebrate&&!preview?<div className="flex flex-wrap justify-center gap-2">{items.filter((item,index)=>['epic','mythic'].includes(item.species.rarity??'')&&items.findIndex(other=>other.species.id===item.species.id)===index).map(item=><button key={item.id} type="button" onClick={()=>onCelebrate(item)} className="min-h-11 rounded-xl border border-primary/20 px-3 text-xs text-primary">{item.species.name} · 자랑하기</button>)}</div>:null
 const groups=new Map<string,{species:Catch['species'];count:number;bonus:number;firstDiscovery:boolean}>()
 for(const item of items){
  const group=groups.get(item.species.id)??{species:item.species,count:0,bonus:0,firstDiscovery:false}
  group.firstDiscovery ||= item.firstDiscovery===true;group.count++;if(item.bonus)group.bonus++
  groups.set(item.species.id,group)
 }
 if(compact)return <div className="space-y-3">
  <ResultSummary outcome={outcome}/>
  {shareButtons}
  {groups.size>0?<ul aria-label="획득한 개체" className="divide-y divide-border/50">{[...groups.values()].map(group=><li key={group.species.id} className="flex items-center gap-3 py-2"><CollectibleThumbnail path={group.species.thumbnail_path} name={group.species.name} className="size-14 shrink-0"/><div className="min-w-0 flex-1">{group.firstDiscovery&&!preview&&<NewDiscoveryBadge className="mb-1.5"/>}<p className="break-words text-sm">{group.species.name}</p>{group.species.rarity&&<div className="mt-1"><RarityBadge rarity={group.species.rarity}/></div>}</div><span className="text-sm tabular-nums text-primary">×{group.count}</span></li>)}</ul>:<div className="py-3 text-center"><p className="text-sm">아쉽게도 빈손으로 돌아왔어요</p><p className="mt-1.5 text-[11px] text-muted-foreground">이번에는 낚은 개체가 없어요.</p></div>}
 </div>
 return <div className="space-y-4 pb-2">
  <header className="pt-3 text-center">
   <h2 className="text-lg">통발 결과</h2>
   <p className="mt-2 text-[11px] text-muted-foreground">{preview?'예시 결과예요. 보관함에 추가되지 않아요.':items.length?'잡은 개체는 보관함에 보냈어요.':'이번에는 잡힌 개체가 없어요.'}</p>
  </header>
  <ResultSummary outcome={outcome}/>
  {shareButtons}
  {(bonus>0||refunded>0)&&<dl className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-y border-border/60 py-3 text-xs">
   {bonus>0&&<div className="flex items-center gap-2"><dt className="text-muted-foreground">보너스 포함</dt><dd className="tabular-nums text-primary">{bonus}개</dd></div>}
   {refunded>0&&<div className="flex items-center gap-2"><dt className="text-muted-foreground">미끼 반환</dt><dd className="tabular-nums">{refunded}개</dd></div>}
  </dl>}
  {groups.size>0?<ul aria-label="획득한 개체" className="grid grid-cols-2 gap-2.5">
   {[...groups.values()].map(group=><li key={group.species.id} data-rarity={group.species.rarity} className="expedition-result-card relative isolate min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card px-3 pb-3 pt-2">
    <div className="relative flex justify-center">
     {group.firstDiscovery&&!preview&&<NewDiscoveryBadge className="absolute left-0 top-1 z-10"/>}
     <CollectibleThumbnail path={group.species.thumbnail_path} name={group.species.name} className="size-24 max-w-full"/>
     <span aria-label={`${group.count}개 획득`} className="absolute right-0 top-1 rounded-[3px] bg-secondary px-2 py-1 text-[11px] tabular-nums text-primary">× {group.count}</span>
    </div>
    {group.species.rarity&&<div className="mt-1 flex justify-center"><RarityBadge rarity={group.species.rarity}/></div>}
    <p className="mt-1 break-words text-center text-xs leading-5">{group.species.name}</p>
    {group.bonus>0&&<p className="mt-0.5 text-center text-[10px] text-primary">보너스 {group.bonus}개 포함</p>}
   </li>)}
  </ul>:<div className="flex flex-col items-center rounded-xl bg-secondary/30 px-4 py-7"><appArt.expeditions className="size-20 opacity-60"/><p className="mt-3 text-xs text-muted-foreground">다음 통발을 준비해볼까요?</p></div>}
  {refunded>0&&<p className="text-center text-[11px] leading-5 text-muted-foreground">새로 발견할 개체가 없어 첫인사 미끼 {refunded}개를 돌려받았어요.</p>}
 </div>
}
