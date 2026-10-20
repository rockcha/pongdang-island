import {Heart} from 'lucide-react'
import type {BrickScore} from './brick-breaker-model'
import {brickRound,MAX_BRICK_ROUNDS} from './brick-breaker-rounds'

export function BrickGameHud({score,practice=true}:{score:BrickScore;practice?:boolean}){
 return <div className="shrink-0 border-b border-[#e7c19b]/15 px-4 pb-2 text-[#fff1dd] tabular-nums">
  <div className="flex items-start justify-between gap-3">
   <div>
    <p aria-label={`현재 ${score.round}라운드, 전체 ${MAX_BRICK_ROUNDS}라운드`} className="text-sm font-medium tracking-wide">ROUND <span className="text-lg">{String(score.round).padStart(2,'0')}</span><span className="ml-1 text-[#e7c19b]/50">/ {String(MAX_BRICK_ROUNDS).padStart(2,'0')}</span></p>
    <p aria-label={`클리어 보상 ${score.roundReward??brickRound(score.round).reward}골드`} className="mt-0.5 flex items-center gap-1 text-xs text-[#e7c19b]/75">클리어 보상 <img src="/currency/gold-coin-starfish.png" alt="" className="size-3.5"/><span className="text-[#f2cf91]">{score.roundReward??brickRound(score.round).reward}</span></p>
   </div>
   <div aria-label={score.testMode?'생명력 무한':`남은 목숨 ${score.lives}개`} className="flex items-center gap-1.5 pt-1 text-[#ed9b8d]">
    {score.testMode?<><Heart aria-hidden="true" className="size-5 fill-current"/><span aria-hidden="true">∞</span></>:[0,1,2].map(i=><Heart key={i} aria-hidden="true" className={`size-5 transition-opacity ${i<score.lives?'fill-current':'opacity-20'}`}/>)}
   </div>
  </div>
  <div className="mt-2 grid grid-cols-2 gap-5">
   <div>
    <p className="text-xs text-[#e7c19b]/70">이번 라운드 점수</p>
    <p aria-label={`현재 라운드 점수 ${score.pending}점`} className="mt-1 text-2xl leading-none font-semibold">{score.pending.toLocaleString('ko-KR')}<span className="ml-1.5 text-xs font-normal text-[#e7c19b]/60">점</span></p>
   </div>
   <div className="border-l border-[#e7c19b]/15 pl-5">
    <p className="text-xs text-[#e7c19b]/70">확보한 보상</p>
    <p aria-label={(practice?'연습 ':'')+`확보 보상 ${score.reward??0}골드`} className="mt-1 flex items-center gap-2 text-2xl leading-none font-semibold text-[#f2cf91]"><img src="/currency/gold-coin-starfish.png" alt="" className="size-6"/>{(score.reward??0).toLocaleString('ko-KR')}</p>
   </div>
  </div>
 </div>
}
