import {Heart} from 'lucide-react'
import type {BrickScore} from './brick-breaker-model'
import {brickRound,MAX_BRICK_ROUNDS} from './brick-breaker-rounds'

export function BrickGameHud({score,practice=true}:{score:BrickScore;practice?:boolean}){
 const reward=score.roundReward??brickRound(score.round).reward
 return <div className="shrink-0 border-b border-[#e7c19b]/15 px-4 py-3 text-[#fff1dd] tabular-nums">
  <div className="mb-3 flex items-center justify-end gap-3">
   <div aria-label={score.testMode?'생명력 무한':`남은 목숨 ${score.lives}개`} className="flex items-center gap-1 text-[#ed9b8d]">
    {score.testMode?<span className="text-xs">목숨 ∞</span>:[0,1,2].map(i=><Heart key={i} aria-hidden="true" className={`size-3.5 ${i<score.lives?'fill-current':'opacity-20'}`}/>)}
   </div>
  </div>
  <div className="grid grid-cols-[0.9fr_1fr_1.25fr] divide-x divide-[#e7c19b]/15">
   <div>
    <p className="text-[11px] text-[#e7c19b]/70">현재 라운드</p>
    <p aria-label={`현재 ${score.round}라운드, 전체 ${MAX_BRICK_ROUNDS}라운드`} className="mt-1 text-xl font-semibold leading-none">{String(score.round).padStart(2,'0')}<span className="ml-1 text-xs font-normal text-[#e7c19b]/45">/ {MAX_BRICK_ROUNDS}</span></p>
   </div>
   <div className="px-3">
    <p className="text-[11px] text-[#e7c19b]/70">라운드 보상</p>
    <p aria-label={`클리어 보상 ${reward}골드`} className="mt-1 flex items-center gap-1.5 text-xl font-semibold leading-none text-[#f2cf91]"><img src="/currency/gold-coin-starfish.png" alt="" className="size-4"/>{reward}</p>
   </div>
   <div className="pl-3">
    <p className="text-[11px] text-[#e7c19b]/70">현재 누적 보상</p>
    <p aria-label={(practice?'연습 ':'')+`누적 보상 ${score.reward??0}골드`} className="mt-1 flex items-center gap-1.5 text-xl font-semibold leading-none text-[#f2cf91]"><img src="/currency/gold-coin-starfish.png" alt="" className="size-4"/>{(score.reward??0).toLocaleString('ko-KR')}</p>
   </div>
  </div>
 </div>
}
