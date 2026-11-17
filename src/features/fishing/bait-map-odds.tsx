import { Map } from 'lucide-react'
import type { FishingBait } from './api'

export function BaitMapOdds({ bait }: { bait: FishingBait }) {
  const base = bait.baseMapChanceBp ?? 0
  if (base <= 300) return null
  const chance = bait.mapChanceBp ?? base
  const bonus = Math.max(0, chance - base)
  const percent = (bp: number) => `${Number((bp / 100).toFixed(2))}%`
  return (
    <div aria-label="지도 조각 추첨 확률" className="mt-4 border-t border-border/60 pt-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Map aria-hidden="true" className="size-3.5 text-primary" />
          지도 조각
        </span>
        <strong className="tabular-nums text-primary">{percent(chance)}</strong>
      </div>
      <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
        기본 {percent(base)}
        {bonus > 0 ? ` · 유물 +${percent(bonus)}p` : ' · 지도 확률 유물과 함께 적용돼요.'}
      </p>
      <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
        직접 낚시의 일반 발견 추첨에 적용돼요. 같은 등급에 남은 지도 조각이 없으면 기존 포획물을
        만나요.
      </p>
    </div>
  )
}
