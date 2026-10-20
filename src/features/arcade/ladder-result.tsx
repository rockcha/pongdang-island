import type { CSSProperties } from 'react'
import { GoldIcon } from '@/features/gold/gold-provider'
import type { LadderRun } from './ladder-model'

export function LadderResult({ run }: { run: LadderRun }) {
  const best = run.payouts[run.destination] === Math.max(...run.payouts)
  const tone = best
    ? 'best'
    : run.reward > run.stake
      ? 'win'
      : run.reward < run.stake
        ? 'loss'
        : 'even'
  return (
    <div
      key={run.id}
      className={`ladder-result ladder-result-${tone}`}
      role="status"
      data-result-tone={tone}
    >
      {(tone === 'best' || tone === 'win') && (
        <div className="ladder-result-sparks" aria-hidden="true">
          {Array.from({ length: best ? 14 : 7 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  '--spark-x': `${Math.cos(i * 2.4) * (best ? 110 : 75)}px`,
                  '--spark-y': `${Math.sin(i * 2.4) * 55 - 28}px`,
                  animationDelay: `${(i % 4) * 45}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      {best ? (
        <p>최고 배당!</p>
      ) : run.reward > run.stake ? (
        <p>행운의 물결을 만났어요!</p>
      ) : run.reward === run.stake ? (
        <p>골드가 그대로 돌아왔어요</p>
      ) : run.reward === 0 ? (
        <p>다음 물결에서 다시 만나요</p>
      ) : null}
      <strong>
        <GoldIcon className="size-7" />
        {run.reward.toLocaleString()}
        <span>골드 지급</span>
      </strong>
    </div>
  )
}
