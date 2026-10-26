import type { ReactNode } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { BoatImage } from './expedition-controls'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { regionIcons } from '@/features/regions/region-icons'
import type { Expedition, ExpeditionState } from './api'

export function ActiveExpeditionCard({
  expedition: e,
  baits,
  regionName,
  remaining,
  children,
}: {
  expedition: Expedition
  baits: ExpeditionState['baits']
  regionName: string
  remaining: number
  children: ReactNode
}) {
  const boosts = e.boosts ?? []
  const cargo = Object.entries(e.cargo).filter(([, count]) => count > 0)
  const progress = Math.min(
    100,
    Math.max(0, 100 * (1 - remaining / (e.vessel_snapshot.duration_minutes * 60000 || 1))),
  )
  const seconds = Math.ceil(remaining / 1000)
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
  return (
    <article
      aria-label="통발 현황"
      className="shrink-0 space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4"
    >
      <header className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="text-sm font-medium">꼬마 통발</h2>
            <span className="text-[10px] text-primary">{remaining ? '유인 중' : '수확 가능'}</span>
          </div>
          <p
            role="timer"
            aria-live="off"
            className={`mt-1 whitespace-nowrap tabular-nums tracking-wide ${remaining ? 'text-[28px] leading-9' : 'text-lg leading-9'}`}
          >
            {remaining ? time : '수확 준비 완료'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {remaining ? '수확까지' : '결과를 받을 수 있어요'}
          </p>
        </div>
        <BoatImage
          id={e.vessel_snapshot.id}
          name="꼬마 통발"
          className="size-18 shrink-0 rounded-xl bg-secondary/35 p-1"
        />
      </header>
      <div
        role="progressbar"
        aria-label="통발 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="h-1 overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-primary motion-safe:transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <section
        aria-label="통발 해역"
        className="flex min-w-0 items-center gap-2 rounded-lg border border-teal-200/60 bg-teal-50/70 px-2.5 py-2 text-teal-900 dark:border-teal-800/60 dark:bg-teal-950/30 dark:text-teal-100"
      >
        {regionIcons[e.region_id] ? (
          <img
            src={regionIcons[e.region_id].src}
            alt=""
            className="size-6 shrink-0 object-contain"
          />
        ) : (
          <MapPin aria-hidden="true" className="size-5 shrink-0" />
        )}
        <span className="shrink-0 text-[10px] opacity-70">조업 해역</span>
        <span className="min-w-0 flex-1 break-words text-right text-xs">{regionName}</span>
      </section>
      <section aria-label="넣은 미끼" className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <h3>넣은 미끼</h3>
          <span className="tabular-nums">
            총 {cargo.reduce((sum, [, count]) => sum + count, 0)}개
          </span>
        </div>
        <ul
          aria-label="통발에 넣은 미끼"
          className={`grid gap-1.5 ${cargo.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          {cargo.map(([id, count]) => {
            const bait = baits.find((b) => b.id === id)
            return (
              <li
                key={id}
                className={`flex min-w-0 items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2 py-1.5 ${cargo.length === 1 ? 'col-span-2' : ''}`}
              >
                {bait && (
                  <img src={bait.image_path} alt="" className="size-7 shrink-0 object-contain" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[10px] leading-4">{bait?.name ?? '미끼'}</p>
                  <p className="text-[11px] font-medium tabular-nums text-primary">×{count}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
      {boosts.length > 0 && (
        <details className="group border-t border-border/70 pt-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs [&::-webkit-details-marker]:hidden">
            <div className="flex -space-x-2">
              {boosts.slice(0, 3).map((b) => (
                <PlayerAvatar
                  level={b.level}
                  levelProgress={b.levelProgress}
                  key={b.id}
                  nickname={b.nickname}
                  path={b.avatar_path}
                  className="size-7 ring-2 ring-card"
                />
              ))}
            </div>
            <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
              <span className="sr-only">친구의 물고기 유인</span>
              {boosts[0].nickname}님{boosts.length > 1 ? ` 외 ${boosts.length - 1}명` : ''}
            </span>
            <span className="shrink-0 tabular-nums text-primary">
              −{boosts.reduce((sum, b) => sum + b.minutes, 0)}분
            </span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <ul aria-label="물고기를 유인해준 친구" className="mt-2 space-y-2 pb-1">
            {boosts.map((b) => (
              <li key={b.id} className="flex items-center gap-2 text-xs">
                <PlayerAvatar
                  level={b.level}
                  levelProgress={b.levelProgress}
                  nickname={b.nickname}
                  path={b.avatar_path}
                  className="size-6"
                />
                <span className="min-w-0 flex-1 truncate">{b.nickname}</span>
                <span className="text-[11px] text-muted-foreground">{b.minutes}분 가속</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {children}
    </article>
  )
}
