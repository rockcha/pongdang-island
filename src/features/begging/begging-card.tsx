import { useState } from 'react'
import { Check, ChevronRight, HeartHandshake } from 'lucide-react'
import { BoardTime } from '@/features/board/board-time'
import { PlayerAvatar } from '@/features/profile/player-avatar'
import { GoldIcon } from '@/features/gold/gold-provider'
import { Button } from '@/components/ui/button'
import type { BeggingRecord, BeggingRequest } from './api'
const number = (value: number) => value.toLocaleString('ko-KR')
export function BeggingCard({
  post,
  busy,
  onGive,
  onHistory,
  onClose,
}: {
  post: BeggingRequest
  busy: boolean
  onGive: () => void
  onHistory: () => void
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const active = post.status === 'active',
    progress = Math.min(100, (post.receivedGold / post.goalGold) * 100)
  return (
    <article
      aria-label={`${post.owner.nickname}님의 사연`}
      className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm shadow-black/[0.02]"
    >
      <div className="space-y-4 p-4">
        <header className="flex min-w-0 items-center gap-2.5">
          <PlayerAvatar
            nickname={post.owner.nickname}
            path={post.owner.avatarPath}
            className="size-9"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {post.owner.nickname}
              <span className="font-normal text-muted-foreground">님의 사연</span>
            </p>
            <BoardTime
              value={post.createdAt}
              className="mt-1 block text-[10px] text-muted-foreground"
            />
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${active ? 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' : 'bg-secondary text-muted-foreground'}`}
          >
            {active ? '모으는 중' : post.status === 'completed' ? '목표 달성' : '마감'}
          </span>
        </header>
        <div>
          <p
            className={`whitespace-pre-wrap break-words text-sm leading-7 ${expanded ? '' : 'line-clamp-5'}`}
          >
            {post.story}
          </p>
          {post.story.length > 100 && (
            <button
              type="button"
              className="mt-1 min-h-9 text-[11px] text-primary"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? '접기' : '사연 더보기'}
            </button>
          )}
        </div>
        <div className="rounded-xl bg-secondary/45 p-3.5">
          <p className="text-[10px] text-muted-foreground">지금까지 받은 골드</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
            <span className="inline-flex items-center gap-1 text-xl font-medium tabular-nums">
              <GoldIcon className="size-5" />
              {number(post.receivedGold)}
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              / 목표 {number(post.goalGold)}골드
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="목표 골드 달성"
            aria-valuenow={Math.min(post.receivedGold, post.goalGold)}
            aria-valuemin={0}
            aria-valuemax={post.goalGold}
            className="mt-3 h-1 overflow-hidden rounded-full bg-border/60"
          >
            <div
              className="h-full rounded-full bg-primary/60 transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <HeartHandshake className="size-3" />
              따뜻한 응원 {post.transferCount}회
            </p>
            <button
              type="button"
              onClick={onHistory}
              className="inline-flex min-h-9 items-center gap-0.5 text-[10px] text-primary"
            >
              기록 보기
              <ChevronRight className="size-3" />
            </button>
          </div>
          {post.donors.length ? (
            <div className="mt-1 grid grid-cols-4 gap-2">
              {post.donors.map((person) => (
                <div key={person.id} className="flex min-w-0 flex-col items-center gap-1.5">
                  <PlayerAvatar
                    nickname={person.nickname}
                    path={person.avatarPath}
                    className="size-8"
                  />
                  <span className="w-full truncate text-center text-[10px]" title={person.nickname}>
                    {person.nickname}
                  </span>
                  <span className="text-[9px] tabular-nums text-primary">
                    {number(person.gold)}골드
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-2 text-[11px] text-muted-foreground">
              이 사연에 첫 번째 응원을 보내보세요.
            </p>
          )}
        </div>
      </div>
      <footer className="border-t border-border/50 px-4 py-3">
        {!active ? (
          <p className="flex min-h-11 items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5" />
            {post.status === 'completed' ? '목표 골드를 모았어요. 고마워요!' : '마감된 사연이에요.'}
          </p>
        ) : post.mine ? (
          <div className="flex min-h-11 items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">내가 남긴 사연이에요.</p>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 text-[11px]"
              disabled={busy}
              onClick={onClose}
            >
              마감하기
            </Button>
          </div>
        ) : (
          <Button className="min-h-11 w-full rounded-xl text-xs" disabled={busy} onClick={onGive}>
            골드 보내기
            <span className="ml-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[10px]">경험치 +2</span>
          </Button>
        )}
      </footer>
    </article>
  )
}
export function BeggingHistoryRow({
  record,
  onOpen,
}: {
  record: BeggingRecord
  onOpen: () => void
}) {
  const sent = record.direction === 'sent'
  return (
    <li className="border-b border-border/50 last:border-0">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-secondary/20"
      >
        <PlayerAvatar
          nickname={record.person.nickname}
          path={record.person.avatarPath}
          className="size-9"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs">
            {record.person.nickname}
            <span className="text-muted-foreground">
              {sent ? '님에게 보냈어요' : '님이 보내줬어요'}
            </span>
          </p>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">{record.story}</p>
          <BoardTime
            value={record.createdAt}
            className="mt-1 block text-[10px] text-muted-foreground"
          />
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-xs font-medium tabular-nums ${sent ? '' : 'text-primary'}`}>
            {sent ? '−' : '+'}
            {number(record.gold)}골드
          </p>
          {sent && <p className="mt-1 text-[10px] text-primary">경험치 +{record.xp}</p>}
        </div>
      </button>
    </li>
  )
}
