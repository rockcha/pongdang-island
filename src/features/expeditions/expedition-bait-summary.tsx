import type { ExpeditionState } from './api'

export function ExpeditionBaitSummary({
  cargo,
  baits,
}: {
  cargo?: Record<string, number>
  baits: ExpeditionState['baits']
}) {
  const entries = Object.entries(cargo ?? {}).filter(
    ([, count]) => Number.isInteger(count) && count > 0,
  )
  if (!entries.length) return null
  return (
    <section
      aria-label="사용한 미끼"
      className="rounded-xl border border-border/60 bg-secondary/20 px-3 py-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
        <h3 className="text-muted-foreground">사용한 미끼</h3>
        <span className="tabular-nums text-primary">
          총 {entries.reduce((sum, [, count]) => sum + count, 0)}개
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {entries.map(([id, count]) => {
          const bait = baits.find((b) => b.id === id)
          return (
            <li
              key={id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-background py-1 pl-1 pr-2.5 text-[11px]"
            >
              {bait && (
                <img src={bait.image_path} alt="" className="size-6 shrink-0 object-contain" />
              )}
              <span className="min-w-0 break-words">{bait?.name ?? '미끼'}</span>
              <span className="shrink-0 font-medium tabular-nums text-primary">×{count}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
