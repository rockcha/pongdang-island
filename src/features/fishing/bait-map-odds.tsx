import { Map } from 'lucide-react'
import type { FishingBait } from './api'

export function BaitMapOdds({ bait }: { bait: FishingBait }) {
  const base = bait.baseMapChanceBp ?? 0
  if (base <= 300) return null
  const chance = bait.mapChanceBp ?? base
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
    </div>
  )
}
