import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GameOverlay } from './game-overlay'
import type { BrickScore } from './brick-breaker-model'
import { brickRound, MAX_BRICK_ROUNDS } from './brick-breaker-rounds'

type Props = { score: BrickScore; paid: boolean; busy: boolean }

export function BrickRoundOverlay({ score, paid, busy, onNext }: Props & { onNext: () => void }) {
  const final = score.round >= MAX_BRICK_ROUNDS
  return (
    <GameOverlay
      title={final ? '모든 라운드 클리어!' : `${score.round}라운드 클리어`}
      actions={
        <Button className="min-h-12 rounded-xl" disabled={busy} onClick={onNext}>
          {final ? '결과 보기' : '다음 라운드'}
          <ArrowUpRight className="size-4" />
        </Button>
      }
    >
      <ShieldCheck aria-hidden="true" className="mx-auto size-8" />
      <p className="text-lg text-[#ffe0a0]">
        클리어 보상 +{score.roundReward ?? brickRound(score.round).reward} G
      </p>
      <p className="text-sm">확보한 보상 {score.reward ?? 0} G</p>
      {!paid && <p className="text-xs text-white/60">연습 · 실제 지급 없음</p>}
    </GameOverlay>
  )
}

export function BrickResultOverlay({ score, paid, busy, onExit }: Props & { onExit: () => void }) {
  const cleared = score.phase === 'banked'
  return (
    <GameOverlay
      tone="ocean"
      eyebrow={cleared ? 'ALL CLEAR' : 'GAME OVER'}
      title={cleared ? '모든 라운드 클리어!' : '이번 도전은 여기까지'}
      actions={
        <Button className="min-h-12 rounded-xl" disabled={busy} onClick={onExit}>
          시작 화면으로
        </Button>
      }
    >
      <div className="rounded-2xl border border-[#e7c19b]/15 bg-white/5 px-8 py-5">
        <p className="text-xs text-[#e7c19b]/70">현재 누적 보상</p>
        <p className="mt-2 flex items-center justify-center gap-2 text-3xl font-semibold text-[#f2cf91]">
          <img src="/currency/gold-coin-starfish.png" alt="골드" className="size-7" />
          {score.reward ?? 0}
        </p>
      </div>
      <p className="text-xs text-white/60">
        {paid ? '서버에서 확인한 보상이 지급돼요.' : '연습 · 실제 지급 없음'}
      </p>
    </GameOverlay>
  )
}
