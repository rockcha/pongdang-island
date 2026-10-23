import type { ReactNode } from 'react'
import { Medal } from 'lucide-react'
import { PlayerAvatar } from '@/features/profile/player-avatar'
export const rankingListClass =
  'overflow-hidden rounded-xl border border-border/60 bg-card divide-y divide-border/60'
export function RankingRow({
  rank,
  nickname,
  avatarPath,
  level,
  levelProgress,
  mine,
  record,
  action,
}: {
  rank: number
  nickname: string
  avatarPath?: string | null
  level?: number
  levelProgress?: number
  mine: boolean
  record: ReactNode
  action?: ReactNode
}) {
  const podium = rank <= 3
  return (
    <li
      className={`flex min-h-18 min-w-0 items-center gap-2 px-3 py-3 text-sm ${mine ? 'bg-secondary/75' : podium ? 'bg-secondary/20' : ''}`}
    >
      <span className="flex w-8 shrink-0 flex-col items-center justify-center gap-0.5 text-xs tabular-nums text-muted-foreground">
        {podium && (
          <Medal
            aria-hidden="true"
            className={`size-4 ${rank === 1 ? 'text-amber-600' : rank === 2 ? 'text-stone-400' : 'text-orange-700'}`}
          />
        )}
        <span>{rank}등</span>
      </span>
      <PlayerAvatar nickname={nickname} path={avatarPath} level={level} levelProgress={levelProgress} className="size-9 border border-border/60" />
      <span className="min-w-0 flex-1">
        <span className="block truncate" title={nickname}>
          {nickname}
        </span>
        {mine && <span className="mt-0.5 block text-[10px] text-primary">내 기록</span>}
      </span>
      <span className="max-w-[45%] shrink-0 text-right text-xs font-medium tabular-nums text-primary">
        {record}
      </span>
      {action}
    </li>
  )
}
