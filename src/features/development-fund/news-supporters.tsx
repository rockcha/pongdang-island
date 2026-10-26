import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { ChevronDown, ChevronRight, Crown, Medal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { useAccountResource } from '@/lib/account-query'
import { readFund, type FundSupporter } from './api'
import { supporterHonor } from './supporter-honors'

function SupporterRows({ supporters }: { supporters: FundSupporter[] }) {
  return (
    <ul aria-label="후원자 명단" className="divide-y divide-border/50">
      {supporters.map((s) => (
        <li
          key={s.userId}
          aria-label={s.nickname}
          className="flex min-w-0 items-center gap-2.5 py-3"
        >
          <PlayerAvatar nickname={s.nickname} path={s.avatarPath} className="size-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-xs">{s.nickname}</p>
            <p className="mt-1 text-[10px] text-primary/75">
              <span aria-hidden="true">{supporterHonor(s.rank).emoji} </span>
              {supporterHonor(s.rank).title}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function HonorCards({ supporters }: { supporters: FundSupporter[] }) {
  const singleWinner = supporters.filter((s) => s.rank === 1).length === 1
  return (
    <ul aria-label="명예 후원자" className="grid grid-cols-2 gap-2.5">
      {supporters.map((s) => {
        const first = s.rank === 1
        return (
          <li
            key={s.userId}
            aria-label={s.nickname}
            className={`relative isolate flex min-w-0 flex-col items-center overflow-hidden rounded-2xl border px-3 py-3 text-center ${first && singleWinner ? 'col-span-2' : ''} ${first ? 'border-amber-300/50 bg-gradient-to-br from-amber-100/60 via-card to-card shadow-[0_0_24px_rgba(201,151,60,0.10)] dark:from-amber-950/25' : 'border-border/70 bg-card/70'}`}
          >
            {first && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-8 left-1/2 -z-10 size-40 -translate-x-1/2 rounded-full bg-amber-200/20 blur-2xl"
              />
            )}
            <span
              className={`mb-2 inline-flex items-center gap-1 text-[10px] ${first ? 'text-amber-800 dark:text-amber-300' : s.rank === 2 ? 'text-slate-500 dark:text-slate-300' : 'text-orange-700/80 dark:text-orange-300'}`}
            >
              {first ? (
                <Crown aria-hidden="true" className="size-4" />
              ) : (
                <Medal aria-hidden="true" className="size-3.5" />
              )}
              {supporterHonor(s.rank).title}
            </span>
            <PlayerAvatar
              nickname={s.nickname}
              path={s.avatarPath}
              className={`${first ? 'size-14 ring-4 ring-amber-200/35' : 'size-10 ring-2 ring-secondary'} shrink-0`}
            />
            <h3
              className={`mt-2 max-w-full break-words font-medium ${first ? 'text-base' : 'text-xs'}`}
            >
              {s.nickname}
            </h3>
          </li>
        )
      })}
    </ul>
  )
}

function SupporterError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-border/60 p-4 text-center text-xs">
      <p className="text-muted-foreground">주주명단을 불러오지 못했어요.</p>
      <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={onRetry}>
        다시 불러오기
      </Button>
    </div>
  )
}

function MoreSupporters({ offset }: { offset: number }) {
  const [open, setOpen] = useState(false)
  return open ? (
    <SupporterContinuation key={offset} offset={offset} />
  ) : (
    <Button
      variant="ghost"
      className="mt-2 min-h-11 w-full gap-1 text-xs text-primary"
      onClick={() => setOpen(true)}
    >
      더 보기
      <ChevronDown aria-hidden="true" className="size-3.5" />
    </Button>
  )
}
function SupporterContinuation({ offset }: { offset: number }) {
  const read = useCallback((signal: AbortSignal) => readFund(signal, offset), [offset])
  const query = useAccountResource(['development-fund', offset], read, { standalone: true })
  if (query.error) return <SupporterError onRetry={() => void query.refetch()} />
  if (!query.data)
    return (
      <p role="status" className="py-4 text-center text-xs text-muted-foreground">
        다음 후원자를 불러오는 중…
      </p>
    )
  return (
    <>
      <SupporterRows supporters={query.data.supporters.toSorted((a, b) => a.rank - b.rank)} />
      {query.data.hasMore && query.data.supporters.length > 0 && (
        <MoreSupporters offset={offset + query.data.supporters.length} />
      )}
    </>
  )
}

export function NewsSupporters({ active }: { active: boolean }) {
  const query = useAccountResource(['development-fund', 0], readFund, {
    enabled: active,
    standalone: true,
  })
  const supporters = query.data?.supporters.toSorted((a, b) => a.rank - b.rank) ?? []
  return (
    <section aria-label="주주명단" className="space-y-4 px-4 pb-5 pt-4">
      {query.error ? (
        <SupporterError onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <div
          role="status"
          aria-label="주주명단 불러오는 중"
          className="h-44 rounded-2xl bg-secondary/40 motion-safe:animate-pulse"
        />
      ) : supporters.length ? (
        <>
          <HonorCards supporters={supporters.filter((s) => s.rank <= 3)} />
          {supporters.some((s) => s.rank > 3) && (
            <SupporterRows supporters={supporters.filter((s) => s.rank > 3)} />
          )}
          {query.data.hasMore && <MoreSupporters offset={supporters.length} />}
        </>
      ) : (
        <p className="rounded-2xl border border-dashed border-border bg-secondary/15 px-4 py-8 text-center text-xs leading-6 text-muted-foreground">
          아직 공개된 후원이 없어요.
          <br />
          함께해주신 마음이 이곳에 남아요.
        </p>
      )}
      <Link
        to="/development-fund"
        className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-primary/15 bg-secondary/35 px-3 text-xs text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        발전기금 자세히 보기
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </Link>
    </section>
  )
}
