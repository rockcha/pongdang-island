import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { RefreshCw, FishingRod } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LandscapeImage } from '@/components/landscape-image'
import { useAccountResource, useServerDeadlines } from '@/lib/account-query'
import { rarities } from '@/lib/game/rarity'
import { readTodayFishingRecords, type TodayFishingRecords } from './api'

export function FishingRecordsPage() {
  const query = useAccountResource('today-fishing-records', readTodayFishingRecords, {
    staleTime: 0,
  })
  const now = useServerDeadlines(query.data?.serverNow, query.dataUpdatedAt, [
    query.data?.nextResetAt,
  ])
  const resetDay = useRef('')
  useEffect(() => {
    if (
      query.data &&
      now >= Date.parse(query.data.nextResetAt) &&
      resetDay.current !== query.data.day
    ) {
      resetDay.current = query.data.day
      void query.refetch({ cancelRefetch: false })
    }
  }, [now, query.data, query.refetch])
  return (
    <FishingRecordsView
      data={query.data}
      loading={query.isFetching}
      error={query.isError}
      onRefresh={() => {
        void query.refetch({ cancelRefetch: false })
      }}
    />
  )
}

const number = (value: number) => value.toLocaleString('ko-KR')
export function FishingRecordsView({
  data,
  loading,
  error,
  onRefresh,
}: {
  data?: TodayFishingRecords
  loading: boolean
  error: boolean
  onRefresh: () => void
}) {
  return (
    <section aria-label="오늘의 낚시 기록" className="mx-auto w-full max-w-lg space-y-6 px-4 py-4">
      <header className="flex min-h-9 items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {data
            ? new Intl.DateTimeFormat('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
                timeZone: 'Asia/Seoul',
              }).format(new Date(data.day + 'T00:00:00+09:00'))
            : '오늘의 기록'}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label="낚시 기록 새로고침"
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCw className="size-4" />
        </Button>
      </header>
      {error && (
        <div role="alert" className="space-y-2 text-xs text-destructive">
          <p>낚시 기록을 불러오지 못했어요.</p>
          <Button variant="outline" size="sm" disabled={loading} onClick={onRefresh}>
            다시 불러오기
          </Button>
        </div>
      )}
      {!data && !error && (
        <p role="status" className="py-12 text-center text-xs text-muted-foreground">
          오늘의 낚시 기록을 불러오는 중…
        </p>
      )}
      {data && (
        <>
          <section aria-label="오늘 낚시 횟수" className="rounded-xl bg-secondary px-5 py-5">
            <p className="text-xs text-muted-foreground">오늘 낚시 횟수</p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <strong className="text-4xl font-normal tabular-nums">
                {number(data.totalCasts)}
              </strong>
              <span className="text-sm">회</span>
            </p>
            <p className="mt-4 text-[11px] leading-6 text-muted-foreground">
              획득 {number(data.caughtCount)} · 실패 {number(data.failedCount)}
              {data.unfinishedCount > 0 && ` · 미완료 ${number(data.unfinishedCount)}`}
            </p>
          </section>
          <section aria-label="획득 등급별 수량">
            <h2 className="mb-3 text-xs font-normal">획득 기록</h2>
            <dl className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border py-4">
              {(['mythic', 'epic', 'rare', 'common'] as const).map((key) => (
                <div key={key} className="min-w-0 text-center">
                  <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: rarities[key].effectColor }}
                    />
                    {rarities[key].label}
                  </dt>
                  <dd className="mt-2 text-xl tabular-nums">
                    {number(data.rarities[key])}
                    <span className="ml-0.5 text-[10px] text-muted-foreground">개</span>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-label="사용한 미끼">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-normal">사용한 미끼</h2>
              <span className="text-[11px] text-muted-foreground">
                총 {number(data.baits.reduce((sum, bait) => sum + bait.used, 0))}개
              </span>
            </div>
            {data.baits.length ? (
              <ul className="divide-y divide-border">
                {data.baits.map((bait) => (
                  <li key={bait.id} className="flex min-h-18 items-center gap-3 py-3">
                    {bait.imagePath ? (
                      <LandscapeImage
                        src={bait.imagePath}
                        alt=""
                        className="size-11 shrink-0 object-contain"
                      />
                    ) : (
                      <FishingRod
                        aria-hidden="true"
                        className="m-2 size-7 shrink-0 text-muted-foreground"
                      />
                    )}
                    <span className="min-w-0 flex-1 text-xs leading-5">{bait.name}</span>
                    <span className="shrink-0 text-xs tabular-nums">
                      {number(bait.used)}
                      <span className="ml-1 text-muted-foreground">개</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-xs text-muted-foreground">오늘은 아직 사용한 미끼가 없어요.</p>
                <Link
                  to="/fishing"
                  className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs text-primary"
                >
                  <FishingRod className="size-4" />
                  낚시하러 가기
                </Link>
              </div>
            )}
          </section>
          <p className="border-t border-border pt-4 text-[10px] leading-6 text-muted-foreground">
            한국 시간 00시부터 시작한 직접 낚시를 집계해요.
            <br />
            실패·미완료도 횟수와 미끼 사용량에 포함돼요. 연습·통발·어선은 제외돼요.
          </p>
        </>
      )}
    </section>
  )
}
