import {BellRing} from 'lucide-react'

export function ProductionAutoClaimNotice(){
 return <div className="mb-2 flex items-start gap-2 rounded-xl border border-primary/15 bg-secondary/45 px-3 py-2 text-primary">
  <BellRing aria-hidden="true" className="mt-0.5 size-4 shrink-0"/>
  <div className="min-w-0 text-[11px] leading-5"><p className="font-medium">잠들지 않는 수확종 작동 중</p><p className="text-muted-foreground">접속하지 않아도 1분마다 완성물을 챙겨요. 이미 상했거나 보유 한도를 넘으면 수령하지 않아요.</p></div>
 </div>
}
