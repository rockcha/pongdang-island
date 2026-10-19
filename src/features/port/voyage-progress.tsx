import type {HarborVoyage} from './api'

export function VoyageProgress({voyage,now}:{voyage:HarborVoyage;now:number}){
 const start=Date.parse(voyage.departed_at),end=Date.parse(voyage.returns_at)
 const progress=Number.isFinite(start)&&end>start?Math.max(0,Math.min(100,(now-start)/(end-start)*100)):0
 const minutes=Math.max(0,Math.ceil((end-now)/60000)),active=now<end
 return <span className="mt-2 block space-y-1.5">
  <span className="flex items-center justify-between gap-2 text-[10px] text-primary"><span className="inline-flex items-center gap-1"><span aria-hidden="true" className={`size-1.5 rounded-full bg-primary ${active?'animate-pulse motion-reduce:animate-none':''}`}/>{active?'조업 중':'어획물 수령 가능'}</span><span className="tabular-nums">{active?`${minutes}분`:'완료'}</span></span>
  <span role="progressbar" aria-label={`${voyage.vessel_snapshot.name} 조업 진행`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="block h-2 overflow-hidden rounded-full bg-primary/15"><span className="relative block h-full rounded-full bg-primary transition-[width] duration-1000 motion-reduce:transition-none" style={{width:`${progress}%`}}>{active&&<span aria-hidden="true" className="absolute inset-0 animate-pulse rounded-full bg-white/25 motion-reduce:animate-none"/>}</span></span>
 </span>
}
