import {appArt} from '@/components/app-art'
import {GoldIcon} from '@/features/gold/gold-provider'

export function WeeklyRewards({rewards,weekEnd}:{rewards?:number[];weekEnd?:string}){
 return <details className="rounded-xl border border-border/60 bg-secondary/25 px-3 py-2 text-xs">
  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-primary"><span className="flex items-center gap-2"><appArt.mailGift className="size-7"/>주간 랭킹 보상</span><span className="text-[10px] text-muted-foreground">일요일 24:00 마감 ▾</span></summary>
  <div className="space-y-3 pb-2 pt-1">
   {rewards&&<ul className="grid grid-cols-3 gap-2">{rewards.map((gold,i)=><li key={i} className="rounded-lg bg-background px-2 py-2 text-center"><p className="text-[10px] text-muted-foreground">{i===5?'6등 이하':`${i+1}등`}</p><p className="mt-1 flex items-center justify-center gap-1 tabular-nums text-primary"><GoldIcon className="size-4"/>{gold.toLocaleString('ko-KR')}</p></li>)}</ul>}
   <p className="text-[11px] leading-5 text-muted-foreground">한국 시간 월요일 00:00부터 일요일 24:00까지, 게임별 개인 최고 기록 하나로 집계해요. 마감 후 운영자 선물이 우편함에 자동 도착해요. 연습·미완료 기록은 제외돼요.</p>
   {weekEnd&&<p className="text-[10px] text-muted-foreground">이번 마감: {new Date(weekEnd).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})} (한국 시간)</p>}
  </div>
 </details>
}
