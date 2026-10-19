import {appArt} from '@/components/app-art'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {Catch,ExpeditionOutcome} from './api'

export function ExpeditionResults({outcome}:{outcome:ExpeditionOutcome}){
 const {items,failed=0,refunds={}}=outcome
 const refunded=Object.values(refunds).reduce((sum,n)=>sum+n,0)
 const bonus=items.filter(item=>item.bonus).length
 const groups=new Map<string,{species:Catch['species'];count:number;bonus:number}>()
 for(const item of items){
  const group=groups.get(item.species.id)??{species:item.species,count:0,bonus:0}
  group.count++;if(item.bonus)group.bonus++
  groups.set(item.species.id,group)
 }
 return <div className="space-y-5 pb-2">
  <header className="pt-3 text-center">
   <p className="text-xs text-muted-foreground">조업을 마치고 돌아왔어요</p>
   <h2 className="mt-2 text-lg">파견 결과</h2>
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
    <p className="mt-1 break-words text-center text-xs leading-5">{group.species.name}</p>
    {group.bonus>0&&<p className="mt-0.5 text-center text-[10px] text-primary">보너스 {group.bonus}개 포함</p>}
   </li>)}
  </ul>:<div className="flex flex-col items-center rounded-xl bg-secondary/30 px-4 py-7"><appArt.expeditions className="size-20 opacity-60"/><p className="mt-3 text-xs text-muted-foreground">다음 조업을 준비해볼까요?</p></div>}
  {refunded>0&&<p className="text-center text-[11px] leading-5 text-muted-foreground">새로 발견할 개체가 없어 첫인사 미끼 {refunded}개를 돌려받았어요.</p>}
 </div>
}
