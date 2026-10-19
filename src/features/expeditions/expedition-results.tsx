import {appArt} from '@/components/app-art'
import {RarityBadge} from '@/components/rarity-badge'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {Catch,ExpeditionOutcome} from './api'

export function ExpeditionResults({outcome,compact=false}:{outcome:ExpeditionOutcome;compact?:boolean}){
 const {items,failed=0,refunds={}}=outcome
 const refunded=Object.values(refunds).reduce((sum,n)=>sum+n,0)
 const bonus=items.filter(item=>item.bonus).length
 const groups=new Map<string,{species:Catch['species'];count:number;bonus:number}>()
 for(const item of items){
  const group=groups.get(item.species.id)??{species:item.species,count:0,bonus:0}
  group.count++;if(item.bonus)group.bonus++
  groups.set(item.species.id,group)
 }
 if(compact)return <div className="space-y-3">
  <div className="rounded-2xl bg-secondary/40 p-4">
   <dl className="grid grid-cols-[1.3fr_1fr_1fr] items-center text-center"><div><dt className="text-[11px] text-muted-foreground">획득</dt><dd className="mt-1 text-3xl font-medium tabular-nums text-primary">{items.length}<span className="ml-1 text-xs font-normal">개</span></dd></div><div className="border-l border-primary/10"><dt className="text-[11px] text-muted-foreground">낚시 시도</dt><dd className="mt-1 text-lg tabular-nums">{outcome.attempted??items.length+failed}<span className="ml-0.5 text-[11px]">회</span></dd></div><div className="border-l border-primary/10"><dt className="text-[11px] text-muted-foreground">놓친 횟수</dt><dd className="mt-1 text-lg tabular-nums text-muted-foreground">{failed}<span className="ml-0.5 text-[11px]">회</span></dd></div></dl>
   <div aria-hidden="true" className="mt-4 flex h-1.5 gap-1">{Array.from({length:Math.min(30,outcome.attempted??items.length+failed)},(_,i)=><span key={i} className={`min-w-0 flex-1 rounded-full ${i<items.length?'bg-primary':'bg-primary/10'}`}/>)}</div>
  </div>
  {groups.size>0?<ul aria-label="획득한 개체" className="divide-y divide-border/50">{[...groups.values()].map(group=><li key={group.species.id} className="flex items-center gap-3 py-2"><CollectibleThumbnail path={group.species.thumbnail_path} name={group.species.name} className="size-14 shrink-0"/><div className="min-w-0 flex-1"><p className="break-words text-sm">{group.species.name}</p>{group.species.rarity&&<div className="mt-1"><RarityBadge rarity={group.species.rarity}/></div>}</div><span className="text-sm tabular-nums text-primary">×{group.count}</span></li>)}</ul>:<div className="py-3 text-center"><p className="text-sm">아쉽게도 빈손으로 돌아왔어요</p><p className="mt-1.5 text-[11px] text-muted-foreground">이번에는 낚은 개체가 없어요.</p></div>}
 </div>
 return <div className="space-y-5 pb-2">
  <header className="pt-3 text-center">
   <p className="text-xs text-muted-foreground">통발을 확인해 보세요</p>
   <h2 className="mt-2 text-lg">통발 결과</h2>
   <p className="mt-3 text-sm text-muted-foreground">총 <strong className="text-3xl font-normal tabular-nums text-foreground">{items.length}</strong>개 획득</p>
   <p className="mt-2 text-[11px] text-muted-foreground">{items.length?'잡은 개체는 보관함에 보냈어요.':'이번에는 잡힌 개체가 없어요.'}</p>
  </header>
  {(failed>0||bonus>0||refunded>0)&&<dl className="flex flex-wrap justify-center gap-x-5 gap-y-2 border-y border-border/60 py-3 text-xs">
   {bonus>0&&<div className="flex items-center gap-2"><dt className="text-muted-foreground">보너스 포함</dt><dd className="tabular-nums text-primary">{bonus}개</dd></div>}
   {failed>0&&<div className="flex items-center gap-2"><dt className="text-muted-foreground">포획 실패</dt><dd className="tabular-nums">{failed}회</dd></div>}
   {refunded>0&&<div className="flex items-center gap-2"><dt className="text-muted-foreground">미끼 반환</dt><dd className="tabular-nums">{refunded}개</dd></div>}
  </dl>}
  {groups.size>0?<ul aria-label="획득한 개체" className="grid grid-cols-2 gap-2.5">
   {[...groups.values()].map(group=><li key={group.species.id} className="min-w-0 rounded-xl border border-border/60 bg-card px-3 pb-3 pt-2">
    <div className="relative flex justify-center">
     <CollectibleThumbnail path={group.species.thumbnail_path} name={group.species.name} className="size-24 max-w-full"/>
     <span aria-label={`${group.count}개 획득`} className="absolute right-0 top-1 rounded-full bg-secondary px-2 py-1 text-[11px] tabular-nums text-primary">×{group.count}</span>
    </div>
    {group.species.rarity&&<div className="mt-1 flex justify-center"><RarityBadge rarity={group.species.rarity}/></div>}
    <p className="mt-1 break-words text-center text-xs leading-5">{group.species.name}</p>
    {group.bonus>0&&<p className="mt-0.5 text-center text-[10px] text-primary">보너스 {group.bonus}개 포함</p>}
   </li>)}
  </ul>:<div className="flex flex-col items-center rounded-xl bg-secondary/30 px-4 py-7"><appArt.expeditions className="size-20 opacity-60"/><p className="mt-3 text-xs text-muted-foreground">다음 통발을 준비해볼까요?</p></div>}
  {refunded>0&&<p className="text-center text-[11px] leading-5 text-muted-foreground">새로 발견할 개체가 없어 첫인사 미끼 {refunded}개를 돌려받았어요.</p>}
 </div>
}
